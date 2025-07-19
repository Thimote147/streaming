import express from 'express';
import { exec } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
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
            path: '/Films/action_movie.mp4',
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
            path: '/Series/drama_series_s01e01.mp4',
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
            path: '/Musiques/pop_album.mp3',
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

// Get content for a specific category
app.get('/api/:type', async (req, res) => {
  try {
    const { type } = req.params;
    const items = await getCategoryItems(type);
    res.json(items);
  } catch (error) {
    console.error(`Error fetching ${req.params.type} content:`, error);
    res.json([]);
  }
});

// Helper function to get items for a category
const getCategoryItems = async (category) => {
  try {
    let files = [];
    
    if (USE_LOCAL_FILES) {
      // Use local filesystem
      const categoryPath = path.join(MEDIA_PATH, category);
      
      if (fs.existsSync(categoryPath)) {
        const getAllFiles = (dir, fileList = []) => {
          const files = fs.readdirSync(dir);
          files.forEach(file => {
            const filePath = path.join(dir, file);
            if (fs.statSync(filePath).isDirectory()) {
              getAllFiles(filePath, fileList);
            } else if (/\.(mp4|webm)$/i.test(file)) {
              fileList.push(filePath);
            }
          });
          return fileList;
        };
        
        files = getAllFiles(categoryPath);
      }
    } else {
      // Use SSH
      const command = `ssh -i ~/.ssh/streaming_key -o PasswordAuthentication=no -o StrictHostKeyChecking=no ${SSH_SERVER} "find ${SSH_PATH}/${category} -type f \\( -name '*.mp4' -o -name '*.webm' \\)"`;
      const output = await executeSSH(command);
      files = output.split('\n').filter(line => line.trim());
    }
    
    const mediaItems = files.map((filePath, index) => {
      const fileName = filePath.split('/').pop() || '';
      const fileNameWithoutExt = fileName.split('.').slice(0, -1).join('.');
      
      // Convert local path to web path
      const webPath = USE_LOCAL_FILES ? 
        filePath.replace(MEDIA_PATH, '') : 
        filePath;
      
      return {
        id: `${category.toLowerCase()}_${index}`,
        title: formatTitle(fileNameWithoutExt),
        path: webPath,
        type: getMediaType(category),
        genre: extractGenre(fileName),
        year: extractYear(fileName),
        description: `${getMediaType(category)} - ${fileName}`
      };
    });
    
    return mediaItems.sort((a, b) => {
      // Normalize titles for proper alphabetical sorting
      const normalizeTitle = (title) => title
        .toLowerCase()
        .replace(/^(the|le|la|les|un|une|des|\[.*?\])\s+/i, '') // Remove articles and brackets
        .replace(/[^\w\s]/g, '') // Remove special characters
        .trim();
      
      const titleA = normalizeTitle(a.title);
      const titleB = normalizeTitle(b.title);
      
      return titleA.localeCompare(titleB, 'fr', { sensitivity: 'base' });
    });
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

// Get movie poster from TMDB with multiple search strategies
app.get('/api/poster/:title', async (req, res) => {
  try {
    const { title } = req.params;
    const { year } = req.query;
    
    if (!TMDB_API_KEY) {
      console.error('❌ TMDB API key not found in environment variables');
      console.error('Available env vars:', Object.keys(process.env).filter(key => key.includes('TMDB')));
      return res.status(500).json({ error: 'TMDB API key not configured' });
    }
    
    const originalTitle = decodeURIComponent(title);
    console.log('🔍 Searching for movie:', originalTitle);
    const searchVariants = generateSearchVariants(originalTitle);
    
    let movieResult = null;
    
    // Try each variant until we find a result
    for (const variant of searchVariants) {
      const cleanTitle = cleanMovieTitle(variant);
      const searchQuery = encodeURIComponent(cleanTitle);
      const yearParam = year ? `&year=${year}` : '';
      
      // Try both English and French searches
      const searches = [
        `https://api.themoviedb.org/3/search/movie?api_key=${TMDB_API_KEY}&query=${searchQuery}${yearParam}&language=en-US`,
        `https://api.themoviedb.org/3/search/movie?api_key=${TMDB_API_KEY}&query=${searchQuery}${yearParam}&language=fr-FR`
      ];
      
      for (const url of searches) {
        try {
          const response = await fetch(url);
          if (response.ok) {
            const data = await response.json();
            if (data.results && data.results.length > 0) {
              movieResult = data.results[0];
              break;
            }
          }
        } catch (searchError) {
          console.error('Search error:', searchError);
        }
      }
      
      if (movieResult) break;
    }
    
    if (movieResult) {
      // Get French translation and French posters if available
      let frenchTitle = movieResult.title;
      let frenchOverview = movieResult.overview;
      let frenchPosterUrl = movieResult.poster_path ? `https://image.tmdb.org/t/p/w500${movieResult.poster_path}` : null;
      
      try {
        // Get French movie details
        const detailsUrl = `https://api.themoviedb.org/3/movie/${movieResult.id}?api_key=${TMDB_API_KEY}&language=fr-FR`;
        const detailsResponse = await fetch(detailsUrl);
        if (detailsResponse.ok) {
          const frenchData = await detailsResponse.json();
          if (frenchData.title && frenchData.title.trim()) {
            frenchTitle = frenchData.title;
          }
          if (frenchData.overview && frenchData.overview.trim()) {
            frenchOverview = frenchData.overview;
          }
        }

        // Get French posters
        const imagesUrl = `https://api.themoviedb.org/3/movie/${movieResult.id}/images?api_key=${TMDB_API_KEY}`;
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

      const posterUrl = movieResult.poster_path ? `https://image.tmdb.org/t/p/w500${movieResult.poster_path}` : null;
      const backdropUrl = movieResult.backdrop_path ? `https://image.tmdb.org/t/p/w1280${movieResult.backdrop_path}` : null;
      
      res.json({ 
        poster: posterUrl, // Original poster (English)
        frenchPoster: frenchPosterUrl, // French poster
        backdrop: backdropUrl,
        title: movieResult.title, // Original title (English)
        frenchTitle: frenchTitle, // French title
        overview: movieResult.overview, // Original overview
        frenchOverview: frenchOverview, // French overview
        releaseDate: movieResult.release_date, // Format YYYY-MM-DD
        releaseYear: movieResult.release_date ? new Date(movieResult.release_date).getFullYear() : null,
        genres: movieResult.genre_ids || [],
        voteAverage: movieResult.vote_average,
        voteCount: movieResult.vote_count,
        adult: movieResult.adult,
        popularity: movieResult.popularity,
        tmdbId: movieResult.id
      });
    } else {
      res.json({ poster: null, frenchPoster: null, backdrop: null });
    }
  } catch (error) {
    console.error('Error fetching poster:', error);
    res.status(500).json({ error: 'Failed to fetch poster' });
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

// Search media
app.get('/api/search', async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) {
      return res.json([]);
    }
    
    const command = `ssh -i ~/.ssh/streaming_key -o PasswordAuthentication=no -o StrictHostKeyChecking=no ${SSH_SERVER} "find ${SSH_PATH} -type f -iname '*${q}*' \\( -name '*.mp4' -o -name '*.mkv' -o -name '*.avi' -o -name '*.mov' -o -name '*.mp3' -o -name '*.flac' -o -name '*.wav' \\) | head -10"`;
    const output = await executeSSH(command);
    
    const files = output.split('\n').filter(line => line.trim());
    
    const results = files.map((filePath, index) => {
      const fileName = filePath.split('/').pop() || '';
      const fileNameWithoutExt = fileName.split('.').slice(0, -1).join('.');
      const category = filePath.split('/').slice(-2, -1)[0];
      
      return {
        id: `search_${index}`,
        title: formatTitle(fileNameWithoutExt),
        path: filePath,
        type: getMediaType(category),
        genre: extractGenre(fileName),
        year: extractYear(fileName),
        description: `${getMediaType(category)} - ${fileName}`
      };
    });
    
    results.sort((a, b) => {
      // Normalize titles for proper alphabetical sorting
      const normalizeTitle = (title) => title
        .toLowerCase()
        .replace(/^(the|le|la|les|un|une|des|\[.*?\])\s+/i, '') // Remove articles and brackets
        .replace(/[^\w\s]/g, '') // Remove special characters
        .trim();
      
      const titleA = normalizeTitle(a.title);
      const titleB = normalizeTitle(b.title);
      
      return titleA.localeCompare(titleB, 'fr', { sensitivity: 'base' });
    });
    
    res.json(results);
  } catch (error) {
    console.error('Error searching media:', error);
    res.json([]);
  }
});

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
      if (['.mp4', '.webm'].includes(ext)) {
        res.sendFile(localFilePath);
      } else {
        res.status(415).send('Unsupported media type. Only MP4 and WebM files are supported.');
      }
    } else {
      // Serve MP4/WebM files via SSH
      const ext = path.extname(filePath).toLowerCase();
      
      if (['.mp4', '.webm'].includes(ext)) {
        const mimeTypes = {
          '.mp4': 'video/mp4',
          '.webm': 'video/webm'
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
        res.status(415).send('Unsupported media type. Only MP4 and WebM files are supported.');
      }
    }
  } catch (error) {
    console.error('Error in stream endpoint:', error);
    res.status(500).send('Error streaming file: ' + error.message);
  }
});

// Helper functions
const formatTitle = (filename) => {
  return filename
    .replace(/[._-]/g, ' ')
    .replace(/\b\w/g, l => l.toUpperCase())
    .replace(/\s+/g, ' ')
    .trim();
};

const getMediaType = (category) => {
  switch (category) {
    case 'Films':
      return 'movie';
    case 'Series':
      return 'series';
    case 'Musiques':
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

// Serve React app for all other routes
app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});


app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`SSH server: ${SSH_SERVER}`);
  console.log(`SSH path: ${SSH_PATH}`);
});