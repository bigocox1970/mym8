import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { SettingsProvider } from "@/contexts/SettingsContext";
import { SnackbarProvider } from "@/contexts/SnackbarContext";
import { SubscriptionProvider } from "@/contexts/SubscriptionContext";
import { checkAndResetTasks } from "./lib/taskResetService";

// Pages
import Login from "./pages/Auth/Login";
import Register from "./pages/Auth/Register";
import Onboarding from "./pages/Onboarding/Onboarding";
import Dashboard from "./pages/Dashboard/Dashboard";
import JournalList from "./pages/Journal/JournalList";
import NewJournal from "./pages/Journal/NewJournal";
import JournalDetail from "./pages/Journal/JournalDetail";
import EditJournal from "./pages/Journal/EditJournal";
import AdminPanel from "./pages/Admin/AdminPanel";
import NotFound from "./pages/NotFound";
import GoalDetail from "./pages/Goals/GoalDetail";
import UserSettings from "./pages/Settings/UserSettings";
import GoalsList from "./pages/Goals/GoalsList";
import NewGoal from "./pages/Goals/NewGoal";
import EditGoal from "./pages/Goals/EditGoal";
import ActionsList from "./pages/Actions/ActionsList";
import ActivityLog from "./pages/Logs/ActivityLog";
import AIAssistant from "./pages/AI/AIAssistant";
import SetupWizard from './pages/Wizard/SetupWizard';
import TestDelete from "./pages/Tools/TestDelete";
import TTSTest from "./pages/Tools/TTSTest";
import HelpPage from "./pages/Help/HelpPage";
import Todo from "./pages/Todo/Todo";
import Pricing from "./pages/Pricing/Pricing";
import LandingPage from "./pages/Landing/LandingPage";

// Set initial theme based on localStorage or system preference
const initializeTheme = () => {
  const storedTheme = localStorage.getItem('theme');
  if (storedTheme === 'dark' || 
     (storedTheme === 'system' && 
      window.matchMedia('(prefers-color-scheme: dark)').matches) ||
     (!storedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.add('light');
  }
};

// Initialize theme on load
initializeTheme();

// Create a VerificationSuccess component
const VerificationSuccess = () => {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-4 dark:bg-gray-900">
      <div className="w-full max-w-md space-y-6 bg-white p-8 rounded-lg shadow-md dark:bg-gray-800 dark:text-white">
        <div className="text-center">
          <img 
            src="/mym8-logo1.png" 
            alt="MyM8 Logo" 
            className="mx-auto mb-4 w-36"
          />
          <h1 className="text-3xl font-bold">Email Verified!</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">Your email has been successfully verified.</p>
          <p className="mt-6">
            <a
              href="/login"
              className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90"
            >
              Go to Login
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

// Create a simple Progress component as a redirect for now
const ProgressPage = () => {
  return <Navigate to="/actions" replace />;
};

const queryClient = new QueryClient();

// Protected Route wrapper with task reset functionality
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  // Check and reset tasks whenever location changes and user is authenticated
  useEffect(() => {
    if (user) {
      // Reset tasks when navigating through the app
      checkAndResetTasks(user.id);
    }
  }, [user, location.pathname]);

  if (loading) {
    return <div className="flex justify-center items-center h-screen">Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

// Admin Route wrapper
const AdminRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="flex justify-center items-center h-screen">Loading...</div>;
  }

  if (!user || user.email !== "admin@mym8.app") {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

// Auth Route - redirects to dashboard if user is already logged in
const AuthRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return <div className="flex justify-center items-center h-screen">Loading...</div>;
  }
  
  if (user) {
    return <Navigate to="/dashboard" replace />;
  }
  
  return <>{children}</>;
};

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <SubscriptionProvider>
          <SettingsProvider>
            <SnackbarProvider>
              <TooltipProvider>
                <Toaster />
                <Sonner />
                <BrowserRouter>
                  <Routes>
                    {/* Public routes */}
                    <Route path="/" element={<LandingPage />} />
                    <Route path="/login" element={<AuthRoute><Login /></AuthRoute>} />
                    <Route path="/register" element={<AuthRoute><Register /></AuthRoute>} />
                    <Route path="/verification-success" element={<VerificationSuccess />} />
                    <Route path="/pricing" element={<Pricing />} />
                    
                    {/* Protected routes */}
                    <Route path="/onboarding" element={<ProtectedRoute><Onboarding /></ProtectedRoute>} />
                    <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                    <Route path="/journal" element={<ProtectedRoute><JournalList /></ProtectedRoute>} />
                    <Route path="/journal/new" element={<ProtectedRoute><NewJournal /></ProtectedRoute>} />
                    <Route path="/journal/:id" element={<ProtectedRoute><JournalDetail /></ProtectedRoute>} />
                    <Route path="/journal/edit/:id" element={<ProtectedRoute><EditJournal /></ProtectedRoute>} />
                    <Route path="/settings" element={<ProtectedRoute><UserSettings /></ProtectedRoute>} />
                    
                    {/* Admin routes */}
                    <Route path="/admin" element={<AdminRoute><AdminPanel /></AdminRoute>} />
                    
                    {/* Goals routes */}
                    <Route path="/goals" element={<ProtectedRoute><GoalsList /></ProtectedRoute>} />
                    <Route path="/goals/new" element={<ProtectedRoute><NewGoal /></ProtectedRoute>} />
                    <Route path="/goals/:id" element={<ProtectedRoute><GoalDetail /></ProtectedRoute>} />
                    <Route path="/goals/:id/edit" element={<ProtectedRoute><EditGoal /></ProtectedRoute>} />
                    
                    {/* Actions routes */}
                    <Route path="/actions" element={<ProtectedRoute><ActionsList /></ProtectedRoute>} />
                    
                    {/* Progress route - redirects to actions for now */}
                    <Route path="/progress" element={<ProtectedRoute><ProgressPage /></ProtectedRoute>} />
                    
                    {/* Log routes */}
                    <Route path="/logs" element={<ProtectedRoute><ActivityLog /></ProtectedRoute>} />
                    
                    {/* AI Assistant */}
                    <Route path="/assistant" element={<ProtectedRoute><AIAssistant /></ProtectedRoute>} />
                    
                    {/* Help Page */}
                    <Route path="/help" element={<ProtectedRoute><HelpPage /></ProtectedRoute>} />
                    
                    {/* Wizard */}
                    <Route path="/wizard" element={<ProtectedRoute><SetupWizard /></ProtectedRoute>} />
                    
                    {/* Tools routes */}
                    <Route path="/tools/delete" element={<ProtectedRoute><TestDelete /></ProtectedRoute>} />
                    <Route path="/tools/tts" element={<ProtectedRoute><TTSTest /></ProtectedRoute>} />
                    
                    {/* Todo routes */}
                    <Route path="/todo" element={<ProtectedRoute><Todo /></ProtectedRoute>} />
                    
                    {/* Catch-all route */}
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </BrowserRouter>
              </TooltipProvider>
            </SnackbarProvider>
          </SettingsProvider>
        </SubscriptionProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
