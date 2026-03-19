# 📦 Guía de Instalación Completa - REIKINEW

## 🔍 Resumen del Proyecto

Este es un proyecto web construido con **Astro** y **React** para Reiki Energía Solar.

### Tecnologías utilizadas:
- **Astro** ^4.0.0 - Framework web moderno
- **React** ^19.2.0 - Biblioteca de UI
- **TypeScript** - Tipado estático
- **PDFKit** - Generación de PDFs
- **XLSX** - Procesamiento de archivos Excel

---

## ✅ Requisitos Previos

### 1. Node.js (OBLIGATORIO)

**Node.js NO está instalado actualmente en tu sistema.**

#### Opción A: Instalación Manual (Recomendado)

1. **Descargar Node.js LTS:**
   - Ve a: https://nodejs.org/
   - Descarga la versión **LTS (Long Term Support)** para Windows
   - Archivo: `node-v24.x.x-x64.msi` (o la versión más reciente)

2. **Instalar:**
   - Ejecuta el archivo `.msi` descargado
   - Sigue el asistente de instalación
   - Acepta todas las opciones por defecto
   - ✅ **Asegúrate de marcar "Add to PATH"** durante la instalación

3. **Verificar instalación:**
   ```powershell
   node --version
   npm --version
   ```
   Deberías ver versiones como `v24.x.x` y `10.x.x`

#### Opción B: Instalación con Winget

```powershell
winget install OpenJS.NodeJS.LTS
```

**Después de instalar, CIERRA Y REABRE PowerShell** para que los cambios surtan efecto.

---

## 🚀 Pasos de Instalación

### Paso 1: Navegar al directorio del proyecto

```powershell
cd C:\Users\core i5\Desktop\REIKINEW
```

### Paso 2: Instalar dependencias

```powershell
npm install
```

Este comando instalará todas las dependencias necesarias:
- Astro y sus plugins
- React y React DOM
- TypeScript y tipos
- PDFKit y XLSX
- Todas las dependencias transitivas

**Tiempo estimado:** 2-5 minutos dependiendo de tu conexión a internet.

### Paso 3: Verificar la instalación

```powershell
npm list --depth=0
```

Deberías ver todas las dependencias listadas.

---

## 🛠️ Comandos Disponibles

Una vez instalado, puedes usar estos comandos:

### Desarrollo
```powershell
npm run dev
# o
npm start
```
Inicia el servidor de desarrollo en `http://localhost:4321`

### Construcción
```powershell
npm run build
```
Construye el proyecto para producción en la carpeta `dist/`

### Vista Previa
```powershell
npm run preview
```
Previsualiza la versión de producción localmente

---

## 📁 Estructura del Proyecto

```
REIKINEW/
├── public/              # Archivos estáticos (imágenes, videos, PDFs)
├── src/
│   ├── components/      # Componentes Astro y React
│   ├── content/         # Contenido (blog, productos, servicios)
│   ├── layouts/         # Plantillas de página
│   ├── lib/             # Utilidades y lógica de negocio
│   └── pages/           # Páginas del sitio
├── astro.config.mjs     # Configuración de Astro
├── package.json         # Dependencias y scripts
└── tsconfig.json        # Configuración de TypeScript
```

---

## 🔧 Configuración Adicional

### Variables de Entorno (si es necesario)

Si el proyecto requiere variables de entorno, crea un archivo `.env` en la raíz:

```env
PUBLIC_SITE_URL=https://reikisolar.com.co
```

### Configuración de Git

El repositorio ya está conectado a GitHub:
- **Remoto:** `https://github.com/jairorivera27/REIKINEW.git`
- **Rama:** `main`

---

## ❓ Solución de Problemas

### Error: "node no se reconoce como comando"
- **Solución:** Node.js no está instalado o no está en el PATH
- Reinstala Node.js y reinicia PowerShell

### Error: "npm no se reconoce como comando"
- **Solución:** npm viene con Node.js, reinstala Node.js

### Error: "EACCES" o permisos
- **Solución:** Ejecuta PowerShell como Administrador

### Error al instalar dependencias
- **Solución:** 
  ```powershell
  npm cache clean --force
  npm install
  ```

### Puerto 4321 ya está en uso
- **Solución:** Cierra otras aplicaciones que usen ese puerto o cambia el puerto:
  ```powershell
  npm run dev -- --port 3000
  ```

---

## 📚 Recursos Adicionales

- **Documentación de Astro:** https://docs.astro.build
- **Documentación de React:** https://react.dev
- **Node.js:** https://nodejs.org/docs

---

## ✅ Checklist de Instalación

- [ ] Node.js instalado y verificado
- [ ] npm funcionando correctamente
- [ ] Dependencias instaladas (`npm install`)
- [ ] Servidor de desarrollo funcionando (`npm run dev`)
- [ ] Proyecto accesible en `http://localhost:4321`

---

**¡Listo para desarrollar! 🎉**

