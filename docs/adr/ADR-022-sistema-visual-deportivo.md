# ADR-022: Sistema visual de app deportiva y orden de las pantallas

Estado: aceptada (2026-11-17). Complementa ADR-021 (movimiento de la interfaz).

## Contexto
La interfaz se fue armando por capas:

- Cuatro hojas de estilo se pisaban entre sí: `styles.css`, `professional-theme.css`, `restored-theme.css` y `feature-pages.css`.
- Había unos 450 estilos escritos dentro de los componentes y 78 colores fijos.
- Algunas pantallas tenían paleta propia: azul marino en Ejercicios y neón en el Laboratorio de captura.
- El menú tenía 12 enlaces sueltos, con nombres mezclados en inglés ("drills").
- Varias pantallas mostraban banners promocionales en vez de datos.

Al revisar, además, aparecieron funciones que fingían funcionar:

- Ajustes decía "Configuración guardada" sin guardar nada.
- La asignación de ejercicios informaba éxito aunque la API fallara (lo guardaba en el navegador del entrenador) y su modal ofrecía dos atletas inventados.
- La categoría se elegía en un formulario que el backend descartaba, y la lista completaba edad y categoría con "15 años" y "Sub-16".
- El Laboratorio afirmaba "Validado UCT" cuando el análisis se marca a sí mismo `experimental_no_validado`.

## Decisión

### 1. Lenguaje visual
- Estilo de app deportiva, como Apple Sports o Nike Run Club, sin copiar su diseño:
  - fondo casi negro;
  - títulos en Barlow Condensed cursiva y en mayúsculas;
  - cifras protagonistas;
  - tarjetas lisas sin sombra;
  - botones tipo píldora.
- **Un solo acento naranja "tartán" (#FF5A1F) para la acción principal de cada pantalla.** El azul (#4D9BFF) es para datos. Las acciones de los formularios dentro de una tarjeta van en blanco (en negro con tema claro).
- Verde, amarillo y rojo solo comunican estado: listo, pendiente o riesgo.
- Tema oscuro por defecto; el claro se elige en Ajustes y usa los mismos roles. El Laboratorio de captura es siempre oscuro (`data-theme="dark"` en su contenedor), como la cámara de un celular.

### 2. Implementación
- `src/sport-theme.css` se carga al final y define variables `--mh-*`. Además redefine las variables antiguas (`--surface`, `--navy`, `--blue`…), para que las pantallas que aún las usan adopten la paleta.
- Para ganarle a las reglas antiguas por tema de `professional-theme.css` se usa el prefijo `[data-theme]`.
- Las pantallas rehechas (Inicio, Atletas, Grabar, Portal, Comparar, Ejercicios, Ajustes) usan clases `mh-*` en vez de estilos en línea.
- La lógica de lo que se muestra está en módulos puros con pruebas:
  - `resumenEquipo.js`: último análisis y avisos.
  - `categoria.js`: categoría por edad.
  - `progressState.js`: indicadores de avance.

### 3. Orden
- **Menú en 4 grupos:** Equipo, Análisis, Entrenamiento y Organización.
- **Barra inferior del celular, 5 pestañas:**
  - Entrenador: Inicio · Atletas · **Grabar** · Sesiones · Más.
  - Atleta: Inicio · Revisiones · **Subir** · Evolución · Más.
- **Cada pantalla, de arriba abajo:**
  1. Título corto.
  2. La cifra principal.
  3. Lo que requiere atención.
  4. Cifras secundarias.
  5. Detalle.
- Los detalles largos (cómo hacer un ejercicio, motivos de baja confianza, formularios secundarios) van plegados.

### 4. Solo datos reales
- **Categoría:** se calcula desde la edad guardada (Sub-14 bajo 14 años, Sub-16 con 14–15, Sub-18 con 16–17, Sub-20 desde 18). Sin edad se muestra "Sin registrar".
- **Ajustes:** muestra la cuenta que devuelve `GET /api/auth/me` (no hay endpoint para editarla), el tema, el club (`PUT /api/organization`), la instalación de la PWA (`beforeinstallprompt`, o instrucciones en iOS) y cerrar sesión.
- **Asignación de ejercicios:**
  - Envía la dosis y las instrucciones que escribe el entrenador.
  - Si la API falla, el modal muestra el error y no guarda nada en el navegador.
  - El plan completo informa cuántos ejercicios se guardaron de verdad.
- **Comparar:** se quitaron las frases de "Impacto" que afirmaban beneficios (por ejemplo, "prevención activa de lesiones") sin importar si la medición mejoró o empeoró.

## Consecuencias
- La app se ve y se ordena como un producto deportivo. El bundle principal bajó de 440,9 a 433,8 kB.
- Una regla nueva debe usar las variables `--mh-*`. Si se agrega un color fijo, hay que justificarlo.
- Siguen escritos con estilos en línea, aunque con la paleta nueva: el Laboratorio de captura (unos 200) y partes de la ficha lateral de Atletas. Quedan pendientes de pasar a clases.
- Pendiente de verificar en un celular real: legibilidad al sol del tema oscuro y la instalación de la PWA.

## Verificación
- **Frontend:** 37 pruebas con `node:test` y el build.
- **Backend:** 56 pruebas con `node:test` y 7 con Jest.
- **Navegador en 390×844, sin errores de consola y sin desborde horizontal:**
  - 13 pantallas de entrenador en tema oscuro y claro;
  - 7 de atleta;
  - el inicio de sesión.
- **Inicio, Atletas y Portal:** revisados también con movimiento reducido.
- **Asignación de punta a punta:** el ejercicio se guardó en el servidor con las instrucciones editadas, y el aviso de éxito apareció solo después de confirmarlo.
