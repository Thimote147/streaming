import React, { useState } from 'react';
import { Search, User, Menu, X, LogIn } from 'lucide-react';
import { motion } from 'framer-motion';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

interface HeaderProps {
  onShowAuth: () => void;
  onShowProfile: () => void;
  isAuthenticated: boolean;
  showAuthButton?: boolean;
}

const Header: React.FC<HeaderProps> = ({ onShowAuth, onShowProfile, isAuthenticated, showAuthButton = true }) => {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { profile } = useAuth();

  const categories = [
    { id: '/', name: 'Accueil', path: '/' },
    { id: 'Films', name: 'Films', path: '/Films' },
    { id: 'Series', name: 'Series', path: '/Series' },
    { id: 'Musiques', name: 'Musiques', path: '/Musiques' }
  ];

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
          {/* Logo */}
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
          {isAuthenticated && (
            <nav className="hidden md:flex space-x-8 transition-all duration-500 ease-in-out">
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
            </nav>
          )}

          {/* Desktop Actions */}
          <div className="hidden md:flex items-center space-x-4 transition-all duration-500 ease-in-out">
            {/* Search - Only show when authenticated */}
            {isAuthenticated && (
              <div className="relative">
                {isSearchOpen ? (
                  <motion.form 
                    onSubmit={handleSearchSubmit}
                    className="flex items-center"
                    initial={{ width: 0, opacity: 0 }}
                    animate={{ width: 'auto', opacity: 1 }}
                    exit={{ width: 0, opacity: 0 }}
                    transition={{ duration: 0.5, ease: "easeInOut" }}
                  >
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Rechercher..."
                      className="bg-black/70 border border-gray-600 rounded-l px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-white transition-all duration-500 ease-in-out"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => setIsSearchOpen(false)}
                      className="bg-black/70 border border-gray-600 border-l-0 rounded-r px-3 py-2 text-white hover:bg-gray-700 transition-all duration-500 ease-in-out"
                    >
                      <X size={20} />
                    </button>
                  </motion.form>
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
                  <span className="hidden md:inline">Bonjour, </span>
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
          </div>

          {/* Mobile Menu Button - Only show when authenticated or showing auth button */}
          {(isAuthenticated || showAuthButton) && (
            <motion.button
              className="md:hidden text-white transition-all duration-500 ease-in-out"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              whileHover={{ scale: 1.1, rotate: isMobileMenuOpen ? 180 : 0 }}
              whileTap={{ scale: 0.9 }}
              transition={{ type: "spring", stiffness: 400, damping: 20 }}
            >
              {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </motion.button>
          )}
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <motion.div 
            className="md:hidden mt-4 pb-4 border-t border-gray-700 transition-all duration-500 ease-in-out"
            initial={{ opacity: 0, height: 0, y: -20 }}
            animate={{ opacity: 1, height: 'auto', y: 0 }}
            exit={{ opacity: 0, height: 0, y: -20 }}
            transition={{ duration: 0.6, ease: "easeInOut" }}
          >
            {/* Mobile Navigation - Only show when authenticated */}
            {isAuthenticated && (
              <nav className="flex flex-col space-y-2 mt-4 transition-all duration-500 ease-in-out">
                {categories.map((category, index) => (
                  <motion.div
                    key={category.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1, duration: 0.5, ease: "easeOut" }}
                  >
                    <Link
                      to={category.path}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={`block text-left text-white hover:text-gray-300 transition-all duration-500 ease-in-out py-2 px-2 rounded hover:bg-white/10 ${
                        isActiveRoute(category.path) ? 'font-semibold text-red-400 bg-red-400/10' : ''
                      }`}
                    >
                      {category.name}
                    </Link>
                  </motion.div>
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
            
            {/* Mobile Search - Only show when authenticated */}
            {isAuthenticated && (
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
            )}
          </motion.div>
        )}
      </div>
    </motion.header>
  );
};

export default Header;