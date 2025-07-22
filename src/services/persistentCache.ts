interface CacheItem {
  data: any;
  timestamp: number;
  ttl: number;
}

class PersistentCache {
  private dbName = 'streaming-cache';
  private version = 1;
  private db: IDBDatabase | null = null;
  
  constructor() {
    this.initDB();
  }

  private async initDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);
      
      request.onerror = () => reject(request.error);
      
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };
      
      request.onupgradeneeded = () => {
        const db = request.result;
        
        // Store for TMDB data
        if (!db.objectStoreNames.contains('tmdb')) {
          const tmdbStore = db.createObjectStore('tmdb', { keyPath: 'id' });
          tmdbStore.createIndex('timestamp', 'timestamp');
        }
        
        // Store for media categories
        if (!db.objectStoreNames.contains('categories')) {
          db.createObjectStore('categories', { keyPath: 'id' });
        }
        
        // Store for images (base64)
        if (!db.objectStoreNames.contains('images')) {
          db.createObjectStore('images', { keyPath: 'url' });
        }
      };
    });
  }

  private async ensureDB(): Promise<IDBDatabase> {
    if (!this.db) {
      await this.initDB();
    }
    return this.db!;
  }

  async set(store: string, key: string, data: any, ttl: number = 3600000): Promise<void> {
    const db = await this.ensureDB();
    const transaction = db.transaction([store], 'readwrite');
    const objectStore = transaction.objectStore(store);
    
    const item: CacheItem = {
      data,
      timestamp: Date.now(),
      ttl
    };
    
    await objectStore.put({ id: key, ...item });
  }

  async get(store: string, key: string): Promise<any> {
    try {
      const db = await this.ensureDB();
      const transaction = db.transaction([store], 'readonly');
      const objectStore = transaction.objectStore(store);
      
      return new Promise((resolve) => {
        const request = objectStore.get(key);
        
        request.onsuccess = () => {
          const result = request.result;
          
          if (!result) {
            resolve(null);
            return;
          }
          
          // Check TTL
          if (Date.now() - result.timestamp > result.ttl) {
            this.delete(store, key);
            resolve(null);
            return;
          }
          
          resolve(result.data);
        };
        
        request.onerror = () => resolve(null);
      });
    } catch {
      return null;
    }
  }

  async delete(store: string, key: string): Promise<void> {
    try {
      const db = await this.ensureDB();
      const transaction = db.transaction([store], 'readwrite');
      const objectStore = transaction.objectStore(store);
      await objectStore.delete(key);
    } catch {
      // Ignore errors
    }
  }

  async clear(store: string): Promise<void> {
    try {
      const db = await this.ensureDB();
      const transaction = db.transaction([store], 'readwrite');
      const objectStore = transaction.objectStore(store);
      await objectStore.clear();
    } catch {
      // Ignore errors
    }
  }

  // Cache images as base64
  async cacheImage(url: string): Promise<string | null> {
    try {
      // Check if already cached
      const cached = await this.get('images', url);
      if (cached) {
        return cached;
      }

      // Fetch and convert to base64
      const response = await fetch(url);
      const blob = await response.blob();
      
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => {
          const base64 = reader.result as string;
          this.set('images', url, base64, 7 * 24 * 3600000); // Cache for 1 week
          resolve(base64);
        };
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(blob);
      });
    } catch {
      return null;
    }
  }
}

export const persistentCache = new PersistentCache();