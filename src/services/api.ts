export interface MediaItem {
  id: string;
  title: string;
  path: string;
  type: 'movie' | 'series' | 'music';
  thumbnail?: string;
  duration?: string;
  year?: number;
  genre?: string;
  description?: string;
}

export interface MediaCategory {
  name: string;
  type: 'Films' | 'Séries' | 'Musiques';
  items: MediaItem[];
}

class StreamingAPI {
  private baseUrl = '/api';

  async fetchCategories(): Promise<MediaCategory[]> {
    try {
      const response = await fetch(`${this.baseUrl}/categories`);
      if (!response.ok) {
        throw new Error('Failed to fetch categories');
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching categories:', error);
      return this.getMockData();
    }
  }

  async fetchCategoryContent(categoryType: string): Promise<MediaItem[]> {
    try {
      const response = await fetch(`${this.baseUrl}/category/${categoryType}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch ${categoryType} content`);
      }
      return await response.json();
    } catch (error) {
      console.error(`Error fetching ${categoryType} content:`, error);
      return this.getMockDataForCategory(categoryType);
    }
  }

  async searchMedia(query: string): Promise<MediaItem[]> {
    try {
      const response = await fetch(`${this.baseUrl}/search?q=${encodeURIComponent(query)}`);
      if (!response.ok) {
        throw new Error('Failed to search media');
      }
      return await response.json();
    } catch (error) {
      console.error('Error searching media:', error);
      return [];
    }
  }

  getStreamUrl(mediaPath: string): string {
    return `${this.baseUrl}/stream/${encodeURIComponent(mediaPath)}`;
  }

  private getMockData(): MediaCategory[] {
    return [
      {
        name: 'Films',
        type: 'Films',
        items: this.getMockDataForCategory('Films')
      },
      {
        name: 'Séries',
        type: 'Séries',
        items: this.getMockDataForCategory('Séries')
      },
      {
        name: 'Musiques',
        type: 'Musiques',
        items: this.getMockDataForCategory('Musiques')
      }
    ];
  }

  private getMockDataForCategory(category: string): MediaItem[] {
    const mockItems: Record<string, MediaItem[]> = {
      'Films': [
        {
          id: '1',
          title: 'Action Movie',
          path: '/Films/action_movie.mp4',
          type: 'movie',
          year: 2023,
          genre: 'Action',
          description: 'Un film d\'action palpitant'
        },
        {
          id: '2',
          title: 'Comedy Film',
          path: '/Films/comedy_film.mp4',
          type: 'movie',
          year: 2022,
          genre: 'Comedy',
          description: 'Une comédie hilarante'
        }
      ],
      'Séries': [
        {
          id: '3',
          title: 'Drama Series',
          path: '/Séries/drama_series_s01e01.mp4',
          type: 'series',
          year: 2023,
          genre: 'Drama',
          description: 'Une série dramatique captivante'
        }
      ],
      'Musiques': [
        {
          id: '4',
          title: 'Pop Album',
          path: '/Musiques/pop_album.mp3',
          type: 'music',
          year: 2023,
          genre: 'Pop',
          description: 'Album de musique pop'
        }
      ]
    };
    return mockItems[category] || [];
  }
}

export const streamingAPI = new StreamingAPI();