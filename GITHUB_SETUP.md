# Guía para conectar con GitHub

## Paso 1: Instalar Git
1. Descarga Git desde: https://git-scm.com/download/win
2. Instala Git con las opciones por defecto
3. Reinicia tu terminal después de instalar

## Paso 2: Configurar Git (solo la primera vez)
```bash
git config --global user.name "Tu Nombre"
git config --global user.email "tu-email@ejemplo.com"
```

## Paso 3: Inicializar el repositorio
```bash
git init
git add .
git commit -m "Initial commit"
```

## Paso 4: Crear repositorio en GitHub
1. Ve a https://github.com y crea una cuenta (si no tienes una)
2. Haz clic en el botón "+" en la esquina superior derecha
3. Selecciona "New repository"
4. Dale un nombre a tu repositorio (ej: `reikinew`)
5. **NO** inicialices con README, .gitignore o licencia (ya los tienes)
6. Haz clic en "Create repository"

## Paso 5: Conectar con GitHub
Después de crear el repositorio, GitHub te mostrará comandos. Usa estos:

```bash
git remote add origin https://github.com/TU_USUARIO/TU_REPOSITORIO.git
git branch -M main
git push -u origin main
```

Reemplaza `TU_USUARIO` y `TU_REPOSITORIO` con tus datos reales.

## Paso 6: Configurar GitHub Pages (Opcional)
Si quieres desplegar tu sitio en GitHub Pages, sigue estos pasos adicionales:

1. Edita `astro.config.mjs` y agrega:
```javascript
export default defineConfig({
  site: 'https://TU_USUARIO.github.io/TU_REPOSITORIO/',
  base: '/TU_REPOSITORIO/',
});
```

2. Crea el archivo `.github/workflows/deploy.yml` con el contenido del workflow de GitHub Actions.

