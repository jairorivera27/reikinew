/**
 * Quick smoke: Autosolar Pylontech UF5000 + Solaire Huawei SUN2000
 */
import { spawnSync } from 'node:child_process';

// inline test by importing logic is hard; duplicate minimal calls
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

async function fetchHtml(url) {
  const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'text/html' } });
  if (!res.ok) throw new Error(String(res.status));
  return res.text();
}

async function searchAutosolar(query) {
  const url = `https://autosolar.co/?s=${encodeURIComponent(query)}&post_type=product`;
  const html = await fetchHtml(url);
  const hrefs = [...html.matchAll(/href="([^"]+)"/gi)].map((m) => m[1]);
  return [
    ...new Set(
      hrefs
        .map((u) => u.split('?')[0].replace(/\/$/, ''))
        .filter((u) => /^https?:\/\/(?:www\.)?autosolar\.co\/[a-z0-9-]+\/[a-z0-9-]+$/i.test(u))
        .filter((u) => !/kit|fabricantes|account|blog|cart/i.test(u))
    ),
  ].slice(0, 8);
}

async function loadAuto(productUrl) {
  const html = await fetchHtml(productUrl);
  const title = (html.match(/<title>([^|<]+)/i) || [])[1]?.trim() || '';
  const imgs = [
    ...new Set(
      [...html.matchAll(/https?:\/\/(?:cdn\.)?autosolar\.co\/images\/[^"'\\\s>]+\.(?:png|jpe?g|webp)/gi)]
        .map((m) =>
          m[0]
            .replace(/-thumb2x(?=\.)/i, '')
            .replace(/-thumb(?=\.)/i, '')
            .replace(/-2x(?=\.)/i, '')
        )
        .filter((u) => !/logo|whatsapp|colombia-map|favicon|youtube/i.test(u))
    ),
  ];
  return { title, imgs: imgs.slice(0, 8) };
}

const urls = await searchAutosolar('Pylontech US2000C');
console.log('search', urls);
if (urls[0]) {
  const p = await loadAuto(urls.find((u) => /pylon/i.test(u)) || urls[0]);
  console.log('title', p.title);
  console.log('imgs', p.imgs);
}

const solUrl = 'https://portal.solaire.com.co/?s=SUN2000-20KTL&post_type=product';
const sh = await fetchHtml(solUrl);
const slinks = [
  ...new Set(
    [...sh.matchAll(/https?:\/\/portal\.solaire\.com\.co\/producto\/[a-z0-9-]+\/?/gi)].map((m) =>
      m[0]
    )
  ),
];
console.log('solaire', slinks.slice(0, 5));
