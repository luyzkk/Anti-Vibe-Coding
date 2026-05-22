---
title: "Testing Patterns"
source_url: "https://bun.sh/docs/cli/test"
last_verified: "2026-05-22"
---

# Testing Patterns

Quick reference for testing patterns in Bun/TypeScript projects. Use alongside the `test-driven-development` skill.

## Table of Contents

- [Test Structure (Arrange-Act-Assert)](#test-structure-arrange-act-assert)
- [Test Naming Conventions](#test-naming-conventions)
- [Common Assertions](#common-assertions)
- [Mocking Patterns (Bun)](#mocking-patterns-bun)
- [Async Testing](#async-testing)
- [Integration Testing](#integration-testing)
- [Test Anti-Patterns](#test-anti-patterns)

## Test Structure (Arrange-Act-Assert)

```typescript
import { describe, it, expect } from 'bun:test';

describe('createTask', () => {
  it('creates a task with default pending status', () => {
    // Arrange: set up test data and preconditions
    const input = { title: 'Test Task', priority: 'high' };

    // Act: perform the action being tested
    const result = createTask(input);

    // Assert: verify the outcome
    expect(result.title).toBe('Test Task');
    expect(result.priority).toBe('high');
    expect(result.status).toBe('pending');
  });
});
```

- [ ] Each test has exactly one Arrange, one Act, one Assert block
- [ ] No logic in Assert block (no `if`, no loops)
- [ ] Arrange sets up ONLY what the test needs

## Test Naming Conventions

```typescript
// Pattern: [expected behavior] [when condition]
describe('TaskService.createTask', () => {
  it('creates a task with default pending status', () => {});
  it('throws ValidationError when title is empty', () => {});
  it('trims whitespace from title', () => {});
  it('generates a unique ID for each task', () => {});
  it('returns error when caller is unauthorized', () => {});
});
```

- [ ] Test names use descriptive verbs — never start with "should"
- [ ] Name describes the expected behavior, not the implementation
- [ ] `describe` block names the unit under test (class, function, module)

## Common Assertions

```typescript
import { expect } from 'bun:test';

// Equality
expect(result).toBe(expected);           // Strict equality (===)
expect(result).toEqual(expected);        // Deep equality (objects/arrays)
expect(result).toStrictEqual(expected);  // Deep equality + type matching

// Truthiness
expect(result).toBeTruthy();
expect(result).toBeFalsy();
expect(result).toBeNull();
expect(result).toBeDefined();
expect(result).toBeUndefined();

// Numbers
expect(result).toBeGreaterThan(5);
expect(result).toBeLessThanOrEqual(10);
expect(result).toBeCloseTo(0.3, 5);      // Floating point

// Strings
expect(result).toMatch(/pattern/);
expect(result).toContain('substring');

// Arrays / Objects
expect(array).toContain(item);
expect(array).toHaveLength(3);
expect(object).toHaveProperty('key', 'value');

// Errors
expect(() => fn()).toThrow();
expect(() => fn()).toThrow(ValidationError);
expect(() => fn()).toThrow('specific message');

// Async
await expect(asyncFn()).resolves.toBe(value);
await expect(asyncFn()).rejects.toThrow(Error);
```

## Mocking Patterns (Bun)

### Mock Functions

```typescript
import { jest, expect } from 'bun:test';

// Bun exposes jest-compatible mock API via bun:test
const mockFn = jest.fn();
mockFn.mockReturnValue(42);
mockFn.mockResolvedValue({ data: 'test' });
mockFn.mockImplementation((x: number) => x * 2);

expect(mockFn).toHaveBeenCalled();
expect(mockFn).toHaveBeenCalledWith('arg1', 'arg2');
expect(mockFn).toHaveBeenCalledTimes(3);
```

### Mock Modules (Bun)

```typescript
import { mock } from 'bun:test';

// Mock an entire module (use mock.module, not jest.mock)
mock.module('./database', () => ({
  query: jest.fn().mockResolvedValue([{ id: 1, title: 'Test' }]),
}));

// Spy on a specific method
import * as utils from './utils';
const spy = jest.spyOn(utils, 'generateId').mockReturnValue('test-id');
```

- [ ] Module-level `jest.mock()` is NOT supported in Bun — use `mock.module()` instead
- [ ] Reset mocks between tests with `jest.clearAllMocks()` in `beforeEach`

### Mock at Boundaries Only

```
Mock these:                    Do not mock these:
├── Database calls             ├── Internal utility functions
├── HTTP requests              ├── Business logic
├── File system operations     ├── Data transformations
├── External API calls         ├── Validation functions
└── Time/Date (when needed)    └── Pure functions
```

- [ ] Mocks only exist at I/O boundaries (network, disk, time, external services)
- [ ] No mocking of internal functions — if it hurts, the design needs fixing

## Async Testing

```typescript
import { describe, it, expect } from 'bun:test';

describe('fetchUser', () => {
  it('returns user data for valid ID', async () => {
    const user = await fetchUser('user-123');
    expect(user.id).toBe('user-123');
  });

  it('throws NotFoundError for unknown ID', async () => {
    await expect(fetchUser('nonexistent')).rejects.toThrow('NotFoundError');
  });
});
```

- [ ] Always `await` async operations — never let promises float
- [ ] Test both success and error paths for async functions
- [ ] Use `rejects.toThrow` for expected errors, not try/catch

## Integration Testing

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'bun:test';

describe('POST /api/tasks', () => {
  it('creates a task and returns 201', async () => {
    const response = await fetch('http://localhost:3000/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${testToken}` },
      body: JSON.stringify({ title: 'Test Task' }),
    });

    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body).toMatchObject({ title: 'Test Task', status: 'pending' });
  });

  it('returns 401 without authentication', async () => {
    const response = await fetch('http://localhost:3000/api/tasks', {
      method: 'POST',
      body: JSON.stringify({ title: 'Test' }),
    });
    expect(response.status).toBe(401);
  });
});
```

- [ ] Fixtures are deterministic and reproducible (no random data in setup)
- [ ] Each test cleans up after itself (use `afterEach` or transactions)
- [ ] Test auth failure, validation failure, and success paths

## Test Anti-Patterns

| Anti-Pattern | Problem | Better Approach |
|---|---|---|
| Names starting with "should" | Passive, unclear behavior | Use active verbs: "returns", "throws", "emits" |
| Testing implementation details | Breaks on refactor without real bugs | Test inputs and outputs |
| Snapshot everything | No one reviews snapshot diffs | Assert specific values |
| Shared mutable state | Tests pollute each other | Setup/teardown per test |
| Testing third-party code | Not your bug to own | Mock the boundary |
| `test.skip` permanently | Dead code in the repo | Fix or delete the test |
| Overly broad assertions | Misses regressions | Be specific |
| Floating promises | Swallowed errors, false passes | Always `await` async tests |
| Using `jest.mock()` in Bun | Module-level mock not supported | Use `mock.module()` from `bun:test` |
