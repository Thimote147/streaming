import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, Lock, User, Eye, EyeOff, MessageSquare } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

interface SignupFormProps {
  onSwitchToLogin: () => void;
  onClose: () => void;
}

const SignupForm: React.FC<SignupFormProps> = ({ onSwitchToLogin, onClose }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [username, setUsername] = useState('');
  const [reason, setReason] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { signUp } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas');
      return;
    }

    if (password.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères');
      return;
    }

    if (reason.trim().length < 10) {
      setError('Veuillez fournir une raison détaillée (minimum 10 caractères)');
      return;
    }

    setIsLoading(true);

    const { error } = await signUp(email, password, username, reason);
    
    if (error) {
      setError(error.message);
    } else {
      setSuccess('Votre demande d\'accès a été envoyée ! Un administrateur examinera votre demande.');
      // Don't close immediately, show success message
      setTimeout(() => {
        onClose();
      }, 3000);
    }
    
    setIsLoading(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
      className="w-full max-w-md mx-auto"
    >
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-white mb-2">Demander l'accès</h2>
        <p className="text-gray-400">Votre demande sera examinée par un administrateur</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-red-500/10 border border-red-500/20 rounded-lg p-4"
          >
            <p className="text-red-400 text-sm">{error}</p>
          </motion.div>
        )}

        {success && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-green-500/10 border border-green-500/20 rounded-lg p-4"
          >
            <p className="text-green-400 text-sm">{success}</p>
          </motion.div>
        )}

        <div className="space-y-4">
          <div className="relative">
            <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Nom d'utilisateur"
              className="w-full pl-12 pr-4 py-3 bg-gray-800/30 border border-gray-600/30 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-red-500 focus:bg-gray-800/50 focus:ring-2 focus:ring-red-500/20 transition-all"
              required
              minLength={3}
            />
          </div>

          <div className="relative">
            <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Adresse email"
              className="w-full pl-12 pr-4 py-3 bg-gray-800/30 border border-gray-600/30 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-red-500 focus:bg-gray-800/50 focus:ring-2 focus:ring-red-500/20 transition-all"
              required
            />
          </div>

          <div className="relative">
            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mot de passe"
              className="w-full pl-12 pr-12 py-3 bg-gray-800/30 border border-gray-600/30 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-red-500 focus:bg-gray-800/50 focus:ring-2 focus:ring-red-500/20 transition-all"
              required
              minLength={6}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
            >
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>

          <div className="relative">
            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type={showConfirmPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirmer le mot de passe"
              className="w-full pl-12 pr-12 py-3 bg-gray-800/30 border border-gray-600/30 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-red-500 focus:bg-gray-800/50 focus:ring-2 focus:ring-red-500/20 transition-all"
              required
              minLength={6}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
            >
              {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>

          <div className="relative">
            <MessageSquare className="absolute left-3 top-3 text-gray-400" size={20} />
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Pourquoi souhaitez-vous accéder à cette plateforme ? (minimum 10 caractères)"
              className="w-full pl-12 pr-4 py-3 bg-gray-800/30 border border-gray-600/30 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-red-500 focus:bg-gray-800/50 focus:ring-2 focus:ring-red-500/20 transition-all resize-none h-24"
              required
              minLength={10}
            />
          </div>
        </div>

        <motion.button
          type="submit"
          disabled={isLoading}
          className="w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-xl shadow-lg shadow-red-500/20 transition-all flex items-center justify-center"
          whileHover={{ scale: isLoading ? 1 : 1.02 }}
          whileTap={{ scale: isLoading ? 1 : 0.98 }}
        >
          {isLoading ? (
            <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            'Envoyer la demande'
          )}
        </motion.button>

        <div className="text-center">
          <p className="text-gray-400">
            Déjà un compte ?{' '}
            <button
              type="button"
              onClick={onSwitchToLogin}
              className="text-red-400 hover:text-red-300 font-medium transition-colors"
            >
              Se connecter
            </button>
          </p>
        </div>
      </form>
    </motion.div>
  );
};

export default SignupForm;