/**
 * Helper para obtener el basePath de la aplicación
 * En producción: /okr
 * En desarrollo: puede ser /okr o vacío según NEXT_PUBLIC_BASE_PATH
 */
export function getBasePath(): string {
  if (typeof window !== 'undefined') {
    // En el cliente, usar la variable de entorno o el path actual
    return process.env.NEXT_PUBLIC_BASE_PATH || '/okr';
  }
  // En el servidor
  return process.env.NEXT_PUBLIC_BASE_PATH || '/okr';
}

/**
 * Helper para construir rutas absolutas considerando el basePath
 */
export function getAbsolutePath(path: string): string {
  const basePath = getBasePath();
  // Asegurar que el path comience con /
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  // Combinar basePath y path, evitando doble slash
  return `${basePath}${normalizedPath}`;
}

