import express from 'express';
import { exec } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import crypto from 'crypto';
import { parseFile } from 'music-metadata';
import 'dotenv/config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;
const TMDB_API_KEY = process.env.TMDB_API_KEY;

// Media configuration
const MEDIA_PATH = process.env.MEDIA_PATH || path.join(__dirname, 'test-media');
const SSH_SERVER = process.env.SSH_SERVER || 'ssh.thimotefetu.fr';
const SSH_PATH = process.env.SSH_PATH || '/mnt/streaming';
const USE_LOCAL_FILES = process.env.USE_LOCAL_FILES === 'true' || false;

console.log('USE_LOCAL_FILES:', USE_LOCAL_FILES);
console.log('MEDIA_PATH:', MEDIA_PATH);
console.log('TMDB_API_KEY configured:', !!TMDB_API_KEY);
console.log('TMDB_API_KEY length:', TMDB_API_KEY ? TMDB_API_KEY.length : 0);

app.use(express.json());
app.use(express.static(path.join(__dirname, 'dist')));

// Serve media files directly in local mode
if (USE_LOCAL_FILES) {
  app.use('/media', express.static(MEDIA_PATH));
}

// CORS middleware
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

// Helper function to execute SSH commands
const executeSSH = (command) => {
  return new Promise((resolve, reject) => {
    exec(command, { timeout: 10000 }, (error, stdout, stderr) => {
      if (error) {
        console.error(`SSH Error: ${error}`);
        reject(error);
        return;
      }
      if (stderr) {
        console.error(`SSH Stderr: ${stderr}`);
      }
      resolve(stdout);
    });
  });
};

// Get all categories
app.get('/api/categories', async (_req, res) => {
  try {
    let directories = [];
    
    if (USE_LOCAL_FILES) {
      // Use local filesystem
      if (fs.existsSync(MEDIA_PATH)) {
        const items = fs.readdirSync(MEDIA_PATH);
        directories = items.filter(item => {
          const itemPath = path.join(MEDIA_PATH, item);
          return fs.statSync(itemPath).isDirectory() && 
                 ['Films', 'Series', 'Musiques'].includes(item);
        });
      }
    } else {
      // Use SSH
      const command = `ssh -i ~/.ssh/streaming_key -o PasswordAuthentication=no -o StrictHostKeyChecking=no ${SSH_SERVER} "ls -la ${SSH_PATH}"`;
      const output = await executeSSH(command);
      
      const lines = output.split('\n').filter(line => line.trim());
      directories = lines
        .filter(line => line.startsWith('d'))
        .map(line => line.split(/\s+/).pop())
        .filter(dir => dir && !dir.startsWith('.'))
        .filter(dir => ['Films', 'Series', 'Musiques'].includes(dir));
    }
    
    const categories = await Promise.all(
      directories.map(async (dir) => {
        const items = await getCategoryItems(dir);
        return {
          name: dir,
          type: dir,
          items: items
        };
      })
    );
    
    res.json(categories);
  } catch (error) {
    console.error('Error fetching categories:', error);
    // Return mock data on error
    res.json([
      {
        name: 'Films',
        type: 'Films',
        items: [
          {
            id: '1',
            title: 'Action Movie',
            path: '/films/action_movie.mp4',
            type: 'movie',
            year: 2023,
            genre: 'Action',
            description: 'Un film d\'action palpitant'
          }
        ]
      },
      {
        name: 'Series',
        type: 'Series',
        items: [
          {
            id: '2',
            title: 'Drama Series',
            path: '/series/drama_series_s01e01.mp4',
            type: 'series',
            year: 2023,
            genre: 'Drama',
            description: 'Une série dramatique captivante'
          }
        ]
      },
      {
        name: 'Musiques',
        type: 'Musiques',
        items: [
          {
            id: '3',
            title: 'Pop Album',
            path: '/musiques/pop_album.mp3',
            type: 'music',
            year: 2023,
            genre: 'Pop',
            description: 'Album de musique pop'
          }
        ]
      }
    ]);
  }
});

// Debug endpoint
app.get('/api/debug', (req, res) => {
  res.json({ 
    status: 'working',
    mediaPath: MEDIA_PATH,
    useLocalFiles: USE_LOCAL_FILES
  });
});


