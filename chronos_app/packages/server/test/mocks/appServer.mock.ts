/**
 * Mock infrastructure for testing services that depend on getRunningExpressApp
 */

// Mock repository with common TypeORM methods
export const createMockRepository = () => ({
    find: jest.fn(),
    findOne: jest.fn(),
    findOneBy: jest.fn(),
    save: jest.fn(),
    create: jest.fn((entity: any) => entity),
    delete: jest.fn(),
    merge: jest.fn((target: any, source: any) => ({ ...target, ...source })),
    insert: jest.fn(),
    createQueryBuilder: jest.fn(() => createMockQueryBuilder())
})

// Mock query builder
export const createMockQueryBuilder = () => {
    const qb: any = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        offset: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        leftJoin: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        leftJoinAndMapOne: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
        getOne: jest.fn().mockResolvedValue(null),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
        getRawMany: jest.fn().mockResolvedValue([])
    }
    return qb
}

// Mock identity manager
export const createMockIdentityManager = (platformType: string = 'cloud') => ({
    getPlatformType: jest.fn().mockReturnValue(platformType)
})

// Mock telemetry
export const createMockTelemetry = () => ({
    sendTelemetry: jest.fn().mockResolvedValue(undefined)
})

// Create full mock app server
export const createMockAppServer = (overrides: any = {}) => {
    const repositories: { [key: string]: any } = {}

    return {
        AppDataSource: {
            getRepository: jest.fn((entity: any) => {
                const entityName = typeof entity === 'function' ? entity.name : entity
                if (!repositories[entityName]) {
                    repositories[entityName] = createMockRepository()
                }
                return repositories[entityName]
            })
        },
        identityManager: overrides.identityManager || createMockIdentityManager(),
        telemetry: overrides.telemetry || createMockTelemetry(),
        nodesPool: {
            componentNodes: {}
        },
        ...overrides
    }
}

// Helper to setup getRunningExpressApp mock
export const setupAppServerMock = (mockAppServer: any) => {
    jest.mock('../../src/utils/getRunningExpressApp', () => ({
        getRunningExpressApp: jest.fn(() => mockAppServer)
    }))
}
