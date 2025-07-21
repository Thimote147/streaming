import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Home from './pages/Home';
import Category from './pages/Category';
import Search from './pages/Search';
import Player from './pages/Player';
import Details from './pages/Details';
import NotFound from './pages/NotFound';
import AuthModal from './components/Auth/AuthModal';
import UserProfile from './components/Profile/UserProfile';

function App() {
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);

  return (
    <AuthProvider>
      <Router>
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
            <Route path="/player/musiques/:title" element={
              <ProtectedRoute 
                onShowAuth={() => setShowAuthModal(true)}
                onShowProfile={() => setShowProfileModal(true)}
              >
                <Player />
              </ProtectedRoute>
            } />
            <Route path="/player/:mediaType/:seriesTitle/:seasonNumber/:episodeNumber" element={
              <ProtectedRoute 
                onShowAuth={() => setShowAuthModal(true)}
                onShowProfile={() => setShowProfileModal(true)}
              >
                <Player />
              </ProtectedRoute>
            } />
            <Route path="/player/:mediaType/:seriesTitle/:episodeNumber" element={
              <ProtectedRoute 
                onShowAuth={() => setShowAuthModal(true)}
                onShowProfile={() => setShowProfileModal(true)}
              >
                <Player />
              </ProtectedRoute>
            } />
            <Route path="/player/:mediaId" element={
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
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;