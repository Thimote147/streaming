import React from 'react';
import { useAuth } from '../hooks/useAuth';
import Header from './Header';

interface ProtectedRouteProps {
  children: React.ReactNode;
  onShowAuth: () => void;
  onShowProfile: () => void;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  onShowAuth, 
  onShowProfile 
}) => {
  const { user, profile, loading } = useAuth();
  
  // Tous les hooks doivent être au début du composant
  const [profileErrorTimeout, setProfileErrorTimeout] = React.useState(false);
  
  React.useEffect(() => {
    if (user && !loading && !profile) {
      const timer = setTimeout(() => {
        setProfileErrorTimeout(true);
      }, 8000); // Attendre 8 secondes avant d'afficher l'erreur
      
      return () => clearTimeout(timer);
    } else {
      setProfileErrorTimeout(false);
    }
  }, [user, loading, profile]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-red-600 mx-auto mb-4"></div>
          <p className="text-white text-lg">Chargement...</p>
        </div>
      </div>
    );
  }

  if (user && !loading && !profile && profileErrorTimeout) {
    return (
      <>
        <Header 
          onShowAuth={onShowAuth}
          onShowProfile={onShowProfile}
          isAuthenticated={true}
        />
        <div className="min-h-screen bg-black flex items-center justify-center pt-20">
          <div className="text-center max-w-md mx-auto px-6">
            <div className="text-6xl mb-6">⚠️</div>
            <h1 className="text-3xl font-bold text-white mb-4">
              Profil en cours de chargement...
            </h1>
            <p className="text-gray-400 mb-8">
              Si ce message persiste, votre profil pourrait ne pas exister. Contactez un administrateur.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-8 rounded-lg transition-colors"
            >
              Actualiser
            </button>
          </div>
        </div>
      </>
    );
  }

  // Si l'utilisateur n'est pas connecté, afficher seulement le header et déclencher l'auth
  if (!user) {
    return (
      <>
        <Header 
          onShowAuth={onShowAuth}
          onShowProfile={onShowProfile}
          isAuthenticated={false}
          showAuthButton={false}
        />
        <div className="min-h-screen bg-black flex items-center justify-center pt-20">
          <div className="text-center max-w-md mx-auto px-6">
            <div className="text-6xl mb-6">🎬</div>
            <h1 className="text-3xl font-bold text-white mb-4">
              Bienvenue sur votre plateforme de streaming
            </h1>
            <p className="text-gray-400 mb-8">
              Connectez-vous pour accéder à votre bibliothèque de films, Series et musiques.
            </p>
            <button
              onClick={onShowAuth}
              className="bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-8 rounded-lg transition-colors"
            >
              Se connecter
            </button>
          </div>
        </div>
      </>
    );
  }

  // Si l'utilisateur est connecté, afficher l'interface même si le profil se charge
  return (
    <>
      <Header 
        onShowAuth={onShowAuth}
        onShowProfile={onShowProfile}
        isAuthenticated={true}
      />
      {children}
    </>
  );
};

export default ProtectedRoute;