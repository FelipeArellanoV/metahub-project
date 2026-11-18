import { useEffect, useState } from 'react';

// El navegador dispara beforeinstallprompt una sola vez y a veces antes de que se abra Ajustes:
// se guarda aquí, a nivel de módulo, desde que carga la app.
let deferred = null;
const listeners = new Set();
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault();
    deferred = event;
    listeners.forEach(fn => fn());
  });
  window.addEventListener('appinstalled', () => {
    deferred = null;
    listeners.forEach(fn => fn());
  });
}

const isStandalone = () =>
  typeof window !== 'undefined' &&
  (window.matchMedia?.('(display-mode: standalone)').matches ||
   window.matchMedia?.('(display-mode: fullscreen)').matches ||
   window.navigator.standalone === true);

/** Estado de instalación de la PWA y acción para abrir el aviso nativo del navegador. */
export function useInstallPrompt() {
  const [, force] = useState(0);
  useEffect(() => {
    const update = () => force(n => n + 1);
    listeners.add(update);
    return () => listeners.delete(update);
  }, []);
  const ios = typeof navigator !== 'undefined' && /iphone|ipad|ipod/i.test(navigator.userAgent);
  return {
    installed: isStandalone(),
    canPrompt: Boolean(deferred),
    ios,
    async prompt() {
      if (!deferred) return;
      const event = deferred;
      deferred = null;
      event.prompt();
      await event.userChoice.catch(() => {});
      listeners.forEach(fn => fn());
    }
  };
}
