export interface MediaItem {
  id: string;
  title: string;
  originalTitle?: string;
  frenchTitle?: string;
  path: string;
  type: 'movie' | 'series' | 'music';
  thumbnail?: string;
  poster?: string;
  frenchPoster?: string;
  backdrop?: string;
  duration?: string;
  year?: number;
  genre?: string;
  description?: string;
  frenchDescription?: string;
  // Grouping fields
  isGroup?: boolean;
  episodeCount?: number;
  episodes?: MediaItem[];
  seasonNumber?: number;
  episodeNumber?: number;
  seriesTitle?: string;
  sequelNumber?: number;
}

export interface MediaCategory {
  name: string;
  type: 'Films' | 'Series' | 'Musiques';
  items: MediaItem[];
}

class StreamingAPI {
  private baseUrl = '/api';
  private posterCache = new Map<string, {poster: string | null, frenchPoster?: string, backdrop: string | null, frenchTitle?: string, frenchDescription?: string, releaseDate?: string, releaseYear?: number, genres?: number[], voteAverage?: number, voteCount?: number} | null>();

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
      const response = await fetch(`${this.baseUrl}/${categoryType}`);
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

  async fetchMoviePoster(title: string, year?: number, type?: string): Promise<string | null> {
    const data = await this.fetchMovieData(title, year, type);
    return data?.poster || null;
  }

  async fetchMovieBackdrop(title: string, year?: number, type?: string): Promise<string | null> {
    const data = await this.fetchMovieData(title, year, type);
    return data?.backdrop || null;
  }

  async fetchMovieData(title: string, year?: number, type?: string): Promise<{poster: string | null, frenchPoster?: string, backdrop: string | null, frenchTitle?: string, frenchDescription?: string, releaseDate?: string, releaseYear?: number, genres?: number[], voteAverage?: number, voteCount?: number} | null> {
    try {
      const cleanTitle = this.cleanMovieTitle(title);
      const cacheKey = `${cleanTitle}_${year || 'unknown'}_${type || 'movie'}`;
      
      // Check cache first
      if (this.posterCache.has(cacheKey)) {
        return this.posterCache.get(cacheKey) || null;
      }
      
      const params = new URLSearchParams();
      if (year) params.append('year', year.toString());
      if (type) params.append('type', type);
      const queryString = params.toString();
      const url = `${this.baseUrl}/poster/${encodeURIComponent(cleanTitle)}${queryString ? `?${queryString}` : ''}`;
      
      const response = await fetch(url);
      if (!response.ok) {
        this.posterCache.set(cacheKey, null);
        return null;
      }
      
      const data = await response.json();
      const movieData = {
        poster: data.poster || null,
        frenchPoster: data.frenchPoster || null,
        backdrop: data.backdrop || null,
        frenchTitle: data.frenchTitle || null,
        frenchDescription: data.frenchOverview || null,
        releaseDate: data.releaseDate || null,
        releaseYear: data.releaseYear || null,
        genres: data.genres || [],
        voteAverage: data.voteAverage || null,
        voteCount: data.voteCount || null
      };
      
      // Cache the result
      this.posterCache.set(cacheKey, movieData);
      
      return movieData;
    } catch (error) {
      console.error('Error fetching movie data:', error);
      return null;
    }
  }

  cleanMovieTitle(filename: string): string {
    return filename
      .replace(/\.(mp4|mkv|avi|mov|webm)$/i, '') // Remove file extensions
      .replace(/\b[Ss]\d{1,2}[Ee]\d{1,2}\b/g, '') // Remove season/episode patterns (S01E01, s1e1, etc.)
      .replace(/[[(].*?[\])]/g, '') // Remove content in brackets/parentheses
      .replace(/\b(19|20)\d{2}\b/g, '') // Remove years
      .replace(/\b(CAM|TS|TC|SCR|R5|DVDRip|BRRip|BluRay|1080p|720p|480p|HDTV|WEBRip|x264|x265|HEVC|AAC|AC3|DTS|IMAX)\b/gi, '') // Remove quality tags
      .replace(/[._-]/g, ' ') // Replace dots, underscores, dashes with spaces
      .replace(/\s+/g, ' ') // Replace multiple spaces with single space
      .trim();
  }

  private getMockData(): MediaCategory[] {
    return [
      {
        name: 'Films',
        type: 'Films',
        items: this.getMockDataForCategory('Films')
      },
      {
        name: 'Series',
        type: 'Series',
        items: this.getMockDataForCategory('Series')
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
          description: 'Un film d\'action palpitant',
          originalTitle: "Action Movie"
        },
        {
          id: '2',
          title: 'Comedy Film',
          path: '/Films/comedy_film.mp4',
          type: 'movie',
          year: 2022,
          genre: 'Comedy',
          description: 'Une comédie hilarante',
          originalTitle: "Comedy Film"
        }
      ],
      'Series': [
        {
          id: '3',
          title: 'Drama Series',
          path: '/Series/drama_series_s01e01.mp4',
          type: 'series',
          year: 2023,
          genre: 'Drama',
          description: 'Une série dramatique captivante',
          originalTitle: "Drama Series"
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
          description: 'Album de musique pop',
          originalTitle: "Pop Album"
        }
      ]
    };
    return mockItems[category] || [];
  }
}

export const streamingAPI = new StreamingAPI();