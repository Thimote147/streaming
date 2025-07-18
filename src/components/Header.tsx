import React, { useState } from 'react';
import { Search, User, Menu, X } from 'lucide-react';
import { motion } from 'framer-motion';

interface HeaderProps {
  onSearch: (query: string) => void;
  onCategoryChange: (category: string) => void;
  currentCategory: string;
}

const Header: React.FC<HeaderProps> = ({ onSearch, onCategoryChange, currentCategory }) => {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const categories = [
    { id: 'all', name: 'Accueil' },
    { id: 'Films', name: 'Films' },
    { id: 'Séries', name: 'Séries' },
    { id: 'Musiques', name: 'Musiques' }
  ];

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(searchQuery);
    setIsSearchOpen(false);
  };

  return (
    <motion.header 
      className="fixed top-0 left-0 right-0 z-50 backdrop-blur-sm bg-gradient-to-b from-black/90 via-black/50 to-transparent"
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <motion.div 
            className="text-red-600 text-2xl md:text-3xl font-bold cursor-pointer hover:scale-105 transition-transform duration-200"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            STREAMING
          </motion.div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex space-x-8">
            {categories.map((category) => (
              <motion.button
                key={category.id}
                onClick={() => onCategoryChange(category.id)}
                className={`text-white hover:text-gray-300 transition-colors duration-200 font-medium ${
                  currentCategory === category.id ? 'font-semibold' : ''
                }`}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                {category.name}
              </motion.button>
            ))}
          </nav>

          {/* Desktop Actions */}
          <div className="hidden md:flex items-center space-x-4">
            {/* Search */}
            <div className="relative">
              {isSearchOpen ? (
                <motion.form 
                  onSubmit={handleSearchSubmit}
                  className="flex items-center"
                  initial={{ width: 0 }}
                  animate={{ width: 'auto' }}
                  exit={{ width: 0 }}
                >
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Rechercher..."
                    className="bg-black/70 border border-gray-600 rounded-l px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-white transition-colors duration-200"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setIsSearchOpen(false)}
                    className="bg-black/70 border border-gray-600 border-l-0 rounded-r px-3 py-2 text-white hover:bg-gray-700 transition-colors duration-200"
                  >
                    <X size={20} />
                  </button>
                </motion.form>
              ) : (
                <motion.button
                  onClick={() => setIsSearchOpen(true)}
                  className="text-white hover:text-gray-300"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <Search size={24} />
                </motion.button>
              )}
            </div>

            {/* Profile */}
            <motion.button 
              className="text-white hover:text-gray-300"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <User size={24} />
            </motion.button>
          </div>

          {/* Mobile Menu Button */}
          <motion.button
            className="md:hidden text-white"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </motion.button>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <motion.div 
            className="md:hidden mt-4 pb-4 border-t border-gray-700"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <nav className="flex flex-col space-y-2 mt-4">
              {categories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => {
                    onCategoryChange(category.id);
                    setIsMobileMenuOpen(false);
                  }}
                  className={`text-left text-white hover:text-gray-300 transition-colors py-2 ${
                    currentCategory === category.id ? 'font-semibold' : ''
                  }`}
                >
                  {category.name}
                </button>
              ))}
            </nav>
            
            {/* Mobile Search */}
            <div className="mt-4">
              <form onSubmit={handleSearchSubmit} className="flex">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Rechercher..."
                  className="flex-1 bg-black/70 border border-gray-600 rounded-l px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-white"
                />
                <button
                  type="submit"
                  className="bg-red-600 border border-red-600 rounded-r px-4 py-2 text-white hover:bg-red-700 transition-colors"
                >
                  <Search size={20} />
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </div>
    </motion.header>
  );
};

export default Header;