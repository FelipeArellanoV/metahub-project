// Categoría escolar calculada desde la edad guardada en la ficha.
// La API no almacena la categoría; se deriva siempre de la edad para que no quede desactualizada.
// Regla: menos de 14 años → Sub-14; 14 y 15 → Sub-16; 16 y 17 → Sub-18; 18 o más → Sub-20.

export const CATEGORIAS = ['Sub-14', 'Sub-16', 'Sub-18', 'Sub-20'];

export function categoriaPorEdad(edad) {
  const n = Number(edad);
  if (edad === null || edad === undefined || edad === '' || !Number.isFinite(n) || n <= 0) return null;
  if (n < 14) return 'Sub-14';
  if (n < 16) return 'Sub-16';
  if (n < 18) return 'Sub-18';
  return 'Sub-20';
}
