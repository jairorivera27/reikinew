/**
 * Apps Script para LEADS_WEBHOOK_URL → Google Sheets.
 *
 * Cómo publicar:
 * 1. Crea una hoja "Leads" (o usa la activa) con encabezados en la fila 1:
 *    fecha_bogota | tipo | nombre | ciudad | celular | identificador | resumen | intencion | aviso_ok | source | raw
 * 2. Extensiones → Apps Script → pega este código completo.
 * 3. Implementar → Nueva implementación → Tipo: aplicación web.
 *    - Ejecutar como: Yo
 *    - Quién tiene acceso: Cualquiera
 * 4. Copia la URL de la app web y ponla en Vercel como LEADS_WEBHOOK_URL.
 * 5. Prueba con un POST JSON (o un lead real del bot).
 */

function doPost(e) {
  try {
    var data = {};
    if (e && e.postData && e.postData.contents) {
      data = JSON.parse(e.postData.contents);
    }
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName('Leads') || ss.getActiveSheet();
    if (sheet.getLastRow() === 0) {
      sheet.appendRow([
        'fecha_bogota',
        'tipo',
        'nombre',
        'ciudad',
        'celular',
        'identificador',
        'resumen',
        'intencion',
        'aviso_ok',
        'source',
        'raw',
      ]);
    }
    sheet.appendRow([
      data.fecha_bogota || new Date().toISOString(),
      data.tipo || '',
      data.nombre || '',
      data.ciudad || '',
      data.celular || '',
      data.identificador || '',
      data.resumen || data.necesidad || '',
      data.intencion || '',
      data.aviso_ok === true || data.aviso_ok === 'true' ? 'sí' : '',
      data.source || 'whatsapp',
      JSON.stringify(data).slice(0, 2000),
    ]);
    return ContentService.createTextOutput(JSON.stringify({ ok: true })).setMimeType(
      ContentService.MimeType.JSON
    );
  } catch (err) {
    return ContentService.createTextOutput(
      JSON.stringify({ ok: false, error: String(err) })
    ).setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet() {
  return ContentService.createTextOutput(
    JSON.stringify({ ok: true, service: 'reiki-leads-webhook' })
  ).setMimeType(ContentService.MimeType.JSON);
}
