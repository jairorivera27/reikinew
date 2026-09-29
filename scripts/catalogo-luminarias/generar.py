"""
Catálogo PDF de iluminación solar Reiki Energía Solar (luminarias Hardy Solar).

Lee data/luminarias-hardy.json y genera un HTML de páginas 1920×1080 (mismo formato
horizontal del catálogo del fabricante) que luego se imprime a PDF con Chromium.

Uso (desde la raíz del repo):
  python3 scripts/catalogo-luminarias/generar.py scripts/catalogo-luminarias/assets /tmp/catalogo.html
  node scripts/catalogo-luminarias/imprimir.mjs /tmp/catalogo.html public/catalogos/catalogo-iluminacion-solar-reiki-2026.pdf

Los precios salen de data/luminarias-hardy.json (distribuidor × _margen): al cambiar la lista, regenera el PDF.
"""
import html, json, os, sys

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
ASSETS = os.path.abspath(sys.argv[1])
OUT = sys.argv[2]
DATA = json.load(open(os.path.join(ROOT, 'data', 'luminarias-hardy.json'), encoding='utf-8'))
P = {p['id']: p for p in DATA['productos']}
MARGEN = DATA['_margen']
e = lambda s: html.escape(str(s or ''))
A = lambda f: 'file://' + os.path.join(ASSETS, f)

MORADO, MORADO_OSC, AMARILLO = '#6b2181', '#3a0b47', '#ffc20e'

ICON = {
    'potencia': '<path d="M13 2 4 14h7l-1 8 9-12h-7l1-8z"/>',
    'flujo': '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    'bateria': '<rect x="6" y="4" width="12" height="18" rx="2"/><path d="M10 2h4M12 9l-2 4h4l-2 4"/>',
    'panel': '<path d="M3 5h18l-2 10H5L3 5zM12 15v5M8 20h8M9.5 5l-1 10M14.5 5l1 10M4 10h16"/>',
    'autonomia': '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>',
    'ip': '<path d="M12 2 4 5v6c0 5 3.4 9.4 8 11 4.6-1.6 8-6 8-11V5l-8-3z"/><path d="m9 12 2 2 4-4"/>',
    'carga': '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    'altura': '<path d="M12 3v18M8 7l4-4 4 4M8 17l4 4 4-4"/>',
    'area': '<path d="M4 8V4h4M16 4h4v4M20 16v4h-4M8 20H4v-4"/>',
    'retilap': '<circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/>',
}


def icon(k, size=34, color=MORADO):
    return (f'<svg width="{size}" height="{size}" viewBox="0 0 24 24" fill="none" stroke="{color}" '
            f'stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">{ICON[k]}</svg>')


def cop(n):
    return '$' + f'{round(n):,}'.replace(',', '.')


def retilap_badge(p):
    r = p.get('retilap')
    if r == 'certificado':
        return f'<span class="badge ok">{icon("retilap",22,"#0f7a3d")} RETILAP certificado</span>'
    if r == 'en-evaluacion':
        return f'<span class="badge proc">{icon("retilap",22,"#8a5a00")} RETILAP en evaluación</span>'
    if r == 'en-proceso':
        return f'<span class="badge proc">{icon("retilap",22,"#8a5a00")} Diseñado para RETILAP</span>'
    return ''


def corto(v, n=34):
    v = str(v or '')
    return v if len(v) <= n else v[: n - 1].rsplit(' ', 1)[0] + '…'


def chips(p, compacto=False):
    items = [
        ('potencia', 'Potencia real', p.get('potencia')),
        ('flujo', 'Flujo luminoso', p.get('flujo')),
        ('bateria', 'Batería', (p.get('bateria') or '').replace('LiFePO4 ', 'LiFePO₄ ').split(' (')[0]),
        ('panel', 'Panel solar', corto((p.get('panel') or '').split(' (')[0], 30)),
        ('autonomia', 'Autonomía', corto(p.get('autonomia'), 30)),
        ('ip', 'Protección', ' / '.join(x for x in [p.get('ip'), p.get('ik')] if x)),
    ]
    items = [i for i in items if i[2]]
    return '<div class="chips{}">{}</div>'.format(' compacto' if compacto else '', ''.join(
        f'<div class="chip">{icon(k, 30 if compacto else 34)}<div><small>{e(t)}</small><b>{e(v)}</b></div></div>'
        for k, t, v in items))


