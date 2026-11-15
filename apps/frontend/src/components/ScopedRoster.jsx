import {useEffect,useState} from 'react';
import {Link} from 'react-router-dom';
import {Layout,PageHeader,StatCard} from './UI.jsx';
import {AlertTriangle,CalendarDays,ChevronDown,FileText,GitCompare,RefreshCw,ShieldCheck,Sparkles,TrendingUp,User,Users,Video} from 'lucide-react';
import SessionVideo from './SessionVideo.jsx';
import {clubRequest} from '../services/roster.js';
import {AnimatePresence} from 'framer-motion';
import {Skeleton,cardVariants,listItemVariants,motion,staggerVariants} from './Motion.jsx';

const titles={home:'Inicio',compare:'Comparación de sesiones',priority:'Prioridad de apoyo',reports:'Ficha de progreso',sessions:'Sesiones',club:'Atletas del club'};
const date=v=>new Date(v).toLocaleString('es-CL');
const score=v=>v==null?'Sin análisis':v+' pts';
/** Esqueleto con la forma del panel: indicadores, selector y ficha. Solo visual. */
function RosterSkeleton({stats}){
 return <div className="mh-roster-skeleton" role="status" aria-busy="true">
  <span className="mh-visually-hidden">Cargando atletas autorizados…</span>
  {stats&&<div className="stats-grid">{[0,1,2,3].map(i=><div className="stat-card mh-skeleton-card" key={i}>
   <Skeleton width={44} height={44} radius={12}/><div className="mh-skeleton-stack"><Skeleton width="60%" height={11}/><Skeleton width="38%" height={22}/><Skeleton width="70%" height={10}/></div>
  </div>)}</div>}
  <div className="toolbar-card mh-skeleton-stack"><Skeleton width={130} height={12}/><Skeleton height={44} radius={12}/></div>
  <ProfileSkeleton/>
 </div>;
}
function ProfileSkeleton({label}){
 return <div className="panel-card mh-skeleton-stack" role={label?'status':undefined} aria-busy={label?true:undefined}>
  {label&&<span className="mh-visually-hidden">{label}</span>}
  <div className="mh-skeleton-identity"><Skeleton width={56} height={56} radius={16}/><div className="mh-skeleton-stack" style={{flex:1}}><Skeleton width="30%" height={10}/><Skeleton width="55%" height={20}/><Skeleton width="40%" height={11}/></div></div>
  <div className="mh-skeleton-facts">{[0,1,2,3].map(i=><div className="mh-skeleton-stack" key={i}><Skeleton width="70%" height={10}/><Skeleton width="50%" height={14}/></div>)}</div>
 </div>;
}
function readable(value){return typeof value==='string'?value:JSON.stringify(value,null,2);}
export default function ScopedRoster({mode='home',embedded=false,clubOnly=false}) {
 const [athletes,setAthletes]=useState([]);
 const [id,setId]=useState('');
 const [detail,setDetail]=useState(null);
 const [error,setError]=useState('');
 const [loading,setLoading]=useState(true);
 const [sessionA,setA]=useState(''),[sessionB,setB]=useState('');
 const [revision,setRevision]=useState(0);
 useEffect(()=>{
  const abort=new AbortController();setError('');setLoading(true);setDetail(null);setAthletes([]);setId('');
  clubRequest('/roster','GET',undefined,abort.signal).then(data=>{
   const rows=clubOnly?data.athletes.filter(a=>!a.canEdit):data.athletes;
   if(mode==='priority')rows.sort((a,b)=>(a.lastIptScore??101)-(b.lastIptScore??101));
   setAthletes(rows);setId(rows[0]?String(rows[0].id):'');
  }).catch(err=>{if(err.name!=='AbortError')setError(err.message);})
   .finally(()=>{if(!abort.signal.aborted)setLoading(false);});
  return ()=>abort.abort();
 },[revision,clubOnly,mode]);
 useEffect(()=>{
  setDetail(null);setA('');setB('');if(!id)return;
  const abort=new AbortController();setError('');
  clubRequest('/roster/'+encodeURIComponent(id),'GET',undefined,abort.signal).then(data=>{
   setDetail(data);
   setA(data.sessions.length?String(data.sessions[data.sessions.length-1].id):'');
   setB(data.sessions.length?String(data.sessions[0].id):'');
  }).catch(err=>{if(err.name!=='AbortError')setError(err.message);});
  return ()=>abort.abort();
 },[id]);
 const current=detail?.athlete.id===Number(id)?detail:null;
 const sessions=current?.sessions||[];
 const first=sessions.find(s=>String(s.id)===sessionA),last=sessions.find(s=>String(s.id)===sessionB);
 const ownCount=athletes.filter(a=>a.canEdit).length;
 const clubCount=athletes.length-ownCount;
 const totalSessions=athletes.reduce((sum,a)=>sum+(a.sessionCount||0),0);
 const latest=sessions.find(s=>s.iptScore!=null);
 const initials=(current?.athlete.name||'').split(' ').filter(Boolean).slice(0,2).map(n=>n[0]).join('').toUpperCase();
 const scoredFirst=first?.iptScore!=null,scoredLast=last?.iptScore!=null;
 const content=(
  <div className="roster-view">
   {!embedded && <PageHeader
    eyebrow={mode==='home'?'PANEL DEL ENTRENADOR':'SEGUIMIENTO LONGITUDINAL'}
    title={mode==='home'?'Tu equipo, en evolución':titles[mode]}
    description={mode==='home'?'Revisa el progreso de tus atletas y organiza su seguimiento.':'Consulta sesiones y resultados de los atletas a tu cargo o compartidos por tu club.'}
    action={<button type="button" className="secondary-button" onClick={()=>setRevision(r=>r+1)}><RefreshCw size={16}/>Actualizar</button>}
   />}
   {embedded && <div className="section-heading"><h2>Atletas de mis clubes</h2></div>}
   {error && <motion.div className="roster-message error" role="alert" initial={{opacity:0,y:-6}} animate={{opacity:1,y:0}}><AlertTriangle size={20}/>{error}</motion.div>}
   {loading && <RosterSkeleton stats={!embedded}/>}
   {!loading && !error && !athletes.length && <motion.div className="empty-card" initial={{opacity:0,y:10}} animate={{opacity:1,y:0}}>
    <Users size={32}/><h3>Aún no hay atletas en esta vista</h3>
    <p>{clubOnly?'No tienes atletas compartidos por otros entrenadores del club.':'Registra tus atletas para comenzar su seguimiento.'}</p>
    {!clubOnly && <Link className="primary-button" to="/athletes">Gestionar atletas</Link>}
   </motion.div>}
   {!loading && !error && athletes.length>0 && <>
    {!embedded && <motion.section className="stats-grid" variants={staggerVariants(0.05)} initial="initial" animate="animate">
     <motion.div variants={cardVariants} className="mh-grid-item"><StatCard icon={Users} label="A mi cargo" value={ownCount} detail="atletas propios"/></motion.div>
     <motion.div variants={cardVariants} className="mh-grid-item"><StatCard icon={ShieldCheck} label="Del club" value={clubCount} detail="consulta compartida"/></motion.div>
     <motion.div variants={cardVariants} className="mh-grid-item"><StatCard icon={Video} label="Sesiones" value={totalSessions} detail="en las fichas visibles"/></motion.div>
     <motion.div variants={cardVariants} className="mh-grid-item"><StatCard icon={TrendingUp} label="Último IPT" detail={current?current.athlete.name:'selecciona un atleta'}
      value={<AnimatePresence mode="wait" initial={false}><motion.span key={String(latest?.iptScore ?? '—')+'-'+id} className="mh-inline-block"
       initial={{opacity:0,y:6}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-6}} transition={{duration:.18}}>{latest?.iptScore ?? '—'}</motion.span></AnimatePresence>}/></motion.div>
    </motion.section>}
    {mode==='home' && <motion.section className="highlight-card" initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} transition={{delay:.18}}>
     <div className="highlight-icon"><Sparkles size={26}/></div>
     <div><span className="eyebrow blue">SEGUIMIENTO LONGITUDINAL</span>
      <h2>Cada sesión cuenta una historia de progreso.</h2>
      <p>Revisa evaluaciones, acompaña al alumno y convierte sus resultados en un plan de trabajo.</p>
     </div><Link className="secondary-button" to="/collaboration">Abrir seguimiento</Link>
    </motion.section>}
    <motion.section className="toolbar-card roster-toolbar" initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} transition={{delay:.24}}>
     <label><User size={18}/>Atleta evaluado
      <select className="select-control" value={id} onChange={event=>setId(event.target.value)}>
       {athletes.map(athlete=>(
        <option key={athlete.id} value={athlete.id}>
         {athlete.name} — {athlete.canEdit?'A mi cargo':'Club · solo lectura'}
        </option>
       ))}
      </select>
     </label>
     <small><ShieldCheck size={13}/> Los datos del club son de solo lectura</small>
    </motion.section>
    {mode==='priority' && <>
     <div className="section-heading"><div><span className="eyebrow">SEGUIMIENTO DEL EQUIPO</span><h2>Resultados recientes</h2></div></div>
     <motion.div className="roster-priority-grid" variants={staggerVariants(0.05)} initial="initial" animate="animate">
      {athletes.map(athlete=>(
       <motion.button variants={cardVariants} key={athlete.id} type="button" className="roster-priority-card"
        aria-pressed={String(athlete.id)===id} onClick={()=>setId(String(athlete.id))}>
        <span className="eyebrow">{athlete.canEdit?'A MI CARGO':'COMPARTIDO POR CLUB'}</span>
        <strong>{athlete.name}</strong>
        <span className="roster-big-score">{athlete.lastIptScore ?? '—'} <small>IPT</small></span>
        <small>{athlete.lastIptScore==null?'Sin análisis registrado':athlete.sessionCount+' sesiones registradas'}</small>
       </motion.button>
      ))}
     </motion.div>
     <small>Ordenado por último IPT disponible. Un resultado aislado no determina una prioridad clínica.</small>
    </>}
    {!current && !error && <ProfileSkeleton label="Cargando ficha del atleta…"/>}
    {current && <motion.div key={current.athlete.id} className="mh-roster-detail" variants={staggerVariants(0.07)} initial="initial" animate="animate">
     <motion.section variants={cardVariants} className={mode==='reports'?'panel-card report-sheet':'panel-card'}>
      <div className="roster-identity">
       <div className="roster-avatar">{initials}</div>
       <div><span className="eyebrow">{mode==='reports'?'FICHA DE PROGRESO':'FICHA DEL ATLETA'}</span><h2>{current.athlete.name}</h2>
        <p>{current.athlete.organizationName || 'Club o establecimiento sin registrar'}</p>
       </div>
       <span className={'status '+(current.athlete.canEdit?'success':'warning')}>
        <span className="status-dot"/>{current.athlete.canEdit?'A mi cargo':'Club · solo lectura'}
       </span>
      </div>
      <div className="roster-profile-facts">
       <div><small>Entrenador responsable</small><strong>{current.athlete.trainerName || 'Tu cuenta'}</strong></div>
       <div><small>Edad</small><strong>{current.athlete.age==null?'Sin registrar':current.athlete.age+' años'}</strong></div>
       <div><small>Consentimiento</small><strong>{current.athlete.consent?'Registrado':'Pendiente'}</strong></div>
       <div><small>Evaluaciones</small><strong>{sessions.length} sesiones</strong></div>
      </div>
      <div className="roster-actions">
       {current.athlete.canEdit && <Link className="primary-button" to="/capture"><Video size={16}/>Registrar captura</Link>}
       <Link className="secondary-button" to="/collaboration">Seguimiento compartido</Link>
       {mode==='reports' && <button className="secondary-button btn-print" type="button" onClick={()=>window.print()}><FileText size={16}/>Imprimir ficha</button>}
      </div>
     </motion.section>
     {mode==='compare' && <motion.section variants={cardVariants} className="panel-card">
      <div className="panel-heading"><div><span className="eyebrow">ANTES Y DESPUÉS</span><h2>Comparador de sesiones</h2></div><GitCompare size={24} className="panel-icon"/></div>
      {sessions.length<2 ? <div className="empty-card"><p>Necesitas dos sesiones registradas para comparar la evolución.</p></div> : <>
       <div className="roster-compare-grid">
        {[
         {label:'Evaluación inicial',value:sessionA,set:setA,session:first},
         {label:'Sesión de control',value:sessionB,set:setB,session:last}
        ].map(item=>(
         <article className="roster-session-card" key={item.label}>
          <header><span>SEGUIMIENTO BIOMECÁNICO</span><h3>{item.label}</h3>
           <span>{item.session ? date(item.session.sessionDate) : 'Seleccionar sesión'}</span>
          </header>
          <div className="roster-session-card-body">
           <label className="form-field"><span>Sesión registrada</span>
            <select value={item.value} onChange={event=>item.set(event.target.value)}>
             {sessions.map(session=><option key={session.id} value={session.id}>#{session.id} · {date(session.sessionDate)}</option>)}
            </select>
           </label>
           <div className="roster-big-score">{item.session?.iptScore ?? '—'} <small>puntos IPT</small></div>
           <span>{item.session?.iptScore==null?'Sin análisis disponible':'Resultado registrado'}</span>
           {item.session?.videoUrl?.startsWith('/api/videos/') && <SessionVideo sessionId={item.session.id}/>}
          </div>
         </article>
        ))}
       </div>
       <div className="roster-delta"><TrendingUp size={24}/>
        {sessionA===sessionB ? <span>Selecciona dos sesiones distintas.</span> : scoredFirst&&scoredLast ? <>
         <strong>{last.iptScore-first.iptScore>0?'+':''}{(last.iptScore-first.iptScore).toFixed(1)} puntos</strong><span>Diferencia entre las sesiones seleccionadas</span>
        </> : <span>Ambas sesiones deben tener análisis para calcular la diferencia.</span>}
       </div>
       {first&&last&&new Date(last.sessionDate)<new Date(first.sessionDate)&&<p>La sesión de control es anterior a la inicial. Revisa el orden elegido.</p>}
      </>}
     </motion.section>}
     <motion.section variants={cardVariants} className="panel-card">
      <div className="panel-heading"><div><span className="eyebrow">EVOLUCIÓN REGISTRADA</span><h2>{mode==='sessions'?'Sesiones de pista':'Historial de evaluaciones'}</h2></div><CalendarDays size={24} className="panel-icon"/></div>
      {!sessions.length && <div className="empty-card"><p>Este atleta aún no tiene sesiones registradas.</p></div>}
      {sessions.map((session,i)=>(
       <motion.details key={session.id} className="roster-history-item" custom={i} variants={listItemVariants} initial="initial" animate="animate">
        <summary>
         <div className="session-icon"><Video size={18}/></div>
         <div className="roster-session-info"><strong>Sesión #{session.id}</strong><small>{date(session.sessionDate)}</small></div>
         <span className="roster-session-score">{score(session.iptScore)}</span>
         <span className={'status '+(session.iptScore==null?'warning':'success')}><span className="status-dot"/>{session.iptScore==null?'Pendiente de análisis':'Con análisis'}</span>
         <ChevronDown size={18}/>
        </summary>
        <div className="roster-history-detail">
         {session.videoUrl?.startsWith('/api/videos/') && <SessionVideo sessionId={session.id}/>}
         <Link className="secondary-button" to={'/reviews?athleteId='+current.athlete.id+'&sessionId='+session.id}>Ver revisión y ejercicios</Link>
         {session.notes && <p>{session.notes}</p>}
         {session.analysis?.diagnostico && <p>{readable(session.analysis.diagnostico)}</p>}
         {session.analysis?.sector_prioritario && <p>Sector prioritario: {readable(session.analysis.sector_prioritario)}</p>}
         {session.analysis && <details><summary>Desglose del análisis registrado</summary><pre>{JSON.stringify(session.analysis,null,2)}</pre></details>}
        </div>
       </motion.details>
      ))}
     </motion.section>
    </motion.div>}
   </>}
  </div>
 );
 return embedded?content:<Layout>{content}</Layout>;
}
