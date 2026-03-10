import { FullConfig } from '@playwright/test';

/**
 * Global setup to detect the API path before running tests.
 * Stores the detected path in an environment variable for tests to use.
 */
async function globalSetup(config: FullConfig): Promise<void> {
  const baseURL = process.env.BASE_URL || 'http://localhost:3001';
  
  const paths = [
    '/v1/api/photos',
    '/externalapi/photos',
    '/api/photos',
    '/photos'
  ];
  
  console.log(`\n🔍 Detecting API path for ${baseURL}...`);
  
  for (const path of paths) {
    try {
      const response = await fetch(`${baseURL}${path}?limit=1`);
      if (response.ok) {
        const data = await response.json();
        if (data && (Array.isArray(data) || data.data)) {
          process.env.API_PATH = path;
          console.log(`✅ Detected API path: ${path}\n`);
          return;
        }
      }
    } catch (e) {
      // Continue to next path
    }
  }
  
  // Default fallback
  process.env.API_PATH = '/v1/api/photos';
  console.log(`⚠️  Could not detect API path, using default: /v1/api/photos\n`);
}

export default globalSetup;
