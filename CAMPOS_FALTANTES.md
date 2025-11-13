# 📋 CAMPOS FALTANTES EN EL FORMULARIO

## Análisis comparativo: Excel vs Formulario Actual

### ✅ CAMPOS QUE YA ESTÁN EN EL FORMULARIO

#### Datos del Cliente:
- ✅ Nombre
- ✅ NIT/Cédula
- ✅ Email
- ✅ Teléfono
- ✅ Dirección
- ✅ Departamento
- ✅ Ciudad
- ✅ Tipo de Cliente

#### Datos del Sistema:
- ✅ Tipo de Sistema (On-Grid, Off-Grid, Híbrido)
- ✅ Modelo de Negocio (EPC, PPA)
- ✅ Consumo Mensual Promedio
- ✅ Consumos Mensuales (12 meses)
- ✅ Tarifa Eléctrica
- ✅ % Autoconsumo
- ✅ Tarifa Venta Excedentes
- ✅ Tipo de Cubierta/Montaje

---

### ❌ CAMPOS FALTANTES - ON-GRID

#### Datos del Cliente:
- ❌ **Apellidos** (separado de Nombre)
- ❌ **Proyecto** (nombre del proyecto)

#### Ubicación del Proyecto:
- ❌ **Estación meteorológica** (ciudad de referencia para datos de radiación)
- ❌ **Kms del proyecto a Medellín** (para calcular sobrecargo por lejanía)
- ❌ **Sobrecargo por lejanía** (Ida y regreso / Solo ida / No)

#### Variables Financieras:
- ❌ **TRM Dólar** (Tasa Representativa del Mercado)
- ❌ **Financiación** (Si/No)
- ❌ **Entidad Financiera** (si aplica financiación)
- ❌ **Descuento** (porcentaje)

#### Configuración del Sistema:
- ❌ **Costo kWh base** (tarifa base antes de contribución)
- ❌ **¿Contribución?** (Si/No - afecta el costo total por kWh)
- ❌ **¿Venta de excedentes?** (Si/No)
- ❌ **Comisión adicional o descuento** (valor)
- ❌ **Beneficios de la ley 1715** (Si/No)
- ❌ **Estudio de conexión** (Si/No)
- ❌ **¿Requiere contador bidireccional?** (Si/No)
- ❌ **Porcentaje de autonomía** (para sistemas híbridos)

#### Instalación:
- ❌ **¿Requiere ANDAMIOS?** (Si/No)
- ❌ **Metraje de andamio [m]** (si requiere andamios)
- ❌ **Eficiencia Con Respecto al Óptimo** (factor de eficiencia, default 0.97)
- ❌ **Pólizas** (Si/No)
- ❌ **Valor u obras adicionales** (COP)
- ❌ **SST** (Seguridad y Salud en el Trabajo - Si/No)
- ❌ **Cableado Distancia DC [m]** (metros de cable DC)
- ❌ **Cableado Distancia AC [m]** (metros de cable AC)
- ❌ **Calibre alimentador** (para Off-Grid)

#### Configuración del Proyecto:
- ❌ **% del consumo que desea ahorrar** (default 1 = 100%)

---

### ❌ CAMPOS FALTANTES - OFF-GRID

#### Datos del Proyecto:
- ❌ **Proyecto** (nombre del proyecto)
- ❌ **Est. meteorológica** (ciudad de referencia)
- ❌ **Area disponible [m²]** (área disponible para paneles)
- ❌ **Presupuesto** (presupuesto disponible)
- ❌ **Tipo de proyecto** (Proyecto completo / Parcial)

#### Variables Financieras:
- ❌ **TRM** (Tasa Representativa del Mercado)
- ❌ **Descuento** (porcentaje)
- ❌ **Viáticos** (Si/No)
- ❌ **Vigencia (días)** (vigencia de la cotización)

#### Configuración del Sistema:
- ❌ **Tipo Batería** (Litio / Plomo-ácido / Gel / AGM)
- ❌ **Voltaje del sistema cc** (12V, 24V, 48V)
- ❌ **Días de autonomía** (días sin sol)
- ❌ **Limite de descarga** (profundidad de descarga - 0.9 para Litio, 0.5 para Plomo)
- ❌ **Eficiencia de la batería** (0.95 para Litio, 0.9 para Plomo)
- ❌ **Eficiencia del inversor** (default 0.93)
- ❌ **SD en Paneles** (factor de seguridad - default 0.5)
- ❌ **Factor Simultaneidad** (default 0.8)

#### Instalación:
- ❌ **Metraje aproximado de cable requerido AC [m]**
- ❌ **Metraje aproximado de cable Solar requerido DC [m]**
- ❌ **Numero de controladores** (calculado o manual)
- ❌ **Calibre alimentador**
- ❌ **Sobrecargo por lejanía** (Ida y regreso / Solo ida / No)
- ❌ **Kms del proyecto a Medellín**

#### Equipos (ya implementado dinámicamente):
- ✅ Cargas individuales con:
  - Cantidad
  - Tipo de carga (CA/CC)
  - Voltaje
  - Potencia Unit [W]
  - Horas/día
  - Días/semana
  - Factor de potencia

---

## 🎯 PRIORIDAD DE IMPLEMENTACIÓN

### Alta Prioridad (afectan cálculos):
1. TRM Dólar
2. Costo kWh base
3. ¿Contribución? (afecta costo total por kWh)
4. ¿Venta de excedentes?
5. Beneficios de la ley 1715
6. Eficiencia Con Respecto al Óptimo
7. Tipo Batería (Off-Grid)
8. Voltaje del sistema cc (Off-Grid)
9. Días de autonomía (Off-Grid)
10. Limite de descarga (Off-Grid)
11. Eficiencia de la batería (Off-Grid)
12. Eficiencia del inversor (Off-Grid)

### Media Prioridad (afectan costos):
1. Descuento
2. Kms del proyecto a Medellín
3. Sobrecargo por lejanía
4. ¿Requiere ANDAMIOS?
5. Metraje de andamio
6. Cableado Distancia (DC y AC)
7. Pólizas
8. SST
9. Valor u obras adicionales
10. Viáticos (Off-Grid)
11. Vigencia (Off-Grid)

### Baja Prioridad (información adicional):
1. Apellidos
2. Proyecto (nombre)
3. Estación meteorológica
4. Financiación
5. Entidad Financiera
6. Estudio de conexión
7. ¿Requiere contador bidireccional?
8. Porcentaje de autonomía (On-Grid)
9. % del consumo que desea ahorrar
10. Area disponible [m²] (Off-Grid)
11. Presupuesto (Off-Grid)
12. Tipo de proyecto (Off-Grid)
13. Calibre alimentador (Off-Grid)
14. Factor Simultaneidad (Off-Grid)
15. SD en Paneles (Off-Grid)

