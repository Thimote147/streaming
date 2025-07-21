import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, User, Menu, X, LogIn, Play } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { streamingAPI } from '../services/api';
import { cleanTitleForUrl } from '../utils/urlUtils';
import type { MediaItem } from '../services/api';

interface HeaderProps {
  onShowAuth: () => void;
  onShowProfile: () => void;
  isAuthenticated: boolean;
  showAuthButton?: boolean;
}

const Header: React.FC<HeaderProps> = ({ onShowAuth, onShowProfile, isAuthenticated, showAuthButton = true }) => {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<MediaItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobileSearchFocused, setIsMobileSearchFocused] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { profile } = useAuth();
  const searchRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const categories = [
    { id: '/', name: 'Accueil', path: '/' },
    { id: 'Films', name: 'Films', path: '/films' },
    { id: 'Series', name: 'Series', path: '/series' },
    { id: 'Musiques', name: 'Musiques', path: '/musiques' }
  ];

  // Debounced search function
  const debouncedSearch = useCallback((query: string) => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
    debounceTimeoutRef.current = setTimeout(() => {
      performSearch(query);
    }, 300); // 300ms delay
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Extract series name from title (remove episode info)
  const extractSeriesName = (title: string): string => {
    // Remove common episode patterns like "S01E01", "Season 1 Episode 1", etc.
    return title
      .replace(/\s*-?\s*S\d+E\d+.*$/i, '') // Remove S01E01 and everything after
      .replace(/\s*-?\s*Season\s+\d+.*$/i, '') // Remove Season X and everything after
      .replace(/\s*-?\s*Saison\s+\d+.*$/i, '') // Remove Saison X and everything after
      .replace(/\s*-?\s*\d+x\d+.*$/i, '') // Remove 1x01 format
      .replace(/\s*-?\s*Episode\s+\d+.*$/i, '') // Remove Episode X
      .replace(/\s*-?\s*Épisode\s+\d+.*$/i, '') // Remove Épisode X
      .trim();
  };

  // Group series episodes together
  const groupSearchResults = async (results: MediaItem[]) => {
    const groupedResults: MediaItem[] = [];
    const seriesMap = new Map<string, MediaItem>();

    results.forEach(media => {
      if (media.type === 'series') {
        // For series, extract the clean series name
        const rawTitle = media.seriesTitle || media.title;
        const seriesKey = extractSeriesName(rawTitle);
        
        if (!seriesMap.has(seriesKey)) {
          // Create a grouped series entry
          const groupedSeries: MediaItem = {
            ...media,
            id: `series_${seriesKey.replace(/\s+/g, '_')}`,
            title: seriesKey, // This will be the clean series name for display
            originalTitle: media.title, // Preserve original title for navigation
            frenchTitle: seriesKey,
            isGroup: true,
            episodes: [media],
            episodeCount: 1
          };
          seriesMap.set(seriesKey, groupedSeries);
          groupedResults.push(groupedSeries);
        } else {
          // Add episode to existing series group
          const existingSeries = seriesMap.get(seriesKey)!;
          existingSeries.episodes = existingSeries.episodes || [];
          existingSeries.episodes.push(media);
          existingSeries.episodeCount = (existingSeries.episodeCount || 0) + 1;
        }
      } else {
        // For movies and music, keep as individual results
        groupedResults.push(media);
      }
    });

    // Post-process to fetch posters for grouped series
    const seriesWithPosters = await Promise.all(
      groupedResults.map(async (result) => {
        if (result.isGroup && result.episodes && result.episodes.length > 0) {
          try {
            // Get poster using the same API as the details page
            const posterData = await streamingAPI.fetchMovieData(result.title, undefined, 'series');
            if (posterData) {
              result.poster = posterData.frenchPoster || posterData.poster || undefined;
              result.frenchPoster = posterData.frenchPoster;
              result.backdrop = posterData.backdrop || undefined;
              result.frenchTitle = posterData.frenchTitle || result.title;
              result.frenchDescription = posterData.frenchDescription;
            }
          } catch (error) {
            console.log(`Erreur récupération poster pour ${result.title}:`, error);
          }
        }
        return result;
      })
    );

    return seriesWithPosters;
  };

  // Perform actual search
  const performSearch = async (query: string) => {
    if (!query.trim() || query.length < 1) {
      setSearchResults([]);
      setShowSearchResults(false);
      setIsSearching(false);
      return;
    }

    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller
    abortControllerRef.current = new AbortController();

    try {
      setIsSearching(true);
      const results = await streamingAPI.searchMedia(query);
      const groupedResults = await groupSearchResults(results);
      setSearchResults(groupedResults.slice(0, 5)); // Limit to 5 results for dropdown
      setShowSearchResults(true);
    } catch (error: unknown) {
      if (error instanceof Error && error.name !== 'AbortError') {
        console.error('Search error:', error);
        setSearchResults([]);
      }
    } finally {
      setIsSearching(false);
    }
  };

  // Handle search input change
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    if (value.trim()) {
      setIsSearching(true);
      setShowSearchResults(true); // Show results immediately when typing
      debouncedSearch(value);
    } else {
      setSearchResults([]);
      setShowSearchResults(false);
      setIsSearching(false);
    }
  };

  // Handle clicking outside search
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSearchResults(false);
        setIsMobileSearchFocused(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Check if we're on mobile
  const [isMobile, setIsMobile] = useState(false);
  const [isLargeScreen, setIsLargeScreen] = useState(false);
  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 768);
      setIsLargeScreen(window.innerWidth >= 1024); // lg breakpoint
    };
    
    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);


  // Handle search result selection
  const handleResultSelect = (media: MediaItem) => {
    setShowSearchResults(false);
    setSearchQuery('');
    setIsSearchOpen(false);
    
    // For grouped series, use the series name (not episode title)
    if (media.isGroup && media.episodes && media.episodes.length > 0) {
      const route = media.type === 'series' ? 'series' : 'films';
      // Use the extracted series name, not the full episode title
      const seriesName = extractSeriesName(media.episodes[0].title);
      const cleanSeriesName = cleanTitleForUrl(seriesName);
      navigate(`/${route}/${cleanSeriesName}`);
    } else {
      // For individual items, use the original title (not the french one)
      const route = media.type === 'movie' ? 'films' : media.type === 'series' ? 'series' : media.type === 'music' ? 'musiques' : 'films';
      // Try to use the original title from search results, fallback to current title
      const originalTitle = (media as MediaItem & { originalTitle?: string }).originalTitle || media.title;
      const cleanTitle = cleanTitleForUrl(originalTitle);
      navigate(`/${route}/${cleanTitle}`);
    }
  };

  // Handle play button click (goes to player)
  const handlePlayMedia = (e: React.MouseEvent, media: MediaItem) => {
    e.stopPropagation();
    setShowSearchResults(false);
    setSearchQuery('');
    setIsSearchOpen(false);
    
    // For grouped series, play the first episode
    if (media.isGroup && media.episodes && media.episodes.length > 0) {
      navigate(`/player/${encodeURIComponent(media.episodes[0].id)}`);
    } else {
      // For music files, use clean URLs
      if (media.type === 'music') {
        navigate(`/player/musiques/${media.id}`);
      } else {
        // For individual video media items, play directly
        navigate(`/player/${encodeURIComponent(media.id)}`);
      }
    }
  };

  // Handle "see all results"
  const handleSeeAllResults = () => {
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
      setShowSearchResults(false);
      setSearchQuery('');
      setIsSearchOpen(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
      setIsSearchOpen(false);
      setIsMobileMenuOpen(false);
    }
  };

  const isActiveRoute = (path: string) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname === path;
  };

  return (
    <motion.header 
      className="fixed top-0 left-0 right-0 z-50 backdrop-blur-sm bg-gradient-to-b from-black/90 via-black/50 to-transparent transition-all duration-500 ease-in-out"
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
    >
      <div className="container mx-auto px-4 py-4 transition-all duration-500 ease-in-out">
        <div className="flex items-center justify-between transition-all duration-500 ease-in-out">
          {/* Logo - Always visible */}
          <Link to="/">
            <motion.div 
              className="text-red-600 text-2xl md:text-3xl font-bold cursor-pointer hover:scale-105 transition-all duration-500 ease-in-out"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
            >
              STREAMING
            </motion.div>
          </Link>

          {/* Desktop Navigation */}
          <AnimatePresence>
            {!(isMobile && isMobileSearchFocused) && isAuthenticated && (isLargeScreen || !isSearchOpen) && (
              <motion.nav 
                className="hidden md:flex space-x-8 transition-all duration-500 ease-in-out"
                initial={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                {categories.map((category) => (
                  <Link key={category.id} to={category.path}>
                    <motion.div
                      className={`text-white hover:text-gray-300 transition-all duration-500 ease-in-out font-medium ${
                        isActiveRoute(category.path) ? 'font-semibold text-red-400' : ''
                      }`}
                      whileHover={{ scale: 1.05, y: -2 }}
                      whileTap={{ scale: 0.95 }}
                      transition={{ type: "spring", stiffness: 400, damping: 20 }}
                    >
                      {category.name}
                    </motion.div>
                  </Link>
                ))}
              </motion.nav>
            )}
          </AnimatePresence>

          {/* Desktop Actions */}
          <AnimatePresence>
            {!(isMobile && isMobileSearchFocused) && (
              <motion.div 
                className="hidden md:flex items-center space-x-2 lg:space-x-4 transition-all duration-500 ease-in-out"
                initial={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.2 }}
              >
            {/* Search - Only show when authenticated */}
            {isAuthenticated && (
              <div className="relative" ref={searchRef}>
                {isSearchOpen ? (
                  <motion.div
                    className="relative"
                    initial={{ width: 0, opacity: 0 }}
                    animate={{ width: 'auto', opacity: 1 }}
                    exit={{ width: 0, opacity: 0 }}
                    transition={{ duration: 0.5, ease: "easeInOut" }}
                  >
                    <form onSubmit={handleSearchSubmit} className="flex items-center">
                      <div className="relative">
                        <input
                          type="text"
                          value={searchQuery}
                          onChange={(e) => handleSearchChange(e.target.value)}
                          placeholder="Rechercher..."
                          className="bg-black/70 border border-gray-600 rounded-l px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-white transition-all duration-500 ease-in-out w-48 lg:w-64"
                          autoFocus
                        />
                        {isSearching && (
                          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          </div>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setIsSearchOpen(false);
                          setShowSearchResults(false);
                          setSearchQuery('');
                        }}
                        className="bg-black/70 border border-gray-600 border-l-0 rounded-r px-3 py-2 text-white hover:bg-gray-700 transition-all duration-500 ease-in-out"
                      >
                        <X size={20} />
                      </button>
                    </form>

                    {/* Search Results Dropdown */}
                    <AnimatePresence>
                      {showSearchResults && (searchResults.length > 0 || searchQuery.trim().length >= 1) && (
                        <motion.div
                          initial={{ opacity: 0, y: 5 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 5 }}
                          transition={{ duration: 0.15 }}
                          className="absolute top-full left-0 right-0 mt-2 bg-black/60 backdrop-blur-xl rounded-2xl shadow-2xl border border-gray-700/20 z-50 max-h-80 overflow-hidden"
                        >
                          {searchResults.length > 0 ? (
                            <div className="divide-y divide-gray-700/20">
                              {searchResults.map((media, index) => (
                                <motion.div
                                  key={media.id}
                                  initial={{ opacity: 0, y: 10 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  transition={{ delay: index * 0.03 }}
                                  onClick={() => handleResultSelect(media)}
                                  className="flex items-center p-4 hover:bg-gray-800/50 cursor-pointer transition-all duration-200 group"
                                >
                                  {media.poster ? (
                                    <img
                                      src={media.poster}
                                      alt={media.frenchTitle || media.title}
                                      className="w-12 h-16 object-cover rounded-xl mr-4 flex-shrink-0 shadow-lg"
                                    />
                                  ) : (
                                    <div className="w-12 h-16 bg-gradient-to-br from-gray-700 to-gray-800 rounded-xl mr-4 flex-shrink-0 flex items-center justify-center shadow-lg">
                                      <Play size={18} className="text-gray-300" />
                                    </div>
                                  )}
                                  <div className="flex-1 min-w-0 mr-3">
                                    <h4 className="text-white font-semibold text-sm truncate group-hover:text-red-400 transition-colors">
                                      {media.frenchTitle || media.title}
                                    </h4>
                                    <p className="text-gray-400 text-xs truncate mt-1">
                                      {media.type === 'movie' ? 'Film' : media.type === 'series' ? 'Série' : 'Musique'} 
                                      {media.isGroup && media.episodeCount && ` • ${media.episodeCount} épisode${media.episodeCount > 1 ? 's' : ''}`}
                                      {!media.isGroup && media.year && ` • ${media.year}`}
                                    </p>
                                  </div>
                                  <button 
                                    onClick={(e) => handlePlayMedia(e, media)}
                                    className="p-3 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 rounded-full transition-all opacity-0 group-hover:opacity-100 transform scale-90 group-hover:scale-100 duration-200 shadow-lg"
                                    title="Lire"
                                  >
                                    <Play size={14} className="text-white fill-white" />
                                  </button>
                                </motion.div>
                              ))}
                              {searchQuery.trim() && (
                                <div
                                  onClick={handleSeeAllResults}
                                  className="p-4 text-center hover:bg-gray-800/50 cursor-pointer transition-all duration-200 border-t border-gray-700/20"
                                >
                                  <span className="text-red-400 hover:text-red-300 font-semibold text-sm transition-colors">
                                    Voir tous les résultats
                                  </span>
                                </div>
                              )}
                            </div>
                          ) : searchQuery.trim().length >= 1 && !isSearching ? (
                            <div className="p-6 text-center">
                              <div className="mb-2">
                                <Search size={24} className="text-gray-500 mx-auto" />
                              </div>
                              <p className="text-gray-400 text-sm">Aucun résultat pour "{searchQuery}"</p>
                            </div>
                          ) : null}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                ) : (
                  <motion.button
                    onClick={() => setIsSearchOpen(true)}
                    className="text-white hover:text-gray-300 transition-all duration-500 ease-in-out"
                    whileHover={{ scale: 1.1, rotate: 5 }}
                    whileTap={{ scale: 0.9 }}
                    transition={{ type: "spring", stiffness: 400, damping: 20 }}
                  >
                    <Search size={24} />
                  </motion.button>
                )}
              </div>
            )}

            {/* Profile/Auth */}
            {isAuthenticated ? (
              <div className="flex items-center space-x-3 transition-all duration-500 ease-in-out">
                <span className="text-white text-sm transition-all duration-500 ease-in-out">
                  <span className="hidden lg:inline">Bonjour, </span>
                  <span className="font-medium">{profile?.username}</span>
                </span>
                <motion.button 
                  onClick={onShowProfile}
                  className="text-white hover:text-gray-300 transition-all duration-500 ease-in-out"
                  whileHover={{ scale: 1.1, y: -2 }}
                  whileTap={{ scale: 0.9 }}
                  transition={{ type: "spring", stiffness: 400, damping: 20 }}
                >
                  <User size={24} />
                </motion.button>
              </div>
            ) : showAuthButton ? (
              <motion.button 
                onClick={onShowAuth}
                className="flex items-center space-x-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-all duration-500 ease-in-out"
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
                transition={{ type: "spring", stiffness: 300, damping: 25 }}
              >
                <LogIn size={20} />
                <span className="hidden lg:block">Connexion</span>
              </motion.button>
            ) : null}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Mobile Menu Button - Always visible when authenticated or showing auth button */}
          {(isAuthenticated || showAuthButton) && (
            <button
              className="md:hidden text-white transition-all duration-500 ease-in-out"
              onClick={() => {
                if (isMobileSearchFocused) {
                  setIsMobileSearchFocused(false);
                  setShowSearchResults(false);
                  setSearchQuery('');
                }
                setIsMobileMenuOpen(!isMobileMenuOpen);
              }}
            >
              {isMobileSearchFocused || isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          )}
        </div>

        {/* Mobile Search - Show only when mobile menu is open OR when search is actively focused */}
        <AnimatePresence mode="wait">
          {isAuthenticated && isMobile && (isMobileMenuOpen || isMobileSearchFocused) && (
            <motion.div 
              className="md:hidden mt-4 relative overflow-visible" 
              ref={searchRef}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ 
                duration: 0.15, 
                ease: "easeOut"
              }}
              layout
            >
            <div className="flex items-center">
              {/* Close button when in search mode */}
              {isMobileSearchFocused && (
                <button
                  onClick={() => {
                    setIsMobileSearchFocused(false);
                    setShowSearchResults(false);
                    setSearchQuery('');
                    setIsMobileMenuOpen(true);
                  }}
                  className="mr-3 text-white hover:text-gray-300 transition-colors"
                >
                  <X size={24} />
                </button>
              )}
              
              <form onSubmit={handleSearchSubmit} className="flex flex-1">
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    placeholder="Rechercher..."
                    className="w-full bg-black/70 border border-gray-600 rounded px-3 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all"
                    onFocus={() => {
                      setIsMobileSearchFocused(true);
                      // Show results if there's already a query
                      if (searchQuery.trim()) {
                        setShowSearchResults(true);
                      }
                    }}
                    onBlur={() => {
                      // Ne ferme que si on ne clique pas dans le dropdown
                      setTimeout(() => {
                        if (!searchRef.current?.contains(document.activeElement)) {
                          setIsMobileSearchFocused(false);
                        }
                      }, 100);
                    }}
                  />
                  {isSearching && (
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    </div>
                  )}
                </div>
              </form>
            </div>

            {/* Mobile Search Results */}
            <AnimatePresence>
              {showSearchResults && (searchResults.length > 0 || searchQuery.trim().length >= 1 || isSearching) && (
                <motion.div
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 5 }}
                  transition={{ duration: 0.15 }}
                  className={`absolute top-full left-0 right-0 mt-2 bg-black/60 backdrop-blur-xl rounded-2xl shadow-2xl border border-gray-700/20 z-[60] overflow-hidden ${
                    isMobileSearchFocused ? 'max-h-96' : 'max-h-72'
                  }`}
                >
                  {searchResults.length > 0 ? (
                    <div className="divide-y divide-gray-700/20">
                      {searchResults.map((media, index) => (
                        <motion.div
                          key={media.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.03 }}
                          onClick={() => handleResultSelect(media)}
                          className="flex items-center p-4 active:bg-gray-800/50 cursor-pointer transition-all duration-200 group"
                        >
                          {media.poster ? (
                            <img
                              src={media.poster}
                              alt={media.frenchTitle || media.title}
                              className="w-10 h-14 object-cover rounded-xl mr-3 flex-shrink-0 shadow-lg"
                            />
                          ) : (
                            <div className="w-10 h-14 bg-gradient-to-br from-gray-700 to-gray-800 rounded-xl mr-3 flex-shrink-0 flex items-center justify-center shadow-lg">
                              <Play size={16} className="text-gray-300" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0 mr-2">
                            <h4 className="text-white font-semibold text-sm truncate group-hover:text-red-400 transition-colors">
                              {media.frenchTitle || media.title}
                            </h4>
                            <p className="text-gray-400 text-xs truncate mt-1">
                              {media.type === 'movie' ? 'Film' : media.type === 'series' ? 'Série' : 'Musique'} 
                              {media.isGroup && media.episodeCount && ` • ${media.episodeCount} épisode${media.episodeCount > 1 ? 's' : ''}`}
                              {!media.isGroup && media.year && ` • ${media.year}`}
                            </p>
                          </div>
                          <button 
                            onClick={(e) => handlePlayMedia(e, media)}
                            className="p-2 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 rounded-full transition-all shadow-lg"
                            title="Lire"
                          >
                            <Play size={12} className="text-white fill-white" />
                          </button>
                        </motion.div>
                      ))}
                      {searchQuery.trim() && (
                        <div
                          onClick={handleSeeAllResults}
                          className="p-4 text-center active:bg-gray-800/50 cursor-pointer transition-all duration-200 border-t border-gray-700/20"
                        >
                          <span className="text-red-400 hover:text-red-300 font-semibold text-sm transition-colors">
                            Voir tous les résultats
                          </span>
                        </div>
                      )}
                    </div>
                  ) : isSearching ? (
                    <div className="p-6 text-center">
                      <div className="mb-2">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mx-auto"></div>
                      </div>
                      <p className="text-gray-400 text-sm">Recherche en cours...</p>
                    </div>
                  ) : searchQuery.trim().length >= 1 ? (
                    <div className="p-6 text-center">
                      <div className="mb-2">
                        <Search size={24} className="text-gray-500 mx-auto" />
                      </div>
                      <p className="text-gray-400 text-sm">Aucun résultat pour "{searchQuery}"</p>
                    </div>
                  ) : null}
                </motion.div>
              )}
            </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Mobile Menu */}
        <AnimatePresence mode="wait">
          {isMobileMenuOpen && !isMobileSearchFocused && (
            <motion.div 
              className="md:hidden mt-4 pb-4 border-t border-gray-700 overflow-hidden"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ 
                duration: 0.15, 
                ease: "easeOut"
              }}
              layout
            >
            {/* Mobile Navigation - Only show when authenticated */}
            {isAuthenticated && (
              <nav className="flex flex-col space-y-2 mt-4">
                {categories.map((category) => (
                  <div key={category.id}>
                    <Link
                      to={category.path}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={`block text-left text-white hover:text-gray-300 transition-all duration-500 ease-in-out py-2 px-2 rounded hover:bg-white/10 ${
                        isActiveRoute(category.path) ? 'font-semibold text-red-400 bg-red-400/10' : ''
                      }`}
                    >
                      {category.name}
                    </Link>
                  </div>
                ))}
              </nav>
            )}
            
            {/* Mobile Auth/Profile */}
            {(isAuthenticated || showAuthButton) && (
              <div className="mt-4 pt-4 border-t border-gray-700">
                {isAuthenticated ? (
                  <div className="flex items-center justify-between">
                    <span className="text-white text-sm">
                      Bonjour, {profile?.username}
                    </span>
                    <button
                      onClick={() => {
                        onShowProfile();
                        setIsMobileMenuOpen(false);
                      }}
                      className="text-white hover:text-gray-300"
                    >
                      <User size={24} />
                    </button>
                  </div>
                ) : showAuthButton ? (
                  <button
                    onClick={() => {
                      onShowAuth();
                      setIsMobileMenuOpen(false);
                    }}
                    className="w-full flex items-center justify-center space-x-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors"
                  >
                    <LogIn size={20} />
                    <span>Connexion</span>
                  </button>
                ) : null}
              </div>
            )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.header>
  );
};

export default Header;