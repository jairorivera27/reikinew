# Guía para conectar con GitHub

## 📋 Resumen rápido

1. **Instalar Git** (si no lo tienes)
2. **Configurar Git** con tu nombre y email
3. **Inicializar el repositorio** local
4. **Crear repositorio en GitHub**
5. **Conectar y subir** tu código

---

## Paso 1: Instalar Git

Si Git no está instalado en tu sistema:

1. Descarga Git desde: **https://git-scm.com/download/win**
2. Ejecuta el instalador y usa las opciones por defecto
3. **Reinicia tu terminal** (cierra y abre PowerShell de nuevo)

### Verificar instalación
Abre PowerShell y ejecuta:
```powershell
git --version
```

Si ves una versión (ej: `git version 2.xx.x`), Git está instalado correctamente.

---

## Paso 2: Configurar Git (solo la primera vez)

Configura tu identidad en Git (esto solo necesitas hacerlo una vez):

```powershell
git config --global user.name "Tu Nombre"
git config --global user.email "tu-email@ejemplo.com"
```

**Importante:** Usa el mismo email que usas en GitHub.

---

## Paso 3: Inicializar el repositorio local

En la carpeta de tu proyecto (`reikinew`), ejecuta:

```powershell
# Inicializar repositorio Git
git init

# Agregar todos los archivos
git add .

# Crear el primer commit
git commit -m "Initial commit: Proyecto Reiki Energía Solar"
```

---

## Paso 4: Crear repositorio en GitHub

1. Ve a **https://github.com** e inicia sesión (o crea una cuenta)
2. Haz clic en el botón **"+"** en la esquina superior derecha
3. Selecciona **"New repository"**
4. Configura el repositorio:
   - **Nombre:** `reikinew` (o el que prefieras)
   - **Descripción:** (opcional)
   - **Visibilidad:** Público o Privado
   - ⚠️ **NO marques** "Add a README file", "Add .gitignore", ni "Choose a license" (ya tienes estos archivos)
5. Haz clic en **"Create repository"**

---

## Paso 5: Conectar con GitHub

Después de crear el repositorio, GitHub te mostrará una página con instrucciones. Usa estos comandos:

```powershell
# Agregar el repositorio remoto (reemplaza TU_USUARIO y TU_REPOSITORIO)
git remote add origin https://github.com/TU_USUARIO/TU_REPOSITORIO.git

# Renombrar la rama principal a 'main'
git branch -M main

# Subir tu código a GitHub
git push -u origin main
```

**Ejemplo:**
Si tu usuario es `juanperez` y tu repositorio es `reikinew`:
```powershell
git remote add origin https://github.com/juanperez/reikinew.git
git branch -M main
git push -u origin main
```

GitHub te pedirá autenticación. Puedes usar:
- **Personal Access Token** (recomendado) - [Cómo crear uno](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/creating-a-personal-access-token)
- **GitHub CLI** (`gh auth login`)

---

## 🚀 Método alternativo: Usar el script automático

Si prefieres automatizar el proceso, puedes usar el script incluido:

```powershell
.\setup-github.ps1
```

Este script:
- ✅ Verifica si Git está instalado
- ✅ Configura tu nombre y email
- ✅ Inicializa el repositorio
- ✅ Crea el commit inicial
- ✅ Te ayuda a conectar con GitHub

**Nota:** Necesitas tener Git instalado antes de ejecutar el script.

---

## Paso 6: Configurar GitHub Pages (Opcional)

Si quieres desplegar tu sitio en GitHub Pages:

1. Edita `astro.config.mjs` y agrega:
```javascript
export default defineConfig({
  site: 'https://TU_USUARIO.github.io/TU_REPOSITORIO/',
  base: '/TU_REPOSITORIO/',
});
```

2. Crea el archivo `.github/workflows/deploy.yml` con el workflow de GitHub Actions.

---

## 🔄 Comandos útiles para el futuro

```powershell
# Ver el estado de tus archivos
git status

# Agregar cambios
git add .

# Crear un commit
git commit -m "Descripción de los cambios"

# Subir cambios a GitHub
git push

# Ver el repositorio remoto configurado
git remote -v
```

---

## ❓ Solución de problemas

### Error: "git no se reconoce como comando"
- Git no está instalado o no está en el PATH
- Reinstala Git y reinicia la terminal

### Error: "remote origin already exists"
- Ya tienes un remoto configurado
- Para cambiarlo: `git remote set-url origin NUEVA_URL`

### Error de autenticación al hacer push
- Necesitas un Personal Access Token
- Ve a: GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
- Crea un token con permisos `repo`
- Úsalo como contraseña cuando Git te lo pida

---

¡Listo! Tu proyecto ya está conectado con GitHub. 🎉


