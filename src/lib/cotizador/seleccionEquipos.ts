// Funciones para seleccionar automáticamente equipos según las características del sistema

import type { Equipo, ResultadoCalculo, DatosProyecto } from './tipos';
import { EQUIPOS } from './equipos';

/**
 * Selecciona automáticamente el panel más adecuado según la potencia necesaria
 */
export function seleccionarPanel(
  potenciaNecesaria: number, // kWp
  preferencia?: 'precio' | 'eficiencia' | 'tamaño'
): Equipo | null {
  const paneles = EQUIPOS.filter(e => e.tipo === 'panel');
  if (paneles.length === 0) return null;
  
  // Convertir potencia necesaria a W
  const potenciaNecesariaW = potenciaNecesaria * 1000;
  
  // Filtrar paneles que puedan cumplir con la potencia
  const panelesAdecuados = paneles.filter(panel => {
    const potenciaPanel = panel.potencia || 0;
    // Aceptar paneles que con una cantidad razonable (máx 50 paneles) puedan cumplir
    const cantidadNecesaria = Math.ceil(potenciaNecesariaW / potenciaPanel);
    return cantidadNecesaria <= 50 && cantidadNecesaria > 0;
  });
  
  if (panelesAdecuados.length === 0) {
    // Si no hay paneles adecuados, usar el más grande disponible
    return paneles.reduce((max, panel) => 
      (panel.potencia || 0) > (max.potencia || 0) ? panel : max
    );
  }
  
  // Ordenar según preferencia
  let panelesOrdenados = [...panelesAdecuados];
  
  if (preferencia === 'precio') {
    // Ordenar por precio por Wp (más económico)
    panelesOrdenados.sort((a, b) => {
      const precioWpA = a.precioWp || (a.precioUnitario / (a.potencia || 1));
      const precioWpB = b.precioWp || (b.precioUnitario / (b.potencia || 1));
      return precioWpA - precioWpB;
    });
  } else if (preferencia === 'eficiencia') {
    // Ordenar por eficiencia (mayor eficiencia primero)
    panelesOrdenados.sort((a, b) => (b.eficiencia || 0) - (a.eficiencia || 0));
  } else if (preferencia === 'tamaño') {
    // Ordenar por área (menor área primero)
    panelesOrdenados.sort((a, b) => (a.area || 0) - (b.area || 0));
  } else {
    // Por defecto: balance entre potencia y precio
    panelesOrdenados.sort((a, b) => {
      const potenciaA = a.potencia || 0;
      const potenciaB = b.potencia || 0;
      const precioWpA = a.precioWp || (a.precioUnitario / potenciaA);
      const precioWpB = b.precioWp || (b.precioUnitario / potenciaB);
      
      // Priorizar paneles de mayor potencia pero con buen precio por Wp
      const scoreA = potenciaA / precioWpA;
      const scoreB = potenciaB / precioWpB;
      return scoreB - scoreA;
    });
  }
  
  return panelesOrdenados[0] || null;
}

/**
 * Selecciona automáticamente el inversor más adecuado según la potencia instalada
 */
export function seleccionarInversor(
  potenciaInstalada: number, // kW
  tipoSistema: 'on-grid' | 'off-grid' | 'hibrido',
  voltajeSistema?: number
): Equipo | null {
  const inversores = EQUIPOS.filter(e => {
    if (e.tipo !== 'inversor') return false;
    
    // Filtrar por tipo de sistema
    if (tipoSistema === 'off-grid' && !e.descripcion.toLowerCase().includes('híbrido') && !e.descripcion.toLowerCase().includes('off')) {
      return false;
    }
    
    // Filtrar por voltaje si se especifica
    if (voltajeSistema && e.voltaje && e.voltaje !== voltajeSistema) {
      return false;
    }
    
    return true;
  });
  
  if (inversores.length === 0) return null;
  
  // Buscar inversor que pueda manejar la potencia instalada
  // Idealmente con un margen del 10-20% más
  const potenciaMinima = potenciaInstalada;
  const potenciaMaxima = potenciaInstalada * 1.2; // 20% de margen
  
  const inversoresAdecuados = inversores.filter(inv => {
    const potenciaInv = inv.potencia || 0; // kW
    return potenciaInv >= potenciaMinima && potenciaInv <= potenciaMaxima;
  });
  
  if (inversoresAdecuados.length > 0) {
    // Seleccionar el más cercano a la potencia necesaria
    inversoresAdecuados.sort((a, b) => {
      const diffA = Math.abs((a.potencia || 0) - potenciaInstalada);
      const diffB = Math.abs((b.potencia || 0) - potenciaInstalada);
      return diffA - diffB;
    });
    return inversoresAdecuados[0];
  }
  
  // Si no hay inversor en el rango, usar el más cercano por encima
  const inversoresMayores = inversores
    .filter(inv => (inv.potencia || 0) >= potenciaInstalada)
    .sort((a, b) => (a.potencia || 0) - (b.potencia || 0));
  
  if (inversoresMayores.length > 0) {
    return inversoresMayores[0];
  }
  
  // Si no hay inversor mayor, usar el más grande disponible
  return inversores.reduce((max, inv) => 
    (inv.potencia || 0) > (max.potencia || 0) ? inv : max
  );
}

