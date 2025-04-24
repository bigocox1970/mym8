
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

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

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
  const { user, loading, profile } = useAuth();

  if (loading) {
    return <div className="flex justify-center items-center h-screen">Loading...</div>;
  }

  if (!user || !profile?.is_admin) {
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
            
            {/* Catch-all route */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
