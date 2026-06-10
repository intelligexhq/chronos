import { ChatOpenAIFields } from '@langchain/openai'
import { BaseCache } from '@langchain/core/caches'
import { ICommonObject, IMultiModalOption, INode, INodeData, INodeParams } from '../../../src/Interface'
import { getBaseClasses, getCredentialData, getCredentialParam, validateOpenAICompatibleEndpointURL } from '../../../src/utils'
import { ChatModelEndpoint as ChronosChatModelEndpoint } from './ChronosChatModelEndpoint'

class ChatModelEndpoint_ChatModels implements INode {
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
        this.label = 'Chat Model Endpoint'
        this.name = 'chatModelEndpoint'
        this.version = 5.0
        this.type = 'ChatModelEndpoint'
        this.icon = 'chatmodelendpoint.svg'
        this.category = 'Chat Models'
        this.description =
            'Chat model via any OpenAI Chat Completions-compatible endpoint (OpenAI, OpenRouter, Ollama, llama.cpp, vLLM, LM Studio, Together, Groq, DeepSeek, xAI, LiteLLM, etc.)'
        this.baseClasses = [this.type, ...getBaseClasses(ChronosChatModelEndpoint)]
        this.credential = {
            label: 'Connect Credential',
            name: 'credential',
            type: 'credential',
            credentialNames: ['apiKey'],
            optional: true
        }
        this.inputs = [
            {
                label: 'Endpoint URL',
                name: 'basepath',
                type: 'string',
                description:
                    'Base URL of an OpenAI Chat Completions-compatible API root. The SDK appends "/chat/completions" — do NOT include that suffix. Examples: https://openrouter.ai/api/v1 (OpenRouter), http://localhost:11434/v1 (Ollama), http://localhost:8080/v1 (llama.cpp), https://api.together.xyz/v1 (Together), https://api.groq.com/openai/v1 (Groq). Leave blank for OpenAI cloud.',
                placeholder: 'https://openrouter.ai/api/v1',
                optional: true
            },
            {
                label: 'Model Name',
                name: 'modelName',
                type: 'string',
                placeholder: 'gpt-4o · anthropic/claude-3.5-sonnet (via OpenRouter) · llama3.2 (Ollama)'
            },
            {
                label: 'Temperature',
                name: 'temperature',
                type: 'number',
                step: 0.1,
                default: 0.9,
                optional: true
            },
            {
                label: 'Streaming',
                name: 'streaming',
                type: 'boolean',
                default: true,
                optional: true,
                additionalParams: true
            },
            {
                label: 'Max Tokens',
                name: 'maxTokens',
                type: 'number',
                step: 1,
                optional: true,
                additionalParams: true
            },
            {
                label: 'Top Probability',
                name: 'topP',
                type: 'number',
                step: 0.1,
                optional: true,
                additionalParams: true
            },
            {
                label: 'Frequency Penalty',
                name: 'frequencyPenalty',
                type: 'number',
                step: 0.1,
                optional: true,
                additionalParams: true
            },
            {
                label: 'Presence Penalty',
                name: 'presencePenalty',
                type: 'number',
                step: 0.1,
                optional: true,
                additionalParams: true
            },
            {
                label: 'Timeout',
                name: 'timeout',
                type: 'number',
                step: 1,
                optional: true,
                additionalParams: true
            },
            {
                label: 'Additional Headers (JSON)',
                name: 'baseOptions',
                type: 'json',
                description:
                    'Optional defaultHeaders passed to the endpoint. Use this for provider analytics (e.g. OpenRouter HTTP-Referer / X-Title) or custom auth schemes.',
                optional: true,
                additionalParams: true
            },
            {
                label: 'Cache',
                name: 'cache',
                type: 'BaseCache',
                optional: true,
                additionalParams: true
            },
            {
                label: 'Allow Image Uploads',
                name: 'allowImageUploads',
                type: 'boolean',
                description:
                    'Enable the image input pin on this node. Requires a vision-capable model (gpt-4o, claude-3.5-sonnet via OpenRouter, llava via Ollama, etc.).',
                default: false,
                optional: true,
                additionalParams: true
            },
            {
                label: 'Image Resolution',
                description: 'Maps to image_url.detail in the OpenAI Chat Completions spec.',
                name: 'imageResolution',
                type: 'options',
                options: [
                    { label: 'Low', name: 'low' },
                    { label: 'High', name: 'high' },
                    { label: 'Auto', name: 'auto' }
                ],
                default: 'low',
                optional: false,
                additionalParams: true,
                show: { allowImageUploads: true }
            }
        ]
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        const temperature = nodeData.inputs?.temperature as string
        const modelName = nodeData.inputs?.modelName as string
        const maxTokens = nodeData.inputs?.maxTokens as string
        const topP = nodeData.inputs?.topP as string
        const frequencyPenalty = nodeData.inputs?.frequencyPenalty as string
        const presencePenalty = nodeData.inputs?.presencePenalty as string
        const timeout = nodeData.inputs?.timeout as string
        const streaming = nodeData.inputs?.streaming as boolean
        // Validates + normalises the URL (trim, strip trailing slash, reject common
        // wrong shapes like bare hostnames or accidental /chat/completions suffixes).
        // Empty input is allowed — falls through to OpenAI cloud default.
        const basePath = validateOpenAICompatibleEndpointURL(nodeData.inputs?.basepath as string, '/chat/completions')
        const baseOptions = nodeData.inputs?.baseOptions
        const cache = nodeData.inputs?.cache as BaseCache
        const allowImageUploads = nodeData.inputs?.allowImageUploads as boolean
        const imageResolution = nodeData.inputs?.imageResolution as string

        const credentialData = await getCredentialData(nodeData.credential ?? '', options)
        const apiKey = getCredentialParam('apiKey', credentialData, nodeData)

        const obj: ChatOpenAIFields = {
            temperature: parseFloat(temperature),
            modelName,
            openAIApiKey: apiKey,
            apiKey,
            streaming: streaming ?? true
        }

        if (maxTokens) obj.maxTokens = parseInt(maxTokens, 10)
        if (topP) obj.topP = parseFloat(topP)
        if (frequencyPenalty) obj.frequencyPenalty = parseFloat(frequencyPenalty)
        if (presencePenalty) obj.presencePenalty = parseFloat(presencePenalty)
        if (timeout) obj.timeout = parseInt(timeout, 10)
        if (cache) obj.cache = cache

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

        const multiModalOption: IMultiModalOption = {
            image: {
                allowImageUploads: allowImageUploads ?? false,
                imageResolution
            }
        }

        const model = new ChronosChatModelEndpoint(nodeData.id, obj)
        model.setMultiModalOption(multiModalOption)
        return model
    }
}

module.exports = { nodeClass: ChatModelEndpoint_ChatModels }
