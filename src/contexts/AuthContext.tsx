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

      const { data, error } = await Promise.race([
        supabasePromise,
        timeoutPromise,
      ]) as { data: Profile | null; error: Error | null };

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

  const signUp = async (email: string, password: string, username: string, reason: string) => {
    try {
      setLoading(true);
      
      // Create Supabase auth user first
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (authError) {
        return { error: authError as Error };
      }

      // Create access request with the user ID
      const { error: requestError } = await supabase
        .from('access_requests')
        .insert([
          {
            user_id: authData.user?.id,
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

      // Sign out the user immediately after signup to prevent access before approval
      await supabase.auth.signOut();

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

      // Get the access request details first
      const { data: requestData, error: fetchError } = await supabase
        .from('access_requests')
        .select('*')
        .eq('id', requestId)
        .single();

      if (fetchError || !requestData) {
        return { error: new Error('Access request not found') };
      }

      // Update the access request status
      const { error: updateError } = await supabase
        .from('access_requests')
        .update({
          status,
          reviewed_by: profile.id,
          reviewed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', requestId);

      if (updateError) {
        return { error: updateError as Error };
      }

      // If approved, create the user profile
      if (status === 'approved' && requestData.user_id) {
        console.log('Creating profile for user:', requestData.user_id, 'username:', requestData.username);
        
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .insert({
            id: requestData.user_id,
            username: requestData.username,
            role: 'member',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .select()
          .single();

        console.log('Profile creation result:', { profileData, profileError });

        if (profileError) {
          console.error('Failed to create profile:', profileError);
          return { error: new Error('Failed to create user profile: ' + profileError.message) };
        }
        
        console.log('Profile created successfully');
      }

      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true);
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) {
        console.log('Supabase auth error:', error.message); // Debug log
        
        // Handle auth errors by checking access request status first
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
              // For approved users, show the actual auth error (likely wrong password)
              return { error: new Error('Email ou mot de passe invalide.') };
          }
        }
        
        return { error: new Error('Email ou mot de passe invalide.') };
      }

      // If login successful, check if user has a profile (meaning request was approved)
      if (data.user) {
        console.log('User logged in successfully, checking profile for user ID:', data.user.id);
        
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', data.user.id)
          .single();

        console.log('Profile query result:', { profileData, profileError });

        // If no profile exists, check access request status
        if (profileError || !profileData) {
          const { data: accessRequest } = await supabase
            .from('access_requests')
            .select('status')
            .eq('user_id', data.user.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();
          
          console.log('Access request status:', accessRequest);
          
          // Sign out the user since they don't have access yet
          await supabase.auth.signOut();
          
          if (accessRequest) {
            switch (accessRequest.status) {
              case 'pending':
                return { error: new Error('Votre demande d\'accès est en cours d\'examen par un administrateur.') };
              case 'rejected':
                return { error: new Error('Votre demande d\'accès a été refusée. Contactez un administrateur pour plus d\'informations.') };
              case 'approved':
                return { error: new Error('Votre compte a été approuvé mais le profil n\'a pas été créé correctement. Contactez un administrateur.') };
              default:
                return { error: new Error('Votre compte n\'est pas encore activé. Contactez un administrateur.') };
            }
          } else {
            return { error: new Error('Aucune demande d\'accès trouvée. Veuillez faire une demande d\'inscription.') };
          }
        }
        
        console.log('Profile found, user can access the application');
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