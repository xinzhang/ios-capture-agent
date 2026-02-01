# Testing Guide

## Test Setup

This project uses:
- **Vitest** - Test runner (built on Vite)
- **React Testing Library** - Component testing
- **jsdom** - DOM simulation

## Running Tests

```bash
# Watch mode (interactive)
npm test

# Run once
npm run test:run

# UI mode (if @vitest/ui installed)
npm run test:ui
```

## Test Files

### 1. Store Tests (`src/renderer/store/captureSession.test.ts`)
**Tests**: 7 tests
**What it covers**:
- Window selection
- Recording state (start, stop, pause, resume)
- Preview management
- Capture management (add, clear)

**Why these matter**: These tests verify the core state management. If you change the store structure, these tests will catch it.

### 2. Component Tests (`src/renderer/components/Controls.test.tsx`)
**Tests**: 11 tests
**What it covers**:
- Window dropdown rendering
- Window selection interaction
- Recording button states (enabled/disabled)
- Recording button clicks
- Change Region button visibility

**Why these matter**: These tests verify UI interactions. If you change component structure or props, these tests will catch it.

### 3. Integration Tests (`src/renderer/test/ipc.test.ts`)
**Tests**: 21 tests
**What it covers**:
- IPC method existence
- IPC method signatures
- IPC event listeners
- Recording flow integration
- Error handling

**Why these matter**: These tests verify the IPC bridge between main and renderer. If you add/modify IPC methods, these tests will catch it.

## What These Tests Will Catch

When you add new features, these tests will catch:
- ✅ Breaking changes to store state structure
- ✅ Missing/removed IPC methods
- ✅ Changed component props
- ✅ State management bugs
- ✅ IPC bridge integration issues

## What These Tests Won't Catch

- ❌ Actual screen capture (requires real screen)
- ❌ Real OCR processing (requires Tesseract)
- ❌ Real window detection (requires macOS)
- ❌ Visual regressions (use manual testing or E2E)

## Adding New Tests

### Adding a Store Test
```typescript
// src/renderer/store/captureSession.test.ts
it('should do something new', () => {
  const state = useCaptureSession.getState();
  // Test your new functionality
  expect(state.something).toBe(expected);
});
```

### Adding a Component Test
```typescript
// src/renderer/components/YourComponent.test.tsx
import { render, screen } from '@testing-library/react';
import YourComponent from './YourComponent';

it('should render something', () => {
  render(<YourComponent />);
  expect(screen.getByText('Something')).toBeInTheDocument();
});
```

### Adding an IPC Test
```typescript
// src/renderer/test/ipc.test.ts
it('should expose newMethod', () => {
  expect(typeof window.electron.newMethod).toBe('function');
});
```

## CI/CD Integration

Add to your `.github/workflows/test.yml`:

```yaml
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm install
      - run: npm run test:run
```

## Test Coverage

Current coverage:
- Store: Core state management
- Components: UI interactions
- IPC: Bridge between main/renderer

**Total: 39 tests across 3 test files**

## Tips

1. **Run tests before committing**: `npm run test:run`
2. **Watch mode during development**: `npm test`
3. **Keep tests simple**: Test behavior, not implementation
4. **Mock external dependencies**: Don't test screenshot-desktop or Tesseract directly
5. **Update tests when changing APIs**: If you add a new IPC method, test for it
