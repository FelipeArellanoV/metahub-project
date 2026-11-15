import { useEffect, useState } from 'react';
import { ShieldCheck, ShieldAlert, Phone, History } from 'lucide-react';
import api from '../services/api.js';
import '../consent-panel.css';

const ADULT_AGE = 18;
const EMPTY = { guardianName: '', guardianRelationship: '', guardianPhone: '', expiresAt: '' };

function fecha(value) {
  return value ? new Date(value).toLocaleDateString('es-CL') : '—';
}

/**
 * Consentimiento informado de un atleta (CU-07 / HU-10, Ley 19.628 / 21.719):
 * estado vigente, apoderado que lo firmó, historial y acciones para registrarlo, renovarlo o revocarlo.
 */
export default function ConsentPanel({ athlete, onChanged }) {
  const [history, setHistory] = useState(null);
  const [valid, setValid] = useState(Boolean(athlete.consent));
  const [form, setForm] = useState(EMPTY);
  const [mode, setMode] = useState(null);          // null | 'grant' | 'revoke'
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const minor = !Number.isInteger(athlete.age) || athlete.age < ADULT_AGE;

  async function load() {
    const data = await api.athletes.getConsents(athlete.id);
    setHistory(data.consents || []);
    setValid(Boolean(data.hasValidConsent));
  }

  useEffect(() => {
    let alive = true;
    setHistory(null); setMode(null); setError(''); setNotice(''); setForm(EMPTY);
    api.athletes.getConsents(athlete.id)
      .then(data => { if (alive) { setHistory(data.consents || []); setValid(Boolean(data.hasValidConsent)); } })
      .catch(err => { if (alive) { setHistory([]); setError(err.message); } });
    return () => { alive = false; };
  }, [athlete.id]);

  const latest = history && history.find(c => c.status === 'granted' || c.status === 'revoked');
  const lastGranted = history && history.find(c => c.status === 'granted');
  const expired = latest?.status === 'granted' && latest.expiresAt && new Date(latest.expiresAt) <= new Date();

  async function submit(event) {
    event.preventDefault();
    setError(''); setNotice('');
    if (mode === 'grant' && minor && form.guardianName.trim().length < 3) {
      setError('Indica el nombre del apoderado o tutor legal que firmó el consentimiento.');
      return;
    }
    setBusy(true);
    try {
      const body = mode === 'grant'
        ? Object.fromEntries(Object.entries({ status: 'granted', ...form }).filter(([, v]) => String(v).trim() !== ''))
        : { status: 'revoked', notes: form.notes || 'Revocado por solicitud del apoderado.' };
      const result = await api.athletes.createConsent(athlete.id, body);
      setNotice(result.message);
      setMode(null); setForm(EMPTY);
      await load();
      onChanged?.(mode === 'grant');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  const state = history === null ? 'loading' : valid ? 'valid' : 'pending';
  return (
    <div className="consent-panel">
      <div className={`consent-status consent-status-${state === 'valid' ? 'ok' : 'warn'}`} role="status">
        <div className="consent-status-title">
          {state === 'valid' ? <ShieldCheck size={20} /> : <ShieldAlert size={20} />}
          <strong>
            {state === 'loading' ? 'Consultando consentimiento…'
              : state === 'valid' ? 'Consentimiento vigente'
                : expired ? 'Consentimiento vencido'
                  : latest?.status === 'revoked' ? 'Consentimiento revocado' : 'Consentimiento pendiente'}
          </strong>
        </div>
        <span>
          {latest?.status === 'revoked'
            ? <>Revocado el <strong>{fecha(latest.revokedAt || latest.grantedAt)}</strong>. No se pueden subir ni analizar videos.</>
            : lastGranted
              ? <>Registrado el <strong>{fecha(lastGranted.grantedAt)}</strong>{lastGranted.expiresAt && <> · vence el <strong>{fecha(lastGranted.expiresAt)}</strong></>}</>
              : 'Sin registro formal. Debe registrarse antes de grabar o subir videos.'}
        </span>
      </div>

      <div className="consent-card">
        <span className="consent-label">Apoderado / tutor legal</span>
        <strong>
          {lastGranted?.guardianName || (history === null ? 'Cargando…' : minor ? 'No informado' : 'El propio atleta (mayor de edad)')}
          {lastGranted?.guardianRelationship ? ` (${lastGranted.guardianRelationship})` : ''}
        </strong>
        {lastGranted?.guardianPhone && (
          <a className="consent-phone" href={`tel:${lastGranted.guardianPhone.replace(/[^\d+]/g, '')}`}>
            <Phone size={13} /> {lastGranted.guardianPhone}
          </a>
        )}
      </div>

      {notice && <p className="consent-notice" role="status">{notice}</p>}
      {error && <p className="consent-error" role="alert">{error}</p>}

      {!mode && (
        <div className="consent-actions">
          <button type="button" className="primary-button" onClick={() => { setMode('grant'); setNotice(''); }}>
            <ShieldCheck size={16} />{state === 'valid' ? 'Renovar consentimiento' : 'Registrar consentimiento'}
          </button>
          {state === 'valid' && (
            <button type="button" className="secondary-button" onClick={() => { setMode('revoke'); setNotice(''); }}>
              Revocar
            </button>
          )}
        </div>
      )}

      {mode && (
        <form className="consent-form" onSubmit={submit}>
          {mode === 'grant' ? (
            <>
              <label className="form-field">
                <span>Nombre del apoderado{minor ? ' *' : ' (opcional, atleta mayor de edad)'}</span>
                <input required={minor} minLength={3} maxLength={120} value={form.guardianName}
                  onChange={e => setForm({ ...form, guardianName: e.target.value })} placeholder="Ej. Marcela Morales" />
              </label>
              <div className="consent-form-row">
                <label className="form-field">
                  <span>Relación</span>
                  <input maxLength={60} value={form.guardianRelationship}
                    onChange={e => setForm({ ...form, guardianRelationship: e.target.value })} placeholder="Madre, padre, tutor…" />
                </label>
                <label className="form-field">
                  <span>Teléfono</span>
                  <input type="tel" inputMode="tel" maxLength={30} value={form.guardianPhone}
                    onChange={e => setForm({ ...form, guardianPhone: e.target.value })} placeholder="+56 9 1234 5678" />
                </label>
              </div>
              <label className="form-field">
                <span>Vence el (opcional)</span>
                <input type="date" min={new Date(Date.now() + 86400000).toISOString().slice(0, 10)} value={form.expiresAt}
                  onChange={e => setForm({ ...form, expiresAt: e.target.value })} />
              </label>
              <p className="consent-hint">Registra solo un consentimiento firmado. Queda guardado con la fecha y con tu usuario como responsable.</p>
            </>
          ) : (
            <p className="consent-hint">
              Al revocar, no se podrán subir ni analizar nuevos videos de este atleta, incluidos los que estén en cola.
              Los videos ya guardados se conservan según la política de retención.
            </p>
          )}
          <div className="consent-actions">
            <button type="submit" className={mode === 'grant' ? 'primary-button' : 'danger-button'} disabled={busy}>
              {busy ? 'Guardando…' : mode === 'grant' ? 'Guardar consentimiento' : 'Confirmar revocación'}
            </button>
            <button type="button" className="secondary-button" disabled={busy} onClick={() => { setMode(null); setError(''); }}>Cancelar</button>
          </div>
        </form>
      )}

      {history && history.length > 0 && (
        <details className="consent-history">
          <summary><History size={14} /> Historial ({history.length})</summary>
          <ul>
            {history.map(c => (
              <li key={c.id}>
                <strong>{c.status === 'granted' ? 'Otorgado' : c.status === 'revoked' ? 'Revocado' : 'Pendiente'}</strong>
                <span>{fecha(c.status === 'revoked' ? (c.revokedAt || c.grantedAt) : c.grantedAt)}</span>
                {c.guardianName && <span>· {c.guardianName}</span>}
                {c.notes && <small>{c.notes}</small>}
              </li>
            ))}
          </ul>
        </details>
      )}

      <p className="consent-hint">
        El consentimiento informado es obligatorio según el protocolo del Comité de Ética de la Universidad Católica de Temuco
        antes de capturar video de menores.
      </p>
    </div>
  );
}
