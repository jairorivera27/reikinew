import type { APIRoute } from 'astro';

// Helper para formatear moneda colombiana
function formatCOP(num?: number): string {
  if (!num) return 'N/A';
  return num.toLocaleString('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  });
}

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const {
      nombre,
      telefono,
      email,
      ciudad,
      paneles,
      potenciaSistema,
      ahorroMensual,
      ahorroAnual,
      valorSistema,
    } = body as {
      nombre: string;
      telefono: string;
      email: string;
      ciudad: string;
      paneles: number;
      potenciaSistema: number;
      ahorroMensual: number;
      ahorroAnual: number;
      valorSistema: number;
    };

    // Validar datos requeridos
    if (!nombre || !telefono || !email || !ciudad) {
      return new Response(
        JSON.stringify({ ok: false, error: 'Datos incompletos' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Intentar cargar pdfkit solo cuando se llama la ruta
    let PDFDocument: any;
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      PDFDocument = require('pdfkit');
    } catch (err) {
      // Si no está instalado, no tumbamos el sitio
      return new Response(
        JSON.stringify({
          ok: false,
          message:
            'pdfkit no está instalado en el servidor. Instálalo con: npm install pdfkit @types/pdfkit',
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Crear documento PDF
    const doc = new PDFDocument({ margin: 40 });
    const chunks: Buffer[] = [];

    doc.on('data', (chunk: Buffer) => chunks.push(chunk));

    // Promesa para esperar a que termine la generación
    const pdfPromise = new Promise<Buffer>((resolve, reject) => {
      doc.on('end', () => {
        const pdfBuffer = Buffer.concat(chunks);
        resolve(pdfBuffer);
      });
      doc.on('error', reject);
    });

    // Contenido del PDF
    doc.fontSize(16).text('PRECOTIZACIÓN SISTEMA SOLAR FOTOVOLTAICO', { align: 'center' });
    doc.moveDown();

    doc.fontSize(12).text(`Cliente: ${nombre || 'N/A'}`);
    doc.text(`Teléfono: ${telefono || 'N/A'}`);
    doc.text(`Correo: ${email || 'N/A'}`);
    doc.text(`Ciudad: ${ciudad || 'N/A'}`);
    doc.moveDown();

    doc.text('Datos del sistema:', { underline: true });
    doc.text(`N° de paneles estimados: ${paneles}`);
    doc.text(`Potencia del sistema: ${potenciaSistema?.toFixed(2)} kWp`);
    doc.text(`Ahorro mensual estimado: ${formatCOP(ahorroMensual)}`);
    doc.text(`Ahorro anual estimado: ${formatCOP(ahorroAnual)}`);
    doc.text(`Valor aproximado del sistema: ${formatCOP(valorSistema)}`);
    doc.moveDown();

    doc
      .fillColor('red')
      .text(
        'Esto es un estimado aproximado, no es valor exacto y real del valor del sistema, para obtenerlo contacta con un asesor.',
        { align: 'left' }
      );

    doc.end();

    // Esperar a que termine la generación
    const pdfBuffer = await pdfPromise;

    // Convertir a base64
    const base64 = pdfBuffer.toString('base64');

    return new Response(
      JSON.stringify({
        ok: true,
        filename: 'precotizacion.pdf',
        base64,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (err) {
    console.error('Error en API de precotización:', err);
    return new Response(
      JSON.stringify({ ok: false, message: 'Error generando PDF' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

