import { createMockRepository } from '../mocks/appServer.mock'

/**
 * Test suite for Validation service
 * Tests flow validation logic
 */
export function validationServiceTest() {
    describe('Validation Service', () => {
        let validationService: any
        let mockRepository: ReturnType<typeof createMockRepository>
        let mockComponentNodes: any
        let mockAppServer: any

        beforeAll(() => {
            // Reset modules to ensure clean state
            jest.resetModules()

            // Create fresh mocks
            mockRepository = createMockRepository()
            mockComponentNodes = {
                chatOpenAI: {
                    inputs: [
                        { name: 'modelName', label: 'Model Name', optional: false },
                        { name: 'temperature', label: 'Temperature', optional: true }
                    ],
                    credential: { optional: false }
                },
                conditionalNode: {
                    inputs: [
                        { name: 'showField', label: 'Show Field', optional: false, show: { type: 'conditional' } },
                        { name: 'hideField', label: 'Hide Field', optional: false, hide: { type: 'hidden' } }
                    ]
                }
            }

            mockAppServer = {
                AppDataSource: {
                    getRepository: jest.fn().mockReturnValue(mockRepository)
                },
                nodesPool: {
                    componentNodes: mockComponentNodes
                }
            }

            // Setup mocks before importing service
            jest.doMock('../../src/utils/getRunningExpressApp', () => ({
                getRunningExpressApp: jest.fn(() => mockAppServer)
            }))

            // Import service after mocks are set up
            validationService = require('../../src/services/validation').default
        })

        afterAll(() => {
            jest.resetModules()
        })

        beforeEach(() => {
            jest.clearAllMocks()
            mockAppServer.AppDataSource.getRepository.mockReturnValue(mockRepository)
        })

        describe('checkFlowValidation', () => {
            it('should return empty array for valid flow with all required fields', async () => {
                const validFlow = {
                    id: 'flow-1',
                    flowData: JSON.stringify({
                        nodes: [
                            {
                                id: 'node-1',
                                data: {
                                    name: 'chatOpenAI',
                                    label: 'ChatOpenAI',
                                    inputParams: [{ name: 'modelName', label: 'Model', optional: false }],
                                    inputs: { modelName: 'gpt-4' }
                                }
                            },
                            {
                                id: 'node-2',
                                data: {
                                    name: 'outputNode',
                                    label: 'Output',
                                    inputParams: [],
                                    inputs: {}
                                }
                            }
                        ],
                        edges: [{ id: 'edge-1', source: 'node-1', target: 'node-2' }]
                    })
                }
                mockRepository.findOne.mockResolvedValue(validFlow)

                const result = await validationService.checkFlowValidation('flow-1')

                expect(result).toEqual([])
            })

            it('should throw NOT_FOUND for non-existent flow', async () => {
                mockRepository.findOne.mockResolvedValue(null)

                await expect(validationService.checkFlowValidation('non-existent')).rejects.toThrow('not found')
            })

            it('should report unconnected nodes', async () => {
                const flowWithUnconnectedNode = {
                    id: 'flow-1',
                    flowData: JSON.stringify({
                        nodes: [
                            {
                                id: 'node-1',
                                data: { name: 'chatOpenAI', label: 'ChatOpenAI', inputParams: [], inputs: {} }
                            },
                            {
                                id: 'node-2',
                                data: { name: 'unconnected', label: 'Unconnected Node', inputParams: [], inputs: {} }
                            }
                        ],
                        edges: [] // No edges - both nodes unconnected
                    })
                }
                mockRepository.findOne.mockResolvedValue(flowWithUnconnectedNode)

                const result = await validationService.checkFlowValidation('flow-1')

                expect(result.length).toBeGreaterThan(0)
                expect(result.some((r: any) => r.issues.some((i: string) => i.includes('not connected')))).toBe(true)
            })

            it('should report missing required fields', async () => {
                const flowWithMissingField = {
                    id: 'flow-1',
                    flowData: JSON.stringify({
                        nodes: [
                            {
                                id: 'node-1',
                                data: {
                                    name: 'chatOpenAI',
                                    label: 'ChatOpenAI',
                                    inputParams: [{ name: 'modelName', label: 'Model Name', optional: false }],
                                    inputs: { modelName: '' } // Empty required field
                                }
                            },
                            {
                                id: 'node-2',
                                data: { name: 'output', label: 'Output', inputParams: [], inputs: {} }
                            }
                        ],
                        edges: [{ id: 'edge-1', source: 'node-1', target: 'node-2' }]
                    })
                }
                mockRepository.findOne.mockResolvedValue(flowWithMissingField)

                const result = await validationService.checkFlowValidation('flow-1')

                expect(result.length).toBeGreaterThan(0)
                expect(result.some((r: any) => r.issues.some((i: string) => i.includes('required')))).toBe(true)
            })

            it('should skip validation for fields with show condition not met', async () => {
                const flowWithShowCondition = {
                    id: 'flow-1',
                    flowData: JSON.stringify({
                        nodes: [
                            {
                                id: 'node-1',
                                data: {
                                    name: 'conditional',
                                    label: 'Conditional',
                                    inputParams: [
                                        {
                                            name: 'conditionalField',
                                            label: 'Conditional Field',
                                            optional: false,
                                            show: { type: 'advanced' }
                                        }
                                    ],
                                    inputs: { type: 'basic' } // show condition not met
                                }
                            },
                            {
                                id: 'node-2',
                                data: { name: 'output', label: 'Output', inputParams: [], inputs: {} }
                            }
                        ],
                        edges: [{ id: 'edge-1', source: 'node-1', target: 'node-2' }]
                    })
                }
                mockRepository.findOne.mockResolvedValue(flowWithShowCondition)

                const result = await validationService.checkFlowValidation('flow-1')

                // Should not report the conditional field as missing
                const nodeResult = result.find((r: any) => r.id === 'node-1')
                if (nodeResult) {
                    expect(nodeResult.issues.some((i: string) => i.includes('Conditional Field'))).toBe(false)
                }
            })

            it('should skip validation for fields with hide condition met', async () => {
                const flowWithHideCondition = {
                    id: 'flow-1',
                    flowData: JSON.stringify({
                        nodes: [
                            {
                                id: 'node-1',
                                data: {
                                    name: 'hideable',
                                    label: 'Hideable',
                                    inputParams: [
                                        {
                                            name: 'hiddenField',
                                            label: 'Hidden Field',
                                            optional: false,
                                            hide: { mode: 'simple' }
                                        }
                                    ],
                                    inputs: { mode: 'simple' } // hide condition met
                                }
                            },
                            {
                                id: 'node-2',
                                data: { name: 'output', label: 'Output', inputParams: [], inputs: {} }
                            }
                        ],
                        edges: [{ id: 'edge-1', source: 'node-1', target: 'node-2' }]
                    })
                }
                mockRepository.findOne.mockResolvedValue(flowWithHideCondition)

                const result = await validationService.checkFlowValidation('flow-1')

                // Should not report the hidden field as missing
                const nodeResult = result.find((r: any) => r.id === 'node-1')
                if (nodeResult) {
                    expect(nodeResult.issues.some((i: string) => i.includes('Hidden Field'))).toBe(false)
                }
            })

            it('should report missing credentials', async () => {
                const flowWithMissingCredential = {
                    id: 'flow-1',
                    flowData: JSON.stringify({
                        nodes: [
                            {
                                id: 'node-1',
                                data: {
                                    name: 'chatOpenAI',
                                    label: 'ChatOpenAI',
                                    inputParams: [{ name: 'credential', label: 'Credential', optional: false }],
                                    inputs: { credential: '' }
                                }
                            },
                            {
                                id: 'node-2',
                                data: { name: 'output', label: 'Output', inputParams: [], inputs: {} }
                            }
                        ],
                        edges: [{ id: 'edge-1', source: 'node-1', target: 'node-2' }]
                    })
                }
                mockRepository.findOne.mockResolvedValue(flowWithMissingCredential)

                const result = await validationService.checkFlowValidation('flow-1')

                expect(result.some((r: any) => r.issues.some((i: string) => i.includes('Credential')))).toBe(true)
            })

            it('should skip stickyNoteAgentflow nodes', async () => {
                const flowWithStickyNote = {
                    id: 'flow-1',
                    flowData: JSON.stringify({
                        nodes: [
                            {
                                id: 'sticky-1',
                                data: {
                                    name: 'stickyNoteAgentflow',
                                    label: 'Sticky Note',
                                    inputParams: [{ name: 'content', label: 'Content', optional: false }],
                                    inputs: {} // Missing required field, but should be skipped
                                }
                            },
                            {
                                id: 'node-1',
                                data: { name: 'output', label: 'Output', inputParams: [], inputs: {} }
                            }
                        ],
                        edges: []
                    })
                }
                mockRepository.findOne.mockResolvedValue(flowWithStickyNote)

                const result = await validationService.checkFlowValidation('flow-1')

                // Sticky note should not be in validation results
                expect(result.find((r: any) => r.name === 'stickyNoteAgentflow')).toBeUndefined()
            })

            it('should validate array type parameters', async () => {
                const flowWithArray = {
                    id: 'flow-1',
                    flowData: JSON.stringify({
                        nodes: [
                            {
                                id: 'node-1',
                                data: {
                                    name: 'arrayNode',
                                    label: 'Array Node',
                                    inputParams: [
                                        {
                                            name: 'conditions',
                                            label: 'Conditions',
                                            type: 'array',
                                            optional: true,
                                            array: [{ name: 'value', label: 'Value', optional: false }]
                                        }
                                    ],
                                    inputs: {
                                        conditions: [{ value: '' }] // Empty required array item field
                                    }
                                }
                            },
                            {
                                id: 'node-2',
                                data: { name: 'output', label: 'Output', inputParams: [], inputs: {} }
                            }
                        ],
                        edges: [{ id: 'edge-1', source: 'node-1', target: 'node-2' }]
                    })
                }
                mockRepository.findOne.mockResolvedValue(flowWithArray)

                const result = await validationService.checkFlowValidation('flow-1')

                expect(result.some((r: any) => r.issues.some((i: string) => i.includes('item #1')))).toBe(true)
            })

            it('should detect hanging edges with missing source', async () => {
                const flowWithHangingEdge = {
                    id: 'flow-1',
                    flowData: JSON.stringify({
                        nodes: [
                            {
                                id: 'node-1',
                                data: { name: 'target', label: 'Target', inputParams: [], inputs: {} }
                            }
                        ],
                        edges: [{ id: 'edge-1', source: 'missing-node', target: 'node-1' }]
                    })
                }
                mockRepository.findOne.mockResolvedValue(flowWithHangingEdge)

                const result = await validationService.checkFlowValidation('flow-1')

                expect(result.some((r: any) => r.issues.some((i: string) => i.includes('non-existent source')))).toBe(true)
            })

            it('should detect hanging edges with missing target', async () => {
                const flowWithHangingEdge = {
                    id: 'flow-1',
                    flowData: JSON.stringify({
                        nodes: [
                            {
                                id: 'node-1',
                                data: { name: 'source', label: 'Source', inputParams: [], inputs: {} }
                            }
                        ],
                        edges: [{ id: 'edge-1', source: 'node-1', target: 'missing-node' }]
                    })
                }
                mockRepository.findOne.mockResolvedValue(flowWithHangingEdge)

                const result = await validationService.checkFlowValidation('flow-1')

                expect(result.some((r: any) => r.issues.some((i: string) => i.includes('non-existent target')))).toBe(true)
            })

            it('should detect disconnected edges', async () => {
                const flowWithDisconnectedEdge = {
                    id: 'flow-1',
                    flowData: JSON.stringify({
                        nodes: [],
                        edges: [{ id: 'edge-1', source: 'missing-1', target: 'missing-2' }]
                    })
                }
                mockRepository.findOne.mockResolvedValue(flowWithDisconnectedEdge)

                const result = await validationService.checkFlowValidation('flow-1')

                expect(result.some((r: any) => r.name === 'edge' && r.issues.some((i: string) => i.includes('Disconnected')))).toBe(true)
            })

            it('should validate nested config parameters', async () => {
                const flowWithNestedConfig = {
                    id: 'flow-1',
                    flowData: JSON.stringify({
                        nodes: [
                            {
                                id: 'node-1',
                                data: {
                                    name: 'nestedNode',
                                    label: 'Nested Node',
                                    inputParams: [{ name: 'llm', label: 'LLM', optional: false }],
                                    inputs: {
                                        llm: 'chatOpenAI',
                                        llmConfig: { modelName: '' } // Missing required nested field
                                    }
                                }
                            },
                            {
                                id: 'node-2',
                                data: { name: 'output', label: 'Output', inputParams: [], inputs: {} }
                            }
                        ],
                        edges: [{ id: 'edge-1', source: 'node-1', target: 'node-2' }]
                    })
                }
                mockRepository.findOne.mockResolvedValue(flowWithNestedConfig)

                const result = await validationService.checkFlowValidation('flow-1')

                expect(result.some((r: any) => r.issues.some((i: string) => i.includes('configuration')))).toBe(true)
            })

            it('should validate with workspace filtering', async () => {
                const validFlow = {
                    id: 'flow-1',
                    workspaceId: 'workspace-1',
                    flowData: JSON.stringify({ nodes: [], edges: [] })
                }
                mockRepository.findOne.mockResolvedValue(validFlow)

                await validationService.checkFlowValidation('flow-1', 'workspace-1')

                expect(mockRepository.findOne).toHaveBeenCalledWith({
                    where: { id: 'flow-1', workspaceId: 'workspace-1' }
                })
            })
        })
    })
}
