
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

import { useAuth } from './context/AuthContext';

import Login from './pages/Login';
import Signup from './pages/Signup';
import ForgotPassword from './pages/ForgotPassword';
import Dashboard from './pages/Dashboard';
import Settings from './pages/Settings';
import Tutor from './pages/Tutor';
import Subjects from './pages/Subjects';
import SubjectDetail from './pages/SubjectDetail';
import TopicDetail from './pages/TopicDetail';
import Notes from './pages/Notes';
import Flashcards from './pages/Flashcards';
import Quizzes from './pages/Quizzes';

import AppLayout from './layouts/AppLayout';

function LoadingScreen() {
  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center bg-[#080F1C]">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-md border border-[#22D3EE]/30 bg-[#111B2B] flex items-center justify-center text-[#22D3EE] font-bold text-xl">
          P
        </div>
        <div className="text-xl font-semibold text-white">
          PDT <span className="text-[#94A3B8]">Study</span>
        </div>
      </div>
      <div className="mt-6 w-7 h-7 border-2 border-[#263244] border-t-[#22D3EE] rounded-full animate-spin" />
      <p className="mt-4 text-sm text-[#64748B]">
        Preparing your learning space...
      </p>
    </div>
  );
}

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;

  return children;
}

function PublicOnlyRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) return <LoadingScreen />;
  if (user) return <Navigate to="/" replace />;

  return children;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<PublicOnlyRoute><Login /></PublicOnlyRoute>} />
      <Route path="/signup" element={<PublicOnlyRoute><Signup /></PublicOnlyRoute>} />
      <Route path="/forgot-password" element={<ForgotPassword />} />

      <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
        <Route index element={<Dashboard />} />
        <Route path="tutor" element={<Tutor />} />

        <Route path="subjects" element={<Subjects />} />
        <Route path="subjects/:id" element={<SubjectDetail />} />
        <Route path="topics/:id" element={<TopicDetail />} />

        <Route path="notes" element={<Notes />} />
        <Route path="flashcards" element={<Flashcards />} />
        <Route path="quizzes" element={<Quizzes />} />

        <Route path="settings" element={<Settings />} />
        <Route path="planner" element={<div className="p-6 text-white">Study Planner coming soon.</div>} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}
