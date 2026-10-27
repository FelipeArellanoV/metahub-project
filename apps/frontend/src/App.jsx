/**
 * =========================================================================================
 * PROYECTO METAHUB — SEGUIMIENTO LONGITUDINAL DE LA TÉCNICA DE CARRERA EN ATLETISMO ESCOLAR
 * Escuela de Ingeniería Civil en Informática — Universidad Católica de Temuco
 * 
 * Memoria / Trabajo de Título:
 * Autores: Felipe Arellano Vargas & Sofía Henríquez Soto
 * Profesor Guía: Dr. Marcos Lévano
 * 
 * Módulo: Enrutador Principal de la Aplicación SPA / PWA (App.jsx)
 * Descripción: Define las rutas declarativas protegidas con validación de tokens JWT
 *              y la navegación principal para entrenadores de atletismo escolar.
 * =========================================================================================
 */

import { HashRouter as BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
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
import LiveCapture from './pages/LiveCapture.jsx';
import UploadVideo from './pages/UploadVideo.jsx';
import MyEvolution from './pages/MyEvolution.jsx';
import SessionReviews from './pages/SessionReviews.jsx';
import Collaboration from './pages/Collaboration.jsx';
import Clubs from './pages/Clubs.jsx';

/**
 * Componente de orden superior que restringe el acceso a usuarios autenticados y con rol autorizado
 */
function ProtectedRoute({ children, allowedRoles }) {
  const token = localStorage.getItem('metahub_token');
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  
  if (allowedRoles && allowedRoles.length > 0) {
    let user = null;
    try {
      const raw = localStorage.getItem('metahub_user');
      if (raw) user = JSON.parse(raw);
    } catch (e) {}

    const role = user?.role || 'entrenador';
    if (!allowedRoles.includes(role)) {
      return <Navigate to={role === 'atleta' ? '/portal' : '/'} replace />;
    }
  }

  return children;
}

/**
 * Componente que redirige al panel principal si el usuario ya cuenta con sesión activa
 */
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
        <Route path="/reviews" element={<ProtectedRoute allowedRoles={['atleta','entrenador']}><SessionReviews /></ProtectedRoute>} />
        <Route path="/upload" element={<ProtectedRoute allowedRoles={['atleta']}><UploadVideo /></ProtectedRoute>} />
        <Route path="/evolution" element={<ProtectedRoute allowedRoles={['atleta']}><MyEvolution /></ProtectedRoute>} />
        <Route path="/clubs" element={<ProtectedRoute allowedRoles={['entrenador']}><Clubs /></ProtectedRoute>} />
        <Route path="/collaboration" element={<ProtectedRoute allowedRoles={['atleta', 'entrenador']}><Collaboration /></ProtectedRoute>} />
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
            <ProtectedRoute allowedRoles={['entrenador']}>
              <Athletes />
            </ProtectedRoute>
          }
        />
        <Route
          path="/sessions"
          element={
            <ProtectedRoute allowedRoles={['entrenador']}>
              <Sessions />
            </ProtectedRoute>
          }
        />
        <Route
          path="/calendar"
          element={
            <ProtectedRoute allowedRoles={['atleta', 'entrenador']}>
              <Navigate to="/collaboration" replace />
            </ProtectedRoute>
          }
        />
        <Route
          path="/priority"
          element={
            <ProtectedRoute allowedRoles={['entrenador']}>
              <SupportPriority />
            </ProtectedRoute>
          }
        />
        <Route
          path="/compare"
          element={
            <ProtectedRoute allowedRoles={['atleta', 'entrenador']}>
              <Compare />
            </ProtectedRoute>
          }
        />
        <Route
          path="/drills"
          element={
            <ProtectedRoute allowedRoles={['atleta', 'entrenador']}>
              <Drills />
            </ProtectedRoute>
          }
        />
        <Route
          path="/reports"
          element={
            <ProtectedRoute allowedRoles={['entrenador']}>
              <Reports />
            </ProtectedRoute>
          }
        />
        <Route
          path="/portal"
          element={
            <ProtectedRoute allowedRoles={['atleta', 'entrenador']}>
              <AthletePortal />
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <ProtectedRoute allowedRoles={['atleta', 'entrenador']}>
              <Settings />
            </ProtectedRoute>
          }
        />
        <Route
          path="/capture"
          element={
            <ProtectedRoute allowedRoles={['entrenador']}>
              <LiveCapture />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