// Search media
app.get('/api/search', async (req, res) => {
  try {
    const rawQuery = req.query.q;
    if (!rawQuery) {
      console.log('No query provided, returning empty array');
      return res.json([]);
    }
    
    // Decode URL encoded characters (like accents)
    const q = decodeURIComponent(rawQuery);
    console.log('Search request received:', q, '(raw:', rawQuery, ')');
    
    let files = [];
    
    if (USE_LOCAL_FILES) {
      console.log('Using local files for search...');
      const { promisify } = await import('util');
      const execAsync = promisify(exec);
      
      try {
        const findCommand = `find "${MEDIA_PATH}" -type f \\( -name '*.mp4' -o -name '*.mp3' \\) | head -100`;
        console.log('Executing find command:', findCommand);
        const { stdout } = await execAsync(findCommand);
        files = stdout.split('\n').filter(line => line.trim());
        console.log(`Found ${files.length} local files:`, files);
      } catch (error) {
        console.error('Error finding local files:', error);
        return res.json([]);
      }
    } else {
      console.log('Executing SSH command to fetch files...');
      const command = `ssh -i ~/.ssh/streaming_key -o PasswordAuthentication=no -o StrictHostKeyChecking=no ${SSH_SERVER} "find ${SSH_PATH} -type f \\( -name '*.mp4' -o -name '*.mkv' -o -name '*.avi' -o -name '*.mov' -o -name '*.mp3' -o -name '*.flac' -o -name '*.wav' \\) | head -100"`;
      const output = await executeSSH(command);
      files = output.split('\n').filter(line => line.trim());
      console.log('SSH output received, processing files...');
    }
    
    const resultsWithMetadata = await Promise.all(files.map(async (filePath, index) => {
      const fileName = filePath.split('/').pop() || '';
      const fileNameWithoutExt = fileName.split('.').slice(0, -1).join('.');
      const category = filePath.split('/').slice(-2, -1)[0];
      const formattedTitle = formatTitle(fileNameWithoutExt);
      
      let movieData = null;
      const year = extractYear(fileName);
      const mediaType = getMediaType(category);
      
      if (TMDB_API_KEY && (mediaType === 'movie' || mediaType === 'series')) {
        try {
          const cleanTitle = cleanMovieTitle(fileNameWithoutExt);
          movieData = await fetchMovieDataFromTMDB(cleanTitle, year, mediaType);
        } catch (error) {
          console.error('Error fetching TMDB data for search:', error);
        }
      } else if (mediaType === 'music') {
        try {
          movieData = await extractMusicMetadata(filePath);
        } catch (error) {
          console.error('Error extracting music metadata for search:', error);
        }
      }
      
      return {
        id: generateUniqueId(fileNameWithoutExt, category),
        title: formattedTitle,
        frenchTitle: movieData?.frenchTitle || null,
        path: filePath,
        type: mediaType,
        genre: extractGenre(fileName),
        year: year,
        description: `${mediaType} - ${fileName}`,
        poster: movieData?.poster || null,
        frenchPoster: movieData?.frenchPoster || null,
        backdrop: movieData?.backdrop || null
      };
    }));
    
    console.log(`Found ${resultsWithMetadata.length} files, filtering by query: "${q}"`);
    
    // Normalize function to remove accents for better matching
    const normalize = (str) => {
      if (!str) return '';
      return str.toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, ''); // Remove diacritics
    };
    
    // Filter results based on query matching title or frenchTitle
    const filteredResults = resultsWithMetadata.filter(item => {
      const queryNormalized = normalize(q);
      const queryLower = q.toLowerCase();
      
      // Direct match (with accents)
      const titleMatch = item.title.toLowerCase().includes(queryLower);
      const frenchTitleMatch = item.frenchTitle && item.frenchTitle.toLowerCase().includes(queryLower);
      
      // Normalized match (without accents)
      const titleNormalizedMatch = normalize(item.title).includes(queryNormalized);
      const frenchTitleNormalizedMatch = item.frenchTitle && normalize(item.frenchTitle).includes(queryNormalized);
      
      const match = titleMatch || frenchTitleMatch || titleNormalizedMatch || frenchTitleNormalizedMatch;
      if (match) {
        console.log(`Match found: ${item.title} (French: ${item.frenchTitle}) for query: "${q}"`);
      }
      return match;
    });
    console.log(`Filtered results: ${filteredResults.length} items`);
    
    filteredResults.sort((a, b) => {
      // Normalize titles for proper alphabetical sorting
      const normalizeTitle = (title) => title
        .toLowerCase()
        .replace(/^(the|le|la|les|un|une|des|\[.*?\])\s+/i, '') // Remove articles and brackets
        .replace(/[^\w\s]/g, '') // Remove special characters
        .trim();
      
      const titleA = normalizeTitle(a.frenchTitle || a.title);
      const titleB = normalizeTitle(b.frenchTitle || b.title);
      
      return titleA.localeCompare(titleB, 'fr', { sensitivity: 'base' });
    });
    
    res.json(filteredResults.slice(0, 20)); // Limit to 20 results
  } catch (error) {
    console.error('Error searching media:', error);
    res.json([]);
  }
});

// Get content for a specific category
app.get('/api/:type', async (req, res) => {
  try {
    const { type } = req.params;
    console.log(`📡 API request for category: ${type}`);
    const items = await getCategoryItems(type);
    console.log(`📦 Returning ${items.length} items`);
    res.json(items);
  } catch (error) {
    console.error(`Error fetching ${req.params.type} content:`, error);
    res.json([]);
  }
});

