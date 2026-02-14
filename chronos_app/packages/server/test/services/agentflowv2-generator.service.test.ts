import { z } from 'zod'

/**
 * Re-define Zod schemas for testing (mirrors the service schemas)
 * This allows testing the validation logic without importing internal service code
 */
const NodeType = z.object({
    id: z.string(),
    type: z.string(),
    position: z.object({
        x: z.number(),
        y: z.number()
    }),
    width: z.number(),
    height: z.number(),
    selected: z.boolean().optional(),
    positionAbsolute: z
        .object({
            x: z.number(),
            y: z.number()
        })
        .optional(),
    dragging: z.boolean().optional(),
    data: z.any().optional(),
    parentNode: z.string().optional()
})

const EdgeType = z.object({
    source: z.string(),
    sourceHandle: z.string(),
    target: z.string(),
    targetHandle: z.string(),
    data: z
        .object({
            sourceColor: z.string().optional(),
            targetColor: z.string().optional(),
            edgeLabel: z.string().optional(),
            isHumanInput: z.boolean().optional()
        })
        .optional(),
    type: z.string().optional(),
    id: z.string()
})

const AgentFlowV2Type = z
    .object({
        description: z.string().optional(),
        usecases: z.array(z.string()).optional(),
        nodes: z.array(NodeType),
        edges: z.array(EdgeType)
    })
    .describe('Generate Agentflowv2 nodes and edges')

/**
 * Test suite for agentflowv2 generator service
 * Tests the Zod schema validation for agentflow data structures
 */
