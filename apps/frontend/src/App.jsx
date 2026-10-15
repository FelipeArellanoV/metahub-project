import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import Dashboard from './pages/Dashboard.jsx';
import Athletes from './pages/Athletes.jsx';
import Sessions from './pages/Sessions.jsx';
import Planning from './pages/Planning.jsx';
import SupportPriority from './pages/SupportPriority.jsx';
import Compare from './pages/Compare.jsx';
import Drills from './pages/Drills.jsx';
import Reports from './pages/Reports.jsx';
import AthletePortal from './pages/AthletePortal.jsx';
import Settings from './pages/Settings.jsx';
import Login from './pages/Login.jsx';

function ProtectedRoute({ children }) {
  const token = localStorage.getItem('metahub_token');
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

function PublicAuthRoute({ children }) {
  const token = localStorage.getItem('metahub_token');
  if (token) {
    return <Navigate to="/" replace />;
  }
  return children;
}

function HomeRoute() {
  let user = null;
  try {
    const raw = localStorage.getItem('metahub_user');
    if (raw) user = JSON.parse(raw);
  } catch (e) {
    // Ignore error
  }
  if (user?.role === 'atleta') {
    return <AthletePortal />;
  }
  return <Dashboard />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/login"
          element={
            <PublicAuthRoute>
              <Login />
            </PublicAuthRoute>
          }
        />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <HomeRoute />
            </ProtectedRoute>
          }
        />
        <Route
          path="/athletes"
          element={
            <ProtectedRoute>
              <Athletes />
            </ProtectedRoute>
          }
        />
        <Route
          path="/sessions"
          element={
            <ProtectedRoute>
              <Sessions />
            </ProtectedRoute>
          }
        />
        <Route
          path="/calendar"
          element={
            <ProtectedRoute>
              <Planning />
            </ProtectedRoute>
          }
        />
        <Route
          path="/priority"
          element={
            <ProtectedRoute>
              <SupportPriority />
            </ProtectedRoute>
          }
        />
        <Route
          path="/compare"
          element={
            <ProtectedRoute>
              <Compare />
            </ProtectedRoute>
          }
        />
        <Route
          path="/drills"
          element={
            <ProtectedRoute>
              <Drills />
            </ProtectedRoute>
          }
        />
        <Route
          path="/reports"
          element={
            <ProtectedRoute>
              <Reports />
            </ProtectedRoute>
          }
        />
        <Route
          path="/portal"
          element={
            <ProtectedRoute>
              <AthletePortal />
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <Settings />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

