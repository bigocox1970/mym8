import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";

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

const queryClient = new QueryClient();

// Protected Route wrapper
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();

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

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<Navigate to="/login" />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/verification-success" element={<VerificationSuccess />} />
            
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
            
            {/* Log routes */}
            <Route path="/logs" element={<ProtectedRoute><ActivityLog /></ProtectedRoute>} />
            
            {/* AI Assistant */}
            <Route path="/assistant" element={<ProtectedRoute><AIAssistant /></ProtectedRoute>} />
            
            {/* Wizard */}
            <Route path="/wizard" element={<ProtectedRoute><SetupWizard /></ProtectedRoute>} />
            
            {/* Tools routes */}
            <Route path="/tools/delete" element={
              <ProtectedRoute>
                <TestDelete />
              </ProtectedRoute>
            } />
            
            {/* Catch-all route */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
