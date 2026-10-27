/**
 * =========================================================================================
 * PROYECTO METAHUB — SEGUIMIENTO LONGITUDINAL DE LA TÉCNICA DE CARRERA EN ATLETISMO ESCOLAR
 * Escuela de Ingeniería Civil en Informática — Universidad Católica de Temuco
 * 
 * Memoria / Trabajo de Título:
 * Autores: Felipe Arellano Vargas & Sofía Henríquez Soto
 * Profesor Guía: Dr. Marcos Lévano
 * 
 * Módulo: Punto de Entrada de Renderizado React (main.jsx)
 * Descripción: Monta la aplicación SPA en el nodo DOM raíz con React 18 Concurrent Root.
 * =========================================================================================
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './styles.css';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary detectó un error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 28, color: '#0f172a', fontFamily: 'system-ui, -apple-system, sans-serif', maxWidth: 640, margin: '40px auto', background: '#ffffff', borderRadius: 16, border: '1px solid #e2e8f0', boxShadow: '0 10px 25px rgba(0,0,0,0.06)' }}>
          <h2 style={{ color: '#ef4444', margin: '0 0 10px', fontSize: 18 }}>Aviso de Interfaz</h2>
          <p style={{ fontSize: 13, color: '#475569', margin: '0 0 14px' }}>
            Se detectó una interrupción en el renderizado del componente:
          </p>
          <pre style={{ background: '#0f172a', color: '#f8fafc', padding: 14, borderRadius: 10, overflowX: 'auto', fontSize: 12, lineHeight: 1.5 }}>
            {this.state.error?.message || String(this.state.error)}
          </pre>
          <div style={{ marginTop: 20, display: 'flex', gap: 10 }}>
            <button
              type="button"
              onClick={() => { window.location.reload(); }}
              style={{ padding: '10px 18px', background: '#0284c7', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: 13 }}
            >
              Recargar página
            </button>
            <button
              type="button"
              onClick={() => { window.location.hash = '#/'; window.location.reload(); }}
              style={{ padding: '10px 18px', background: '#f1f5f9', color: '#334155', border: '1px solid #cbd5e1', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 13 }}
            >
              Ir al Inicio
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
