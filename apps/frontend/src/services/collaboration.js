const BASE = import.meta.env.VITE_API_BASE ||
  (window.location.hostname === 'localhost' ? 'http://localhost:3000' : '');

async function request(path, method = 'GET', body, signal) {
  const token = localStorage.getItem('metahub_token');
  const response = await fetch(BASE + '/api/collaboration' + path, {
    method, signal, cache: 'no-store',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + (token || '') },
    ...(body ? { body: JSON.stringify(body) } : {})
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(result.error || 'No se pudo conectar con el seguimiento.');
    error.status = response.status;
    if (response.status === 401) {
      localStorage.removeItem('metahub_token');
      localStorage.removeItem('metahub_user');
      window.location.assign('/app.html#/login');
    }
    throw error;
  }
  return result;
}
export function loadCollaboration(athleteId, signal) {
  return request(athleteId ? '?athleteId=' + encodeURIComponent(athleteId) : '', 'GET', undefined, signal);
}
export function saveCollaboration(resource, id, body) {
  const path = '/' + resource + (id ? '/' + encodeURIComponent(id) : '');
  return request(path, id ? 'PUT' : 'POST', body);
}
