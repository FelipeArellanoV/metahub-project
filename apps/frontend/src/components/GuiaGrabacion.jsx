// Guía de grabación (ADR-026): esquema visto desde arriba y lista de chequeo para que el análisis por paso funcione.
// Distancia: con el gran angular típico de un celular (~70° horizontal), cubrir ~15 m de pista (6 a 8 pasos de sprint)
// exige unos 15 / (2 · tan 35°) ≈ 10,7 m. Los requisitos de cuadros por segundo vienen de ADR-023.
import {Camera} from 'lucide-react';

export default function GuiaGrabacion({abierta=false}){
 return <details className="gg" open={abierta}>
  <summary><Camera size={18} aria-hidden="true"/>Cómo grabar para que el análisis funcione</summary>
  <div className="gg-body">
   <svg viewBox="0 0 340 190" className="gg-svg" role="img" aria-label="Esquema visto desde arriba: el celular fijo a unos 10 metros del carril, perpendicular a la carrera, cubre unos 15 metros de pista">
    <rect x="10" y="26" width="320" height="44" rx="6" className="gg-lane"/>
    <line x1="10" y1="48" x2="330" y2="48" className="gg-lane-mid"/>
    <text x="16" y="20" className="gg-t">Carril</text>
    <path d="M30 48 H310" className="gg-run" markerEnd="url(#gg-arrow)"/>
    <defs><marker id="gg-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" className="gg-arrow"/></marker></defs>
    <path d="M170 150 L95 70 H245 Z" className="gg-fov"/>
    <line x1="95" y1="80" x2="245" y2="80" className="gg-dim"/>
    <text x="170" y="94" textAnchor="middle" className="gg-t b">≈ 15 m de pista (6–8 pasos)</text>
    <line x1="262" y1="70" x2="262" y2="150" className="gg-dim"/>
    <text x="268" y="114" className="gg-t b">≈ 10 m</text>
    <rect x="158" y="148" width="24" height="16" rx="3" className="gg-phone"/>
    <text x="170" y="182" textAnchor="middle" className="gg-t">Celular fijo · altura de la cadera</text>
   </svg>
   <ol className="gg-list">
    <li><b>De costado y perpendicular</b> a la carrera, a unos 10 m del carril, con el celular en horizontal.</li>
    <li><b>Fijo</b>, en trípode o apoyado, a la altura de la cadera del atleta. No sigas al atleta con la cámara.</li>
    <li><b>Cámara lenta</b>: 120 cuadros/s como mínimo; 240 permite medir también el tiempo de apoyo. Indica el factor (×2, ×4, ×8) al subir.</li>
    <li><b>A máxima velocidad</b>: la zona filmada debe estar después de la aceleración (por ejemplo, entre 30 y 50 m en un 60 m).</li>
    <li><b>Cuerpo completo</b> de pies a cabeza en todo el tramo, con buena luz y ropa que contraste con el fondo.</li>
    <li><b>Una pasada por video</b>, sin otros corredores cruzando el cuadro.</li>
   </ol>
  </div>
 </details>;
}
