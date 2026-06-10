import { INodeParams, INodeCredential } from '../src/Interface'

/**
 * Generic API key credential used by `ChatModelEndpoint` and
 * `EmbeddingsEndpoint`. The same record works for any OpenAI Chat
 * Completions-compatible provider (OpenAI cloud, OpenRouter, Ollama, vLLM,
 * llama.cpp, LM Studio, Together, Groq, DeepSeek, xAI, LiteLLM proxy, ...).
 *
 * Renamed from `openAIApi` in v1.9 so the credential identity reflects its
 * generic purpose. Existing `openAIApi` credential records are migrated to
 * this name + field shape by the database migration shipped alongside.
 */
class ApiKey implements INodeCredential {
    label: string
    name: string
    version: number
    inputs: INodeParams[]

    constructor() {
        this.label = 'API Key'
        this.name = 'apiKey'
        this.version = 2.0
        this.inputs = [
            {
                label: 'API Key',
                name: 'apiKey',
                type: 'password',
                description: 'Authorization Bearer token sent to the OpenAI-compatible endpoint.'
            }
        ]
    }
}

module.exports = { credClass: ApiKey }