export function agentflowv2GeneratorServiceTest() {
    describe('Agentflowv2 Generator Service', () => {
        describe('NodeType Schema Validation', () => {
            it('should validate a minimal valid node', () => {
                const validNode = {
                    id: 'node-1',
                    type: 'agentNode',
                    position: { x: 100, y: 200 },
                    width: 300,
                    height: 150
                }

                const result = NodeType.safeParse(validNode)
                expect(result.success).toBe(true)
            })

            it('should validate a node with all optional fields', () => {
                const validNode = {
                    id: 'node-1',
                    type: 'agentNode',
                    position: { x: 100, y: 200 },
                    width: 300,
                    height: 150,
                    selected: true,
                    positionAbsolute: { x: 100, y: 200 },
                    dragging: false,
                    data: { label: 'My Node' },
                    parentNode: 'parent-1'
                }

                const result = NodeType.safeParse(validNode)
                expect(result.success).toBe(true)
            })

            it('should reject node missing required id', () => {
                const invalidNode = {
                    type: 'agentNode',
                    position: { x: 100, y: 200 },
                    width: 300,
                    height: 150
                }

                const result = NodeType.safeParse(invalidNode)
                expect(result.success).toBe(false)
            })

            it('should reject node with invalid position', () => {
                const invalidNode = {
                    id: 'node-1',
                    type: 'agentNode',
                    position: { x: 'invalid', y: 200 },
                    width: 300,
                    height: 150
                }

                const result = NodeType.safeParse(invalidNode)
                expect(result.success).toBe(false)
            })

            it('should reject node with missing position', () => {
                const invalidNode = {
                    id: 'node-1',
                    type: 'agentNode',
                    width: 300,
                    height: 150
                }

                const result = NodeType.safeParse(invalidNode)
                expect(result.success).toBe(false)
            })
        })

        describe('EdgeType Schema Validation', () => {
            it('should validate a minimal valid edge', () => {
                const validEdge = {
                    source: 'node-1',
                    sourceHandle: 'output-1',
                    target: 'node-2',
                    targetHandle: 'input-1',
                    id: 'edge-1'
                }

                const result = EdgeType.safeParse(validEdge)
                expect(result.success).toBe(true)
            })

            it('should validate an edge with all optional fields', () => {
                const validEdge = {
                    source: 'node-1',
                    sourceHandle: 'output-1',
                    target: 'node-2',
                    targetHandle: 'input-1',
                    id: 'edge-1',
                    type: 'smoothstep',
                    data: {
                        sourceColor: '#ff0000',
                        targetColor: '#00ff00',
                        edgeLabel: 'Connection',
                        isHumanInput: false
                    }
                }

                const result = EdgeType.safeParse(validEdge)
                expect(result.success).toBe(true)
            })

            it('should reject edge missing required source', () => {
                const invalidEdge = {
                    sourceHandle: 'output-1',
                    target: 'node-2',
                    targetHandle: 'input-1',
                    id: 'edge-1'
                }

                const result = EdgeType.safeParse(invalidEdge)
                expect(result.success).toBe(false)
            })

            it('should reject edge missing required id', () => {
                const invalidEdge = {
                    source: 'node-1',
                    sourceHandle: 'output-1',
                    target: 'node-2',
                    targetHandle: 'input-1'
                }

                const result = EdgeType.safeParse(invalidEdge)
                expect(result.success).toBe(false)
            })
        })

        describe('AgentFlowV2Type Schema Validation', () => {
            it('should validate a minimal valid agentflow', () => {
                const validAgentflow = {
                    nodes: [
                        {
                            id: 'node-1',
                            type: 'startNode',
                            position: { x: 100, y: 100 },
                            width: 200,
                            height: 100
                        }
                    ],
                    edges: []
                }

                const result = AgentFlowV2Type.safeParse(validAgentflow)
                expect(result.success).toBe(true)
            })

            it('should validate a complete agentflow with description and usecases', () => {
                const validAgentflow = {
                    description: 'A simple chatbot agent',
                    usecases: ['Customer support', 'FAQ answering'],
                    nodes: [
                        {
                            id: 'start-1',
                            type: 'startNode',
                            position: { x: 100, y: 100 },
                            width: 200,
                            height: 100
                        },
                        {
                            id: 'agent-1',
                            type: 'agentNode',
                            position: { x: 400, y: 100 },
                            width: 300,
                            height: 200,
                            data: { model: 'gpt-4' }
                        }
                    ],
                    edges: [
                        {
                            source: 'start-1',
                            sourceHandle: 'start-output',
                            target: 'agent-1',
                            targetHandle: 'agent-input',
                            id: 'edge-1'
                        }
                    ]
                }

                const result = AgentFlowV2Type.safeParse(validAgentflow)
                expect(result.success).toBe(true)
            })

            it('should validate agentflow with empty nodes and edges', () => {
                const validAgentflow = {
                    nodes: [],
                    edges: []
                }

                const result = AgentFlowV2Type.safeParse(validAgentflow)
                expect(result.success).toBe(true)
            })

            it('should reject agentflow missing nodes array', () => {
                const invalidAgentflow = {
                    edges: []
                }

                const result = AgentFlowV2Type.safeParse(invalidAgentflow)
                expect(result.success).toBe(false)
            })

            it('should reject agentflow missing edges array', () => {
                const invalidAgentflow = {
                    nodes: []
                }

                const result = AgentFlowV2Type.safeParse(invalidAgentflow)
                expect(result.success).toBe(false)
            })

            it('should reject agentflow with invalid node in nodes array', () => {
                const invalidAgentflow = {
                    nodes: [
                        {
                            id: 'node-1'
                            // Missing required fields
                        }
                    ],
                    edges: []
                }

                const result = AgentFlowV2Type.safeParse(invalidAgentflow)
                expect(result.success).toBe(false)
            })

            it('should reject agentflow with invalid edge in edges array', () => {
                const invalidAgentflow = {
                    nodes: [],
                    edges: [
                        {
                            source: 'node-1'
                            // Missing required fields
                        }
                    ]
                }

                const result = AgentFlowV2Type.safeParse(invalidAgentflow)
                expect(result.success).toBe(false)
            })
        })

        describe('Complex Agentflow Validation', () => {
            it('should validate a multi-node agentflow with conditional routing', () => {
                const complexAgentflow = {
                    description: 'Complex routing agent with multiple branches',
                    usecases: ['Task routing', 'Multi-step workflows'],
                    nodes: [
                        {
                            id: 'start',
                            type: 'startNode',
                            position: { x: 0, y: 0 },
                            width: 150,
                            height: 80
                        },
                        {
                            id: 'classifier',
                            type: 'classifierNode',
                            position: { x: 250, y: 0 },
                            width: 200,
                            height: 120
                        },
                        {
                            id: 'agent-a',
                            type: 'agentNode',
                            position: { x: 500, y: -100 },
                            width: 250,
                            height: 150,
                            data: { label: 'Technical Support' }
                        },
                        {
                            id: 'agent-b',
                            type: 'agentNode',
                            position: { x: 500, y: 100 },
                            width: 250,
                            height: 150,
                            data: { label: 'General Inquiry' }
                        },
                        {
                            id: 'end',
                            type: 'endNode',
                            position: { x: 800, y: 0 },
                            width: 150,
                            height: 80
                        }
                    ],
                    edges: [
                        {
                            id: 'e1',
                            source: 'start',
                            sourceHandle: 'out',
                            target: 'classifier',
                            targetHandle: 'in'
                        },
                        {
                            id: 'e2',
                            source: 'classifier',
                            sourceHandle: 'tech',
                            target: 'agent-a',
                            targetHandle: 'in',
                            data: { edgeLabel: 'Technical' }
                        },
                        {
                            id: 'e3',
                            source: 'classifier',
                            sourceHandle: 'general',
                            target: 'agent-b',
                            targetHandle: 'in',
                            data: { edgeLabel: 'General' }
                        },
                        {
                            id: 'e4',
                            source: 'agent-a',
                            sourceHandle: 'out',
                            target: 'end',
                            targetHandle: 'in'
                        },
                        {
                            id: 'e5',
                            source: 'agent-b',
                            sourceHandle: 'out',
                            target: 'end',
                            targetHandle: 'in'
                        }
                    ]
                }

                const result = AgentFlowV2Type.safeParse(complexAgentflow)
                expect(result.success).toBe(true)
                if (result.success) {
                    expect(result.data.nodes).toHaveLength(5)
                    expect(result.data.edges).toHaveLength(5)
                }
            })

            it('should validate agentflow with nested parent-child nodes', () => {
                const nestedAgentflow = {
                    nodes: [
                        {
                            id: 'group-1',
                            type: 'groupNode',
                            position: { x: 0, y: 0 },
                            width: 500,
                            height: 300
                        },
                        {
                            id: 'child-1',
                            type: 'agentNode',
                            position: { x: 50, y: 50 },
                            width: 200,
                            height: 100,
                            parentNode: 'group-1'
                        },
                        {
                            id: 'child-2',
                            type: 'toolNode',
                            position: { x: 50, y: 180 },
                            width: 200,
                            height: 100,
                            parentNode: 'group-1'
                        }
                    ],
                    edges: [
                        {
                            id: 'internal-edge',
                            source: 'child-1',
                            sourceHandle: 'out',
                            target: 'child-2',
                            targetHandle: 'in'
                        }
                    ]
                }

                const result = AgentFlowV2Type.safeParse(nestedAgentflow)
                expect(result.success).toBe(true)
                if (result.success) {
                    const childNodes = result.data.nodes.filter((n) => n.parentNode)
                    expect(childNodes).toHaveLength(2)
                }
            })
        })
    })
}
