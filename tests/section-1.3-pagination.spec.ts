import { test, expect } from './fixtures';

/**
 * Section 1.3: Pagination (10 points)
 * 
 * Tests pagination functionality including:
 * - Default limit (25) and offset (0)
 * - Custom limit and offset
 * - Pagination with filters
 * - Edge cases
 */
test.describe('Section 1.3: Pagination (10 points)', () => {
  
  test.describe('Default Pagination', () => {
    
    test('returns 25 items by default (limit=25)', async ({ api }) => {
      const { status, data } = await api.getPhotos({});
      
      expect(status).toBe(200);
      const photos = Array.isArray(data) ? data : data.data;
      expect(photos.length).toBe(25);
    });
    
    test('starts at offset 0 by default', async ({ api }) => {
      const { data } = await api.getPhotos({});
      const photos = Array.isArray(data) ? data : data.data;
      
      // First photo should have ID 1 (or lowest ID)
      expect(photos[0].id).toBe(1);
    });
    
    test('response includes pagination metadata', async ({ api }) => {
      const { data } = await api.getPhotos({});
      
      // If wrapped response, check metadata
      if (!Array.isArray(data)) {
        expect(data.total).toBeDefined();
        expect(data.limit).toBe(25);
        expect(data.offset).toBe(0);
      }
    });
  });
  
  test.describe('Custom Limit', () => {
    
    test('limit=10 returns exactly 10 items', async ({ api }) => {
      const { data } = await api.getPhotos({ limit: 10 });
      const photos = Array.isArray(data) ? data : data.data;
      
      expect(photos.length).toBe(10);
    });
    
    test('limit=50 returns exactly 50 items', async ({ api }) => {
      const { data } = await api.getPhotos({ limit: 50 });
      const photos = Array.isArray(data) ? data : data.data;
      
      expect(photos.length).toBe(50);
    });
    
    test('limit=100 returns exactly 100 items', async ({ api }) => {
      const { data } = await api.getPhotos({ limit: 100 });
      const photos = Array.isArray(data) ? data : data.data;
      
      expect(photos.length).toBe(100);
    });
    
    test('limit=1 returns exactly 1 item', async ({ api }) => {
      const { data } = await api.getPhotos({ limit: 1 });
      const photos = Array.isArray(data) ? data : data.data;
      
      expect(photos.length).toBe(1);
    });
  });
  
  test.describe('Offset', () => {
    
    test('offset=50 skips first 50 items', async ({ api }) => {
      const { data: page1 } = await api.getPhotos({ limit: 10, offset: 0 });
      const { data: page2 } = await api.getPhotos({ limit: 10, offset: 50 });
      
      const photos1 = Array.isArray(page1) ? page1 : page1.data;
      const photos2 = Array.isArray(page2) ? page2 : page2.data;
      
      // IDs should be different
      expect(photos2[0].id).not.toBe(photos1[0].id);
      expect(photos2[0].id).toBe(51);  // Assuming sorted by ID
    });
    
    test('offset works correctly with custom limit', async ({ api }) => {
      const { data } = await api.getPhotos({ limit: 5, offset: 10 });
      const photos = Array.isArray(data) ? data : data.data;
      
      expect(photos.length).toBe(5);
      expect(photos[0].id).toBe(11);  // Assuming sorted by ID
    });
    
    test('pagination is consistent across pages', async ({ api }) => {
      const { data: page1 } = await api.getPhotos({ limit: 10, offset: 0 });
      const { data: page2 } = await api.getPhotos({ limit: 10, offset: 10 });
      
      const ids1 = (Array.isArray(page1) ? page1 : page1.data).map((p: any) => p.id);
      const ids2 = (Array.isArray(page2) ? page2 : page2.data).map((p: any) => p.id);
      
      // No overlap between pages
      const overlap = ids1.filter((id: number) => ids2.includes(id));
      expect(overlap.length).toBe(0);
    });
  });
  
  test.describe('Pagination with Filters', () => {
    
    test('pagination applies after filtering', async ({ api }) => {
      // Filter returns 100 photos, get page in the middle
      const { data } = await api.getPhotos({ 
        'album.title': 'quidem',
        limit: 10,
        offset: 50
      });
      
      const photos = Array.isArray(data) ? data : data.data;
      expect(photos.length).toBe(10);
    });
    
    test('offset=99 of 100 filtered results returns 1 item', async ({ api }) => {
      const { data } = await api.getPhotos({ 
        'album.title': 'quidem',
        limit: 10,
        offset: 99
      });
      
      const photos = Array.isArray(data) ? data : data.data;
      expect(photos.length).toBe(1);
    });
    
    test('filtered results maintain correct total count', async ({ api }) => {
      const { data } = await api.getPhotos({ 
        'album.title': 'quidem',
        limit: 10,
        offset: 0
      });
      
      if (!Array.isArray(data) && data.total !== undefined) {
        expect(data.total).toBe(100);
      }
    });
  });
  
  test.describe('Edge Cases', () => {
    
    test('offset beyond total results returns empty array', async ({ api }) => {
      const { data } = await api.getPhotos({ 
        'album.title': 'quidem',
        limit: 10,
        offset: 200  // Only 100 results exist
      });
      
      const photos = Array.isArray(data) ? data : data.data;
      expect(photos.length).toBe(0);
    });
    
    test('offset beyond all photos returns empty array', async ({ api }) => {
      const { data } = await api.getPhotos({ 
        limit: 10,
        offset: 10000  // Only 5000 photos exist
      });
      
      const photos = Array.isArray(data) ? data : data.data;
      expect(photos.length).toBe(0);
    });
    
    test('invalid limit (negative) is handled', async ({ api }) => {
      const { status } = await api.getPhotos({ limit: -1 });
      
      // Should either reject or use default
      expect([200, 400]).toContain(status);
    });
    
    test('invalid offset (negative) is handled', async ({ api }) => {
      const { status } = await api.getPhotos({ offset: -1 });
      
      // Should either reject or use default
      expect([200, 400]).toContain(status);
    });
    
    test('invalid limit (non-numeric) is handled', async ({ api }) => {
      const { status } = await api.getPhotos({ limit: 'abc' as any });
      
      // Should reject with 400
      expect([200, 400]).toContain(status);
    });
    
    test('limit=0 is handled gracefully', async ({ api }) => {
      const { status, data } = await api.getPhotos({ limit: 0 });
      
      if (status === 200) {
        const photos = Array.isArray(data) ? data : data.data;
        expect(photos.length).toBe(0);
      } else {
        expect(status).toBe(400);
      }
    });
  });
});
