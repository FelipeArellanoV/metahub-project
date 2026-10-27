/**
 * =========================================================================================
 * PROYECTO METAHUB — SEGUIMIENTO LONGITUDINAL DE LA TÉCNICA DE CARRERA EN ATLETISMO ESCOLAR
 * Escuela de Ingeniería Civil en Informática — Universidad Católica de Temuco
 * 
 * Memoria / Trabajo de Título:
 * Autores: Felipe Arellano Vargas & Sofía Henríquez Soto
 * Profesor Guía: Dr. Marcos Lévano
 * 
 * Módulo: Cliente de Servicio API Frontend (api.js)
 * Descripción: Encapsula la comunicación HTTP asíncrona hacia el Backend REST (Node.js)
 *              y el microservicio de Visión por Computador (FastAPI / MediaPipe), gestionando
 *              tokens JWT, persistencia local y manejo de respuestas con expiración.
 * =========================================================================================
 */

const API_BASE = import.meta.env?.VITE_API_BASE || 
  (typeof window !== 'undefined' && window.location.hostname === 'localhost' ? 'http://localhost:3000' : '');

const CV_BASE = import.meta.env?.VITE_CV_BASE || 
  (typeof window !== 'undefined' && window.location.hostname === 'localhost' ? 'http://localhost:8000' : '');

function getHeaders() {
  const headers = {
    'Content-Type': 'application/json'
  };
  const token = localStorage.getItem('metahub_token');
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

async function request(url, options = {}) {
  const config = {
    ...options,
    headers: {
      ...getHeaders(),
      ...(options.headers || {})
    }
  };

  try {
    const response = await fetch(url, config);
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      if (response.status === 401) {
        // Token inválido o expirado
        localStorage.removeItem('metahub_token');
        localStorage.removeItem('metahub_user');
        if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
          window.location.href = '/app.html#/login';
        }
      }
      const errorMsg = data.error || data.detail || `Error del servidor (${response.status})`;
      throw new Error(errorMsg);
    }

    return data;
  } catch (err) {
    throw err;
  }
}

export const api = {
  // Autenticación
  auth: {
    async login(email, password) {
      const data = await request(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        body: JSON.stringify({ email, password })
      });
      if (data.token) {
        localStorage.setItem('metahub_token', data.token);
        localStorage.setItem('metahub_user', JSON.stringify(data.user));
      }
      return data;
    },

    async register(name, email, password) {
      const data = await request(`${API_BASE}/api/auth/register`, {
        method: 'POST',
        body: JSON.stringify({ name, email, password, role: 'entrenador' })
      });
      if (data.token) {
        localStorage.setItem('metahub_token', data.token);
        localStorage.setItem('metahub_user', JSON.stringify(data.user));
      }
      return data;
    },

    async getProfile() {
      return request(`${API_BASE}/api/auth/me`);
    },

    logout() {
      localStorage.removeItem('metahub_token');
      localStorage.removeItem('metahub_user');
      if (typeof window !== 'undefined') {
        window.location.href = '/app.html#/login';
      }
    }
  },

  // Atletas (CRUD con aislamiento estricto por entrenador)
  athletes: {
    async getAll() {
      const res = await request(`${API_BASE}/api/athletes`);
      return res.athletes || [];
    },

    async getById(id) {
      const res = await request(`${API_BASE}/api/athletes/${id}`);
      return res.athlete;
    },

    async create(athleteData) {
      const res = await request(`${API_BASE}/api/athletes`, {
        method: 'POST',
        body: JSON.stringify(athleteData)
      });
      return res.athlete;
    },

    async update(id, athleteData) {
      const res = await request(`${API_BASE}/api/athletes/${id}`, {
        method: 'PUT',
        body: JSON.stringify(athleteData)
      });
      return res.athlete;
    },

    async delete(id) {
      return request(`${API_BASE}/api/athletes/${id}`, {
        method: 'DELETE'
      });
    }
  },

  // Sesiones de Carrera
  sessions: {
    async getAll() {
      const res = await request(`${API_BASE}/api/sessions`);
      return res.sessions || [];
    },

    async getByAthlete(athleteId) {
      const res = await request(`${API_BASE}/api/athletes/${athleteId}/sessions`);
      return res.sessions || [];
    },

    async create(sessionData) {
      const res = await request(`${API_BASE}/api/sessions`, {
        method: 'POST',
        body: JSON.stringify(sessionData)
      });
      return res.session;
    }
  },

  // Portal del Atleta
  portal: {
    async getMe() {
      return request(`${API_BASE}/api/portal/me`);
    }
  },

  // Visión por Computador (CV Service)
  cv: {
    async checkHealth() {
      const res = await fetch(`${CV_BASE}/health`);
      return res.json();
    },

    async processVideo(formData) {
      const res = await fetch(`${CV_BASE}/api/cv/process-video`, {
        method: 'POST',
        body: formData
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || err.error || `Error CV (${res.status})`);
      }
      return res.json();
    },

    async calculateMetrics(keypointsPayload) {
      return request(`${CV_BASE}/api/cv/metrics`, {
        method: 'POST',
        body: JSON.stringify(keypointsPayload)
      });
    }
  }
};

export default api;
