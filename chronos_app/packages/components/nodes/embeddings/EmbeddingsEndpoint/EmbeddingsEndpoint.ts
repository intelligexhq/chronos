import { ClientOptions, OpenAIEmbeddings, OpenAIEmbeddingsParams } from '@langchain/openai'
import { ICommonObject, INode, INodeData, INodeParams } from '../../../src/Interface'
import { getBaseClasses, getCredentialData, getCredentialParam, validateOpenAICompatibleEndpointURL } from '../../../src/utils'

class EmbeddingsEndpoint_Embeddings implements INode {
    label: string
    name: string
    version: number
    type: string
    icon: string
    category: string
    description: string
    baseClasses: string[]
    credential: INodeParams
    inputs: INodeParams[]

    constructor() {
        this.label = 'Embeddings Endpoint'
        this.name = 'embeddingsEndpoint'
        this.version = 4.0
        this.type = 'EmbeddingsEndpoint'
        this.icon = 'embeddingsendpoint.svg'
        this.category = 'Embeddings'
        this.description =
            'Embeddings via any OpenAI-compatible embeddings endpoint (OpenAI, Azure AI Foundry, Ollama, vLLM, llama.cpp, LM Studio, TEI/TGI, Together, Voyage, etc.)'
        this.baseClasses = [this.type, ...getBaseClasses(OpenAIEmbeddings)]
        this.credential = {
            label: 'Connect Credential',
            name: 'credential',
            type: 'credential',
            credentialNames: ['apiKey']
        }
        this.inputs = [
            {
                label: 'Endpoint URL',
                name: 'basepath',
                type: 'string',
                description:
                    'Base URL of an OpenAI-compatible embeddings API root. The SDK appends "/embeddings" — do NOT include that suffix. Examples: http://localhost:11434/v1 (Ollama), http://localhost:8080/v1 (TEI), https://api.together.xyz/v1 (Together). Leave blank for OpenAI cloud.',
                placeholder: 'http://localhost:11434/v1',
                optional: true
            },
            {
                label: 'Model Name',
                name: 'modelName',
                type: 'string',
                placeholder: 'text-embedding-3-small · nomic-embed-text (Ollama) · BAAI/bge-large-en-v1.5 (TEI)',
                optional: true
            },
            {
                label: 'Dimensions',
                name: 'dimensions',
                type: 'number',
                description: 'Override the embedding dimension (provider-supported only).',
                optional: true,
                additionalParams: true
            },
            {
                label: 'Strip New Lines',
                name: 'stripNewLines',
                type: 'boolean',
                optional: true,
                additionalParams: true
            },
            {
                label: 'Batch Size',
                name: 'batchSize',
                type: 'number',
                optional: true,
                additionalParams: true
            },
            {
                label: 'Timeout',
                name: 'timeout',
                type: 'number',
                optional: true,
                additionalParams: true
            },
            {
                label: 'Additional Headers (JSON)',
                name: 'baseOptions',
                type: 'json',
                description: 'Optional defaultHeaders passed to the endpoint (e.g. custom auth or api-version pinning).',
                optional: true,
                additionalParams: true
            }
        ]
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        const stripNewLines = nodeData.inputs?.stripNewLines as boolean
        const batchSize = nodeData.inputs?.batchSize as string
        const timeout = nodeData.inputs?.timeout as string
        // Validates + normalises the URL; empty input falls through to OpenAI cloud default.
        const basePath = validateOpenAICompatibleEndpointURL(nodeData.inputs?.basepath as string, '/embeddings')
        const modelName = nodeData.inputs?.modelName as string
        const dimensions = nodeData.inputs?.dimensions as string
        const baseOptions = nodeData.inputs?.baseOptions

        const credentialData = await getCredentialData(nodeData.credential ?? '', options)
        const apiKey = getCredentialParam('apiKey', credentialData, nodeData)

        const obj: Partial<OpenAIEmbeddingsParams> & { openAIApiKey?: string; configuration?: ClientOptions } = {
            openAIApiKey: apiKey
        }

        if (stripNewLines) obj.stripNewLines = stripNewLines
        if (batchSize) obj.batchSize = parseInt(batchSize, 10)
        if (timeout) obj.timeout = parseInt(timeout, 10)
        if (modelName) obj.modelName = modelName
        if (dimensions) obj.dimensions = parseInt(dimensions, 10)

        let parsedBaseOptions: any | undefined = undefined
        if (baseOptions) {
            try {
                parsedBaseOptions = typeof baseOptions === 'object' ? baseOptions : JSON.parse(baseOptions)
            } catch (exception) {
                throw new Error('Invalid JSON in Additional Headers: ' + exception)
            }
        }

        if (basePath || parsedBaseOptions) {
            obj.configuration = {
                baseURL: basePath,
                defaultHeaders: parsedBaseOptions
            }
        }

        const model = new OpenAIEmbeddings(obj)
        return model
    }
}

module.exports = { nodeClass: EmbeddingsEndpoint_Embeddings }
