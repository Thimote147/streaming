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