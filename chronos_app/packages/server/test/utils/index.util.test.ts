import {
    constructGraphs,
    getStartingNode,
    getStartingNodes,
    getAllConnectedNodes,
    getEndingNodes,
    getFileName,
    getUserHome,
    saveUpsertFlowData,
    isSameOverrideConfig,
    isSameChatId,
    getMemorySessionId,
    findMemoryNode,
    getAllValuesFromJson,
    getTelemetryFlowObj
} from '../../src/utils'
import { IReactFlowNode, IReactFlowEdge, INodeData } from '../../src/Interface'

// Helper to create mock node with minimal required fields
const createMockNode = (id: string, data: Partial<INodeData> = {}): IReactFlowNode =>
    ({
        id,
        position: { x: 0, y: 0 },
        type: 'customNode',
        data: { id, label: id, name: id, ...data },
        positionAbsolute: { x: 0, y: 0 },
        z: 0,
        handleBounds: { source: null, target: null },
        width: 100,
        height: 100,
        selected: false,
        dragging: false
    } as unknown as IReactFlowNode)

// Helper to create mock edge with minimal required fields
const createMockEdge = (id: string, source: string, target: string): IReactFlowEdge =>
    ({
        id,
        source,
        target,
        sourceHandle: 'out',
        targetHandle: 'in',
        type: 'buttonedge',
        data: {}
    } as IReactFlowEdge)

/**
 * Test suite for core utility functions in utils/index.ts
 * Tests graph construction, node traversal, and helper utilities
 */
