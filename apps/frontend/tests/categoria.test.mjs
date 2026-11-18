// Categoría escolar derivada de la edad (la API no la guarda).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { categoriaPorEdad, CATEGORIAS } from '../src/services/categoria.js';

test('asigna la categoría según la edad cumplida', () => {
  assert.equal(categoriaPorEdad(10), 'Sub-14');
  assert.equal(categoriaPorEdad(13), 'Sub-14');
  assert.equal(categoriaPorEdad(14), 'Sub-16');
  assert.equal(categoriaPorEdad(15), 'Sub-16');
  assert.equal(categoriaPorEdad(16), 'Sub-18');
  assert.equal(categoriaPorEdad(17), 'Sub-18');
  assert.equal(categoriaPorEdad(18), 'Sub-20');
  assert.equal(categoriaPorEdad('16'), 'Sub-18', 'acepta la edad como texto del formulario');
});

test('sin edad válida no inventa una categoría', () => {
  for (const v of [null, undefined, '', 0, -3, 'abc', NaN]) assert.equal(categoriaPorEdad(v), null, String(v));
});

test('las categorías del filtro cubren todos los resultados posibles', () => {
  for (let edad = 8; edad <= 25; edad++) assert.ok(CATEGORIAS.includes(categoriaPorEdad(edad)), String(edad));
});
