import { flatten } from 'lodash'
import { Document } from '@langchain/core/documents'
import { Embeddings } from '@langchain/core/embeddings'
import { AzureAISearchVectorStore, AzureAISearchConfig } from '@langchain/community/vectorstores/azure_aisearch'
import { ICommonObject, INode, INodeData, INodeOutputsValue, INodeParams, IndexingResult } from '../../../src/Interface'
import { getBaseClasses, getCredentialData, getCredentialParam } from '../../../src/utils'
import { index } from '../../../src/indexing'

/**
 * Azure AI Search vector store node.
 * Authenticates via Managed Identity using DefaultAzureCredential.
 */
class AzureAISearch_VectorStores implements INode {
    label: string
    name: string
    version: number
    description: string
    type: string
    icon: string
    category: string
    badge: string
    baseClasses: string[]
    inputs: INodeParams[]
    credential: INodeParams
    outputs: INodeOutputsValue[]

    constructor() {
        this.label = 'Azure AI Search'
        this.name = 'azureAISearch'
        this.version = 1.0
        this.description =
            'Upsert embedded data and perform similarity search upon query using Azure AI Search, a cloud search service with built-in AI capabilities'
        this.type = 'AzureAISearch'
        this.icon = 'Azure.svg'
        this.category = 'Vector Stores'
        this.badge = 'NEW'
        this.baseClasses = [this.type, 'VectorStoreRetriever', 'BaseRetriever']
        this.credential = {
            label: 'Connect Credential',
            name: 'credential',
            type: 'credential',
            credentialNames: ['azureAISearchApi']
        }
        this.inputs = [
            {
                label: 'Document',
                name: 'document',
                type: 'Document',
                list: true,
                optional: true
            },
            {
                label: 'Embeddings',
                name: 'embeddings',
                type: 'Embeddings'
            },
            {
                label: 'Record Manager',
                name: 'recordManager',
                type: 'RecordManager',
                description: 'Keep track of the record to prevent duplication',
                optional: true,
                hide: {
                    recreateIndex: 'true'
                }
            },
            {
                label: 'Index Name',
                name: 'indexName',
                type: 'string',
                placeholder: 'vectorsearch'
            },
            {
                label: 'Recreate Index on Upsert',
                name: 'recreateIndex',
                description: 'Selecting this option will delete the existing index and recreate it when upserting',
                default: false,
                type: 'boolean',
                optional: true
            },
            {
                label: 'Search Type',
                name: 'searchType',
                type: 'options',
                default: 'similarity_hybrid',
                options: [
                    {
                        label: 'Similarity',
                        name: 'similarity'
                    },
                    {
                        label: 'Similarity Hybrid',
                        name: 'similarity_hybrid'
                    },
                    {
                        label: 'Semantic Hybrid',
                        name: 'semantic_hybrid'
                    }
                ],
                additionalParams: true,
                optional: true
            },
            {
                label: 'Semantic Configuration Name',
                name: 'semanticConfigurationName',
                type: 'string',
                optional: true,
                description: 'Name of the semantic configuration to use for semantic hybrid search.',
                additionalParams: true,
                show: {
                    searchType: ['semantic_hybrid']
                }
            },
            {
                label: 'Top K',
                name: 'topK',
                description: 'Number of top results to fetch. Default to 4',
                placeholder: '4',
                type: 'number',
                additionalParams: true,
                optional: true
            }
        ]
        this.outputs = [
            {
                label: 'Azure AI Search Retriever',
                name: 'retriever',
                baseClasses: this.baseClasses
            },
            {
                label: 'Azure AI Search Vector Store',
                name: 'vectorStore',
                baseClasses: [this.type, ...getBaseClasses(AzureAISearchVectorStore)]
            }
        ]
    }

