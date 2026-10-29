import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';
import { defineConfig } from 'vitest/config';

// jsdom is the only environment. Design-system assertions run at
// source-and-arithmetic level: jsdom does not apply Tailwind's compiled
// stylesheet, so nothing here may be presented as browser verification.
// No coverage provider on purpose: coverage is not a success criterion and
// it would add a dev dependency.
export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  test: { environment: 'jsdom', setupFiles: ['./vitest.setup.ts'] },
});
