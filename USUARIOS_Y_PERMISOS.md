# 👥 Usuarios y Sistema de Permisos

## 📋 Usuarios Creados

### 1. Administrador (Acceso Total)
- **Email:** `admin@reikisolar.com.co`
- **Contraseña:** `admin123`
- **Rol:** ADMIN
- **Permisos:** 
  - ✅ Puede ver TODOS los OKR de todas las áreas
  - ✅ Puede crear, editar y eliminar OKR de cualquier área
  - ✅ Acceso completo a toda la plataforma

### 2. Usuario Comercial
- **Email:** `comercial@reikisolar.com.co`
- **Contraseña:** `comercial123`
- **Rol:** COMERCIAL
- **Permisos:**
  - ✅ Solo puede ver OKR del área COMERCIAL
  - ✅ Solo puede crear OKR del área COMERCIAL
  - ✅ Solo puede editar/eliminar OKR del área COMERCIAL
  - ❌ No puede ver OKR de otras áreas

### 3. Usuario Marketing
- **Email:** `marketing@reikisolar.com.co`
- **Contraseña:** `marketing123`
- **Rol:** MARKETING
- **Permisos:**
  - ✅ Solo puede ver OKR del área MARKETING
  - ✅ Solo puede crear OKR del área MARKETING
  - ✅ Solo puede editar/eliminar OKR del área MARKETING
  - ❌ No puede ver OKR de otras áreas

### 4. Director Administrativo
- **Email:** `dir.admon@reikisolar.com.co`
- **Contraseña:** `admin123`
- **Rol:** ADMINISTRATIVO
- **Permisos:**
  - ✅ Solo puede ver OKR del área ADMINISTRATIVO
  - ✅ Solo puede crear OKR del área ADMINISTRATIVO
  - ✅ Solo puede editar/eliminar OKR del área ADMINISTRATIVO
  - ❌ No puede ver OKR de otras áreas

---

## 🔒 Sistema de Permisos Implementado

### Filtrado Automático por Área

El sistema filtra automáticamente los OKR según el rol del usuario:

1. **ADMIN:** Ve todos los OKR sin restricciones
2. **COMERCIAL:** Solo ve OKR con `area = "COMERCIAL"`
3. **MARKETING:** Solo ve OKR con `area = "MARKETING"`
4. **ADMINISTRATIVO:** Solo ve OKR con `area = "ADMINISTRATIVO"`
5. **DIRECCION:** Solo ve OKR con `area = "DIRECCION"`

### Endpoints Protegidos

Los siguientes endpoints aplican el filtrado automático:

- `GET /api/okr` - Lista de OKR (filtrada por área)
- `GET /api/okr/dashboard` - Métricas del dashboard (filtradas por área)
- `GET /api/okr/:id` - Detalle de OKR (verifica que pertenezca al área del usuario)
- `POST /api/okr` - Crear OKR (fuerza el área según el rol)
- `PATCH /api/okr/:id` - Editar OKR (verifica permisos)
- `DELETE /api/okr/:id` - Eliminar OKR (verifica permisos)

### Comportamiento

#### Para usuarios NO-ADMIN:
- Si intentan ver un OKR de otra área → **Error 403 Forbidden**
- Si intentan crear un OKR de otra área → El sistema automáticamente lo asigna a su área
- Si intentan editar/eliminar un OKR de otra área → **Error 403 Forbidden**

#### Para ADMIN:
- Puede ver, crear, editar y eliminar OKR de cualquier área
- No hay restricciones

---

## 🧪 Cómo Probar

### 1. Login como Comercial
```bash
POST http://localhost:4000/api/auth/login
{
  "email": "comercial@reikisolar.com.co",
  "password": "comercial123"
}
```

### 2. Listar OKR (solo verá OKR de COMERCIAL)
```bash
GET http://localhost:4000/api/okr
Authorization: Bearer <token>
```

### 3. Intentar ver OKR de otra área (debe fallar)
```bash
GET http://localhost:4000/api/okr/<id-de-okr-marketing>
Authorization: Bearer <token>
# Respuesta: 403 Forbidden
```

### 4. Crear OKR (se asignará automáticamente a COMERCIAL)
```bash
POST http://localhost:4000/api/okr
Authorization: Bearer <token>
{
  "title": "Mi OKR Comercial",
  "area": "MARKETING",  // ← Esto será ignorado, se asignará COMERCIAL
  "period": "TRIMESTRAL",
  "ownerId": "<user-id>"
}
```

---

## 📝 Notas Técnicas

### Mapeo de Roles a Áreas

El sistema mapea automáticamente los roles a áreas:

```typescript
const roleToArea = {
  COMERCIAL: "COMERCIAL",
  MARKETING: "MARKETING",
  ADMINISTRATIVO: "ADMINISTRATIVO",
  DIRECCION: "DIRECCION",
};
```

### Implementación

El filtrado se implementa en:
- **Archivo:** `apps/api/src/okr/okr.controller.ts`
- **Método:** `getUserArea()` - Determina el área del usuario según sus roles
- **Aplicación:** Se aplica en todos los métodos del controlador

---

## 🔄 Actualizar Usuarios

Para agregar más usuarios o cambiar permisos, edita:
- **Archivo:** `apps/api/prisma/seed.ts`
- **Ejecutar:** `npm run prisma:seed`

---

## ⚠️ Importante

- Los usuarios NO-ADMIN **no pueden** ver OKR de otras áreas, incluso si conocen el ID
- El sistema **fuerza** el área al crear OKR según el rol del usuario
- Solo **ADMIN** tiene acceso completo a toda la plataforma
- Los permisos se validan en cada petición usando el JWT token


