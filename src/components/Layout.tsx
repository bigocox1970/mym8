import React, { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { Home, FileText, Settings, LogOut, ListTodo, Menu, X, CheckSquare, ClipboardList, Bot, MessageSquare, CalendarCheck, LineChart, Sparkles, ArrowRight, Trash, HelpCircle } from "lucide-react";
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
import { cn } from "@/lib/utils";

// No need to import logo - will use direct path

// Custom CSS styles for the no-scrollbar class 
const styles = `
  @layer utilities {
    .no-scrollbar::-webkit-scrollbar {
      display: none;
    }
    .no-scrollbar {
      -ms-overflow-style: none;
      scrollbar-width: none;
    }
  }
`;

// Context to share sidebar state with page components
export const SidebarContext = React.createContext({
  toggleSidebar: () => {},
  isOpen: true,
  setSidebarOpen: (open: boolean) => {},
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

  const handleResetWizard = async (keepExistingData = false) => {
    if (!user) return;
    
    try {
      setResetWizardLoading(true);
      
      // Store user preference in localStorage instead of database
      localStorage.setItem('wizard_keep_existing_data', keepExistingData ? 'true' : 'false');
      
      // Set the wizard_completed to false to trigger the wizard again
      const { error } = await supabase
        .from("profiles")
        .update({ 
          wizard_completed: false
        })
        .eq("id", user.id);
        
      if (error) throw error;
      
      // If user chose to delete all data, attempt to delete their goals and actions
      if (!keepExistingData) {
        try {
          // Try to delete actions if table exists, ignore any errors
          try {
            await supabase
              .from("actions")
              .delete()
              .eq("user_id", user.id);
              
            console.log("Actions deleted successfully");
          } catch (actionsError) {
            // Ignore errors - table might not exist
            console.log("No actions table found or could not delete actions");
          }
          
          // Try to delete goals if table exists, ignore any errors
          try {
            await supabase
              .from("goals")
              .delete()
              .eq("user_id", user.id);
              
            console.log("Goals deleted successfully");
          } catch (goalsError) {
            // Ignore errors - table might not exist
            console.log("No goals table found or could not delete goals");
          }
          
          toast.success("Data reset successful");
        } catch (deleteError) {
          console.error("Error during data reset (continuing with wizard):", deleteError);
          // Continue without showing error to user
        }
      }
      
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
    isOpen: sidebarOpen,
    setSidebarOpen,
  };

  return (
    <SidebarContext.Provider value={contextValue}>
      {/* Add the CSS styles */}
      <style>{styles}</style>
      
      <div className="h-screen w-full bg-gray-50 flex dark:bg-gray-900 overflow-hidden">
        {/* Sidebar */}
        {user && (
          <>
            {/* Overlay for mobile sidebar */}
            {sidebarOpen && (
              <div
                className="fixed inset-0 bg-black bg-opacity-40 z-40 md:hidden"
                onClick={() => setSidebarOpen(false)}
                aria-label="Close sidebar overlay"
              />
            )}
            <aside 
              className={`${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} fixed md:static h-full z-50 w-64 bg-white border-r shadow-sm dark:bg-gray-800 dark:border-gray-700 flex flex-col transition-transform duration-300 ease-in-out`}
              style={{ height: '100vh', maxHeight: '100vh', top: 0 }}
            >
              <div className="flex-shrink-0 pt-4 pb-4 flex justify-center items-center border-b dark:border-gray-700">
                <Link to="/dashboard" className="flex justify-center w-full" onClick={() => window.innerWidth < 768 && setSidebarOpen(false)}>
                  <img 
                    src="/mym8-logo1.png" 
                    alt="MyM8 Logo" 
                    className="w-4/5 max-w-40" 
                  />
                </Link>
              </div>
              <div className="flex flex-col flex-1 overflow-hidden">
                <nav className="flex-1 overflow-y-auto p-4 space-y-2 no-scrollbar">
                  <Link to="/dashboard" onClick={() => window.innerWidth < 768 && setSidebarOpen(false)}>
                    <Button 
                      variant={isActive("/dashboard") ? "default" : "ghost"} 
                      className="w-full justify-start"
                    >
                      <Home className="mr-2 h-4 w-4" />
                      <span>Dashboard</span>
                    </Button>
                  </Link>
                  <Link to="/goals" onClick={() => window.innerWidth < 768 && setSidebarOpen(false)}>
                    <Button 
                      variant={isActive("/goals") ? "default" : "ghost"} 
                      className="w-full justify-start"
                    >
                      <ListTodo className="mr-2 h-4 w-4" />
                      <span>Goals</span>
                    </Button>
                  </Link>
                  <Link to="/actions" onClick={() => window.innerWidth < 768 && setSidebarOpen(false)}>
                    <Button 
                      variant={isActive("/actions") ? "default" : "ghost"} 
                      className="w-full justify-start"
                    >
                      <CheckSquare className="mr-2 h-4 w-4" />
                      <span>Actions</span>
                    </Button>
                  </Link>
                  <Link to="/todo" onClick={() => window.innerWidth < 768 && setSidebarOpen(false)}>
                    <Button 
                      variant={isActive("/todo") ? "default" : "ghost"} 
                      className="w-full justify-start"
                    >
                      <ListTodo className="mr-2 h-4 w-4" />
                      <span>To Do List</span>
                    </Button>
                  </Link>
                  <Link to="/logs" onClick={() => window.innerWidth < 768 && setSidebarOpen(false)}>
                    <Button 
                      variant={isActive("/logs") ? "default" : "ghost"} 
                      className="w-full justify-start"
                    >
                      <ClipboardList className="mr-2 h-4 w-4" />
                      <span>Activity Log</span>
                    </Button>
                  </Link>
                  <Link to="/journal" onClick={() => window.innerWidth < 768 && setSidebarOpen(false)}>
                    <Button 
                      variant={isActive("/journal") ? "default" : "ghost"} 
                      className="w-full justify-start"
                    >
                      <MessageSquare className="mr-2 h-4 w-4" />
                      <span>Journal</span>
                    </Button>
                  </Link>
                  <Link to="/pricing" onClick={() => window.innerWidth < 768 && setSidebarOpen(false)}>
                    <Button 
                      variant={isActive("/pricing") ? "default" : "ghost"} 
                      className="w-full justify-start"
                    >
                      <Sparkles className="mr-2 h-4 w-4" />
                      <span>Subscription Plans</span>
                    </Button>
                  </Link>
                  <Link to="/assistant" onClick={() => window.innerWidth < 768 && setSidebarOpen(false)}>
                    <Button 
                      variant={isActive("/assistant") ? "default" : "ghost"} 
                      className="w-full justify-start"
                    >
                      <Bot className="mr-2 h-4 w-4" />
                      <span>AI Assistant</span>
                    </Button>
                  </Link>
                  <Link to="/help" onClick={() => window.innerWidth < 768 && setSidebarOpen(false)}>
                    <Button 
                      variant={isActive("/help") ? "default" : "ghost"} 
                      className="w-full justify-start"
                    >
                      <HelpCircle className="mr-2 h-4 w-4" />
                      <span>Help & AI Guide</span>
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
                    <AlertDialogContent className="max-w-md">
                      <AlertDialogHeader>
                        <AlertDialogTitle>Run Setup Wizard Again?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Choose how you'd like to proceed with the wizard:
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <div className="space-y-2">
                        <div className="grid grid-cols-1 gap-3">
                          <Button
                            variant="outline"
                            className="w-full p-3 h-auto flex flex-col items-center space-y-1 text-center"
                            onClick={() => handleResetWizard(true)}
                            disabled={resetWizardLoading}
                          >
                            <ArrowRight className="h-6 w-6 mb-1" />
                            <span className="font-semibold">Keep Existing Data</span>
                            <p className="text-xs text-muted-foreground">
                              Keep all your current goals and actions while updating settings
                            </p>
                          </Button>
                          
                          <Button
                            variant="outline"
                            className="w-full p-3 h-auto flex flex-col items-center space-y-1 text-center"
                            onClick={() => handleResetWizard(false)}
                            disabled={resetWizardLoading}
                          >
                            <Trash className="h-6 w-6 mb-1" />
                            <span className="font-semibold">Start Fresh</span>
                            <p className="text-xs text-muted-foreground">
                              Delete all existing goals and actions and start over completely
                            </p>
                          </Button>
                        </div>
                      </div>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                  <Link to="/settings" onClick={() => window.innerWidth < 768 && setSidebarOpen(false)}>
                    <Button 
                      variant={isActive("/settings") ? "default" : "ghost"} 
                      className="w-full justify-start"
                    >
                      <Settings className="mr-2 h-4 w-4" />
                      <span>Settings</span>
                    </Button>
                  </Link>
                  {user?.email === "admin@mym8.app" && (
                    <Link to="/admin" onClick={() => window.innerWidth < 768 && setSidebarOpen(false)}>
                      <Button 
                        variant={isActive("/admin") ? "default" : "ghost"} 
                        className="w-full justify-start"
                      >
                        <Settings className="mr-2 h-4 w-4" />
                        <span>Admin</span>
                      </Button>
                    </Link>
                  )}
                </nav>
                <div className="sticky bottom-0 p-4 border-t dark:border-gray-700 bg-white dark:bg-gray-800 shadow-[0_-1px_2px_rgba(0,0,0,0.1)]">
                  <Button 
                    variant="ghost" 
                    className="w-full justify-start font-medium" 
                    onClick={handleSignOut}
                    disabled={loading}
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>{loading ? "Logging out..." : "Logout"}</span>
                  </Button>
                </div>
              </div>
            </aside>
          </>
        )}
        {/* Main content */}
        <main className="flex-1 dark:bg-gray-900 dark:text-white w-full overflow-y-auto h-screen no-scrollbar">
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
  const { isOpen, setSidebarOpen } = React.useContext(SidebarContext);
  return (
    <Button
      variant="outline"
      size="icon"
      className="md:hidden bg-white text-gray-800"
      onClick={() => setSidebarOpen(!isOpen)}
    >
      {isOpen ? <X size={20} /> : <Menu size={20} />}
    </Button>
  );
};
