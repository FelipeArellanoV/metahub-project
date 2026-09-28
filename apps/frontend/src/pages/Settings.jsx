import { Bell, CheckCircle2, Save, ShieldCheck, Smartphone } from 'lucide-react';
import { useState } from 'react';
import { Layout, PageHeader } from '../components/UI.jsx';

export default function Settings() {
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState({
    name: 'Felipe Arellano',
    email: 'felipe@metahub.cl',
    notifications: true,
    qualityAlerts: true
  });

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
