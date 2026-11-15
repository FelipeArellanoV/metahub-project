import {ThemeSwitch} from '../components/Theme.jsx';
import { Activity, ArrowRight, Lock, Mail, User } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { EASE_OUT, cardVariants, motion, staggerVariants } from '../components/Motion.jsx';

export default function Login({ onLoginSuccess }) {
  const [isRegister, setIsRegister] = useState(false);
  const [selectedRole, setSelectedRole] = useState('entrenador');
  const [name, setName] = useState('');
  const [organizationName, setOrganizationName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [isDemoMode, setIsDemoMode] = useState(
    // Solo en desarrollo: requiere VITE_ENABLE_DEMO=true al compilar (ADR-018). En producción no existe.
    import.meta.env.VITE_ENABLE_DEMO === 'true' &&
    typeof window !== 'undefined' && window.location.search.includes('demo=1')
  );
  const navigate = useNavigate();

  const handleSelectRole = (role) => {
    setSelectedRole(role);
    if (isDemoMode) {
      if (role === 'atleta') {
        setEmail('martin@uct.cl');
        setPassword('password123');
      } else {
        setEmail('entrenador@uct.cl');
        setPassword('password123');
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    setError('');
    setSubmitting(true);
    try {
      await submitCredentials();
    } finally {
      setSubmitting(false);
    }
  };

  const submitCredentials = async () => {

    const API_BASE = import.meta.env.VITE_API_BASE || '';
    const endpoint = isRegister ? '/api/auth/register' : '/api/auth/login';
    const body = isRegister 
      ? { name: name.trim(), email: email.trim(), password, role: 'entrenador', organizationName: organizationName.trim() } 
      : { email: email.trim(), password };

    try {
      const response = await fetch(`${API_BASE}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      let data;
      try {
        data = await response.json();
      } catch {
        throw new Error('La API no devolvió JSON. Revisa VITE_API_BASE en apps/frontend/.env.local y reinicia Vite.');
      }

      if (!response.ok) {
        throw new Error(data.error || 'Credenciales inválidas');
      }

      if (!data || typeof data.token !== 'string' || !data.token || !data.user) {
        throw new Error('La API no devolvió una sesión válida. Comprueba la dirección del backend.');
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

  const roles = [
    { value: 'entrenador', label: '👨‍🏫 Entrenador' },
    { value: 'atleta', label: '🏃‍♂️ Atleta' }
  ];

  return (
    <div className="login-container">
      <ThemeSwitch/>
      <motion.div className="login-card" variants={staggerVariants(0.05, 0.08)} initial="initial" animate="animate">
        <motion.div className="login-header" variants={cardVariants}>
          <motion.div className="login-brand-icon"
            initial={{ opacity: 0, scale: 0.6, rotate: -12 }} animate={{ opacity: 1, scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 320, damping: 18, delay: 0.1 }}>
            <Activity size={28} />
          </motion.div>
          <AnimatePresence mode="wait" initial={false}>
            <motion.h2 key={isRegister ? 'registro' : 'login'} className="mh-auth-title"
              initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.18 }}>
              {isRegister ? 'Crear Cuenta' : 'Iniciar Sesión'}
            </motion.h2>
          </AnimatePresence>
          <p>MetaHub Performance Lab · Acceso por Rol</p>
        </motion.div>

        {/* Selector interactivo de perfil: el fondo se desliza (transform) y cambia de color por fundido (opacity) */}
        <motion.div className="mh-role-switch" variants={cardVariants}>
          <motion.span className="mh-role-indicator" aria-hidden="true" initial={false}
            animate={{ x: selectedRole === 'atleta' ? '100%' : '0%' }}
            transition={{ type: 'spring', stiffness: 420, damping: 34 }}>
            <motion.span className="mh-role-coach" initial={false} animate={{ opacity: selectedRole === 'entrenador' ? 1 : 0 }} />
            <motion.span className="mh-role-athlete" initial={false} animate={{ opacity: selectedRole === 'atleta' ? 1 : 0 }} />
          </motion.span>
          {roles.map(role => (
            <button key={role.value} type="button" aria-pressed={selectedRole === role.value}
              onClick={() => handleSelectRole(role.value)}>
              {role.label}
            </button>
          ))}
        </motion.div>

        <AnimatePresence initial={false}>
          {error && (
            <motion.div key={error} className="error-box" role="alert"
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0, x: [0, -6, 5, -3, 0] }}
              exit={{ opacity: 0, transition: { duration: 0.15 } }}
              transition={{ duration: 0.4, x: { duration: 0.36, delay: 0.05 } }}>
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        <motion.form onSubmit={handleSubmit} variants={cardVariants} aria-busy={submitting}>
          <AnimatePresence initial={false}>
            {isRegister && (
              <motion.div key="campos-registro" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, transition: { duration: 0.12 } }} transition={{ duration: 0.26, ease: EASE_OUT }}>
                <label className="form-field">
                  <span>Club o establecimiento *</span>
                  <input required maxLength={160} value={organizationName} onChange={e=>setOrganizationName(e.target.value)}
                    placeholder="Nombre de tu club, colegio o establecimiento" />
                </label>
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
              </motion.div>
            )}
          </AnimatePresence>

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

          <button type="submit" className="submit-btn" disabled={submitting} aria-busy={submitting}>
            <span>{submitting ? (isRegister ? 'Creando cuenta…' : 'Ingresando…') : (isRegister ? 'Registrarse' : 'Ingresar a MetaHub')}</span>
            {submitting ? <span className="mh-spinner" aria-hidden="true" /> : <ArrowRight size={18} />}
          </button>
        </motion.form>

        <motion.div className="toggle-auth" variants={cardVariants}>
          <span>{isRegister ? '¿Ya tienes cuenta?' : '¿No tienes cuenta de entrenador?'}</span>
          <button
            type="button"
            className="text-link-button"
            onClick={() => { setIsRegister(!isRegister); setError(''); }}
          >
            {isRegister ? ' Iniciar Sesión' : ' Registrarse'}
          </button>
        </motion.div>
      </motion.div>
    </div>
  );
}
