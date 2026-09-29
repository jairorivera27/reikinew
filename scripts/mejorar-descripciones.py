"""
Reescribe descripción, especificaciones y preguntas frecuentes de los productos visibles
con los datos más consultados por categoría.

Reglas:
  - Solo datos verificables: título/modelo/especificaciones del producto y datos técnicos
    extraídos de la página del proveedor (docs/fichas-proveedores.json).
  - Los cálculos (kWh por día, horas de respaldo, paneles por controlador) se marcan como
    aproximados y dicen de qué supuesto parten.
  - No toca productos con `faqs` ya escritas a mano (p. ej. luminarias Hardy) salvo --forzar.

Uso: python3 scripts/mejorar-descripciones.py [--dry-run] [--forzar] [--solo slug1,slug2]
"""
import json, os, re, sys, glob

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PROD = os.path.join(ROOT, 'src', 'content', 'productos')
DRY = '--dry-run' in sys.argv
FORZAR = '--forzar' in sys.argv
SOLO = set(sys.argv[sys.argv.index('--solo') + 1].split(',')) if '--solo' in sys.argv else None
PROV = json.load(open(os.path.join(ROOT, 'docs', 'fichas-proveedores.json'), encoding='utf-8'))
HSP = 4.5  # horas sol pico de referencia (Colombia, promedio conservador)


# ---------------- lectura ----------------
def leer(path):
    t = open(path, encoding='utf-8').read()
    m = re.match(r'---\n(.*?)\n---\n?', t, re.S)
    return t, m


def campo(fm, k):
    m = re.search(rf'^{k}:\s*(.*)$', fm, re.M)
    if not m:
        return ''
    v = m.group(1).strip()
    if v.startswith('"'):
        try:
            return json.loads(v)
        except Exception:
            return v.strip('"')
    return v


def lista(fm, k):
    out, dentro = [], False
    for line in fm.split('\n'):
        if line.startswith(f'{k}:'):
            dentro = True
            continue
        if dentro:
            if line.startswith('  - '):
                v = line[4:].strip()
                try:
                    v = json.loads(v)
                except Exception:
                    v = v.strip('"')
                out.append(v)
            elif line.startswith('  ') and out:
                continue
            else:
                break
    return out


def num(s):
    return float(str(s).replace('.', '').replace(',', '.')) if re.fullmatch(r'\d{1,3}(\.\d{3})+', str(s)) else float(str(s).replace(',', '.'))


def fmt(x, dec=1):
    s = f'{x:,.{dec}f}'.replace(',', 'X').replace('.', ',').replace('X', '.')
    return s[:-2] if s.endswith(',0') else s


# ---------------- extracción ----------------
def datos(slug, fm):
    d = {
        'slug': slug,
        'title': campo(fm, 'title'),
        'brand': campo(fm, 'brand') or '',
        'model': campo(fm, 'model') or '',
        'sku': campo(fm, 'sku') or '',
        'power': campo(fm, 'power') or '',
        'cat': campo(fm, 'category'),
        'specs': lista(fm, 'specifications'),
        'ficha': bool(campo(fm, 'fichaPdf')),
        'serieRef': campo(fm, 'imagenSerieRef'),
        'desc': campo(fm, 'description'),
    }
    kv = {}
    for s in d['specs']:
        if ':' in s and not s.startswith('Fuente'):
            k, v = s.split(':', 1)
            kv[k.strip().lower()] = v.strip()
    prov = PROV.get(slug) or {}
    d['prov_match'] = prov.get('match')
    extra = []
    if prov.get('match') == 'exacto':  # solo datos del proveedor cuando el emparejamiento es exacto
        for b in prov.get('bullets', []):
            b = re.sub(r'^[^\wÁÉÍÓÚáéíóúÑñ(]+', '', b).rstrip('.').strip()
            if ':' in b:
                k, v = b.split(':', 1)
                k, v = k.strip(), v.strip()
                if 2 < len(k) < 60 and v and len(v) < 90 and k.lower() not in kv:
                    kv[k.lower()] = v
                    extra.append(f'{k}: {v}')
    d['kv'] = kv
    d['extra'] = extra[:12]
    texto = ' '.join([d['title'], d['model'], d['power'], ' '.join(d['specs'])])
    d['texto'] = texto
    g = lambda rx: (re.search(rx, texto, re.I) or [None, None])[1]
    d['kw'] = g(r'(\d+(?:[.,]\d+)?)\s*kW(?!h)')
    d['w'] = g(r'(\d{2,5})\s*W\b')
    d['kwh'] = g(r'(\d+(?:[.,]\d+)?)\s*kWh')
    d['ah'] = g(r'(\d{2,4})\s*Ah')
    d['amp'] = g(r'(\d{1,4})\s*A\b')
    d['volt'] = g(r'(\d{2,4})\s*V(?:DC|AC|CA|CC)?\b')
    d['fases'] = ('trifásico' if re.search(r'trif[aá]sic|3P\b|-T\d|KTL3|MT\b|SMT|TL3', texto, re.I)
                  else 'bifásico' if re.search(r'bif[aá]sic|split', texto, re.I)
                  else 'monofásico' if re.search(r'monof[aá]sic', texto, re.I) else None)
    d['polos'] = g(r'\b(\d)P\b') or g(r'(\d)X\d+A')
    d['acdc'] = 'DC' if re.search(r'\bDC\b|VDC|PV\b', texto) else 'AC' if re.search(r'\bAC\b|VAC', texto) else None
    return d


