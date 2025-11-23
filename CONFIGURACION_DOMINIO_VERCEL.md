# 🌐 Configuración del Dominio reikisolar.com.co en Vercel

## 📋 Situación Actual

- **Dominio configurado en código**: `reikisolar.com.co` (en `astro.config.mjs`)
- **Dominio de Vercel**: `reikinew.vercel.app`
- **Estado**: El dominio personalizado `reikisolar.com.co` necesita conectarse a Vercel

## ✅ Pasos para Conectar reikisolar.com.co a Vercel

### 1. Configurar el Dominio en Vercel

1. **Ve a tu proyecto en Vercel**:
   - https://vercel.com/alexander-rivera-s-projects/reikinew/settings/domains

2. **Agrega el dominio personalizado**:
   - Haz clic en **"Add Domain"** o **"Add"**
   - Ingresa: `reikisolar.com.co`
   - Haz clic en **"Add"**

3. **Vercel te mostrará los registros DNS necesarios**:
   - Un registro **A** o **CNAME** que apunta a Vercel
   - Anota estos valores (los necesitarás en el paso siguiente)

### 2. Configurar DNS en tu Proveedor de Dominio

Necesitas configurar los registros DNS en donde compraste el dominio `reikisolar.com.co` (GoDaddy, Namecheap, etc.).

#### Opción A: Usar CNAME (Recomendado)

Si Vercel te da un CNAME, configura:

```
Tipo: CNAME
Nombre: @ (o reikisolar.com.co)
Valor: cname.vercel-dns.com (o el valor que Vercel te proporcione)
TTL: 3600 (o el valor por defecto)
```

#### Opción B: Usar Registros A

Si Vercel te da direcciones IP, configura:

```
Tipo: A
Nombre: @ (o reikisolar.com.co)
Valor: 76.76.21.21 (o la IP que Vercel te proporcione)
TTL: 3600
```

**Nota**: Vercel puede darte múltiples IPs. Configura todas las que te proporcione.

### 3. Verificar la Configuración

1. **En Vercel**:
   - Ve a **Settings → Domains**
   - Verás el estado del dominio:
     - 🟡 **Pending**: Esperando verificación DNS
     - 🟢 **Valid**: Dominio configurado correctamente
     - 🔴 **Invalid**: Error en la configuración DNS

2. **Tiempo de propagación**:
   - Los cambios DNS pueden tardar de 5 minutos a 48 horas
   - Generalmente toma 1-2 horas

3. **Verificar manualmente**:
   ```bash
   # Verificar el registro DNS
   nslookup reikisolar.com.co
   
   # O usar dig (Linux/Mac)
   dig reikisolar.com.co
   ```

### 4. Configurar SSL/HTTPS

Vercel configura automáticamente SSL/HTTPS para dominios personalizados:
- Espera a que el dominio esté **Valid** en Vercel
- Vercel emitirá automáticamente un certificado SSL
- Esto puede tardar unos minutos después de que el dominio esté validado

## 🔧 Configuración Adicional

### Configurar Subdominios (Opcional)

Si también quieres usar subdominios:

1. **www.reikisolar.com.co**:
   - Agrega `www.reikisolar.com.co` en Vercel
   - Configura un CNAME en DNS: `www` → `cname.vercel-dns.com`
   - Vercel redirigirá automáticamente `www` a la versión sin `www`

2. **api.reikisolar.com.co** (para la API):
   - Si despliegas la API en Vercel, agrega este subdominio
   - O mantén la API en servidor propio y configura DNS en tu servidor

### Redirecciones

Vercel puede configurar redirecciones automáticas:
- `www.reikisolar.com.co` → `reikisolar.com.co`
- `http://` → `https://` (automático)

## 📝 Verificación Final

Una vez configurado, verifica:

1. ✅ **Dominio principal**: https://reikisolar.com.co
2. ✅ **SSL funcionando**: El candado verde en el navegador
3. ✅ **Sitio carga correctamente**: Muestra el landing de Astro
4. ✅ **Sin errores de certificado**: HTTPS funciona sin advertencias

## 🐛 Solución de Problemas

### Error: "Domain not configured"

**Causa**: El DNS no está apuntando a Vercel.

**Solución**:
1. Verifica que los registros DNS estén configurados correctamente
2. Espera a que se propague (puede tardar hasta 48 horas)
3. Verifica con `nslookup` o `dig` que el DNS apunta a Vercel

### Error: "SSL Certificate pending"

**Causa**: Vercel está generando el certificado SSL.

**Solución**:
- Espera 5-10 minutos
- Vercel emitirá automáticamente el certificado
- Si tarda más de 1 hora, verifica que el dominio esté **Valid** en Vercel

### Error: "Domain already in use"

**Causa**: El dominio ya está configurado en otro proyecto de Vercel.

**Solución**:
1. Ve al otro proyecto en Vercel
2. Elimina el dominio de ese proyecto
3. Agrega el dominio al proyecto correcto

### El sitio no carga después de configurar DNS

**Causa**: DNS aún no se ha propagado o hay error en la configuración.

**Solución**:
1. Verifica con `nslookup reikisolar.com.co` que el DNS apunta a Vercel
2. Espera más tiempo (hasta 48 horas)
3. Verifica en Vercel que el dominio esté **Valid**
4. Limpia la caché DNS: `ipconfig /flushdns` (Windows) o `sudo dscacheutil -flushcache` (Mac)

## 🔗 URLs Esperadas Después de Configurar

- **Sitio Principal**: https://reikisolar.com.co
- **Plataforma OKR/CRM**: https://reikisolar.com.co/OKR (si se despliega en servidor propio)
- **API**: https://reikisolar.com.co/api (si se despliega en servidor propio)

## 📚 Referencias

- [Documentación de Vercel - Custom Domains](https://vercel.com/docs/concepts/projects/domains)
- [Documentación de Vercel - DNS Configuration](https://vercel.com/docs/concepts/projects/domains/add-a-domain)

---

## ✅ Checklist de Configuración

- [ ] Dominio agregado en Vercel (Settings → Domains)
- [ ] Registros DNS configurados en el proveedor de dominio
- [ ] Dominio muestra estado **Valid** en Vercel
- [ ] SSL/HTTPS funcionando (candado verde)
- [ ] Sitio carga correctamente en https://reikisolar.com.co
- [ ] Redirección www configurada (opcional)

