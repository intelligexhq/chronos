import { addLoaderSource, DocumentStoreDTO, DocumentStoreStatus } from '../../src/Interface.DocumentStore'
import { DocumentStore } from '../../src/database/entities/DocumentStore'

export function interfaceDocumentStoreUtilTest() {
    describe('Interface.DocumentStore', () => {
        describe('addLoaderSource', () => {
            it('should return source for pdfFile loader', () => {
                const loader = {
                    loaderId: 'pdfFile',
                    loaderConfig: { pdfFile: 'FILE-STORAGE::document.pdf' }
                }
                const result = addLoaderSource(loader)
                expect(result).toBe('document.pdf')
            })

            it('should return source for docxFile loader', () => {
                const loader = {
                    loaderId: 'docxFile',
                    loaderConfig: { docxFile: 'FILE-STORAGE::report.docx' }
                }
                const result = addLoaderSource(loader)
                expect(result).toBe('report.docx')
            })

            it('should return source for csvFile loader', () => {
                const loader = {
                    loaderId: 'csvFile',
                    loaderConfig: { csvFile: 'FILE-STORAGE::data.csv' }
                }
                const result = addLoaderSource(loader)
                expect(result).toBe('data.csv')
            })

            it('should return source for jsonFile loader', () => {
                const loader = {
                    loaderId: 'jsonFile',
                    loaderConfig: { jsonFile: 'FILE-STORAGE::config.json' }
                }
                const result = addLoaderSource(loader)
                expect(result).toBe('config.json')
            })

            it('should return source for txtFile loader', () => {
                const loader = {
                    loaderId: 'txtFile',
                    loaderConfig: { txtFile: 'FILE-STORAGE::readme.txt' }
                }
                const result = addLoaderSource(loader)
                expect(result).toBe('readme.txt')
            })

            it('should return source for file loader', () => {
                const loader = {
                    loaderId: 'file',
                    loaderConfig: { file: 'FILE-STORAGE::generic.bin' }
                }
                const result = addLoaderSource(loader)
                expect(result).toBe('generic.bin')
            })

            it('should return source for jsonlinesFile loader', () => {
                const loader = {
                    loaderId: 'jsonlinesFile',
                    loaderConfig: { jsonlinesFile: 'FILE-STORAGE::lines.jsonl' }
                }
                const result = addLoaderSource(loader)
                expect(result).toBe('lines.jsonl')
            })

            it('should return file name only when isGetFileNameOnly is true for file loaders', () => {
                const loader = {
                    loaderId: 'pdfFile',
                    loaderConfig: { pdfFile: 'FILE-STORAGE::document.pdf' }
                }
                const result = addLoaderSource(loader, true)
                expect(result).toBe('document.pdf')
            })

            it('should return file names from FILE-STORAGE JSON array', () => {
                const loader = {
                    loaderId: 'pdfFile',
                    loaderConfig: { pdfFile: 'FILE-STORAGE::["file1.pdf", "file2.pdf"]' }
                }
                const result = addLoaderSource(loader, true)
                expect(result).toBe('file1.pdf, file2.pdf')
            })

            it('should handle base64 data URIs for file loaders when isGetFileNameOnly is true', () => {
                const loader = {
                    loaderId: 'pdfFile',
                    loaderConfig: { pdfFile: 'data:application/pdf;base64,JVBERi0=,filename:test.pdf' }
                }
                const result = addLoaderSource(loader, true)
                expect(result).toBe('test.pdf')
            })

            it('should return URL for apiLoader', () => {
                const loader = {
                    loaderId: 'apiLoader',
                    loaderConfig: { url: 'https://api.example.com/data', method: 'GET' }
                }
                const result = addLoaderSource(loader)
                expect(result).toBe('https://api.example.com/data (GET)')
            })

            it('should return URL for cheerioWebScraper', () => {
                const loader = {
                    loaderId: 'cheerioWebScraper',
                    loaderConfig: { url: 'https://example.com' }
                }
                const result = addLoaderSource(loader)
                expect(result).toBe('https://example.com')
            })

            it('should return URL for playwrightWebScraper', () => {
                const loader = {
                    loaderId: 'playwrightWebScraper',
                    loaderConfig: { url: 'https://example.com/page' }
                }
                const result = addLoaderSource(loader)
                expect(result).toBe('https://example.com/page')
            })

            it('should return URL for puppeteerWebScraper', () => {
                const loader = {
                    loaderId: 'puppeteerWebScraper',
                    loaderConfig: { url: 'https://example.com/scrape' }
                }
                const result = addLoaderSource(loader)
                expect(result).toBe('https://example.com/scrape')
            })

            it('should return None for web scraper with missing URL', () => {
                const loader = {
                    loaderId: 'cheerioWebScraper',
                    loaderConfig: {}
                }
                const result = addLoaderSource(loader)
                expect(result).toBe('None')
            })

            it('should handle unstructuredFileLoader with fileObject', () => {
                const loader = {
                    loaderId: 'unstructuredFileLoader',
                    loaderConfig: { fileObject: 'FILE-STORAGE::document.pdf' }
                }
                const result = addLoaderSource(loader)
                expect(result).toBe('document.pdf')
            })

            it('should handle unstructuredFileLoader with fileObject and isGetFileNameOnly', () => {
                const loader = {
                    loaderId: 'unstructuredFileLoader',
                    loaderConfig: { fileObject: 'FILE-STORAGE::document.pdf' }
                }
                const result = addLoaderSource(loader, true)
                expect(result).toBe('document.pdf')
            })

            it('should handle unstructuredFileLoader with filePath', () => {
                const loader = {
                    loaderId: 'unstructuredFileLoader',
                    loaderConfig: { filePath: '/path/to/file.pdf' }
                }
                const result = addLoaderSource(loader)
                expect(result).toBe('/path/to/file.pdf')
            })

            it('should handle unstructuredFileLoader with neither fileObject nor filePath', () => {
                const loader = {
                    loaderId: 'unstructuredFileLoader',
                    loaderConfig: {}
                }
                const result = addLoaderSource(loader)
                expect(result).toBe('None')
            })

            it('should return None for unknown loader type', () => {
                const loader = {
                    loaderId: 'unknownLoader',
                    loaderConfig: {}
                }
                const result = addLoaderSource(loader)
                expect(result).toBe('None')
            })

            it('should return None when loaderConfig is missing', () => {
                const loader = {
                    loaderId: 'pdfFile'
                }
                const result = addLoaderSource(loader)
                expect(result).toBe('None')
            })
        })

        describe('DocumentStoreDTO', () => {
            const createMockEntity = (overrides: Partial<DocumentStore> = {}): DocumentStore => {
                const entity = new DocumentStore()
                entity.id = 'test-id-123'
                entity.name = 'Test Store'
                entity.description = 'A test store'
                entity.status = DocumentStoreStatus.SYNC
                entity.loaders = JSON.stringify([])
                entity.whereUsed = JSON.stringify([])
                entity.vectorStoreConfig = null
                entity.embeddingConfig = null
                entity.recordManagerConfig = null
                entity.createdDate = new Date('2024-01-01')
                entity.updatedDate = new Date('2024-01-02')
                Object.assign(entity, overrides)
                return entity
            }

            describe('fromEntity', () => {
                it('should convert entity to DTO with basic fields', () => {
                    const entity = createMockEntity()
                    const dto = DocumentStoreDTO.fromEntity(entity)
                    expect(dto.id).toBe('test-id-123')
                    expect(dto.name).toBe('Test Store')
                    expect(dto.description).toBe('A test store')
                    expect(dto.status).toBe(DocumentStoreStatus.SYNC)
                })

                it('should parse whereUsed JSON', () => {
                    const entity = createMockEntity({
                        whereUsed: JSON.stringify([{ id: 'flow-1', name: 'My Flow' }])
                    })
                    const dto = DocumentStoreDTO.fromEntity(entity)
                    expect(dto.whereUsed).toEqual([{ id: 'flow-1', name: 'My Flow' }])
                })

                it('should set empty whereUsed when null', () => {
                    const entity = createMockEntity({ whereUsed: '' })
                    const dto = DocumentStoreDTO.fromEntity(entity)
                    expect(dto.whereUsed).toEqual([])
                })

                it('should parse vectorStoreConfig', () => {
                    const entity = createMockEntity({
                        vectorStoreConfig: JSON.stringify({ name: 'pinecone', config: {} })
                    })
                    const dto = DocumentStoreDTO.fromEntity(entity)
                    expect(dto.vectorStoreConfig).toEqual({ name: 'pinecone', config: {} })
                })

                it('should parse embeddingConfig', () => {
                    const entity = createMockEntity({
                        embeddingConfig: JSON.stringify({ name: 'openai', config: {} })
                    })
                    const dto = DocumentStoreDTO.fromEntity(entity)
                    expect(dto.embeddingConfig).toEqual({ name: 'openai', config: {} })
                })

                it('should parse recordManagerConfig', () => {
                    const entity = createMockEntity({
                        recordManagerConfig: JSON.stringify({ name: 'postgres', config: {} })
                    })
                    const dto = DocumentStoreDTO.fromEntity(entity)
                    expect(dto.recordManagerConfig).toEqual({ name: 'postgres', config: {} })
                })

                it('should calculate totalChunks and totalChars from loaders', () => {
                    const entity = createMockEntity({
                        loaders: JSON.stringify([
                            { loaderId: 'pdfFile', totalChunks: 10, totalChars: 5000, status: 'SYNC' },
                            { loaderId: 'txtFile', totalChunks: 5, totalChars: 2000, status: 'SYNC' }
                        ])
                    })
                    const dto = DocumentStoreDTO.fromEntity(entity)
                    expect(dto.totalChunks).toBe(15)
                    expect(dto.totalChars).toBe(7000)
                })

                it('should handle loaders with no totalChunks/totalChars', () => {
                    const entity = createMockEntity({
                        loaders: JSON.stringify([{ loaderId: 'pdfFile', status: 'SYNC' }])
                    })
                    const dto = DocumentStoreDTO.fromEntity(entity)
                    expect(dto.totalChunks).toBe(0)
                    expect(dto.totalChars).toBe(0)
                })

                it('should set STALE status when any loader is not SYNC', () => {
                    const entity = createMockEntity({
                        loaders: JSON.stringify([
                            { loaderId: 'pdfFile', totalChunks: 10, totalChars: 5000, status: 'SYNC' },
                            { loaderId: 'txtFile', totalChunks: 5, totalChars: 2000, status: 'STALE' }
                        ])
                    })
                    const dto = DocumentStoreDTO.fromEntity(entity)
                    expect(dto.status).toBe(DocumentStoreStatus.STALE)
                })

                it('should add source to each loader', () => {
                    const entity = createMockEntity({
                        loaders: JSON.stringify([
                            {
                                loaderId: 'cheerioWebScraper',
                                loaderConfig: { url: 'https://example.com' },
                                totalChunks: 1,
                                totalChars: 100,
                                status: 'SYNC'
                            }
                        ])
                    })
                    const dto = DocumentStoreDTO.fromEntity(entity)
                    expect(dto.loaders[0].source).toBe('https://example.com')
                })
            })

            describe('fromEntities', () => {
                it('should return empty array for empty input', () => {
                    const result = DocumentStoreDTO.fromEntities([])
                    expect(result).toEqual([])
                })

                it('should convert multiple entities', () => {
                    const entities = [createMockEntity({ id: 'id-1', name: 'Store 1' }), createMockEntity({ id: 'id-2', name: 'Store 2' })]
                    const result = DocumentStoreDTO.fromEntities(entities)
                    expect(result).toHaveLength(2)
                    expect(result[0].name).toBe('Store 1')
                    expect(result[1].name).toBe('Store 2')
                })
            })

            describe('toEntity', () => {
                it('should create entity with default values', () => {
                    const body = { name: 'New Store', description: 'A new store' }
                    const entity = DocumentStoreDTO.toEntity(body)
                    expect(entity.name).toBe('New Store')
                    expect(entity.description).toBe('A new store')
                    expect(entity.loaders).toBe('[]')
                    expect(entity.whereUsed).toBe('[]')
                    expect(entity.status).toBe(DocumentStoreStatus.EMPTY_SYNC)
                })

                it('should use provided loaders and whereUsed', () => {
                    const body = {
                        name: 'Store',
                        description: 'desc',
                        loaders: '[{"loaderId":"pdfFile"}]',
                        whereUsed: '[{"id":"flow-1"}]'
                    }
                    const entity = DocumentStoreDTO.toEntity(body)
                    expect(entity.loaders).toBe('[{"loaderId":"pdfFile"}]')
                    expect(entity.whereUsed).toBe('[{"id":"flow-1"}]')
                })
            })
        })
    })
}
