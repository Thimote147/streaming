import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { PlayerProvider } from './contexts/PlayerContext';
import ProtectedRoute from './components/ProtectedRoute';
import Home from './pages/Home';
import Category from './pages/Category';
import Search from './pages/Search';
import Player from './pages/Player';
import Details from './pages/Details';
import NotFound from './pages/NotFound';
import AuthModal from './components/Auth/AuthModal';
import UserProfile from './components/Profile/UserProfile';
import MiniPlayer from './components/MiniPlayer';
import { usePlayer } from './utils/usePlayer';

const AppRoutes = () => {
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const { currentMedia, isMinimized, closePlayer, maximizePlayer, onTimeUpdate, onPlayStateChange } = usePlayer();

  return (
    <div className="min-h-screen bg-black">
      <Routes>
            <Route path="/" element={
              <ProtectedRoute 
                onShowAuth={() => setShowAuthModal(true)}
                onShowProfile={() => setShowProfileModal(true)}
              >
                <Home />
              </ProtectedRoute>
            } />
            <Route path="/:categoryType" element={
              <ProtectedRoute 
                onShowAuth={() => setShowAuthModal(true)}
                onShowProfile={() => setShowProfileModal(true)}
              >
                <Category />
              </ProtectedRoute>
            } />
            <Route path="/search" element={
              <ProtectedRoute 
                onShowAuth={() => setShowAuthModal(true)}
                onShowProfile={() => setShowProfileModal(true)}
              >
                <Search />
              </ProtectedRoute>
            } />
            <Route path="/player/:type/:title" element={
              <ProtectedRoute 
                onShowAuth={() => setShowAuthModal(true)}
                onShowProfile={() => setShowProfileModal(true)}
              >
                <Player />
              </ProtectedRoute>
            } />
            <Route path="/player/:type/:title/:num" element={
              <ProtectedRoute 
                onShowAuth={() => setShowAuthModal(true)}
                onShowProfile={() => setShowProfileModal(true)}
              >
                <Player />
              </ProtectedRoute>
            } />
            <Route path="/player/:type/:title/:season/:episode" element={
              <ProtectedRoute 
                onShowAuth={() => setShowAuthModal(true)}
                onShowProfile={() => setShowProfileModal(true)}
              >
                <Player />
              </ProtectedRoute>
            } />
            <Route path="/films/:title" element={
              <ProtectedRoute 
                onShowAuth={() => setShowAuthModal(true)}
                onShowProfile={() => setShowProfileModal(true)}
              >
                <Details />
              </ProtectedRoute>
            } />
            <Route path="/series/:title" element={
              <ProtectedRoute 
                onShowAuth={() => setShowAuthModal(true)}
                onShowProfile={() => setShowProfileModal(true)}
              >
                <Details />
              </ProtectedRoute>
            } />
            <Route path="/musiques/:title" element={
              <ProtectedRoute 
                onShowAuth={() => setShowAuthModal(true)}
                onShowProfile={() => setShowProfileModal(true)}
              >
                <Details />
              </ProtectedRoute>
            } />
            <Route path="*" element={<NotFound />} />
          </Routes>

          {/* Auth Modal */}
          <AuthModal
            isOpen={showAuthModal}
            onClose={() => setShowAuthModal(false)}
            initialMode="login"
          />

          {/* Profile Modal */}
          <UserProfile
            isOpen={showProfileModal}
            onClose={() => setShowProfileModal(false)}
          />
          
          {/* Global Mini Player */}
          {currentMedia && isMinimized && (
            <MiniPlayer
              media={currentMedia}
              isVisible={isMinimized}
              onClose={closePlayer}
              onMaximize={maximizePlayer}
              onTimeUpdate={onTimeUpdate}
              onPlayStateChange={onPlayStateChange}
            />
          )}
    </div>
  );
};

const AppContent = () => {
  return (
    <AuthProvider>
      <Router>
        <PlayerProvider>
          <AppRoutes />
        </PlayerProvider>
      </Router>
    </AuthProvider>
  );
};

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;