# 🔧 Guía para Configurar Git

## Paso 1: Verificar que Git está instalado

Abre una **nueva terminal de PowerShell** y ejecuta:

```powershell
git --version
```

Si ves algo como `git version 2.xx.x`, Git está instalado correctamente. ✅

Si ves un error, necesitas:
1. Instalar Git desde: https://git-scm.com/download/win
2. **Reiniciar la terminal** después de instalar
3. Verificar de nuevo con `git --version`

---

## Paso 2: Configurar tu identidad en Git

Git necesita saber quién eres para asociar tus commits. Configura tu nombre y email:

```powershell
git config --global user.name "Tu Nombre Completo"
git config --global user.email "tu-email@ejemplo.com"
```

### Ejemplo:
```powershell
git config --global user.name "Juan Pérez"
git config --global user.email "juan.perez@gmail.com"
```

**⚠️ Importante:**
- Usa el **mismo email** que usas en tu cuenta de GitHub
- El nombre puede ser tu nombre real o tu usuario de GitHub
- Estos datos se guardan globalmente y se usarán en todos tus repositorios

---

## Paso 3: Verificar la configuración

Para verificar que se configuró correctamente:

```powershell
git config --global user.name
git config --global user.email
```

Deberías ver el nombre y email que acabas de configurar.

---

## Paso 4: Configuraciones adicionales recomendadas (Opcional)

### Configurar el editor por defecto
Si prefieres usar otro editor para los mensajes de commit:

```powershell
# Para VS Code
git config --global core.editor "code --wait"

# Para Notepad++
git config --global core.editor "'C:/Program Files/Notepad++/notepad++.exe' -multiInst -notabbar -nosession -noPlugin"
```

### Configurar la rama principal como "main"
```powershell
git config --global init.defaultBranch main
```

### Configurar colores en la terminal
```powershell
git config --global color.ui auto
```

### Ver todas tus configuraciones
```powershell
git config --global --list
```

---

## Paso 5: Configurar autenticación con GitHub

Para poder subir código a GitHub, necesitas autenticarte. Tienes dos opciones:

### Opción A: Personal Access Token (Recomendado)

1. Ve a GitHub: https://github.com/settings/tokens
2. Haz clic en **"Generate new token"** → **"Generate new token (classic)"**
3. Dale un nombre (ej: "Mi PC")
4. Selecciona los permisos:
   - ✅ `repo` (acceso completo a repositorios)
5. Haz clic en **"Generate token"**
6. **Copia el token** (solo lo verás una vez)
7. Cuando hagas `git push`, usa:
   - **Usuario:** tu usuario de GitHub
   - **Contraseña:** el token que copiaste

### Opción B: GitHub CLI (Más fácil)

1. Instala GitHub CLI: https://cli.github.com/
2. Ejecuta:
```powershell
gh auth login
```
3. Sigue las instrucciones en pantalla

---

## ✅ Verificación completa

Ejecuta este comando para ver toda tu configuración:

```powershell
git config --global --list
```

Deberías ver al menos:
- `user.name=Tu Nombre`
- `user.email=tu-email@ejemplo.com`

---

## 🚀 Siguiente paso

Una vez configurado Git, puedes:

1. **Inicializar tu repositorio:**
   ```powershell
   git init
   git add .
   git commit -m "Initial commit"
   ```

2. **O usar el script automático:**
   ```powershell
   .\setup-github.ps1
   ```

---

## ❓ Solución de problemas

### Error: "git no se reconoce como comando"
- **Solución:** Reinicia la terminal o reinstala Git asegurándote de marcar "Add Git to PATH"

### Error: "fatal: unable to auto-detect email address"
- **Solución:** Ejecuta los comandos de configuración del Paso 2

### Error de autenticación al hacer push
- **Solución:** Necesitas un Personal Access Token (ver Paso 5)

---

¡Listo! Con estos pasos tendrás Git completamente configurado. 🎉


