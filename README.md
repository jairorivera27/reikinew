# Reiki Energía Solar - Sitio Web

Sitio web para Reiki Energía Solar construido con Astro.

## 🚀 Características

- **Header responsive** con logo y navegación
- **Diseño moderno** con color corporativo #6b2181
- **Totalmente responsive** para todos los dispositivos
- **Navegación suave** entre secciones

## 📁 Estructura del Proyecto

```
/
├── public/
│   └── logo_blanco.png          # Logo de la empresa
├── src/
│   ├── components/
│   │   └── Header.astro         # Componente de navegación
│   └── pages/
│       └── index.astro          # Página principal
├── astro.config.mjs
├── package.json
└── tsconfig.json
```

## 🛠️ Instalación y Uso

1. **Instalar dependencias:**
   ```bash
   npm install
   ```

2. **Copiar el logo:**
   - Copia tu archivo `logo_blanco.png` a la carpeta `public/`

3. **Ejecutar en desarrollo:**
   ```bash
   npm run dev
   ```

4. **Construir para producción:**
   ```bash
   npm run build
   ```

## 🎨 Componentes

### Header.astro
- Logo de la empresa (lado izquierdo)
- Navegación con enlaces: Quienes somos, Servicios, Blog, Contacto
- Menú hamburguesa para dispositivos móviles
- Color de fondo: #6b2181
- Totalmente responsive

## 📱 Responsive Design

El header se adapta a diferentes tamaños de pantalla:
- **Desktop:** Navegación horizontal con logo a la izquierda
- **Tablet:** Navegación optimizada para pantallas medianas
- **Mobile:** Menú hamburguesa desplegable

## 🚀 Comandos Disponibles

| Comando                | Acción                                           |
| :--------------------- | :----------------------------------------------- |
| `npm install`         | Instala las dependencias                         |
| `npm run dev`         | Inicia el servidor de desarrollo en `localhost:4321` |
| `npm run build`       | Construye el sitio para producción en `./dist/` |
| `npm run preview`     | Previsualiza la construcción localmente         |
