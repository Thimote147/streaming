import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { User, Mail, Calendar, LogOut, Edit3, Save, X, Shield, History } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import AccessRequestManager from '../Admin/AccessRequestManager';
import WatchHistoryView from '../WatchProgress/WatchHistoryView';
import ClearCacheButton from '../ClearCacheButton';

interface UserProfileProps {
  isOpen: boolean;
  onClose: () => void;
}

const UserProfile: React.FC<UserProfileProps> = ({ isOpen, onClose }) => {
  const { user, profile, signOut } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [username, setUsername] = useState(profile?.username || '');
  const [activeTab, setActiveTab] = useState<'profile' | 'history' | 'admin'>('profile');

  const handleSignOut = async () => {
    await signOut();
    onClose();
  };

  const handleSave = async () => {
    // TODO: Implement profile update
    setIsEditing(false);
  };

  if (!isOpen || !user || !profile) return null;

  return (
    <motion.div
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="bg-gray-900/95 backdrop-blur-md rounded-2xl shadow-2xl border border-gray-700/50 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        transition={{ type: "spring", duration: 0.5 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative p-8">
          <button
            onClick={onClose}
            className="absolute top-6 right-6 text-gray-400 hover:text-white transition-colors"
          >
            <X size={24} />
          </button>

          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-gradient-to-br from-red-500 to-red-700 rounded-full flex items-center justify-center mx-auto mb-4">
              <User size={32} className="text-white" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">
              {profile?.role === 'admin' ? 'Panneau d\'administration' : 'Mon Profil'}
            </h2>
            {profile?.role === 'admin' && (
              <div className="flex items-center justify-center gap-1 text-sm text-yellow-400">
                <Shield size={16} />
                <span>Administrateur</span>
              </div>
            )}
          </div>

          {/* Tabs */}
          <div className="flex border-b border-gray-700/50 mb-6">
            <button
              onClick={() => setActiveTab('profile')}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === 'profile'
                  ? 'text-red-400 border-b-2 border-red-400'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Profil
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === 'history'
                  ? 'text-red-400 border-b-2 border-red-400'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <History size={16} className="inline mr-2" />
              Historique
            </button>
            {profile?.role === 'admin' && (
              <button
                onClick={() => setActiveTab('admin')}
                className={`px-4 py-2 text-sm font-medium transition-colors ${
                  activeTab === 'admin'
                    ? 'text-red-400 border-b-2 border-red-400'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Demandes d'accès
              </button>
            )}
          </div>

          {/* Content based on active tab */}
          {activeTab === 'profile' ? (
            <div className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-gray-400">Nom d'utilisateur</label>
                  {!isEditing && (
                    <button
                      onClick={() => setIsEditing(true)}
                      className="text-gray-400 hover:text-white transition-colors"
                    >
                      <Edit3 size={16} />
                    </button>
                  )}
                </div>
              
                {isEditing ? (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="flex-1 px-4 py-2 bg-gray-800/50 border border-gray-700/50 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-red-500"
                    />
                    <button
                      onClick={handleSave}
                      className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                    >
                      <Save size={16} />
                    </button>
                    <button
                      onClick={() => {
                        setIsEditing(false);
                        setUsername(profile.username);
                      }}
                      className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center space-x-3 p-4 bg-gray-800/30 rounded-lg">
                    <User size={20} className="text-gray-400" />
                    <span className="text-white">{profile.username}</span>
                  </div>
                )}
              </div>

              <div>
                <label className="text-sm font-medium text-gray-400 mb-2 block">Email</label>
                <div className="flex items-center space-x-3 p-4 bg-gray-800/30 rounded-lg">
                  <Mail size={20} className="text-gray-400" />
                  <span className="text-white">{user.email}</span>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-400 mb-2 block">Membre depuis</label>
                <div className="flex items-center space-x-3 p-4 bg-gray-800/30 rounded-lg">
                  <Calendar size={20} className="text-gray-400" />
                  <span className="text-white">
                    {new Date(profile.created_at).toLocaleDateString('fr-FR')}
                  </span>
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-gray-700/50 space-y-4">
                {/* Clear Cache Button */}
                <div>
                  <label className="text-sm font-medium text-gray-400 mb-3 block">Maintenance</label>
                  <div className="p-4 bg-gray-800/30 rounded-lg">
                    <ClearCacheButton />
                  </div>
                </div>
                
                <motion.button
                  onClick={handleSignOut}
                  className="w-full bg-red-600/20 hover:bg-red-600/30 border border-red-500/50 text-red-400 font-semibold py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <LogOut size={20} />
                  Se déconnecter
                </motion.button>
              </div>
            </div>
          ) : activeTab === 'history' ? (
            <WatchHistoryView />
          ) : (
            <AccessRequestManager />
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};

export default UserProfile;