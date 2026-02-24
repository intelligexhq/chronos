import { INodeParams, INodeCredential } from '../src/Interface'

/**
 * Azure AI Search API credential.
 * Authenticates via Managed Identity using DefaultAzureCredential.
 */
class AzureAISearchApi implements INodeCredential {
    label: string
    name: string
    version: number
    description: string
    inputs: INodeParams[]

    constructor() {
        this.label = 'Azure AI Search API'
        this.name = 'azureAISearchApi'
        this.version = 2.0
        this.description =
            'Connect to Azure AI Search with Managed Identity. Set AZURE_CLIENT_ID environment variable for user-assigned MI.'
        this.inputs = [
            {
                label: 'Azure AI Search Endpoint',
                name: 'azureAISearchEndpoint',
                type: 'string',
                placeholder: 'https://your-search-service.search.windows.net'
            }
        ]
    }
}

module.exports = { credClass: AzureAISearchApi }
