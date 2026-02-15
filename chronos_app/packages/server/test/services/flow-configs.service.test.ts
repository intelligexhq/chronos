import { createMockRepository } from '../mocks/appServer.mock'

/**
 * Mock setup for flow-configs service tests
 */
const mockRepository = createMockRepository()

const mockNodesPool = {
    componentCredentials: {
        'openai-credential': { name: 'OpenAI API Key' }
    }
}

const mockAppServer = {
    AppDataSource: {
        getRepository: jest.fn().mockReturnValue(mockRepository)
    },
    nodesPool: mockNodesPool
}

jest.mock('../../src/utils/getRunningExpressApp', () => ({
    getRunningExpressApp: jest.fn(() => mockAppServer)
}))

// Mock chatflowsService
const mockGetChatflowById = jest.fn()
jest.mock('../../src/services/chatflows', () => ({
    default: {
        getChatflowById: mockGetChatflowById
    }
}))

// Mock findAvailableConfigs utility
const mockFindAvailableConfigs = jest.fn()
jest.mock('../../src/utils', () => ({
    findAvailableConfigs: mockFindAvailableConfigs
}))

// Import the service after mocking
import flowConfigsService from '../../src/services/flow-configs'

/**
 * Test suite for Flow Configs service
 * Tests chatflow configuration retrieval
 */
export function flowConfigsServiceTest() {
    describe('Flow Configs Service', () => {
        beforeEach(() => {
            jest.clearAllMocks()
        })

        describe('getSingleFlowConfig', () => {
            it('should return available configs for a chatflow', async () => {
                const mockChatflow = {
                    id: 'flow-1',
                    flowData: JSON.stringify({
                        nodes: [{ id: 'node-1', data: { name: 'OpenAI Chat' } }]
                    })
                }
                const mockConfigs = [{ nodeId: 'node-1', label: 'Model', name: 'model' }]

                mockGetChatflowById.mockResolvedValue(mockChatflow)
                mockFindAvailableConfigs.mockReturnValue(mockConfigs)

                const result = await flowConfigsService.getSingleFlowConfig('flow-1')

                expect(result).toEqual(mockConfigs)
                expect(mockGetChatflowById).toHaveBeenCalledWith('flow-1')
                expect(mockFindAvailableConfigs).toHaveBeenCalledWith(expect.any(Array), mockNodesPool.componentCredentials)
            })

            it('should throw error when chatflow not found', async () => {
                mockGetChatflowById.mockResolvedValue(null)

                await expect(flowConfigsService.getSingleFlowConfig('non-existent')).rejects.toThrow('Chatflow non-existent not found')
            })

            it('should throw InternalFlowiseError on general error', async () => {
                mockGetChatflowById.mockRejectedValue(new Error('Database error'))

                await expect(flowConfigsService.getSingleFlowConfig('flow-1')).rejects.toThrow(
                    'Error: flowConfigService.getSingleFlowConfig'
                )
            })

            it('should parse flowData JSON correctly', async () => {
                const nodes = [
                    { id: 'node-1', data: { name: 'LLM' } },
                    { id: 'node-2', data: { name: 'Memory' } }
                ]
                const mockChatflow = {
                    id: 'flow-1',
                    flowData: JSON.stringify({ nodes })
                }

                mockGetChatflowById.mockResolvedValue(mockChatflow)
                mockFindAvailableConfigs.mockReturnValue([])

                await flowConfigsService.getSingleFlowConfig('flow-1')

                expect(mockFindAvailableConfigs).toHaveBeenCalledWith(nodes, mockNodesPool.componentCredentials)
            })
        })
    })
}
