# Coverage Improvement Plan

## Progress Update (Latest - Session 2)
| Metric | Before | Current | Change | Status |
|--------|--------|---------|--------|--------|
| Statements | 27.31% | **33.46%** | +6.15% | |
| **Branches** | 9.19% | **15.09%** | +5.90% | ⚠️ Need +4.91% |
| **Functions** | 17.23% | **27.36%** | +10.13% | ✅ Achieved! |
| Lines | 27.32% | **33.70%** | +6.38% | |

**Functions exceeds 20% threshold!** ✅
**Branches at 15.09%** - still needs improvement to reach 20% (gap: 4.91%)

### Tests Added
- **Original:** 315 tests
- **Current:** 614 tests (+299 tests)
- **New test files:** 25+ route/utility test files

### Latest Improvements (This Session)
- Expanded chat-messages.route.test.ts with 25+ new tests covering:
  - All filter parameters (chatType, sortOrder, chatId, memoryType, sessionId, messageId)
  - Date filtering (startDate, endDate, combined)
  - Feedback filtering (feedback flag, feedbackType filters)
  - Pagination with various params
  - Delete operations with different filters
  - Internal chat message endpoints
- Expanded apikey.route.test.ts with pagination, import/export tests
- Expanded feedback.route.test.ts with rating filters, fetch-feedback endpoint
- Expanded credentials.route.test.ts with CRUD and pagination tests
- Expanded documentstore.route.test.ts with chunks, loaders, upsert endpoints

### Key Branch Coverage Wins
- `getChatMessage.ts`: 12.04% → **56.62%** (+44.58%)
- Route tests now trigger many more conditional paths

### New Test Files Created
**Route Tests:**
- settings.route.test.ts, versions.route.test.ts, stats.route.test.ts
- prompts-lists.route.test.ts, nodes.route.test.ts, tools.route.test.ts
- variables.route.test.ts, credentials.route.test.ts, apikey.route.test.ts
- feedback.route.test.ts, executions.route.test.ts, chat-messages.route.test.ts
- documentstore.route.test.ts, upsert-history.route.test.ts, marketplaces.route.test.ts
- chatflows-extended.route.test.ts, assistants.route.test.ts, flow-config.route.test.ts
- internal-predictions.route.test.ts

**Utility Tests:**
- pagination.util.test.ts, telemetry.util.test.ts
- fileValidation.util.test.ts, logger.util.test.ts
- validateKey.util.test.ts, rateLimit.util.test.ts

### Remaining Work for 20% Branch Coverage
Branch coverage requires testing conditional paths (if/else, switch, ternary). Current gap: **5.66%**

**Challenges:**
- Integration tests hit happy paths but miss some error branches
- Module-level code (logger.ts, etc.) executes on import with fixed env
- Service tests with mocks conflict with running server context (need separate jest config)

**Strategies to continue:**
1. Continue expanding route tests to trigger more conditional paths
2. Test error handlers in controllers via invalid request bodies
3. Add more route tests that trigger validation errors (400/412 responses)
4. Consider adding a separate jest config for unit tests with mocks
5. Focus on smaller utility files with conditional logic

---

## buildAgentflow.ts Analysis

**File:** `src/utils/buildAgentflow.ts`
**Total branches:** 341 (largest opportunity in codebase)
**Current branch coverage:** 11.72%

### What's Covered
The utility functions exported from buildAgentflow.ts are well-tested (34.72% function coverage):
- `parseFormStringToJson` - ✅ 17 tests covering edge cases
- `combineNodeInputs` - ✅ 16 tests with edge cases
- `getNodeInputConnections` - ✅ 8 tests
- `setupNodeDependencies` - ✅ 7 tests
- `findConditionParent` - ✅ 10 tests
- `hasReceivedRequiredInputs` - ✅ 8 tests
- `determineNodesToIgnore` - ✅ 11 tests
- `checkForMultipleStartNodes` - ✅ 7 tests

### What's NOT Covered (Lines 164-2329)
The main execution functions have 0% coverage because they require:
1. Full chatflow/agentflow setup with database entities
2. Component node initialization
3. Complex async execution chains

**Uncovered major functions:**
- `executeAgentFlow()` - Main execution entry point
- `processNode()` - Individual node processing
- `handleNodeOutput()` - Output routing
- `buildAgentResult()` - Result compilation
- `handleLoopIteration()` - Loop logic
- Various error handling paths

### Impact Assessment
Testing the main execution paths would require:
- Creating real chatflow entities with proper node configurations
- Mocking external dependencies (LLM calls, API calls)
- Complex test setup that may not be worth the effort

**Recommendation:** Focus coverage efforts on smaller, more testable files rather than the complex execution engine. The utility functions in buildAgentflow.ts already have good coverage for their branches.

## Original Status
- **Statements:** 27.31%
- **Branches:** 9.19% ⚠️ (under 20% threshold)
- **Functions:** 17.23% ⚠️ (under 20% threshold)
- **Lines:** 27.32%

## Goals
- Increase Branch coverage from 9.19% → 20% (+10.81%)
- Increase Function coverage from 17.23% → 20% (+2.77%)

## Strategy
Focus on small/medium services with 0% branch and function coverage that are easy to test. Prioritize files with simple CRUD operations and minimal external dependencies.

---

## Phase 1: Quick Wins (Low-Hanging Fruit)

### Target Services (Simple CRUD with 0% function coverage)

