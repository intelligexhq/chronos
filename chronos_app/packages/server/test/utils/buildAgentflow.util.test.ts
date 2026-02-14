import {
    parseFormStringToJson,
    combineNodeInputs,
    getNodeInputConnections,
    setupNodeDependencies,
    findConditionParent,
    hasReceivedRequiredInputs,
    determineNodesToIgnore,
    checkForMultipleStartNodes,
    IWaitingNode
} from '../../src/utils/buildAgentflow'
import { IReactFlowNode, IReactFlowEdge, INodeData } from '../../src/Interface'

// Helper to create mock node with minimal required fields
const createMockNode = (id: string, data: Partial<INodeData> = {}): IReactFlowNode =>
    ({
        id,
        position: { x: 0, y: 0 },
        type: 'customNode',
        data: { id, label: id, name: data.name || id, ...data },
        positionAbsolute: { x: 0, y: 0 },
        z: 0,
        handleBounds: { source: null, target: null },
        width: 100,
        height: 100,
        selected: false,
        dragging: false
    }) as unknown as IReactFlowNode

// Helper to create mock edge with minimal required fields
const createMockEdge = (source: string, target: string, sourceHandle = 'output-0'): IReactFlowEdge =>
    ({
        id: `${source}-${target}`,
        source,
        target,
        sourceHandle,
        targetHandle: 'input-0',
        type: 'buttonedge',
        data: {}
    }) as IReactFlowEdge

// Helper to create a waiting node for testing
const createMockWaitingNode = (
    nodeId: string,
    options: {
        expectedInputs?: string[]
        receivedInputs?: Map<string, any>
        isConditional?: boolean
        conditionalGroups?: Map<string, string[]>
    } = {}
): IWaitingNode => ({
    nodeId,
    receivedInputs: options.receivedInputs || new Map(),
    expectedInputs: new Set(options.expectedInputs || []),
    isConditional: options.isConditional || false,
    conditionalGroups: options.conditionalGroups || new Map()
})

/**
 * Test suite for buildAgentflow utility functions
 * Tests pure utility functions used in agent flow execution
 */
