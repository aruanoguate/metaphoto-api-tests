import { test as base } from '@playwright/test';
import { metricsCollector } from './metrics';

/**
 * Shared types for API responses
 */
export interface User {
  id: number;
  name: string;
  username: string;
  email: string;
  address: {
    street: string;
    suite: string;
    city: string;
    zipcode: string;
    geo: { lat: string; lng: string };
  };
  phone: string;
  website: string;
  company: {
    name: string;
    catchPhrase: string;
    bs: string;
  };
}

export interface Album {
  id: number;
  title: string;
  loweredCaseTitle?: string;
  user: User | null;
}

export interface EnrichedPhoto {
  id: number;
  title: string;
  loweredCaseTitle?: string;
  url: string;
  thumbnailUrl: string;
  albumId?: number;  // Should be removed in clean responses
  album: Album | null;
}

export interface PhotosResponse {
  total: number;
  limit: number;
  offset: number;
  data: EnrichedPhoto[];
}

/**
 * Custom test fixture that provides API helpers
 */
export const test = base.extend<{
  apiPath: string;
  api: {
    getPhoto: (id: number | string) => Promise<{ status: number; data: EnrichedPhoto | null }>;
    getPhotos: (params?: Record<string, string | number>) => Promise<{ status: number; data: PhotosResponse | EnrichedPhoto[] | null }>;
    getPhotoCount: (params?: Record<string, string | number>) => Promise<number>;
    getPhotoIds: (params?: Record<string, string | number>) => Promise<number[]>;
  };
}>({
  // Provide API path from environment
  apiPath: async ({}, use) => {
    const path = process.env.API_PATH || '/v1/api/photos';
    await use(path);
  },
  
  // Provide API helper methods with metrics collection
  api: async ({ request, apiPath }, use) => {
    const api = {
      async getPhoto(id: number | string) {
        const endpoint = `GET ${apiPath}/:id`;
        const startTime = Date.now();
        const response = await request.get(`${apiPath}/${id}`);
        const duration = Date.now() - startTime;
        
        let data = null;
        try {
          data = await response.json();
        } catch {
          // Non-JSON response - data remains null
        }
        
        metricsCollector.record({
          endpoint,
          method: 'GET',
          statusCode: response.status(),
          duration,
          success: response.ok(),
        });
        
        return { status: response.status(), data };
      },
      
      async getPhotos(params: Record<string, string | number> = {}) {
        const searchParams = new URLSearchParams();
        for (const [key, value] of Object.entries(params)) {
          searchParams.set(key, String(value));
        }
        const url = searchParams.toString() ? `${apiPath}?${searchParams}` : apiPath;
        const endpoint = searchParams.toString() ? `GET ${apiPath}?...` : `GET ${apiPath}`;
        
        const startTime = Date.now();
        const response = await request.get(url);
        const duration = Date.now() - startTime;
        
        let data = null;
        try {
          data = await response.json();
        } catch {
          // Non-JSON response - data remains null
        }
        
        metricsCollector.record({
          endpoint,
          method: 'GET',
          statusCode: response.status(),
          duration,
          success: response.ok(),
        });
        
        return { status: response.status(), data };
      },
      
      async getPhotoCount(params: Record<string, string | number> = {}) {
        const result = await this.getPhotos({ ...params, limit: 1000 });
        if (!result.data) return 0;
        if (result.data.total !== undefined) return result.data.total;
        if (Array.isArray(result.data)) return result.data.length;
        if (result.data.data) return result.data.data.length;
        return 0;
      },
      
      async getPhotoIds(params: Record<string, string | number> = {}) {
        const result = await this.getPhotos({ ...params, limit: 1000 });
        if (!result.data) return [];
        const photos = Array.isArray(result.data) ? result.data : (result.data.data || []);
        return photos.map((p: EnrichedPhoto) => p.id).sort((a: number, b: number) => a - b);
      },
    };
    
    await use(api);
  },
});

export { expect } from '@playwright/test';
