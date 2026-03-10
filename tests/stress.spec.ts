import { test, expect } from './fixtures';

/**
 * STRESS TESTS - API Performance Under Load
 * 
 * These tests put pressure on the API to measure performance characteristics
 * under heavy load conditions. Unlike functional tests, these focus on:
 * - Concurrent request handling
 * - Response time degradation under load
 * - API stability and error rates
 * 
 * Run with: npx playwright test tests/stress.spec.ts
 * 
 * Note: Uses instrumentedRequest fixture to capture metrics for stress tests.
 */

test.describe('Stress Testing', () => {
  test.describe('Sequential Load', () => {
    test('rapid sequential requests to single photo endpoint', async ({ instrumentedRequest, apiPath }) => {
      const iterations = 50;
      const responses: number[] = [];
      
      for (let i = 0; i < iterations; i++) {
        const photoId = (i % 100) + 1; // Cycle through photos 1-100
        const { response, duration } = await instrumentedRequest.get(`${apiPath}/${photoId}`);
        responses.push(duration);
        expect(response.ok()).toBeTruthy();
      }
      
      const avg = responses.reduce((a, b) => a + b, 0) / responses.length;
      console.log(`    📊 Sequential single photo: ${iterations} requests, avg ${avg.toFixed(0)}ms`);
    });

    test('rapid sequential requests to list endpoint', async ({ instrumentedRequest, apiPath }) => {
      const iterations = 30;
      const responses: number[] = [];
      
      for (let i = 0; i < iterations; i++) {
        const { response, duration } = await instrumentedRequest.get(`${apiPath}?limit=25&offset=${i * 25}`);
        responses.push(duration);
        expect(response.ok()).toBeTruthy();
      }
      
      const avg = responses.reduce((a, b) => a + b, 0) / responses.length;
      console.log(`    📊 Sequential list: ${iterations} requests, avg ${avg.toFixed(0)}ms`);
    });

    test('rapid sequential filtered requests', async ({ instrumentedRequest, apiPath }) => {
      const filters = [
        'title=accusamus',
        'album.title=quidem',
        'album.user.email=Sincere@april.biz',
        'title=repudiandae',
        'album.title=omnis',
      ];
      const iterations = 40;
      const responses: number[] = [];
      
      for (let i = 0; i < iterations; i++) {
        const filter = filters[i % filters.length];
        const { response, duration } = await instrumentedRequest.get(`${apiPath}?${filter}&limit=25`);
        responses.push(duration);
        expect(response.ok()).toBeTruthy();
      }
      
      const avg = responses.reduce((a, b) => a + b, 0) / responses.length;
      console.log(`    📊 Sequential filtered: ${iterations} requests, avg ${avg.toFixed(0)}ms`);
    });
  });

  test.describe('Concurrent Load', () => {
    test('concurrent requests to different photo IDs', async ({ instrumentedRequest, apiPath }) => {
      const concurrency = 20;
      const photoIds = Array.from({ length: concurrency }, (_, i) => i + 1);
      
      const start = Date.now();
      const results = await Promise.all(
        photoIds.map(id => instrumentedRequest.get(`${apiPath}/${id}`))
      );
      const duration = Date.now() - start;
      
      const successful = results.filter(r => r.response.ok()).length;
      console.log(`    📊 Concurrent photos: ${concurrency} parallel, ${duration}ms total, ${successful}/${concurrency} success`);
      
      expect(successful).toBe(concurrency);
    });

    test('concurrent requests with different filters', async ({ instrumentedRequest, apiPath }) => {
      const filters = [
        'title=accusamus',
        'title=beatae',
        'title=repudiandae',
        'album.title=quidem',
        'album.title=omnis',
        'album.title=distinctio',
        'album.user.email=Sincere@april.biz',
        'album.user.email=Shanna@melissa.tv',
        'title=qui',
        'title=est',
      ];
      
      const start = Date.now();
      const results = await Promise.all(
        filters.map(filter => instrumentedRequest.get(`${apiPath}?${filter}&limit=10`))
      );
      const duration = Date.now() - start;
      
      const successful = results.filter(r => r.response.ok()).length;
      console.log(`    📊 Concurrent filters: ${filters.length} parallel, ${duration}ms total, ${successful}/${filters.length} success`);
      
      expect(successful).toBe(filters.length);
    });

    test('concurrent paginated requests', async ({ instrumentedRequest, apiPath }) => {
      const pages = Array.from({ length: 10 }, (_, i) => i * 50);
      
      const start = Date.now();
      const results = await Promise.all(
        pages.map(offset => instrumentedRequest.get(`${apiPath}?limit=50&offset=${offset}`))
      );
      const duration = Date.now() - start;
      
      const successful = results.filter(r => r.response.ok()).length;
      console.log(`    📊 Concurrent pages: ${pages.length} parallel, ${duration}ms total, ${successful}/${pages.length} success`);
      
      expect(successful).toBe(pages.length);
    });

    test('burst of 50 concurrent requests', async ({ instrumentedRequest, apiPath }) => {
      const burstSize = 50;
      const requests = Array.from({ length: burstSize }, (_, i) => ({
        type: i % 3,
        id: (i % 100) + 1,
        filter: ['title=qui', 'album.title=quidem', 'album.user.email=Sincere@april.biz'][i % 3],
      }));
      
      const start = Date.now();
      const results = await Promise.all(
        requests.map(req => {
          if (req.type === 0) {
            return instrumentedRequest.get(`${apiPath}/${req.id}`);
          } else if (req.type === 1) {
            return instrumentedRequest.get(`${apiPath}?${req.filter}&limit=10`);
          } else {
            return instrumentedRequest.get(`${apiPath}?limit=25&offset=${req.id}`);
          }
        })
      );
      const duration = Date.now() - start;
      
      const successful = results.filter(r => r.response.ok()).length;
      const avgPerRequest = duration / burstSize;
      console.log(`    📊 Burst load: ${burstSize} concurrent, ${duration}ms total, avg ${avgPerRequest.toFixed(0)}ms/req, ${successful}/${burstSize} success`);
      
      // Allow some failures under heavy load, but majority should succeed
      expect(successful).toBeGreaterThanOrEqual(burstSize * 0.9);
    });
  });

  test.describe('Sustained Load', () => {
    test('sustained load over 100 requests with mixed operations', async ({ instrumentedRequest, apiPath }) => {
      const totalRequests = 100;
      const batchSize = 10;
      const batches = totalRequests / batchSize;
      const allDurations: number[] = [];
      let totalSuccessful = 0;
      
      for (let batch = 0; batch < batches; batch++) {
        const start = Date.now();
        const results = await Promise.all(
          Array.from({ length: batchSize }, (_, i) => {
            const index = batch * batchSize + i;
            const photoId = (index % 100) + 1;
            
            // Mix of different request types
            switch (index % 4) {
              case 0: return instrumentedRequest.get(`${apiPath}/${photoId}`);
              case 1: return instrumentedRequest.get(`${apiPath}?limit=25&offset=${index}`);
              case 2: return instrumentedRequest.get(`${apiPath}?title=qui&limit=10`);
              default: return instrumentedRequest.get(`${apiPath}?album.title=quidem&limit=10`);
            }
          })
        );
        
        const batchDuration = Date.now() - start;
        allDurations.push(batchDuration);
        totalSuccessful += results.filter(r => r.response.ok()).length;
      }
      
      const avgBatch = allDurations.reduce((a, b) => a + b, 0) / batches;
      const minBatch = Math.min(...allDurations);
      const maxBatch = Math.max(...allDurations);
      
      console.log(`    📊 Sustained load: ${totalRequests} requests in ${batches} batches`);
      console.log(`       Batch times: avg ${avgBatch.toFixed(0)}ms, min ${minBatch}ms, max ${maxBatch}ms`);
      console.log(`       Success rate: ${totalSuccessful}/${totalRequests} (${((totalSuccessful/totalRequests)*100).toFixed(1)}%)`);
      
      expect(totalSuccessful).toBeGreaterThanOrEqual(totalRequests * 0.95);
    });

    test('large result set handling', async ({ instrumentedRequest, apiPath }) => {
      // Request all photos in one call
      const { response, duration } = await instrumentedRequest.get(`${apiPath}?limit=1000`);
      
      expect(response.ok()).toBeTruthy();
      const data = await response.json();
      const count = Array.isArray(data) ? data.length : (data.data?.length || 0);
      
      console.log(`    📊 Large result: ${count} photos in ${duration}ms`);
      expect(count).toBeGreaterThanOrEqual(100);
    });

    test('complex filter chain performance', async ({ instrumentedRequest, apiPath }) => {
      const iterations = 20;
      const responses: number[] = [];
      
      for (let i = 0; i < iterations; i++) {
        // Multiple filters combined
        const { response, duration } = await instrumentedRequest.get(`${apiPath}?title=qui&album.title=quidem&limit=50`);
        responses.push(duration);
        expect(response.ok()).toBeTruthy();
      }
      
      const avg = responses.reduce((a, b) => a + b, 0) / responses.length;
      const p95 = responses.sort((a, b) => a - b)[Math.ceil(responses.length * 0.95) - 1];
      console.log(`    📊 Complex filters: ${iterations} requests, avg ${avg.toFixed(0)}ms, P95 ${p95}ms`);
    });
  });

  test.describe('Edge Case Load', () => {
    test('empty result queries under load', async ({ instrumentedRequest, apiPath }) => {
      const iterations = 20;
      const responses: number[] = [];
      
      for (let i = 0; i < iterations; i++) {
        const { response, duration } = await instrumentedRequest.get(`${apiPath}?title=xyznonexistent12345&limit=25`);
        responses.push(duration);
        expect(response.ok()).toBeTruthy();
      }
      
      const avg = responses.reduce((a, b) => a + b, 0) / responses.length;
      console.log(`    📊 Empty results: ${iterations} requests, avg ${avg.toFixed(0)}ms`);
    });

    test('boundary pagination performance', async ({ instrumentedRequest, apiPath }) => {
      const offsets = [0, 100, 500, 1000, 2000, 4900, 4999];
      const durations: number[] = [];
      
      for (const offset of offsets) {
        const { response, duration } = await instrumentedRequest.get(`${apiPath}?limit=25&offset=${offset}`);
        durations.push(duration);
        expect(response.ok()).toBeTruthy();
      }
      
      const avg = durations.reduce((a, b) => a + b, 0) / durations.length;
      console.log(`    📊 Boundary pagination: ${offsets.length} offsets, avg ${avg.toFixed(0)}ms`);
      console.log(`       Offsets tested: ${offsets.join(', ')}`);
    });
  });
});