def tabla(p, filas=None):
    campos = filas or [('Altura de instalación', 'altura'), ('Distancia entre postes', 'distancia'),
                       ('Cobertura', 'cobertura'), ('Tiempo de carga', 'carga'), ('Eficacia', 'eficacia'),
                       ('Dimensiones', 'dimensiones'), ('Garantía', 'garantia')]
    rows = ''.join(f'<tr><th>{e(t)}</th><td>{e(p.get(k))}</td></tr>' for t, k in campos if p.get(k))
    return f'<table class="mini">{rows}</table>' if rows else ''


def titulo_prod(p):
    eq = f'<span class="eq">{e(p["equivalente"])} equivalente · {e(p["potencia"])} reales</span>' if p.get('equivalente') else ''
    return f'<h2>{e(p["nombre"])}</h2><p class="tipo">{e(p["tipo"])}</p>{eq}{retilap_badge(p)}'


def card2(p, escena=None):
    esc = f'<img class="escena" src="{A(escena)}">' if escena else ''
    return f'''
    <section class="card2">
      <div class="foto"><img src="{A("prod/" + p["id"] + ".png")}">{esc}</div>
      <div class="info">
        {titulo_prod(p)}
        {chips(p)}
        {tabla(p)}
      </div>
    </section>'''


def card3(p):
    return f'''
    <section class="card3">
      <div class="foto3"><img src="{A("prod/" + p["id"] + ".png")}"></div>
      <div class="info3">
        {titulo_prod(p)}
        {chips(p, True)}
        {tabla(p, [("Altura", "altura"), ("Cobertura", "cobertura"), ("Carga", "carga"), ("Garantía", "garantia")])}
      </div>
    </section>'''


def pagina(tab, contenido, n, oscura=False):
    return f'''
  <div class="page{' dark' if oscura else ''}">
    <aside class="tab"><img class="tablogo" src="{A("logo_blanco.png")}"><span>{e(tab)}</span></aside>
    <main class="area">{contenido}</main>
    <div class="num">{n}</div>
  </div>'''


def cabecera(titulo, sub):
    return f'<header class="cab"><h1>{e(titulo)}</h1><p>{e(sub)}</p></header>'


pages = []

# 1. Portada
pages.append(f'''
  <div class="page portada">
    <svg class="rayos" viewBox="0 0 1920 1080" preserveAspectRatio="none">
      <defs><radialGradient id="sol" cx="78%" cy="18%" r="60%"><stop offset="0" stop-color="{AMARILLO}" stop-opacity=".55"/><stop offset=".35" stop-color="{AMARILLO}" stop-opacity=".08"/><stop offset="1" stop-color="{AMARILLO}" stop-opacity="0"/></radialGradient></defs>
      <rect width="1920" height="1080" fill="url(#sol)"/>
    </svg>
    <img class="logo-portada" src="{A("logo_blanco.png")}">
    <div class="portada-txt">
      <p class="kicker">Catálogo 2026</p>
      <h1>Iluminación<br><em>solar</em> para<br>espacios que no<br>se apagan.</h1>
      <p class="sub">Luminarias, reflectores y lámparas solares LED con batería LiFePO₄, listas para instalar y sin conexión a la red.</p>
    </div>
    <div class="collage">
      <img class="c1" src="{A("prod/vega-1000.png")}">
      <img class="c2" src="{A("prod/ares-600.png")}">
      <img class="c3" src="{A("prod/nova-600.png")}">
      <img class="c4" src="{A("prod/urban-400.png")}">
    </div>
    <div class="pie-portada">reikisolar.com.co · Medellín, Colombia · Envíos a todo el país</div>
  </div>''')

