import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Session, User } from "@supabase/supabase-js";
import { toast } from "@/components/ui/sonner";

// Helper function to get the base URL
const getBaseUrl = () => {
  return `${window.location.protocol}//${window.location.host}`;
};

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

type AuthContextType = {
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
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<ProfileType | null>(null);

  const fetchProfile = async (userId: string): Promise<ProfileType | null> => {
    try {
      console.log("Fetching profile for user ID:", userId);
      
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
        
        console.log("Created new profile");
        
        // Redirect new users to wizard
        if (window.location.pathname !== '/wizard') {
          console.log('New user detected, redirecting to wizard');
          setTimeout(() => {
            window.location.href = `${getBaseUrl()}/wizard`;
          }, 500);
        }
        
        return newProfile as ProfileType;
      }
      
      // Check if we should redirect to wizard for existing users who haven't completed it
      if (data && data.wizard_completed === false && window.location.pathname !== '/wizard') {
        console.log('User has not completed wizard, redirecting');
        setTimeout(() => {
          window.location.href = `${getBaseUrl()}/wizard`;
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

  const value = {
    session,
    user,
    loading,
    profile,
    signIn,
    signUp,
    signOut,
    refreshProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
