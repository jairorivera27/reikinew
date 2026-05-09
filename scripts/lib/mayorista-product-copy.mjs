/**
 * Textos comerciales y bullets técnicos para fichas mayorista (sin mención de lista/+20%).
 * Basado en información pública típica de fabricantes (datasheets / sitios oficiales); el integrador debe validar revisión de hardware y normativa local.
 */

function norm(s) {
  return String(s)
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toUpperCase();
}

function bodyBase(title, brand) {
  return (
    `**${title}** · referencia **${brand}** para sistemas fotovoltaicos. ` +
    'Resumen elaborado a partir de información pública del fabricante; confirme número de parte, revisión de firmware y compatibilidad de campo antes de comprar.\n\n' +
    'Reiki Solar gestiona importación y disponibilidad; envío nacional se cotiza según destino.'
  );
}

/** @returns {{ description: string, specifications: string[], bodyMarkdown: string }} */
export function enrichMayoristaFicha({ title, brand, category }) {
  const t = title.trim();
  const u = norm(t);

  /** —— Hoymiles microinversores —— */
  if (/HOYMILES.*HMS-2000-4T/i.test(t)) {
    return {
      description:
        'Microinversor monofásico Hoymiles HMS-2000-4T: cuatro MPPT independientes para hasta cuatro módulos de alta potencia, comunicación inalámbrica con gateway Hoymiles y monitoreo en nube.',
      specifications: [
        'Salida nominal típica: 2000 VA (microinversor cuatro entradas / 4 MPPT)',
        'Rango MPPT CC típico: 16–60 V; tensión máx. entrada CC ~65 V (según datasheet regional)',
        'Corriente máx. por MPPT: hasta ~16 A por canal (consultar variante/región)',
        'Eficiencia: CEC peak ~96,5 %; eficiencia MPPT nominal ~99,8 % (valores de ficha)',
        'CA: 220/230/240 V monofásico; THD <3 %; factor de potencia ajustable',
        'Carcasa IP67; rango temperatura aprox. −40 °C a +65 °C; refrigeración por convección',
        'Fuente: [Hoymiles / datasheet HMS serie](https://www.hoymiles.com/)',
      ],
      bodyMarkdown: bodyBase(t, brand),
    };
  }
  if (/HOYMILES.*HMS-1600-4T/i.test(t)) {
    return {
      description:
        'Microinversor Hoymiles HMS-1600-4T con arquitectura cuatro MPPT para plantas residenciales y pequeña comercial con monitoreo granular por módulo.',
      specifications: [
        'Cuatro MPPT independientes; potencia nominal de salida según modelo 1600 VA (ficha Hoymiles)',
        'Tensiones y corrientes CC en rango similar a la familia HMS-2000 con escalado de potencia',
        'Interfaz inalámbrica con DTU Hoymiles y plataforma S-Miles Cloud',
        'Protecciones de red y CC integradas; grado IP67',
        'Fuente: [Hoymiles](https://www.hoymiles.com/)',
      ],
      bodyMarkdown: bodyBase(t, brand),
    };
  }
  if (/HOYMILES.*HMS-800-2T/i.test(t)) {
    return {
      description:
        'Microinversor Hoymiles HMS-800-2T para dos entradas MPPT, ideal para strings cortos o porciones de tejado con sombras diferenciadas.',
      specifications: [
        'Dos MPPT; potencia nominal orientativa 800 VA según modelo',
        'Tensiones CC y CA acordes a familia HMS monofásica (ver datasheet)',
        'Comunicación con DTU; carcasa para exterior IP67',
        'Fuente: [Hoymiles](https://www.hoymiles.com/)',
      ],
      bodyMarkdown: bodyBase(t, brand),
    };
  }
  if (/HOYMILES.*HMT/i.test(t)) {
    return {
      description:
        'Microinversor trifásico Hoymiles serie HMT para conexión a red trifásica, con seguimiento MPPT por canal y monitoreo remoto vía DTU.',
      specifications: [
        'Salida trifásica; número de MPPT y potencia según referencia HMT del pedido',
        'Rango de tensión CC y CA según ficha del modelo (208/220/230 V según región)',
        'IP67; supervisión vía DTU Hoymiles',
        'Fuente: [Hoymiles](https://www.hoymiles.com/)',
      ],
      bodyMarkdown: bodyBase(t, brand),
    };
  }
  if (/HOYMILES.*DTU/i.test(t)) {
    return {
      description:
        'Unidad de telemetría Hoymiles (DTU) para agregar microinversores a la nube: recogida de datos de generación y estado, según modelo con Ethernet, Wi‑Fi o variantes regionales.',
      specifications: [
        'Interfaz y alcance según modelo (DTU-Lite-S, DTU-PRO-S, etc.)',
        'Compatible con microinversores Hoymiles de la misma generación (ver matriz del fabricante)',
        'Alimentación y montaje según manual de instalación',
        'Fuente: [Hoymiles](https://www.hoymiles.com/)',
      ],
      bodyMarkdown: bodyBase(t, brand),
    };
  }
  if (/HOYMILES.*(METER|DDSU|DTSU)/i.test(t)) {
    return {
      description:
        'Medidor de energía Hoymiles para monitorización de inyección/consumo en instalaciones con microinversores; versiones monofásicas, bifásicas o trifásicas con TC externos.',
      specifications: [
        'Clase de medida y rangos de corriente según modelo (100 A, 250 A, etc.)',
        'Conexión vía VIA/CT según referencia; revisar esquema de TC incluidos',
        'Uso con ecosistema Hoymiles / S-Miles Cloud',
        'Fuente: [Hoymiles](https://www.hoymiles.com/)',
      ],
      bodyMarkdown: bodyBase(t, brand),
    };
  }
  if (/HOYMILES.*(TRUNK|CABLE|CONNECTOR|CAP|TOOL|END CAP|DISCONNECT|UNLOCK|EXTENSION|TERMINAL)/i.test(t)) {
    return {
      description:
        'Accesorio de cableado o conexión CA/CC para sistemas con microinversores Hoymiles: troncal, tapas, herramientas de desconexión o extensiones homologadas por el fabricante.',
      specifications: [
        'Compatibilidad estricta con serie HMS/HMT indicada en la referencia',
        'Instalación sólo por personal cualificado',
        'Dimensiones y normas según manual Hoymiles del accesorio',
        'Fuente: [Hoymiles](https://www.hoymiles.com/)',
      ],
      bodyMarkdown: bodyBase(t, brand),
    };
  }

  /** —— APsystems —— */
  if (/APS.*MICRO.*DS3D|DS3D.*2000W/i.test(t)) {
    return {
      description:
        'Microinversor dual de tercera generación APsystems DS3D: dos canales MPPT independientes, hasta ~2000 W de salida según región, comunicación Zigbee cifrada y encapsulado IP67.',
      specifications: [
        'Arquitectura dual con dos MPPT; pensado para módulos de alta potencia y celdas partidas',
        'Eficiencia máxima típica ~97 %; grado IP67',
        'Comunicación inalámbrica cifrada con unidades ECU APsystems',
        'Compatible con accesorios Y3, tapas y cableado del ecosistema DS3',
        'Fuente: [APsystems DS3D](https://global.apsystems.com/portfolio-item/ds3d/)',
      ],
      bodyMarkdown: bodyBase(t, brand),
    };
  }
  if (/APS.*DS3-LV|900W.*120V/i.test(t)) {
    return {
      description:
        'Microinversor APsystems DS3-LV para redes 120 V: formato dual microinverso, MPPT por entrada y protecciones integradas según manual del fabricante.',
      specifications: [
        'Salida orientativa 900 W en configuración 120 V (ver variante)',
        'Doble MPPT; IP67',
        'Integración con ECU y cableado Y3',
        'Fuente: [APsystems](https://global.apsystems.com/)',
      ],
      bodyMarkdown: bodyBase(t, brand),
    };
  }
  if (/QT2-208|QT2.*TRIFAS/i.test(t)) {
    return {
      description:
        'Microinversor trifásico APsystems QT2 para tensión 208 V trifásica, con múltiples MPPT y supervisión vía ECU.',
      specifications: [
        'Conexión trifásica 208 V; potencia y corrientes según datasheet QT2',
        'Varios MPPT para optimizar strings por fase',
        'Comunicación con ECU APsystems',
        'Fuente: [APsystems](https://global.apsystems.com/)',
      ],
      bodyMarkdown: bodyBase(t, brand),
    };
  }
  if (/APS.*(END CAP|ECU-|CTS|CONNECTOR|UNLOCK|CAP MC4)/i.test(t)) {
    return {
      description:
        'Accesorio original APsystems para microinversores (tapas de bus, ECU de comunicación, CTS de corriente, conectores o herramientas). Garantiza mecánica y normativa del conjunto certificado.',
      specifications: [
        'Uso sólo con modelos DS3/QT2/Y600 indicados en la referencia',
        'Instalación según manual APsystems',
        'Revise número de parte y región (NA/LATAM/EU)',
        'Fuente: [APsystems](https://global.apsystems.com/)',
      ],
      bodyMarkdown: bodyBase(t, brand),
    };
  }

  /** —— Huawei SUN2000 L1 (monofásico 2–6 kW) —— */
  const sunL1 = u.match(/SUN2000-(\d+)KTL-L1/);
  if (sunL1) {
    const kw = sunL1[1];
    return {
      description: `Inversor string monofásico Huawei SUN2000-${kw}KTL-L1 para conexión a red, con doble MPPT, alto rendimiento y protecciones avanzadas (incl. detección de arco según revisión). Compatible con integración de baterías LUNA2000 en configuraciones híbridas admitidas por Huawei.`,
      specifications: [
        `Potencia nominal de salida: ${kw} kW (modelo SUN2000-${kw}KTL-L1)`,
        'Eficiencia máxima típ. 98,4 %; eficiencia europea ponderada ~97,8 % (datasheet serie)',
        '2 MPPT; rango MPPT 90–560 VCC; tensión máxima entrada 600 VCC',
        'Corriente máx. por MPPT típ. 12,5 A; potencia FV recomendada por MPPT según guía Huawei',
        'IP66; temperatura de trabajo aprox. −25 °C a +60 °C',
        'Fuente: [Huawei FusionSolar / SUN2000 L1](https://solar.huawei.com/)',
      ],
      bodyMarkdown: bodyBase(t, brand),
    };
  }

  if (/SUN2000-\d+K-LC0/i.test(t)) {
    return {
      description:
        'Inversor Huawei SUN2000 serie LC0: string inverter trifásico para aplicaciones comerciales e industriales, con amplio rango MPPT y alta eficiencia según potencia nominal del modelo.',
      specifications: [
        'Conexión a red trifásica; potencia nominal según código SUN2000-xxK-LC0',
        'Múltiples MPPT y corrientes CC según datasheet del tamaño',
        'Protecciones CC/CA y supervisión según plataforma Huawei',
        'IP66; diseño para exterior',
        'Fuente: [Huawei FusionSolar](https://solar.huawei.com/)',
      ],
      bodyMarkdown: bodyBase(t, brand),
    };
  }

  if (/SUN2000-\d+KTL-M3/i.test(t)) {
    return {
      description:
        'Inversor string trifásico Huawei SUN2000 KTL-M3 para plantas comerciales e industriales: varios MPPT, monitorización y compatibilidad con SmartLogger según proyecto.',
      specifications: [
        'Potencia CA nominal según modelo (20–50 kW en gama habitual M3)',
        'Varios seguidores MPPT; tensiones máximas y corrientes según ficha del kW',
        'Eficiencia máxima en rango 98,6–98,8 % típico en serie (valor orientativo)',
        'IP66; rango térmico extendido para tejados e intemperie',
        'Fuente: [Huawei FusionSolar](https://solar.huawei.com/)',
      ],
      bodyMarkdown: bodyBase(t, brand),
    };
  }

  if (/SUN2000-\d+K-MGL0|SUN2000-\d+KTL-M2|SUN2000-\d+K-MG0|SUN2000-\d+KTL-H0|SUN2000-\d+KTL-H1/i.test(t)) {
    return {
      description:
        'Inversor central / string de gran formato Huawei SUN2000 para plantas de megavatios o grandes comerciales: arquitectura de alta tensión, múltiples MPPT y telemetría con SmartLogger.',
      specifications: [
        'Potencia y número de MPPT según código exacto (80–330 kW u otras referencias)',
        'Interfaz para parque FV de gran escala; requiere ingeniería de interconexión',
        'Protecciones y normativa según manual de campo Huawei',
        'Fuente: [Huawei FusionSolar](https://solar.huawei.com/)',
      ],
      bodyMarkdown: bodyBase(t, brand),
    };
  }

  if (/SMARTLOGGER/i.test(t)) {
    return {
      description:
        'Huawei SmartLogger3000: concentrador de datos y gestión para inversores SUN2000 y periféricos (medidores, optimizadores, baterías), con interfaces según variante (GL/AU/EU).',
      specifications: [
        'Puertos Ethernet, RS485, MBUS según referencia A00GL / A01AU / A03EU',
        'Supervisión remota vía FusionSolar / plataforma Huawei',
        'Alimentación y montaje en carril o pared según manual',
        'Fuente: [Huawei SmartLogger](https://solar.huawei.com/)',
      ],
      bodyMarkdown: bodyBase(t, brand),
    };
  }

  if (/SDONGLE|SMART DONGLE|DONGLE/i.test(t)) {
    return {
      description:
        'Dongle de comunicaciones Huawei para inversores SUN2000: conectividad 4G o Wi‑Fi según referencia, para telemetría remota sin cableado LAN permanente.',
      specifications: [
        'Compatibilidad con modelos SUN2000 indicados en la referencia del dongle',
        'Antena y SIM (si aplica) según variante 4G',
        'Configuración vía aplicación FusionSolar',
        'Fuente: [Huawei](https://solar.huawei.com/)',
      ],
      bodyMarkdown: bodyBase(t, brand),
    };
  }

  if (/LUNA2000/i.test(t)) {
    return {
      description:
        'Módulo o sistema de almacenamiento Huawei LUNA2000 (LiFePO₄, alta tensión según serie): expansión modular, BMS integrado y acoplamiento con inversores Huawei híbridos compatibles.',
      specifications: [
        'Capacidad útil y tensión nominal según código (5/7/10/14/15 kWh u otras variantes)',
        'Química LFP; ciclos y garantía según política Huawei del país',
        'IP66 en módulos de campo; instalación en interior recomendada salvo ficha',
        'Sólo con inversores y firmware admitidos en matriz de compatibilidad',
        'Fuente: [Huawei LUNA2000](https://solar.huawei.com/)',
      ],
      bodyMarkdown: bodyBase(t, brand),
    };
  }

  if (/SMARTGUARD|SMARTPS/i.test(t)) {
    return {
      description:
        'Periférico de protección o alimentación auxiliar Huawei (SmartGuard / SmartPS) para cuadros AC/DC en instalaciones Smart PV según esquema del fabricante.',
      specifications: [
        'Corriente nominal y funciones según referencia (63 A, 80 A, 250 A, etc.)',
        'Integración con SmartLogger e inversores compatibles',
        'Instalación por electricista autorizado',
        'Fuente: [Huawei](https://solar.huawei.com/)',
      ],
      bodyMarkdown: bodyBase(t, brand),
    };
  }

  if (/HUAWEI|SUN2000|OPTIMIZER|MERC-|BACKUP BOX|INVERTER HANDLING|02233/i.test(t) && !/LUNA2000|SMARTLOGGER|SDONGLE|SMART DONGLE|SMARTGUARD|SMARTPS/i.test(t)) {
    return {
      description:
        'Equipo Huawei Smart PV: inversor, optimizador o accesorio de campo para maximizar energía, seguridad y monitorización. Verifique tabla de compatibilidad del fabricante con su inversor y país.',
      specifications: [
        'Parámetros eléctricos según código SUN2000 / MERC / Backup Box / accesorio',
        'Instalación y puesta en servicio sólo personal certificado',
        'Garantía y homologaciones según región Colombia / importador',
        'Fuente: [Huawei FusionSolar](https://solar.huawei.com/)',
      ],
      bodyMarkdown: bodyBase(t, brand),
    };
  }

  /** —— Solis —— */
  if (/^\s*SOLIS\b/i.test(t)) {
    const isMon = /GR1P|EH1P|monof|1P/i.test(u);
    const isHyb = /HIBRIDO|EH\d/i.test(u);
    const isMonit = /MONITOREO|GPRS|EPM|S2-WL|S3-|LOGGER|WLAN|SIMCARD|DLS|METER|CLAMP|CTS/i.test(u);

    if (isMonit) {
      return {
        description:
          'Equipo de monitorización o medida para inversores Solis (logger Wi‑Fi/LAN, EPM, GPRS, medidor + TC, etc.) según referencia exacta.',
        specifications: [
          'Compatibilidad con modelos Solis indicados en manual del accesorio',
          'Red local o nube SolisCloud según dispositivo',
          'Instalación y cableado según guía Solis',
          'Fuente: [Solis](https://www.solisinverters.com/)',
        ],
        bodyMarkdown: bodyBase(t, brand),
      };
    }

    return {
      description: isHyb
        ? 'Inversor híbrido Solis: gestión de energía solar, batería y red con MPPT múltiples, protecciones AFCI (según modelo) y alta eficiencia de conversión.'
        : 'Inversor string on-grid Solis: doble o múltiple MPPT, monitorización y protecciones integradas para instalaciones residenciales, comerciales o grandes según referencia.',
      specifications: [
        `Potencia y número de MPPT según modelo (${t.includes('GC') ? 'trifásico GC' : t.includes('GR3P') ? 'trifásico GR3P' : isMon ? 'monofásico GR1P / S6' : 'según código'})`,
        'Rango de tensión CC y CA según datasheet Solis del SKU',
        'Eficiencia máxima típica 97–98 % en series recientes S5/S6 (orientativo)',
        'Grado IP66 en muchos modelos de campo; rango térmico −25 °C a +60 °C típico',
        'Fuente: [Solis](https://www.solisinverters.com/)',
      ],
      bodyMarkdown: bodyBase(t, brand),
    };
  }

  /** —— Fronius —— */
  if (/FRONIUS/i.test(t)) {
    if (/DATAMANAGER|SENSOR|SMART METER|WIND SPEED|TEMPERATURE/i.test(u)) {
      return {
        description:
          'Sensor o periférico de monitorización Fronius (Datamanager, Smart Meter, sonda térmica/anemómetro) para inversores y Solar.web.',
        specifications: [
          'Compatibilidad con generación de inversores Fronius del proyecto',
          'Conexión RS485 / Ethernet según modelo',
          'Instalación según manual Fronius',
          'Fuente: [Fronius](https://www.fronius.com/)',
        ],
        bodyMarkdown: bodyBase(t, brand),
      };
    }
    return {
      description:
        'Inversor Fronius (Primo, Symo, Tauro): tecnología SnapINverter o plataforma comercial según familia, MPPT múltiples y monitorización Solar.web.',
      specifications: [
        'Potencia y número de MPPT según modelo (monofásico Primo / trifásico Symo / Tauro C&I)',
        'Rango de tensiones CC/CA según ficha del código',
        'Eficiencia europea y máxima según serie',
        'Protecciones y normativa según manual de instalación',
        'Fuente: [Fronius](https://www.fronius.com/)',
      ],
      bodyMarkdown: bodyBase(t, brand),
    };
  }

  /** —— Studer —— */
  if (/STUDER.*XTENDER|XTM/i.test(t)) {
    return {
      description:
        'Inversor-cargador Studer Xtender: onda senoidal pura, carga de baterías y soporte de red o generador según configuración XTM.',
      specifications: [
        'Potencia continua y tensión de batería (48 V en referencias XTM del catálogo)',
        'Cargador integrado; relés y programación avanzada vía RCC/BSP',
        'Instalación profesional obligatoria',
        'Fuente: [Studer Innotec](https://www.studer-innotec.com/)',
      ],
      bodyMarkdown: bodyBase(t, brand),
    };
  }
  if (/STUDER.*MPPT\s+SOLAR/i.test(t)) {
    return {
      description:
        'Controlador solar MPPT Studer serie VT/VS: máximo aprovechamiento de campo FV hacia banco de baterías de 48 V (según modelo).',
      specifications: [
        'Corriente de carga máxima según VT 65 / VT 80 / VS 120',
        'Algoritmo MPPT Studer; protecciones térmicas y de batería',
        'Cableado y seccionado según manual',
        'Fuente: [Studer Innotec](https://www.studer-innotec.com/)',
      ],
      bodyMarkdown: bodyBase(t, brand),
    };
  }
  if (/STUDER/i.test(t)) {
    return {
      description:
        'Equipo Studer Innotec (BSP, RCC, cables): periféricos para supervisión de batería, control remoto o integración de sistema Xtender/MPPT.',
      specifications: [
        'Función según referencia (BSP 500, RCC02, cable RJ45, etc.)',
        'Compatibilidad con familia Xtender / VarioString según manual',
        'Fuente: [Studer Innotec](https://www.studer-innotec.com/)',
      ],
      bodyMarkdown: bodyBase(t, brand),
    };
  }

  /** —— Cables, supresión, TC, conectores —— */
  if (/PROCABLE/i.test(t)) {
    return {
      description:
        'Cable solar Procable para campo FV: conductor de cobre flexible, doble aislamiento y temperatura nominal 90 °C según referencia REF10/REF12 y sección.',
      specifications: [
        'Sección 4 mm² o 6 mm² según código; colores negro/rojo para polaridad',
        'Tensión asignada 1800 V tipo; uso en string DC',
        'Instalación según RETIE / norma local y tablas de corriente',
        'Fuente: fabricante / hoja técnica Procable',
      ],
      bodyMarkdown: bodyBase(t, brand),
    };
  }
  if (/CITEL|SUPRESOR DS50/i.test(t)) {
    return {
      description:
        'Supresor de transitorios Citel DS50PV para protección CC en strings fotovoltaicos contra sobretensiones inducidas por rayo o conmutación.',
      specifications: [
        'Tipo 1+2 / combinado según referencia DS50PVS; tensión máxima continua según variante',
        'Montaje en carril DIN en cuadro CC',
        'Coordenación con puesta a tierra y blindajes',
        'Fuente: [Citel](https://www.citel.us/)',
      ],
      bodyMarkdown: bodyBase(t, brand),
    };
  }
  if (/TRANSFORMADOR DE CORRIENTE|ACCUE|ACUCT/i.test(t)) {
    return {
      description:
        'Transformador de corriente (TC) o núcleo dividido Accuenergy para medición de energía, telemetría o protección en AC o según modelo.',
      specifications: [
        'Relación y rango nominal en amperios según referencia (50–1000 A)',
        'Precisión y fase según hoja Accuenergy',
        'Instalación por electricista; verificar diámetro de bus',
        'Fuente: [Accuenergy](https://www.accuenergy.com/)',
      ],
      bodyMarkdown: bodyBase(t, brand),
    };
  }
  if (/MC4|TE CONNECTIVITY|JUEGO CONECTOR|HERRAMIENTA.*MC4/i.test(t)) {
    return {
      description:
        'Conector o herramienta MC4 homologada (TE Connectivity u OEM equivalente) para interconexión de módulos y cableado solar.',
      specifications: [
        'Corriente y sección de cable admitida según juego / par macho-hembra',
        'Grado de protección IP68 típico en conectores MC4 de calidad industrial',
        'Crimpe con herramienta certificada del fabricante',
        'Fuente: [TE Connectivity](https://www.te.com/)',
      ],
      bodyMarkdown: bodyBase(t, brand),
    };
  }

  /** —— Soluna (packs HV) —— */
  if (/SOLUNA/i.test(t)) {
    return {
      description:
        'Solución de almacenamiento **Soluna** en alto voltaje: packs modulares con BMS integrado y opciones de conectividad (p. ej. Wi‑Fi stick) según referencia, para acoplamiento con inversores homologados por el fabricante.',
      specifications: [
        'Capacidad del pack (6 / 10 / 15 kWh u otras) según código comercial exacto',
        'Química y arquitectura según manual Soluna; expansión y cableado en DC bus',
        'Instalación vertical/pared, ventilación y clearances según ficha',
        'Matriz de compatibilidad sólo con inversores indicados por Soluna',
        'Fuente: documentación Soluna / integrador certificado',
      ],
      bodyMarkdown: bodyBase(t, brand),
    };
  }

  /** —— BYD / Pytes —— */
  if (/PYTES|BYD|ALTAFOX/i.test(t)) {
    return {
      description:
        'Sistema o módulo de almacenamiento en litio (LiFePO₄ típico) para acoplamiento con inversores compatibles; BMS, expansión y cableado según referencia Pytes o BYD.',
      specifications: [
        'Tensión nominal y capacidad en kWh según código (p. ej. 5,12 kWh @ 51,2 V en módulos 48100R)',
        'Corriente de carga/descarga máxima según BMS del modelo',
        'Instalación en vertical/pared según manual; ventilación obligatoria',
        'Sólo con inversores en lista de compatibilidad del fabricante',
        'Fuente: documentación OEM del modelo',
      ],
      bodyMarkdown: bodyBase(t, brand),
    };
  }

  /** —— Abrazaderas TC 3P (Solis / cuadro) —— */
  if (/3P\s*-?\s*3XCT|SOLIS.*CLAMP|SOLIS-3P/i.test(t)) {
    return {
      description:
        'Juego de núcleos o abrazaderas de corriente (CT) para medición trifásica en monitorización Solis o cuadros con medidor externo; rango nominal según amperaje del código.',
      specifications: [
        'Relación y calibre en amperios según referencia (100 A, 300 A, 600 A, etc.)',
        'Instalación alrededor de conductores principales según manual del medidor/logger',
        'Precisión de clase según fabricante del TC',
        'Uso típico con EPM / medidor trifásico Solis u OEM compatible',
        'Fuente: manual Solis / fabricante del TC',
      ],
      bodyMarkdown: bodyBase(t, brand),
    };
  }

  /** —— Default —— */
  const catHint =
    category === 'inversores'
      ? 'Inversor o conversor para aplicaciones fotovoltaicas.'
      : category === 'baterias'
        ? 'Sistema o módulo de almacenamiento de energía.'
        : category === 'controladores'
          ? 'Regulación o carga solar MPPT/PWM según modelo.'
          : 'Componente de balance de sistemas (BOS) para instalaciones fotovoltaicas.';

  return {
    description: `${catHint} Referencia **${t}** (${brand}).`,
    specifications: [
      `Categoría tienda: ${category}`,
      `Marca: ${brand}`,
      'Verifique datasheet del fabricante y normativa RETIE / NTC 2050 antes de instalar.',
      'Incluye gestión de garantía según política del importador.',
    ],
    bodyMarkdown: bodyBase(t, brand),
  };
}
