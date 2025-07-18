import type { MediaItem } from './api';

const SSH_SERVER = 'ssh.thimotefetu.fr';
const SSH_PATH = '/mnt/streaming';

export class SSHMediaService {
  private async executeSSHCommand(command: string): Promise<string> {
    try {
      const response = await fetch('/api/ssh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ command }),
      });
      
      if (!response.ok) {
        throw new Error(`SSH command failed: ${response.statusText}`);
      }
      
      return await response.text();
    } catch (error) {
      console.error('SSH command error:', error);
      throw error;
    }
  }

  async listDirectories(): Promise<string[]> {
    try {
      const command = `ssh ${SSH_SERVER} "ls -la ${SSH_PATH}"`;
      const output = await this.executeSSHCommand(command);
      
      const lines = output.split('\n').filter(line => line.trim());
      const directories = lines
        .filter(line => line.startsWith('d'))
        .map(line => line.split(/\s+/).pop())
        .filter((dir): dir is string => dir !== undefined && !dir.startsWith('.'))
        .filter(dir => ['Films', 'Séries', 'Musiques'].includes(dir));
      
      return directories;
    } catch (error) {
      console.error('Error listing directories:', error);
      return ['Films', 'Séries', 'Musiques'];
    }
  }

  async listMediaFiles(category: string): Promise<MediaItem[]> {
    try {
      const command = `ssh ${SSH_SERVER} "find ${SSH_PATH}/${category} -type f \\( -name '*.mp4' -o -name '*.mkv' -o -name '*.avi' -o -name '*.mov' -o -name '*.mp3' -o -name '*.flac' -o -name '*.wav' \\)"`;
      const output = await this.executeSSHCommand(command);
      
      const files = output.split('\n').filter(line => line.trim());
      
      return files.map((filePath, index) => {
        const fileName = filePath.split('/').pop() || '';
        const fileNameWithoutExt = fileName.split('.').slice(0, -1).join('.');
        
        return {
          id: `${category.toLowerCase()}_${index}`,
          title: this.formatTitle(fileNameWithoutExt),
          path: filePath,
          type: this.getMediaType(category),
          genre: this.extractGenre(fileName),
          year: this.extractYear(fileName),
          description: `${this.getMediaType(category)} - ${fileName}`
        };
      });
    } catch (error) {
      console.error(`Error listing ${category} files:`, error);
      return [];
    }
  }

  private formatTitle(filename: string): string {
    return filename
      .replace(/[._-]/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase())
      .replace(/\s+/g, ' ')
      .trim();
  }

  private getMediaType(category: string): 'movie' | 'series' | 'music' {
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
  }

  private extractYear(filename: string): number | undefined {
    const yearMatch = filename.match(/\b(19|20)\d{2}\b/);
    return yearMatch ? parseInt(yearMatch[0]) : undefined;
  }

  private extractGenre(filename: string): string | undefined {
    const genres = ['action', 'comedy', 'drama', 'horror', 'sci-fi', 'thriller', 'romance', 'animation'];
    const lowerFilename = filename.toLowerCase();
    
    for (const genre of genres) {
      if (lowerFilename.includes(genre)) {
        return genre.charAt(0).toUpperCase() + genre.slice(1);
      }
    }
    
    return undefined;
  }
}

export const sshMediaService = new SSHMediaService();