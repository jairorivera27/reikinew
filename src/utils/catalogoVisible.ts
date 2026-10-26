/** En Paneles solares el listado muestra disponibles y preorden. Los agotados no aparecen. */
export function visibleEnListadoTienda(data: { category?: string; stock?: string }): boolean {
  if (data.category === 'paneles') {
    const stock = data.stock ?? 'disponible';
    return stock === 'disponible' || stock === 'pre-orden';
  }
  return true;
}