/**
 * Selecciona automáticamente la batería más adecuada según la capacidad necesaria
 */
export function seleccionarBateria(
  capacidadNecesaria: number, // kWh
  voltajeSistema: number
): Equipo | null {
  const baterias = EQUIPOS.filter(e => 
    e.tipo === 'bateria' && 
    e.voltaje === voltajeSistema
  );
  
  if (baterias.length === 0) return null;
  
  // Calcular cantidad de baterías necesarias para cada tipo
  const opciones = baterias.map(bateria => {
    const capacidadBateria = bateria.capacidad || 0; // kWh
    const cantidad = Math.ceil(capacidadNecesaria / capacidadBateria);
    const capacidadTotal = cantidad * capacidadBateria;
    const costoTotal = cantidad * bateria.precioUnitario;
    
    return {
      bateria,
      cantidad,
      capacidadTotal,
      costoTotal,
      eficiencia: capacidadBateria / bateria.precioUnitario, // kWh por COP
    };
  });
  
  // Ordenar por mejor relación capacidad/precio
  opciones.sort((a, b) => {
    // Priorizar opciones con mejor eficiencia y menor cantidad de baterías
    const scoreA = a.eficiencia / a.cantidad;
    const scoreB = b.eficiencia / b.cantidad;
    return scoreB - scoreA;
  });
  
  return opciones[0]?.bateria || null;
}

/**
 * Selecciona automáticamente el controlador MPPT más adecuado
 */
export function seleccionarControlador(
  potenciaPaneles: number, // W
  voltajeSistema: number,
  corrienteMaximaPaneles: number // A
): Equipo | null {
  const controladores = EQUIPOS.filter(e => 
    e.tipo === 'controlador' &&
    e.voltaje === voltajeSistema
  );
  
  if (controladores.length === 0) return null;
  
  // Calcular corriente necesaria (con margen de seguridad del 25%)
  const corrienteNecesaria = corrienteMaximaPaneles * 1.25;
  
  // Buscar controlador que pueda manejar la corriente
  const controladoresAdecuados = controladores.filter(ctrl => {
    const corrienteCtrl = ctrl.corriente || 0;
    return corrienteCtrl >= corrienteNecesaria;
  });
  
  if (controladoresAdecuados.length > 0) {
    // Seleccionar el más cercano a la corriente necesaria
    controladoresAdecuados.sort((a, b) => {
      const diffA = Math.abs((a.corriente || 0) - corrienteNecesaria);
      const diffB = Math.abs((b.corriente || 0) - corrienteNecesaria);
      return diffA - diffB;
    });
    return controladoresAdecuados[0];
  }
  
  // Si no hay controlador adecuado, usar el más grande disponible
  return controladores.reduce((max, ctrl) => 
    (ctrl.corriente || 0) > (max.corriente || 0) ? ctrl : max
  );
}

/**
 * Propone automáticamente todos los equipos necesarios para un sistema
 */
export function proponerEquipos(
  resultado: ResultadoCalculo,
  proyecto: DatosProyecto
): {
  panel: Equipo | null;
  inversor: Equipo | null;
  bateria: Equipo | null;
  controlador: Equipo | null;
} {
  const panel = seleccionarPanel(resultado.potenciaNecesaria);
  
  let inversor: Equipo | null = null;
  let bateria: Equipo | null = null;
  let controlador: Equipo | null = null;
  
  if (proyecto.tipoSistema === 'on-grid' || proyecto.tipoSistema === 'hibrido') {
    inversor = seleccionarInversor(
      resultado.potenciaInstalada,
      proyecto.tipoSistema
    );
  }
  
  if (proyecto.tipoSistema === 'off-grid' || proyecto.tipoSistema === 'hibrido') {
    if (proyecto.tipoSistema === 'off-grid') {
      const proyectoOffGrid = proyecto as any;
      bateria = seleccionarBateria(
        resultado.capacidadBateria || 0,
        proyectoOffGrid.voltajeSistema || 48
      );
      
      if (panel) {
        const corrienteMaxima = (panel.corriente || 0) * resultado.cantidadPaneles;
        controlador = seleccionarControlador(
          resultado.potenciaInstalada * 1000,
          proyectoOffGrid.voltajeSistema || 48,
          corrienteMaxima
        );
      }
    } else {
      // Híbrido
      const proyectoHibrido = proyecto as any;
      bateria = seleccionarBateria(
        resultado.capacidadBateria || 0,
        proyectoHibrido.voltajeSistema || 48
      );
    }
  }
  
  return {
    panel,
    inversor,
    bateria,
    controlador,
  };
}

