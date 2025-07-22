import { streamingAPI } from './api';
import type { MediaItem } from './api';

class PrefetchService {
  private prefetchQueue = new Set<string>();
  private processing = false;

  constructor() {
    // Start prefetching after page load
    if (typeof window !== 'undefined') {
      window.addEventListener('load', () => {
        setTimeout(() => this.startInitialPrefetch(), 1000);
      });

      // Prefetch on hover
      this.setupHoverPrefetch();
    }
  }

  private async startInitialPrefetch(): Promise<void> {
    try {
      // Prefetch categories first
      const categories = await streamingAPI.fetchCategories();
      
      // Prefetch first few items of each category
      for (const category of categories.slice(0, 3)) {
        const items = category.items.slice(0, 3); // First 3 items only
        this.prefetchMediaData(items);
      }
    } catch (error) {
      console.warn('Initial prefetch failed:', error);
    }
  }

  private setupHoverPrefetch(): void {
    document.addEventListener('mouseover', (e) => {
      const target = e.target as HTMLElement;
      
      // Look for media cards or links
      const mediaCard = target.closest('[data-media-id]');
      const mediaLink = target.closest('a[href*="/media/"]');
      
      if (mediaCard) {
        const mediaId = mediaCard.getAttribute('data-media-id');
        if (mediaId) {
          this.prefetchByPath(mediaId);
        }
      }
      
      if (mediaLink) {
        const href = (mediaLink as HTMLAnchorElement).href;
        const pathMatch = href.match(/\/media\/(.+)/);
        if (pathMatch) {
          this.prefetchByPath(pathMatch[1]);
        }
      }
    });
  }

  async prefetchMediaData(items: MediaItem[]): Promise<void> {
    if (this.processing) return;
    this.processing = true;

    try {
      // Process in small batches to avoid overwhelming the server
      const batchSize = 2;
      
      for (let i = 0; i < items.length; i += batchSize) {
        const batch = items.slice(i, i + batchSize);
        
        await Promise.allSettled(
          batch.map(item => this.prefetchSingleItem(item))
        );
        
        // Small delay between batches
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    } finally {
      this.processing = false;
    }
  }

  private async prefetchSingleItem(item: MediaItem): Promise<void> {
    const key = `${item.title}_${item.year}_${item.type}`;
    
    if (this.prefetchQueue.has(key)) return;
    this.prefetchQueue.add(key);

    try {
      // Only prefetch if not already in cache
      await streamingAPI.fetchMovieData(item.title, item.year, item.type);
    } catch (error) {
      console.debug('Prefetch failed for:', item.title, error);
    }
  }

  async prefetchByPath(mediaPath: string): Promise<void> {
    // Extract title and info from path
    const decodedPath = decodeURIComponent(mediaPath);
    const filename = decodedPath.split('/').pop() || '';
    
    // Simple title extraction
    const title = filename
      .replace(/\.(mp4|mkv|avi|mov|webm|mp3)$/i, '')
      .replace(/[._-]/g, ' ')
      .trim();

    if (title && !this.prefetchQueue.has(title)) {
      this.prefetchQueue.add(title);
      
      // Determine type from path
      let type: 'movie' | 'series' | 'music' = 'movie';
      if (decodedPath.toLowerCase().includes('/series/')) type = 'series';
      if (decodedPath.toLowerCase().includes('/musique')) type = 'music';
      
      try {
        await streamingAPI.fetchMovieData(title, undefined, type);
      } catch (error) {
        console.debug('Path prefetch failed:', error);
      }
    }
  }

  // Prefetch popular content based on user behavior
  async prefetchPopular(): Promise<void> {
    try {
      // This could be enhanced with analytics data
      const categories = await streamingAPI.fetchCategories();
      
      for (const category of categories) {
        // Prefetch first item (likely most popular)
        if (category.items.length > 0) {
          this.prefetchSingleItem(category.items[0]);
        }
      }
    } catch (error) {
      console.debug('Popular prefetch failed:', error);
    }
  }

  // Prefetch category content when user hovers over navigation
  async prefetchCategory(categoryType: string): Promise<void> {
    try {
      const items = await streamingAPI.fetchCategoryContent(categoryType);
      this.prefetchMediaData(items.slice(0, 5)); // First 5 items
    } catch (error) {
      console.debug('Category prefetch failed:', error);
    }
  }
}

export const prefetchService = new PrefetchService();