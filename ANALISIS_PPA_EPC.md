# 📊 ANÁLISIS DETALLADO: MODELOS PPA Y EPC

## 🎯 Objetivo
Analizar las hojas del Excel "Cotizador (2.0).xlsm" para entender:
- **PPA (Power Purchase Agreement)**: Sistema sin inversión monetaria inicial
- **EPC (Engineering, Procurement, Construction)**: Sistema con inversión monetaria total

---

## 📋 HOJAS IDENTIFICADAS RELACIONADAS CON PPA Y EPC

### Hojas PPA encontradas:
1. **PPA Calculos** - Cálculos para modelo PPA
2. **PPA inversionista** - Análisis desde perspectiva del inversionista
3. **PPA Datos Salida** - Resultados del modelo PPA
4. **PPA Flujo de Caja Cliente** - Flujo de caja para el cliente en PPA
5. **PPA Formulario INELCO** - Formulario específico para INELCO
6. **PPA Modalidades** - Diferentes modalidades de PPA

### Hojas EPC:
- El modelo EPC parece estar integrado en las hojas principales:
  - **Datos de Entrada (On Grid)** - Entrada de datos
  - **Calculos (On Grid)** - Cálculos del sistema
  - **Datos de Salida (On grid)** - Resultados y cotización
  - **Flujo de caja** - Análisis financiero con inversión inicial

---

## 🔍 DIFERENCIAS CLAVE ENTRE PPA Y EPC

### EPC (Engineering, Procurement, Construction)
**Características:**
- ✅ Cliente realiza inversión inicial completa
- ✅ Cliente es propietario del sistema
- ✅ Cliente recibe todos los beneficios económicos
- ✅ Cliente asume el riesgo de la inversión
- ✅ Análisis financiero incluye: TIR, VAN, ROI, años de recuperación

**Flujo de datos:**
1. Entrada: Datos del cliente, consumo, tarifa
2. Cálculo: Potencia necesaria, equipos, costos
3. Salida: Cotización con inversión total, ahorro anual, análisis financiero

### PPA (Power Purchase Agreement)
**Características:**
- ✅ **SIN inversión inicial** por parte del cliente
- ✅ Tercero (inversionista) financia el sistema
- ✅ Cliente compra la energía generada a precio fijo
- ✅ Cliente no es propietario del sistema
- ✅ Precio de energía generalmente menor que tarifa de red
- ✅ Contrato a largo plazo (15-25 años)

**Flujo de datos:**
1. Entrada: Datos del cliente, consumo, tarifa actual
2. Cálculo: Potencia necesaria, precio de energía PPA, flujo de caja cliente
3. Salida: Precio por kWh PPA, ahorro vs tarifa actual, flujo de caja

---

## 📊 ESTRUCTURA DE DATOS NECESARIA

### Para EPC (ya implementado parcialmente):
```typescript
interface CotizacionEPC {
  // Datos de entrada
  cliente: DatosCliente;
  consumo: ConsumoMensual[];
  tarifaElectrica: number;
  
  // Cálculos
  potenciaInstalada: number;
  equipos: EquipoSeleccionado[];
  inversionInicial: number; // TOTAL con IVA
  
  // Resultados
  generacionAnual: number;
  ahorroAnual: number;
  analisisFinanciero: {
    tir: number;
    van: number;
    roi: number;
    añosRecuperacion: number;
    flujoCaja: FlujoCaja[];
  };
}
```

### Para PPA (a implementar):
```typescript
interface CotizacionPPA {
  // Datos de entrada
  cliente: DatosCliente;
  consumo: ConsumoMensual[];
  tarifaElectrica: number;
  
  // Parámetros PPA
  duracionContrato: number; // años (típicamente 15-25)
  precioEnergiaPPA: number; // $/kWh (precio fijo)
  escalamientoAnual?: number; // % de incremento anual
  
  // Cálculos
  potenciaInstalada: number;
  generacionAnual: number;
  
  // Resultados
  costoAnualPPA: number; // generacionAnual * precioEnergiaPPA
  ahorroAnual: number; // vs tarifa actual
  flujoCajaCliente: FlujoCajaPPA[];
  // NO hay inversión inicial para el cliente
}
```

---

## 🔄 FLUJOS DE CÁLCULO

### EPC (Modelo Actual - Parcialmente Implementado):
```
Entrada → Cálculo Potencia → Selección Equipos → Cotización → Análisis Financiero
```

### PPA (A Implementar):
```
Entrada → Cálculo Potencia → Cálculo Precio PPA → Flujo de Caja Cliente → Comparativa
```

---

## 📝 PRÓXIMOS PASOS

1. **Analizar hojas PPA específicas** para extraer fórmulas y lógica
2. **Implementar selector de modelo** (EPC vs PPA) en el formulario
3. **Crear módulo de cálculos PPA** en `src/lib/cotizador/ppa.ts`
4. **Actualizar interfaz** para mostrar resultados según modelo seleccionado
5. **Implementar comparativa** entre ambos modelos

---

## ⚠️ NOTAS IMPORTANTES

- **PPA** requiere análisis desde dos perspectivas:
  - Cliente: Ahorro en factura eléctrica
  - Inversionista: Retorno de inversión
  
- **EPC** ya tiene análisis financiero implementado, pero necesita validación contra Excel

- Las hojas de **Referencias**, **Histórico**, **Precios** son auxiliares y no generan resultados directos

