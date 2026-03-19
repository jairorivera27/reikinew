# Configuración para Producción - reikisolar.com.co/OKR

## Configuración del Servidor Web

Para que la plataforma funcione en `reikisolar.com.co/OKR`, necesitas configurar tu servidor web (Apache o Nginx).

### Opción 1: Apache con .htaccess

Si usas Apache, crea un archivo `.htaccess` en la raíz de tu sitio web:

```apache
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /OKR/
  
  # Redirigir todas las solicitudes a Next.js
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule ^(.*)$ /OKR/$1 [L]
</IfModule>
```

### Opción 2: Nginx

Si usas Nginx, configura un proxy reverso:

```nginx
location /OKR {
    proxy_pass http://localhost:3000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_cache_bypass $http_upgrade;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

### Opción 3: Subdirectorio con Next.js Standalone

1. **Construir para producción:**
```bash
cd apps/web
npm run build
```

2. **Iniciar el servidor:**
```bash
npm run start
```

3. **Configurar el servidor web** para que apunte a `localhost:3000` con el path `/OKR`

## Variables de Entorno

Crea un archivo `.env.production` en `apps/web/`:

```env
NEXT_PUBLIC_API_URL=https://reikisolar.com.co
```

Y en `apps/api/.env.production`:

```env
DATABASE_URL="postgresql://usuario:password@localhost:5432/reiki_okr?schema=public"
JWT_SECRET="tu-clave-secreta-super-segura-aqui"
JWT_EXPIRES_IN="7d"
PORT=4000
FRONTEND_URL="https://reikisolar.com.co"
GOOGLE_SERVICE_ACCOUNT_KEY_FILE="/ruta/al/archivo.json"
```

## Backend API

El backend debe estar accesible en:
- `https://reikisolar.com.co/api` (mismo dominio)
- O `https://api.reikisolar.com.co` (subdominio)

Ajusta `NEXT_PUBLIC_API_URL` según tu configuración.

## Despliegue

### 1. Construir Frontend
```bash
cd apps/web
npm run build
```

### 2. Construir Backend
```bash
cd apps/api
npm run build
```

### 3. Iniciar Servicios

**Backend:**
```bash
cd apps/api
npm run start:prod
```

**Frontend:**
```bash
cd apps/web
npm run start
```

O usa PM2 para mantener los procesos corriendo:

```bash
pm2 start apps/api/dist/main.js --name "reiki-api"
pm2 start apps/web/.next/standalone/server.js --name "reiki-web"
```

## Verificación

Una vez desplegado, verifica:
- ✅ https://reikisolar.com.co/OKR - Debe mostrar la página de login
- ✅ https://reikisolar.com.co/api/health - Debe responder `{"status":"ok"}`



