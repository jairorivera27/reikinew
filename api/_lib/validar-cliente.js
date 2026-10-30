/**
 * Datos mínimos del cliente para cotizar en la página (mismas reglas que el formulario del carrito):
 * nombre completo, WhatsApp colombiano, correo real y municipio + departamento válidos.
 */
import fs from 'node:fs';
import path from 'node:path';

let muni = null;
function municipios() {
  if (muni) return muni;
  for (const p of [path.join(process.cwd(), 'public', 'data', 'colombia-municipios.json'), path.join(process.cwd(), 'dist', 'data', 'colombia-municipios.json')]) {
    try {
      if (fs.existsSync(p)) {
        muni = JSON.parse(fs.readFileSync(p, 'utf8'));
        return muni;
      }
    } catch {
      /* siguiente */
    }
  }
  muni = {};
  return muni;
}

const norm = (s) =>
  String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

export function correoReal(m) {
  const v = String(m || '').trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/.test(v)) return false;
  const [u, d] = v.split('@');
  if (/^[\d.]+$/.test(u) || u.length < 3) return false;
  if (/^(no|sin|ning|test|prueba|correo|email|xx+|aa+|abc|asd|qwe|na)$/.test(u) || /notengo|noaplica|sincorreo|ninguno|noresponder/.test(u)) return false;
  if (/^(gmal|gmial|gamil|gmai|gmaill|hotmial|hotmal|hotmai|yaho|outlok|outllok)\./.test(d)) return false;
  if (/^(test|example|ejemplo|correo|email)\./.test(d)) return false;
  return true;
}

/** Devuelve { ok, errores: {campo: mensaje}, datos } */
export function validarCliente(b = {}) {
  const errores = {};
  const nombre = String(b.nombre || '').replace(/\s+/g, ' ').trim();
  const partes = nombre.split(' ').filter((p) => p.replace(/[^\p{L}]/gu, '').length >= 2);
  if (partes.length < 2 || /\d/.test(nombre)) errores.nombre = 'Escribe tu nombre y apellido.';

  let cel = String(b.celular || b.whatsapp || '').replace(/\D/g, '');
  if (cel.length === 12 && cel.startsWith('57')) cel = cel.slice(2);
  if (!/^3\d{9}$/.test(cel) || /(\d)\1{5,}/.test(cel)) errores.celular = 'Escribe tu número de WhatsApp real (10 dígitos, empieza por 3).';

  const correo = String(b.correo || '').trim().toLowerCase();
  if (!correoReal(correo)) errores.correo = 'Escribe un correo válido: ahí te enviamos la cotización y la factura.';

  const M = municipios();
  const deps = Object.keys(M);
  const dep = deps.find((d) => norm(d) === norm(b.departamento)) || '';
  let mun = '';
  if (!dep) errores.departamento = 'Selecciona el departamento.';
  else {
    mun = (M[dep] || []).find((m) => norm(m) === norm(b.municipio || b.ciudad)) || '';
    if (!mun) errores.municipio = 'Selecciona el municipio.';
  }
  const ok = Object.keys(errores).length === 0;
  return {
    ok,
    errores,
    datos: ok ? { nombre, celular: cel, correo, departamento: dep, municipio: mun, ciudad: `${mun}, ${dep}` } : null,
  };
}
