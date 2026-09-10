import type { APIRoute } from 'astro';

// Número de WhatsApp de destino (Colombia) - Este es el número final donde quieres recibir los mensajes
// IMPORTANTE: Este debe ser el mismo número que usaste para obtener la API key de CallMeBot
const WHATSAPP_NUMBER_COLOMBIA = '573122435627';

// Helper para formatear moneda colombiana
function formatCOP(num?: number): string {
  if (!num) return 'N/A';
  return num.toLocaleString('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  });
}

export const GET: APIRoute = async () => {
  return new Response(
    JSON.stringify({
      ok: false,
      error: 'Usa el método POST para enviar notificaciones.',
    }),
    {
      status: 405,
      headers: {
        'Content-Type': 'application/json',
        'Allow': 'POST',
      },
    }
  );
};

export const POST: APIRoute = async ({ request }) => {
  try {
    // Parsear el body directamente como JSON (igual que el endpoint de precotizacion)
    let body: any;
    try {
      body = await request.json();
      console.log('✅ Body recibido y parseado correctamente');
    } catch (jsonError: any) {
      console.error('❌ Error parseando JSON:', jsonError);
      return new Response(
        JSON.stringify({ 
          ok: false, 
          error: 'Error parseando JSON del request', 
          details: jsonError?.message 
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    const {
      nombre,
      telefono,
      email,
      ciudad,
      consumoMensual,
      tarifa,
      paneles,
      potenciaSistema,
      ahorroMensual,
      ahorroAnual,
      valorSistema,
      anosRecuperacion,
      tir,
    } = body as {
      nombre: string;
      telefono: string;
      email: string;
      ciudad: string;
      consumoMensual?: number;
      tarifa?: number;
      paneles?: number;
      potenciaSistema?: number;
      ahorroMensual?: number;
      ahorroAnual?: number;
      valorSistema?: number;
      anosRecuperacion?: number;
      tir?: number;
    };

    // Validar datos requeridos
    if (!nombre || !telefono || !email || !ciudad) {
      return new Response(
        JSON.stringify({ ok: false, error: 'Datos incompletos' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Construir mensaje para WhatsApp
    let mensaje = `🔋 *NUEVA CONSULTA - CALCULADORA SOLAR*\n\n`;
    mensaje += `*👤 DATOS DEL CLIENTE:*\n`;
    mensaje += `Nombre: ${nombre}\n`;
    mensaje += `Teléfono: ${telefono}\n`;
    mensaje += `Email: ${email}\n`;
    mensaje += `Ciudad: ${ciudad}\n\n`;

    if (consumoMensual !== undefined && consumoMensual !== null) {
      mensaje += `*⚡ CONSUMO:*\n`;
      mensaje += `Consumo mensual: ${Number(consumoMensual).toFixed(1)} kWh/mes\n`;
      if (tarifa !== undefined && tarifa !== null) {
        mensaje += `Tarifa: ${formatCOP(Number(tarifa))}/kWh\n\n`;
      }
    }

    if (paneles !== undefined && paneles !== null && potenciaSistema !== undefined && potenciaSistema !== null) {
      mensaje += `*☀️ SISTEMA SOLAR:*\n`;
      mensaje += `Paneles requeridos: ${paneles}\n`;
      mensaje += `Potencia del sistema: ${Number(potenciaSistema).toFixed(2)} kWp\n\n`;
    }

    if (ahorroMensual !== undefined && ahorroMensual !== null && ahorroAnual !== undefined && ahorroAnual !== null) {
      mensaje += `*💰 AHORRO ESTIMADO:*\n`;
      mensaje += `Ahorro mensual: ${formatCOP(Number(ahorroMensual))}\n`;
      mensaje += `Ahorro anual: ${formatCOP(Number(ahorroAnual))}\n\n`;
    }

    if (valorSistema !== undefined && valorSistema !== null) {
      mensaje += `*💵 INVERSIÓN:*\n`;
      mensaje += `Valor aproximado: ${formatCOP(Number(valorSistema))}\n\n`;
    }

    if (anosRecuperacion !== undefined && anosRecuperacion !== null && isFinite(Number(anosRecuperacion))) {
      mensaje += `*📊 ANÁLISIS FINANCIERO:*\n`;
      mensaje += `Años de recuperación: ${Number(anosRecuperacion).toFixed(1)} años\n`;
      if (tir !== undefined && tir !== null && Number(tir) > 0 && isFinite(Number(tir))) {
        mensaje += `TIR: ${(Number(tir) * 100).toFixed(2)}%\n`;
      }
      mensaje += `\n`;
    }

    mensaje += `_Consulta generada desde la calculadora solar web_`;

    // Intentar enviar usando diferentes métodos
    // Método 1: Usar webhook personalizado (configurar en variables de entorno)
    // Si tienes un webhook de IFTTT, Zapier, o similar, configúralo aquí
    const webhookUrl = import.meta.env.WHATSAPP_WEBHOOK_URL;
    if (webhookUrl) {
      try {
        const response = await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            phone: WHATSAPP_NUMBER_COLOMBIA,
            message: mensaje,
            data: body,
          }),
        });
        if (response.ok) {
          return new Response(
            JSON.stringify({ ok: true, method: 'webhook' }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
          );
        }
      } catch (err) {
        console.error('Error con webhook:', err);
      }
    }

    // Método 2: Usar CallMeBot API (requiere que el número esté registrado en callmebot.com)
    // Registra tu número en https://www.callmebot.com/blog/free-api-whatsapp-messages/
    const callmebotApiKey = import.meta.env.CALLMEBOT_API_KEY;
    console.log('🔑 API Key encontrada:', callmebotApiKey ? 'Sí (longitud: ' + String(callmebotApiKey).length + ')' : 'No');
    
    if (callmebotApiKey && String(callmebotApiKey) !== 'tu_api_key_aqui' && String(callmebotApiKey).trim() !== '') {
      try {
        const apiKeyStr = String(callmebotApiKey);
        // CallMeBot requiere el número de destino (donde quieres recibir el mensaje)
        // IMPORTANTE: El número debe ser el mismo que usaste para obtener la API key
        // Formato: código de país + número sin espacios ni guiones (ej: 573122435627)
        const phoneNumber = WHATSAPP_NUMBER_COLOMBIA.replace(/[^0-9]/g, ''); // Limpiar cualquier carácter no numérico
        const callmebotUrl = `https://api.callmebot.com/whatsapp.php?phone=${phoneNumber}&text=${encodeURIComponent(mensaje)}&apikey=${apiKeyStr}`;
        console.log('📤 Enviando a CallMeBot...');
        console.log('📱 Número destino:', phoneNumber);
        console.log('🔑 API Key:', apiKeyStr.substring(0, 4) + '...' + apiKeyStr.substring(apiKeyStr.length - 4));
        const response = await fetch(callmebotUrl, {
          method: 'GET',
          headers: {
            'User-Agent': 'Mozilla/5.0',
          },
        });
        
        const responseText = await response.text();
        console.log('📥 Respuesta de CallMeBot:', responseText.substring(0, 200));
        
        // CallMeBot puede responder con diferentes mensajes de éxito
        const successIndicators = [
          'Message sent',
          'Message queued',
          'OK',
          'queued'
        ];
        
        const isSuccess = response.ok && successIndicators.some(indicator => 
          responseText.toLowerCase().includes(indicator.toLowerCase())
        );
        
        if (isSuccess) {
          console.log('✅ Mensaje enviado exitosamente a WhatsApp vía CallMeBot');
          return new Response(
            JSON.stringify({ ok: true, method: 'callmebot', message: 'Mensaje en cola, llegará en unos segundos' }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
          );
        } else {
          console.warn('⚠️ CallMeBot respondió pero puede haber un error:', responseText);
        }
      } catch (err: any) {
        console.error('❌ Error con CallMeBot:', err?.message || err);
      }
    }

    // Método 3: Usar Twilio (requiere configuración de API keys)
    // Descomenta y configura si tienes una cuenta de Twilio
    /*
    try {
      const accountSid = process.env.TWILIO_ACCOUNT_SID;
      const authToken = process.env.TWILIO_AUTH_TOKEN;
      const fromNumber = process.env.TWILIO_WHATSAPP_NUMBER; // formato: whatsapp:+14155238886
      
      if (accountSid && authToken && fromNumber) {
        const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
        const response = await fetch(twilioUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            From: fromNumber,
            To: `whatsapp:+${WHATSAPP_NUMBER_COLOMBIA}`,
            Body: mensaje,
          }),
        });

        if (response.ok) {
          return new Response(
            JSON.stringify({ ok: true, method: 'twilio' }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
          );
        }
      }
    } catch (err) {
      console.error('Error con Twilio:', err);
    }
    */

    // Método 3: Usar WhatsApp Business API (requiere configuración compleja)
    // Implementar según tu proveedor de WhatsApp Business API

    // Método 4: Registrar en logs/consola (fallback)
    // Por ahora, solo registramos en consola del servidor
    console.log('=== NUEVA CONSULTA CALCULADORA SOLAR ===');
    console.log(mensaje);
    console.log('==========================================');
    console.log('⚠️ No se configuró ningún servicio de envío. Los datos se registraron en logs.');

    // Retornar éxito (el mensaje se registró en logs)
    // El usuario puede configurar un servicio externo para recibir estos logs
    return new Response(
      JSON.stringify({ 
        ok: true, 
        method: 'log',
        message: 'Datos registrados en servidor. Configura un servicio de WhatsApp para recibir notificaciones automáticas.'
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (err: any) {
    console.error('❌ Error en API de notificación WhatsApp:', err);
    console.error('Stack trace:', err?.stack);
    console.error('Error completo:', JSON.stringify(err, Object.getOwnPropertyNames(err)));
    return new Response(
      JSON.stringify({ 
        ok: false, 
        message: 'Error procesando notificación',
        error: err?.message || 'Error desconocido',
        details: process.env.NODE_ENV === 'development' ? err?.stack : undefined
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

