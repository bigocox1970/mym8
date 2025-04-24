
import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Session, User } from "@supabase/supabase-js";

type Profile = {
  id: string;
  nickname: string | null;
  avatar_url: string | null;
  dark_mode: boolean;
  is_admin: boolean;
};

type AuthContextType = {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{
    error: Error | null;
    data: any;
  }>;
  signUp: (email: string, password: string) => Promise<{
    error: Error | null;
    data: any;
  }>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) {
          console.error("Error fetching session:", error);
          setLoading(false);
          return;
        }

        setSession(session);
        setUser(session?.user || null);
        
        if (session?.user) {
          // Get profile data
          const { data, error: profileError } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", session.user.id)
            .single();

          if (profileError) {
            console.error("Error loading profile:", profileError);
            
            // If profile doesn't exist, try to create it
            if (profileError.code === 'PGRST116') {
              try {
                const { error: insertError } = await supabase
                  .from("profiles")
                  .insert({ 
                    id: session.user.id,
                    dark_mode: false,
                    is_admin: false
                  });
                  
                if (insertError) {
                  console.error("Error creating profile:", insertError);
                } else {
                  // Fetch the newly created profile
                  const { data: newProfile } = await supabase
                    .from("profiles")
                    .select("*")
                    .eq("id", session.user.id)
                    .single();
                    
                  setProfile(newProfile);
                }
              } catch (e) {
                console.error("Error in profile creation:", e);
              }
            }
          } else {
            setProfile(data);
          }
        }
        
        setLoading(false);
      } catch (e) {
        console.error("Unexpected error in auth:", e);
        setLoading(false);
      }
    };

    getSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        setUser(session?.user || null);
        
        if (session?.user) {
          const { data, error } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", session.user.id)
            .single();

          if (!error) {
            setProfile(data);
          } else {
            console.error("Error loading profile in auth change:", error);
            setProfile(null);
          }
        } else {
          setProfile(null);
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
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
    profile,
    loading,
    signIn,
    signUp,
    signOut,
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
