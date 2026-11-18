/**
 * Ajustes: solo opciones que funcionan de verdad.
 *  - Cuenta: datos que devuelve GET /api/auth/me (no hay endpoint para editarlos).
 *  - Apariencia: tema oscuro o claro, guardado en este dispositivo.
 *  - Club o establecimiento (entrenador): PUT /api/organization.
 *  - Instalar la app: aviso real del navegador (beforeinstallprompt) o instrucciones de iOS.
 *  - Cerrar sesión.
 */
import { Download, LogOut, Smartphone } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout, PageHeader } from '../components/UI.jsx';
import api from '../services/api.js';
import OrganizationProfile from '../components/OrganizationProfile.jsx';
import { ThemeSwitch } from '../components/Theme.jsx';
import { useInstallPrompt } from '../hooks/useInstallPrompt.js';
import { cardVariants, motion, staggerVariants } from '../components/Motion.jsx';

function storedUser() {
  try { return JSON.parse(localStorage.getItem('metahub_user') || 'null'); } catch { return null; }
}

export default function Settings() {
  const navigate = useNavigate();
  const [user, setUser] = useState(storedUser);
  const [profileError, setProfileError] = useState('');
  const install = useInstallPrompt();

  useEffect(() => {
    let alive = true;
    api.auth.getProfile()
      .then(data => { if (alive && data) setUser(prev => ({ ...prev, ...(data.user || data) })); })
      .catch(err => { if (alive) setProfileError(err.message || 'No se pudo actualizar la información de la cuenta.'); });
    return () => { alive = false; };
  }, []);

  const role = user?.role === 'atleta' ? 'Atleta' : 'Entrenador';

  function logout() {
    localStorage.removeItem('metahub_token');
    localStorage.removeItem('metahub_user');
    navigate('/login');
  }

  return (
    <Layout>
      <PageHeader eyebrow="CUENTA" title="Ajustes" />

      <motion.div className="mh-settings" variants={staggerVariants(0.06)} initial="initial" animate="animate">
        <motion.section variants={cardVariants} className="mh-block" aria-labelledby="mh-cuenta">
          <h2 id="mh-cuenta" className="mh-block-title">Tu cuenta</h2>
          <dl className="mh-rows">
            <div><dt>Nombre</dt><dd>{user?.name || '—'}</dd></div>
            <div><dt>Correo</dt><dd>{user?.email || '—'}</dd></div>
            <div><dt>Rol</dt><dd>{role}</dd></div>
          </dl>
          {profileError && <p className="mh-block-note" role="status">{profileError}</p>}
          <p className="mh-block-note">Para cambiar tu nombre o correo, pídelo al administrador de MetaHub.</p>
        </motion.section>

        <motion.section variants={cardVariants} className="mh-block" aria-labelledby="mh-apariencia">
          <h2 id="mh-apariencia" className="mh-block-title">Apariencia</h2>
          <div className="mh-row-card">
            <span className="mh-row-text"><strong>Tema</strong><small>Se recuerda en este dispositivo.</small></span>
            <ThemeSwitch />
          </div>
        </motion.section>

        <motion.div variants={cardVariants}><OrganizationProfile /></motion.div>

        <motion.section variants={cardVariants} className="mh-block" aria-labelledby="mh-app">
          <h2 id="mh-app" className="mh-block-title">App en tu celular</h2>
          <div className="mh-row-card">
            <span className="mh-row-icon" aria-hidden="true"><Smartphone size={20} /></span>
            <span className="mh-row-text">
              {install.installed ? <><strong>MetaHub está instalada</strong><small>La estás usando como app.</small></>
                : install.canPrompt ? <><strong>Instalar MetaHub</strong><small>Ábrela desde tu pantalla de inicio, a pantalla completa.</small></>
                : install.ios ? <><strong>Instalar en iPhone</strong><small>En Safari toca Compartir y luego "Agregar a inicio".</small></>
                : <><strong>Instalar MetaHub</strong><small>Abre el menú del navegador y elige "Instalar app" o "Agregar a la pantalla de inicio".</small></>}
            </span>
            {install.canPrompt && !install.installed && (
              <button type="button" className="primary-button mh-row-action" onClick={install.prompt}>
                <Download size={17} aria-hidden="true" />Instalar
              </button>
            )}
          </div>
        </motion.section>

        <motion.div variants={cardVariants}>
          <button type="button" className="mh-logout" onClick={logout}><LogOut size={18} aria-hidden="true" />Cerrar sesión</button>
        </motion.div>
      </motion.div>
    </Layout>
  );
}
