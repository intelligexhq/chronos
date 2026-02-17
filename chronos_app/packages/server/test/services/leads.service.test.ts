import { createMockRepository } from '../mocks/appServer.mock'

/**
 * Mock setup for leads service tests
 */
const mockRepository = createMockRepository()

const mockAppServer = {
    AppDataSource: {
        getRepository: jest.fn().mockReturnValue(mockRepository)
    }
}

jest.mock('../../src/utils/getRunningExpressApp', () => ({
    getRunningExpressApp: jest.fn(() => mockAppServer)
}))

// Import the service after mocking
import leadsService from '../../src/services/leads'

/**
 * Test suite for Leads service
 * Tests CRUD operations with mocked database
 */
export function leadsServiceTest() {
    describe('Leads Service', () => {
        beforeEach(() => {
            jest.clearAllMocks()
        })

        describe('getAllLeads', () => {
            it('should return all leads for a chatflow', async () => {
                const mockLeads = [
                    { id: 'lead-1', chatflowid: 'flow-1', name: 'John Doe', email: 'john@example.com' },
                    { id: 'lead-2', chatflowid: 'flow-1', name: 'Jane Doe', email: 'jane@example.com' }
                ]
                mockRepository.find.mockResolvedValue(mockLeads)

                const result = await leadsService.getAllLeads('flow-1')

                expect(result).toEqual(mockLeads)
                expect(mockRepository.find).toHaveBeenCalledWith({
                    where: { chatflowid: 'flow-1' }
                })
            })

            it('should return empty array when no leads found', async () => {
                mockRepository.find.mockResolvedValue([])

                const result = await leadsService.getAllLeads('flow-1')

                expect(result).toEqual([])
            })

            it('should throw InternalChronosError on database error', async () => {
                mockRepository.find.mockRejectedValue(new Error('Database connection failed'))

                await expect(leadsService.getAllLeads('flow-1')).rejects.toThrow('Error: leadsService.getAllLeads')
            })
        })

        describe('createLead', () => {
            it('should create a new lead with provided chatId', async () => {
                const newLead = {
                    chatflowid: 'flow-1',
                    chatId: 'custom-chat-id',
                    name: 'John Doe',
                    email: 'john@example.com'
                }
                const savedLead = { id: 'lead-1', ...newLead }

                mockRepository.create.mockReturnValue(savedLead)
                mockRepository.save.mockResolvedValue(savedLead)

                const result = await leadsService.createLead(newLead)

                expect(result).toEqual(savedLead)
                expect(mockRepository.create).toHaveBeenCalled()
                expect(mockRepository.save).toHaveBeenCalled()
            })

            it('should generate chatId when not provided', async () => {
                const newLead = {
                    chatflowid: 'flow-1',
                    name: 'John Doe',
                    email: 'john@example.com'
                }
                const savedLead = { id: 'lead-1', chatId: 'generated-uuid', ...newLead }

                mockRepository.create.mockReturnValue(savedLead)
                mockRepository.save.mockResolvedValue(savedLead)

                const result = await leadsService.createLead(newLead)

                expect(result).toBeDefined()
                expect(mockRepository.save).toHaveBeenCalled()
            })

            it('should throw InternalChronosError on save error', async () => {
                mockRepository.create.mockReturnValue({})
                mockRepository.save.mockRejectedValue(new Error('Save failed'))

                await expect(leadsService.createLead({ chatflowid: 'flow-1' })).rejects.toThrow('Error: leadsService.createLead')
            })
        })
    })
}