// Helper function to get items for a category
const getCategoryItems = async (category) => {
  console.log(`🔍 getCategoryItems called with category: ${category}`);
  try {
    let files = [];
    
    if (USE_LOCAL_FILES) {
      // Use local filesystem - try both lowercase and capitalized
      let categoryPath = path.join(MEDIA_PATH, category);
      
      // If the lowercase version doesn't exist, try capitalized
      if (!fs.existsSync(categoryPath)) {
        const capitalizedCategory = category.charAt(0).toUpperCase() + category.slice(1);
        categoryPath = path.join(MEDIA_PATH, capitalizedCategory);
      }
      
      if (fs.existsSync(categoryPath)) {
        const getAllFiles = (dir, fileList = []) => {
          const files = fs.readdirSync(dir);
          files.forEach(file => {
            const filePath = path.join(dir, file);
            if (fs.statSync(filePath).isDirectory()) {
              getAllFiles(filePath, fileList);
            } else if (/\.(mp4|mp3)$/i.test(file)) {
              fileList.push(filePath);
            }
          });
          return fileList;
        };
        
        files = getAllFiles(categoryPath);
      }
    } else {
      // Use SSH
      const command = `ssh -i ~/.ssh/streaming_key -o PasswordAuthentication=no -o StrictHostKeyChecking=no ${SSH_SERVER} "find ${SSH_PATH}/${category} -type f \\( -name '*.mp4' -o -name '*.mp3' \\)"`;
      const output = await executeSSH(command);
      files = output.split('\n').filter(line => line.trim());
    }
    
    const mediaItems = await Promise.all(files.map(async (filePath) => {
      const fileName = filePath.split('/').pop() || '';
      const fileNameWithoutExt = fileName.split('.').slice(0, -1).join('.');
      const mediaType = getMediaType(category);
      
      // Convert local path to web path
      const webPath = USE_LOCAL_FILES ? 
        filePath.replace(MEDIA_PATH, '') : 
        filePath;
      
      let musicMetadata = null;
      if (mediaType === 'music') {
        try {
          musicMetadata = await extractMusicMetadata(filePath);
        } catch (error) {
          console.error('Error extracting music metadata:', error);
        }
      }
      
      // Pour les musiques, utiliser un ID simple sans préfixe de catégorie
      const cleanTitleForUrl = (title) => {
        return title
          .toLowerCase()
          .replace(/[^\w\s-]/g, '')
          .replace(/\s+/g, '_')
          .replace(/_+/g, '_')
          .replace(/^_|_$/g, '');
      };
      
      return {
        id: mediaType === 'music' ? cleanTitleForUrl(fileNameWithoutExt) : generateUniqueId(fileNameWithoutExt, category),
        title: musicMetadata?.title || formatTitle(fileNameWithoutExt),
        originalFileName: fileNameWithoutExt, // Keep original for pattern matching
        path: webPath,
        type: mediaType,
        genre: musicMetadata?.genre || extractGenre(fileName),
        year: musicMetadata?.year || extractYear(fileName),
        description: `${mediaType} - ${fileName}`,
        poster: musicMetadata?.poster || null,
        artist: musicMetadata?.artist || null,
        album: musicMetadata?.album || null
      };
    }));
    
    // Group media items by series/sequels
    return groupMediaItems(mediaItems, category);
  } catch (error) {
    console.error(`Error getting ${category} items:`, error);
    return [];
  }
};

// Test endpoint to check TMDB configuration
app.get('/api/test-tmdb', (_req, res) => {
  res.json({
    tmdbConfigured: !!TMDB_API_KEY,
    tmdbKeyLength: TMDB_API_KEY ? TMDB_API_KEY.length : 0,
    envVars: Object.keys(process.env).filter(key => key.includes('TMDB')),
    nodeEnv: process.env.NODE_ENV,
    allEnvKeys: Object.keys(process.env).slice(0, 10) // First 10 for debug
  });
});

