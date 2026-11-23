# ADR 026: detalle del análisis en cada sección

* **Estado:** Aceptada
* **Fecha:** 2026-11-23
* Complementa ADR-023, ADR-024 y ADR-025. No cambia el cálculo del IPT.

## Contexto
El análisis guardado trae mucha información que la app no mostraba:
- estadística por variable (n, DE, CV, IC 95 %);
- el valor de cada paso;
- regularidad, apoyo estable, verificación de sprint y cuadros por segundo reales;
- la causa, la indicación verbal y el error a evitar de la prescripción.

El historial mostraba el análisis como JSON crudo.

## Decisión
Mostrar esos datos dentro de las secciones existentes, desde una lógica pura (`services/detalleAnalisis.js`, con pruebas) y componentes comunes (`DetalleAnalisis.jsx`). Lo que falta se dice; no se rellena.

| Sección | Qué se agrega |
|---|---|
| Inicio (entrenador) | Ritmo y calidad de la toma del último análisis. Indicadores del equipo: analizados en 30 días, por revisar, ejercicios vencidos y videos en cola. Avisos de ejercicios vencidos y revisiones pendientes |
| Ficha del atleta | Perfil deportivo (prueba, pierna dominante, estatura y mejor marca). Resumen técnico: último y mejor IPT v3, tendencia según los IC y variable que más se repite |
| Historial y Revisiones | Por qué, indicación y error a evitar; pestañas de variables por fase, paso a paso, ritmo y calidad. Reemplaza el JSON |
| Comparar | Perfil antes y después superpuesto y cambio por variable: es real si los IC de los pasos no se superponen |
| Ejercicios | A qué hallazgo responde cada ejercicio sugerido |
| Subir video | Guía de grabación con esquema |
| Portal (atleta) | Foco explicado en lenguaje simple, ritmo y perfil deportivo |
| Informe | Ritmo, interpretación, variables por fase y calidad de la toma |

La distancia de la guía (unos 10 m) se calcula para cubrir unos 15 m con el gran angular de unos 70° de un celular. Es una orientación, no un requisito validado.

## Perfil deportivo
- Tabla `athlete_sport_profiles` (migración 009 y `schema.sql`), separada de `athletes` para no tocar las consultas existentes.
- Se lee en `GET /api/roster/:id` y en `GET /api/portal/me`. Se edita con `PUT /api/roster/:id/perfil`, solo por el entrenador responsable.
- No entra al IPT.

## Consecuencias
- Laboratorio, Comparar e Informe se cargan en diferido; el bundle principal queda en unos 422 kB (antes 440,9).
- Se corrigió un desborde horizontal previo en Subir video: el selector de atleta ensanchaba la página en 390 px.