# ---------------- plantillas por categoría ----------------
def marca_modelo(d):
    mm = d['brand'] if d['brand'] and d['brand'] not in ('Sin marca',) else ''
    mod = d['model'] if d['model'] and d['model'] not in ('N/A', 'Accesorio/Monitor') else ''
    return mm, mod


def f_ficha(d):
    return 'Descarga la ficha técnica del fabricante en esta página para revisar todos los parámetros.' if d['ficha'] else \
        'Si necesitas la hoja de datos completa, te la enviamos por WhatsApp.'


def paneles(d):
    w = d['w'] or (str(int(num(d['kw']) * 1000)) if d['kw'] else None)
    tec = []
    if re.search(r'bifacial', d['texto'], re.I): tec.append('bifacial')
    if re.search(r'n-?type|topcon|tiger neo|deep blue', d['texto'], re.I): tec.append('celdas N-Type')
    if re.search(r'monocristalin', d['texto'], re.I): tec.append('monocristalino')
    mm, mod = marca_modelo(d)
    desc = f'Panel solar {mm} {mod}'.strip() + (f' de {w} W' if w else '') + (f' ({", ".join(tec)})' if tec else '') + '.'
    faqs = []
    if w:
        kwh = int(w) * HSP / 1000
        desc += f' Genera en promedio unos {fmt(kwh)} kWh al día y cerca de {fmt(kwh * 30, 0)} kWh al mes en Colombia.'
        faqs.append(('¿Cuánta energía genera al día?',
                     f'Aproximadamente {fmt(kwh)} kWh por día ({w} W × {fmt(HSP)} horas de sol pico, promedio conservador para Colombia), '
                     f'unos {fmt(kwh * 30, 0)} kWh al mes. La cifra real depende de la ciudad, la orientación, la inclinación y las sombras.'))
        faqs.append(('¿Cuántos paneles necesito para mi casa o negocio?',
                     f'Divide tu consumo mensual (kWh, en la factura) entre {fmt(kwh * 30, 0)} kWh que aporta cada panel. Por ejemplo, '
                     f'para 300 kWh/mes necesitarías unos {max(1, round(300 / (kwh * 30)))} paneles. Te hacemos el dimensionamiento gratis con tu factura.'))
    if 'bifacial' in tec:
        faqs.append(('¿Qué ventaja tiene que sea bifacial?',
                     'Capta luz por ambas caras: además del sol directo aprovecha la luz reflejada por el piso o la cubierta. '
                     'La ganancia adicional depende de la altura y del color de la superficie (mayor en cubiertas claras y estructuras elevadas).'))
    dim = d['kv'].get('dimensiones'); peso = d['kv'].get('peso')
    if dim or peso:
        faqs.append(('¿Qué tamaño y peso tiene?', ' '.join(filter(None, [dim and f'Dimensiones: {dim}.', peso and f'Peso: {peso}.',
                                                                          'Verifica el espacio disponible en tu cubierta antes de comprar.']))))
    faqs.append(('¿Sirve para sistemas conectados a la red y para sistemas aislados?',
                 'Sí. Con un inversor on-grid entrega energía a la casa y a la red (autogeneración, con trámite ante el operador de red); '
                 'con un inversor híbrido u off-grid carga baterías. Lo importante es que el voltaje del arreglo sea compatible con el inversor o el controlador.'))
    return desc, faqs