// Get movie/TV show poster from TMDB with multiple search strategies
app.get('/api/poster/:title', async (req, res) => {
  try {
    const { title } = req.params;
    const { year, type } = req.query;
    
    if (!TMDB_API_KEY) {
      console.error('❌ TMDB API key not found in environment variables');
      console.error('Available env vars:', Object.keys(process.env).filter(key => key.includes('TMDB')));
      return res.status(500).json({ error: 'TMDB API key not configured' });
    }
    
    const originalTitle = decodeURIComponent(title);
    const mediaType = type === 'series' ? 'tv' : 'movie';
    console.log(`🔍 Searching for ${mediaType}:`, originalTitle);
    const searchVariants = generateSearchVariants(originalTitle);
    
    let mediaResult = null;
    
    // Try each variant until we find a result
    for (const variant of searchVariants) {
      const cleanTitle = cleanMovieTitle(variant);
      const searchQuery = encodeURIComponent(cleanTitle);
      const yearParam = year ? `&year=${year}` : '';
      
      // Try both English and French searches
      const searches = [
        `https://api.themoviedb.org/3/search/${mediaType}?api_key=${TMDB_API_KEY}&query=${searchQuery}${yearParam}&language=en-US`,
        `https://api.themoviedb.org/3/search/${mediaType}?api_key=${TMDB_API_KEY}&query=${searchQuery}${yearParam}&language=fr-FR`
      ];
      
      for (const url of searches) {
        try {
          const response = await fetch(url);
          if (response.ok) {
            const data = await response.json();
            if (data.results && data.results.length > 0) {
              mediaResult = data.results[0];
              break;
            }
          }
        } catch (searchError) {
          console.error('Search error:', searchError);
        }
      }
      
      if (mediaResult) break;
    }
    
    if (mediaResult) {
      // Get French translation and French posters if available
      const titleField = mediaType === 'tv' ? 'name' : 'title';
      let frenchTitle = mediaResult[titleField];
      let frenchOverview = mediaResult.overview;
      let frenchPosterUrl = mediaResult.poster_path ? `https://image.tmdb.org/t/p/w500${mediaResult.poster_path}` : null;
      
      try {
        // Get French details
        const detailsUrl = `https://api.themoviedb.org/3/${mediaType}/${mediaResult.id}?api_key=${TMDB_API_KEY}&language=fr-FR`;
        const detailsResponse = await fetch(detailsUrl);
        if (detailsResponse.ok) {
          const frenchData = await detailsResponse.json();
          if (frenchData[titleField] && frenchData[titleField].trim()) {
            frenchTitle = frenchData[titleField];
          }
          if (frenchData.overview && frenchData.overview.trim()) {
            frenchOverview = frenchData.overview;
          }
        }

        // Get French posters
        const imagesUrl = `https://api.themoviedb.org/3/${mediaType}/${mediaResult.id}/images?api_key=${TMDB_API_KEY}`;
        const imagesResponse = await fetch(imagesUrl);
        if (imagesResponse.ok) {
          const imagesData = await imagesResponse.json();
          
          // Look for French posters first
          const frenchPosters = imagesData.posters?.filter(poster => 
            poster.iso_639_1 === 'fr' || poster.iso_639_1 === null
          );
          
          if (frenchPosters && frenchPosters.length > 0) {
            // Prefer French posters, then null language (international), then highest rated
            const bestFrenchPoster = frenchPosters.sort((a, b) => {
              if (a.iso_639_1 === 'fr' && b.iso_639_1 !== 'fr') return -1;
              if (b.iso_639_1 === 'fr' && a.iso_639_1 !== 'fr') return 1;
              return b.vote_average - a.vote_average;
            })[0];
            
            frenchPosterUrl = `https://image.tmdb.org/t/p/w500${bestFrenchPoster.file_path}`;
          }
        }
      } catch (translationError) {
        console.error('Error fetching French content:', translationError);
      }

      const posterUrl = mediaResult.poster_path ? `https://image.tmdb.org/t/p/w500${mediaResult.poster_path}` : null;
      const backdropUrl = mediaResult.backdrop_path ? `https://image.tmdb.org/t/p/w1280${mediaResult.backdrop_path}` : null;
      
      // Handle different date fields for movies vs TV shows
      const releaseDate = mediaType === 'tv' ? mediaResult.first_air_date : mediaResult.release_date;
      
      res.json({ 
        poster: posterUrl, // Original poster (English)
        frenchPoster: frenchPosterUrl, // French poster
        backdrop: backdropUrl,
        title: mediaResult[titleField], // Original title (English)
        frenchTitle: frenchTitle, // French title
        overview: mediaResult.overview, // Original overview
        frenchOverview: frenchOverview, // French overview
        releaseDate: releaseDate, // Format YYYY-MM-DD
        releaseYear: releaseDate ? new Date(releaseDate).getFullYear() : null,
        genres: mediaResult.genre_ids || [],
        voteAverage: mediaResult.vote_average,
        voteCount: mediaResult.vote_count,
        adult: mediaResult.adult,
        popularity: mediaResult.popularity,
        tmdbId: mediaResult.id,
        mediaType: mediaType
      });
    } else {
      res.json({ poster: null, frenchPoster: null, backdrop: null });
    }
  } catch (error) {
    console.error('Error fetching poster:', error);
    res.status(500).json({ error: 'Failed to fetch poster' });
  }
});

// Serve album artwork from cache
app.get('/api/artwork/:artworkId', (req, res) => {
  const { artworkId } = req.params;
  
  const artwork = albumArtworkCache.get(artworkId);
  if (!artwork) {
    return res.status(404).json({ error: 'Artwork not found' });
  }
  
  
  // Set appropriate content type and headers
  res.set('Content-Type', artwork.format || 'image/jpeg');
  res.set('Cache-Control', 'public, max-age=86400'); // Cache for 24 hours
  
  // Send binary data properly
  if (Buffer.isBuffer(artwork.data)) {
    res.end(artwork.data);
  } else {
    // If it's not a buffer, create one
    res.end(Buffer.from(artwork.data));
  }
});

// French to English movie title mapping
const frenchToEnglishMapping = {
  "avatar": "avatar",
  "inception": "inception", 
  "interstellar": "interstellar",
  "matrix": "matrix",
  "le seigneur des anneaux": "lord of the rings",
  "star wars": "star wars",
  "la guerre des étoiles": "star wars",
  "retour vers le futur": "back to the future",
  "pulp fiction": "pulp fiction",
  "le parrain": "godfather",
  "titanic": "titanic",
  "jurassic park": "jurassic park",
  "indiana jones": "indiana jones",
  "harry potter": "harry potter",
  "pirates des caraïbes": "pirates of the caribbean",
  "shrek": "shrek",
  "toy story": "toy story",
  "le roi lion": "lion king",
  "la reine des neiges": "frozen",
  "fast and furious": "fast furious",
  "rapides et dangereux": "fast furious",
  "mission impossible": "mission impossible",
  "james bond": "james bond",
  "batman": "batman",
  "superman": "superman",
  "spider-man": "spider-man",
  "l'homme araignée": "spider-man",
  "iron man": "iron man",
  "captain america": "captain america",
  "thor": "thor",
  "avengers": "avengers",
  "x-men": "x-men",
  "deadpool": "deadpool",
  "wolverine": "wolverine"
};

