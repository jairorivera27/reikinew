/**
 * Headers de seguridad para las respuestas
 */

export const securityHeaders = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'Content-Security-Policy': [
    "default-src 'self'",
    // Wompi checkout widget + Font Awesome kit/jsDelivr
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net https://kit.fontawesome.com https://checkout.wompi.co https://cdnjs.cloudflare.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net https://cdnjs.cloudflare.com https://checkout.wompi.co",
    "font-src 'self' data: https://fonts.gstatic.com https://cdn.jsdelivr.net https://cdnjs.cloudflare.com",
    "img-src 'self' data: https:",
    // CallMeBot / WhatsApp notify + Wompi APIs used by widget and integrity endpoint clients
    "connect-src 'self' https://api.callmebot.com https://api.whatsapp.com https://api.wompi.co https://checkout.wompi.co https://production.wompi.co https://sandbox.wompi.co",
    "frame-src 'self' https://checkout.wompi.co https://api.wompi.co",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self' https://checkout.wompi.co",
  ].join('; '),
};

