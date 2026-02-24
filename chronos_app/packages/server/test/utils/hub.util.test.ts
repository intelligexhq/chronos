import { parsePrompt } from '../../src/utils/hub'

/**
 * Test suite for hub utility functions
 * Tests prompt parsing from LangChain Hub format
 */
export function hubUtilTest() {
    describe('Hub Utilities', () => {
        describe('parsePrompt', () => {
            it('should parse prompt with system and human messages', () => {
                const prompt = JSON.stringify({
                    kwargs: {
                        messages: [
                            {
                                id: ['langchain', 'SystemMessagePromptTemplate'],
                                kwargs: { prompt: { kwargs: { template: 'You are a helpful assistant.' } } }
                            },
                            {
                                id: ['langchain', 'HumanMessagePromptTemplate'],
                                kwargs: { prompt: { kwargs: { template: 'Hello {name}' } } }
                            }
                        ]
                    }
                })

                const result = parsePrompt(prompt)
                expect(result).toHaveLength(2)
                expect(result[0].type).toBe('systemMessagePrompt')
                expect(result[0].typeDisplay).toBe('System Message')
                expect(result[0].template).toBe('You are a helpful assistant.')
                expect(result[1].type).toBe('humanMessagePrompt')
                expect(result[1].typeDisplay).toBe('Human Message')
                expect(result[1].template).toBe('Hello {name}')
            })

            it('should parse AI message template', () => {
                const prompt = JSON.stringify({
                    kwargs: {
                        messages: [
                            {
                                id: ['langchain', 'AIMessagePromptTemplate'],
                                kwargs: { prompt: { kwargs: { template: 'I am an AI.' } } }
                            }
                        ]
                    }
                })

                const result = parsePrompt(prompt)
                expect(result).toHaveLength(1)
                expect(result[0].type).toBe('aiMessagePrompt')
                expect(result[0].typeDisplay).toBe('AI Message')
            })

            it('should handle unknown message type as template', () => {
                const prompt = JSON.stringify({
                    kwargs: {
                        messages: [
                            {
                                id: ['langchain', 'UnknownMessageType'],
                                kwargs: { prompt: { kwargs: { template: 'Some content' } } }
                            }
                        ]
                    }
                })

                const result = parsePrompt(prompt)
                expect(result).toHaveLength(1)
                expect(result[0].type).toBe('template')
                expect(result[0].typeDisplay).toBe('Message')
            })

            it('should parse single template format (no messages)', () => {
                const prompt = JSON.stringify({
                    kwargs: {
                        template: 'Tell me about {topic}'
                    }
                })

                const result = parsePrompt(prompt)
                expect(result).toHaveLength(1)
                expect(result[0].type).toBe('template')
                expect(result[0].typeDisplay).toBe('Prompt')
                expect(result[0].template).toBe('Tell me about {topic}')
            })

            it('should return empty array for prompt with no messages and no template', () => {
                const prompt = JSON.stringify({
                    kwargs: {}
                })

                const result = parsePrompt(prompt)
                expect(result).toEqual([])
            })

            it('should handle empty messages array', () => {
                const prompt = JSON.stringify({
                    kwargs: {
                        messages: []
                    }
                })

                const result = parsePrompt(prompt)
                expect(result).toEqual([])
            })

            it('should parse multiple messages of different types', () => {
                const prompt = JSON.stringify({
                    kwargs: {
                        messages: [
                            {
                                id: ['langchain', 'SystemMessagePromptTemplate'],
                                kwargs: { prompt: { kwargs: { template: 'System prompt' } } }
                            },
                            {
                                id: ['langchain', 'HumanMessagePromptTemplate'],
                                kwargs: { prompt: { kwargs: { template: 'User input' } } }
                            },
                            {
                                id: ['langchain', 'AIMessagePromptTemplate'],
                                kwargs: { prompt: { kwargs: { template: 'AI response' } } }
                            }
                        ]
                    }
                })

                const result = parsePrompt(prompt)
                expect(result).toHaveLength(3)
                expect(result[0].type).toBe('systemMessagePrompt')
                expect(result[1].type).toBe('humanMessagePrompt')
                expect(result[2].type).toBe('aiMessagePrompt')
            })
        })
    })
}