def inversores(d):
    t = d['texto'].lower()
    tipo = ('microinversor' if 'microinvers' in t or 'microinverter' in t else
            'híbrido' if 'híbrid' in t or 'hibrid' in t or 'multiplus' in t or 'quattro' in t else
            'off-grid' if 'off-grid' in t or 'off grid' in t or 'aislad' in t or 'cargador' in t or 'phoenix' in t else
            'on-grid' if 'on-grid' in t or 'on grid' in t or 'red' in t else None)
    mm, mod = marca_modelo(d)
    pot = d['power'] if d['power'] and d['power'] not in ('N/A',) else (d['kw'] + ' kW' if d['kw'] else (d['w'] + ' W' if d['w'] else ''))
    nombre = {'microinversor': 'Microinversor', 'híbrido': 'Inversor híbrido', 'off-grid': 'Inversor off-grid',
              'on-grid': 'Inversor on-grid (conectado a red)'}.get(tipo, 'Inversor solar')
    if 'phoenix' in t: nombre = 'Inversor de onda senoidal pura (baterías a CA)'
    if 'multiplus' in t or 'quattro' in t: nombre = 'Inversor-cargador'
    desc = f'{nombre} {mm} {mod}'.strip() + (f' de {pot}' if pot else '') + (f', {d["fases"]}' if d['fases'] else '') + '.'
    faqs = []
    if tipo == 'on-grid':
        desc += ' Convierte la energía de tus paneles para el consumo de la casa o el negocio y entrega los excedentes a la red, sin baterías.'
        faqs.append(('¿Necesita baterías?', 'No. Es un inversor conectado a la red: funciona con los paneles y la red eléctrica. '
                     'Por seguridad se apaga cuando se va la luz (protección anti-isla). Si necesitas respaldo en cortes, elige un inversor híbrido.'))
        faqs.append(('¿Puedo vender los excedentes de energía?', 'Sí, en Colombia la autogeneración a pequeña escala (CREG 174 de 2021) permite entregar '
                     'excedentes con un medidor bidireccional y el trámite ante el operador de red. Reiki te acompaña en la legalización.'))
    elif tipo == 'híbrido':
        desc += ' Trabaja con paneles, baterías y red: aprovecha el sol de día, guarda energía y te respalda cuando hay cortes.'
        faqs.append(('¿Funciona cuando se va la luz?', 'Sí, con baterías conectadas alimenta las cargas de respaldo durante los cortes. '
                     'El tiempo de respaldo depende de la capacidad de las baterías y del consumo.'))
        faqs.append(('¿Qué baterías son compatibles?', 'Debe coincidir el voltaje del banco (' + (d['kv'].get('tensión de batería') or 'según ficha') +
                     ') y, para litio, el protocolo de comunicación del BMS. Te confirmamos la compatibilidad antes de la compra.'))
    elif tipo == 'off-grid':
        desc += ' Para sistemas aislados de la red: convierte la energía de las baterías en corriente alterna para tus equipos.'
        faqs.append(('¿Sirve sin conexión a la red eléctrica?', 'Sí, está pensado para fincas, cabañas y sitios sin red, alimentado por un banco de baterías '
                     'que se carga con paneles solares.'))
    elif tipo == 'microinversor':
        desc += ' Convierte la energía de cada panel de forma independiente: si uno recibe sombra, los demás siguen rindiendo al máximo.'
        faqs.append(('¿Cuántos paneles se conectan a cada microinversor?', 'Depende del número de entradas del modelo (revisa la ficha técnica). '
                     'Cada entrada tiene su propio seguimiento MPPT y admite un panel.'))
    if d['fases']:
        faqs.append(('¿Es monofásico, bifásico o trifásico?', f'Es {d["fases"]}. Debe coincidir con la conexión eléctrica de tu predio (lo ves en tu factura o en el tablero).'))
    if pot:
        try:
            kw = num(re.search(r'[\d.,]+', pot).group()) / (1000 if re.search(r'\bW\b', pot) and not re.search(r'kW', pot) else 1)
            if 0.2 < kw < 400 and tipo in ('on-grid', 'híbrido'):
                faqs.append(('¿Para qué consumo alcanza?', f'Un sistema con este inversor de {fmt(kw)} kW y unos {fmt(kw * 1.1)} kWp de paneles genera del orden de '
                             f'{fmt(kw * HSP * 30 * 1.1, 0)} kWh al mes ({fmt(HSP)} horas de sol pico en promedio), así que cubre consumos de esa magnitud. '
                             'Te dimensionamos el sistema con tu factura.'))
        except Exception:
            pass
    faqs.append(('¿Quién lo instala?', 'Debe instalarlo un técnico electricista con cumplimiento RETIE. Reiki ofrece instalación llave en mano '
                 'o acompañamiento técnico si ya tienes instalador.'))
    return desc, faqs