    //@ts-ignore
    vectorStoreMethods = {
        /**
         * Upserts documents into the Azure AI Search index.
         * @param nodeData - Node configuration data.
         * @param options - Common options including credentials.
         * @returns Indexing result with count and documents added.
         */
        async upsert(nodeData: INodeData, options: ICommonObject): Promise<Partial<IndexingResult>> {
            const indexName = nodeData.inputs?.indexName as string
            const embeddings = nodeData.inputs?.embeddings as Embeddings
            const recordManager = nodeData.inputs?.recordManager
            const recreateIndex = nodeData.inputs?.recreateIndex as boolean

            const docs = nodeData.inputs?.document as Document[]
            const flattenDocs = docs && docs.length ? flatten(docs) : []
            const finalDocs = []
            for (let i = 0; i < flattenDocs.length; i += 1) {
                if (flattenDocs[i] && flattenDocs[i].pageContent) {
                    finalDocs.push(new Document(flattenDocs[i]))
                }
            }

            // Workaround for Langchain Issue #1589: store does not support object in metadata
            finalDocs.forEach((d) => {
                delete d.metadata.pdf
                delete d.metadata.loc
            })

            const config = await buildSearchConfig(nodeData, options, indexName)

            // Delete existing index if recreateIndex is enabled; addDocuments will recreate it
            if (recreateIndex) {
                try {
                    const { SearchIndexClient } = require('@azure/search-documents')
                    const { DefaultAzureCredential } = require('@azure/identity')
                    const indexClient = new SearchIndexClient(config.endpoint, new DefaultAzureCredential())
                    await indexClient.deleteIndex(indexName)
                } catch (e: any) {
                    // Ignore if index does not exist
                    if (e?.statusCode !== 404) {
                        throw new Error(e)
                    }
                }
            }

            const vectorStore = new AzureAISearchVectorStore(embeddings, config)

            try {
                if (recordManager) {
                    await recordManager.createSchema()
                    const res = await index({
                        docsSource: finalDocs,
                        recordManager,
                        vectorStore,
                        options: {
                            cleanup: recordManager?.cleanup,
                            sourceIdKey: recordManager?.sourceIdKey ?? 'source',
                            vectorStoreName: indexName
                        }
                    })
                    return res
                } else {
                    await vectorStore.addDocuments(finalDocs)
                    return { numAdded: finalDocs.length, addedDocs: finalDocs }
                }
            } catch (e) {
                throw new Error(e)
            }
        },

        /**
         * Deletes documents from the Azure AI Search index.
         * @param nodeData - Node configuration data.
         * @param ids - Document IDs to delete.
         * @param options - Common options including credentials.
         */
        async delete(nodeData: INodeData, ids: string[], options: ICommonObject): Promise<void> {
            const indexName = nodeData.inputs?.indexName as string
            const embeddings = nodeData.inputs?.embeddings as Embeddings
            const recordManager = nodeData.inputs?.recordManager

            const config = await buildSearchConfig(nodeData, options, indexName)
            const vectorStore = new AzureAISearchVectorStore(embeddings, config)

            try {
                if (recordManager) {
                    const vectorStoreName = indexName
                    await recordManager.createSchema()
                    ;(recordManager as any).namespace = (recordManager as any).namespace + '_' + vectorStoreName
                    const filterKeys: ICommonObject = {}
                    if (options.docId) {
                        filterKeys.docId = options.docId
                    }
                    const keys: string[] = await recordManager.listKeys(filterKeys)

                    await vectorStore.delete({ ids: keys })
                    await recordManager.deleteKeys(keys)
                } else {
                    await vectorStore.delete({ ids })
                }
            } catch (e) {
                throw new Error(e)
            }
        }
    }

    /**
     * Initialises the Azure AI Search vector store and returns a retriever or the store itself.
     * @param nodeData - Node configuration data.
     * @param _ - Unused parameter.
     * @param options - Common options including credentials.
     * @returns A retriever or vector store instance.
     */
    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        const indexName = nodeData.inputs?.indexName as string
        const embeddings = nodeData.inputs?.embeddings as Embeddings
        const topK = nodeData.inputs?.topK as string
        const searchType = nodeData.inputs?.searchType as string
        const semanticConfigurationName = nodeData.inputs?.semanticConfigurationName as string
        const k = topK ? parseFloat(topK) : 4
        const output = nodeData.outputs?.output as string

        const config = await buildSearchConfig(nodeData, options, indexName, searchType, semanticConfigurationName)
        const vectorStore = new AzureAISearchVectorStore(embeddings, config)

        if (output === 'retriever') {
            return vectorStore.asRetriever(k)
        } else if (output === 'vectorStore') {
            ;(vectorStore as any).k = k
            return vectorStore
        }
        return vectorStore
    }
}

/**
 * Builds the AzureAISearchConfig using Managed Identity via DefaultAzureCredential.
 * Set the AZURE_CLIENT_ID environment variable for user-assigned Managed Identity.
 * @param nodeData - Node configuration data.
 * @param options - Common options including credentials.
 * @param indexName - The search index name.
 * @param searchType - Optional search type for query options.
 * @param semanticConfigurationName - Optional semantic configuration name.
 * @returns AzureAISearchConfig for constructing the vector store.
 */
async function buildSearchConfig(
    nodeData: INodeData,
    options: ICommonObject,
    indexName: string,
    searchType?: string,
    semanticConfigurationName?: string
): Promise<AzureAISearchConfig> {
    const credentialData = await getCredentialData(nodeData.credential ?? '', options)
    const endpoint = getCredentialParam('azureAISearchEndpoint', credentialData, nodeData)

    const { DefaultAzureCredential } = require('@azure/identity')

    const config: Record<string, any> = {
        endpoint,
        indexName,
        credentials: new DefaultAzureCredential()
    }

    if (searchType) {
        config.search = {
            type: searchType,
            ...(semanticConfigurationName ? { semanticConfigurationName } : {})
        }
    }

    return config as AzureAISearchConfig
}

module.exports = { nodeClass: AzureAISearch_VectorStores }
