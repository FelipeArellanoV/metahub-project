/**
 * =========================================================================================
 * PROYECTO METAHUB — SEGUIMIENTO LONGITUDINAL DE LA TÉCNICA DE CARRERA EN ATLETISMO ESCOLAR
 * Escuela de Ingeniería Civil en Informática — Universidad Católica de Temuco
 * 
 * Memoria / Trabajo de Título:
 * Autores: Felipe Arellano Vargas & Sofía Henríquez Soto
 * Profesor Guía: Dr. Marcos Lévano
 * 
 * Módulo: Pantalla de Autenticación y Registro de Entrenadores (Login.jsx)
 * Descripción: Provee el formulario seguro de inicio de sesión y registro de entrenadores,
 *              almacenando el token JWT emitido y sincronizando el estado de la sesión.
 * =========================================================================================
 */

import { Activity, ArrowRight, Loader2, Lock, Mail, User } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api.js';

export default function Login({ onLoginSuccess }) {
  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      let data;
      if (isRegister) {
        data = await api.auth.register(name, email, password);
      } else {
        data = await api.auth.login(email, password);
      }

      if (onLoginSuccess) onLoginSuccess(data.user, data.token);
      navigate('/');
    } catch (err) {
      setError(err.message || 'Error al autenticar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <div className="login-brand-icon">
            <Activity size={28} />
          </div>
          <h2>{isRegister ? 'Crear Cuenta' : 'Iniciar Sesión'}</h2>
          <p>{isRegister ? 'Regístrate como Entrenador' : 'Ingresa a MetaHub Performance Lab'}</p>
        </div>

        {error && <div className="error-box">{error}</div>}

        <form onSubmit={handleSubmit}>
          {isRegister && (
            <div className="form-group">
              <label>Nombre Completo</label>
              <div className="input-wrapper">
                <User size={18} />
                <input
                  type="text"
                  placeholder="Felipe Arellano"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
            </div>
          )}

          <div className="form-group">
            <label>Correo Electrónico</label>
            <div className="input-wrapper">
              <Mail size={18} />
              <input
                type="email"
                placeholder="entrenador@uct.cl"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label>Contraseña</label>
            <div className="input-wrapper">
              <Lock size={18} />
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>

          <button type="submit" className="submit-btn" disabled={loading}>
            {loading && <Loader2 size={18} className="spin-animation" />}
            <span>{loading ? 'Procesando...' : (isRegister ? 'Registrarse' : 'Ingresar a MetaHub')}</span>
            {!loading && <ArrowRight size={18} />}
          </button>
        </form>

        <div className="toggle-auth">
          <span>{isRegister ? '¿Ya tienes cuenta?' : '¿No tienes cuenta de entrenador?'}</span>
          <button
            type="button"
            className="text-link-button"
            onClick={() => { setIsRegister(!isRegister); setError(''); }}
          >
            {isRegister ? ' Iniciar Sesión' : ' Registrarse'}
          </button>
        </div>
      </div>
    </div>
  );
}
