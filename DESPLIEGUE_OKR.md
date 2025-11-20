# 🚀 Despliegue en reikisolar.com.co/OKR

## Configuración para Producción

### 1. Variables de Entorno

**Frontend (`apps/web/.env.production`):**
```env
NEXT_PUBLIC_BASE_PATH=/OKR
NEXT_PUBLIC_API_URL=https://reikisolar.com.co
NODE_ENV=production
```

**Backend (`apps/api/.env.production`):**
```env
DATABASE_URL="postgresql://usuario:password@localhost:5432/reiki_okr?schema=public"
JWT_SECRET="tu-clave-secreta-super-segura-aqui"
JWT_EXPIRES_IN="7d"
PORT=4000
FRONTEND_URL="https://reikisolar.com.co"
GOOGLE_SERVICE_ACCOUNT_KEY_FILE="/ruta/al/archivo.json"
```

### 2. Construir para Producción

**Frontend:**
```bash
cd apps/web
npm run build
```

**Backend:**
```bash
cd apps/api
npm run build
```

### 3. Configuración del Servidor Web

#### Opción A: Apache

Crea un archivo `.htaccess` en la raíz de tu sitio:

```apache
<IfModule mod_rewrite.c>
  RewriteEngine On
  
  # Redirigir /OKR a la aplicación Next.js
  RewriteRule ^OKR/(.*)$ http://localhost:3000/OKR/$1 [P,L]
  
  # Redirigir /api a la API NestJS
  RewriteRule ^api/(.*)$ http://localhost:4000/api/$1 [P,L]
</IfModule>
```

#### Opción B: Nginx

```nginx
# Frontend Next.js en /OKR
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

# Backend API en /api
location /api {
    proxy_pass http://localhost:4000;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

### 4. Iniciar Servicios

**Usando PM2 (recomendado):**

```bash
# Instalar PM2 globalmente
npm install -g pm2

# Iniciar Backend
cd apps/api
pm2 start dist/main.js --name "reiki-api"

# Iniciar Frontend
cd apps/web
pm2 start npm --name "reiki-web" -- start

# Guardar configuración
pm2 save
pm2 startup
```

**O manualmente:**

```bash
# Terminal 1 - Backend
cd apps/api
npm run start:prod

# Terminal 2 - Frontend
cd apps/web
npm run start
```

### 5. Verificación

Una vez desplegado, verifica:

- ✅ https://reikisolar.com.co/OKR - Página de login
- ✅ https://reikisolar.com.co/api/health - `{"status":"ok"}`

### 6. Probar Localmente con /OKR

Para probar localmente con el subdirectorio:

```bash
cd apps/web
# Crear .env.local
echo "NEXT_PUBLIC_BASE_PATH=/OKR" > .env.local
echo "NEXT_PUBLIC_API_URL=http://localhost:4000" >> .env.local

npm run dev
```

Luego accede a: http://localhost:3000/OKR

## Notas Importantes

1. **Base Path**: Next.js manejará automáticamente todas las rutas con el prefijo `/OKR`
2. **API**: Asegúrate de que el backend esté accesible en el mismo dominio o configura CORS correctamente
3. **Assets**: Todos los assets (CSS, JS, imágenes) se cargarán desde `/OKR/_next/...`
4. **Rutas**: Todas las rutas internas de Next.js funcionarán automáticamente con el basePath

## Solución de Problemas

### Las rutas no funcionan
- Verifica que `NEXT_PUBLIC_BASE_PATH=/OKR` esté configurado
- Reconstruye la aplicación: `npm run build`

### Los assets no cargan
- Verifica que `assetPrefix` esté configurado en `next.config.js`
- Revisa la consola del navegador para ver las rutas de los assets

### La API no responde
- Verifica que el backend esté corriendo en el puerto 4000
- Revisa la configuración del proxy en el servidor web
- Verifica CORS en el backend

