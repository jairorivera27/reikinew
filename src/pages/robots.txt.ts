import type { APIRoute } from 'astro';

/**
 * robots.txt — indexación web + señalización para crawlers de IA.
 */
const site = 'https://reikisolar.com.co';

export const GET: APIRoute = () => {
  const robotsTxt = `User-agent: *
Allow: /

# APIs y assets de build
Disallow: /api/
Disallow: /_astro/

# Crawlers de IA / respuestas generativas (permitidos)
User-agent: GPTBot
Allow: /

User-agent: ChatGPT-User
Allow: /

User-agent: Google-Extended
Allow: /

User-agent: anthropic-ai
Allow: /

User-agent: ClaudeBot
Allow: /

User-agent: PerplexityBot
Allow: /

User-agent: Bytespider
Allow: /

# Mapas para buscadores e IAs
Sitemap: ${site}/sitemap.xml
# Entidad para modelos de lenguaje: ${site}/llms.txt
`;

  return new Response(robotsTxt, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
};
