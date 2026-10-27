import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Layout, PageHeader } from '../components/UI.jsx';
import { clubRequest } from '../services/roster.js';
import useCollaboration from '../hooks/useCollaboration.js';
import '../collaboration.css';

function currentUser() {
  try { return JSON.parse(localStorage.getItem('metahub_user') || '{}'); }
  catch { return {}; }
}
const time = value => new Date(value).toLocaleString('es-CL', { dateStyle: 'medium', timeStyle: 'short' });
const attendance = { pending: 'Sin responder', confirmed: 'Confirmada', declined: 'No asistirá' };
const eventLabels = {
  'task.create': 'Ejercicio asignado', 'task.update': 'Cumplimiento actualizado',
  'appointment.create': 'Cita planificada', 'appointment.update': 'Asistencia o cita actualizada',
  'message.create': 'Mensaje enviado', 'session.review': 'Revisión de sesión actualizada'
};

export default function Collaboration() {
  const coach = currentUser().role === 'entrenador';
  const [athletes, setAthletes] = useState([]);
  const [athleteId, setAthleteId] = useState('');
  const [listError, setListError] = useState('');
  const [listLoading, setListLoading] = useState(coach);
  const [task, setTask] = useState({ title: '', details: '' });
  const [appointment, setAppointment] = useState({ title: '', location: '', startsAt: '', endsAt: '' });
  const [message, setMessage] = useState('');
  const [notice, setNotice] = useState('');
  const [dateError, setDateError] = useState('');
  const state = useCollaboration(athleteId, !coach || Boolean(athleteId));
  const { data, error, busy, loading, stale, refresh, save } = state;

  useEffect(() => {
    if (!coach) return;
    let alive = true;
    clubRequest('/roster').then(result => {
      const rows = result.athletes;
      if (!alive) return;
      setAthletes(rows);
      setAthleteId(rows[0] ? String(rows[0].id) : '');
    }).catch(err => { if (alive) setListError(err.message); })
      .finally(() => { if (alive) setListLoading(false); });
    return () => { alive = false; };
  }, [coach]);

  const readOnly = coach && data && !data.permissions?.canEdit;
  const disabled = busy || stale || !data || readOnly;
  async function createTask(event) {
    event.preventDefault();
    setNotice('');
    if (await save('tasks', null, task)) {
      setTask({ title: '', details: '' });
      setNotice('Ejercicio guardado en el servidor.');
    }
  }
  async function createAppointment(event) {
    event.preventDefault();
    setNotice('');
    setDateError('');
    const start = new Date(appointment.startsAt);
    const end = new Date(appointment.endsAt);
    if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || end <= start) {
      setDateError('Revisa las fechas: el término debe ser posterior al inicio.');
      return;
    }
    if (await save('appointments', null, { ...appointment, startsAt: start.toISOString(), endsAt: end.toISOString() })) {
      setAppointment({ title: '', location: '', startsAt: '', endsAt: '' });
      setNotice('Cita guardada en el servidor.');
    }
  }
  async function sendMessage(event) {
    event.preventDefault();
    setNotice('');
    if (await save('messages', null, { body: message })) {
      setMessage('');
      setNotice('Mensaje guardado en el servidor.');
    }
  }
  async function update(resource, item, fields) {
    setNotice('');
    if (await save(resource, item.id, { ...fields, version: item.version })) {
      setNotice('Cambio guardado en el servidor.');
    }
  }

  return <Layout>
    <PageHeader eyebrow="ALUMNO Y ENTRENADOR" title="Seguimiento compartido"
      description="Ejercicios, citas y mensajes vinculados a la misma ficha. Actualización automática cada 10 segundos."
      action={<button className="secondary-button" onClick={refresh} disabled={busy || (coach && !athleteId)}>Actualizar</button>} />
    <section className="collaboration" aria-busy={busy || loading}>
      {coach && <label className="form-field">
        <span>Alumno bajo seguimiento</span>
        <select value={athleteId} disabled={busy || listLoading} onChange={e => {
          setAthleteId(e.target.value);
          setTask({ title: '', details: '' });
          setAppointment({ title: '', location: '', startsAt: '', endsAt: '' });
          setMessage(''); setNotice(''); setDateError('');
        }}>
          <option value="">Seleccionar alumno</option>
          {athletes.map(a => <option key={a.id} value={a.id}>{a.name}{a.canEdit ? ' · A mi cargo' : ' · Club, solo lectura'}</option>)}
        </select>
      </label>}
      {listLoading && <p role="status">Cargando alumnos…</p>}
      {listError && <p role="alert" className="collab-error">{listError} Recarga la página para reintentar.</p>}
      {coach && !listLoading && !listError && !athletes.length &&
        <p>No hay alumnos registrados. Crea una ficha y su cuenta desde Mis atletas.</p>}
      {loading && (!coach || athleteId) && <p role="status">Consultando datos compartidos…</p>}
      {(error || dateError) && <p role="alert" className="collab-error">{dateError || error}</p>}
      {notice && <p role="status" className="collab-success">{notice}</p>}
      {data && <>
        {readOnly && <p role="status" className="collab-warning">Atleta de otro entrenador de tu club. Solo puedes consultar; las modificaciones corresponden a su entrenador responsable.</p>}
        <div className="collab-status">
          <strong>{data.athlete.name}</strong>
          <span>{stale ? 'Datos sin actualizar. Reintenta antes de guardar.' : 'Última lectura: ' + time(data.fetchedAt)}</span>
          <span>Consentimiento en ficha: {data.athlete.consent ? 'registrado' : 'pendiente'}</span>
        </div>
        {data.storage === 'memory' && <p role="status" className="collab-warning">
          Modo de demostración en memoria: los registros se pierden al reiniciar la API.
          Configura PostgreSQL y aplica la migración para conservarlos.
        </p>}

        <div className="collab-grid">
          <section className="panel-card">
            <h2>Ejercicios asignados</h2>
            <p>{data.tasks.filter(t => t.done).length} completados de {data.tasks.length} registros mostrados.</p>
            {coach && !readOnly && <form onSubmit={createTask} className="collab-form">
              <label>Título<input required maxLength={160} value={task.title} disabled={busy}
                onChange={e => setTask({ ...task, title: e.target.value })} /></label>
              <label>Indicaciones y dosificación<textarea maxLength={2000} value={task.details} disabled={busy}
                onChange={e => setTask({ ...task, details: e.target.value })} /></label>
              <button className="primary-button" disabled={disabled}>Asignar ejercicio</button>
            </form>}
            {!data.tasks.length && <p>El entrenador aún no ha asignado ejercicios.</p>}
            <ul className="collab-list">{data.tasks.map(item => <li key={item.id}>
              <strong>{item.title}</strong>
              {item.source_session_id && <Link to={'/reviews?athleteId='+data.athlete.id+'&sessionId='+item.source_session_id}>Sesión de origen #{item.source_session_id}</Link>}
              {item.due_at && <small>Fecha objetivo: {time(item.due_at)}{!item.done && new Date(item.due_at).getTime() < Date.now() ? ' · Pendiente fuera de plazo' : ''}</small>}
              <p className="collab-pre">{item.details}</p>
              {coach ? <span>{item.done ? 'Completado por el alumno' : 'Pendiente'}</span> :
                <label className="collab-check"><input type="checkbox" checked={item.done} disabled={disabled}
                  onChange={e => update('tasks', item, { done: e.target.checked })} /> Completado</label>}
              <small>Actualizado {time(item.updated_at)} · versión {item.version}</small>
            </li>)}</ul>
          </section>

          <section className="panel-card">
            <h2>Citas en pista</h2>
            <p>Las fechas se muestran en la zona horaria de este dispositivo.</p>
            {coach && !readOnly && <form onSubmit={createAppointment} className="collab-form">
              <label>Título<input required maxLength={160} value={appointment.title} disabled={busy}
                onChange={e => setAppointment({ ...appointment, title: e.target.value })} /></label>
              <label>Lugar<input required maxLength={200} value={appointment.location} disabled={busy}
                onChange={e => setAppointment({ ...appointment, location: e.target.value })} /></label>
              <label>Inicio (hora local)<input required type="datetime-local" value={appointment.startsAt} disabled={busy}
                onChange={e => setAppointment({ ...appointment, startsAt: e.target.value })} /></label>
              <label>Término (hora local)<input required type="datetime-local" value={appointment.endsAt} disabled={busy}
                onChange={e => setAppointment({ ...appointment, endsAt: e.target.value })} /></label>
              <button className="primary-button" disabled={disabled}>Planificar cita</button>
            </form>}
            {!data.appointments.length && <p>No hay citas planificadas.</p>}
            <ul className="collab-list">{data.appointments.map(item => <li key={item.id}>
              <strong>{item.title}</strong><span>{item.location}</span>
              <span>{time(item.starts_at)} — {time(item.ends_at)}</span>
              <span>{item.cancelled ? 'Cancelada' : 'Asistencia: ' + attendance[item.attendance]}</span>
              {!item.cancelled && <div className="collab-actions">
                {coach ? <button type="button" className="secondary-button" disabled={disabled}
                  onClick={() => update('appointments', item, { cancelled: true })}>Cancelar cita</button> :
                  <><button type="button" className="primary-button" disabled={disabled || item.attendance === 'confirmed'}
                    onClick={() => update('appointments', item, { attendance: 'confirmed' })}>Confirmar</button>
                  <button type="button" className="secondary-button" disabled={disabled || item.attendance === 'declined'}
                    onClick={() => update('appointments', item, { attendance: 'declined' })}>No asistiré</button></>}
              </div>}
            </li>)}</ul>
          </section>
        </div>

        <section className="panel-card">
          <h2>Mensajes de seguimiento</h2>
          {!readOnly && <form className="collab-form" onSubmit={sendMessage}>
            <label>Mensaje para {coach ? 'el alumno' : 'tu entrenador'}
              <textarea required maxLength={2000} value={message} disabled={busy} onChange={e => setMessage(e.target.value)} /></label>
            <button className="primary-button" disabled={disabled}>Enviar mensaje</button>
          </form>}
          {!data.messages.length && <p>Aún no hay mensajes.</p>}
          <ul className="collab-list">{data.messages.map(item => <li key={item.id}>
            <strong>{item.author_role === 'entrenador' ? 'Entrenador' : 'Alumno'}</strong>
            <p className="collab-pre">{item.body}</p><small>{time(item.created_at)}</small>
          </li>)}</ul>
        </section>
        <details className="panel-card">
          <summary>Actividad reciente</summary>
          <ul className="collab-list">{data.events.map(item => <li key={item.id}>
            <span>{eventLabels[item.kind] || item.kind}</span><small>{time(item.created_at)}</small>
          </li>)}</ul>
        </details>
        <p className="collab-limit">Se muestran hasta 200 ejercicios, 100 citas, 100 mensajes y 50 eventos recientes por alumno.</p>
      </>}
    </section>
  </Layout>;
}
