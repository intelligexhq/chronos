import { createMockRepository, createMockQueryBuilder, createMockTelemetry } from '../mocks/appServer.mock'

/**
 * Test suite for Tools service
 * Tests CRUD operations with mocked database
 */
export function toolsServiceTest() {
    describe('Tools Service', () => {
        let toolsService: any
        let mockRepository: ReturnType<typeof createMockRepository>
        let mockQueryBuilder: ReturnType<typeof createMockQueryBuilder>
        let mockTelemetry: ReturnType<typeof createMockTelemetry>
        let mockMetricsProvider: any
        let mockAppServer: any

        beforeAll(() => {
            // Reset modules to ensure clean state
            jest.resetModules()

            // Create fresh mocks
            mockRepository = createMockRepository()
            mockQueryBuilder = createMockQueryBuilder()
            mockRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder)
            mockTelemetry = createMockTelemetry()
            mockMetricsProvider = {
                incrementCounter: jest.fn()
            }

            mockAppServer = {
                AppDataSource: {
                    getRepository: jest.fn().mockReturnValue(mockRepository)
                },
                telemetry: mockTelemetry,
                metricsProvider: mockMetricsProvider
            }

            // Setup mocks before importing service
            jest.doMock('../../src/utils/getRunningExpressApp', () => ({
                getRunningExpressApp: jest.fn(() => mockAppServer)
            }))

            jest.doMock('../../src/utils', () => ({
                getAppVersion: jest.fn().mockResolvedValue('1.0.0')
            }))

            // Import service after mocks are set up
            toolsService = require('../../src/services/tools').default
        })

        afterAll(() => {
            jest.resetModules()
        })

        beforeEach(() => {
            jest.clearAllMocks()
            // Re-setup mock return values
            mockAppServer.AppDataSource.getRepository.mockReturnValue(mockRepository)
            mockRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder)
        })

        describe('createTool', () => {
            it('should create a new tool', async () => {
                const toolData = {
                    name: 'Test Tool',
                    description: 'Test description',
                    func: 'testFunc',
                    schema: '{}'
                }
                const savedTool = { id: 'tool-1', ...toolData }

                mockRepository.create.mockReturnValue(savedTool)
                mockRepository.save.mockResolvedValue(savedTool)

                const result = await toolsService.createTool(toolData, 'org-1')

                expect(mockRepository.create).toHaveBeenCalled()
                expect(mockRepository.save).toHaveBeenCalled()
                expect(result).toEqual(savedTool)
            })

            it('should send telemetry on tool creation', async () => {
                const toolData = { name: 'Telemetry Tool' }
                const savedTool = { id: 'tool-2', ...toolData }

                mockRepository.create.mockReturnValue(savedTool)
                mockRepository.save.mockResolvedValue(savedTool)

                await toolsService.createTool(toolData, 'org-1')

                expect(mockTelemetry.sendTelemetry).toHaveBeenCalledWith(
                    'tool_created',
                    expect.objectContaining({
                        toolId: 'tool-2',
                        toolName: 'Telemetry Tool'
                    }),
                    'org-1'
                )
            })

            it('should increment metrics counter on success', async () => {
                const toolData = { name: 'Metrics Tool' }
                const savedTool = { id: 'tool-3', ...toolData }

                mockRepository.create.mockReturnValue(savedTool)
                mockRepository.save.mockResolvedValue(savedTool)

                await toolsService.createTool(toolData, 'org-1')

                expect(mockMetricsProvider.incrementCounter).toHaveBeenCalled()
            })

            it('should throw error on database failure', async () => {
                mockRepository.create.mockImplementation(() => {
                    throw new Error('Database error')
                })

                await expect(toolsService.createTool({}, 'org-1')).rejects.toThrow()
            })
        })

        describe('deleteTool', () => {
            it('should delete tool by ID', async () => {
                mockRepository.delete.mockResolvedValue({ affected: 1 })

                const result = await toolsService.deleteTool('tool-1')

                expect(mockRepository.delete).toHaveBeenCalledWith({ id: 'tool-1' })
                expect(result).toEqual({ affected: 1 })
            })

            it('should handle non-existent tool deletion', async () => {
                mockRepository.delete.mockResolvedValue({ affected: 0 })

                const result = await toolsService.deleteTool('non-existent')

                expect(result).toEqual({ affected: 0 })
            })

            it('should throw error on database failure', async () => {
                mockRepository.delete.mockRejectedValue(new Error('Database error'))

                await expect(toolsService.deleteTool('tool-1')).rejects.toThrow()
            })
        })

        describe('getAllTools', () => {
            it('should return all tools without pagination', async () => {
                const mockTools = [
                    { id: '1', name: 'Tool 1' },
                    { id: '2', name: 'Tool 2' }
                ]
                mockQueryBuilder.getManyAndCount.mockResolvedValue([mockTools, 2])

                const result = await toolsService.getAllTools()

                expect(mockRepository.createQueryBuilder).toHaveBeenCalledWith('tool')
                expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith('tool.updatedDate', 'DESC')
                expect(result).toEqual(mockTools)
            })

            it('should return paginated results', async () => {
                const mockTools = [{ id: '1', name: 'Tool 1' }]
                mockQueryBuilder.getManyAndCount.mockResolvedValue([mockTools, 10])

                const result = await toolsService.getAllTools(2, 5)

                expect(mockQueryBuilder.skip).toHaveBeenCalledWith(5)
                expect(mockQueryBuilder.take).toHaveBeenCalledWith(5)
                expect(result).toEqual({ data: mockTools, total: 10 })
            })

            it('should not paginate with invalid page/limit', async () => {
                const mockTools = [{ id: '1', name: 'Tool 1' }]
                mockQueryBuilder.getManyAndCount.mockResolvedValue([mockTools, 1])

                const result = await toolsService.getAllTools(-1, -1)

                expect(mockQueryBuilder.skip).not.toHaveBeenCalled()
                expect(mockQueryBuilder.take).not.toHaveBeenCalled()
                expect(result).toEqual(mockTools)
            })

            it('should throw error on database failure', async () => {
                mockQueryBuilder.getManyAndCount.mockRejectedValue(new Error('Database error'))

                await expect(toolsService.getAllTools()).rejects.toThrow()
            })
        })

        describe('getToolById', () => {
            it('should return tool by ID', async () => {
                const mockTool = { id: 'tool-1', name: 'Test Tool' }
                mockRepository.findOneBy.mockResolvedValue(mockTool)

                const result = await toolsService.getToolById('tool-1')

                expect(mockRepository.findOneBy).toHaveBeenCalledWith({ id: 'tool-1' })
                expect(result).toEqual(mockTool)
            })

            it('should throw NOT_FOUND error for non-existent tool', async () => {
                mockRepository.findOneBy.mockResolvedValue(null)

                await expect(toolsService.getToolById('non-existent')).rejects.toThrow('not found')
            })

            it('should throw error on database failure', async () => {
                mockRepository.findOneBy.mockRejectedValue(new Error('Database error'))

                await expect(toolsService.getToolById('tool-1')).rejects.toThrow()
            })
        })

        describe('updateTool', () => {
            it('should update existing tool', async () => {
                const existingTool = { id: 'tool-1', name: 'Old Name' }
                const updatedTool = { id: 'tool-1', name: 'New Name' }

                mockRepository.findOneBy.mockResolvedValue(existingTool)
                mockRepository.save.mockResolvedValue(updatedTool)

                const result = await toolsService.updateTool('tool-1', { name: 'New Name' })

                expect(mockRepository.findOneBy).toHaveBeenCalledWith({ id: 'tool-1' })
                expect(mockRepository.merge).toHaveBeenCalled()
                expect(mockRepository.save).toHaveBeenCalled()
                expect(result).toEqual(updatedTool)
            })

            it('should throw NOT_FOUND error for non-existent tool', async () => {
                mockRepository.findOneBy.mockResolvedValue(null)

                await expect(toolsService.updateTool('non-existent', { name: 'Updated' })).rejects.toThrow('not found')
            })

            it('should throw error on database failure', async () => {
                mockRepository.findOneBy.mockResolvedValue({ id: 'tool-1' })
                mockRepository.save.mockRejectedValue(new Error('Database error'))

                await expect(toolsService.updateTool('tool-1', { name: 'Updated' })).rejects.toThrow()
            })
        })

        describe('importTools', () => {
            it('should return early for empty tools array', async () => {
                const result = await toolsService.importTools([])

                expect(mockRepository.insert).not.toHaveBeenCalled()
                expect(result).toBeUndefined()
            })

            it('should throw error for invalid tool ID', async () => {
                const invalidTools = [{ id: 'invalid-uuid', name: 'Tool' }]

                await expect(toolsService.importTools(invalidTools)).rejects.toThrow('invalid id')
            })

            it('should import tools with valid UUIDs', async () => {
                const validTools = [
                    { id: '550e8400-e29b-41d4-a716-446655440000', name: 'Tool 1' },
                    { id: '550e8400-e29b-41d4-a716-446655440001', name: 'Tool 2' }
                ]

                mockQueryBuilder.getMany.mockResolvedValue([])
                mockRepository.insert.mockResolvedValue({ identifiers: [{ id: '1' }, { id: '2' }] })

                const result = await toolsService.importTools(validTools)

                expect(mockRepository.insert).toHaveBeenCalled()
                expect(result).toBeDefined()
            })

            it('should handle duplicate IDs by renaming tools', async () => {
                const tools = [{ id: '550e8400-e29b-41d4-a716-446655440000', name: 'Tool 1' }]

                // Simulate existing tool with same ID
                mockQueryBuilder.getMany.mockResolvedValue([{ id: '550e8400-e29b-41d4-a716-446655440000' }])
                mockRepository.insert.mockResolvedValue({ identifiers: [{ id: 'new-id' }] })

                await toolsService.importTools(tools)

                // The tool should have been modified (id removed, name appended with (1))
                expect(mockRepository.insert).toHaveBeenCalled()
            })

            it('should throw error on database failure', async () => {
                const validTools = [{ id: '550e8400-e29b-41d4-a716-446655440000', name: 'Tool' }]

                mockQueryBuilder.getMany.mockResolvedValue([])
                mockRepository.insert.mockRejectedValue(new Error('Database error'))

                await expect(toolsService.importTools(validTools)).rejects.toThrow()
            })
        })
    })
}
