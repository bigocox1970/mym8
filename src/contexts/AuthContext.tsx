
import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Session, User } from "@supabase/supabase-js";

type AuthContextType = {
  session: Session | null;
  user: User | null;
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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get session from Supabase
    const getSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) {
          console.error("Error fetching session:", error);
        }
        
        console.log("Initial session check:", session ? "Logged in" : "Not logged in");
        setSession(session);
        setUser(session?.user || null);
      } catch (err) {
        console.error("Error in getSession:", err);
      } finally {
        setLoading(false);
      }
    };

    getSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      console.log("Auth state changed:", _event, session ? "Session active" : "No session");
      setSession(session);
      setUser(session?.user || null);
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    console.log("Signing in with email:", email);
    const response = await supabase.auth.signInWithPassword({ email, password });
    
    if (response.error) {
      console.error("Sign in error:", response.error);
    } else {
      console.log("Sign in successful");
    }
    
    return {
      data: response.data,
      error: response.error as Error | null,
    };
  };

  const signUp = async (email: string, password: string) => {
    console.log("Signing up with email:", email);
    const response = await supabase.auth.signUp({ email, password });
    
    if (response.error) {
      console.error("Sign up error:", response.error);
    } else {
      console.log("Sign up successful");
      
      // Try to create a profile for the new user
      if (response.data.user) {
        try {
          const { error } = await supabase
            .from("profiles")
            .insert({ 
              id: response.data.user.id,
              dark_mode: false,
              nickname: ""
            });
            
          if (error) {
            console.error("Error creating profile during signup:", error);
          }
        } catch (err) {
          console.error("Error in profile creation during signup:", err);
        }
      }
    }
    
    return {
      data: response.data,
      error: response.error as Error | null,
    };
  };

  const signOut = async () => {
    console.log("Signing out");
    await supabase.auth.signOut();
  };

  const value = {
    session,
    user,
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