def baterias(d):
    t = d['texto']
    mm, mod = marca_modelo(d)
    kwh = d['kv'].get('energía nominal') or d['kv'].get('capacidad') or (d['kwh'] + ' kWh' if d['kwh'] else None)
    v = d['kv'].get('voltaje nominal') or d['kv'].get('tensión nominal') or (d['volt'] + ' V' if d['volt'] else None)
    quim = 'LiFePO4' if re.search(r'LiFePO|litio ferro|LFP', t + ' '.join(d['extra']), re.I) else ('litio' if re.search(r'litio|lithium', t, re.I) else None)
    desc = f'Batería {quim or ""} {mm} {mod}'.replace('  ', ' ').strip() + (f' de {kwh}' if kwh else '') + (f' a {v}' if v else '') + '.'
    desc += ' Guarda la energía de tus paneles para usarla de noche o durante cortes de luz.'
    faqs = []
    k = None
    if kwh:
        try: k = num(re.search(r'[\d.,]+', kwh).group())
        except Exception: k = None
    dod = d['kv'].get('profundidad de descarga (dod)') or d['kv'].get('profundidad de descarga')
    if k and 0.3 < k < 200:
        util = k * 0.9
        faqs.append(('¿Cuántas horas me respalda?', f'Con {fmt(k)} kWh y descargándola hasta un 90 % (unos {fmt(util)} kWh útiles), un consumo continuo de 500 W '
                     f'duraría cerca de {fmt(util / 0.5, 1 if util / 0.5 < 10 else 0)} horas y uno de 1 kW unas {fmt(util, 1 if util < 10 else 0)} horas, sin contar pérdidas del inversor '
                     f'(5–10 %). Nevera, luces, internet y TV suelen sumar 300–600 W.'))
    if dod:
        faqs.append(('¿Qué profundidad de descarga admite?', f'{dod}. Es el porcentaje de la capacidad que se puede usar sin dañar la batería.'))
    ciclos = d['kv'].get('ciclos de vida') or d['kv'].get('ciclos')
    if ciclos:
        faqs.append(('¿Cuántos años dura?', f'El fabricante indica {ciclos}. Con un ciclo diario eso equivale a muchos años de uso; la vida real depende '
                     'de la temperatura y de la profundidad de descarga habitual.'))
    esc = d['kv'].get('escalabilidad')
    if esc:
        faqs.append(('¿Puedo ampliar el banco después?', f'Sí: {esc}. Conviene usar baterías del mismo modelo y de fechas cercanas.'))
    faqs.append(('¿Es compatible con mi inversor?', 'El voltaje del banco debe coincidir con el del inversor' + (f' ({v})' if v else '') +
                 ' y, en baterías de litio, el inversor debe admitir su protocolo de comunicación (CAN o RS485). Te confirmamos la compatibilidad sin costo.'))
    if quim == 'LiFePO4':
        faqs.append(('¿Qué ventajas tiene el LiFePO4?', 'Es la química de litio más segura para uso residencial: soporta miles de ciclos, no requiere '
                     'mantenimiento y entrega casi toda su capacidad, a diferencia de las baterías de plomo.'))
    return desc, faqs


