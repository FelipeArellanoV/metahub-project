/**
 * =========================================================================================
 * PROYECTO METAHUB — SEGUIMIENTO LONGITUDINAL DE LA TÉCNICA DE CARRERA EN ATLETISMO ESCOLAR
 * Escuela de Ingeniería Civil en Informática — Universidad Católica de Temuco
 * 
 * Memoria / Trabajo de Título:
 * Autores: Felipe Arellano Vargas & Sofía Henríquez Soto
 * Profesor Guía: Dr. Marcos Lévano
 * 
 * Archivo: index.js
 * Descripción: Punto de entrada del servidor API Backend y despachador HTTP de MetaHub.
 * =========================================================================================
 */

const http = require('http');
const app = require('./app');

// Puerto de escucha del servidor (3000 por defecto para el backend de MetaHub)
const PORT = process.env.PORT || 3000;

const server = http.createServer(app);

server.listen(PORT, () => {
  console.log(`🚀 MetaHub API Backend ejecutándose en http://localhost:${PORT}`);
});
