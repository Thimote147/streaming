import React, { createContext, useEffect, useState } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { supabase, type Profile, type AccessRequest } from '../lib/supabase';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  signUp: (email: string, password: string, username: string, reason: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  requestAccess: (email: string, username: string, reason: string) => Promise<{ error: Error | null }>;
  getAccessRequests: () => Promise<AccessRequest[]>;
  updateAccessRequest: (requestId: string, status: 'approved' | 'rejected') => Promise<{ error: Error | null }>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export { AuthContext };

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  
  // Initialiser le profil depuis le localStorage si disponible
  const [profile, setProfile] = useState<Profile | null>(() => {
    try {
      const savedProfile = localStorage.getItem('user_profile');
      return savedProfile ? JSON.parse(savedProfile) : null;
    } catch {
      return null;
    }
  });
  
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      // Vérifier que le profil en localStorage correspond à l'utilisateur connecté
      if (session?.user) {
        const savedProfile = localStorage.getItem('user_profile');
        if (savedProfile) {
          try {
            const parsedProfile = JSON.parse(savedProfile);
            if (parsedProfile.id !== session.user.id) {
              // Profil incorrect, le supprimer
              localStorage.removeItem('user_profile');
              setProfile(null);
            }
          } catch {
            localStorage.removeItem('user_profile');
            setProfile(null);
          }
        }
        fetchProfile(session.user.id);
      } else {
        // Pas d'utilisateur connecté, nettoyer le localStorage
        localStorage.removeItem('user_profile');
        setProfile(null);
      }
      
      // Arrêter le loading immédiatement après avoir récupéré la session
      setLoading(false);
    }).catch((error) => {
      console.error('Error in getSession:', error);
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setProfile(null);
        localStorage.removeItem('user_profile');
      }
      
      // Pas besoin de setLoading(false) ici car on l'a déjà fait au début
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId: string) => {
    try {
      // Timeout de 3 secondes pour une réponse plus rapide
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Profile fetch timeout')), 3000)
      );
      
      const supabasePromise = supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      const { data, error } = await Promise.race([supabasePromise, timeoutPromise]) as any;

      if (error) {
        // Si timeout, on réessaie une fois en arrière-plan
        if (error.message === 'Profile fetch timeout') {
          // Réessayer sans timeout en arrière-plan
          const retryFetch = async () => {
            try {
              const { data: retryData, error: retryError } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single();
              
              if (!retryError && retryData) {
                setProfile(retryData);
                localStorage.setItem('user_profile', JSON.stringify(retryData));
              }
            } catch (err) {
              console.error('Background retry failed:', err);
            }
          };
          retryFetch();
        }
        setProfile(null);
        return;
      }

      setProfile(data);
      // Sauvegarder le profil dans localStorage
      localStorage.setItem('user_profile', JSON.stringify(data));
    } catch (error) {
      console.error('Error fetching profile:', error);
      setProfile(null);
      localStorage.removeItem('user_profile');
    }
  };

  const signUp = async (email: string, _password: string, username: string, reason: string) => {
    try {
      setLoading(true);
      
      // Don't create a Supabase auth user yet, just create an access request
      const { error: requestError } = await supabase
        .from('access_requests')
        .insert([
          {
            email,
            username,
            reason,
            status: 'pending',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ]);

      if (requestError) {
        return { error: requestError as Error };
      }

      return { error: null };
    } catch (error) {
      return { error: error as Error };
    } finally {
      setLoading(false);
    }
  };

  const requestAccess = async (email: string, username: string, reason: string) => {
    try {
      const { error } = await supabase
        .from('access_requests')
        .insert([
          {
            email,
            username,
            reason,
            status: 'pending',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ]);

      return { error: error as Error | null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const getAccessRequests = async (): Promise<AccessRequest[]> => {
    try {
      const { data, error } = await supabase
        .from('access_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching access requests:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching access requests:', error);
      return [];
    }
  };

  const updateAccessRequest = async (requestId: string, status: 'approved' | 'rejected') => {
    try {
      if (!profile || profile.role !== 'admin') {
        return { error: new Error('Unauthorized: Admin access required') };
      }

      const { error } = await supabase
        .from('access_requests')
        .update({
          status,
          reviewed_by: profile.id,
          reviewed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', requestId);

      return { error: error as Error | null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) {
        // Check if this is an "Invalid login credentials" error
        if (error.message === 'Invalid login credentials') {
          // Check if there's an access request for this email
          const { data: accessRequest } = await supabase
            .from('access_requests')
            .select('status')
            .eq('email', email)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();
          
          if (accessRequest) {
            switch (accessRequest.status) {
              case 'pending':
                return { error: new Error('Votre demande d\'accès est en cours d\'examen par un administrateur.') };
              case 'rejected':
                return { error: new Error('Votre demande d\'accès a été refusée. Contactez un administrateur pour plus d\'informations.') };
              case 'approved':
                return { error: new Error('Votre compte a été approuvé mais n\'a pas encore été créé. Contactez un administrateur.') };
            }
          }
        }
        
        return { error: error as Error };
      }
      
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    setLoading(true);
    await supabase.auth.signOut();
    setProfile(null);
    localStorage.removeItem('user_profile');
    setLoading(false);
  };

  const value = {
    user,
    session,
    profile,
    signUp,
    signIn,
    signOut,
    requestAccess,
    getAccessRequests,
    updateAccessRequest,
    loading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};