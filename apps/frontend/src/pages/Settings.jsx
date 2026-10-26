/**
 * =========================================================================================
 * PROYECTO METAHUB — SEGUIMIENTO LONGITUDINAL DE LA TÉCNICA DE CARRERA EN ATLETISMO ESCOLAR
 * Escuela de Ingeniería Civil en Informática — Universidad Católica de Temuco
 * 
 * Memoria / Trabajo de Título:
 * Autores: Felipe Arellano Vargas & Sofía Henríquez Soto
 * Profesor Guía: Dr. Marcos Lévano
 * 
 * Módulo: Vista de Configuración y Preferencias del Entrenador (Settings.jsx)
 * Descripción: Permite gestionar la información de la cuenta, preferencias de alertas
 *              de calidad biomecánica y parámetros de sincronización en terreno.
 * =========================================================================================
 */

import { Bell, CheckCircle2, Save, ShieldCheck, Smartphone } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Layout, PageHeader } from '../components/UI.jsx';
import api from '../services/api.js';

export default function Settings() {
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState({
    name: 'Felipe Arellano',
    email: 'felipe@metahub.cl',
    notifications: true,
    qualityAlerts: true
  });

  useEffect(() => {
    try {
      const rawUser = localStorage.getItem('metahub_user');
      if (rawUser) {
        const user = JSON.parse(rawUser);
        setForm(prev => ({
          ...prev,
          name: user.name || prev.name,
          email: user.email || prev.email
        }));
      }
    } catch (e) {
      // ignore
    }
  }, []);

  function updateField(key, value) {
    setSaved(false);
    setForm((current) => ({ ...current, [key]: value }));
  }

  function handleSubmit(event) {
    event.preventDefault();
    setSaved(true);
  }

  return (
    <Layout>
      <PageHeader
        eyebrow="PREFERENCIAS"
        title="Configuración"
        description="Personaliza la experiencia del panel de entrenador."
      />

      <form className="settings-grid" onSubmit={handleSubmit}>
        <section className="panel-card">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">PERFIL</span>
              <h2>Datos de la cuenta</h2>
            </div>
            <ShieldCheck size={24} className="panel-icon" />
          </div>

          <label className="form-field">
            <span>Nombre</span>
            <input
              value={form.name}
              onChange={(event) => updateField('name', event.target.value)}
            />
          </label>

          <label className="form-field">
            <span>Correo electrónico</span>
            <input
              type="email"
              value={form.email}
              onChange={(event) => updateField('email', event.target.value)}
            />
          </label>
        </section>

        <section className="panel-card">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">AVISOS</span>
              <h2>Notificaciones</h2>
            </div>
            <Bell size={24} className="panel-icon" />
          </div>

          <label className="toggle-row">
            <div>
              <strong>Actividad del sistema</strong>
              <span>Recibir avisos de nuevas sesiones y análisis.</span>
            </div>
            <input
              type="checkbox"
              checked={form.notifications}
              onChange={(event) => updateField('notifications', event.target.checked)}
            />
          </label>

          <label className="toggle-row">
            <div>
              <strong>Alertas de calidad</strong>
              <span>Avisar cuando una captura no cumple el protocolo.</span>
            </div>
            <input
              type="checkbox"
              checked={form.qualityAlerts}
              onChange={(event) => updateField('qualityAlerts', event.target.checked)}
            />
          </label>
        </section>

        <section className="panel-card device-card">
          <div className="device-icon">
            <Smartphone size={24} />
          </div>
          <div>
            <span className="eyebrow">DISPOSITIVO</span>
            <h2>Captura móvil</h2>
            <p>
              El frontend está preparado para adaptarse a escritorio y móvil.
              La captura de video se conectará en el siguiente avance.
            </p>
          </div>
        </section>

        <div className="settings-actions">
          {saved && (
            <span className="saved-message">
              <CheckCircle2 size={18} />
              Configuración guardada localmente.
            </span>
          )}

          <button className="primary-button" type="submit">
            <Save size={18} />
            Guardar cambios
          </button>
        </div>
      </form>
    </Layout>
  );
}
