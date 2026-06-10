import { omit } from 'lodash'
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { convert: htmlToText } = require('html-to-text') as { convert: (html: string, opts?: any) => string }
import { IDocument, INode, INodeData, INodeOutputsValue, INodeParams } from '../../../src/Interface'
import { TextSplitter } from '@langchain/textsplitters'
import { Document } from '@langchain/core/documents'
import { handleEscapeCharacters } from '../../../src'

/**
 * Lightweight web loader. `fetch` the URL, run the response body through
 * `html-to-text` to strip tags/scripts/styles, and emit a single Document.
 *
 * Constraint by design (v1.9 Tier 2): no Cheerio, no Puppeteer, no jsdom —
 * those are MCP-server territory (firecrawl-mcp etc.) when JS rendering or
 * structured DOM scraping is needed. This loader only handles static HTML.
 */
class Web_DocumentLoaders implements INode {
    label: string
    name: string
    version: number
    description: string
    type: string
    icon: string
    category: string
    baseClasses: string[]
    inputs: INodeParams[]
    outputs: INodeOutputsValue[]

    constructor() {
        this.label = 'Web Page'
        this.name = 'webLoader'
        this.version = 1.0
        this.type = 'Document'
        this.icon = 'web.svg'
        this.category = 'Document Loaders'
        this.description = 'Fetch a web page and extract its text. Static HTML only — for JS-rendered or scraping-heavy sites, route via an MCP server.'
        this.baseClasses = [this.type]
        this.inputs = [
            {
                label: 'URL',
                name: 'url',
                type: 'string',
                placeholder: 'https://example.com/article'
            },
            {
                label: 'Text Splitter',
                name: 'textSplitter',
                type: 'TextSplitter',
                optional: true
            },
            {
                label: 'Request Timeout (ms)',
                name: 'timeout',
                type: 'number',
                default: 15000,
                optional: true,
                additionalParams: true
            },
            {
                label: 'Additional Metadata',
                name: 'metadata',
                type: 'json',
                description: 'Additional metadata to be added to the extracted documents',
                optional: true,
                additionalParams: true
            },
            {
                label: 'Omit Metadata Keys',
                name: 'omitMetadataKeys',
                type: 'string',
                rows: 4,
                description:
                    'Default-extracted metadata keys to omit. Comma-separated. Use * to omit all default metadata except keys you provide in Additional Metadata.',
                placeholder: 'source, key1, key2',
                optional: true,
                additionalParams: true
            }
        ]
        this.outputs = [
            {
                label: 'Document',
                name: 'document',
                description: 'Array of document objects containing metadata and pageContent',
                baseClasses: [...this.baseClasses, 'json']
            },
            {
                label: 'Text',
                name: 'text',
                description: 'Concatenated string from pageContent of documents',
                baseClasses: ['string', 'json']
            }
        ]
    }

    async init(nodeData: INodeData): Promise<any> {
        const url = nodeData.inputs?.url as string
        const timeout = (nodeData.inputs?.timeout as number) ?? 15000
        const textSplitter = nodeData.inputs?.textSplitter as TextSplitter
        const metadata = nodeData.inputs?.metadata
        const output = nodeData.outputs?.output as string
        const _omitMetadataKeys = nodeData.inputs?.omitMetadataKeys as string

        if (!url) throw new Error('URL is required')

        let omitMetadataKeys: string[] = []
        if (_omitMetadataKeys) {
            omitMetadataKeys = _omitMetadataKeys.split(',').map((key) => key.trim())
        }

        const controller = new AbortController()
        const timer = setTimeout(() => controller.abort(), Number(timeout))
        let html: string
        try {
            const response = await fetch(url, { signal: controller.signal })
            if (!response.ok) {
                throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`)
            }
            html = await response.text()
        } finally {
            clearTimeout(timer)
        }

        // Strip HTML to text. Drop scripts/styles, keep links inline as bare text.
        const text = htmlToText(html, {
            wordwrap: false,
            selectors: [
                { selector: 'script', format: 'skip' },
                { selector: 'style', format: 'skip' },
                { selector: 'a', options: { ignoreHref: true } },
                { selector: 'img', format: 'skip' }
            ]
        })

        const baseMetadata = { source: url }

        let docs: IDocument[] = []
        if (textSplitter) {
            docs.push(...(await textSplitter.createDocuments([text])))
        } else {
            docs.push(new Document({ pageContent: text }))
        }

        if (metadata) {
            const parsedMetadata = typeof metadata === 'object' ? metadata : JSON.parse(metadata)
            docs = docs.map((doc) => ({
                ...doc,
                metadata:
                    _omitMetadataKeys === '*'
                        ? { ...parsedMetadata }
                        : omit({ ...baseMetadata, ...doc.metadata, ...parsedMetadata }, omitMetadataKeys)
            }))
        } else {
            docs = docs.map((doc) => ({
                ...doc,
                metadata: _omitMetadataKeys === '*' ? {} : omit({ ...baseMetadata, ...doc.metadata }, omitMetadataKeys)
            }))
        }

        if (output === 'document') {
            return docs
        }
        let finaltext = ''
        for (const doc of docs) {
            finaltext += `${doc.pageContent}\n`
        }
        return handleEscapeCharacters(finaltext, false)
    }
}

module.exports = { nodeClass: Web_DocumentLoaders }
