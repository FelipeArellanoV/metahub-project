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
  Calendar,
  CalendarDays,
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

import { NavLink, useNavigate } from 'react-router-dom';

const coachMenuItems = [
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
    label: 'Planificación',
    shortLabel: 'Agenda',
    icon: Calendar,
    to: '/calendar'
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
  {
    label: 'Mi Espacio',
    shortLabel: 'Espacio',
    icon: PersonStanding,
    to: '/portal'
  },
  {
    label: 'Mis Drills Asignados',
    shortLabel: 'Drills',
    icon: Dumbbell,
    to: '/drills'
  },
  {
    label: 'Mi Calendario',
    shortLabel: 'Agenda',
    icon: Calendar,
    to: '/calendar'
  },
  {
    label: 'Mi Evolución',
    shortLabel: 'Evolución',
    icon: GitCompare,
    to: '/compare'
  },
  {
    label: 'Mi Ficha Escolar',
    shortLabel: 'Ficha',
    icon: FileText,
    to: '/reports'
  },
  {
    label: 'Mi Perfil',
    shortLabel: 'Perfil',
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

  const role = user?.role?.toLowerCase() || 'entrenador';
  const isAthlete = role === 'atleta';
  const menuItems = isAthlete ? athleteMenuItems : coachMenuItems;
  const sectionTitle = isAthlete ? 'PORTAL ATLETA' : 'PANEL ENTRENADOR';

  const userName = user?.name || (isAthlete ? 'Martín San Martín' : 'Felipe Arellano');
  const userInitials = userName
    .split(' ')
    .filter(Boolean)
    .map((n) => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase() || (isAthlete ? 'MA' : 'FA');
  const userRole = isAthlete ? 'Atleta (Sub-16)' : 'Entrenador Jefe';

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