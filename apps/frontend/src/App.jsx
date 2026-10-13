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

import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import Dashboard from './pages/Dashboard.jsx';
import Athletes from './pages/Athletes.jsx';
import Sessions from './pages/Sessions.jsx';
import Settings from './pages/Settings.jsx';
import Login from './pages/Login.jsx';

/**
 * Componente de orden superior que restringe el acceso a usuarios autenticados
 */
function ProtectedRoute({ children }) {
  const token = localStorage.getItem('metahub_token');
  if (!token) {
    return <Navigate to="/login" replace />;
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
              <Dashboard />
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