// Function to map French titles to English
const mapFrenchToEnglish = (title) => {
  const normalizedTitle = title.toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // Exact match
  if (frenchToEnglishMapping[normalizedTitle]) {
    return frenchToEnglishMapping[normalizedTitle];
  }

  // Partial match
  for (const [french, english] of Object.entries(frenchToEnglishMapping)) {
    if (normalizedTitle.includes(french) || french.includes(normalizedTitle)) {
      return english;
    }
  }

  return title;
};

// Function to generate search variants
const generateSearchVariants = (title) => {
  const variants = [title];
  
  // Add mapped version
  const mappedTitle = mapFrenchToEnglish(title);
  if (mappedTitle !== title) {
    variants.push(mappedTitle);
  }
  
  // Add versions without articles
  const withoutArticles = title.replace(/^(le|la|les|un|une|des|l'|du|de la|des)\s+/i, '');
  if (withoutArticles !== title) {
    variants.push(withoutArticles);
  }
  
  // Add versions without subtitles
  const withoutSubtitle = title.split(/[:\-–—]/, 1)[0].trim();
  if (withoutSubtitle !== title) {
    variants.push(withoutSubtitle);
  }
  
  return [...new Set(variants)]; // Remove duplicates
};

// Helper function to clean movie title for TMDB search
const cleanMovieTitle = (filename) => {
  return filename
    .replace(/\.(mp4|mkv|avi|mov|webm)$/i, '') // Remove file extensions
    .replace(/[\[\(].*?[\]\)]/g, '') // Remove content in brackets/parentheses
    .replace(/\b(19|20)\d{2}\b/g, '') // Remove years
    .replace(/\b(CAM|TS|TC|SCR|R5|DVDRip|BRRip|BluRay|1080p|720p|480p|HDTV|WEBRip|x264|x265|HEVC|AAC|AC3|DTS|IMAX)\b/gi, '') // Remove quality tags
    .replace(/[._-]/g, ' ') // Replace dots, underscores, dashes with spaces
    .replace(/\s+/g, ' ') // Replace multiple spaces with single space
    .replace(/^\s+|\s+$/g, '') // Trim whitespace
    .trim();
};

// Cache for storing extracted album artwork
const albumArtworkCache = new Map();

// Helper function to extract album artwork from music files
const extractMusicMetadata = async (filePath) => {
  if (!USE_LOCAL_FILES) {
    // For remote files, we can't extract metadata
    return null;
  }
  
  try {
    const metadata = await parseFile(filePath);
    const artwork = metadata.common.picture?.[0];
    
    let artworkUrl = null;
    if (artwork) {
      // Generate a consistent ID based on filename only (not full path)
      const fileName = filePath.split('/').pop() || filePath;
      const artworkId = crypto.createHash('md5').update(fileName).digest('hex');
      // Cache the artwork data
      albumArtworkCache.set(artworkId, {
        data: artwork.data,
        format: artwork.format || 'image/jpeg'
      });
      // Create URL to serve the artwork
      artworkUrl = `/api/artwork/${artworkId}`;
    }
    
    return {
      poster: artworkUrl,
      artist: metadata.common.artist || null,
      album: metadata.common.album || null,
      title: metadata.common.title || null,
      year: metadata.common.year || null,
      genre: metadata.common.genre?.[0] || null
    };
  } catch (error) {
    console.error('Error extracting music metadata:', error);
    return null;
  }
};

// Helper function to fetch movie data from TMDB
const fetchMovieDataFromTMDB = async (title, year, type) => {
  if (!TMDB_API_KEY) return null;
  
  try {
    const mediaType = type === 'series' ? 'tv' : 'movie';
    const searchQuery = encodeURIComponent(title);
    const yearParam = year ? `&year=${year}` : '';
    
    const response = await fetch(
      `https://api.themoviedb.org/3/search/${mediaType}?api_key=${TMDB_API_KEY}&query=${searchQuery}${yearParam}&language=fr-FR`
    );
    
    if (!response.ok) return null;
    
    const data = await response.json();
    if (!data.results || data.results.length === 0) return null;
    
    const result = data.results[0];
    const titleField = mediaType === 'tv' ? 'name' : 'title';
    
    return {
      poster: result.poster_path ? `https://image.tmdb.org/t/p/w500${result.poster_path}` : null,
      backdrop: result.backdrop_path ? `https://image.tmdb.org/t/p/w1280${result.backdrop_path}` : null,
      frenchTitle: result[titleField] || null,
      frenchDescription: result.overview || null
    };
  } catch (error) {
    console.error('Error fetching TMDB data:', error);
    return null;
  }
};


// Stream media files - redirect to nginx in production
app.get('/api/stream/:path(*)', async (req, res) => {
  try {
    const filePath = decodeURIComponent(req.params.path);
    console.log('Streaming request for:', filePath);
    
    if (USE_LOCAL_FILES) {
      // Serve MP4/WebM files directly from local filesystem
      const localFilePath = path.join(MEDIA_PATH, filePath);
      console.log('Serving local file:', localFilePath);
      
      if (!fs.existsSync(localFilePath)) {
        res.status(404).send('File not found');
        return;
      }
      
      const ext = path.extname(filePath).toLowerCase();
      if (['.mp4', '.webm', '.mp3', '.flac', '.wav'].includes(ext)) {
        res.sendFile(localFilePath);
      } else {
        res.status(415).send('Unsupported media type. Only MP4, WebM, MP3, FLAC, and WAV files are supported.');
      }
    } else {
      // Serve MP4/WebM files via SSH
      const ext = path.extname(filePath).toLowerCase();
      
      if (['.mp4', '.webm', '.mp3', '.flac', '.wav'].includes(ext)) {
        const mimeTypes = {
          '.mp4': 'video/mp4',
          '.webm': 'video/webm',
          '.mp3': 'audio/mpeg',
          '.flac': 'audio/flac',
          '.wav': 'audio/wav'
        };
        
        res.setHeader('Content-Type', mimeTypes[ext]);
        res.setHeader('Accept-Ranges', 'bytes');
        res.setHeader('Cache-Control', 'no-cache');
        
        const streamCommand = `ssh -i ~/.ssh/streaming_key -o PasswordAuthentication=no -o StrictHostKeyChecking=no ${SSH_SERVER} "cat '${filePath}'"`;
        console.log('SSH streaming:', streamCommand);
        
        const child = exec(streamCommand, { timeout: 300000 });
        
        child.stdout.on('data', (chunk) => {
          res.write(chunk);
        });
        
        child.stdout.on('end', () => {
          res.end();
        });
        
        child.on('error', (error) => {
          console.error('SSH stream error:', error);
          if (!res.headersSent) {
            res.status(500).send('Stream error: ' + error.message);
          }
        });
        
        child.stderr.on('data', (data) => {
          console.error('SSH stderr:', data.toString());
        });
      } else {
        res.status(415).send('Unsupported media type. Only MP4, WebM, MP3, FLAC, and WAV files are supported.');
      }
    }
  } catch (error) {
    console.error('Error in stream endpoint:', error);
    res.status(500).send('Error streaming file: ' + error.message);
  }
});

// Helper function to generate unique ID from filename
const generateUniqueId = (filename, category, sequelNumber = null) => {
  // Clean the filename to create a stable ID
  const cleanName = filename
    .toLowerCase()
    .replace(/\.(mp4|mkv|avi|mov|webm)$/i, '') // Remove file extensions
    .replace(/[\[\(].*?[\]\)]/g, '') // Remove content in brackets/parentheses
    .replace(/\b(19|20)\d{2}\b/g, '') // Remove years
    .replace(/\b(CAM|TS|TC|SCR|R5|DVDRip|BRRip|BluRay|1080p|720p|480p|HDTV|WEBRip|x264|x265|HEVC|AAC|AC3|DTS|IMAX)\b/gi, '') // Remove quality tags
    .replace(/[^a-z0-9\s]/g, ' ') // Replace special characters with spaces
    .replace(/\s+/g, '_') // Replace spaces with underscores
    .replace(/^_+|_+$/g, '') // Remove leading/trailing underscores
    .trim();
  
  // Create a more readable base ID
  let baseId;
  
  if (category.toLowerCase() === 'episode') {
    // For episodes, use the episode identifier
    baseId = `episode_${cleanName}_${sequelNumber || 'unknown'}`;
  } else if (category.toLowerCase() === 'film' && sequelNumber) {
    // For films in a saga, include the sequel number
    baseId = `film_${cleanName}_${sequelNumber}`;
  } else {
    // For regular items, use category prefix
    const sequelSuffix = sequelNumber ? `_${sequelNumber}` : '';
    baseId = `${category.toLowerCase()}_${cleanName}${sequelSuffix}`;
  }
  
  // Add a shorter hash for uniqueness but keep it readable
  const hash = crypto.createHash('md5').update(filename + category + (sequelNumber || '')).digest('hex').substring(0, 6);
  
  return `${baseId}_${hash}`;
};

// Helper functions
const formatTitle = (filename) => {
  return filename
    .replace(/[._-]/g, ' ')
    .replace(/\b\w/g, l => l.toUpperCase())
    .replace(/\s+/g, ' ')
    .trim();
};

const getMediaType = (category) => {
  switch (category.toLowerCase()) {
    case 'films':
      return 'movie';
    case 'series':
      return 'series';
    case 'musiques':
      return 'music';
    default:
      return 'movie';
  }
};

const extractYear = (filename) => {
  const yearMatch = filename.match(/\b(19|20)\d{2}\b/);
  return yearMatch ? parseInt(yearMatch[0]) : undefined;
};

const extractGenre = (filename) => {
  const genres = ['action', 'comedy', 'drama', 'horror', 'sci-fi', 'thriller', 'romance', 'animation'];
  const lowerFilename = filename.toLowerCase();
  
  for (const genre of genres) {
    if (lowerFilename.includes(genre)) {
      return genre.charAt(0).toUpperCase() + genre.slice(1);
    }
  }
  
  return undefined;
};

// Extract series info from filename
const extractSeriesInfo = (filename) => {
  console.log('🔍 Extracting series info from:', filename);
  // Pattern: SeriesName.S01E01.ext or SeriesName S01E01.ext
  const match = filename.match(/^(.+?)[._\s]([Ss]\d{1,2}[Ee]\d{1,2})/);
  if (match) {
    const seriesName = match[1].replace(/[._-]/g, ' ').trim();
    const episodeCode = match[2].toUpperCase();
    const seasonMatch = episodeCode.match(/S(\d{1,2})/);
    const episodeMatch = episodeCode.match(/E(\d{1,2})/);
    
    const result = {
      seriesTitle: seriesName,
      seasonNumber: seasonMatch ? parseInt(seasonMatch[1]) : 1,
      episodeNumber: episodeMatch ? parseInt(episodeMatch[1]) : 1,
      episodeCode
    };
    console.log('✅ Series info extracted:', result);
    return result;
  }
  console.log('❌ No series pattern found in:', filename);
  return null;
};

// Extract sequel info from movie filename
const extractSequelInfo = (filename) => {
  // Enhanced patterns to detect more sequel formats
  const patterns = [
    /^(.+?)\s+(\d+)(?:\s|$)/, // "Movie 2"
    /^(.+?)\s+(II|III|IV|V|VI|VII|VIII|IX|X)(?:\s|$)/, // "Movie II"
    /^(.+?)\s+Part\s+(\d+)(?:\s|$)/i, // "Movie Part 2"
    /^(.+?)\s+Chapter\s+(\d+)(?:\s|$)/i, // "Movie Chapter 2"
    /^(.+?)\s+Volume\s+(\d+)(?:\s|$)/i, // "Movie Volume 2"
    /^(.+?)\s*:\s*(.+)$/, // "Movie: Subtitle" - treat as potential sequel
    /^(.+?)\s*[-–—]\s*(.+)$/, // "Movie - Subtitle" - treat as potential sequel
  ];
  
  // First, try the explicit numbering patterns
  for (let i = 0; i < 5; i++) {
    const pattern = patterns[i];
    const match = filename.match(pattern);
    if (match) {
      const title = match[1].trim();
      let sequelNumber = match[2];
      
      // Convert Roman numerals to numbers
      if (isNaN(sequelNumber)) {
        const romanToNum = { 'I': 1, 'II': 2, 'III': 3, 'IV': 4, 'V': 5, 'VI': 6, 'VII': 7, 'VIII': 8, 'IX': 9, 'X': 10 };
        sequelNumber = romanToNum[sequelNumber] || 1;
      }
      
      return {
        baseTitle: title,
        sequelNumber: parseInt(sequelNumber)
      };
    }
  }
  
  // Handle subtitle patterns (could indicate sequels)
  const subtitlePatterns = [patterns[5], patterns[6]]; // : and - patterns
  for (const pattern of subtitlePatterns) {
    const match = filename.match(pattern);
    if (match) {
      const baseTitle = match[1].trim();
      const subtitle = match[2].trim();
      
      // Check if subtitle contains sequel indicators
      const sequelIndicators = /\b(reloaded|revolutions|awakens|rises|returns|revenge|reborn|resurrection|origins|beginning|genesis|ultimate|final|last|forever|legacy|evolution|revolution|redemption|reckoning)\b/i;
      
      if (sequelIndicators.test(subtitle)) {
        return {
          baseTitle: baseTitle,
          sequelNumber: 1, // Default to 1, will be handled by grouping logic
          hasSubtitle: true,
          subtitle: subtitle
        };
      }
    }
  }
  
  return null;
};

// Detect potential saga patterns by analyzing similar titles
const detectSagaPatterns = (mediaItems) => {
  const titleGroups = new Map();
  
  mediaItems.forEach(item => {
    const cleanTitle = item.originalFileName
      .toLowerCase()
      .replace(/\b(19|20)\d{2}\b/g, '') // Remove years
      .replace(/[\[\(].*?[\]\)]/g, '') // Remove brackets
      .replace(/[^a-z0-9\s]/g, ' ') // Replace special chars
      .replace(/\s+/g, ' ')
      .trim();
    
    // Look for similar titles (first 3 words or 70% similarity)
    const titleWords = cleanTitle.split(' ').slice(0, 3).join(' ');
    
    for (const [existingTitle, items] of titleGroups) {
      const similarity = calculateStringSimilarity(titleWords, existingTitle);
      if (similarity > 0.7) {
        items.push(item);
        return;
      }
    }
    
    titleGroups.set(titleWords, [item]);
  });
  
  // Return groups with more than one item (potential sagas)
  return Array.from(titleGroups.entries())
    .filter(([_, items]) => items.length > 1)
    .map(([title, items]) => ({ baseTitle: title, items }));
};

// Calculate string similarity using Levenshtein distance
const calculateStringSimilarity = (str1, str2) => {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;
  
  if (longer.length === 0) return 1.0;
  
  const editDistance = levenshteinDistance(longer, shorter);
  return (longer.length - editDistance) / longer.length;
};

// Levenshtein distance calculation
const levenshteinDistance = (str1, str2) => {
  const matrix = Array(str2.length + 1).fill().map(() => Array(str1.length + 1).fill(0));
  
  for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
  for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;
  
  for (let j = 1; j <= str2.length; j++) {
    for (let i = 1; i <= str1.length; i++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j - 1][i] + 1,     // deletion
        matrix[j][i - 1] + 1,     // insertion
        matrix[j - 1][i - 1] + cost // substitution
      );
    }
  }
  
  return matrix[str2.length][str1.length];
};

