import {ThemeSwitch} from './Theme.jsx';
/**
 * =========================================================================================
 * PROYECTO METAHUB — SEGUIMIENTO LONGITUDINAL DE LA TÉCNICA DE CARRERA EN ATLETISMO ESCOLAR
 * Escuela de Ingeniería Civil en Informática — Universidad Católica de Temuco
 * 
 * Memoria / Trabajo de Título:
 * Autores: Felipe Arellano Vargas & Sofía Henríquez Soto
 * Profesor Guía: Dr. Marcos Lévano
 * 
 * Módulo: Componentes de Interfaz de Usuario y Maquetación (UI.jsx)
 * Descripción: Define el Shell de la plataforma (Layout, Sidebar, Perfil de entrenador),
 *              tarjetas de resumen de atletas (AthleteCard), indicadores estadísticos (StatCard)
 *              y cabeceras uniformes para la PWA de seguimiento biomecánico.
 * =========================================================================================
 */

import {
  Activity,
  Menu,
  X,
  AlertTriangle,
  Calendar,
  CalendarDays,
  Camera,
  ChevronRight,
  Dumbbell,
  FileText,
  GitCompare,
  LayoutDashboard,
  LogOut,
  PersonStanding,
  Settings,
  Trash2,
  Users,
  Video
} from 'lucide-react';

import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import './navigation.css';
import '../restored-theme.css';

const coachMenuItems = [
  { label: 'Revisar sesiones', shortLabel: 'Revisiones', icon: FileText, to: '/reviews' },
  { label: 'Mis clubes', shortLabel: 'Clubes', icon: Users, to: '/clubs' },
  { label: 'Seguimiento compartido', shortLabel: 'Seguimiento', icon: Users, to: '/collaboration' },
  {
    label: 'Inicio',
    shortLabel: 'Inicio',
    icon: LayoutDashboard,
    to: '/'
  },
  {
    label: 'Mis atletas',
    shortLabel: 'Atletas',
    icon: Users,
    to: '/athletes'
  },
  {
    label: 'Sesiones de pista',
    shortLabel: 'Sesiones',
    icon: Video,
    to: '/sessions'
  },
  {
    label: 'Cámara en Vivo & Calibración',
    shortLabel: 'Cámara',
    icon: Camera,
    to: '/capture'
  },
  {
    label: 'Prioridad de apoyo',
    shortLabel: 'Apoyo',
    icon: AlertTriangle,
    to: '/priority'
  },
  {
    label: 'Comparador Antes/Después',
    shortLabel: 'Comparar',
    icon: GitCompare,
    to: '/compare'
  },
  {
    label: 'Biblioteca de drills',
    shortLabel: 'Drills',
    icon: Dumbbell,
    to: '/drills'
  },
  {
    label: 'Fichas de progreso',
    shortLabel: 'Fichas',
    icon: FileText,
    to: '/reports'
  },
  {
    label: 'Configuración',
    shortLabel: 'Ajustes',
    icon: Settings,
    to: '/settings'
  }
];

const athleteMenuItems = [
  { label: 'Comparador Biomecánico', shortLabel: 'Comparar', icon: GitCompare, to: '/compare' },
  { label: 'Mis revisiones y plan', shortLabel: 'Revisiones', icon: FileText, to: '/reviews' },
  { label: 'Subir video', shortLabel: 'Video', icon: Video, to: '/upload' },
  { label: 'Mi evolución', shortLabel: 'Evolución', icon: GitCompare, to: '/evolution' },
  { label: 'Mi Espacio', shortLabel: 'Espacio', icon: PersonStanding, to: '/portal' },
  { label: 'Mi seguimiento', shortLabel: 'Seguimiento', icon: Dumbbell, to: '/collaboration' },
  { label: 'Mi perfil', shortLabel: 'Perfil', icon: Settings, to: '/settings' }
];

