import * as Server from '../src'
import { getRunningExpressApp } from '../src/utils/getRunningExpressApp'
import { authRouteTest } from './routes/v1/auth.route.test'
import { pingRouteTest } from './routes/v1/ping.route.test'
import { predictionsRouteTest } from './routes/v1/predictions.route.test'
import { agentflowv2GeneratorRouteTest } from './routes/v1/agentflowv2-generator.route.test'
import { settingsRouteTest } from './routes/v1/settings.route.test'
import { versionsRouteTest } from './routes/v1/versions.route.test'
import { statsRouteTest } from './routes/v1/stats.route.test'
import { promptsListsRouteTest } from './routes/v1/prompts-lists.route.test'
import { nodesRouteTest } from './routes/v1/nodes.route.test'
import { toolsRouteTest } from './routes/v1/tools.route.test'
import { variablesRouteTest } from './routes/v1/variables.route.test'
import { credentialsRouteTest } from './routes/v1/credentials.route.test'
import { apikeyRouteTest } from './routes/v1/apikey.route.test'
import { feedbackRouteTest } from './routes/v1/feedback.route.test'
import { executionsRouteTest } from './routes/v1/executions.route.test'
import { chatMessagesRouteTest } from './routes/v1/chat-messages.route.test'
import { documentstoreRouteTest } from './routes/v1/documentstore.route.test'
import { upsertHistoryRouteTest } from './routes/v1/upsert-history.route.test'
import { marketplacesRouteTest } from './routes/v1/marketplaces.route.test'
import { chatflowsExtendedRouteTest } from './routes/v1/chatflows-extended.route.test'
import { assistantsRouteTest } from './routes/v1/assistants.route.test'
import { flowConfigRouteTest } from './routes/v1/flow-config.route.test'
import { internalPredictionsRouteTest } from './routes/v1/internal-predictions.route.test'
import { chatflowsServiceTest } from './services/chatflows.service.test'
import { agentflowv2GeneratorServiceTest } from './services/agentflowv2-generator.service.test'
import { apiKeyTest } from './utils/api-key.util.test'
import { sanitizeUtilTest } from './utils/sanitize.util.test'
import { domainValidationUtilTest } from './utils/domain-validation.util.test'
import { indexUtilTest } from './utils/index.util.test'
import { xssUtilTest } from './utils/XSS.util.test'
import { buildAgentflowUtilTest } from './utils/buildAgentflow.util.test'
import { paginationUtilTest } from './utils/pagination.util.test'
import { telemetryUtilTest } from './utils/telemetry.util.test'
import { fileValidationUtilTest } from './utils/fileValidation.util.test'
import { loggerUtilTest } from './utils/logger.util.test'
import { validateKeyUtilTest } from './utils/validateKey.util.test'
import { rateLimitUtilTest } from './utils/rateLimit.util.test'
import { errorUtilsTest } from './errors/utils.test'
import { internalFlowiseErrorTest } from './errors/internalFlowiseError.test'
import { cachePoolTest } from './CachePool.test'
import { abortControllerPoolTest } from './AbortControllerPool.test'
import { simpleIdentityManagerTest } from './SimpleIdentityManager.test'

// extend test timeout to 6 minutes for long setups (increase as tests grow)
jest.setTimeout(360000)

beforeAll(async () => {
    await Server.start()

    // wait 20 seconds for full server and database init (esp. on lower end hardware)
    await new Promise((resolve) => setTimeout(resolve, 1 * 20 * 1000))
})

afterAll(async () => {
    await getRunningExpressApp().stopApp()
})

describe('Routes Test', () => {
    pingRouteTest()
    authRouteTest()
    predictionsRouteTest()
    agentflowv2GeneratorRouteTest()
    settingsRouteTest()
    versionsRouteTest()
    statsRouteTest()
    promptsListsRouteTest()
    nodesRouteTest()
    toolsRouteTest()
    variablesRouteTest()
    credentialsRouteTest()
    apikeyRouteTest()
    feedbackRouteTest()
    executionsRouteTest()
    chatMessagesRouteTest()
    documentstoreRouteTest()
    upsertHistoryRouteTest()
    marketplacesRouteTest()
    chatflowsExtendedRouteTest()
    assistantsRouteTest()
    flowConfigRouteTest()
    internalPredictionsRouteTest()
})

describe('Services Test', () => {
    chatflowsServiceTest()
    agentflowv2GeneratorServiceTest()
})

describe('Utils Test', () => {
    apiKeyTest()
    sanitizeUtilTest()
    domainValidationUtilTest()
    indexUtilTest()
    xssUtilTest()
    buildAgentflowUtilTest()
    paginationUtilTest()
    telemetryUtilTest()
    fileValidationUtilTest()
    loggerUtilTest()
    validateKeyUtilTest()
    rateLimitUtilTest()
})

describe('Errors Test', () => {
    errorUtilsTest()
    internalFlowiseErrorTest()
})

describe('Cache Test', () => {
    cachePoolTest()
})

describe('Pool Test', () => {
    abortControllerPoolTest()
})

describe('Identity Test', () => {
    simpleIdentityManagerTest()
})
