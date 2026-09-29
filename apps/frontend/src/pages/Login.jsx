import { Activity, ArrowRight, Lock, Mail, User } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Login({ onLoginSuccess }) {
  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const API_BASE = window.location.hostname === 'localhost' ? 'http://localhost:3000' : '';
    const endpoint = isRegister ? '/api/auth/register' : '/api/auth/login';
    const body = isRegister 
      ? { name, email, password, role: 'entrenador' } 
      : { email, password };

    try {
      const response = await fetch(`${API_BASE}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al autenticar');
      }

      localStorage.setItem('metahub_token', data.token);
      localStorage.setItem('metahub_user', JSON.stringify(data.user));

      if (onLoginSuccess) onLoginSuccess(data.user, data.token);
      navigate('/');
    } catch (err) {
      setError(err.message);
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

          <button type="submit" className="submit-btn">
            <span>{isRegister ? 'Registrarse' : 'Ingresar a MetaHub'}</span>
            <ArrowRight size={18} />
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