export function buildAgentflowUtilTest() {
    describe('buildAgentflow Utils', () => {
        // Phase 1: Pure Utility Functions

        describe('parseFormStringToJson', () => {
            it('should parse single key-value pair', () => {
                const result = parseFormStringToJson('name: John')
                expect(result).toEqual({ name: 'John' })
            })

            it('should parse multiple key-value pairs', () => {
                const result = parseFormStringToJson('name: John\nage: 30\ncity: NYC')
                expect(result).toEqual({
                    name: 'John',
                    age: '30',
                    city: 'NYC'
                })
            })

            it('should handle empty string', () => {
                const result = parseFormStringToJson('')
                expect(result).toEqual({})
            })

            it('should handle malformed input (no colon)', () => {
                const result = parseFormStringToJson('invalid line without colon')
                expect(result).toEqual({})
            })

            it('should handle values with colons', () => {
                const result = parseFormStringToJson('time: 10:30:00')
                expect(result).toEqual({ time: '10:30:00' }) // Only splits on first colon
            })

            it('should trim whitespace from keys and values', () => {
                const result = parseFormStringToJson('  name  :   John Doe   ')
                expect(result).toEqual({ name: 'John Doe' })
            })

            it('should handle mixed valid and invalid lines', () => {
                const result = parseFormStringToJson('name: John\ninvalid\nemail: john@example.com')
                expect(result).toEqual({
                    name: 'John',
                    email: 'john@example.com'
                })
            })

            it('should handle empty values', () => {
                const result = parseFormStringToJson('name: ')
                expect(result).toEqual({})
            })

            it('should handle empty keys', () => {
                const result = parseFormStringToJson(': value')
                expect(result).toEqual({})
            })
        })

        describe('combineNodeInputs', () => {
            it('should return null for empty inputs', () => {
                const inputs = new Map()
                const result = combineNodeInputs(inputs)
                expect(result).toBeNull()
            })

            it('should return single input unchanged when only one valid input', () => {
                const inputs = new Map()
                inputs.set('node1', { json: { value: 1 }, text: 'Hello' })
                const result = combineNodeInputs(inputs)
                expect(result).toEqual({ json: { value: 1 }, text: 'Hello' })
            })

            it('should filter out null/undefined inputs', () => {
                const inputs = new Map()
                inputs.set('node1', null)
                inputs.set('node2', undefined)
                inputs.set('node3', { json: { value: 3 } })
                const result = combineNodeInputs(inputs)
                expect(result).toEqual({ json: { value: 3 } })
            })

            it('should merge JSON data from multiple sources', () => {
                const inputs = new Map()
                inputs.set('node1', { json: { value: 1 } })
                inputs.set('node2', { json: { value: 2 } })
                const result = combineNodeInputs(inputs)
                expect(result.json).toEqual({
                    node1: { value: 1 },
                    node2: { value: 2 }
                })
            })

            it('should combine text data with newlines', () => {
                const inputs = new Map()
                inputs.set('node1', { text: 'Hello' })
                inputs.set('node2', { text: 'World' })
                const result = combineNodeInputs(inputs)
                expect(result.text).toBe('Hello\nWorld')
            })

            it('should merge binary data', () => {
                const inputs = new Map()
                inputs.set('node1', { binary: { file1: 'data1' } })
                inputs.set('node2', { binary: { file2: 'data2' } })
                const result = combineNodeInputs(inputs)
                expect(result.binary).toEqual({
                    node1: { file1: 'data1' },
                    node2: { file2: 'data2' }
                })
            })

            it('should propagate error data', () => {
                const error = new Error('Test error')
                const inputs = new Map()
                inputs.set('node1', { json: { value: 1 } })
                inputs.set('node2', { error })
                const result = combineNodeInputs(inputs)
                expect(result.error).toBe(error)
            })

            it('should handle primitive input data', () => {
                const inputs = new Map()
                inputs.set('node1', 'string value')
                inputs.set('node2', 42)
                const result = combineNodeInputs(inputs)
                expect(result.json).toEqual({
                    node1: 'string value',
                    node2: 42
                })
            })

            it('should create json.text when only text exists', () => {
                const inputs = new Map()
                inputs.set('node1', { text: 'Hello' })
                inputs.set('node2', { text: 'World' })
                const result = combineNodeInputs(inputs)
                expect(result.json).toEqual({ text: 'Hello\nWorld' })
            })

            it('should handle null inputs in map', () => {
                const inputs = new Map()
                inputs.set('node1', { json: { value: 1 } })
                inputs.set('node2', null)
                const result = combineNodeInputs(inputs)
                // Should only process valid input
                expect(result).toEqual({ json: { value: 1 } })
            })

            it('should sort inputs by source node ID', () => {
                const inputs = new Map()
                inputs.set('nodeB', { json: { b: 2 } })
                inputs.set('nodeA', { json: { a: 1 } })
                inputs.set('nodeC', { json: { c: 3 } })
                const result = combineNodeInputs(inputs)
                // Order should be alphabetical by node ID
                const keys = Object.keys(result.json)
                expect(keys).toEqual(['nodeA', 'nodeB', 'nodeC'])
            })
        })

        describe('getNodeInputConnections', () => {
            it('should return edges where target matches nodeId', () => {
                const edges: IReactFlowEdge[] = [
                    createMockEdge('node1', 'node3', 'output-0'),
                    createMockEdge('node2', 'node3', 'output-1'),
                    createMockEdge('node1', 'node2', 'output-0')
                ]
                const result = getNodeInputConnections(edges, 'node3')
                expect(result).toHaveLength(2)
                expect(result.map((e) => e.source)).toContain('node1')
                expect(result.map((e) => e.source)).toContain('node2')
            })

            it('should return empty array when no edges target the node', () => {
                const edges: IReactFlowEdge[] = [
                    createMockEdge('node1', 'node2', 'output-0'),
                    createMockEdge('node2', 'node3', 'output-0')
                ]
                const result = getNodeInputConnections(edges, 'node4')
                expect(result).toHaveLength(0)
            })

            it('should sort connections by sourceHandle index', () => {
                const edges: IReactFlowEdge[] = [
                    createMockEdge('node2', 'node3', 'output-2'),
                    createMockEdge('node1', 'node3', 'output-0'),
                    createMockEdge('node4', 'node3', 'output-1')
                ]
                const result = getNodeInputConnections(edges, 'node3')
                expect(result).toHaveLength(3)
                expect(result[0].source).toBe('node1') // output-0
                expect(result[1].source).toBe('node4') // output-1
                expect(result[2].source).toBe('node2') // output-2
            })

            it('should handle edges with non-numeric sourceHandle parts', () => {
                const edges: IReactFlowEdge[] = [
                    createMockEdge('node1', 'node2', 'output-abc'),
                    createMockEdge('node3', 'node2', 'output-def')
                ]
                const result = getNodeInputConnections(edges, 'node2')
                expect(result).toHaveLength(2)
            })

            it('should handle empty edges array', () => {
                const result = getNodeInputConnections([], 'node1')
                expect(result).toHaveLength(0)
            })
        })

        describe('setupNodeDependencies', () => {
            it('should create waiting node with expected inputs', () => {
                const nodes: IReactFlowNode[] = [
                    createMockNode('node1', { name: 'llmAgentflow' }),
                    createMockNode('node2', { name: 'llmAgentflow' }),
                    createMockNode('node3', { name: 'llmAgentflow' })
                ]
                const edges: IReactFlowEdge[] = [
                    createMockEdge('node1', 'node3'),
                    createMockEdge('node2', 'node3')
                ]
                const result = setupNodeDependencies('node3', edges, nodes)
                expect(result.nodeId).toBe('node3')
                expect(result.expectedInputs.has('node1')).toBe(true)
                expect(result.expectedInputs.has('node2')).toBe(true)
            })

            it('should identify conditional parents', () => {
                const nodes: IReactFlowNode[] = [
                    createMockNode('condition1', { name: 'conditionAgentflow' }),
                    createMockNode('node2', { name: 'llmAgentflow' }),
                    createMockNode('node3', { name: 'llmAgentflow' })
                ]
                const edges: IReactFlowEdge[] = [
                    createMockEdge('condition1', 'node2'),
                    createMockEdge('node2', 'node3')
                ]
                const result = setupNodeDependencies('node3', edges, nodes)
                expect(result.isConditional).toBe(true)
            })

            it('should handle nodes without conditional parents', () => {
                const nodes: IReactFlowNode[] = [
                    createMockNode('node1', { name: 'llmAgentflow' }),
                    createMockNode('node2', { name: 'llmAgentflow' })
                ]
                const edges: IReactFlowEdge[] = [createMockEdge('node1', 'node2')]
                const result = setupNodeDependencies('node2', edges, nodes)
                expect(result.isConditional).toBe(false)
                expect(result.expectedInputs.has('node1')).toBe(true)
            })

            it('should handle node with no input connections', () => {
                const nodes: IReactFlowNode[] = [createMockNode('node1', { name: 'startAgentflow' })]
                const edges: IReactFlowEdge[] = []
                const result = setupNodeDependencies('node1', edges, nodes)
                expect(result.expectedInputs.size).toBe(0)
                expect(result.conditionalGroups.size).toBe(0)
            })

            it('should group inputs by condition nodes', () => {
                const nodes: IReactFlowNode[] = [
                    createMockNode('condition1', { name: 'conditionAgentflow' }),
                    createMockNode('branchA', { name: 'llmAgentflow' }),
                    createMockNode('branchB', { name: 'llmAgentflow' }),
                    createMockNode('merge', { name: 'llmAgentflow' })
                ]
                const edges: IReactFlowEdge[] = [
                    createMockEdge('condition1', 'branchA', 'condition1-output-0'),
                    createMockEdge('condition1', 'branchB', 'condition1-output-1'),
                    createMockEdge('branchA', 'merge'),
                    createMockEdge('branchB', 'merge')
                ]
                const result = setupNodeDependencies('merge', edges, nodes)
                expect(result.isConditional).toBe(true)
                expect(result.conditionalGroups.size).toBe(1)
            })
        })

        describe('findConditionParent', () => {
            it('should return nodeId if current node is conditionAgentflow', () => {
                const nodes: IReactFlowNode[] = [createMockNode('cond1', { name: 'conditionAgentflow' })]
                const result = findConditionParent('cond1', [], nodes)
                expect(result).toBe('cond1')
            })

            it('should return nodeId if current node is conditionAgentAgentflow', () => {
                const nodes: IReactFlowNode[] = [createMockNode('cond1', { name: 'conditionAgentAgentflow' })]
                const result = findConditionParent('cond1', [], nodes)
                expect(result).toBe('cond1')
            })

            it('should return nodeId if current node is humanInputAgentflow', () => {
                const nodes: IReactFlowNode[] = [createMockNode('human1', { name: 'humanInputAgentflow' })]
                const result = findConditionParent('human1', [], nodes)
                expect(result).toBe('human1')
            })

            it('should return parent condition node when found in ancestors', () => {
                const nodes: IReactFlowNode[] = [
                    createMockNode('cond1', { name: 'conditionAgentflow' }),
                    createMockNode('node2', { name: 'llmAgentflow' }),
                    createMockNode('node3', { name: 'llmAgentflow' })
                ]
                const edges: IReactFlowEdge[] = [createMockEdge('cond1', 'node2'), createMockEdge('node2', 'node3')]
                const result = findConditionParent('node3', edges, nodes)
                expect(result).toBe('cond1')
            })

            it('should return null when no condition parent exists', () => {
                const nodes: IReactFlowNode[] = [
                    createMockNode('node1', { name: 'llmAgentflow' }),
                    createMockNode('node2', { name: 'llmAgentflow' })
                ]
                const edges: IReactFlowEdge[] = [createMockEdge('node1', 'node2')]
                const result = findConditionParent('node2', edges, nodes)
                expect(result).toBeNull()
            })

            it('should handle cycles without infinite loop', () => {
                const nodes: IReactFlowNode[] = [
                    createMockNode('node1', { name: 'llmAgentflow' }),
                    createMockNode('node2', { name: 'llmAgentflow' })
                ]
                const edges: IReactFlowEdge[] = [createMockEdge('node1', 'node2'), createMockEdge('node2', 'node1')]
                // This should not hang
                const result = findConditionParent('node2', edges, nodes)
                expect(result).toBeNull()
            })

            it('should handle disconnected nodes', () => {
                const nodes: IReactFlowNode[] = [
                    createMockNode('node1', { name: 'llmAgentflow' }),
                    createMockNode('node2', { name: 'llmAgentflow' })
                ]
                const edges: IReactFlowEdge[] = [] // No edges
                const result = findConditionParent('node2', edges, nodes)
                expect(result).toBeNull()
            })

            it('should return null for non-existent node', () => {
                const nodes: IReactFlowNode[] = [createMockNode('node1', { name: 'llmAgentflow' })]
                const result = findConditionParent('nonExistent', [], nodes)
                expect(result).toBeNull()
            })
        })

        describe('hasReceivedRequiredInputs', () => {
            it('should return true when all expected inputs received', () => {
                const receivedInputs = new Map()
                receivedInputs.set('node1', { json: { value: 1 } })
                receivedInputs.set('node2', { json: { value: 2 } })

                const waitingNode = createMockWaitingNode('node3', {
                    expectedInputs: ['node1', 'node2'],
                    receivedInputs
                })

                const result = hasReceivedRequiredInputs(waitingNode)
                expect(result).toBe(true)
            })

            it('should return false when missing required input', () => {
                const receivedInputs = new Map()
                receivedInputs.set('node1', { json: { value: 1 } })

                const waitingNode = createMockWaitingNode('node3', {
                    expectedInputs: ['node1', 'node2'],
                    receivedInputs
                })

                const result = hasReceivedRequiredInputs(waitingNode)
                expect(result).toBe(false)
            })

            it('should check conditional groups', () => {
                const receivedInputs = new Map()
                receivedInputs.set('branchA', { json: { value: 1 } })

                const conditionalGroups = new Map<string, string[]>()
                conditionalGroups.set('condition1', ['branchA', 'branchB'])

                const waitingNode = createMockWaitingNode('merge', {
                    receivedInputs,
                    isConditional: true,
                    conditionalGroups
                })

                const result = hasReceivedRequiredInputs(waitingNode)
                expect(result).toBe(true)
            })

            it('should require at least one input from each conditional group', () => {
                const receivedInputs = new Map()
                // No inputs received yet

                const conditionalGroups = new Map<string, string[]>()
                conditionalGroups.set('condition1', ['branchA', 'branchB'])

                const waitingNode = createMockWaitingNode('merge', {
                    receivedInputs,
                    isConditional: true,
                    conditionalGroups
                })

                const result = hasReceivedRequiredInputs(waitingNode)
                expect(result).toBe(false)
            })

            it('should return true when all conditions satisfied', () => {
                const receivedInputs = new Map()
                receivedInputs.set('node1', { json: { value: 1 } })
                receivedInputs.set('branchA', { json: { value: 2 } })

                const conditionalGroups = new Map<string, string[]>()
                conditionalGroups.set('condition1', ['branchA', 'branchB'])

                const waitingNode = createMockWaitingNode('merge', {
                    expectedInputs: ['node1'],
                    receivedInputs,
                    isConditional: true,
                    conditionalGroups
                })

                const result = hasReceivedRequiredInputs(waitingNode)
                expect(result).toBe(true)
            })

            it('should return true when no expected inputs', () => {
                const waitingNode = createMockWaitingNode('node1', {
                    expectedInputs: [],
                    receivedInputs: new Map()
                })

                const result = hasReceivedRequiredInputs(waitingNode)
                expect(result).toBe(true)
            })
        })

        describe('determineNodesToIgnore', () => {
            it('should return empty array for non-decision nodes', async () => {
                const node = createMockNode('node1', { name: 'llmAgentflow' })
                const result = await determineNodesToIgnore(node, {}, [], 'node1')
                expect(result).toEqual([])
            })

            it('should identify unfulfilled condition targets for conditionAgentflow', async () => {
                const node = createMockNode('cond1', { name: 'conditionAgentflow' })
                const result = {
                    output: {
                        conditions: [{ isFulfilled: true }, { isFulfilled: false }]
                    }
                }
                const edges: IReactFlowEdge[] = [
                    createMockEdge('cond1', 'nodeA', 'cond1-output-0'),
                    createMockEdge('cond1', 'nodeB', 'cond1-output-1')
                ]

                const ignoreNodeIds = await determineNodesToIgnore(node, result, edges, 'cond1')
                expect(ignoreNodeIds).toContain('nodeB')
                expect(ignoreNodeIds).not.toContain('nodeA')
            })

            it('should identify unfulfilled condition targets for conditionAgentAgentflow', async () => {
                const node = createMockNode('cond1', { name: 'conditionAgentAgentflow' })
                const result = {
                    output: {
                        conditions: [{ isFulfilled: false }, { isFulfilled: true }]
                    }
                }
                const edges: IReactFlowEdge[] = [
                    createMockEdge('cond1', 'nodeA', 'cond1-output-0'),
                    createMockEdge('cond1', 'nodeB', 'cond1-output-1')
                ]

                const ignoreNodeIds = await determineNodesToIgnore(node, result, edges, 'cond1')
                expect(ignoreNodeIds).toContain('nodeA')
                expect(ignoreNodeIds).not.toContain('nodeB')
            })

            it('should identify unfulfilled condition targets for humanInputAgentflow', async () => {
                const node = createMockNode('human1', { name: 'humanInputAgentflow' })
                const result = {
                    output: {
                        conditions: [{ isFulfilled: false }, { isFulfilled: false }, { isFulfilled: true }]
                    }
                }
                const edges: IReactFlowEdge[] = [
                    createMockEdge('human1', 'nodeA', 'human1-output-0'),
                    createMockEdge('human1', 'nodeB', 'human1-output-1'),
                    createMockEdge('human1', 'nodeC', 'human1-output-2')
                ]

                const ignoreNodeIds = await determineNodesToIgnore(node, result, edges, 'human1')
                expect(ignoreNodeIds).toContain('nodeA')
                expect(ignoreNodeIds).toContain('nodeB')
                expect(ignoreNodeIds).not.toContain('nodeC')
            })

            it('should return multiple ignore nodeIds when multiple conditions unfulfilled', async () => {
                const node = createMockNode('cond1', { name: 'conditionAgentflow' })
                const result = {
                    output: {
                        conditions: [{ isFulfilled: false }, { isFulfilled: false }, { isFulfilled: true }]
                    }
                }
                const edges: IReactFlowEdge[] = [
                    createMockEdge('cond1', 'nodeA', 'cond1-output-0'),
                    createMockEdge('cond1', 'nodeB', 'cond1-output-1'),
                    createMockEdge('cond1', 'nodeC', 'cond1-output-2')
                ]

                const ignoreNodeIds = await determineNodesToIgnore(node, result, edges, 'cond1')
                expect(ignoreNodeIds).toHaveLength(2)
                expect(ignoreNodeIds).toContain('nodeA')
                expect(ignoreNodeIds).toContain('nodeB')
            })

            it('should handle missing edges gracefully', async () => {
                const node = createMockNode('cond1', { name: 'conditionAgentflow' })
                const result = {
                    output: {
                        conditions: [{ isFulfilled: false }]
                    }
                }
                const edges: IReactFlowEdge[] = [] // No edges

                const ignoreNodeIds = await determineNodesToIgnore(node, result, edges, 'cond1')
                expect(ignoreNodeIds).toEqual([])
            })

            it('should handle conditions without isFulfilled property', async () => {
                const node = createMockNode('cond1', { name: 'conditionAgentflow' })
                const result = {
                    output: {
                        conditions: [{ someOtherProp: true }, { isFulfilled: true }]
                    }
                }
                const edges: IReactFlowEdge[] = [
                    createMockEdge('cond1', 'nodeA', 'cond1-output-0'),
                    createMockEdge('cond1', 'nodeB', 'cond1-output-1')
                ]

                const ignoreNodeIds = await determineNodesToIgnore(node, result, edges, 'cond1')
                expect(ignoreNodeIds).toContain('nodeA')
            })

            it('should return empty array when result has no conditions', async () => {
                const node = createMockNode('cond1', { name: 'conditionAgentflow' })
                const result = { output: {} }
                const edges: IReactFlowEdge[] = [createMockEdge('cond1', 'nodeA', 'cond1-output-0')]

                const ignoreNodeIds = await determineNodesToIgnore(node, result, edges, 'cond1')
                expect(ignoreNodeIds).toEqual([])
            })
        })

        describe('checkForMultipleStartNodes', () => {
            it('should remove starting nodes inside iteration for non-recursive', () => {
                const nodes: IReactFlowNode[] = [
                    createMockNode('start1'),
                    { ...createMockNode('start2'), extent: 'parent' } as IReactFlowNode
                ]
                const startingNodeIds = ['start1', 'start2']

                checkForMultipleStartNodes(startingNodeIds, false, nodes)

                expect(startingNodeIds).toEqual(['start1'])
            })

            it('should allow multiple starts for recursive calls', () => {
                const nodes: IReactFlowNode[] = [
                    createMockNode('start1'),
                    { ...createMockNode('start2'), extent: 'parent' } as IReactFlowNode
                ]
                const startingNodeIds = ['start1', 'start2']

                // Should not throw
                expect(() => checkForMultipleStartNodes(startingNodeIds, true, nodes)).not.toThrow()
            })

            it('should throw error for multiple starting nodes in non-recursive', () => {
                const nodes: IReactFlowNode[] = [createMockNode('start1'), createMockNode('start2')]
                const startingNodeIds = ['start1', 'start2']

                expect(() => checkForMultipleStartNodes(startingNodeIds, false, nodes)).toThrow(
                    'Multiple starting nodes are not allowed'
                )
            })

            it('should not modify array when single starting node', () => {
                const nodes: IReactFlowNode[] = [createMockNode('start1')]
                const startingNodeIds = ['start1']

                checkForMultipleStartNodes(startingNodeIds, false, nodes)

                expect(startingNodeIds).toEqual(['start1'])
            })

            it('should handle empty starting nodes array', () => {
                const nodes: IReactFlowNode[] = []
                const startingNodeIds: string[] = []

                expect(() => checkForMultipleStartNodes(startingNodeIds, false, nodes)).not.toThrow()
            })

            it('should preserve nodes not marked as extent parent', () => {
                const nodes: IReactFlowNode[] = [
                    createMockNode('start1'),
                    createMockNode('start2'),
                    { ...createMockNode('iteration1'), extent: 'parent' } as IReactFlowNode
                ]
                const startingNodeIds = ['start1', 'start2', 'iteration1']

                // Should throw because start1 and start2 remain after removing iteration1
                expect(() => checkForMultipleStartNodes(startingNodeIds, false, nodes)).toThrow()
            })
        })
    })
}
