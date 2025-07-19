import express from 'express';
import { exec } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Media configuration
const MEDIA_PATH = process.env.MEDIA_PATH || path.join(__dirname, 'test-media');
const SSH_SERVER = process.env.SSH_SERVER || 'ssh.thimotefetu.fr';
const SSH_PATH = process.env.SSH_PATH || '/mnt/streaming';
const USE_LOCAL_FILES = process.env.USE_LOCAL_FILES === 'true' || false;
console.log('USE_LOCAL_FILES:', USE_LOCAL_FILES);
console.log('MEDIA_PATH:', MEDIA_PATH);

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
                 ['Films', 'Séries', 'Musiques'].includes(item);
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
        .filter(dir => ['Films', 'Séries', 'Musiques'].includes(dir));
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
        name: 'Séries',
        type: 'Séries',
        items: [
          {
            id: '2',
            title: 'Drama Series',
            path: '/Séries/drama_series_s01e01.mp4',
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
app.get('/api/category/:type', async (req, res) => {
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
            } else if (/\.(mp4|mkv|avi|mov|mp3|flac|wav)$/i.test(file)) {
              fileList.push(filePath);
            }
          });
          return fileList;
        };
        
        files = getAllFiles(categoryPath);
      }
    } else {
      // Use SSH
      const command = `ssh -i ~/.ssh/streaming_key -o PasswordAuthentication=no -o StrictHostKeyChecking=no ${SSH_SERVER} "find ${SSH_PATH}/${category} -type f \\( -name '*.mp4' -o -name '*.mkv' -o -name '*.avi' -o -name '*.mov' -o -name '*.mp3' -o -name '*.flac' -o -name '*.wav' \\)"`;
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
      // Serve file directly from local filesystem
      const localFilePath = path.join(MEDIA_PATH, filePath);
      console.log('Serving local file:', localFilePath);
      
      if (fs.existsSync(localFilePath)) {
        res.sendFile(localFilePath);
      } else {
        res.status(404).send('File not found');
      }
    } else {
      // Development: serve via SSH (slow but works)
      res.setHeader('Accept-Ranges', 'bytes');
      res.setHeader('Cache-Control', 'no-cache');
      
      const streamCommand = `ssh -i ~/.ssh/streaming_key -o PasswordAuthentication=no -o StrictHostKeyChecking=no ${SSH_SERVER} "cat '${filePath}'"`;
      console.log('Executing:', streamCommand);
      
      const child = exec(streamCommand, { timeout: 300000 });
      
      child.stdout.on('data', (chunk) => {
        res.write(chunk);
      });
      
      child.stdout.on('end', () => {
        res.end();
      });
      
      child.on('error', (error) => {
        console.error('Stream error:', error);
        if (!res.headersSent) {
          res.status(500).send('Stream error: ' + error.message);
        }
      });
      
      child.stderr.on('data', (data) => {
        console.error('SSH stderr:', data.toString());
      });
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
    case 'Séries':
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