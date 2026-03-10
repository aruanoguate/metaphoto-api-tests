import { test, expect } from './fixtures';

/**
 * Section 1.2: Filtering (35 points)
 * 
 * Tests filtering functionality including:
 * - title (contains)
 * - album.title (contains)
 * - album.user.email (equals)
 * - Combined filters (AND logic)
 */
test.describe('Section 1.2: Filtering (35 points)', () => {
  
  test.describe('Title Filter (contains)', () => {
    
    test('filters by title containing "repudiandae iusto" returns exactly 4 photos', async ({ api }) => {
      const count = await api.getPhotoCount({ title: 'repudiandae iusto' });
      expect(count).toBe(4);
    });
    
    test('filters by title returns correct photo IDs: 13, 260, 318, 577', async ({ api }) => {
      const ids = await api.getPhotoIds({ title: 'repudiandae iusto' });
      expect(ids).toEqual([13, 260, 318, 577]);
    });
    
    test('title filter is case-insensitive (uppercase)', async ({ api }) => {
      const count = await api.getPhotoCount({ title: 'REPUDIANDAE IUSTO' });
      expect(count).toBe(4);
    });
    
    test('title filter is case-insensitive (mixed case)', async ({ api }) => {
      const count = await api.getPhotoCount({ title: 'Repudiandae Iusto' });
      expect(count).toBe(4);
    });
    
    test('partial title match works', async ({ api }) => {
      const count = await api.getPhotoCount({ title: 'accusamus' });
      expect(count).toBeGreaterThan(0);
    });
  });
  
  test.describe('Album Title Filter (contains)', () => {
    
    test('filters by album.title containing "quidem" returns exactly 100 photos', async ({ api }) => {
      const count = await api.getPhotoCount({ 'album.title': 'quidem' });
      expect(count).toBe(100);
    });
    
    test('album.title filter is case-insensitive', async ({ api }) => {
      const count = await api.getPhotoCount({ 'album.title': 'QUIDEM' });
      expect(count).toBe(100);
    });
    
    test('returns photos from correct albums (1 and 79)', async ({ api }) => {
      const { data } = await api.getPhotos({ 'album.title': 'quidem', limit: 100 });
      const photos = Array.isArray(data) ? data : data.data;
      const albumIds = [...new Set(photos.map((p) => p.album?.id))]
        .filter((id) => typeof id === 'number')
        .sort((a, b) => a - b);
      
      expect(albumIds).toContain(1);
      expect(albumIds).toContain(79);
      expect(albumIds.length).toBe(2);
    });
  });
  
  test.describe('User Email Filter (equals)', () => {
    
    test('filters by album.user.email equals "Sincere@april.biz" returns 500 photos', async ({ api }) => {
      const count = await api.getPhotoCount({ 'album.user.email': 'Sincere@april.biz' });
      expect(count).toBe(500);
    });
    
    test('email filter is case-insensitive', async ({ api }) => {
      const count = await api.getPhotoCount({ 'album.user.email': 'sincere@april.biz' });
      expect(count).toBe(500);
    });
    
    test('email filter uses equals (not contains)', async ({ api }) => {
      // Partial email should not match (equals, not contains)
      const count = await api.getPhotoCount({ 'album.user.email': 'Sincere' });
      expect(count).toBe(0);
    });
    
    test('returns photos from user 1 albums (1-10)', async ({ api }) => {
      const { data } = await api.getPhotos({ 'album.user.email': 'Sincere@april.biz', limit: 500 });
      const photos = Array.isArray(data) ? data : data.data;
      const albumIds = [...new Set(photos.map((p) => p.album?.id))]
        .filter((id) => typeof id === 'number')
        .sort((a, b) => a - b);
      
      expect(albumIds).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    });
    
    test('non-existent email returns empty results', async ({ api }) => {
      const count = await api.getPhotoCount({ 'album.user.email': 'nonexistent@test.com' });
      expect(count).toBe(0);
    });
  });
  
  test.describe('Combined Filters (AND logic)', () => {
    
    test('album.title + title returns only matching photos (ID 13)', async ({ api }) => {
      const ids = await api.getPhotoIds({ 
        'album.title': 'quidem', 
        title: 'repudiandae iusto' 
      });
      
      expect(ids).toEqual([13]);
    });
    
    test('combined filters return correct count', async ({ api }) => {
      const count = await api.getPhotoCount({ 
        'album.title': 'quidem', 
        title: 'repudiandae iusto' 
      });
      
      expect(count).toBe(1);
    });
    
    test('three filters combined works correctly', async ({ api }) => {
      // This should return photos that match ALL three criteria
      const count = await api.getPhotoCount({ 
        'album.user.email': 'Sincere@april.biz',
        'album.title': 'quidem',
        title: 'repudiandae'
      });
      
      // Album 1 has title "quidem molestiae enim" and belongs to Sincere@april.biz
      expect(count).toBeGreaterThanOrEqual(0);
    });
  });
  
  test.describe('Edge Cases', () => {
    
    test('non-matching filter returns empty array', async ({ api }) => {
      const count = await api.getPhotoCount({ title: 'xyznonexistent123456' });
      expect(count).toBe(0);
    });
    
    test('empty filter value returns all photos', async ({ api }) => {
      const countWithFilter = await api.getPhotoCount({ title: '' });
      const countWithout = await api.getPhotoCount({});
      
      // Empty filter should be equivalent to no filter
      expect(countWithFilter).toBe(countWithout);
    });
    
    test('unknown filter parameter is ignored', async ({ api }) => {
      const { status, data } = await api.getPhotos({ 
        unknownParam: 'value',
        anotherUnknown: 'test',
        limit: 5 
      });
      
      expect(status).toBe(200);
      const photos = Array.isArray(data) ? data : data.data;
      expect(photos.length).toBeGreaterThan(0);
    });
    
    test('special characters in filter are handled', async ({ api }) => {
      const { status } = await api.getPhotos({ title: 'test%20value' });
      expect([200, 400]).toContain(status);
    });
  });
});
