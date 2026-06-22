import { computeSnapshot } from '../../src/services/mcp-topology/aggregator'

/**
 * Unit tests for the live MCP topology snapshot aggregator.
 *
 * The aggregator is a pure read over the tool-invocation audit substrate plus
 * each enabled agent's allowedTools, so it is exercised here with mock repos
 * that return fixed rows. Covers: node/edge construction, per-window
 * count/success bucketing by row age, in-process latency percentiles, the
 * 3-deep newest-first recent list, and the configured-but-unused delta.
 */
export function topologyAggregatorTest() {
    describe('MCP Topology Aggregator', () => {
        // Row timestamps are generated fresh on every `buildDataSource()` call
        // (not once at module load): the aggregator buckets rows by their age
        // against its own `Date.now()`, so a long full-suite run must not be able
        // to age these rows out of the 1m window before this test actually runs.
        const makeAuditRows = () => {
            const now = Date.now()
            const ageSec = (s: number) => new Date(now - s * 1000)
            const ageMin = (m: number) => new Date(now - m * 60 * 1000)

            // Four calls on the same agent→postgres→query edge, newest first (the
            // SQL orders DESC; the mock returns the array verbatim), plus one older
            // call on a second server that only lands in the 1h window.
            return [
                {
                    agentId: 'a1',
                    agentSlug: 'agent-one',
                    mcpServerId: 's1',
                    mcpServerSlug: 'postgres',
                    toolName: 'query',
                    namespacedTool: 'postgres.query',
                    success: true,
                    durationMs: 10,
                    callId: 'c1',
                    createdDate: ageSec(1)
                },
                {
                    agentId: 'a1',
                    agentSlug: 'agent-one',
                    mcpServerId: 's1',
                    mcpServerSlug: 'postgres',
                    toolName: 'query',
                    namespacedTool: 'postgres.query',
                    success: false,
                    durationMs: 50,
                    callId: 'c2',
                    createdDate: ageSec(2)
                },
                {
                    agentId: 'a1',
                    agentSlug: 'agent-one',
                    mcpServerId: 's1',
                    mcpServerSlug: 'postgres',
                    toolName: 'query',
                    namespacedTool: 'postgres.query',
                    success: true,
                    durationMs: 30,
                    callId: 'c3',
                    createdDate: ageSec(3)
                },
                {
                    agentId: 'a1',
                    agentSlug: 'agent-one',
                    mcpServerId: 's1',
                    mcpServerSlug: 'postgres',
                    toolName: 'query',
                    namespacedTool: 'postgres.query',
                    success: true,
                    durationMs: 100,
                    callId: 'c4',
                    createdDate: ageSec(4)
                },
                {
                    agentId: 'a1',
                    agentSlug: 'agent-one',
                    mcpServerId: 's2',
                    mcpServerSlug: 'github',
                    toolName: 'create_issue',
                    namespacedTool: 'github.create_issue',
                    success: true,
                    durationMs: 20,
                    callId: 'c5',
                    createdDate: ageMin(10)
                }
            ]
        }

        // a1 is allowed three tools but only called two of them in the window;
        // `slack.post` is the configured-but-unused delta. a2 has an empty
        // allowedTools list and must be skipped entirely.
        const agentRows = [
            { id: 'a1', slug: 'agent-one', allowedTools: JSON.stringify(['postgres.query', 'github.create_issue', 'slack.post']) },
            { id: 'a2', slug: 'agent-two', allowedTools: undefined }
        ]

        // Default args are evaluated per call, so each invocation gets fresh
        // timestamps. The built rows are returned so a test can assert against
        // the exact instances the aggregator saw.
        const buildDataSource = (rows = makeAuditRows(), agents = agentRows): any => {
            const qb: any = {
                select: jest.fn().mockReturnThis(),
                where: jest.fn().mockReturnThis(),
                andWhere: jest.fn().mockReturnThis(),
                orderBy: jest.fn().mockReturnThis(),
                getMany: jest.fn().mockResolvedValue(rows)
            }
            const auditRepo = { createQueryBuilder: jest.fn().mockReturnValue(qb) }
            const agentRepo = { find: jest.fn().mockResolvedValue(agents) }
            return {
                rows,
                qb,
                agentRepo,
                getRepository: jest.fn((entity: any) => (entity?.name === 'Agent' ? agentRepo : auditRepo))
            }
        }

        const find = (arr: any[], pred: (x: any) => boolean) => arr.find(pred)

        it('builds one node per agent / server / tool and one edge per pair', async () => {
            const snapshot = await computeSnapshot(buildDataSource())

            expect(snapshot.nodes.map((n) => n.id).sort()).toEqual(
                ['agent:a1', 'server:s1', 'server:s2', 'tool:s1:postgres.query', 'tool:s2:github.create_issue'].sort()
            )
            expect(find(snapshot.nodes, (n) => n.id === 'agent:a1').type).toBe('agent')
            expect(find(snapshot.nodes, (n) => n.id === 'tool:s1:postgres.query').label).toBe('query')

            expect(snapshot.edges.map((e) => e.id).sort()).toEqual(
                ['as:a1->s1', 'as:a1->s2', 'st:s1->postgres.query', 'st:s2->github.create_issue'].sort()
            )
        })

        it('buckets counts and success/error by row age across the 1m / 5m / 1h windows', async () => {
            const snapshot = await computeSnapshot(buildDataSource())

            const busy = find(snapshot.edges, (e) => e.id === 'as:a1->s1')
            // All four calls are within seconds, so they fall into every window.
            expect(busy.stats['1m']).toMatchObject({ count: 4, successCount: 3, errorCount: 1 })
            expect(busy.stats['5m'].count).toBe(4)
            expect(busy.stats['1h'].count).toBe(4)

            const stale = find(snapshot.edges, (e) => e.id === 'as:a1->s2')
            // The single call is 10 minutes old: out of 1m and 5m, inside 1h.
            expect(stale.stats['1m'].count).toBe(0)
            expect(stale.stats['5m'].count).toBe(0)
            expect(stale.stats['1h'].count).toBe(1)
        })

        it('computes nearest-rank p50 / p95 latency in-process', async () => {
            const snapshot = await computeSnapshot(buildDataSource())
            const busy = find(snapshot.edges, (e) => e.id === 'as:a1->s1')
            // durations sorted: [10, 30, 50, 100] -> p50 = 30, p95 = 100.
            expect(busy.stats['1m'].p50Ms).toBe(30)
            expect(busy.stats['1m'].p95Ms).toBe(100)
        })

        it('keeps at most three recent invocations, newest first', async () => {
            const ds = buildDataSource()
            const snapshot = await computeSnapshot(ds)
            const busy = find(snapshot.edges, (e) => e.id === 'as:a1->s1')
            expect(busy.recent).toHaveLength(3)
            expect(busy.recent.map((r: any) => r.callId)).toEqual(['c1', 'c2', 'c3'])
            expect(busy.recent[0].createdDate).toBe(ds.rows[0].createdDate.toISOString())
        })

        it('reports configured-but-unused tools and skips agents with an empty allowedTools list', async () => {
            const snapshot = await computeSnapshot(buildDataSource())
            expect(snapshot.deltas.configuredButUnused).toEqual([{ agentId: 'a1', agentSlug: 'agent-one', namespacedTool: 'slack.post' }])
        })

        it('returns an empty-but-valid snapshot when there is no recent traffic', async () => {
            const snapshot = await computeSnapshot(buildDataSource([], []))
            expect(snapshot.nodes).toEqual([])
            expect(snapshot.edges).toEqual([])
            expect(snapshot.deltas.configuredButUnused).toEqual([])
            expect(snapshot.windows).toEqual(['1m', '5m', '1h'])
        })

        it('scopes the audit query to one agent when an agentId filter is given', async () => {
            const ds = buildDataSource()
            await computeSnapshot(ds, { agentId: 'a1' })
            expect(ds.qb.andWhere).toHaveBeenCalledWith('audit.agentId = :agentId', { agentId: 'a1' })
            expect(ds.agentRepo.find).toHaveBeenCalledWith(expect.objectContaining({ where: { enabled: true, id: 'a1' } }))
        })
    })
}
