import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { RefreshCw, Check, AlertCircle } from 'lucide-react';
import { persistentCache } from '../services/persistentCache';

const ClearCacheButton: React.FC = () => {
  const [isClearing, setIsClearing] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | ''>('');

  const clearAllCaches = async () => {
    setIsClearing(true);
    setMessage('');
    setMessageType('');

    try {
      // 1. Clear server caches
      const response = await fetch('/api/clear-cache');
      const result = await response.json();
      
      if (result.success) {
        // 2. Clear client-side persistent cache for all media types
        await persistentCache.clear('categories');
        await persistentCache.clear('tmdb');
        await persistentCache.clear('images');
        
        // 3. Clear browser caches
        if ('caches' in window) {
          const cacheNames = await caches.keys();
          await Promise.all(cacheNames.map(name => caches.delete(name)));
        }
        
        setMessage('Cache vidé ! Films, séries et musiques mis à jour.');
        setMessageType('success');
        
        // Reload page after 2 seconds to show new content
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } else {
        setMessage('Erreur lors du nettoyage du cache');
        setMessageType('error');
      }
    } catch (error) {
      console.error('Error clearing caches:', error);
      setMessage('Erreur de connexion au serveur');
      setMessageType('error');
    } finally {
      setIsClearing(false);
    }
  };

  return (
    <div className="space-y-3">
      <motion.button
        onClick={clearAllCaches}
        disabled={isClearing}
        className={`w-full flex items-center justify-center space-x-2 px-4 py-3 rounded-lg font-medium transition-all duration-200 ${
          isClearing
            ? 'bg-gray-700/50 cursor-not-allowed text-gray-400'
            : 'bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/50 text-blue-400 hover:text-blue-300'
        }`}
        whileHover={!isClearing ? { scale: 1.02 } : undefined}
        whileTap={!isClearing ? { scale: 0.98 } : undefined}
      >
        <motion.div
          animate={isClearing ? { rotate: 360 } : { rotate: 0 }}
          transition={isClearing ? { duration: 1, repeat: Infinity, ease: "linear" } : {}}
        >
          <RefreshCw size={18} />
        </motion.div>
        <span>
          {isClearing ? 'Nettoyage en cours...' : 'Actualiser le contenu'}
        </span>
      </motion.button>
      
      {message && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm ${
            messageType === 'success'
              ? 'bg-green-600/20 border border-green-500/50 text-green-400'
              : 'bg-red-600/20 border border-red-500/50 text-red-400'
          }`}
        >
          {messageType === 'success' ? (
            <Check size={16} />
          ) : (
            <AlertCircle size={16} />
          )}
          <span>{message}</span>
        </motion.div>
      )}
      
      <p className="text-xs text-gray-500 leading-relaxed">
        Met à jour la liste des <strong>films</strong>, <strong>séries</strong> et <strong>musiques</strong> depuis le serveur. 
        Utilisez après avoir ajouté du nouveau contenu.
      </p>
    </div>
  );
};

export default ClearCacheButton;