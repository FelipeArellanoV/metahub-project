import '../feature-pages.css';
export default function FeatureBanner({icon:Icon,title,description,stats=[]}){
 return <section className="feature-banner">
  <div className="feature-banner-main"><div className="feature-banner-icon">{Icon&&<Icon size={25}/>}</div>
   <div><span className="feature-banner-eyebrow">METAHUB · SEGUIMIENTO DEPORTIVO</span><h2>{title}</h2><p>{description}</p></div>
  </div>
  {stats.length>0&&<div className="feature-banner-stats">{stats.map(stat=><div key={stat.label}><strong>{stat.value}</strong><span>{stat.label}</span></div>)}</div>}
 </section>;
}