# 2. Quiénes somos
beneficios = [
    ('potencia', 'Cero factura de energía', 'Cada luminaria genera y guarda su propia energía: no paga consumo eléctrico ni requiere acometida.'),
    ('panel', 'Instalación sin cableado', 'Se fija en poste, muro o soporte. Sin zanjas, sin tableros y sin trámites con el operador de red.'),
    ('bateria', 'Baterías LiFePO₄', 'Litio ferrofosfato: más ciclos de vida, mayor seguridad y rendimiento estable noche tras noche.'),
    ('retilap', 'Cumplimiento RETILAP', 'Modelos certificados o diseñados bajo la Resolución 40150 de 2024 para alumbrado exterior en Colombia.'),
]
ben_html = ''.join(f'<div class="ben">{icon(k,46,AMARILLO)}<h3>{e(t)}</h3><p>{e(d)}</p></div>' for k, t, d in beneficios)
pages.append(pagina('Reiki Energía Solar', f'''
    <div class="nosotros">
      <div class="nos-txt">
        <p class="kicker morado">Quiénes somos</p>
        <h1>Energía solar hecha en Colombia, con acompañamiento de principio a fin.</h1>
        <p>En <b>Reiki Energía Solar</b> diseñamos, suministramos e instalamos sistemas solares desde Medellín para todo el país. Nuestra línea de iluminación solar lleva luz a vías, parcelaciones, fincas, parqueaderos, canchas y bodegas donde llevar la red eléctrica es costoso o imposible.</p>
        <p>Te ayudamos a elegir el modelo correcto según la altura del poste, el área a iluminar y las horas de uso, y te entregamos la ficha técnica de cada referencia.</p>
      </div>
      <div class="beneficios">{ben_html}</div>
    </div>''', 2, oscura=True))

# 3. Guía rápida
guia = [
    ('Todo en uno', 'Panel, batería y LED en un solo cuerpo. Vías, conjuntos y parcelaciones.', ['ares-600', 'ares-500', 'stellar-500', 'solaris-2000']),
    ('Luminaria de calle', 'Modelos compactos con control remoto y sensor. Vías residenciales y parques.', ['astra-400', 'astra-600', 'astra-800', 'urban-300', 'urban-400']),
    ('Panel separado', 'El panel se orienta al sol de forma independiente: más energía en sitios con sombra parcial.', ['lumina-800', 'orion']),
    ('Colgante tipo campana', 'Para bodegas, galpones, kioscos y parqueaderos cubiertos, con panel exterior.', ['sirius']),
    ('Reflectores', 'Haz dirigido para fachadas, canchas, parqueaderos y obras.', ['nova-100', 'nova-200', 'nova-600', 'vega-1000']),
]
filas = ''
for linea, uso, ids in guia:
    modelos = ''.join(
        f'<div class="gm"><img src="{A("prod/" + i + ".png")}"><b>{e(P[i]["nombre"])}</b><small>{e(P[i].get("potencia") or "")}{" · " if P[i].get("potencia") and P[i].get("flujo") else ""}{e(P[i].get("flujo") or "")}</small><small class="alt">{("Altura " + e(P[i]["altura"])) if P[i].get("altura") else "&nbsp;"}</small></div>'
        for i in ids)
    filas += f'<div class="gfila"><div class="gl"><h3>{e(linea)}</h3><p>{e(uso)}</p></div><div class="gms">{modelos}</div></div>'
pages.append(pagina('Guía rápida', cabecera('¿Qué luminaria necesito?', 'Elige la línea según el lugar; luego el modelo según la altura del poste y el área a iluminar.') + f'<div class="guia">{filas}</div>', 3))

n = 4
pages.append(pagina('Todo en uno', cabecera('Todo en uno', 'Panel solar, batería, controlador y LED integrados. Se instala en minutos, sin cables.')
                    + f'<div class="dos">{card2(P["ares-600"], "esc-ares600.jpg")}{card2(P["ares-500"])}</div>', n)); n += 1
pages.append(pagina('Todo en uno', cabecera('Todo en uno', 'Alta potencia para vías, espacios industriales y áreas extensas.')
                    + f'<div class="dos">{card2(P["stellar-500"])}{card2(P["solaris-2000"], "esc-solaris.jpg")}</div>', n)); n += 1
pages.append(pagina('Luminaria de calle', cabecera('Serie Astra', 'Iluminación uniforme con control remoto para vías residenciales, parques y conjuntos.')
                    + f'<div class="tres">{card3(P["astra-400"])}{card3(P["astra-600"])}{card3(P["astra-800"])}</div>', n)); n += 1
