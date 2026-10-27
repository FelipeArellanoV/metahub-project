import { useCallback, useEffect, useRef, useState } from 'react';
import { loadCollaboration, saveCollaboration } from '../services/collaboration.js';

// Sondeo de snapshots completos: sin cola offline ni falsa confirmación de guardado.
export default function useCollaboration(athleteId, enabled = true) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [readError, setReadError] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [stale, setStale] = useState(false);
  const generation = useRef(0);
  const requests = useRef(new Map());
  const pending = useRef(false);
  const controller = useRef(null);
  const lastRequest = useRef(0);

  const refresh = useCallback(async () => {
    if (!enabled) return;
    const current = generation.current;
    const sequence = ++lastRequest.current;
    controller.current?.abort();
    const abort = new AbortController();
    controller.current = abort;
    try {
      const result = await loadCollaboration(athleteId, abort.signal);
      if (current !== generation.current || sequence !== lastRequest.current) return;
      setData(result);
      setStale(false);
      setReadError('');
      // Los errores de una mutación se conservan hasta que el usuario reintente.
    } catch (err) {
      if (err.name === 'AbortError' || current !== generation.current) return;
      if (err.status === 403 || err.status === 404) setData(null);
      setReadError(err.message);
      setStale(true);
    } finally {
      if (current === generation.current && sequence === lastRequest.current) setLoading(false);
    }
  }, [athleteId, enabled]);

  useEffect(() => {
    generation.current += 1;
    setData(null);
    setError('');
    setReadError('');
    setLoading(enabled);
    setStale(false);
    let stopped = false;
    let timer;
    const poll = async () => {
      if (stopped) return;
      if (!document.hidden && navigator.onLine && !pending.current) await refresh();
      if (!stopped) timer = setTimeout(poll, 10000);
    };
    refresh();
    timer = setTimeout(poll, 10000);
    const resume = () => { if (!document.hidden && !pending.current) refresh(); };
    const offline = () => { setStale(true); setReadError('Sin conexión. Los cambios no se guardan offline.'); };
    window.addEventListener('online', resume);
    window.addEventListener('offline', offline);
    document.addEventListener('visibilitychange', resume);
    return () => {
      stopped = true;
      clearTimeout(timer);
      generation.current += 1;
      controller.current?.abort();
      window.removeEventListener('online', resume);
      window.removeEventListener('offline', offline);
      document.removeEventListener('visibilitychange', resume);
    };
  }, [refresh, enabled]);

  async function save(resource, id, fields) {
    if (pending.current) return false;
    const current = generation.current;
    const payload = { ...fields, ...(athleteId ? { athleteId: Number(athleteId) } : {}) };
    const signature = JSON.stringify({ resource, id, payload });
    if (!requests.current.has(signature)) requests.current.set(signature, crypto.randomUUID());
    const requestId = requests.current.get(signature);
    pending.current = true;
    controller.current?.abort();
    setBusy(true);
    setError('');
    try {
      await saveCollaboration(resource, id, { ...payload, requestId });
      requests.current.delete(signature);
      if (current === generation.current) await refresh();
      return current === generation.current;
    } catch (err) {
      if (current === generation.current) {
        setError(err.message);
        if (err.status === 409) {
          requests.current.delete(signature);
          await refresh();
        }
      }
      return false;
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  return { data, error: error || readError, busy, loading, stale, refresh, save };
}
