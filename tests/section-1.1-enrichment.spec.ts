import { test, expect } from './fixtures';

/**
 * Section 1.1: Data Enrichment API (20 points)
 * 
 * Tests the single photo endpoint for proper data enrichment,
 * including nested album and user data.
 */
test.describe('Section 1.1: Data Enrichment API (20 points)', () => {
  
  test.describe('GET /photos/:id - Photo Enrichment', () => {
    
    test('returns enriched photo with correct base fields', async ({ api }) => {
      const { status, data } = await api.getPhoto(1);
      
      expect(status).toBe(200);
      expect(data).toBeDefined();
      expect(data.id).toBe(1);
      expect(data.title).toContain('accusamus beatae');
      expect(data.url).toContain('placeholder');
      expect(data.thumbnailUrl).toBeDefined();
    });
    
    test('includes nested album with correct id and title', async ({ api }) => {
      const { data } = await api.getPhoto(1);
      
      expect(data.album).toBeDefined();
      expect(data.album).toBeInstanceOf(Object);
      expect(data.album.id).toBe(1);
      expect(data.album.title).toBe('quidem molestiae enim');
    });
    
    test('includes nested user under album with complete data', async ({ api }) => {
      const { data } = await api.getPhoto(1);
      
      expect(data.album.user).toBeDefined();
      expect(data.album.user).toBeInstanceOf(Object);
      expect(data.album.user.id).toBe(1);
      expect(data.album.user.name).toBe('Leanne Graham');
      expect(data.album.user.email).toBe('Sincere@april.biz');
    });
    
    test('includes user address details', async ({ api }) => {
      const { data } = await api.getPhoto(1);
      const user = data.album.user;
      
      expect(user.address).toBeDefined();
      expect(user.address.street).toBe('Kulas Light');
      expect(user.address.city).toBe('Gwenborough');
      expect(user.address.geo).toBeDefined();
      expect(user.address.geo.lat).toBe('-37.3159');
    });
    
    test('includes user company details', async ({ api }) => {
      const { data } = await api.getPhoto(1);
      const user = data.album.user;
      
      expect(user.company).toBeDefined();
      expect(user.company.name).toBe('Romaguera-Crona');
      expect(user.company.catchPhrase).toBeDefined();
    });
    
    test('removes albumId from root level (clean response)', async ({ api }) => {
      const { data } = await api.getPhoto(1);
      
      // albumId should not be at root since album is nested
      expect(data.albumId).toBeUndefined();
    });
    
    test('works correctly for different photo IDs', async ({ api }) => {
      const { status, data } = await api.getPhoto(100);
      
      expect(status).toBe(200);
      expect(data.id).toBe(100);
      expect(data.album).toBeDefined();
      expect(data.album.user).toBeDefined();
    });
  });
  
  test.describe('Error Handling', () => {
    
    test('returns 404 for non-existent photo ID', async ({ api }) => {
      const { status, data } = await api.getPhoto(99999);
      
      expect(status).toBe(404);
      expect(data).toBeDefined();
      expect(data.error).toBeDefined();
    });
    
    test('returns 400 or 404 for non-numeric photo ID', async ({ api }) => {
      const { status } = await api.getPhoto('abc');
      
      // 400 is ideal, but 404 is acceptable
      expect([400, 404]).toContain(status);
    });
    
    test('returns 400 or 404 for negative photo ID', async ({ api }) => {
      const { status } = await api.getPhoto(-1);
      
      expect([400, 404]).toContain(status);
    });
  });
});