| Service | Current Branch | Current Function | Priority |
|---------|---------------|------------------|----------|
| `src/services/leads/index.ts` | 0% | 0% | High |
| `src/services/settings/index.ts` | 0% | 0% | High |
| `src/services/versions/index.ts` | 0% | 0% | High |
| `src/services/vectors/index.ts` | 0% | 0% | High |
| `src/services/prompts-lists/index.ts` | 0% | 0% | High |
| `src/services/flow-configs/index.ts` | 0% | 0% | High |
| `src/services/predictions/index.ts` | 0% | 0% | Medium |
| `src/services/stats/index.ts` | 0% | 0% | Medium |
| `src/services/upsert-history/index.ts` | 0% | 0% | Medium |

**Estimated Impact:** Each service test file covering basic CRUD adds ~0.3-0.5% to function coverage.

---

## Phase 2: Medium Complexity Services

| Service | Current Branch | Current Function | Notes |
|---------|---------------|------------------|-------|
| `src/services/feedback/index.ts` | 100% (branch) | 0% | Just needs function calls |
| `src/services/load-prompts/index.ts` | 100% (branch) | 0% | Just needs function calls |
| `src/services/node-configs/index.ts` | 100% (branch) | 0% | Just needs function calls |
| `src/services/log/index.ts` | 0% | 0% | Medium |
| `src/services/executions/index.ts` | 0% | 0% | Medium |
| `src/services/evaluator/index.ts` | 0% | 0% | Medium |

---

## Phase 3: Utility Files (Branch Coverage Focus)

These utilities have conditionals that will boost branch coverage:

| Utility | Current Branch | Current Function | Notes |
|---------|---------------|------------------|-------|
| `src/utils/domainValidation.ts` | 46.15% | 60% | Add edge cases |
| `src/utils/telemetry.ts` | 30% | 100% | Add branch coverage |
| `src/utils/validateKey.ts` | 19.04% | 50% | Add error cases |
| `src/utils/rateLimit.ts` | 5.47% | 58.33% | Add config scenarios |
| `src/utils/fileValidation.ts` | 100% | 0% | Call existing functions |

---

## Implementation Plan

### Step 1: Create Test File Structure
Create test files for Phase 1 services:
- `test/services/leads.service.test.ts`
- `test/services/settings.service.test.ts`
- `test/services/versions.service.test.ts`
- `test/services/vectors.service.test.ts`
- `test/services/prompts-lists.service.test.ts`
- `test/services/flow-configs.service.test.ts`

### Step 2: Add Basic Tests (Per Service)
For each service, test:
1. All exported functions (at minimum call each once)
2. Happy path scenarios
3. Error handling paths (boosts branch coverage)
4. Edge cases (empty inputs, null checks)

### Step 3: Add Utility Tests
Add edge case tests to existing utility files:
- `test/utils/domainValidation.util.test.ts` (expand)
- `test/utils/validateKey.util.test.ts` (add)
- `test/utils/telemetry.util.test.ts` (add)

---

## Test Template Pattern

```typescript
/**
 * Service Test Template
 */
import { getDataSource } from '../../src/DataSource'
import { ServiceName } from '../../src/services/service-name'

jest.mock('../../src/DataSource')

describe('ServiceName', () => {
    let service: ServiceName
    let mockRepository: any
    let mockQueryBuilder: any

    beforeEach(() => {
        jest.clearAllMocks()

        mockQueryBuilder = {
            select: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            andWhere: jest.fn().mockReturnThis(),
            orderBy: jest.fn().mockReturnThis(),
            getMany: jest.fn().mockResolvedValue([]),
            getOne: jest.fn().mockResolvedValue(null),
            getManyAndCount: jest.fn().mockResolvedValue([[], 0])
        }

        mockRepository = {
            find: jest.fn().mockResolvedValue([]),
            findOne: jest.fn().mockResolvedValue(null),
            findOneBy: jest.fn().mockResolvedValue(null),
            save: jest.fn().mockImplementation(e => Promise.resolve(e)),
            create: jest.fn().mockImplementation(e => e),
            delete: jest.fn().mockResolvedValue({ affected: 1 }),
            createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder)
        }

        ;(getDataSource as jest.Mock).mockReturnValue({
            getRepository: jest.fn().mockReturnValue(mockRepository)
        })

        service = new ServiceName()
    })

    describe('methodName', () => {
        it('should handle success case', async () => {
            // Arrange
            mockRepository.find.mockResolvedValue([{ id: '1' }])

            // Act
            const result = await service.methodName()

            // Assert
            expect(result).toBeDefined()
        })

        it('should handle error case', async () => {
            // Test error branches
            mockRepository.find.mockRejectedValue(new Error('DB Error'))

            await expect(service.methodName()).rejects.toThrow('DB Error')
        })
    })
})
```

---

## Priority Order for Maximum Impact

1. **leads.service.test.ts** - Small service, 3-4 functions
2. **settings.service.test.ts** - Small service, 2-3 functions
3. **versions.service.test.ts** - Small service, 3-4 functions
4. **flow-configs.service.test.ts** - Small service, 2-3 functions
5. **prompts-lists.service.test.ts** - Small service, 1-2 functions
6. **vectors.service.test.ts** - Small service, 1-2 functions
7. Add branch tests to existing utility tests

---

## Expected Results After Implementation

| Metric | Before | After (Est.) |
|--------|--------|--------------|
| Branches | 9.19% | ~20-22% |
| Functions | 17.23% | ~22-25% |
| Statements | 27.31% | ~32-35% |

---

## Commands to Verify Progress

```bash
# Run coverage report
cd chronos_app/packages/server
pnpm test:coverage

# Run specific test file
pnpm test -- test/services/leads.service.test.ts

# Run lint
cd chronos_app
pnpm lint
```
