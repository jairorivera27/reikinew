# Solución al Error de Login

## Problema
El error al iniciar sesión ocurre porque **el backend no está corriendo** o no está accesible.

## Solución Paso a Paso

### 1. Verificar que ambos servidores estén corriendo

Necesitas **DOS ventanas de PowerShell** abiertas:

#### Ventana 1: Backend (Puerto 4000)
```powershell
cd "C:\Users\core i5\Desktop\REIKINEW\apps\api"
npm run start:dev
```

**Espera a ver este mensaje:**
```
🚀 API corriendo en http://localhost:4000/api
```

#### Ventana 2: Frontend (Puerto 3000)
```powershell
cd "C:\Users\core i5\Desktop\REIKINEW\apps\web"
npm run dev
```

**Espera a ver este mensaje:**
```
✓ Ready in Xs
○ Local: http://localhost:3000
```

### 2. Verificar que todo funciona

Abre tu navegador y verifica:

1. **Backend:** http://localhost:4000/api/health
   - Debe mostrar: `{"status":"ok","timestamp":"..."}`

2. **Frontend:** http://localhost:3000
   - Debe mostrar la página de login

### 3. Credenciales de Acceso

**Email:** `admin@reikisolar.com.co`  
**Contraseña:** `admin123`

### 4. Si el backend no inicia

Si ves errores en la ventana del backend, verifica:

1. **Prisma Client generado:**
   ```powershell
   cd "C:\Users\core i5\Desktop\REIKINEW\apps\api"
   npm run prisma:generate
   ```

2. **Base de datos existe:**
   ```powershell
   cd "C:\Users\core i5\Desktop\REIKINEW\apps\api"
   npm run prisma:push
   ```

3. **Usuario admin existe:**
   ```powershell
   cd "C:\Users\core i5\Desktop\REIKINEW\apps\api"
   npm run prisma:seed
   ```

### 5. Script Automático

También puedes usar el script `INICIAR_SIMPLE.ps1` que inicia ambos servidores automáticamente:

```powershell
.\INICIAR_SIMPLE.ps1
```

Este script abrirá dos ventanas de PowerShell, una para cada servidor.

## Errores Comunes

### Error: "No es posible conectar con el servidor remoto"
- **Causa:** El backend no está corriendo
- **Solución:** Inicia el backend en una ventana de PowerShell separada

### Error: "Credenciales inválidas"
- **Causa:** El usuario no existe en la base de datos
- **Solución:** Ejecuta `npm run prisma:seed` en la carpeta `apps/api`

### Error: "Puerto 4000 ya está en uso"
- **Causa:** Ya hay un proceso usando el puerto 4000
- **Solución:** Cierra la ventana de PowerShell del backend anterior o detén el proceso

## Verificación Final

Una vez que ambos servidores estén corriendo:

1. ✅ Backend responde en http://localhost:4000/api/health
2. ✅ Frontend responde en http://localhost:3000
3. ✅ Puedes hacer login con las credenciales

Si todo está correcto, deberías poder iniciar sesión sin problemas.



