import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { toast } from "@/components/ui/sonner";
import { supabase } from "@/lib/supabase";
import { ChevronLeft } from "lucide-react";

const formSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email" }),
  password: z.string().min(6, { message: "Password must be at least 6 characters" }),
});

type FormValues = z.infer<typeof formSchema>;

const Login = () => {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isLoading, setIsLoading] = useState(false);
  
  // Check if redirected from email verification
  useEffect(() => {
    // Parse the URL to detect verification confirmation
    const hasEmailVerified = location.hash.includes('access_token=');
    
    if (hasEmailVerified) {
      toast.success("Email verified! You can now log in.");
    }
    
    // Also handle password reset confirmations
    const isRecoveringPassword = new URLSearchParams(location.search).get('type') === 'recovery';
    if (isRecoveringPassword) {
      toast.success("Password reset successful! You can now log in with your new password.");
    }
  }, [location]);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (values: FormValues) => {
    setIsLoading(true);
    try {
      const { error } = await signIn(values.email, values.password);
      if (error) {
        if (error.message?.toLowerCase().includes('email not confirmed')) {
          toast.error("Email not verified. Please check your inbox for verification email.");
          // Show a simpler toast with a button afterward
          setTimeout(() => {
            toast.info(
              <div className="flex flex-col gap-2">
                <span>Want to resend the verification email?</span>
                <Button 
                  size="sm" 
                  onClick={() => {
                    supabase.auth.resend({
                      type: 'signup',
                      email: values.email,
                      options: {
                        emailRedirectTo: `${window.location.origin}/verification-success`
                      }
                    }).then(({ error }) => {
                      if (error) throw error;
                      toast.success("Verification email resent! Please check your inbox.");
                    }).catch(() => {
                      toast.error("Failed to resend verification email");
                    });
                  }}
                  className="w-full"
                >
                  Resend verification email
                </Button>
              </div>,
              { duration: 10000 }
            );
          }, 1000);
          return;
        }
        toast.error(error.message || "Failed to sign in");
        return;
      }
      toast.success("Logged in successfully");
      navigate("/dashboard");
    } catch (error) {
      toast.error("An unexpected error occurred");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-4 dark:bg-gray-900">
      <div className="absolute top-4 left-4">
        <Link to="/" className="flex items-center text-sm text-muted-foreground hover:text-primary transition-colors">
          <ChevronLeft className="h-4 w-4 mr-1" />
          Back to Home
        </Link>
      </div>
      <div className="w-full max-w-md space-y-6 bg-white p-8 rounded-lg shadow-md dark:bg-gray-800 dark:text-white">
        <div className="text-center">
          <img 
            src="/mym8-logo1.png" 
            alt="MyM8 Logo" 
            className="mx-auto mb-4 w-36"
          />
          <h1 className="text-3xl font-bold">Welcome Back</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">Sign in to your account</p>
        </div>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input placeholder="your@email.com" {...field} disabled={isLoading} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="••••••••" {...field} disabled={isLoading} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Signing in..." : "Sign in"}
            </Button>
          </form>
        </Form>
        
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            Don't have an account?{" "}
            <Link to="/register" className="font-medium text-primary hover:underline">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
