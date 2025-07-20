import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, XCircle, Clock, User, Mail, MessageSquare } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import type { AccessRequest } from '../../lib/supabase';

const AccessRequestManager: React.FC = () => {
  const { getAccessRequests, updateAccessRequest, profile } = useAuth();
  const [requests, setRequests] = useState<AccessRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());

  const loadRequests = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getAccessRequests();
      setRequests(data);
    } catch (error) {
      console.error('Error loading requests:', error);
    } finally {
      setLoading(false);
    }
  }, [getAccessRequests]);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  const handleUpdateRequest = async (requestId: string, status: 'approved' | 'rejected') => {
    if (!profile || profile.role !== 'admin') return;

    setProcessingIds(prev => new Set(prev).add(requestId));
    
    try {
      const { error } = await updateAccessRequest(requestId, status);
      if (error) {
        console.error('Error updating request:', error);
        // Optionally show a toast/alert here
      } else {
        console.log('Request updated successfully');
        // Force refresh the list
        await loadRequests();
      }
    } catch (error) {
      console.error('Error updating request:', error);
    } finally {
      setProcessingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(requestId);
        return newSet;
      });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="text-green-500" size={20} />;
      case 'rejected':
        return <XCircle className="text-red-500" size={20} />;
      default:
        return <Clock className="text-yellow-500" size={20} />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'approved':
        return 'Approuvée';
      case 'rejected':
        return 'Rejetée';
      default:
        return 'En attente';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'text-green-400 bg-green-500/10 border-green-500/20';
      case 'rejected':
        return 'text-red-400 bg-red-500/10 border-red-500/20';
      default:
        return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20';
    }
  };

  const pendingRequests = requests.filter(req => req.status === 'pending');
  const processedRequests = requests.filter(req => req.status !== 'pending');

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-xl font-bold text-white mb-2">Gestion des demandes d'accès</h3>
        <p className="text-gray-400">
          {pendingRequests.length} demande(s) en attente • {requests.length} total
        </p>
      </div>

      {/* Pending Requests */}
      {pendingRequests.length > 0 && (
        <div className="space-y-4">
          <h4 className="text-lg font-semibold text-white flex items-center gap-2">
            <Clock className="text-yellow-500" size={20} />
            Demandes en attente ({pendingRequests.length})
          </h4>
          
          {pendingRequests.map((request) => (
            <motion.div
              key={request.id}
              className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="flex flex-col space-y-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <User size={16} className="text-gray-400" />
                      <span className="text-white font-medium">{request.username}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Mail size={16} className="text-gray-400" />
                      <span className="text-gray-300">{request.email}</span>
                    </div>
                    <div className="text-xs text-gray-400">
                      Demandé le {new Date(request.created_at).toLocaleDateString('fr-FR')}
                    </div>
                  </div>
                  
                  <div className={`px-3 py-1 rounded-full text-sm border ${getStatusColor(request.status)}`}>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(request.status)}
                      {getStatusText(request.status)}
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <MessageSquare size={16} className="text-gray-400" />
                    <span className="text-sm font-medium text-gray-300">Raison :</span>
                  </div>
                  <p className="text-gray-300 text-sm bg-gray-900/50 rounded p-3 border border-gray-700/30">
                    {request.reason}
                  </p>
                </div>

                {request.status === 'pending' && (
                  <div className="flex gap-3 pt-2">
                    <motion.button
                      onClick={() => handleUpdateRequest(request.id, 'approved')}
                      disabled={processingIds.has(request.id)}
                      className="flex items-center gap-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg transition-colors text-sm"
                      whileHover={{ scale: processingIds.has(request.id) ? 1 : 1.02 }}
                      whileTap={{ scale: processingIds.has(request.id) ? 1 : 0.98 }}
                    >
                      <CheckCircle size={16} />
                      {processingIds.has(request.id) ? 'Traitement...' : 'Approuver'}
                    </motion.button>

                    <motion.button
                      onClick={() => handleUpdateRequest(request.id, 'rejected')}
                      disabled={processingIds.has(request.id)}
                      className="flex items-center gap-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg transition-colors text-sm"
                      whileHover={{ scale: processingIds.has(request.id) ? 1 : 1.02 }}
                      whileTap={{ scale: processingIds.has(request.id) ? 1 : 0.98 }}
                    >
                      <XCircle size={16} />
                      {processingIds.has(request.id) ? 'Traitement...' : 'Rejeter'}
                    </motion.button>
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Processed Requests */}
      {processedRequests.length > 0 && (
        <div className="space-y-4">
          <h4 className="text-lg font-semibold text-white">
            Demandes traitées ({processedRequests.length})
          </h4>
          
          <div className="space-y-3">
            {processedRequests.slice(0, 5).map((request) => (
              <div
                key={request.id}
                className="bg-gray-800/30 border border-gray-700/30 rounded-lg p-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-white text-sm">{request.username}</span>
                    <span className="text-gray-400 text-xs">{request.email}</span>
                  </div>
                  
                  <div className={`px-2 py-1 rounded-full text-xs border ${getStatusColor(request.status)}`}>
                    <div className="flex items-center gap-1">
                      {getStatusIcon(request.status)}
                      {getStatusText(request.status)}
                    </div>
                  </div>
                </div>
                
                {request.reviewed_at && (
                  <div className="text-xs text-gray-500 mt-1">
                    Traité le {new Date(request.reviewed_at).toLocaleDateString('fr-FR')}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {requests.length === 0 && (
        <div className="text-center py-8">
          <p className="text-gray-400">Aucune demande d'accès pour le moment</p>
        </div>
      )}
    </div>
  );
};

export default AccessRequestManager;