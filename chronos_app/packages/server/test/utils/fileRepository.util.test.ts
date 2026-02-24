import { containsBase64File } from '../../src/utils/fileRepository'

/**
 * Test suite for file repository utility functions
 * Tests base64 file detection in chatflow data
 */
export function fileRepositoryUtilTest() {
    describe('File Repository Utilities', () => {
        describe('containsBase64File', () => {
            /**
             * Creates a minimal chatflow object with flow data
             * @param nodes - Array of node objects
             * @returns ChatFlow-like object
             */
            const createChatflow = (nodes: any[]) =>
                ({
                    flowData: JSON.stringify({ nodes })
                } as any)

            /**
             * Creates a Document Loader node
             * @param inputs - Input key-value pairs
             * @returns Node object
             */
            const createDocLoaderNode = (inputs: Record<string, any>) => ({
                data: { category: 'Document Loaders', inputs }
            })

            it('should return true when node has base64 file input', () => {
                const chatflow = createChatflow([createDocLoaderNode({ file: 'data:application/pdf;base64,JVBERi0xLjQ=' })])
                expect(containsBase64File(chatflow)).toBe(true)
            })

            it('should return false when no nodes have base64 files', () => {
                const chatflow = createChatflow([createDocLoaderNode({ file: 'FILE-STORAGE::document.pdf' })])
                expect(containsBase64File(chatflow)).toBe(false)
            })

            it('should return false for non-Document Loader nodes', () => {
                const chatflow = createChatflow([
                    {
                        data: {
                            category: 'LLM',
                            inputs: { file: 'data:application/pdf;base64,JVBERi0xLjQ=' }
                        }
                    }
                ])
                expect(containsBase64File(chatflow)).toBe(false)
            })

            it('should detect base64 in JSON array input', () => {
                const chatflow = createChatflow([
                    createDocLoaderNode({
                        files: JSON.stringify(['data:application/pdf;base64,JVBERi0xLjQ='])
                    })
                ])
                expect(containsBase64File(chatflow)).toBe(true)
            })

            it('should return false for array input without base64', () => {
                const chatflow = createChatflow([
                    createDocLoaderNode({
                        files: JSON.stringify(['FILE-STORAGE::file1.pdf', 'FILE-STORAGE::file2.pdf'])
                    })
                ])
                expect(containsBase64File(chatflow)).toBe(false)
            })

            it('should handle null input values', () => {
                const chatflow = createChatflow([createDocLoaderNode({ file: null })])
                expect(containsBase64File(chatflow)).toBe(false)
            })

            it('should handle non-string input values', () => {
                const chatflow = createChatflow([createDocLoaderNode({ count: 42 })])
                expect(containsBase64File(chatflow)).toBe(false)
            })

            it('should handle empty inputs', () => {
                const chatflow = createChatflow([createDocLoaderNode({})])
                expect(containsBase64File(chatflow)).toBe(false)
            })

            it('should handle node with no inputs', () => {
                const chatflow = createChatflow([{ data: { category: 'Document Loaders' } }])
                expect(containsBase64File(chatflow)).toBe(false)
            })

            it('should handle empty nodes array', () => {
                const chatflow = createChatflow([])
                expect(containsBase64File(chatflow)).toBe(false)
            })

            it('should handle invalid JSON array string gracefully', () => {
                const chatflow = createChatflow([createDocLoaderNode({ files: '[invalid-json' })])
                expect(containsBase64File(chatflow)).toBe(false)
            })

            it('should detect base64 with various MIME types', () => {
                const chatflow = createChatflow([createDocLoaderNode({ file: 'data:text/plain;base64,SGVsbG8=' })])
                expect(containsBase64File(chatflow)).toBe(true)
            })

            it('should handle multiple Document Loader nodes', () => {
                const chatflow = createChatflow([
                    createDocLoaderNode({ file: 'FILE-STORAGE::doc1.pdf' }),
                    createDocLoaderNode({ file: 'data:application/pdf;base64,JVBERi0xLjQ=' })
                ])
                expect(containsBase64File(chatflow)).toBe(true)
            })
        })
    })
}
