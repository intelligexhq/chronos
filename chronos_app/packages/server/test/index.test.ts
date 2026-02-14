import * as Server from '../src'
import { getRunningExpressApp } from '../src/utils/getRunningExpressApp'
import { authRouteTest } from './routes/v1/auth.route.test'
import { pingRouteTest } from './routes/v1/ping.route.test'
import { predictionsRouteTest } from './routes/v1/predictions.route.test'
import { agentflowv2GeneratorRouteTest } from './routes/v1/agentflowv2-generator.route.test'
import { chatflowsServiceTest } from './services/chatflows.service.test'
import { agentflowv2GeneratorServiceTest } from './services/agentflowv2-generator.service.test'
import { apiKeyTest } from './utils/api-key.util.test'

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
})

describe('Services Test', () => {
    chatflowsServiceTest()
    agentflowv2GeneratorServiceTest()
})

describe('Utils Test', () => {
    apiKeyTest()
})
