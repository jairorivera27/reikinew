# Módulo de Feedback - Implementación Completa

## 📋 Descripción

Se ha implementado un módulo completo de feedback que permite a los usuarios enviar retroalimentación sobre diferentes procesos y áreas de la plataforma. El módulo incluye control de acceso basado en roles, donde solo el administrador puede ver todos los feedbacks y cada usuario solo puede ver los feedbacks dirigidos a él.

## 🔐 Control de Acceso

### Permisos de Visualización:
- **Administrador (ADMIN)**: Puede ver todos los feedbacks del sistema
- **Usuario Destinatario**: Solo puede ver los feedbacks dirigidos a él
- **Usuario Creador**: Puede ver los feedbacks que él creó

### Permisos de Edición:
- **Administrador (ADMIN)**: Puede actualizar cualquier feedback
- **Usuario Destinatario**: Puede responder y actualizar el estado de los feedbacks dirigidos a él
- **Usuario Creador**: Puede eliminar los feedbacks que él creó

## 📊 Estructura del Feedback

### Campos del Modelo:
- **id**: Identificador único
- **process**: Proceso sobre el cual se realiza el feedback (OKR, CRM, COTIZACIONES, CONTRATOS, MARKETING, ADMINISTRATIVO, RECURSOS_HUMANOS, FINANZAS, OPERACIONES, OTRO)
- **area**: Área relacionada (COMERCIAL, MARKETING, ADMINISTRATIVO, DIRECCION, OPERACIONES)
- **title**: Título del feedback
- **content**: Contenido detallado del feedback
- **status**: Estado del feedback (PENDIENTE, EN_REVISION, RESUELTO, CERRADO)
- **createdById**: Usuario que crea el feedback
- **recipientId**: Usuario destinatario del feedback
- **response**: Respuesta del destinatario (opcional)
- **respondedAt**: Fecha de respuesta (se actualiza automáticamente cuando el destinatario responde)
- **createdAt**: Fecha de creación
- **updatedAt**: Fecha de última actualización

## 🚀 Endpoints de la API

### Crear Feedback
```
POST /feedback
```
**Body:**
```json
{
  "process": "CRM",
  "area": "COMERCIAL",
  "title": "Mejora en el proceso de cotizaciones",
  "content": "Sugerencia para mejorar el tiempo de respuesta...",
  "status": "PENDIENTE",
  "recipientId": "user-id-here"
}
```

### Listar Feedbacks
```
GET /feedback
```
- **Admin**: Retorna todos los feedbacks
- **Usuario**: Retorna solo los feedbacks donde es destinatario

### Obtener Feedback Específico
```
GET /feedback/:id
```
- Solo admin o destinatario pueden acceder

### Actualizar Feedback
```
PATCH /feedback/:id
```
**Body:**
```json
{
  "status": "EN_REVISION",
  "response": "Gracias por tu feedback, estamos trabajando en ello..."
}
```
- Si el destinatario responde por primera vez, se actualiza automáticamente `respondedAt`

### Eliminar Feedback
```
DELETE /feedback/:id
```
- Solo admin o creador pueden eliminar

### Métricas de Feedback (Solo Admin)
```
GET /feedback/metrics?area=COMERCIAL
```
Retorna:
- Total de feedbacks
- Feedbacks pendientes
- Feedbacks resueltos
- Distribución por estado
- Distribución por proceso

## 📈 Estados del Feedback

1. **PENDIENTE**: Feedback creado, esperando revisión
2. **EN_REVISION**: Feedback en proceso de revisión/resolución
3. **RESUELTO**: Feedback resuelto
4. **CERRADO**: Feedback cerrado (no requiere más acción)

## 🔄 Flujo de Trabajo

1. **Creación**: Cualquier usuario puede crear un feedback dirigido a otro usuario
2. **Notificación**: El destinatario recibe el feedback (se puede implementar notificación por email)
3. **Revisión**: El destinatario puede cambiar el estado a "EN_REVISION"
4. **Respuesta**: El destinatario puede responder al feedback
5. **Resolución**: El destinatario marca como "RESUELTO" cuando se ha atendido
6. **Cierre**: Se puede cerrar el feedback cuando ya no requiere más acción

## 📝 Ejemplos de Uso

### Ejemplo 1: Feedback sobre proceso de OKR
```json
{
  "process": "OKR",
  "area": "COMERCIAL",
  "title": "Dificultad para actualizar progreso de OKR",
  "content": "El proceso de actualización de OKR es confuso, sugiero mejorar la interfaz...",
  "recipientId": "admin-user-id"
}
```

### Ejemplo 2: Feedback sobre CRM
```json
{
  "process": "CRM",
  "area": "COMERCIAL",
  "title": "Sugerencia de mejora en pipeline",
  "content": "Sería útil agregar más filtros en la vista de Kanban...",
  "recipientId": "comercial-manager-id"
}
```

## 🎯 Beneficios

1. **Comunicación Estructurada**: Feedback organizado por proceso y área
2. **Trazabilidad**: Historial completo de feedbacks y respuestas
3. **Mejora Continua**: Permite identificar áreas de mejora en los procesos
4. **Control de Acceso**: Solo las personas relevantes pueden ver cada feedback
5. **Métricas**: Dashboard para administradores con estadísticas de feedbacks

## 🔮 Próximas Mejoras Sugeridas

1. **Notificaciones**: Enviar email cuando se crea un feedback dirigido al usuario
2. **Adjuntos**: Permitir adjuntar archivos a los feedbacks
3. **Etiquetas**: Sistema de etiquetas para categorizar feedbacks
4. **Prioridad**: Niveles de prioridad (Baja, Media, Alta, Crítica)
5. **Dashboard Visual**: Gráficas y visualizaciones de métricas de feedback
6. **Integración con OKR**: Vincular feedbacks con OKRs específicos