pages.append(pagina('Luminaria de calle', cabecera('Serie Urban', 'Fotocelda, sensor de movimiento y control remoto: más ahorro y más autonomía en días nublados.')
                    + f'<div class="dos">{card2(P["urban-300"], "esc-urban.jpg")}{card2(P["urban-400"])}</div>', n)); n += 1
pages.append(pagina('Panel separado', cabecera('Panel separado', 'El panel se orienta al sol por separado para captar más energía en proyectos exigentes.')
                    + f'<div class="dos">{card2(P["lumina-800"])}{card2(P["orion"], "esc-orion.jpg")}</div>', n)); n += 1

s = P['sirius']
pages.append(pagina('Luz solar colgante', cabecera('Sirius', 'Lámpara solar colgante tipo campana (UFO) para interiores y espacios cubiertos.') + f'''
    <div class="uno">
      <div class="foto-uno"><img src="{A("prod/sirius.png")}"></div>
      <div class="info">
        {titulo_prod(s)}
        {chips(s)}
        <p class="modos"><b>Modos de operación:</b> {e(s["modos"])}.</p>
        {tabla(s)}
        <p class="apps"><b>Ideal para:</b> {e(", ".join(s["aplicaciones"]))}.</p>
      </div>
    </div>''', n)); n += 1
pages.append(pagina('Reflectores', cabecera('Reflectores Nova', 'Reflectores solares profesionales con panel independiente y soporte ajustable.')
                    + f'<div class="tres">{card3(P["nova-100"])}{card3(P["nova-200"])}{card3(P["nova-600"])}</div>', n)); n += 1

v = P['vega-1000']
pages.append(pagina('Reflectores', cabecera('Vega 1000', 'Reflector solar profesional para canchas deportivas y grandes áreas.') + f'''
    <div class="uno">
      <div class="foto-uno"><img src="{A("prod/vega-1000.png")}"><img class="escena grande" src="{A("esc-vega.jpg")}"></div>
      <div class="info">
        {titulo_prod(v)}
        {chips(v)}
        {tabla(v)}
        <p class="apps"><b>Ideal para:</b> {e(", ".join(v["aplicaciones"]))}.</p>
      </div>
    </div>''', n)); n += 1

# Lista de precios
orden = ['ares-600', 'ares-500', 'stellar-500', 'solaris-2000', 'astra-400', 'astra-600', 'astra-800', 'urban-300',
         'urban-400', 'lumina-800', 'orion', 'sirius', 'nova-100', 'nova-200', 'nova-600', 'vega-1000']
linea_de = {i: l for l, _, ids in guia for i in ids}
filas_p = ''.join(
    f'<tr><td><b>{e(P[i]["nombre"])}</b></td><td>{e(linea_de[i])}</td><td>{e(P[i].get("potencia") or "—")}</td>'
    f'<td>{e(P[i].get("flujo") or "—")}</td><td>{e((P[i].get("bateria") or "—").split(" (")[0])}</td>'
    f'<td class="precio">{cop(P[i]["precioDistribuidor"] * MARGEN)}</td></tr>' for i in orden)
pages.append(pagina('Lista de precios', cabecera('Lista de precios', 'Septiembre 2026 · Precios por unidad en pesos colombianos, IVA incluido.') + f'''
    <table class="precios"><thead><tr><th>Modelo</th><th>Línea</th><th>Potencia real</th><th>Flujo</th><th>Batería</th><th>Precio</th></tr></thead><tbody>{filas_p}</tbody></table>
    <p class="nota">Precios sujetos a cambio y a disponibilidad de inventario. El poste no está incluido. Para proyectos y compras por volumen, solicita tu cotización.</p>''', n)); n += 1

# Contraportada
pages.append(f'''
  <div class="page portada contra">
    <img class="logo-contra" src="{A("logo_blanco.png")}">
    <h1>¿Listo para iluminar tu proyecto?</h1>
    <p class="sub">Te asesoramos sin costo para elegir la luminaria, la altura y la distancia correctas.</p>
    <div class="contactos">
      <div class="qr"><img src="{A("qr-whatsapp.png")}"><b>Cotiza por WhatsApp</b><span>+57 300 405 2638</span></div>
      <div class="qr"><img src="{A("qr-tienda.png")}"><b>Compra en línea</b><span>reikisolar.com.co/tienda</span></div>
      <div class="datos">
        <p><b>Reiki Energía Solar SAS</b></p>
        <p>Carrera 80 #39-167 Local 105<br>Medellín, Antioquia</p>
        <p>info@reikisolar.com.co<br>Lun – Sáb 8:00 – 18:00</p>
        <p>Instagram @reikiener</p>
      </div>
    </div>
    <p class="legal">Especificaciones según fichas técnicas del fabricante (Hardy Solar Energy). Imágenes de referencia. Garantía del fabricante según cada referencia.</p>
  </div>''')

