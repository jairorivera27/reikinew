# Generación de PDFs - Precotización

## 📄 Descripción

La calculadora solar incluye funcionalidad para generar PDFs de precotización automáticamente cuando el usuario completa un cálculo.

## 🔧 Implementación Actual

Actualmente, la API (`src/pages/api/precotizacion.ts`) devuelve una URL temporal. Para implementar la generación real de PDFs, sigue estos pasos:

## 📦 Instalación de Dependencias

Para generar PDFs reales, instala `pdfkit`:

```bash
npm install pdfkit
npm install --save-dev @types/pdfkit
```

## 🚀 Implementación Completa

### Opción 1: Generar PDF en memoria y devolver como base64

```typescript
import type { APIRoute } from 'astro';
import PDFDocument from 'pdfkit';

export const POST: APIRoute = async ({ request }) => {
  const body = await request.json();
  
  // Crear documento PDF
  const doc = new PDFDocument();
  const buffers: Buffer[] = [];
  
  doc.on('data', buffers.push.bind(buffers));
  
  // Contenido del PDF
  doc.fontSize(20).text('Precotización de Sistema Solar', { align: 'center' });
  doc.moveDown();
  doc.fontSize(12);
  doc.text(`Cliente: ${body.nombre}`);
  doc.text(`Teléfono: ${body.telefono}`);
  doc.text(`Email: ${body.email}`);
  doc.text(`Ciudad: ${body.ciudad}`);
  doc.moveDown();
  doc.text(`Paneles requeridos: ${body.paneles}`);
  doc.text(`Potencia del sistema: ${body.potenciaSistema.toFixed(2)} kW`);
  // ... más contenido
  
  doc.end();
  
  // Esperar a que termine la generación
  await new Promise((resolve) => {
    doc.on('end', resolve);
  });
  
  const pdfBuffer = Buffer.concat(buffers);
  const base64 = pdfBuffer.toString('base64');
  
  return new Response(
    JSON.stringify({ 
      url: `data:application/pdf;base64,${base64}`,
      base64: base64
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  );
};
```

### Opción 2: Subir PDF a almacenamiento (S3, Cloudinary, etc.)

```typescript
import type { APIRoute } from 'astro';
import PDFDocument from 'pdfkit';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

export const POST: APIRoute = async ({ request }) => {
  const body = await request.json();
  
  // Generar PDF
  const doc = new PDFDocument();
  const buffers: Buffer[] = [];
  
  doc.on('data', buffers.push.bind(buffers));
  // ... contenido del PDF
  doc.end();
  
  await new Promise((resolve) => {
    doc.on('end', resolve);
  });
  
  const pdfBuffer = Buffer.concat(buffers);
  const pdfId = `precotizacion-${Date.now()}.pdf`;
  
  // Subir a S3
  const s3Client = new S3Client({ region: 'us-east-1' });
  await s3Client.send(new PutObjectCommand({
    Bucket: 'tu-bucket',
    Key: `pdfs/${pdfId}`,
    Body: pdfBuffer,
    ContentType: 'application/pdf',
  }));
  
  const pdfUrl = `https://tu-bucket.s3.amazonaws.com/pdfs/${pdfId}`;
  
  return new Response(
    JSON.stringify({ url: pdfUrl }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  );
};
```

## 📝 Notas

- La implementación actual devuelve una URL temporal que debe ser reemplazada
- Para producción, considera usar un servicio de almacenamiento en la nube
- Los PDFs pueden incluir logos, gráficos y más información detallada
- Considera agregar un sistema de caché para evitar regenerar PDFs idénticos

