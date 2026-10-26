import { Activity, ArrowRight, Lock, Mail, User } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Login({ onLoginSuccess }) {
  const [isRegister, setIsRegister] = useState(false);
  const [selectedRole, setSelectedRole] = useState('entrenador');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isDemoMode, setIsDemoMode] = useState(
    typeof window !== 'undefined' && window.location.search.includes('demo=1')
  );
  const navigate = useNavigate();

  const handleSelectRole = (role) => {
    setSelectedRole(role);
    if (isDemoMode) {
      if (role === 'atleta') {
        setEmail('martin@uct.cl');
        setPassword('123456');
      } else {
        setEmail('entrenador@uct.cl');
        setPassword('123456');
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const API_BASE = window.location.hostname === 'localhost' ? 'http://localhost:3000' : '';
    const endpoint = isRegister ? '/api/auth/register' : '/api/auth/login';
    const body = isRegister 
      ? { name: name.trim(), email: email.trim(), password, role: 'entrenador' } 
      : { email: email.trim(), password };

    try {
      const response = await fetch(`${API_BASE}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Credenciales inválidas');
      }

      // El rol proviene EXCLUSIVAMENTE del backend validado
      const userRole = data.user?.role || 'entrenador';
      const finalUser = { ...data.user, role: userRole };

      localStorage.setItem('metahub_token', data.token);
      localStorage.setItem('metahub_user', JSON.stringify(finalUser));

      if (onLoginSuccess) onLoginSuccess(finalUser, data.token);
      navigate(finalUser.role === 'atleta' ? '/portal' : '/');
    } catch (err) {
      if (isDemoMode) {
        // Solo en modo demostración explícito (?demo=1)
        const isAth = selectedRole === 'atleta';
        const demoUser = {
          id: isAth ? 'atleta-demo-01' : 'coach-demo-01',
          name: isAth ? 'Martín San Martín' : 'Profesor Demostración',
          email: email || (isAth ? 'martin@uct.cl' : 'entrenador@uct.cl'),
          role: isAth ? 'atleta' : 'entrenador'
        };
        localStorage.setItem('metahub_token', 'demo_jwt_token_active');
        localStorage.setItem('metahub_user', JSON.stringify(demoUser));

        if (onLoginSuccess) onLoginSuccess(demoUser, 'demo_jwt_token_active');
        navigate(isAth ? '/portal' : '/');
        return;
      }

      setError(err.message || 'Error de conexión con el servidor MetaHub');
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
          <p>MetaHub Performance Lab · Acceso por Rol</p>
        </div>

        {/* Selector interactivo de perfil */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '18px', background: '#f1f5f9', padding: '4px', borderRadius: '12px' }}>
          <button
            type="button"
            onClick={() => handleSelectRole('entrenador')}
            style={{
              padding: '8px 12px',
              border: 'none',
              borderRadius: '9px',
              fontSize: '12px',
              fontWeight: '700',
              cursor: 'pointer',
              background: selectedRole === 'entrenador' ? '#10283f' : 'transparent',
              color: selectedRole === 'entrenador' ? 'white' : '#64748b',
              transition: 'all 0.2s ease'
            }}
          >
            👨‍🏫 Entrenador
          </button>
          <button
            type="button"
            onClick={() => handleSelectRole('atleta')}
            style={{
              padding: '8px 12px',
              border: 'none',
              borderRadius: '9px',
              fontSize: '12px',
              fontWeight: '700',
              cursor: 'pointer',
              background: selectedRole === 'atleta' ? '#2474d2' : 'transparent',
              color: selectedRole === 'atleta' ? 'white' : '#64748b',
              transition: 'all 0.2s ease'
            }}
          >
            🏃‍♂️ Atleta
          </button>
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
