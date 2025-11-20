# Configuración de URL: reikisolar.com.co/OKR

## 📋 Configuración Actual

La plataforma está configurada para funcionar en la URL: **`reikisolar.com.co/OKR`**

## ⚙️ Configuración de Next.js

El archivo `apps/web/next.config.js` está configurado con:
- **basePath**: `/OKR` (siempre activo)
- **assetPrefix**: `/OKR` (para assets estáticos)

## 🔧 Variables de Entorno

### Desarrollo Local
Para probar localmente con el basePath `/OKR`, crear un archivo `.env.local` en `apps/web/`:

```env
NEXT_PUBLIC_BASE_PATH=/OKR
NEXT_PUBLIC_API_URL=http://localhost:4000
```

### Producción
En producción, las variables de entorno deben estar configuradas:

```env
NEXT_PUBLIC_BASE_PATH=/OKR
NEXT_PUBLIC_API_URL=https://reikisolar.com.co
NODE_ENV=production
```

## 🌐 Configuración del Servidor Web

### Apache (.htaccess)

Si usas Apache, necesitas crear un archivo `.htaccess` en la raíz del dominio o en el directorio `/OKR`:

```apache
# Configuración para Next.js en subdirectorio /OKR
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /OKR/
  
  # Redirigir todas las solicitudes a Next.js
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule ^(.*)$ /OKR/$1 [L]
</IfModule>
```

### Nginx

Si usas Nginx, configuración de ejemplo:

```nginx
location /OKR {
    alias /ruta/a/tu/app/web/.next/standalone;
    try_files $uri $uri/ /OKR/index.html;
    
    # Proxy para API si está en el mismo servidor
    location /OKR/api {
        proxy_pass http://localhost:4000/api;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## 🚀 Despliegue

### 1. Build de Producción

```bash
cd apps/web
npm run build
```

Esto generará una carpeta `.next` con la aplicación optimizada.

### 2. Estructura de Carpetas en el Servidor

```
/var/www/reikisolar.com.co/
├── OKR/                    # Aplicación Next.js
│   ├── .next/
│   ├── public/
│   ├── package.json
│   └── server.js
└── api/                    # Backend NestJS (opcional, puede estar en otro servidor)
    └── ...
```

### 3. Iniciar la Aplicación

```bash
cd /var/www/reikisolar.com.co/OKR
npm start
```

O usando PM2:

```bash
pm2 start npm --name "reiki-okr" -- start
```

## 🔗 Rutas de la Aplicación

Con el basePath `/OKR`, todas las rutas serán:

- **Login**: `reikisolar.com.co/OKR/login`
- **Dashboard**: `reikisolar.com.co/OKR/dashboard`
- **OKR**: `reikisolar.com.co/OKR/okr`
- **CRM**: `reikisolar.com.co/OKR/crm`
- **Marketing**: `reikisolar.com.co/OKR/marketing`
- **Admin**: `reikisolar.com.co/OKR/admin`

## 📝 Notas Importantes

1. **Next.js maneja automáticamente el basePath** en componentes `Link` y `router.push()`
2. **Para redirecciones con `window.location.href`**, usar el helper `getBasePath()` o la variable `NEXT_PUBLIC_BASE_PATH`
3. **Los assets estáticos** (CSS, JS, imágenes) se servirán desde `/OKR/_next/...`
4. **La API** puede estar en el mismo dominio (`reikisolar.com.co/api`) o en un subdominio (`api.reikisolar.com.co`)

## 🧪 Pruebas Locales

Para probar localmente con el basePath:

```bash
cd apps/web
NEXT_PUBLIC_BASE_PATH=/OKR npm run dev
```

Luego acceder a: `http://localhost:3000/OKR`

## ✅ Verificación

Después del despliegue, verificar:

1. ✅ La aplicación carga en `reikisolar.com.co/OKR`
2. ✅ Las rutas internas funcionan correctamente
3. ✅ Los assets (CSS, JS) se cargan correctamente
4. ✅ La API responde correctamente
5. ✅ El login redirige correctamente después de autenticación

