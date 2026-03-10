import { defineConfig } from '@playwright/test';

/**
 * Playwright configuration for MetaPhoto API testing.
 * 
 * Set the BASE_URL environment variable to test different API endpoints:
 *   BASE_URL=http://localhost:3001 npx playwright test
 *   BASE_URL=https://candidate-api.vercel.app npx playwright test
 */
export default defineConfig({
  testDir: './tests',
  
  // Run tests sequentially for clearer output
  fullyParallel: false,
  
  // Fail fast on CI
  forbidOnly: !!process.env.CI,
  
  // Retry failed tests on CI
  retries: process.env.CI ? 1 : 0,
  
  // Single worker for API tests (no browser overhead)
  workers: 1,
  
  // Reporter configuration
  reporter: [
    ['list'],
    ['html', { open: 'never' }],
    ['json', { outputFile: 'test-results/results.json' }],
    ['./metrics-reporter.ts']
  ],
  
  // Global timeout per test
  timeout: 30000,
  
  // Use projects to test different API endpoints
  projects: [
    {
      name: 'api-tests',
      use: {
        // Base URL from environment or default to localhost
        baseURL: process.env.BASE_URL || 'http://localhost:3001',
        
        // Extra HTTP headers
        extraHTTPHeaders: {
          'Accept': 'application/json',
        },
      },
    },
  ],
  
  // Global setup to detect API path
  globalSetup: './tests/global-setup.ts',
});
