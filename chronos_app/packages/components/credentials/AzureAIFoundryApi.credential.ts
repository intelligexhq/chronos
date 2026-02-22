import { INodeParams, INodeCredential } from '../src/Interface'

class AzureAIFoundryApi implements INodeCredential {
    label: string
    name: string
    version: number
    description: string
    inputs: INodeParams[]

    constructor() {
        this.label = 'Azure AI Foundry API'
        this.name = 'azureAIFoundryApi'
        this.version = 1.0
        this.description =
            'Connect to Azure AI Foundry with Managed Identity. Ensure your Managed Identity has appropriate RBAC roles (Cognitive Services User or Contributor).'
        this.inputs = [
            {
                label: 'Azure AI Foundry Endpoint',
                name: 'azureAIFoundryEndpoint',
                type: 'string',
                placeholder: 'https://your-project.cognitiveservices.azure.com/',
                description: 'Your Azure AI Foundry project endpoint URL'
            },
            {
                label: 'Azure AI Foundry Deployment Name',
                name: 'azureAIFoundryDeploymentName',
                type: 'string',
                placeholder: 'gpt-4',
                description: 'The name of your model deployment in Azure AI Foundry'
            },
            {
                label: 'API Version',
                name: 'azureAIFoundryApiVersion',
                type: 'string',
                placeholder: '2024-10-21',
                default: '2024-10-21',
                description:
                    'Azure OpenAI API version. Refer to <a target="_blank" href="https://learn.microsoft.com/en-us/azure/ai-services/openai/reference">documentation</a>'
            }
        ]
    }
}

module.exports = { credClass: AzureAIFoundryApi }
