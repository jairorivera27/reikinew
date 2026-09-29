const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

async function get(url) {
  const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'text/html' }, redirect: 'follow' });
  const html = await res.text();
  const title = (html.match(/<title>([^|<]+)/i) || [])[1]?.trim()?.slice(0, 80);
  console.log(res.status, res.url.slice(0, 100), '|', title);
  return html;
}

// known CDN image → find product page referencing it
const img = 'controlador-carga-smartsolar-mppt-10050-victron-energy';
for (const u of [
  'https://autosolar.co/fabricantes/Victron-energy',
  'https://autosolar.co/fabricantes/victron-energy',
  'https://autosolar.co/fabricantes/victron',
  'https://autosolar.co/controladores-de-carga',
  'https://autosolar.co/controladores-de-carga-mppt',
  'https://autosolar.co/reguladores-de-carga',
  'https://autosolar.co/reguladores-mppt',
  'https://autosolar.co/reguladores-de-carga-mppt/controlador-carga-smartsolar-mppt-10050-victron-energy',
  'https://autosolar.co/controladores-de-carga-mppt/controlador-carga-smartsolar-mppt-10050-victron-energy',
  'https://autosolar.co/busqueda?controller=search&s=SCC110050210',
  'https://autosolar.co/busqueda?controller=search&s=100%2F50+victron',
]) {
  try {
    await get(u);
  } catch (e) {
    console.log('fail', u, e.message);
  }
}

// check if CDN image still exists
const imgUrl =
  'https://cdn.autosolar.co/images/2008191/controlador-carga-smartsolar-mppt-10050-victron-energy.jpg';
const ir = await fetch(imgUrl, { method: 'HEAD', headers: { 'User-Agent': UA } });
console.log('cdn image', ir.status, imgUrl);