export function Layout({ children }) {
  const navigate = useNavigate();
  const navLocation = useLocation();
  const [moreOpen, setMoreOpen] = useState(false);
  const moreButton = useRef(null);
  const morePanel = useRef(null);
  useEffect(() => { setMoreOpen(false); }, [navLocation.pathname]);
  useEffect(() => {
    if (!moreOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const panel = morePanel.current;
    panel?.querySelector('button, a')?.focus();
    const keydown = event => {
      if (event.key === 'Escape') { setMoreOpen(false); return; }
      if (event.key !== 'Tab') return;
      const nodes = panel?.querySelectorAll('button, a[href]');
      if (!nodes?.length) return;
      const first = nodes[0], last = nodes[nodes.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    const resized = () => { if (window.innerWidth > 780) setMoreOpen(false); };
    document.addEventListener('keydown', keydown);
    window.addEventListener('resize', resized);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', keydown);
      window.removeEventListener('resize', resized);
      moreButton.current?.focus();
    };
  }, [moreOpen]);

  let user = null;
  try {
    const raw = localStorage.getItem('metahub_user');
    if (raw) user = JSON.parse(raw);
  } catch (e) {
    // Ignore parse error
  }

  const role = user?.role?.toLowerCase() || 'entrenador';
  const isAthlete = role === 'atleta';
  const order = isAthlete
    ? ['/portal','/upload','/evolution','/compare','/collaboration','/reviews','/settings']
    : ['/','/athletes','/sessions','/capture','/collaboration','/reviews','/priority','/compare','/drills','/reports','/clubs','/settings'];
  const menuItems = [...(isAthlete ? athleteMenuItems : coachMenuItems)].sort((a,b) => order.indexOf(a.to) - order.indexOf(b.to));
  const primaryPaths = isAthlete ? ['/portal','/upload','/evolution'] : ['/','/athletes','/collaboration'];
  const primaryItems = primaryPaths.map(route => menuItems.find(item => item.to === route)).filter(Boolean);
  const moreIsActive = !primaryPaths.includes(navLocation.pathname);
  const sectionTitle = isAthlete ? 'PORTAL ATLETA' : 'PANEL ENTRENADOR';

  const userName = user?.name || 'Usuario';
  const userInitials = userName
    .split(' ')
    .filter(Boolean)
    .map((n) => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase() || (isAthlete ? 'MA' : 'FA');
  const userRole = isAthlete ? 'Atleta' : 'Entrenador';

  const handleLogout = () => {
    localStorage.removeItem('metahub_token');
    localStorage.removeItem('metahub_user');
    navigate('/login');
  };

  return (
    <div className="app-shell">
      <aside className="sidebar">

        <div className="brand">
          <div className="brand-icon">
            <Activity size={23} />
          </div>

          <div>
            <strong>MetaHub</strong>
            <span>Performance Lab</span>
          </div>
        </div>

        <nav
          className="sidebar-nav"
          aria-label="Navegación principal"
        >
          <span className="sidebar-section-title">
            {sectionTitle}
          </span>

          {menuItems.map((item) => {
            const Icon = item.icon;

            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/' || item.to === '/portal'}
                className={({ isActive }) =>
                  `sidebar-link ${
                    isActive ? 'active' : ''
                  }`
                }
              >
                <Icon size={19} />

                <span className="desktop-label">
                  {item.label}
                </span>

                <span className="mobile-label">
                  {item.shortLabel}
                </span>
              </NavLink>
            );
          })}
        </nav>

        <div className="sidebar-profile">

          <div className="profile-avatar" style={{ background: isAthlete ? 'linear-gradient(135deg, #10b981, #059669)' : undefined }}>
            {userInitials}
          </div>

          <div className="profile-data">
            <strong>{userName}</strong>
            <span style={{ color: isAthlete ? '#34d399' : undefined }}>{userRole}</span>
          </div>

          <button
            type="button"
            className="logout-button"
            aria-label="Cerrar sesión"
            onClick={handleLogout}
          >
            <LogOut size={18} />
          </button>

        </div>
      </aside>


      <nav className="mobile-bottom-nav" aria-label="Navegación móvil">
        {primaryItems.map(item => {
          const Icon = item.icon;
          return (
            <NavLink key={item.to} to={item.to} end className={({isActive}) => 'mobile-nav-link' + (isActive ? ' active' : '')}>
              <Icon size={21}/><span>{item.shortLabel}</span>
            </NavLink>
          );
        })}
        <button type="button" ref={moreButton} className={'mobile-nav-link' + (moreIsActive ? ' active' : '')}
          aria-expanded={moreOpen} aria-controls="mobile-all-options" onClick={() => setMoreOpen(value => !value)}>
          <Menu size={21}/><span>Más</span>
        </button>
      </nav>
      {moreOpen && <div className="mobile-menu-backdrop" onMouseDown={event => {
        if (event.target === event.currentTarget) setMoreOpen(false);
      }}>
        <section className="mobile-menu-sheet" ref={morePanel} role="dialog" aria-modal="true" aria-labelledby="mobile-menu-title">
          <div className="mobile-menu-heading">
            <div><h2 id="mobile-menu-title">Todas las opciones</h2><p>{userName} · {userRole}</p></div>
            <button type="button" className="mobile-menu-close" aria-label="Cerrar menú" onClick={() => setMoreOpen(false)}><X size={21}/></button>
          </div>
          <nav id="mobile-all-options" className="mobile-menu-options" aria-label="Menú completo">
            {menuItems.map(item => {
              const Icon = item.icon;
              return <NavLink key={item.to} to={item.to} end onClick={() => setMoreOpen(false)}
                className={({isActive}) => isActive ? 'active' : ''}><Icon size={20}/><span>{item.label}</span></NavLink>;
            })}
          </nav>
          <button type="button" className="mobile-menu-logout" onClick={() => { setMoreOpen(false); handleLogout(); }}><LogOut size={18}/>Cerrar sesión</button>
        </section>
      </div>}

      <main className="main-content" key={navLocation.pathname}>
        <ThemeSwitch/>
        {children}
      </main>
    </div>
  );
}

export function PageHeader({
  eyebrow,
  title,
  description,
  action
}) {
  return (
    <header className="topbar">

      <div>
        <span className="eyebrow">
          {eyebrow}
        </span>

        <h1>
          {title}
        </h1>

        {description && (
          <p>
            {description}
          </p>
        )}
      </div>

      {action}

    </header>
  );
}

export function StatCard({
  icon: Icon,
  label,
  value,
  detail
}) {
  return (
    <article className="stat-card">

      <div className="stat-icon">
        <Icon size={22} />
      </div>

      <div>
        <span className="stat-label">
          {label}
        </span>

        <strong className="stat-value">
          {value}
        </strong>

        <span className="stat-detail">
          {detail}
        </span>
      </div>

    </article>
  );
}

export function AthleteCard({
  id,
  name,
  initials,
  age,
  lastSession,
  lastSessionDate,
  consent,
  sessions,
  sessionCount,
  onView,
  onDelete
}) {
  const displayInitials = initials || (name
    ? name.split(' ').filter(Boolean).map(n => n[0]).join('').substring(0, 2).toUpperCase()
    : 'AT');

  const count = sessionCount !== undefined ? sessionCount : (sessions !== undefined ? sessions : 0);
  
  let formattedLastSession = lastSession || 'Sin sesiones';
  if (lastSessionDate) {
    try {
      const d = new Date(lastSessionDate);
      formattedLastSession = d.toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch (e) {
      formattedLastSession = lastSessionDate;
    }
  }

  return (
    <article className="athlete-card">
      <div className="athlete-top">
        <div className="athlete-avatar">
          {displayInitials}
        </div>

        <div className="athlete-main-data">
          <strong>{name}</strong>
          <span>
            <PersonStanding size={14} />
            {age} años
          </span>
        </div>

        <button
          className="icon-button"
          type="button"
          aria-label={`Ver atleta ${name}`}
          onClick={onView}
        >
          <ChevronRight size={20} />
        </button>
      </div>

      <div className="athlete-divider" />

      <div className="athlete-info-row">
        <div>
          <span className="mini-label">ÚLTIMA SESIÓN</span>
          <strong>
            <CalendarDays size={15} />
            {formattedLastSession}
          </strong>
        </div>

        <div>
          <span className="mini-label">SESIONES</span>
          <strong>{count}</strong>
        </div>
      </div>

      <div className="athlete-footer">
        <span className={consent ? 'status success' : 'status warning'}>
          <span className="status-dot" />
          {consent ? 'Consentimiento vigente' : 'Consentimiento pendiente'}
        </span>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {onDelete && (
            <button
              className="text-button"
              type="button"
              style={{ color: '#ef4444', padding: '4px 6px', display: 'flex', alignItems: 'center', gap: '4px' }}
              onClick={(e) => {
                e.stopPropagation();
                onDelete(id, name);
              }}
              title="Eliminar atleta"
            >
              <Trash2 size={15} />
            </button>
          )}

          <button
            className="text-button"
            type="button"
            onClick={onView}
          >
            Ver detalle
          </button>
        </div>
      </div>
    </article>
  );
}