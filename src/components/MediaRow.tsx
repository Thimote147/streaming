import React, { useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';
import type { MediaItem } from '../services/api';
import MediaCard from './MediaCard';

interface MediaRowProps {
  title: string;
  items: MediaItem[];
  onMoreInfo: (media: MediaItem) => void;
  onAddToList?: (media: MediaItem) => void;
  useHorizontalScroll?: boolean;
  isLast?: boolean;
}

const MediaRow: React.FC<MediaRowProps> = ({ 
  title, 
  items, 
  onMoreInfo, 
  onAddToList,
  useHorizontalScroll = false,
  isLast = false
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = React.useState(false);
  const [canScrollRight, setCanScrollRight] = React.useState(true);

  const checkScrollability = () => {
    if (scrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft + clientWidth < scrollWidth);
    }
  };

  React.useEffect(() => {
    if (useHorizontalScroll) {
      checkScrollability();
      window.addEventListener('resize', checkScrollability);
      return () => window.removeEventListener('resize', checkScrollability);
    }
  }, [items, useHorizontalScroll]);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const scrollAmount = scrollContainerRef.current.clientWidth * 0.8;
      const newScrollLeft = direction === 'left' 
        ? scrollContainerRef.current.scrollLeft - scrollAmount
        : scrollContainerRef.current.scrollLeft + scrollAmount;
      
      scrollContainerRef.current.scrollTo({
        left: newScrollLeft,
        behavior: 'smooth'
      });
    }
  };

  if (items.length === 0) {
    return null;
  }

  return (
    <div className={`relative group py-1 ${isLast ? 'mb-0' : 'mb-4'}`}>
      {/* Section Title */}
      <motion.h2 
        className="text-white text-xl md:text-2xl font-semibold mb-2 px-4 md:px-8"
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5 }}
      >
        {title}
      </motion.h2>

      {useHorizontalScroll ? (
        // Horizontal scroll layout
        <div className="relative">
          {/* Left Arrow */}
          {canScrollLeft && (
            <motion.button
              onClick={() => scroll('left')}
              className="absolute left-2 top-1/2 -translate-y-1/2 z-10 bg-black/60 hover:bg-black/80 text-white p-3 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 shadow-lg"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <ChevronLeft size={24} />
            </motion.button>
          )}

          {/* Right Arrow */}
          {canScrollRight && (
            <motion.button
              onClick={() => scroll('right')}
              className="absolute right-2 top-1/2 -translate-y-1/2 z-10 bg-black/60 hover:bg-black/80 text-white p-3 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 shadow-lg"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <ChevronRight size={24} />
            </motion.button>
          )}

          {/* Scrollable Content */}
          <div
            ref={scrollContainerRef}
            className="flex space-x-2 overflow-x-auto scrollbar-hide px-4 md:px-8 pb-4 scroll-smooth"
            onScroll={checkScrollability}
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {items.map((media, index) => (
              <div key={media.id} className="flex-shrink-0 w-40 md:w-44">
                <MediaCard
                  media={media}
                  onMoreInfo={onMoreInfo}
                  onAddToList={onAddToList}
                  index={index}
                />
              </div>
            ))}
          </div>
        </div>
      ) : (
        // Grid layout
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 2xl:grid-cols-8 gap-2 px-4 md:px-8 pb-4">
          {items.map((media, index) => (
            <div key={media.id} className="w-full">
              <MediaCard
                media={media}
                onMoreInfo={onMoreInfo}
                onAddToList={onAddToList}
                index={index}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MediaRow;