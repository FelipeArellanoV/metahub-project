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
  CalendarDays,
  ChevronRight,
  LayoutDashboard,
  LogOut,
  PersonStanding,
  Settings,
  Trash2,
  Users,
  Video
} from 'lucide-react';

import { NavLink, useNavigate } from 'react-router-dom';

const menuItems = [
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
    label: 'Sesiones',
    shortLabel: 'Sesiones',
    icon: Video,
    to: '/sessions'
  },
  {
    label: 'Configuración',
    shortLabel: 'Ajustes',
    icon: Settings,
    to: '/settings'
  }
];

export function Layout({ children }) {
  const navigate = useNavigate();

  let user = null;
  try {
    const raw = localStorage.getItem('metahub_user');
    if (raw) user = JSON.parse(raw);
  } catch (e) {
    // Ignore parse error
  }

  const userName = user?.name || 'Felipe Arellano';
  const userInitials = userName
    .split(' ')
    .filter(Boolean)
    .map((n) => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase() || 'FA';
  const userRole = user?.role ? (user.role.charAt(0).toUpperCase() + user.role.slice(1)) : 'Entrenador';

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
            PLATAFORMA
          </span>

          {menuItems.map((item) => {
            const Icon = item.icon;

            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
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

          <div className="profile-avatar">
            {userInitials}
          </div>

          <div className="profile-data">
            <strong>{userName}</strong>
            <span>{userRole}</span>
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

      <main className="main-content">
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