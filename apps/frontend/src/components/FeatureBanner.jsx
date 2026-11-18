import '../feature-pages.css';
import {cardVariants,motion} from './Motion.jsx';
/**
 * Resumen en cifras de una pantalla (estilo app deportiva): solo datos, sin texto promocional.
 * `title`, `description` e `icon` se aceptan por compatibilidad, pero no se muestran.
 */
export default function FeatureBanner({stats=[]}){
 if(!stats.length)return null;
 return <motion.section variants={cardVariants} className="mh-mini-stats" aria-label="Resumen">
  {stats.map(stat=><div key={stat.label}><strong>{stat.value}</strong><span>{stat.label}</span></div>)}
 </motion.section>;
}
