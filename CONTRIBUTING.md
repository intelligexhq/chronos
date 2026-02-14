# Contributing to Chronos project

Thank you for your interest in contributing to Chronos application! This document outlines the standards and requirements for the community contributions.

## Getting Started

### Prerequisites

- Node.js ^24
- pnpm >=10

### Setup

```bash
cd chronos_app
pnpm install
```

## Running Tests

All tests must pass before submitting a pull request.

### Run All Tests

```bash
cd chronos_app
pnpm test
```

### Run Component Tests

```bash
pnpm test:components
```

### Run Server Tests

```bash
pnpm test:server
```

### Run Server Tests with Coverage

```bash
pnpm test:server -- --coverage
```

## Code Quality

### Linting

Run the linter to check for code style issues:

```bash
pnpm lint
```

Fix auto-fixable issues:

```bash
pnpm lint-fix
```

## Pull Request Requirements

Before your pull request can be merged, the following CI checks must pass:

1. **Lint** - All code must pass ESLint checks
2. **Component Tests** - All component package tests must pass
3. **Server Tests** - All server package tests must pass

A coverage report will be automatically posted to your pull request showing test coverage metrics.

### Coverage Thresholds

We aim to maintain good test coverage:

- Good: >=80%
- Acceptable: >=50%
- Needs improvement: <50%

## Submitting a Pull Request

1. Fork the repository
2. Create a feature branch from `main`
3. Make your changes
4. Ensure all tests pass locally
5. Ensure linting passes
6. Submit a pull request to `main`