fonts = ''.join(
    f"@font-face{{font-family:Poppins;font-weight:{w};src:url('{A('fonts/Poppins-' + n + '.ttf')}')}}"
    for w, n in [(400, 'Regular'), (500, 'Medium'), (600, 'SemiBold'), (700, 'Bold'), (800, 'ExtraBold')])

CSS = f'''{fonts}
@page {{ size: 1920px 1080px; margin: 0 }}
* {{ box-sizing: border-box; margin: 0; padding: 0 }}
body {{ font-family: Poppins, sans-serif; color: #231a2b; background: #fff }}
.page {{ width: 1920px; height: 1080px; position: relative; overflow: hidden; page-break-after: always; background: #f6f3f8; display: flex }}
.tab {{ width: 132px; background: linear-gradient(180deg, {MORADO} 0%, {MORADO_OSC} 100%); position: relative; flex: none }}
.tab span {{ position: absolute; left: 50%; bottom: 70px; transform: translateX(-50%) rotate(-90deg); transform-origin: center; white-space: nowrap;
  color: #fff; font-weight: 700; font-size: 46px; letter-spacing: .5px; width: 0; display: flex; justify-content: flex-start; }}
.tab span {{ writing-mode: vertical-rl; transform: rotate(180deg); left: 36px; width: auto; bottom: 64px }}
.tablogo {{ width: 104px; position: absolute; top: 34px; left: 14px }}
.area {{ flex: 1; padding: 56px 72px 48px 64px; display: flex; flex-direction: column }}
.num {{ position: absolute; right: 0; bottom: 0; background: {MORADO}; color: #fff; font-weight: 700; font-size: 26px; width: 64px; height: 64px; display: grid; place-items: center }}
.cab {{ display: flex; align-items: baseline; gap: 28px; border-bottom: 4px solid {AMARILLO}; padding-bottom: 14px; margin-bottom: 30px }}
.cab h1 {{ font-size: 54px; font-weight: 800; color: {MORADO_OSC}; line-height: 1 }}
.cab p {{ font-size: 23px; color: #5a4d63 }}
.kicker {{ text-transform: uppercase; letter-spacing: 6px; font-weight: 700; font-size: 22px; color: {AMARILLO} }}
.kicker.morado {{ color: {MORADO} }}
/* portada */
.portada {{ background: radial-gradient(circle at 80% 20%, #8b2a9b 0%, {MORADO} 30%, {MORADO_OSC} 75%); color: #fff; display: block }}
.rayos {{ position: absolute; inset: 0; width: 100%; height: 100% }}
.logo-portada {{ position: absolute; top: 70px; left: 96px; width: 330px }}
.portada-txt {{ position: absolute; left: 96px; top: 250px; width: 900px }}
.portada-txt h1 {{ font-size: 104px; line-height: 1.02; font-weight: 800; margin: 18px 0 32px }}
.portada-txt h1 em {{ font-style: normal; color: {AMARILLO} }}
.portada .sub {{ font-size: 28px; line-height: 1.45; color: #eadcf0; width: 760px }}
.collage {{ position: absolute; right: 60px; top: 90px; width: 900px; height: 900px }}
.collage img {{ position: absolute}}
.c1 {{ width: 470px; right: 0; top: 40px }}
.c2 {{ height: 700px; left: 60px; top: 120px }}
.c3 {{ width: 420px; right: 40px; bottom: 60px }}
.c4 {{ height: 560px; left: 290px; top: 250px }}
.pie-portada {{ position: absolute; left: 96px; bottom: 60px; font-size: 22px; color: #d9c6e0; border-top: 2px solid rgba(255,255,255,.3); padding-top: 18px; width: 760px }}
/* nosotros */
.dark {{ background: {MORADO_OSC}; color: #fff }}
.dark .num {{ background: {AMARILLO}; color: {MORADO_OSC} }}
.nosotros {{ display: grid; grid-template-columns: 1fr 1fr; gap: 80px; height: 100%; align-items: center }}
.nos-txt h1 {{ font-size: 56px; line-height: 1.12; font-weight: 800; margin: 18px 0 30px }}
.nos-txt p {{ font-size: 25px; line-height: 1.6; color: #e7daee; margin-bottom: 18px }}
.beneficios {{ display: grid; grid-template-columns: 1fr 1fr; gap: 26px }}
.ben {{ background: rgba(255,255,255,.07); border: 1px solid rgba(255,255,255,.14); border-radius: 22px; padding: 34px }}
.ben h3 {{ font-size: 27px; margin: 16px 0 10px; color: #fff }}
.ben p {{ font-size: 20px; line-height: 1.5; color: #d9c6e0 }}
/* guía */
.guia {{ display: flex; flex-direction: column; gap: 16px; flex: 1 }}
.gfila {{ display: grid; grid-template-columns: 380px 1fr; background: #fff; border-radius: 18px; overflow: hidden; box-shadow: 0 6px 20px rgba(58,11,71,.07); flex: 1 }}
.gl {{ background: {MORADO}; color: #fff; padding: 20px 28px; display: flex; flex-direction: column; justify-content: center }}
.gl h3 {{ font-size: 28px; font-weight: 700 }}
.gl p {{ font-size: 17px; line-height: 1.4; color: #eadcf0; margin-top: 6px }}
.gms {{ display: flex; gap: 12px; padding: 10px 20px; align-items: center }}
.gm {{ display: grid; grid-template-columns: 70px 1fr; grid-template-rows: auto auto auto; column-gap: 12px; align-items: center; width: 256px }}
.gm img {{ grid-row: 1 / 4; width: 70px; height: 96px; object-fit: contain }}
.gm b {{ font-size: 21px; color: {MORADO_OSC} }}
.gm small {{ font-size: 15px; color: #5a4d63 }}
.gm small.alt {{ color: {MORADO} }}
/* tarjetas */
.dos {{ display: grid; grid-template-columns: 1fr 1fr; gap: 40px; flex: 1 }}
.tres {{ display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 32px; flex: 1 }}
.card2, .card3, .uno {{ background: #fff; border-radius: 26px; box-shadow: 0 10px 30px rgba(58,11,71,.08); overflow: hidden }}
.card2 {{ display: grid; grid-template-columns: 290px 1fr; }}
.foto {{ background: linear-gradient(180deg, #efe7f3, #fff); position: relative; display: flex; align-items: center; justify-content: center; padding: 24px }}
.foto > img:first-child {{ max-width: 230px; max-height: 560px; object-fit: contain}}
.escena {{ position: absolute; bottom: 20px; left: 20px; width: 124px; height: 124px; object-fit: cover; border-radius: 16px; border: 4px solid #fff; box-shadow: 0 6px 16px rgba(0,0,0,.18) }}
.info {{ padding: 34px 34px 28px 30px; display: flex; flex-direction: column }}
.info h2 {{ font-size: 50px; font-weight: 800; color: {MORADO_OSC}; line-height: 1 }}
.tipo {{ font-size: 19px; color: #5a4d63; margin: 6px 0 10px }}
.eq {{ display: inline-block; font-size: 16px; color: {MORADO}; background: #f3e9f7; padding: 4px 12px; border-radius: 999px; margin-bottom: 8px }}
.badge {{ display: inline-flex; align-items: center; gap: 8px; font-weight: 600; font-size: 17px; padding: 6px 14px 6px 10px; border-radius: 999px; width: fit-content; margin-bottom: 14px }}
.badge.ok {{ background: #e3f6ea; color: #0f7a3d }}
.badge.proc {{ background: #fff3d6; color: #8a5a00 }}
.chips {{ display: grid; grid-template-columns: 1fr 1fr; gap: 10px 14px; margin: 6px 0 18px }}
.chip {{ display: flex; gap: 12px; align-items: center; background: #f8f4fa; border-radius: 14px; padding: 10px 12px }}
.chip small {{ display: block; font-size: 14px; color: #7a6b84 }}
.chip b {{ display: block; font-size: 18px; color: #231a2b; line-height: 1.2 }}
.chips.compacto {{ grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 12px }}
.chips.compacto .chip {{ padding: 7px 12px }}
.chips.compacto .chip b {{ font-size: 15.5px }}
.chips.compacto .chip small {{ font-size: 12.5px }}
.chips.compacto .chip svg {{ width: 24px; height: 24px; flex: none }}
.mini {{ width: 100%; border-collapse: collapse; font-size: 17px }}
.mini th {{ text-align: left; color: #7a6b84; font-weight: 500; padding: 6px 0; width: 46%; border-bottom: 1px solid #eee4f2 }}
.mini td {{ font-weight: 600; padding: 6px 0; border-bottom: 1px solid #eee4f2 }}
.card3 {{ display: flex; flex-direction: column }}
.foto3 {{ height: 220px; background: linear-gradient(180deg, #efe7f3, #fff); display: flex; align-items: center; justify-content: center; padding: 18px }}
.foto3 img {{ max-height: 190px; max-width: 90%; object-fit: contain}}
.info3 {{ padding: 18px 26px; display: flex; flex-direction: column }}
.info3 h2 {{ font-size: 38px; font-weight: 800; color: {MORADO_OSC} }}
.uno {{ display: grid; grid-template-columns: 720px 1fr; flex: 1 }}
.foto-uno {{ background: linear-gradient(180deg, #efe7f3, #fff); position: relative; display: flex; align-items: center; justify-content: center; padding: 40px }}
.foto-uno > img:first-child {{ max-width: 560px; max-height: 620px; object-fit: contain}}
.escena.grande {{ width: 200px; height: 210px }}
.modos, .apps {{ font-size: 19px; line-height: 1.5; color: #3d3346; margin: 4px 0 14px }}
.apps {{ margin-top: 16px }}
.foto::after, .foto3::after, .foto-uno::after {{ content: ""; position: absolute; left: 20%; right: 20%; bottom: 6%; height: 26px;
  background: radial-gradient(ellipse at center, rgba(40,10,50,.22) 0%, rgba(40,10,50,0) 70%) }}
.foto3 {{ position: relative }}
.foto > img, .foto3 img, .foto-uno > img {{ position: relative; z-index: 1 }}
/* precios */
.precios {{ width: 100%; border-collapse: separate; border-spacing: 0; font-size: 21px; background: #fff; border-radius: 20px; overflow: hidden; box-shadow: 0 8px 24px rgba(58,11,71,.08) }}
.precios th {{ background: {MORADO}; color: #fff; text-align: left; padding: 13px 22px; font-weight: 600 }}
.precios td {{ padding: 9px 22px; border-bottom: 1px solid #efe6f3 }}
.precios tr:nth-child(even) td {{ background: #faf7fc }}
.precios .precio {{ font-weight: 800; color: {MORADO_OSC}; text-align: right }}
.precios th:last-child {{ text-align: right }}
.nota {{ font-size: 18px; color: #5a4d63; margin-top: 16px }}
/* contraportada */
.contra {{ padding: 90px 120px }}
.logo-contra {{ width: 360px }}
.contra h1 {{ font-size: 76px; font-weight: 800; margin: 50px 0 18px; width: 1300px; line-height: 1.05 }}
.contra .sub {{ width: 1100px }}
.contactos {{ display: flex; gap: 60px; margin-top: 44px; align-items: flex-start }}
.qr {{ background: #fff; color: {MORADO_OSC}; border-radius: 24px; padding: 24px; width: 290px; text-align: center; display: flex; flex-direction: column; gap: 6px }}
.qr img {{ width: 242px; height: 242px }}
.qr b {{ font-size: 23px }}
.qr span {{ font-size: 18px; color: #5a4d63 }}
.datos p {{ font-size: 25px; line-height: 1.5; color: #eadcf0; margin-bottom: 18px }}
.legal {{ position: absolute; left: 120px; bottom: 34px; font-size: 16px; color: #b9a4c2 }}
'''

doc = f'<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Catálogo de Iluminación Solar · Reiki Energía Solar</title><style>{CSS}</style></head><body>{"".join(pages)}</body></html>'
open(OUT, 'w', encoding='utf-8').write(doc)
print('páginas:', len(pages))