// Group media items by series or sequel
const groupMediaItems = (mediaItems, category) => {
  console.log(`🎬 Grouping ${mediaItems.length} items for category: ${category}`);
  
  // Normalize category name (both 'series'/'Series' and 'films'/'Films' should work)
  const normalizedCategory = category.toLowerCase();
  if (normalizedCategory !== 'series' && normalizedCategory !== 'films') {
    return mediaItems;
  }
  
  const groups = new Map();
  const ungrouped = [];
  
  // For films, detect potential sagas first
  let potentialSagas = [];
  if (normalizedCategory === 'films') {
    potentialSagas = detectSagaPatterns(mediaItems);
    console.log(`🎯 Detected ${potentialSagas.length} potential sagas:`, potentialSagas.map(s => s.baseTitle));
  }
  
  mediaItems.forEach(item => {
    console.log(`🔄 Processing item: ${item.title}`);
    if (normalizedCategory === 'series') {
      const seriesInfo = extractSeriesInfo(item.originalFileName || item.title);
      if (seriesInfo) {
        const groupKey = seriesInfo.seriesTitle.toLowerCase();
        if (!groups.has(groupKey)) {
          groups.set(groupKey, {
            ...item,
            id: `series_${groupKey.replace(/\s+/g, '_')}`,
            title: seriesInfo.seriesTitle,
            seriesTitle: seriesInfo.seriesTitle,
            isGroup: true,
            episodes: [],
            episodeCount: 0
          });
        }
        
        const group = groups.get(groupKey);
        const episodeId = `${seriesInfo.seasonNumber.toString().padStart(2, '0')}${seriesInfo.episodeNumber.toString().padStart(2, '0')}`;
        group.episodes.push({
          ...item,
          id: generateUniqueId(item.originalFileName || item.title, 'episode', episodeId),
          seasonNumber: seriesInfo.seasonNumber,
          episodeNumber: seriesInfo.episodeNumber,
          seriesTitle: seriesInfo.seriesTitle
        });
        group.episodeCount = group.episodes.length;
      } else {
        ungrouped.push(item);
      }
    } else if (normalizedCategory === 'films') {
      let isGrouped = false;
      
      // First, try explicit sequel detection
      const sequelInfo = extractSequelInfo(item.originalFileName || item.title);
      if (sequelInfo) {
        const groupKey = sequelInfo.baseTitle.toLowerCase();
        if (!groups.has(groupKey)) {
          groups.set(groupKey, {
            ...item,
            id: `sequel_${groupKey.replace(/\s+/g, '_')}`,
            title: sequelInfo.baseTitle,
            isGroup: true,
            episodes: [],
            episodeCount: 0
          });
        }
        
        const group = groups.get(groupKey);
        group.episodes.push({
          ...item,
          id: generateUniqueId(item.originalFileName || item.title, 'film', sequelInfo.sequelNumber),
          sequelNumber: sequelInfo.sequelNumber,
          subtitle: sequelInfo.subtitle || null,
          hasSubtitle: sequelInfo.hasSubtitle || false
        });
        group.episodeCount = group.episodes.length;
        isGrouped = true;
      } else {
        // Check if this item belongs to a detected saga
        for (const saga of potentialSagas) {
          if (saga.items.includes(item)) {
            const groupKey = saga.baseTitle.toLowerCase();
            if (!groups.has(groupKey)) {
              groups.set(groupKey, {
                ...item,
                id: `saga_${groupKey.replace(/\s+/g, '_')}`,
                title: formatTitle(saga.baseTitle),
                isGroup: true,
                episodes: [],
                episodeCount: 0
              });
            }
            
            const group = groups.get(groupKey);
            // Assign sequential numbers to saga items
            const sagaNumber = saga.items.indexOf(item) + 1;
            group.episodes.push({
              ...item,
              id: generateUniqueId(item.originalFileName || item.title, 'film', sagaNumber),
              sequelNumber: sagaNumber,
              isSagaItem: true
            });
            group.episodeCount = group.episodes.length;
            isGrouped = true;
            break;
          }
        }
      }
      
      if (!isGrouped) {
        ungrouped.push(item);
      }
    }
  });
  
  // Sort episodes within groups
  groups.forEach(group => {
    if (normalizedCategory === 'series') {
      group.episodes.sort((a, b) => {
        if (a.seasonNumber !== b.seasonNumber) {
          return a.seasonNumber - b.seasonNumber;
        }
        return a.episodeNumber - b.episodeNumber;
      });
    } else {
      group.episodes.sort((a, b) => (a.sequelNumber || 1) - (b.sequelNumber || 1));
    }
  });
  
  // Combine grouped and ungrouped items
  const result = [...Array.from(groups.values()), ...ungrouped];
  
  // Sort final result
  return result.sort((a, b) => {
    const normalizeTitle = (title) => title
      .toLowerCase()
      .replace(/^(the|le|la|les|un|une|des|\[.*?\])\s+/i, '')
      .replace(/[^\w\s]/g, '')
      .trim();
    
    const titleA = normalizeTitle(a.title);
    const titleB = normalizeTitle(b.title);
    
    return titleA.localeCompare(titleB, 'fr', { sensitivity: 'base' });
  });
};

// Serve React app for all other routes
app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});


app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`SSH server: ${SSH_SERVER}`);
  console.log(`SSH path: ${SSH_PATH}`);
});