def controladores(d):
    t = d['texto']
    mm, mod = marca_modelo(d)
    tipo = 'MPPT' if 'MPPT' in t.upper() else 'PWM' if 'PWM' in t.upper() else None
    amp = d['kv'].get('corriente máxima') or (d['amp'] + ' A' if d['amp'] else None)
    desc = f'Controlador de carga solar {tipo or ""} {mm} {mod}'.replace('  ', ' ').strip() + (f' de {amp}' if amp else '') + '.'
    desc += ' Regula la carga de las baterías desde los paneles y las protege de sobrecarga y descarga profunda.'
    faqs = []
    if tipo == 'MPPT':
        faqs.append(('¿Qué diferencia hay entre MPPT y PWM?', 'El MPPT busca el punto de máxima potencia del panel y convierte el voltaje sobrante en corriente: '
                     'aprovecha hasta un 30 % más de energía y permite usar paneles de mayor voltaje que la batería. El PWM es más simple y económico, '
                     'pero exige que el panel tenga un voltaje cercano al de la batería.'))
    elif tipo == 'PWM':
        faqs.append(('¿Qué paneles puedo usar con un controlador PWM?', 'Paneles cuyo voltaje de trabajo corresponda a la batería: paneles de 12 V (36 celdas) para '
                     'baterías de 12 V y el doble en serie para 24 V. Con paneles de 60/72 celdas conviene un controlador MPPT.'))
    if amp:
        try:
            a = num(re.search(r'[\d.,]+', amp).group())
            if 5 <= a <= 250:
                faqs.append(('¿Cuántos paneles admite?', f'Con {fmt(a, 0)} A de carga admite aproximadamente {fmt(a * 13.5, 0)} W de paneles con batería de 12 V' + (', ' if tipo == 'MPPT' else ' ') +
                             (f'{fmt(a * 27, 0)} W a 24 V y {fmt(a * 54, 0)} W a 48 V' if tipo == 'MPPT' else f'y {fmt(a * 27, 0)} W a 24 V') +
                             '. Además hay que respetar el voltaje máximo de entrada del controlador (ver ficha técnica).'))
        except Exception:
            pass
    vmax = d['kv'].get('tensión máxima del circuito abierto fotovoltaico') or d['kv'].get('voltaje')
    if vmax and tipo == 'MPPT':
        faqs.append(('¿Cuál es el voltaje máximo de paneles?', f'{vmax}. El voltaje de circuito abierto del arreglo, en su punto más frío, nunca debe superarlo.'))
    faqs.append(('¿Sirve para baterías de litio?', 'Sí, si el controlador permite configurar el perfil de carga de litio (la mayoría de modelos actuales lo hace). '
                 'Te ayudamos a ajustar los parámetros según tu batería.'))
    return desc, faqs


def protecciones(d):
    t = d['texto']
    mm, mod = marca_modelo(d)
    tl = t.lower()
    tipo = ('Interruptor termomagnético (breaker)' if 'breaker' in tl or 'termomagn' in tl or 'mcb' in tl else
            'Protector contra sobretensiones (DPS)' if 'dps' in tl or 'supresor' in tl or 'surge' in tl or 'sup2' in tl else
            'Fusible' if 'fusible' in tl else 'Portafusible' if 'portafusible' in tl else
            'Seccionador' if 'switch' in tl or 'seccionador' in tl or 'aislador' in tl else 'Protección eléctrica')
    amp = d['amp'] + ' A' if d['amp'] else None
    desc = f'{tipo} {mm} {mod}'.strip() + (f' {d["acdc"]}' if d['acdc'] else '') + (f' de {amp}' if amp and 'DPS' not in tipo else '') + \
        (f', {d["polos"]} polos' if d['polos'] else '') + '.'
    desc += {'Interruptor termomagnético (breaker)': ' Protege el circuito contra sobrecargas y cortocircuitos y permite desconectarlo para mantenimiento.',
             'Protector contra sobretensiones (DPS)': ' Desvía a tierra las sobretensiones por rayos y maniobras antes de que dañen inversores, controladores y paneles.',
             'Seccionador': ' Permite desconectar con seguridad el circuito para mantenimiento o emergencias.'}.get(tipo, ' Componente de protección para sistemas solares.')
    faqs = []
    if d['acdc'] == 'DC':
        faqs.append(('¿Por qué usar una protección especial para corriente continua (DC)?', 'En DC el arco eléctrico no se extingue solo como en AC. '
                     'Las protecciones DC están diseñadas para cortar ese arco con seguridad al voltaje del arreglo solar; un breaker AC común no debe usarse en el lado de paneles.'))
    if 'breaker' in tipo:
        faqs.append(('¿Cómo elijo el amperaje?', 'Del lado de paneles, la protección debe soportar al menos 1,25 veces la corriente de cortocircuito (Isc) del string '
                     'y no superar la corriente máxima que admite el cable. Del lado AC se elige según la corriente de salida del inversor.'))
    if 'DPS' in tipo:
        faqs.append(('¿Dónde se instala el DPS?', 'En el tablero de strings (lado DC) cerca del inversor y, del lado AC, en el tablero principal. '
                     'Necesita una buena puesta a tierra para funcionar.'))
    if d['polos']:
        faqs.append(('¿Cuántos polos tiene y para qué?', f'{d["polos"]} polos. En DC se suele usar un polo por conductor (positivo y negativo); '
                     'en AC depende de si el circuito es monofásico, bifásico o trifásico.'))
    faqs.append(('¿Cumple RETIE?', 'Las instalaciones solares en Colombia deben cumplir RETIE; usa protecciones certificadas bajo normas IEC y deja la '
                 'instalación en manos de un técnico. Reiki te asesora en el diseño del tablero.'))
    return desc, faqs


