import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// Vitest is not run with `globals: true`, so Testing Library cannot register
// its own auto-cleanup. Unmount explicitly between tests.
afterEach(() => {
  cleanup();
});
