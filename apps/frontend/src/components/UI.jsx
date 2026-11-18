import {motion, pageVariants} from './Motion.jsx';
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
  AlertTriangle,
  Building2,
  ChevronRight,
  CircleDot,
  ClipboardList,
  Dumbbell,
  FileText,
  GitCompare,
  Handshake,
  Home,
  LogOut,
  MoreHorizontal,
  Settings,
  Trash2,
  TrendingUp,
  Upload,
  Users,
  Video,
  X
} from 'lucide-react';

import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import './navigation.css';
import '../restored-theme.css';

/**
 * Menú agrupado por tarea. `tabs` son las 4 pestañas de la barra inferior del celular
 * (la quinta es "Más"); la marcada con `accent` es la acción principal (grabar o subir).
 */
const coachNav = {
  groups: [
    { title: 'Equipo', items: [
      { label: 'Inicio', icon: Home, to: '/' },
      { label: 'Atletas', icon: Users, to: '/athletes' },
      { label: 'Prioridad de apoyo', icon: AlertTriangle, to: '/priority' }
    ] },
    { title: 'Análisis', items: [
      { label: 'Grabar o subir', shortLabel: 'Grabar', icon: CircleDot, to: '/capture', accent: true },
      { label: 'Sesiones', icon: Video, to: '/sessions' },
      { label: 'Revisiones', icon: FileText, to: '/reviews' },
      { label: 'Comparar', icon: GitCompare, to: '/compare' }
    ] },
    { title: 'Entrenamiento', items: [
      { label: 'Ejercicios', icon: Dumbbell, to: '/drills' },
      { label: 'Seguimiento compartido', shortLabel: 'Seguimiento', icon: Handshake, to: '/collaboration' },
      { label: 'Fichas de progreso', shortLabel: 'Fichas', icon: ClipboardList, to: '/reports' }
    ] },
    { title: 'Organización', items: [
      { label: 'Clubes', icon: Building2, to: '/clubs' },
      { label: 'Ajustes', icon: Settings, to: '/settings' }
    ] }
  ],
  tabs: ['/', '/athletes', '/capture', '/sessions']
};

