import React, { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { Home, FileText, Settings, LogOut, ListTodo, Menu, X, CheckSquare, ClipboardList, Bot, MessageSquare, CalendarCheck, LineChart, Sparkles } from "lucide-react";
import { toast } from "@/components/ui/sonner";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/lib/supabase";

// No need to import logo - will use direct path

// Context to share sidebar state with page components
export const SidebarContext = React.createContext({
  toggleSidebar: () => {},
  isOpen: true
});

export const Layout = ({ children }: { children: React.ReactNode }) => {
  const { user, signOut, profile, refreshProfile } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [resetWizardLoading, setResetWizardLoading] = useState(false);

  useEffect(() => {
    if (user && !profile) {
      const loadProfile = async () => {
        try {
          console.log("Layout fetching profile for user ID:", user.id);
          await refreshProfile();
        } catch (error) {
          console.error("Error loading profile:", error);
          toast.error("Failed to load profile settings");
        }
      };
      
      loadProfile();
    }
  }, [user, profile, refreshProfile]);

  // Close sidebar on mobile when navigating
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setSidebarOpen(false);
      } else {
        setSidebarOpen(true);
      }
    };

    // Initial check
    handleResize();

    // Add event listener
    window.addEventListener('resize', handleResize);
    
    // Clean up
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (profile && profile.theme === 'system') {
      // Set up system theme preference listener
      const colorSchemeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      
      const handleThemeChange = (e: MediaQueryListEvent) => {
        document.documentElement.classList.remove("dark", "light");
        if (e.matches) {
          document.documentElement.classList.add("dark");
        } else {
          document.documentElement.classList.add("light");
        }
      };
      
      // Also check on initial load
      if (colorSchemeMediaQuery.matches) {
        document.documentElement.classList.remove("dark", "light");
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark", "light");
        document.documentElement.classList.add("light");
      }
      
      // Add listener
      colorSchemeMediaQuery.addEventListener('change', handleThemeChange);
      
      // Cleanup
      return () => {
        colorSchemeMediaQuery.removeEventListener('change', handleThemeChange);
      };
    }
  }, [profile]);

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  const handleSignOut = async () => {
    try {
      setLoading(true);
      await signOut();
      toast.success("Logged out successfully");
    } catch (error) {
      console.error("Error signing out:", error);
      toast.error("Failed to log out");
    } finally {
      setLoading(false);
    }
  };

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const handleResetWizard = async () => {
    if (!user) return;
    
    try {
      setResetWizardLoading(true);
      
      const { error } = await supabase
        .from("profiles")
        .update({ wizard_completed: false })
        .eq("id", user.id);
        
      if (error) throw error;
      
      // Close sidebar on mobile
      if (window.innerWidth < 768) {
        setSidebarOpen(false);
      }
      
      toast.success("Wizard reset successful");
      navigate("/wizard");
    } catch (error) {
      console.error("Error resetting wizard:", error);
      toast.error("Failed to reset wizard");
    } finally {
      setResetWizardLoading(false);
    }
  };

  // Context value
  const contextValue = {
    toggleSidebar,
    isOpen: sidebarOpen
  };

  return (
    <SidebarContext.Provider value={contextValue}>
      <div className="min-h-screen bg-gray-50 flex dark:bg-gray-900">
        {/* Sidebar */}
        {user && (
          <aside 
            className={`${
              sidebarOpen ? 'translate-x-0' : '-translate-x-full'
            } fixed md:static h-screen z-40 w-64 bg-white border-r shadow-sm dark:bg-gray-800 dark:border-gray-700 flex flex-col transition-transform duration-300 ease-in-out`}
          >
            <div className="pt-4 pb-4 flex justify-center items-center">
              <Link to="/dashboard" className="flex justify-center w-full">
                <img 
                  src="mym8-logo1.png" 
                  alt="MyM8 Logo" 
                  className="w-4/5 max-w-40" 
                />
              </Link>
            </div>
            <div className="p-4 flex-1 flex flex-col">
              <nav className="space-y-2 flex-1">
                <Link to="/dashboard">
                  <Button 
                    variant={isActive("/dashboard") ? "default" : "ghost"} 
                    className="w-full justify-start"
                    onClick={() => window.innerWidth < 768 && setSidebarOpen(false)}
                  >
                    <Home className="mr-2 h-4 w-4" />
                    <span>Dashboard</span>
                  </Button>
                </Link>
                <Link to="/goals">
                  <Button 
                    variant={isActive("/goals") ? "default" : "ghost"} 
                    className="w-full justify-start"
                    onClick={() => window.innerWidth < 768 && setSidebarOpen(false)}
                  >
                    <ListTodo className="mr-2 h-4 w-4" />
                    <span>Goals</span>
                  </Button>
                </Link>
                <Link to="/actions">
                  <Button 
                    variant={isActive("/actions") ? "default" : "ghost"} 
                    className="w-full justify-start"
                    onClick={() => window.innerWidth < 768 && setSidebarOpen(false)}
                  >
                    <CheckSquare className="mr-2 h-4 w-4" />
                    <span>Actions</span>
                  </Button>
                </Link>
                <Link to="/logs">
                  <Button 
                    variant={isActive("/logs") ? "default" : "ghost"} 
                    className="w-full justify-start"
                    onClick={() => window.innerWidth < 768 && setSidebarOpen(false)}
                  >
                    <ClipboardList className="mr-2 h-4 w-4" />
                    <span>Activity Log</span>
                  </Button>
                </Link>
                <Link to="/journal">
                  <Button 
                    variant={isActive("/journal") ? "default" : "ghost"} 
                    className="w-full justify-start"
                    onClick={() => window.innerWidth < 768 && setSidebarOpen(false)}
                  >
                    <MessageSquare className="mr-2 h-4 w-4" />
                    <span>Journal</span>
                  </Button>
                </Link>
                <Link to="/assistant">
                  <Button 
                    variant={isActive("/assistant") ? "default" : "ghost"} 
                    className="w-full justify-start"
                    onClick={() => window.innerWidth < 768 && setSidebarOpen(false)}
                  >
                    <Bot className="mr-2 h-4 w-4" />
                    <span>AI Assistant</span>
                  </Button>
                </Link>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button 
                      variant={isActive("/wizard") ? "default" : "ghost"} 
                      className="w-full justify-start"
                    >
                      <Sparkles className="mr-2 h-4 w-4" />
                      <span>Setup Wizard</span>
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Run Setup Wizard Again?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Warning: Running the wizard again may replace your existing goals and actions. 
                        Are you sure you want to continue?
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction 
                        onClick={handleResetWizard}
                        disabled={resetWizardLoading}
                      >
                        {resetWizardLoading ? "Resetting..." : "Continue"}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
                <Link to="/settings">
                  <Button 
                    variant={isActive("/settings") ? "default" : "ghost"} 
                    className="w-full justify-start"
                    onClick={() => window.innerWidth < 768 && setSidebarOpen(false)}
                  >
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Settings</span>
                  </Button>
                </Link>
                {user?.email === "admin@mym8.app" && (
                  <Link to="/admin">
                    <Button 
                      variant={isActive("/admin") ? "default" : "ghost"} 
                      className="w-full justify-start"
                      onClick={() => window.innerWidth < 768 && setSidebarOpen(false)}
                    >
                      <Settings className="mr-2 h-4 w-4" />
                      <span>Admin</span>
                    </Button>
                  </Link>
                )}
              </nav>
              <div>
                <Button 
                  variant="ghost" 
                  className="w-full justify-start" 
                  onClick={handleSignOut}
                  disabled={loading}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>{loading ? "Logging out..." : "Logout"}</span>
                </Button>
              </div>
            </div>
          </aside>
        )}
        {/* Main content */}
        <main className="flex-1 dark:bg-gray-900 dark:text-white">
          <div className="p-4 md:p-8 w-full">
            {children}
          </div>
        </main>
      </div>
    </SidebarContext.Provider>
  );
};

// Export a menu button component that can be used directly in page headers
export const MenuToggleButton = () => {
  const { toggleSidebar, isOpen } = React.useContext(SidebarContext);
  
  return (
    <Button
      variant="outline"
      size="icon"
      className="md:hidden bg-white text-gray-800"
      onClick={toggleSidebar}
    >
      {isOpen ? <X size={20} /> : <Menu size={20} />}
    </Button>
  );
};
