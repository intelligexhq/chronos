import { SSEStreamer } from '../../src/utils/SSEStreamer'

/**
 * Test suite for SSEStreamer utility
 * Tests SSE streaming methods, client lifecycle, and edge cases
 */
export function sseStreamerUtilTest() {
    describe('SSEStreamer', () => {
        let streamer: SSEStreamer
        let mockResponse: { write: jest.Mock; end: jest.Mock }

        beforeEach(() => {
            streamer = new SSEStreamer()
            mockResponse = {
                write: jest.fn(),
                end: jest.fn()
            }
        })

        describe('client management', () => {
            it('should add an internal client', () => {
                streamer.addClient('chat1', mockResponse as any)
                expect(streamer.clients['chat1']).toBeDefined()
                expect(streamer.clients['chat1'].clientType).toBe('INTERNAL')
                expect(streamer.clients['chat1'].started).toBe(false)
            })

            it('should add an external client', () => {
                streamer.addExternalClient('chat1', mockResponse as any)
                expect(streamer.clients['chat1']).toBeDefined()
                expect(streamer.clients['chat1'].clientType).toBe('EXTERNAL')
                expect(streamer.clients['chat1'].started).toBe(false)
            })

            it('should remove a client and send end event', () => {
                streamer.addClient('chat1', mockResponse as any)
                streamer.removeClient('chat1')

                expect(mockResponse.write).toHaveBeenCalledTimes(1)
                const written = mockResponse.write.mock.calls[0][0]
                expect(written).toContain('"event":"end"')
                expect(written).toContain('"data":"[DONE]"')
                expect(mockResponse.end).toHaveBeenCalled()
                expect(streamer.clients['chat1']).toBeUndefined()
            })

            it('should not throw when removing a non-existent client', () => {
                expect(() => streamer.removeClient('nonexistent')).not.toThrow()
                expect(mockResponse.write).not.toHaveBeenCalled()
            })
        })

        describe('streamStartEvent', () => {
            it('should stream start event to existing client', () => {
                streamer.addClient('chat1', mockResponse as any)
                streamer.streamStartEvent('chat1', 'hello')

                expect(mockResponse.write).toHaveBeenCalledTimes(1)
                const written = mockResponse.write.mock.calls[0][0]
                expect(written).toContain('"event":"start"')
                expect(written).toContain('"data":"hello"')
            })

            it('should prevent duplicate start events', () => {
                streamer.addClient('chat1', mockResponse as any)
                streamer.streamStartEvent('chat1', 'first')
                streamer.streamStartEvent('chat1', 'second')

                expect(mockResponse.write).toHaveBeenCalledTimes(1)
            })

            it('should set started flag after first start event', () => {
                streamer.addClient('chat1', mockResponse as any)
                expect(streamer.clients['chat1'].started).toBe(false)
                streamer.streamStartEvent('chat1', 'data')
                expect(streamer.clients['chat1'].started).toBe(true)
            })

            it('should not throw for non-existent client', () => {
                expect(() => streamer.streamStartEvent('nonexistent', 'data')).not.toThrow()
            })
        })

        describe('streamTokenEvent', () => {
            it('should stream token data to client', () => {
                streamer.addClient('chat1', mockResponse as any)
                streamer.streamTokenEvent('chat1', 'token-data')

                const written = mockResponse.write.mock.calls[0][0]
                expect(written).toContain('"event":"token"')
                expect(written).toContain('"data":"token-data"')
            })

            it('should not throw for non-existent client', () => {
                expect(() => streamer.streamTokenEvent('nonexistent', 'data')).not.toThrow()
            })
        })

        describe('streamCustomEvent', () => {
            it('should stream custom event type with data', () => {
                streamer.addClient('chat1', mockResponse as any)
                streamer.streamCustomEvent('chat1', 'myEvent', { key: 'value' })

                const written = mockResponse.write.mock.calls[0][0]
                expect(written).toContain('"event":"myEvent"')
                expect(written).toContain('"key":"value"')
            })

            it('should not throw for non-existent client', () => {
                expect(() => streamer.streamCustomEvent('nonexistent', 'evt', {})).not.toThrow()
            })
        })

        describe('streamSourceDocumentsEvent', () => {
            it('should stream source documents', () => {
                streamer.addClient('chat1', mockResponse as any)
                streamer.streamSourceDocumentsEvent('chat1', [{ doc: 'test' }])

                const written = mockResponse.write.mock.calls[0][0]
                expect(written).toContain('"event":"sourceDocuments"')
            })

            it('should not throw for non-existent client', () => {
                expect(() => streamer.streamSourceDocumentsEvent('nonexistent', [])).not.toThrow()
            })
        })

        describe('streamArtifactsEvent', () => {
            it('should stream artifacts', () => {
                streamer.addClient('chat1', mockResponse as any)
                streamer.streamArtifactsEvent('chat1', { artifact: 'data' })

                const written = mockResponse.write.mock.calls[0][0]
                expect(written).toContain('"event":"artifacts"')
            })

            it('should not throw for non-existent client', () => {
                expect(() => streamer.streamArtifactsEvent('nonexistent', {})).not.toThrow()
            })
        })

        describe('streamUsedToolsEvent', () => {
            it('should stream used tools data', () => {
                streamer.addClient('chat1', mockResponse as any)
                streamer.streamUsedToolsEvent('chat1', ['tool1'])

                const written = mockResponse.write.mock.calls[0][0]
                expect(written).toContain('"event":"usedTools"')
            })

            it('should not throw for non-existent client', () => {
                expect(() => streamer.streamUsedToolsEvent('nonexistent', [])).not.toThrow()
            })
        })

        describe('streamCalledToolsEvent', () => {
            it('should stream called tools data', () => {
                streamer.addClient('chat1', mockResponse as any)
                streamer.streamCalledToolsEvent('chat1', ['tool1'])

                const written = mockResponse.write.mock.calls[0][0]
                expect(written).toContain('"event":"calledTools"')
            })

            it('should not throw for non-existent client', () => {
                expect(() => streamer.streamCalledToolsEvent('nonexistent', [])).not.toThrow()
            })
        })

        describe('streamFileAnnotationsEvent', () => {
            it('should stream file annotations', () => {
                streamer.addClient('chat1', mockResponse as any)
                streamer.streamFileAnnotationsEvent('chat1', { file: 'test.txt' })

                const written = mockResponse.write.mock.calls[0][0]
                expect(written).toContain('"event":"fileAnnotations"')
            })

            it('should not throw for non-existent client', () => {
                expect(() => streamer.streamFileAnnotationsEvent('nonexistent', {})).not.toThrow()
            })
        })

        describe('streamToolEvent', () => {
            it('should stream tool event', () => {
                streamer.addClient('chat1', mockResponse as any)
                streamer.streamToolEvent('chat1', { tool: 'search' })

                const written = mockResponse.write.mock.calls[0][0]
                expect(written).toContain('"event":"tool"')
            })

            it('should not throw for non-existent client', () => {
                expect(() => streamer.streamToolEvent('nonexistent', {})).not.toThrow()
            })
        })

        describe('streamAgentReasoningEvent', () => {
            it('should stream agent reasoning', () => {
                streamer.addClient('chat1', mockResponse as any)
                streamer.streamAgentReasoningEvent('chat1', { reasoning: 'test' })

                const written = mockResponse.write.mock.calls[0][0]
                expect(written).toContain('"event":"agentReasoning"')
            })

            it('should not throw for non-existent client', () => {
                expect(() => streamer.streamAgentReasoningEvent('nonexistent', {})).not.toThrow()
            })
        })

        describe('streamNextAgentEvent', () => {
            it('should stream next agent event', () => {
                streamer.addClient('chat1', mockResponse as any)
                streamer.streamNextAgentEvent('chat1', { agent: 'next' })

                const written = mockResponse.write.mock.calls[0][0]
                expect(written).toContain('"event":"nextAgent"')
            })

            it('should not throw for non-existent client', () => {
                expect(() => streamer.streamNextAgentEvent('nonexistent', {})).not.toThrow()
            })
        })

        describe('streamAgentFlowEvent', () => {
            it('should stream agent flow event', () => {
                streamer.addClient('chat1', mockResponse as any)
                streamer.streamAgentFlowEvent('chat1', { flow: 'data' })

                const written = mockResponse.write.mock.calls[0][0]
                expect(written).toContain('"event":"agentFlowEvent"')
            })

            it('should not throw for non-existent client', () => {
                expect(() => streamer.streamAgentFlowEvent('nonexistent', {})).not.toThrow()
            })
        })

        describe('streamAgentFlowExecutedDataEvent', () => {
            it('should stream agent flow executed data', () => {
                streamer.addClient('chat1', mockResponse as any)
                streamer.streamAgentFlowExecutedDataEvent('chat1', { result: 'ok' })

                const written = mockResponse.write.mock.calls[0][0]
                expect(written).toContain('"event":"agentFlowExecutedData"')
            })

            it('should not throw for non-existent client', () => {
                expect(() => streamer.streamAgentFlowExecutedDataEvent('nonexistent', {})).not.toThrow()
            })
        })

        describe('streamNextAgentFlowEvent', () => {
            it('should stream next agent flow event', () => {
                streamer.addClient('chat1', mockResponse as any)
                streamer.streamNextAgentFlowEvent('chat1', { next: 'flow' })

                const written = mockResponse.write.mock.calls[0][0]
                expect(written).toContain('"event":"nextAgentFlow"')
            })

            it('should not throw for non-existent client', () => {
                expect(() => streamer.streamNextAgentFlowEvent('nonexistent', {})).not.toThrow()
            })
        })

        describe('streamActionEvent', () => {
            it('should stream action event', () => {
                streamer.addClient('chat1', mockResponse as any)
                streamer.streamActionEvent('chat1', { action: 'click' })

                const written = mockResponse.write.mock.calls[0][0]
                expect(written).toContain('"event":"action"')
            })

            it('should not throw for non-existent client', () => {
                expect(() => streamer.streamActionEvent('nonexistent', {})).not.toThrow()
            })
        })

        describe('streamAbortEvent', () => {
            it('should stream abort event', () => {
                streamer.addClient('chat1', mockResponse as any)
                streamer.streamAbortEvent('chat1')

                const written = mockResponse.write.mock.calls[0][0]
                expect(written).toContain('"event":"abort"')
                expect(written).toContain('"data":"[DONE]"')
            })

            it('should not throw for non-existent client', () => {
                expect(() => streamer.streamAbortEvent('nonexistent')).not.toThrow()
            })
        })

        describe('streamEndEvent', () => {
            it('should not throw (placeholder method)', () => {
                expect(() => streamer.streamEndEvent('chat1')).not.toThrow()
            })
        })

        describe('streamErrorEvent', () => {
            it('should stream error event with message', () => {
                streamer.addClient('chat1', mockResponse as any)
                streamer.streamErrorEvent('chat1', 'Something went wrong')

                const written = mockResponse.write.mock.calls[0][0]
                expect(written).toContain('"event":"error"')
                expect(written).toContain('Something went wrong')
            })

            it('should mask 401 API key error message', () => {
                streamer.addClient('chat1', mockResponse as any)
                streamer.streamErrorEvent('chat1', '401 Incorrect API key provided')

                const written = mockResponse.write.mock.calls[0][0]
                expect(written).toContain('401 Invalid model key or Incorrect local model configuration.')
                expect(written).not.toContain('Incorrect API key provided')
            })

            it('should not throw for non-existent client', () => {
                expect(() => streamer.streamErrorEvent('nonexistent', 'error')).not.toThrow()
            })
        })

        describe('streamMetadataEvent', () => {
            it('should stream metadata with chatId', () => {
                streamer.addClient('chat1', mockResponse as any)
                streamer.streamMetadataEvent('chat1', { chatId: 'c1' })

                expect(mockResponse.write).toHaveBeenCalledTimes(1)
                const written = mockResponse.write.mock.calls[0][0]
                expect(written).toContain('"event":"metadata"')
                expect(written).toContain('"chatId":"c1"')
            })

            it('should stream metadata with chatMessageId', () => {
                streamer.addClient('chat1', mockResponse as any)
                streamer.streamMetadataEvent('chat1', { chatMessageId: 'msg1' })

                const written = mockResponse.write.mock.calls[0][0]
                expect(written).toContain('"chatMessageId":"msg1"')
            })

            it('should stream metadata with question', () => {
                streamer.addClient('chat1', mockResponse as any)
                streamer.streamMetadataEvent('chat1', { question: 'What is AI?' })

                const written = mockResponse.write.mock.calls[0][0]
                expect(written).toContain('"question":"What is AI?"')
            })

            it('should stream metadata with sessionId', () => {
                streamer.addClient('chat1', mockResponse as any)
                streamer.streamMetadataEvent('chat1', { sessionId: 'sess1' })

                const written = mockResponse.write.mock.calls[0][0]
                expect(written).toContain('"sessionId":"sess1"')
            })

            it('should stream metadata with memoryType', () => {
                streamer.addClient('chat1', mockResponse as any)
                streamer.streamMetadataEvent('chat1', { memoryType: 'buffer' })

                const written = mockResponse.write.mock.calls[0][0]
                expect(written).toContain('"memoryType":"buffer"')
            })

            it('should parse followUpPrompts string to JSON', () => {
                streamer.addClient('chat1', mockResponse as any)
                streamer.streamMetadataEvent('chat1', { followUpPrompts: '["prompt1","prompt2"]' })

                const written = mockResponse.write.mock.calls[0][0]
                expect(written).toContain('"followUpPrompts"')
                expect(written).toContain('prompt1')
            })

            it('should pass followUpPrompts as-is when already an object', () => {
                streamer.addClient('chat1', mockResponse as any)
                streamer.streamMetadataEvent('chat1', { followUpPrompts: ['p1', 'p2'] })

                const written = mockResponse.write.mock.calls[0][0]
                expect(written).toContain('"followUpPrompts"')
            })

            it('should parse flowVariables string to JSON', () => {
                streamer.addClient('chat1', mockResponse as any)
                streamer.streamMetadataEvent('chat1', { flowVariables: '{"var1":"val1"}' })

                const written = mockResponse.write.mock.calls[0][0]
                expect(written).toContain('"flowVariables"')
                expect(written).toContain('var1')
            })

            it('should pass flowVariables as-is when already an object', () => {
                streamer.addClient('chat1', mockResponse as any)
                streamer.streamMetadataEvent('chat1', { flowVariables: { var1: 'val1' } })

                const written = mockResponse.write.mock.calls[0][0]
                expect(written).toContain('"flowVariables"')
            })

            it('should not stream when apiResponse has no metadata fields', () => {
                streamer.addClient('chat1', mockResponse as any)
                streamer.streamMetadataEvent('chat1', {})

                expect(mockResponse.write).not.toHaveBeenCalled()
            })

            it('should stream all metadata fields together', () => {
                streamer.addClient('chat1', mockResponse as any)
                streamer.streamMetadataEvent('chat1', {
                    chatId: 'c1',
                    chatMessageId: 'msg1',
                    question: 'test?',
                    sessionId: 'sess1',
                    memoryType: 'buffer'
                })

                expect(mockResponse.write).toHaveBeenCalledTimes(1)
                const written = mockResponse.write.mock.calls[0][0]
                expect(written).toContain('"chatId":"c1"')
                expect(written).toContain('"chatMessageId":"msg1"')
            })
        })

        describe('streamUsageMetadataEvent', () => {
            it('should stream usage metadata', () => {
                streamer.addClient('chat1', mockResponse as any)
                streamer.streamUsageMetadataEvent('chat1', { tokens: 100 })

                const written = mockResponse.write.mock.calls[0][0]
                expect(written).toContain('"event":"usageMetadata"')
            })

            it('should not throw for non-existent client', () => {
                expect(() => streamer.streamUsageMetadataEvent('nonexistent', {})).not.toThrow()
            })
        })

        describe('streamTTSStartEvent', () => {
            it('should stream TTS start event', () => {
                streamer.addClient('chat1', mockResponse as any)
                streamer.streamTTSStartEvent('chat1', 'msg1', 'mp3')

                const written = mockResponse.write.mock.calls[0][0]
                expect(written).toContain('"event":"tts_start"')
                expect(written).toContain('"chatMessageId":"msg1"')
                expect(written).toContain('"format":"mp3"')
            })

            it('should not throw for non-existent client', () => {
                expect(() => streamer.streamTTSStartEvent('nonexistent', 'msg1', 'mp3')).not.toThrow()
            })
        })

        describe('streamTTSDataEvent', () => {
            it('should stream TTS data event', () => {
                streamer.addClient('chat1', mockResponse as any)
                streamer.streamTTSDataEvent('chat1', 'msg1', 'base64audio')

                const written = mockResponse.write.mock.calls[0][0]
                expect(written).toContain('"event":"tts_data"')
                expect(written).toContain('"audioChunk":"base64audio"')
            })

            it('should not throw for non-existent client', () => {
                expect(() => streamer.streamTTSDataEvent('nonexistent', 'msg1', 'chunk')).not.toThrow()
            })
        })

        describe('streamTTSEndEvent', () => {
            it('should stream TTS end event', () => {
                streamer.addClient('chat1', mockResponse as any)
                streamer.streamTTSEndEvent('chat1', 'msg1')

                const written = mockResponse.write.mock.calls[0][0]
                expect(written).toContain('"event":"tts_end"')
                expect(written).toContain('"chatMessageId":"msg1"')
            })

            it('should not throw for non-existent client', () => {
                expect(() => streamer.streamTTSEndEvent('nonexistent', 'msg1')).not.toThrow()
            })
        })

        describe('streamTTSAbortEvent', () => {
            it('should stream TTS abort event and close connection', () => {
                streamer.addClient('chat1', mockResponse as any)
                streamer.streamTTSAbortEvent('chat1', 'msg1')

                const written = mockResponse.write.mock.calls[0][0]
                expect(written).toContain('"event":"tts_abort"')
                expect(written).toContain('"chatMessageId":"msg1"')
                expect(mockResponse.end).toHaveBeenCalled()
                expect(streamer.clients['chat1']).toBeUndefined()
            })

            it('should not throw for non-existent client', () => {
                expect(() => streamer.streamTTSAbortEvent('nonexistent', 'msg1')).not.toThrow()
            })
        })
    })
}