def bombeo(d):
    mm, mod = marca_modelo(d)
    t = d['texto'].lower()
    tipo = 'sumergible' if 'kolos' in t or 'sumergible' in t or 'kol4' in t else 'de superficie' if 'superficie' in t or 'pool' in t else ''
    w = d['w'] or ''
    desc = f'Bomba solar {tipo} {mm} {mod}'.replace('  ', ' ').strip() + (f' de {w} W' if w else '') + '.'
    desc += ' Bombea agua directamente con energía solar para riego, ganadería o uso doméstico, sin factura de energía.'
    faqs = [
        ('¿Necesita baterías?', 'Normalmente no: bombea durante las horas de sol y el agua se almacena en un tanque, que funciona como "batería". '
         'Si necesitas bombear de noche se puede añadir almacenamiento o respaldo de red.'),
        ('¿Cuántos paneles necesita?', 'Se instala una potencia de paneles mayor que la de la bomba para arrancar temprano y mantener el caudal en días nublados. '
         'La cantidad exacta depende de la profundidad del pozo, la altura del tanque y el caudal diario; lo calculamos contigo.'),
        ('¿Qué datos necesito para elegir la bomba?', 'Profundidad del nivel del agua, altura hasta el tanque, distancia de la tubería y litros por día que necesitas. '
         'Con eso elegimos el modelo y el controlador correctos.'),
    ]
    return desc, faqs


def accesorios(d):
    mm, mod = marca_modelo(d)
    tl = d['texto'].lower()
    que = ('Datalogger / módulo de monitoreo' if any(x in tl for x in ['dtu', 'logger', 'dongle', 'shine', 'wifi', 'monitoreo', 'gx']) else
           'Medidor de energía' if 'medidor' in tl or 'meter' in tl or 'vatímetro' in tl else 'Accesorio')
    desc = f'{que} {mm} {mod}'.strip() + '.'
    faqs = []
    if 'Datalogger' in que:
        desc += ' Permite ver en el celular la producción y el estado del sistema solar en tiempo real.'
        faqs.append(('¿Con qué equipos es compatible?', 'Con los inversores o equipos de la misma marca y serie indicados en la ficha técnica. '
                     'Escríbenos con la referencia de tu inversor y te confirmamos.'))
        faqs.append(('¿Necesita internet?', 'Sí, se conecta por Wi-Fi, red cableada o 4G según el modelo para enviar los datos a la aplicación del fabricante.'))
    elif 'Medidor' in que:
        desc += ' Mide la energía que consumes e inyectas para que el inversor controle la exportación o para monitorear el consumo.'
        faqs.append(('¿Para qué sirve con un inversor solar?', 'Permite limitar la inyección a la red (inyección cero), gestionar baterías según el consumo real '
                     'y ver el balance de energía en la aplicación.'))
    else:
        desc += ' Complemento para instalaciones solares.'
        faqs.append(('¿Es compatible con mi equipo?', 'Revisa la referencia y la ficha técnica; si tienes dudas, envíanos la referencia de tu equipo y te confirmamos.'))
    return desc, faqs


