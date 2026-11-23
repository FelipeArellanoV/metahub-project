# ADR 025: gráficos del IPT e informe de sesión en PDF

* **Estado:** Aceptada
* **Fecha:** 2026-11-23
* Complementa ADR-024 (IPT v3). No cambia el cálculo.

## Contexto
El IPT v3 entrega un IC 95 %, un perfil por variable y puntajes por fase, pero la app los mostraba como texto. Entrenadores, atletas y familias necesitan un documento para compartir.

## Decisión
- **Perfil por variable** (`PerfilIpt`): barras divergentes con el z de cada variable frente a la referencia. Se ordenan de mayor a menor |z| y se colorean por banda: < 1, 1–2 y > 2 DE. Es el equivalente del MAP de Baker et al. (2009).
- **Evolución** (`EvolucionIpt`): línea del IPT con el IC 95 % de cada sesión y las bandas de 1 y 2 DE.
  - Solo entran sesiones con IPT v3; las v1 y v2 tienen otra escala y se informa cuántas quedaron fuera.
  - Un cambio se califica como real solo si los IC no se superponen (ADR-024).
  - El cambio mínimo detectable se muestra como pendiente del estudio test-retest; no se estima.
- **Informe de sesión** (`/informe`, para el entrenador y el atleta): datos del atleta, IPT con su lectura e IC, fases, perfil, evolución hasta esa fecha, hallazgos, observación del entrenador, ejercicios asignados y sugeridos, y método con referencias.
  - Se descarga con el diálogo de impresión del navegador ("Guardar como PDF"), con estilos de impresión A4 en claro.
  - No se agrega una librería de PDF: el texto queda seleccionable y los gráficos vectoriales, sin aumentar el bundle.
  - Sin logo institucional.
- La lógica está en `services/informeIpt.js`, que es pura y tiene pruebas. Lo que falta se dice: nunca se rellena.
- El portal del atleta entrega `iptVersion`, `ic95` y `provisional` por sesión para graficar la evolución.

## Consecuencias
- El bundle principal sube unos 21 kB (de 440,9 a 462 kB).
- En iOS, "Guardar como PDF" se hace desde Compartir → Imprimir. Hay que verificarlo en un celular real.
