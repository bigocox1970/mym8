import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/lib/supabase";
import { Session, User } from "@supabase/supabase-js";
import { toast } from "@/components/ui/sonner";

// Base URL for the API
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

type ProfileType = {
  id: string;
  nickname: string | null;
  avatar_url: string | null;
  theme: string | null;
  wizard_completed: boolean | null;
  selected_issues?: string[] | null;
  other_issue?: string | null;
  assistant_toughness?: string | null;
};

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  profile: ProfileType | null;
  signIn: (email: string, password: string) => Promise<{
    error: Error | null;
    data: any;
  }>;
  signUp: (email: string, password: string) => Promise<{
    error: Error | null;
    data: any;
  }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  getToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<ProfileType | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [token, setToken] = useState<string | null>(null);

  const fetchProfile = async (userId: string): Promise<ProfileType | null> => {
    try {
      // Check if profile exists
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();
      
      if (error) {
        console.error("Error fetching profile:", error);
        
        // Create new profile for first-time users
        const { data: newProfile, error: insertError } = await supabase
          .from("profiles")
          .insert({ 
            id: userId,
            wizard_completed: false
          })
          .select()
          .single();
        
        if (insertError) {
          console.error("Error creating profile:", insertError);
          return null;
        }
        
        // Redirect new users to wizard
        if (window.location.pathname !== '/wizard') {
          setTimeout(() => {
            window.location.href = `${API_BASE_URL}/wizard`;
          }, 500);
        }
        
        return newProfile as ProfileType;
      }
      
      // Check if we should redirect to wizard for existing users who haven't completed it
      if (data && data.wizard_completed === false && window.location.pathname !== '/wizard') {
        setTimeout(() => {
          window.location.href = `${API_BASE_URL}/wizard`;
        }, 500);
      }
      
      // Handle theme
      if (data) {
        const theme = data.theme || 'light';
        
        // First remove any existing theme classes
        document.documentElement.classList.remove("dark", "light");
        
        if (theme === 'dark') {
          document.documentElement.classList.add("dark");
        } else if (theme === 'light') {
          document.documentElement.classList.add("light");
        } else if (theme === 'system') {
          // Use system preference
          const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
          if (prefersDark) {
            document.documentElement.classList.add("dark");
          } else {
            document.documentElement.classList.add("light");
          }
          
          // Listen for changes in system preference
          const colorSchemeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
          const handleChange = (e: MediaQueryListEvent) => {
            document.documentElement.classList.remove("dark", "light");
            if (e.matches) {
              document.documentElement.classList.add("dark");
            } else {
              document.documentElement.classList.add("light");
            }
          };
          
          colorSchemeMediaQuery.addEventListener('change', handleChange);
          // Clean up (will be called when profile is refreshed)
          setTimeout(() => {
            colorSchemeMediaQuery.removeEventListener('change', handleChange);
          }, 60000);
        }
      } else {
        // Default to light theme if no profile data
        document.documentElement.classList.remove("dark");
        document.documentElement.classList.add("light");
      }
      
      return data as ProfileType;
    } catch (error) {
      console.error("Error in fetchProfile:", error);
      return null;
    }
  };

  const refreshProfile = async () => {
    if (!user) return;
    const profileData = await fetchProfile(user.id);
    setProfile(profileData);
  };

  useEffect(() => {
    const initializeAuth = async () => {
      setLoading(true);
      
      // Set up auth state listener
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        (event, session) => {
          setSession(session);
          setUser(session?.user || null);
          
          if (session?.user) {
            // Use setTimeout to avoid potential recursion with auth state changes
            setTimeout(async () => {
              const profileData = await fetchProfile(session.user.id);
              setProfile(profileData);
            }, 0);
          } else {
            setProfile(null);
          }
        }
      );

      // Check for existing session
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      setUser(session?.user || null);
      
      if (session?.user) {
        const profileData = await fetchProfile(session.user.id);
        setProfile(profileData);
      }
      
      setLoading(false);

      return () => {
        subscription.unsubscribe();
      };
    };

    initializeAuth();
  }, []);

  const signIn = async (email: string, password: string) => {
    const response = await supabase.auth.signInWithPassword({ email, password });
    return {
      data: response.data,
      error: response.error as Error | null,
    };
  };

  const signUp = async (email: string, password: string) => {
    const response = await supabase.auth.signUp({ email, password });
    return {
      data: response.data,
      error: response.error as Error | null,
    };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  // Login function
  const login = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) throw error;
      
      setIsAuthenticated(true);
      toast.success('Login successful');
    } catch (error: any) {
      console.error('Login error:', error);
      toast.error(error.message || 'Login failed');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Logout function
  const logout = async () => {
    try {
      setIsLoading(true);
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      setIsAuthenticated(false);
      toast.success('Logged out successfully');
    } catch (error: any) {
      console.error('Logout error:', error);
      toast.error(error.message || 'Logout failed');
    } finally {
      setIsLoading(false);
    }
  };

  // Function to get the current token (for API calls)
  const getToken = async (): Promise<string | null> => {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token ?? null;
  };

  const value = {
    session,
    user,
    loading,
    profile,
    signIn,
    signUp,
    signOut,
    refreshProfile,
    isAuthenticated,
    isLoading,
    login,
    logout,
    getToken
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export default AuthContext;