def reflectores(d):
    mm, mod = marca_modelo(d)
    w = d['kv'].get('potencia') or (d['w'] + ' W' if d['w'] else '')
    bat = d['kv'].get('bateria') or d['kv'].get('batería')
    desc = f'{d["title"]}.' + (f' Batería de {bat}.' if bat else '') + ' Se carga con el sol durante el día y enciende sola al anochecer, sin cableado ni factura de energía.'
    faqs = [
        ('¿La potencia indicada es la real?', f'La cifra {w} es la potencia comercial con la que se vende este tipo de reflector. '
         'Para comparar, fíjate en la capacidad de la batería y en el tamaño del panel: son los que determinan cuánta luz y cuántas horas entrega.'),
        ('¿Cuántas horas alumbra?', 'Con carga completa suele alumbrar toda la noche en modo automático; en días nublados la autonomía disminuye. '
         'Consulta la ficha y te recomendamos el modelo según las horas que necesitas.'),
        ('¿Necesita cableado?', 'No. El panel solar carga la batería integrada y el equipo se enciende automáticamente al oscurecer.'),
    ]
    return desc, faqs


PLANTILLAS = {'paneles': paneles, 'inversores': inversores, 'baterias': baterias, 'controladores': controladores,
              'protecciones': protecciones, 'bombeo': bombeo, 'accesorios': accesorios, 'reflectores': reflectores}


def construir(d):
    desc, faqs = PLANTILLAS[d['cat']](d)
    desc = re.sub(r'\s+', ' ', desc).strip()
    # una descripción escrita a mano (no la plantilla genérica) se conserva tal cual
    previa = (d['desc'] or '').strip()
    if previa and not re.search(r'Verifica compatibilidad|Equipo para|Resumen elaborado', previa) and len(previa) > 50:
        desc = previa.rstrip('.') + '.'
    if d['serieRef']:
        desc += f' La foto es de referencia de la serie {d["serieRef"]}.'
    desc += ' ' + f_ficha(d)
    return desc, faqs[:6]


# ---------------- escritura ----------------
def escribir(path, t, m, d, desc, faqs):
    fm = m.group(1)
    fm = re.sub(r'^description:.*$', 'description: ' + json.dumps(desc, ensure_ascii=False), fm, count=1, flags=re.M)
    if d['extra']:
        specs = [s for s in d['specs'] if not re.match(r'Especificación principal: especificación no disponible', s)]
        specs += [e for e in d['extra'] if e.split(':')[0].lower() not in {s.split(':')[0].lower() for s in specs}]
        bloque = 'specifications:\n' + '\n'.join('  - ' + json.dumps(s, ensure_ascii=False) for s in specs)
        fm = re.sub(r'^specifications:\n(?:  - .*\n?)+', bloque + '\n', fm + '\n', count=1, flags=re.M).rstrip('\n')
    fm = re.sub(r'^faqs:\n(?:  .*\n?)+', '', fm + '\n', flags=re.M).rstrip('\n')
    if faqs:
        fm += '\nfaqs:\n' + '\n'.join(f'  - pregunta: {json.dumps(q, ensure_ascii=False)}\n    respuesta: {json.dumps(r, ensure_ascii=False)}' for q, r in faqs)
    open(path, 'w', encoding='utf-8').write('---\n' + fm + '\n---\n' + t[m.end():])


def main():
    n, ej = 0, []
    for path in sorted(glob.glob(os.path.join(PROD, '*.md'))):
        slug = os.path.basename(path)[:-3]
        if SOLO and slug not in SOLO:
            continue
        t, m = leer(path)
        fm = m.group(1)
        if campo(fm, 'draft') == 'true':
            continue
        if re.search(r'^faqs:', fm, re.M) and not FORZAR:
            continue
        d = datos(slug, fm)
        if d['cat'] not in PLANTILLAS:
            continue
        desc, faqs = construir(d)
        if len(ej) < 400:
            ej.append({'slug': slug, 'antes': d['desc'], 'despues': desc, 'faqs': faqs, 'specs_nuevas': d['extra']})
        if not DRY:
            escribir(path, t, m, d, desc, faqs)
        n += 1
    json.dump(ej, open(os.path.join(ROOT, 'docs', 'descripciones-cambios.json'), 'w'), indent=1, ensure_ascii=False)
    print('productos actualizados:', n)


if __name__ == '__main__':
    main()
