# 🔧 Solución Completa - Credenciales de Acceso

## Credenciales por Defecto

**Email:** `admin@reikisolar.com.co`  
**Contraseña:** `admin123`

## Si el usuario no existe

### Opción 1: Crear usuario con el script

Ejecuta en PowerShell:

```powershell
cd "C:\Users\core i5\Desktop\REIKINEW"
.\CREAR_USUARIO.ps1
```

### Opción 2: Crear usuario manualmente con curl

```powershell
curl -X POST http://localhost:4000/api/auth/register `
  -H "Content-Type: application/json" `
  -d '{\"email\":\"admin@reikisolar.com.co\",\"password\":\"admin123\",\"name\":\"Administrador\"}'
```

### Opción 3: Usar Prisma Studio (interfaz visual)

1. Abre una terminal en `apps\api`
2. Ejecuta: `npm run prisma:studio`
3. Se abrirá una interfaz web
4. Ve a la tabla `User` y crea un nuevo usuario
5. Luego ve a `Role` y crea los roles necesarios
6. Finalmente, en `UserRole` asocia el usuario con un rol

## Pasos para Iniciar Sesión

1. **Asegúrate de que los servidores estén corriendo:**
   - Backend en puerto 4000
   - Frontend en puerto 3000

2. **Abre tu navegador y ve a:**
   - http://localhost:3000/login

3. **Ingresa las credenciales:**
   - Email: `admin@reikisolar.com.co`
   - Contraseña: `admin123`

4. **Si no funciona, verifica:**
   - Que el backend esté corriendo (revisa la ventana de PowerShell)
   - Que no haya errores en la consola del navegador (F12)
   - Que la base de datos esté creada

## Verificar que todo funciona

1. **Backend:** http://localhost:4000/api/health
   - Debe responder: `{"status":"ok","timestamp":"..."}`

2. **Frontend:** http://localhost:3000
   - Debe mostrar la página de login

## Si hay problemas

1. **Revisa las ventanas de PowerShell** que se abrieron al iniciar
2. **Verifica errores** en la consola del navegador (F12)
3. **Ejecuta el diagnóstico:**
   ```powershell
   .\DIAGNOSTICO.ps1
   ```



