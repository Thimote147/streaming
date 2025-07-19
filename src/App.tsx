import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Header from './components/Header';
import Hero from './components/Hero';
import MediaRow from './components/MediaRow';
import VideoPlayer from './components/VideoPlayer';
import MediaDetails from './components/MediaDetails';
import { streamingAPI } from './services/api';
import type { MediaItem, MediaCategory } from './services/api';

function App() {
  const [currentCategory, setCurrentCategory] = useState('all');
  const [categories, setCategories] = useState<MediaCategory[]>([]);
  const [searchResults, setSearchResults] = useState<MediaItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<MediaItem | null>(null);
  const [showPlayer, setShowPlayer] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [categoryLoading, setCategoryLoading] = useState(false);

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      setIsLoading(true);
      const data = await streamingAPI.fetchCategories();
      setCategories(data);
    } catch (error) {
      console.error('Error loading categories:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCategoryChange = async (category: string) => {
    setCurrentCategory(category);
    setIsSearching(false);
    setSearchResults([]);
    
    if (category !== 'all') {
      try {
        setCategoryLoading(true);
        const items = await streamingAPI.fetchCategoryContent(category);
        setCategories(prev => 
          prev.map(cat => 
            cat.type === category ? { ...cat, items } : cat
          )
        );
      } catch (error) {
        console.error(`Error loading ${category}:`, error);
      } finally {
        setCategoryLoading(false);
      }
    }
  };

  const handleSearch = async (query: string) => {
    if (query.trim()) {
      try {
        setIsSearching(true);
        setSearchLoading(true);
        const results = await streamingAPI.searchMedia(query);
        setSearchResults(results);
      } catch (error) {
        console.error('Error searching:', error);
        setSearchResults([]);
      } finally {
        setSearchLoading(false);
      }
    } else {
      setIsSearching(false);
      setSearchResults([]);
      setSearchLoading(false);
    }
  };

  const handlePlay = (media: MediaItem) => {
    setSelectedMedia(media);
    setShowPlayer(true);
  };

  const handleMoreInfo = (media: MediaItem) => {
    setSelectedMedia(media);
    setShowDetails(true);
  };

  const handleAddToList = (media: MediaItem) => {
    // TODO: Implement add to watchlist
    console.log('Add to list:', media.title);
  };

  const handleClosePlayer = () => {
    setShowPlayer(false);
    setSelectedMedia(null);
  };

  const handleCloseDetails = () => {
    setShowDetails(false);
    setSelectedMedia(null);
  };

  const getFeaturedMedia = (): MediaItem | undefined => {
    const allItems = categories.flatMap(cat => cat.items);
    return allItems.length > 0 ? allItems[0] : undefined;
  };

  const getFilteredCategories = () => {
    if (currentCategory === 'all') {
      return categories;
    }
    return categories.filter(cat => cat.type === currentCategory);
  };

  const getDisplayedContent = () => {
    if (isSearching && searchResults.length > 0) {
      return [{ name: 'Résultats de recherche', type: 'Films' as const, items: searchResults }];
    }
    
    const filteredCategories = getFilteredCategories();
    
    // Shuffle items for home page
    if (currentCategory === 'all') {
      return filteredCategories.map(category => ({
        ...category,
        items: [...category.items].sort(() => Math.random() - 0.5)
      }));
    }
    
    return filteredCategories;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-red-600 mx-auto mb-4"></div>
          <p className="text-white text-lg">Chargement de votre contenu...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      <Header
        onSearch={handleSearch}
        onCategoryChange={handleCategoryChange}
        currentCategory={currentCategory}
      />

      <main className="relative">
        {/* Hero Section - Only show on home page */}
        {currentCategory === 'all' && !isSearching && (
          <motion.section
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8 }}
          >
            <Hero
              featuredMedia={getFeaturedMedia()}
              onPlay={handlePlay}
              onMoreInfo={handleMoreInfo}
            />
          </motion.section>
        )}

        {/* Content Sections */}
        <section className={`${currentCategory === 'all' && !isSearching ? 'relative -mt-32' : 'pt-20'} pb-12`}>
          {(categoryLoading || searchLoading) ? (
            <div className="flex items-center justify-center py-20">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
                <p className="text-white text-lg">
                  {searchLoading ? 'Recherche en cours...' : 'Chargement du contenu...'}
                </p>
              </div>
            </div>
          ) : (
            <AnimatePresence>
              {getDisplayedContent().map((category, index) => (
                <motion.div
                  key={category.name}
                  initial={{ opacity: 0, y: 50 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -50 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                >
                  <MediaRow
                    title={category.name}
                    items={category.items}
                    onPlay={handlePlay}
                    onMoreInfo={handleMoreInfo}
                    onAddToList={handleAddToList}
                    useHorizontalScroll={currentCategory === 'all'}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          )}

          {/* Empty State */}
          {!categoryLoading && !searchLoading && getDisplayedContent().length === 0 && (
            <motion.div
              className="text-center py-20"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
            >
              <p className="text-gray-400 text-lg">
                {isSearching ? 'Aucun résultat trouvé' : 'Aucun contenu disponible'}
              </p>
            </motion.div>
          )}
        </section>
      </main>

      {/* Video Player */}
      {selectedMedia && (
        <VideoPlayer
          media={selectedMedia}
          onClose={handleClosePlayer}
          isVisible={showPlayer}
        />
      )}

      {/* Media Details */}
      <AnimatePresence>
        {showDetails && selectedMedia && (
          <MediaDetails
            media={selectedMedia}
            onPlay={handlePlay}
            onClose={handleCloseDetails}
            onAddToList={handleAddToList}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

export default App;