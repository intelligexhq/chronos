# Azure AI Foundry Node

This node provides integration with Azure AI Foundry, supporting both Managed Identity and API Key authentication methods. It's designed to work with private endpoints in Azure landing zones.

## Features

- **Managed Identity Support**: Uses Azure DefaultAzureCredential for secure, keyless authentication
- **Private Endpoint Compatible**: Works with Azure AI Foundry deployed behind private endpoints
- **API Key Authentication**: Traditional API key authentication as fallback
- **Full LLM Support**: Compatible with GPT-4, GPT-4o, GPT-3.5 Turbo, and other models

## Prerequisites

### For Managed Identity Authentication (Recommended)

1. **Azure AI Foundry Project** deployed in your Azure subscription
2. **Private Endpoint** configured in your landing zone
3. **Managed Identity** assigned to your Flowise container/app service with:
   - Role: `Cognitive Services User` or `Cognitive Services Contributor`
   - Scope: Azure AI Foundry resource
4. **Network Access**: Ensure Flowise can reach the private endpoint

### For API Key Authentication

1. Azure AI Foundry endpoint URL
2. API key from your Azure AI Foundry project

## Configuration

### Credential Setup

1. Navigate to **Credentials** in Flowise
2. Create a new **Azure AI Foundry API** credential
3. Configure the following fields:

#### Managed Identity Method (Recommended)
- **Authentication Method**: Select "Managed Identity (Recommended)"
- **Azure AI Foundry Endpoint**: Your project endpoint (e.g., `https://my-project.cognitiveservices.azure.com/`)
- **Deployment Name**: Your model deployment name
- **API Version**: Default is `2024-10-21`

#### API Key Method
- **Authentication Method**: Select "API Key"
- **Azure AI Foundry Endpoint**: Your project endpoint
- **Azure AI Foundry API Key**: Your API key
- **Deployment Name**: Your model deployment name
- **API Version**: Default is `2024-10-21`

### Node Usage

1. Add the **Azure AI Foundry** node to your flow
2. Select your configured credential
3. Choose your model from the dropdown
4. Configure temperature and other parameters as needed

## Private Endpoint Setup Guide

### Step 1: Create Azure AI Foundry Project

```bash
# Using Azure CLI
az ml workspace create \
  --name my-ai-foundry \
  --resource-group my-rg \
  --location eastus
```

### Step 2: Configure Private Endpoint

```bash
# Create private endpoint
az network private-endpoint create \
  --name my-ai-foundry-pe \
  --resource-group my-rg \
  --vnet-name my-vnet \
  --subnet my-subnet \
  --private-connection-resource-id /subscriptions/{subscription-id}/resourceGroups/{rg}/providers/Microsoft.CognitiveServices/accounts/{ai-foundry-name} \
  --group-ids account \
  --connection-name my-ai-foundry-connection
```

### Step 3: Assign Managed Identity RBAC

```bash
# Assign Cognitive Services User role to your Managed Identity
az role assignment create \
  --assignee <managed-identity-principal-id> \
  --role "Cognitive Services User" \
  --scope /subscriptions/{subscription-id}/resourceGroups/{rg}/providers/Microsoft.CognitiveServices/accounts/{ai-foundry-name}
```

### Step 4: Deploy Model

Deploy a model (e.g., gpt-4o) in your Azure AI Foundry project and note the deployment name.

## Environment Variables (Optional)

You can also configure credentials via environment variables:

```bash
# For Managed Identity (no environment variables needed - uses DefaultAzureCredential)

# For API Key authentication
AZURE_AI_FOUNDRY_ENDPOINT=https://my-project.cognitiveservices.azure.com/
AZURE_AI_FOUNDRY_API_KEY=your-api-key
AZURE_AI_FOUNDRY_DEPLOYMENT_NAME=gpt-4o
AZURE_AI_FOUNDRY_API_VERSION=2024-10-21
```

## Troubleshooting

### Connection Issues

1. **Private Endpoint Not Reachable**
   - Verify Flowise is in the same VNet or has VNet peering configured
   - Check NSG rules allow outbound HTTPS (443)
   - Verify private DNS zone configuration

2. **Authentication Failures with Managed Identity**
   - Ensure Managed Identity is enabled on your container/app service
   - Verify RBAC role assignment (Cognitive Services User)
   - Check that the identity has propagated (can take 5-10 minutes)

3. **API Key Authentication Issues**
   - Verify the API key is correct
   - Ensure the endpoint URL includes the protocol (`https://`)
   - Check API version compatibility

### Testing Managed Identity

You can test Managed Identity from your Flowise container:

```bash
# Install Azure CLI in container (if not present)
curl -sL https://aka.ms/InstallAzureCLIDeb | bash

# Test managed identity token acquisition
az account get-access-token --resource https://cognitiveservices.azure.com
```

## Supported Models

- GPT-4o
- GPT-4o Mini
- GPT-4
- GPT-4 Turbo
- GPT-3.5 Turbo
- GPT-3.5 Turbo 16K

## Additional Resources

- [Azure AI Foundry Documentation](https://learn.microsoft.com/azure/ai-studio/)
- [Azure Private Endpoints](https://learn.microsoft.com/azure/private-link/private-endpoint-overview)
- [Azure Managed Identities](https://learn.microsoft.com/azure/active-directory/managed-identities-azure-resources/overview)
- [Cognitive Services Authentication](https://learn.microsoft.com/azure/cognitive-services/authentication)
