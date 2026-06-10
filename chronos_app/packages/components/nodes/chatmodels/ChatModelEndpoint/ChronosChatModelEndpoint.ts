import { ChatOpenAI as LangchainChatOpenAI, ChatOpenAIFields } from '@langchain/openai'
import { IMultiModalOption, IVisionChatModal } from '../../../src'

/**
 * Wraps LangChain's ChatOpenAI for the canvas surface. The wrapper exists
 * to declare `IVisionChatModal` so the canvas builder renders the image
 * input pin on this node — vision input is part of the OpenAI Chat
 * Completions spec (content-array with `image_url` parts) and any
 * spec-compliant provider that exposes a vision-capable model accepts it.
 *
 * `setVisionModel()` is a no-op: modern vision-capable models (gpt-4o,
 * claude-3.5-sonnet via OpenRouter, llava via Ollama, gemini via
 * vertex-compat, etc.) accept text + image in the same SKU. The legacy
 * auto-switch logic that the deleted ChatAnthropic / AWSBedrock nodes
 * carried was a 2023-era workaround for the GPT-4-vision-preview SKU split
 * and is no longer needed. If a user types a non-vision model name and
 * uploads an image, the provider returns a clear error — correct.
 */
export class ChatModelEndpoint extends LangchainChatOpenAI implements IVisionChatModal {
    configuredModel: string
    configuredMaxToken?: number
    multiModalOption: IMultiModalOption
    id: string

    constructor(id: string, fields?: ChatOpenAIFields) {
        super(fields)
        this.id = id
        this.configuredModel = fields?.modelName ?? ''
        this.configuredMaxToken = fields?.maxTokens
    }

    revertToOriginalModel(): void {
        this.model = this.configuredModel
        this.maxTokens = this.configuredMaxToken
    }

    setMultiModalOption(multiModalOption: IMultiModalOption): void {
        this.multiModalOption = multiModalOption
    }

    setVisionModel(): void {
        // no-op — see class doc comment
    }
}
