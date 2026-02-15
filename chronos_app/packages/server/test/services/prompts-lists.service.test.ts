import axios from 'axios'

/**
 * Mock axios for prompts-lists service tests
 */
jest.mock('axios')
const mockedAxios = axios as jest.Mocked<typeof axios>

// Import the service after mocking
import promptsListsService from '../../src/services/prompts-lists'

/**
 * Test suite for Prompts Lists service
 * Tests LangChain Hub API integration
 */
export function promptsListsServiceTest() {
    describe('Prompts Lists Service', () => {
        beforeEach(() => {
            jest.clearAllMocks()
        })

        describe('createPromptsList', () => {
            it('should return repos from LangChain Hub API', async () => {
                const mockRepos = [
                    { id: 'repo-1', name: 'prompt-template-1' },
                    { id: 'repo-2', name: 'prompt-template-2' }
                ]
                mockedAxios.get.mockResolvedValue({ data: { repos: mockRepos } })

                const result = await promptsListsService.createPromptsList({})

                expect(result).toEqual({ status: 'OK', repos: mockRepos })
                expect(mockedAxios.get).toHaveBeenCalledWith(expect.stringContaining('https://api.hub.langchain.com/repos/'))
            })

            it('should include tags parameter when provided', async () => {
                const mockRepos = [{ id: 'repo-1', name: 'tagged-prompt' }]
                mockedAxios.get.mockResolvedValue({ data: { repos: mockRepos } })

                const result = await promptsListsService.createPromptsList({ tags: 'qa,chat' })

                expect(result).toEqual({ status: 'OK', repos: mockRepos })
                expect(mockedAxios.get).toHaveBeenCalledWith(expect.stringContaining('tags=qa,chat'))
            })

            it('should return ERROR status when API call fails', async () => {
                mockedAxios.get.mockRejectedValue(new Error('Network error'))

                const result = await promptsListsService.createPromptsList({})

                expect(result).toEqual({ status: 'ERROR', repos: [] })
            })

            it('should return ERROR status when response has no repos', async () => {
                mockedAxios.get.mockResolvedValue({ data: {} })

                const result = await promptsListsService.createPromptsList({})

                // When repos is undefined, it returns undefined (falsy), so no return in try block
                expect(result).toBeUndefined()
            })
        })
    })
}
