/**
 * Utility functions for URL manipulation
 */

/**
 * Cleans a title to make it URL-friendly by replacing special characters
 * and spaces with underscores
 * @param title - The title to clean
 * @returns The cleaned title suitable for use in URLs
 */
export const cleanTitleForUrl = (title: string): string => {
  return title
    .toLowerCase()
    .replace(/[^\w\s-]/g, '') // Remove special characters except spaces and hyphens
    .replace(/\s+/g, '_') // Replace spaces with underscores
    .replace(/_+/g, '_') // Replace multiple underscores with single underscore
    .replace(/^_|_$/g, ''); // Remove underscores at start/end
};

/**
 * Extracts the base title without sequel numbers for URL routing
 * @param title - The full title (e.g., "John Wick 1", "John Wick Chapter 2")
 * @returns Object with base title and sequel number
 */
export const extractTitleAndSequel = (title: string): { baseTitle: string; sequelNumber?: number } => {
  // Extract trailing number
  const numberMatch = title.match(/\s+(\d+)$/);
  if (numberMatch) {
    const baseTitle = title.replace(/\s+\d+$/, '');
    return { 
      baseTitle: cleanTitleForUrl(baseTitle), 
      sequelNumber: parseInt(numberMatch[1]) 
    };
  }
  
  // Extract chapter/part numbers
  const chapterMatch = title.match(/\s+(chapter|part|volume)\s+(\d+)$/gi);
  if (chapterMatch) {
    const baseTitle = title.replace(/\s+(chapter|part|volume)\s+\d+$/gi, '');
    const numberStr = chapterMatch[0].match(/\d+$/)?.[0];
    return { 
      baseTitle: cleanTitleForUrl(baseTitle), 
      sequelNumber: numberStr ? parseInt(numberStr) : undefined 
    };
  }
  
  return { baseTitle: cleanTitleForUrl(title) };
};

/**
 * Extracts the clean title from a generated media ID
 * IDs have the format: {category}_{clean_title}_{hash}
 * @param id - The media ID (e.g., "musiques_safe_and_sound_4e0d80")
 * @returns The clean title (e.g., "safe_and_sound")
 */
export const extractTitleFromId = (id: string): string => {
  // Remove category prefix (e.g., "musiques_", "films_", etc.)
  const withoutCategory = id.replace(/^(musiques|films|series|episode|film|sequel|saga)_/, '');
  
  // Remove hash suffix (6 characters at the end)
  const withoutHash = withoutCategory.replace(/_[a-f0-9]{6}$/, '');
  
  return withoutHash;
};