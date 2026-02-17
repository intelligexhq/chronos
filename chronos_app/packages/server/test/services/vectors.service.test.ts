import { Request } from 'express'

/**
 * Mock upsertVector utility for vectors service tests
 */
const mockUpsertVector = jest.fn()

jest.mock('../../src/utils/upsertVector', () => ({
    upsertVector: mockUpsertVector
}))

// Import the service after mocking
import vectorsService from '../../src/services/vectors'

/**
 * Test suite for Vectors service
 * Tests vector upsert middleware operations
 */
export function vectorsServiceTest() {
    describe('Vectors Service', () => {
        beforeEach(() => {
            jest.clearAllMocks()
        })

        describe('upsertVectorMiddleware', () => {
            it('should call upsertVector with request and isInternal=false by default', async () => {
                const mockRequest = { body: { data: 'test' } } as Request
                const mockResult = { success: true, vectorIds: ['v1', 'v2'] }
                mockUpsertVector.mockResolvedValue(mockResult)

                const result = await vectorsService.upsertVectorMiddleware(mockRequest)

                expect(result).toEqual(mockResult)
                expect(mockUpsertVector).toHaveBeenCalledWith(mockRequest, false)
            })

            it('should call upsertVector with isInternal=true when specified', async () => {
                const mockRequest = { body: { data: 'test' } } as Request
                const mockResult = { success: true }
                mockUpsertVector.mockResolvedValue(mockResult)

                const result = await vectorsService.upsertVectorMiddleware(mockRequest, true)

                expect(result).toEqual(mockResult)
                expect(mockUpsertVector).toHaveBeenCalledWith(mockRequest, true)
            })

            it('should throw InternalChronosError when upsertVector fails', async () => {
                const mockRequest = { body: {} } as Request
                mockUpsertVector.mockRejectedValue(new Error('Vector store error'))

                await expect(vectorsService.upsertVectorMiddleware(mockRequest)).rejects.toThrow('Error: vectorsService.upsertVector')
            })
        })
    })
}