const athleteNav = {
  groups: [
    { title: 'Mi espacio', items: [
      { label: 'Inicio', icon: Home, to: '/portal' },
      { label: 'Subir video', shortLabel: 'Subir', icon: Upload, to: '/upload', accent: true },
      { label: 'Evolución', icon: TrendingUp, to: '/evolution' },
      { label: 'Comparar sesiones', shortLabel: 'Comparar', icon: GitCompare, to: '/compare' }
    ] },
    { title: 'Entrenamiento', items: [
      { label: 'Revisiones y plan', shortLabel: 'Revisiones', icon: FileText, to: '/reviews' },
      { label: 'Seguimiento', icon: Handshake, to: '/collaboration' }
    ] },
    { title: 'Cuenta', items: [
      { label: 'Ajustes', icon: Settings, to: '/settings' }
    ] }
  ],
  tabs: ['/portal', '/reviews', '/upload', '/evolution']
};

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
  const nav = isAthlete ? athleteNav : coachNav;
  const allItems = nav.groups.flatMap(group => group.items);
  const tabItems = nav.tabs.map(route => allItems.find(item => item.to === route)).filter(Boolean);
  const moreIsActive = !nav.tabs.includes(navLocation.pathname);
  const isHome = to => to === '/' || to === '/portal';

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

  const linkClass = item => ({ isActive }) =>
    'sidebar-link' + (isActive ? ' active' : '') + (item.accent ? ' is-accent' : '');

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-icon"><Activity size={20} /></div>
          <strong>MetaHub</strong>
        </div>

        <nav className="sidebar-nav" aria-label="Navegación principal">
          {nav.groups.map(group => (
            <div className="sidebar-group" key={group.title}>
              <span className="sidebar-section-title">{group.title}</span>
              {group.items.map(item => {
                const Icon = item.icon;
                return (
                  <NavLink key={item.to} to={item.to} end={isHome(item.to)} className={linkClass(item)}>
                    <Icon size={18} aria-hidden="true" />
                    <span>{item.label}</span>
                  </NavLink>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="sidebar-profile">
          <div className="profile-avatar">{userInitials}</div>
          <div className="profile-data">
            <strong>{userName}</strong>
            <span>{userRole}</span>
          </div>
          <button type="button" className="logout-button" aria-label="Cerrar sesión" onClick={handleLogout}>
            <LogOut size={18} />
          </button>
        </div>
      </aside>

      <nav className="mobile-bottom-nav" aria-label="Navegación móvil">
        {tabItems.map(item => {
          const Icon = item.icon;
          return (
            <NavLink key={item.to} to={item.to} end
              className={({ isActive }) => 'mobile-nav-link' + (isActive ? ' active' : '') + (item.accent ? ' is-accent' : '')}>
              <Icon size={23} aria-hidden="true" /><span>{item.shortLabel || item.label}</span>
            </NavLink>
          );
        })}
        <button type="button" ref={moreButton} className={'mobile-nav-link' + (moreIsActive ? ' active' : '')}
          aria-expanded={moreOpen} aria-controls="mobile-all-options" onClick={() => setMoreOpen(value => !value)}>
          <MoreHorizontal size={23} aria-hidden="true" /><span>Más</span>
        </button>
      </nav>
      {moreOpen && <div className="mobile-menu-backdrop" onMouseDown={event => {
        if (event.target === event.currentTarget) setMoreOpen(false);
      }}>
        <section className="mobile-menu-sheet" ref={morePanel} role="dialog" aria-modal="true" aria-labelledby="mobile-menu-title">
          <div className="mobile-menu-heading">
            <div className="mobile-menu-user">
              <span className="profile-avatar" aria-hidden="true">{userInitials}</span>
              <div><h2 id="mobile-menu-title">{userName}</h2><p>{userRole}</p></div>
            </div>
            <button type="button" className="mobile-menu-close" aria-label="Cerrar menú" onClick={() => setMoreOpen(false)}><X size={20}/></button>
          </div>
          <nav id="mobile-all-options" className="mobile-menu-options" aria-label="Menú completo">
            {nav.groups.map(group => (
              <div className="mobile-menu-group" key={group.title}>
                <span className="sidebar-section-title">{group.title}</span>
                <div className="mobile-menu-list">
                  {group.items.map(item => {
                    const Icon = item.icon;
                    return <NavLink key={item.to} to={item.to} end onClick={() => setMoreOpen(false)}
                      className={({ isActive }) => (isActive ? 'active' : '') + (item.accent ? ' is-accent' : '')}>
                      <Icon size={20} aria-hidden="true"/><span>{item.label}</span><ChevronRight size={18} aria-hidden="true" className="mobile-menu-chevron"/>
                    </NavLink>;
                  })}
                </div>
              </div>
            ))}
          </nav>
          <button type="button" className="mobile-menu-logout" onClick={() => { setMoreOpen(false); handleLogout(); }}><LogOut size={18}/>Cerrar sesión</button>
        </section>
      </div>}

      <motion.main className="main-content" key={navLocation.pathname}
        variants={pageVariants} initial="initial" animate="animate">
        {children}
      </motion.main>
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
  category,
  lastIptScore,
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
  const meta = [
    age != null ? age + ' años' : 'Edad sin registrar',
    category,
    count === 0 ? 'Sin sesiones' : count === 1 ? '1 sesión' : count + ' sesiones'
  ].filter(Boolean).join(' · ');

  return (
    <article className="athlete-row">
      <button type="button" className="athlete-row-main" onClick={onView} aria-label={`Ver ficha de ${name}`}>
        <span className="athlete-avatar" aria-hidden="true">{displayInitials}</span>
        <span className="athlete-row-text">
          <strong>{name}</strong>
          <small>{meta}</small>
        </span>
        <span className="athlete-row-score">
          <b className={lastIptScore != null ? '' : 'is-empty'}>{lastIptScore != null ? lastIptScore : '—'}</b>
          <small>IPT</small>
        </span>
      </button>
      <div className="athlete-row-foot">
        <span className={consent ? 'status success' : 'status warning'}>
          <span className="status-dot" />
          {consent ? 'Consentimiento vigente' : 'Consentimiento pendiente'}
        </span>
        {onDelete && (
          <button type="button" className="athlete-row-delete" aria-label={`Eliminar a ${name}`}
            onClick={(e) => { e.stopPropagation(); onDelete(id, name); }}>
            <Trash2 size={16} aria-hidden="true" />
          </button>
        )}
      </div>
    </article>
  );
}