export function indexUtilTest() {
    describe('Core Utils (utils/index.ts)', () => {
        // Sample data for graph tests
        const sampleNodes: IReactFlowNode[] = [
            createMockNode('node1'),
            createMockNode('node2'),
            createMockNode('node3'),
            createMockNode('node4')
        ]

        const sampleEdges: IReactFlowEdge[] = [
            createMockEdge('e1-2', 'node1', 'node2'),
            createMockEdge('e2-3', 'node2', 'node3'),
            createMockEdge('e3-4', 'node3', 'node4')
        ]

        describe('constructGraphs', () => {
            it('should construct a directed graph from nodes and edges', () => {
                const { graph, nodeDependencies: _nodeDependencies } = constructGraphs(sampleNodes, sampleEdges)

                expect(graph['node1']).toContain('node2')
                expect(graph['node2']).toContain('node3')
                expect(graph['node3']).toContain('node4')
                expect(graph['node4']).toEqual([])
            })

            it('should calculate node dependencies correctly', () => {
                const { nodeDependencies } = constructGraphs(sampleNodes, sampleEdges)

                expect(nodeDependencies['node1']).toBe(0) // No incoming edges
                expect(nodeDependencies['node2']).toBe(1) // 1 incoming edge
                expect(nodeDependencies['node3']).toBe(1)
                expect(nodeDependencies['node4']).toBe(1)
            })

            it('should construct a reversed graph when isReversed is true', () => {
                const { graph } = constructGraphs(sampleNodes, sampleEdges, { isReversed: true })

                // In reversed graph, edges point backwards
                expect(graph['node2']).toContain('node1')
                expect(graph['node3']).toContain('node2')
                expect(graph['node4']).toContain('node3')
                expect(graph['node1']).toEqual([])
            })

            it('should construct a non-directed graph when isNonDirected is true', () => {
                const { graph } = constructGraphs(sampleNodes, sampleEdges, { isNonDirected: true })

                // In non-directed graph, edges go both ways
                expect(graph['node1']).toContain('node2')
                expect(graph['node2']).toContain('node1')
                expect(graph['node2']).toContain('node3')
                expect(graph['node3']).toContain('node2')
            })

            it('should handle empty nodes and edges', () => {
                const { graph, nodeDependencies } = constructGraphs([], [])

                expect(graph).toEqual({})
                expect(nodeDependencies).toEqual({})
            })

            it('should handle nodes with no edges', () => {
                const isolatedNodes: IReactFlowNode[] = [createMockNode('a'), createMockNode('b')]
                const { graph, nodeDependencies } = constructGraphs(isolatedNodes, [])

                expect(graph['a']).toEqual([])
                expect(graph['b']).toEqual([])
                expect(nodeDependencies['a']).toBe(0)
                expect(nodeDependencies['b']).toBe(0)
            })

            it('should handle branching graphs', () => {
                const branchingEdges: IReactFlowEdge[] = [
                    createMockEdge('e1-2', 'node1', 'node2'),
                    createMockEdge('e1-3', 'node1', 'node3')
                ]
                const { graph, nodeDependencies } = constructGraphs(sampleNodes, branchingEdges)

                expect(graph['node1']).toContain('node2')
                expect(graph['node1']).toContain('node3')
                expect(nodeDependencies['node2']).toBe(1)
                expect(nodeDependencies['node3']).toBe(1)
            })

            it('should handle merging graphs', () => {
                const mergingEdges: IReactFlowEdge[] = [createMockEdge('e1-3', 'node1', 'node3'), createMockEdge('e2-3', 'node2', 'node3')]
                const { nodeDependencies } = constructGraphs(sampleNodes, mergingEdges)

                expect(nodeDependencies['node3']).toBe(2) // Two incoming edges
            })
        })

        describe('getStartingNode', () => {
            it('should return nodes with zero dependencies as starting nodes', () => {
                const { nodeDependencies } = constructGraphs(sampleNodes, sampleEdges)
                const { startingNodeIds } = getStartingNode(nodeDependencies)

                expect(startingNodeIds).toContain('node1')
                expect(startingNodeIds).toHaveLength(1)
            })

            it('should return multiple starting nodes when graph has multiple roots', () => {
                const multiRootEdges: IReactFlowEdge[] = [
                    createMockEdge('e1-3', 'node1', 'node3'),
                    createMockEdge('e2-3', 'node2', 'node3')
                ]
                const { nodeDependencies } = constructGraphs(sampleNodes, multiRootEdges)
                const { startingNodeIds } = getStartingNode(nodeDependencies)

                expect(startingNodeIds).toContain('node1')
                expect(startingNodeIds).toContain('node2')
                expect(startingNodeIds).toHaveLength(3) // node1, node2, and node4 (isolated)
            })

            it('should return all nodes when there are no edges', () => {
                const { nodeDependencies } = constructGraphs(sampleNodes, [])
                const { startingNodeIds } = getStartingNode(nodeDependencies)

                expect(startingNodeIds).toHaveLength(4)
            })

            it('should handle empty dependencies', () => {
                const { startingNodeIds } = getStartingNode({})
                expect(startingNodeIds).toEqual([])
            })
        })

        describe('getStartingNodes', () => {
            it('should find starting nodes from an ending node using reversed graph', () => {
                const { graph } = constructGraphs(sampleNodes, sampleEdges, { isReversed: true })
                const { startingNodeIds, depthQueue } = getStartingNodes(graph, 'node4')

                expect(startingNodeIds).toContain('node1')
                expect(depthQueue['node1']).toBe(0) // Starting node has depth 0
                expect(depthQueue['node4']).toBe(3) // Ending node has max depth
            })

            it('should calculate correct depth queue', () => {
                const { graph } = constructGraphs(sampleNodes, sampleEdges, { isReversed: true })
                const { depthQueue } = getStartingNodes(graph, 'node4')

                // Depths should be sequential from start to end
                expect(depthQueue['node1']).toBeLessThan(depthQueue['node2'])
                expect(depthQueue['node2']).toBeLessThan(depthQueue['node3'])
                expect(depthQueue['node3']).toBeLessThan(depthQueue['node4'])
            })

            it('should handle single node graph', () => {
                const singleNode: IReactFlowNode[] = [createMockNode('single')]
                const { graph } = constructGraphs(singleNode, [], { isReversed: true })
                const { startingNodeIds, depthQueue } = getStartingNodes(graph, 'single')

                expect(startingNodeIds).toContain('single')
                expect(depthQueue['single']).toBe(0)
            })
        })

        describe('getAllConnectedNodes', () => {
            it('should return all nodes connected to start node', () => {
                const { graph } = constructGraphs(sampleNodes, sampleEdges)
                const connectedNodes = getAllConnectedNodes(graph, 'node1')

                expect(connectedNodes).toContain('node1')
                expect(connectedNodes).toContain('node2')
                expect(connectedNodes).toContain('node3')
                expect(connectedNodes).toContain('node4')
                expect(connectedNodes).toHaveLength(4)
            })

            it('should only return reachable nodes', () => {
                const { graph } = constructGraphs(sampleNodes, sampleEdges)
                const connectedNodes = getAllConnectedNodes(graph, 'node3')

                // Starting from node3, we can only reach node4
                expect(connectedNodes).toContain('node3')
                expect(connectedNodes).toContain('node4')
                expect(connectedNodes).toHaveLength(2)
            })

            it('should handle isolated node', () => {
                const { graph } = constructGraphs(sampleNodes, [])
                const connectedNodes = getAllConnectedNodes(graph, 'node1')

                expect(connectedNodes).toEqual(['node1'])
            })

            it('should handle cycles without infinite loop', () => {
                const cyclicEdges: IReactFlowEdge[] = [createMockEdge('e1-2', 'node1', 'node2'), createMockEdge('e2-1', 'node2', 'node1')]
                const nodes: IReactFlowNode[] = [createMockNode('node1'), createMockNode('node2')]
                const { graph } = constructGraphs(nodes, cyclicEdges)
                const connectedNodes = getAllConnectedNodes(graph, 'node1')

                expect(connectedNodes).toContain('node1')
                expect(connectedNodes).toContain('node2')
                expect(connectedNodes).toHaveLength(2)
            })
        })

        describe('getEndingNodes', () => {
            it('should find nodes with no outgoing edges as ending nodes', () => {
                const { graph, nodeDependencies } = constructGraphs(sampleNodes, sampleEdges)
                const nodesWithCategory = sampleNodes.map((n, i) => ({
                    ...n,
                    data: {
                        ...n.data,
                        category: i === 3 ? 'Chains' : 'Other', // node4 is a Chain (valid ending)
                        outputs: {}
                    }
                })) as IReactFlowNode[]

                const endingNodes = getEndingNodes(nodeDependencies, graph, nodesWithCategory)
                expect(endingNodes.map((n) => n.id)).toContain('node4')
            })

            it('should throw error when ending node has invalid category', () => {
                const { graph, nodeDependencies } = constructGraphs(sampleNodes, sampleEdges)
                const invalidNodes = sampleNodes.map((n) => ({
                    ...n,
                    data: { ...n.data, category: 'Invalid', outputs: {} }
                })) as IReactFlowNode[]

                expect(() => getEndingNodes(nodeDependencies, graph, invalidNodes)).toThrow()
            })

            it('should accept EndingNode output type', () => {
                const { graph, nodeDependencies } = constructGraphs(sampleNodes, sampleEdges)
                const endingNodeNodes = sampleNodes.map((n, i) => ({
                    ...n,
                    data: {
                        ...n.data,
                        category: 'Other',
                        outputs: i === 3 ? { output: 'EndingNode' } : {}
                    }
                })) as IReactFlowNode[]

                const endingNodes = getEndingNodes(nodeDependencies, graph, endingNodeNodes)
                expect(endingNodes.map((n) => n.id)).toContain('node4')
            })

            it('should accept Agents category as valid ending', () => {
                const { graph, nodeDependencies } = constructGraphs(sampleNodes, sampleEdges)
                const agentNodes = sampleNodes.map((n, i) => ({
                    ...n,
                    data: {
                        ...n.data,
                        category: i === 3 ? 'Agents' : 'Other',
                        outputs: {}
                    }
                })) as IReactFlowNode[]

                const endingNodes = getEndingNodes(nodeDependencies, graph, agentNodes)
                expect(endingNodes.map((n) => n.id)).toContain('node4')
            })

            it('should accept Multi Agents category as valid ending', () => {
                const { graph, nodeDependencies } = constructGraphs(sampleNodes, sampleEdges)
                const multiAgentNodes = sampleNodes.map((n, i) => ({
                    ...n,
                    data: {
                        ...n.data,
                        category: i === 3 ? 'Multi Agents' : 'Other',
                        outputs: {}
                    }
                })) as IReactFlowNode[]

                const endingNodes = getEndingNodes(nodeDependencies, graph, multiAgentNodes)
                expect(endingNodes.map((n) => n.id)).toContain('node4')
            })

            it('should accept Sequential Agents category as valid ending', () => {
                const { graph, nodeDependencies } = constructGraphs(sampleNodes, sampleEdges)
                const seqAgentNodes = sampleNodes.map((n, i) => ({
                    ...n,
                    data: {
                        ...n.data,
                        category: i === 3 ? 'Sequential Agents' : 'Other',
                        outputs: {}
                    }
                })) as IReactFlowNode[]

                const endingNodes = getEndingNodes(nodeDependencies, graph, seqAgentNodes)
                expect(endingNodes.map((n) => n.id)).toContain('node4')
            })

            it('should accept Engine category as valid ending', () => {
                const { graph, nodeDependencies } = constructGraphs(sampleNodes, sampleEdges)
                const engineNodes = sampleNodes.map((n, i) => ({
                    ...n,
                    data: {
                        ...n.data,
                        category: i === 3 ? 'Engine' : 'Other',
                        outputs: {}
                    }
                })) as IReactFlowNode[]

                const endingNodes = getEndingNodes(nodeDependencies, graph, engineNodes)
                expect(endingNodes.map((n) => n.id)).toContain('node4')
            })

            it('should throw when no ending nodes found', () => {
                expect(() => getEndingNodes({}, {}, [])).toThrow('Ending nodes not found')
            })
        })

        describe('getFileName', () => {
            it('should extract filename from FILE-STORAGE path', () => {
                const result = getFileName('FILE-STORAGE::document.pdf')
                expect(result).toBe('document.pdf')
            })

            it('should handle FILE-STORAGE with JSON array', () => {
                const result = getFileName('FILE-STORAGE::["file1.pdf", "file2.pdf"]')
                expect(result).toBe('file1.pdf, file2.pdf')
            })

            it('should extract filename from base64 data URI', () => {
                const dataUri = 'data:application/pdf;base64,abc123,name:document.pdf'
                const result = getFileName(dataUri)
                expect(result).toBe('document.pdf')
            })

            it('should handle array of base64 data URIs', () => {
                const dataUris = JSON.stringify([
                    'data:application/pdf;base64,abc123,name:file1.pdf',
                    'data:application/pdf;base64,def456,name:file2.pdf'
                ])
                const result = getFileName(dataUris)
                expect(result).toBe('file1.pdf, file2.pdf')
            })

            it('should handle simple FILE-STORAGE path without array', () => {
                const result = getFileName('FILE-STORAGE::simple-file.txt')
                expect(result).toBe('simple-file.txt')
            })
        })

        describe('getUserHome', () => {
            it('should return HOME environment variable on non-Windows', () => {
                const originalPlatform = process.platform
                const originalHome = process.env.HOME

                // Mock platform and env
                Object.defineProperty(process, 'platform', { value: 'linux', writable: true })
                process.env.HOME = '/home/testuser'

                const result = getUserHome()
                expect(result).toBe('/home/testuser')

                // Restore
                Object.defineProperty(process, 'platform', { value: originalPlatform })
                if (originalHome) process.env.HOME = originalHome
            })

            it('should return cwd when HOME is undefined', () => {
                const originalHome = process.env.HOME
                delete process.env.HOME

                const result = getUserHome()
                expect(result).toBe(process.cwd())

                // Restore
                if (originalHome) process.env.HOME = originalHome
            })
        })

        describe('saveUpsertFlowData', () => {
            it('should save node data to upsert history', () => {
                const nodeData: Partial<INodeData> = {
                    id: 'node1',
                    label: 'Test Node',
                    name: 'testNode',
                    category: 'Test',
                    inputs: { param1: 'value1', param2: 'value2' },
                    inputParams: [
                        { name: 'param1', label: 'Param 1', type: 'string' },
                        { name: 'param2', label: 'Param 2', type: 'string' }
                    ]
                }
                const upsertHistory: Record<string, any> = {}

                const result = saveUpsertFlowData(nodeData as INodeData, upsertHistory)

                expect(result).toHaveLength(1)
                expect(result[0].id).toBe('node1')
                expect(result[0].label).toBe('Test Node')
                expect(result[0].paramValues).toHaveLength(2)
            })

            it('should skip empty input values', () => {
                const nodeData: Partial<INodeData> = {
                    id: 'node1',
                    label: 'Test Node',
                    name: 'testNode',
                    category: 'Test',
                    inputs: { param1: 'value1', param2: '' },
                    inputParams: [
                        { name: 'param1', label: 'Param 1', type: 'string' },
                        { name: 'param2', label: 'Param 2', type: 'string' }
                    ]
                }

                const result = saveUpsertFlowData(nodeData as INodeData, {})
                expect(result[0].paramValues).toHaveLength(1)
            })

            it('should skip variable references', () => {
                const nodeData: Partial<INodeData> = {
                    id: 'node1',
                    label: 'Test Node',
                    name: 'testNode',
                    category: 'Test',
                    inputs: { param1: '{{otherNode.data.instance}}', param2: 'value2' },
                    inputParams: [
                        { name: 'param1', label: 'Param 1', type: 'string' },
                        { name: 'param2', label: 'Param 2', type: 'string' }
                    ]
                }

                const result = saveUpsertFlowData(nodeData as INodeData, {})
                expect(result[0].paramValues).toHaveLength(1)
                expect(result[0].paramValues[0].name).toBe('param2')
            })

            it('should append to existing flow data', () => {
                const nodeData: Partial<INodeData> = {
                    id: 'node2',
                    label: 'Node 2',
                    name: 'node2',
                    category: 'Test',
                    inputs: {},
                    inputParams: []
                }
                const upsertHistory = {
                    flowData: [{ id: 'node1', label: 'Node 1', name: 'node1', paramValues: [] }]
                }

                const result = saveUpsertFlowData(nodeData as INodeData, upsertHistory)
                expect(result).toHaveLength(2)
            })

            it('should handle file inputs in Document Loaders by extracting filename', () => {
                const nodeData: Partial<INodeData> = {
                    id: 'node1',
                    label: 'PDF Loader',
                    name: 'pdfLoader',
                    category: 'Document Loaders',
                    inputs: { file: 'FILE-STORAGE::document.pdf' },
                    inputParams: [{ name: 'file', label: 'File', type: 'file' }]
                }

                const result = saveUpsertFlowData(nodeData as INodeData, {})
                expect(result[0].paramValues[0].value).toBe('document.pdf')
            })
        })

        describe('isSameOverrideConfig', () => {
            it('should return true for internal requests with no existing config', () => {
                const result = isSameOverrideConfig(true, undefined, { key: 'value' })
                expect(result).toBe(true)
            })

            it('should return false for internal requests with existing config', () => {
                const result = isSameOverrideConfig(true, { key: 'value' }, { key: 'value' })
                expect(result).toBe(false)
            })

            it('should return true when both configs are equal', () => {
                const config = { model: 'gpt-4', temperature: 0.7 }
                const result = isSameOverrideConfig(false, config, config)
                expect(result).toBe(true)
            })

            it('should return false when configs are different', () => {
                const existing = { model: 'gpt-3.5' }
                const newConfig = { model: 'gpt-4' }
                const result = isSameOverrideConfig(false, existing, newConfig)
                expect(result).toBe(false)
            })

            it('should return true when both configs are undefined', () => {
                const result = isSameOverrideConfig(false, undefined, undefined)
                expect(result).toBe(true)
            })

            it('should return false when only one config exists', () => {
                const result = isSameOverrideConfig(false, { key: 'value' }, undefined)
                expect(result).toBe(false)
            })
        })

        describe('isSameChatId', () => {
            it('should return true for equal chat IDs', () => {
                const result = isSameChatId('chat-123', 'chat-123')
                expect(result).toBe(true)
            })

            it('should return false for different chat IDs', () => {
                const result = isSameChatId('chat-123', 'chat-456')
                expect(result).toBe(false)
            })

            it('should return true when both are undefined', () => {
                const result = isSameChatId(undefined, undefined)
                expect(result).toBe(true)
            })

            it('should return false when only one is undefined', () => {
                const result = isSameChatId('chat-123', undefined)
                expect(result).toBe(false)
            })
        })

        describe('getMemorySessionId', () => {
            it('should return override sessionId for external requests', () => {
                const incomingInput = { overrideConfig: { sessionId: 'override-session' } } as any
                const result = getMemorySessionId(undefined, incomingInput, 'default-chat', false)
                expect(result).toBe('override-session')
            })

            it('should return chatId from input for external requests', () => {
                const incomingInput = { chatId: 'input-chat-id' } as any
                const result = getMemorySessionId(undefined, incomingInput, 'default-chat', false)
                expect(result).toBe('input-chat-id')
            })

            it('should return memoryNode sessionId when available', () => {
                const memoryNode = {
                    data: { inputs: { sessionId: 'memory-session' } }
                } as any
                const result = getMemorySessionId(memoryNode, {} as any, 'default-chat', true)
                expect(result).toBe('memory-session')
            })

            it('should return default chatId when no other option', () => {
                const result = getMemorySessionId(undefined, {} as any, 'default-chat', true)
                expect(result).toBe('default-chat')
            })

            it('should prioritize override sessionId over chatId', () => {
                const incomingInput = {
                    chatId: 'input-chat',
                    overrideConfig: { sessionId: 'override-session' }
                } as any
                const result = getMemorySessionId(undefined, incomingInput, 'default', false)
                expect(result).toBe('override-session')
            })
        })

        describe('findMemoryNode', () => {
            it('should find memory node connected via edge', () => {
                const nodes = [createMockNode('memory1', { category: 'Memory' }), createMockNode('llm1', { category: 'LLM' })]
                const edges = [createMockEdge('e1', 'memory1', 'llm1')]

                const result = findMemoryNode(nodes, edges)
                expect(result?.id).toBe('memory1')
            })

            it('should return undefined when no memory node', () => {
                const nodes = [createMockNode('llm1', { category: 'LLM' }), createMockNode('chain1', { category: 'Chains' })]
                const edges = [createMockEdge('e1', 'llm1', 'chain1')]

                const result = findMemoryNode(nodes, edges)
                expect(result).toBeUndefined()
            })

            it('should return undefined when memory node exists but not connected', () => {
                const nodes = [createMockNode('memory1', { category: 'Memory' }), createMockNode('llm1', { category: 'LLM' })]
                // No edge from memory node
                const edges = [createMockEdge('e1', 'llm1', 'other')]

                const result = findMemoryNode(nodes, edges)
                expect(result).toBeUndefined()
            })
        })

        describe('getAllValuesFromJson', () => {
            it('should extract all primitive values from object', () => {
                const obj = { a: 1, b: 'hello', c: true }
                const result = getAllValuesFromJson(obj)
                expect(result).toContain(1)
                expect(result).toContain('hello')
                expect(result).toContain(true)
            })

            it('should extract values from nested objects', () => {
                const obj = { level1: { level2: { value: 'deep' } } }
                const result = getAllValuesFromJson(obj)
                expect(result).toContain('deep')
            })

            it('should extract values from arrays', () => {
                const obj = { items: [1, 2, 3] }
                const result = getAllValuesFromJson(obj)
                expect(result).toContain(1)
                expect(result).toContain(2)
                expect(result).toContain(3)
            })

            it('should handle empty object', () => {
                const result = getAllValuesFromJson({})
                expect(result).toEqual([])
            })

            it('should handle null values', () => {
                const obj = { a: null }
                const result = getAllValuesFromJson(obj)
                expect(result).toContain(null)
            })

            it('should handle mixed nested structure', () => {
                const obj = {
                    string: 'test',
                    number: 42,
                    nested: {
                        array: ['a', 'b'],
                        deep: { value: 'found' }
                    }
                }
                const result = getAllValuesFromJson(obj)
                expect(result).toContain('test')
                expect(result).toContain(42)
                expect(result).toContain('a')
                expect(result).toContain('b')
                expect(result).toContain('found')
            })
        })

        describe('getTelemetryFlowObj', () => {
            it('should create telemetry object with node IDs and edge data', () => {
                const nodes = [createMockNode('node1'), createMockNode('node2')]
                const edges = [createMockEdge('e1', 'node1', 'node2')]

                const result = getTelemetryFlowObj(nodes, edges)

                expect(result.nodes).toEqual(['node1', 'node2'])
                expect(result.edges).toEqual([{ source: 'node1', target: 'node2' }])
            })

            it('should handle empty nodes and edges', () => {
                const result = getTelemetryFlowObj([], [])
                expect(result.nodes).toEqual([])
                expect(result.edges).toEqual([])
            })

            it('should strip extra data from edges', () => {
                const edges = [
                    {
                        ...createMockEdge('e1', 'a', 'b'),
                        extraData: 'should not appear'
                    } as any
                ]
                const result = getTelemetryFlowObj([], edges)
                expect(result.edges[0]).toEqual({ source: 'a', target: 'b' })
                expect((result.edges[0] as any).extraData).toBeUndefined()
            })
        })
    })
}
