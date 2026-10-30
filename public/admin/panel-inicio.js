/*
 * Panel Reiki: pantalla de Inicio y página "Por comprar".
 * Usa las utilidades que expone el panel principal en window.reikiSeg
 * (api, esc, cop, fecha, abrir, setCat, upsert, isDemo).
 */
(function () {
  'use strict';

  var S = function () {
    return window.reikiSeg;
  };
  var $ = function (id) {
    return document.getElementById(id);
  };

  /* ---------------- utilidades ---------------- */
  function num(n) {
    return Math.round(Number(n) || 0).toLocaleString('es-CO');
  }
  function corto(n) {
    var v = Number(n) || 0;
    if (Math.abs(v) >= 1e6) return '$' + (v / 1e6).toLocaleString('es-CO', { maximumFractionDigits: 1 }) + ' M';
    if (Math.abs(v) >= 1e3) return '$' + Math.round(v / 1e3).toLocaleString('es-CO') + ' mil';
    return '$' + num(v);
  }
  function hoyLargo(ymd) {
    var d = new Date(ymd + 'T12:00:00-05:00');
    var t = d.toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'America/Bogota' });
    return t.charAt(0).toUpperCase() + t.slice(1);
  }
  function hora(iso) {
    var d = new Date(iso);
    return isNaN(d.getTime()) ? '' : d.toLocaleTimeString('es-CO', { hour: 'numeric', minute: '2-digit', timeZone: 'America/Bogota' });
  }
  function copiar(texto) {
    if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(texto);
    var ta = document.createElement('textarea');
    ta.value = texto;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand('copy');
    } catch (_e) {
      /* nada */
    }
    document.body.removeChild(ta);
    return Promise.resolve();
  }
  var ICONOS = {
    money: 'fa-money-bill-wave',
    cart: 'fa-shopping-cart',
    clock: 'fa-hourglass-half',
    mail: 'fa-envelope',
    truck: 'fa-truck',
    file: 'fa-file-invoice-dollar',
    phone: 'fa-phone',
    send: 'fa-paper-plane',
  };
  var PAGO = {
    completo: ['Pagado', 'ok'],
    anticipo: ['Anticipo recibido', 'ok'],
    parcial: ['Pago parcial', 'amber'],
    sin_pago: ['Sin pago: esperar antes de comprar', 'bad'],
  };
  var COMPRA = [
    ['por_pedir', 'Por pedir'],
    ['pedido', 'Pedido al proveedor'],
    ['recibido', 'Recibido'],
    ['no_aplica', 'No se compra'],
  ];
  function chip(txt, cls) {
    return '<span class="oc-badge oc-badge--' + cls + '">' + S().esc(txt) + '</span>';
  }
  function chipTienda(t) {
    if (!t) return '<span class="pc-muted">No publicado en la tienda</span>';
    var c = t.stock !== 'disponible' ? chip('Pre-orden', 'bad') : t.stockBajo ? chip('Pocas unidades', 'amber') : chip('Disponible', 'ok');
    return '<a class="pc-tienda" href="/tienda/' + S().esc(t.slug) + '" target="_blank" rel="noopener" title="' + S().esc(t.titulo || '') + '">' + c + '</a>';
  }

  /* ================= INICIO ================= */
  async function cargarInicio() {
    var box = $('in-body');
    var stt = $('in-status');
    if (S().isDemo()) {
      stt.textContent = 'La pantalla de inicio solo funciona con sesión real.';
      return;
    }
    stt.textContent = 'Actualizando resumen…';
    try {
      var j = await S().api('inicio');
      stt.textContent = '';
      box.innerHTML = htmlInicio(j);
      enlazarInicio(box);
    } catch (err) {
      stt.textContent = 'No se pudo cargar el resumen: ' + err.message;
    }
  }

  function htmlInicio(j) {
    var esc = S().esc;
    var cop = S().cop;
    var P = j.periodos;
    var E = j.equipos;

    var acciones = j.acciones.length
      ? '<ul class="in-acciones">' +
        j.acciones
          .map(function (a, i) {
            var det = (a.detalle || [])
              .map(function (d) {
                if (d.cot) return '<li><button type="button" class="in-link" data-abrir-cot="' + esc(d.cot) + '">' + esc(d.txt) + '</button></li>';
                return d.id
                  ? '<li><button type="button" class="in-link" data-abrir="' + esc(d.id) + '">' + esc(d.txt) + '</button></li>'
                  : '<li>' + esc(d.txt) + '</li>';
              })
              .join('');
            return (
              '<li class="in-accion in-accion--p' +
              a.prioridad +
              '"><i class="fas ' +
              (ICONOS[a.icono] || 'fa-circle') +
              '" aria-hidden="true"></i><div class="in-accion-main"><div class="in-accion-top"><span>' +
              esc(a.texto) +
              '</span><button type="button" class="btn btn-ghost seg-mini in-ir" data-ir="' +
              esc(a.ir && a.ir.cat) +
              '">Ir</button></div>' +
              (det ? '<details' + (i === 0 ? ' open' : '') + '><summary>Ver cuáles</summary><ul class="in-det">' + det + '</ul></details>' : '') +
              '</div></li>'
            );
          })
          .join('') +
        '</ul>'
      : '<p class="in-ok"><i class="fas fa-check-circle" aria-hidden="true"></i> Todo al día. No hay pendientes urgentes.</p>';

    function celda(k, prev, campo, dinero) {
      var v = P[k][campo];
      var pv = P[prev][campo];
      var txt = dinero ? corto(v) : num(v);
      var ptxt = dinero ? corto(pv) : num(pv);
      var cls = v > pv ? 'up' : v < pv ? 'down' : 'eq';
      return '<td><strong>' + txt + '</strong><small class="in-vs in-vs--' + cls + '"><span class="in-vs-l">' + esc(P[prev].label) + ': </span>' + ptxt + '</small></td>';
    }
    var filas = [
      ['Ventas aprobadas', 'ventas', true],
      ['Número de ventas', 'nVentas', false],
      ['Por la tienda web', 'web', true],
      ['Proyectos', 'proyectos', true],
      ['Cobrado', 'cobrado', true],
      ['Equipos vendidos (unidades)', 'unidades', false],
      ['Entregas a clientes', 'entregas', false],
      ['Proyectos puestos en marcha', 'instalaciones', false],
    ];
    var tabla =
      '<div class="table-wrap in-tabla"><table><thead><tr><th></th><th>Hoy</th><th>Esta semana</th><th>Este mes</th></tr></thead><tbody>' +
      filas
        .map(function (f) {
          return '<tr><th scope="row">' + esc(f[0]) + '</th>' + celda('hoy', 'ayer', f[1], f[2]) + celda('semana', 'semanaAnt', f[1], f[2]) + celda('mes', 'mesAnt', f[1], f[2]) + '</tr>';
        })
        .join('') +
      '</tbody></table></div>';

    var c = E.catalogo;
    var equipos =
      '<div class="in-tiles">' +
      tile('Por pedir', num(E.porPedir), E.porPedirPagado ? num(E.porPedirPagado) + ' ya pagadas' : 'unidades', E.porPedirPagado ? 'alerta' : '') +
      tile('Pedidas al proveedor', num(E.enPedido), 'unidades en camino a Reiki', '') +
      tile('Por entregar', num(E.porEntregar), 'recibidas, falta entregar o instalar', '') +
      tile('Vendidas este mes', num(E.vendidosMes), num(E.vendidosSemana) + ' esta semana', '') +
      '</div>' +
      '<div class="in-catalogo"><div class="in-cat-bar" role="img" aria-label="Catálogo: ' +
      c.disponibles +
      ' disponibles, ' +
      c.preorden +
      ' en pre-orden">' +
      '<span class="in-cat-ok" style="width:' +
      pct(c.disponibles - c.pocas, c.publicados) +
      '%"></span><span class="in-cat-low" style="width:' +
      pct(c.pocas, c.publicados) +
      '%"></span><span class="in-cat-pre" style="width:' +
      pct(c.preorden, c.publicados) +
      '%"></span></div>' +
      '<p class="in-cat-txt"><b>Catálogo de la tienda (' +
      num(c.publicados) +
      ' publicados):</b> <span class="in-dot in-cat-ok"></span>' +
      num(c.disponibles - c.pocas) +
      ' disponibles · <span class="in-dot in-cat-low"></span>' +
      num(c.pocas) +
      ' con pocas unidades · <span class="in-dot in-cat-pre"></span>' +
      num(c.preorden) +
      ' en pre-orden' +
      (c.revision ? ' <span class="pc-muted">· proveedores revisados ' + esc(c.revision) + '</span>' : '') +
      '</p></div>' +
      semaforos(c.categorias || []) +
      '<button type="button" class="btn btn-primary in-ir" data-ir="compras"><i class="fas fa-shopping-cart" aria-hidden="true"></i> Ver qué hay que comprar</button>';

    var ESTADO = { ok: 'Cumple', alerta: 'Mejorar', sin_datos: 'Sin datos aún', info: 'Referencia' };
    var kpis =
      '<div class="in-kpis">' +
      j.kpis
        .map(function (k) {
          var val =
            k.valor == null
              ? '—'
              : k.unidad === '$'
              ? cop(k.valor)
              : num(k.valor) + (k.unidad === '%' ? ' %' : k.unidad ? ' ' + k.unidad : '');
          var meta =
            k.meta == null ? '' : 'Meta: ' + (k.sentido === 'menor' ? '≤ ' : '≥ ') + num(k.meta) + (k.unidad === '%' ? ' %' : k.unidad ? ' ' + k.unidad : '');
          var extra = k.monto ? ' · ' + corto(k.monto) : '';
          var n = k.n != null && k.valor != null ? '<small class="pc-muted">Con ' + k.n + ' dato(s) de los últimos 90 días</small>' : '';
          return (
            '<article class="in-kpi in-kpi--' +
            k.estado +
            '"><div class="in-kpi-top"><h3>' +
            esc(k.nombre) +
            '</h3><span class="in-kpi-st">' +
            ESTADO[k.estado] +
            '</span></div><p class="in-kpi-val">' +
            val +
            extra +
            '</p><p class="in-kpi-meta">' +
            meta +
            '</p><p class="in-kpi-why">' +
            esc(k.porque) +
            '</p>' +
            n +
            '</article>'
          );
        })
        .join('') +
      '</div>';

    var a = j.alegra;
    return (
      '<header class="in-hero"><div><p class="in-fecha">' +
      esc(hoyLargo(j.hoy)) +
      '</p><h2>Resumen de Reiki</h2><p class="in-sub">' +
      j.activos.tienda +
      ' compras y ' +
      j.activos.proyectos +
      ' proyectos en curso' +
      (j.cotizaciones ? ' · ' + j.cotizaciones.abiertas + ' cotizaciones abiertas por ' + corto(j.cotizaciones.valorAbierto) : '') +
      (a ? ' · cartera en Alegra ' + corto(a.cartera) : '') +
      ' · actualizado ' +
      esc(hora(j.generado)) +
      '</p></div></header>' +
      '<div class="in-grid"><section class="in-card"><h2 class="in-h">Para hacer hoy</h2>' +
      acciones +
      '</section><section class="in-card"><h2 class="in-h">Equipos</h2>' +
      equipos +
      '</section></div>' +
      '<section class="in-card"><h2 class="in-h">Ventas y cobros</h2>' +
      tabla +
      '</section>' +
      '<section class="in-card"><h2 class="in-h">Indicadores para mejorar</h2><p class="in-sub2">Qué medimos, la meta y por qué importa. Se calculan con las ventas registradas en el panel; entre más completo esté, más precisos son.</p>' +
      kpis +
      '</section>'
    );
  }
  function semaforos(cats) {
    if (!cats.length) return '';
    var esc = S().esc;
    var TXT = { verde: 'Bien surtida', amarillo: 'Vigilar', rojo: 'Faltan equipos' };
    var n = { verde: 0, amarillo: 0, rojo: 0 };
    cats.forEach(function (k) {
      n[k.semaforo] += 1;
    });
    return (
      '<details class="in-sem"' +
      (n.rojo ? ' open' : '') +
      '><summary><b>Disponibilidad por categoría</b> <span class="in-sem-res">' +
      '<span class="in-luz in-luz--rojo"></span>' + n.rojo +
      ' <span class="in-luz in-luz--amarillo"></span>' + n.amarillo +
      ' <span class="in-luz in-luz--verde"></span>' + n.verde +
      '</span></summary><ul class="in-sem-list">' +
      cats
        .map(function (k) {
          return (
            '<li class="in-sem-row"><span class="in-luz in-luz--' + k.semaforo + '" title="' + TXT[k.semaforo] + '" aria-label="' + TXT[k.semaforo] + '"></span>' +
            '<a href="/tienda/categoria/' + esc(k.slug) + '" target="_blank" rel="noopener">' + esc(k.categoria) + '</a>' +
            '<span class="in-sem-bar" aria-hidden="true"><span class="in-cat-ok" style="width:' + pct(k.disponibles - k.pocas, k.total) + '%"></span><span class="in-cat-low" style="width:' + pct(k.pocas, k.total) + '%"></span><span class="in-cat-pre" style="width:' + pct(k.preorden, k.total) + '%"></span></span>' +
            '<span class="in-sem-num"><b>' + num(k.pctDisp) + ' %</b> <small>' + k.disponibles + '/' + k.total + (k.preorden ? ' · ' + k.preorden + ' pre-orden' : '') + (k.pocas ? ' · ' + k.pocas + ' pocas' : '') + '</small></span></li>'
          );
        })
        .join('') +
      '</ul><p class="pc-muted in-sem-ley"><span class="in-luz in-luz--verde"></span> 90 % o más disponible · <span class="in-luz in-luz--amarillo"></span> 75–89 % o muchos con pocas unidades · <span class="in-luz in-luz--rojo"></span> menos de 75 %</p></details>'
    );
  }
  function pct(a, b) {
    return b ? Math.max(0, Math.round((a / b) * 1000) / 10) : 0;
  }
  function tile(t, v, sub, cls) {
    return '<div class="in-tile' + (cls ? ' in-tile--' + cls : '') + '"><span>' + S().esc(t) + '</span><strong>' + v + '</strong><small>' + S().esc(sub) + '</small></div>';
  }
  function enlazarInicio(box) {
    box.querySelectorAll('[data-ir]').forEach(function (b) {
      b.addEventListener('click', function () {
        var c = b.getAttribute('data-ir');
        if (c) S().setCat(c);
      });
    });
    box.querySelectorAll('[data-abrir]').forEach(function (b) {
      b.addEventListener('click', function () {
        S().abrir(b.getAttribute('data-abrir'));
      });
    });
    box.querySelectorAll('[data-abrir-cot]').forEach(function (b) {
      b.addEventListener('click', function () {
        if (window.reikiCot) window.reikiCot.abrir(b.getAttribute('data-abrir-cot'));
      });
    });
  }

  /* ================= POR COMPRAR ================= */
  var pc = { vista: 'venta', datos: null, proveedor: '' };

  async function cargarCompras() {
    var stt = $('pc-status');
    if (S().isDemo()) {
      stt.textContent = 'Disponible solo con sesión real.';
      return;
    }
    stt.textContent = 'Cargando equipos por comprar…';
    try {
      pc.datos = await S().api('compras');
      stt.textContent = '';
      var n = 0;
      pc.datos.ventas.forEach(function (v) {
        n += v.porPedir;
      });
      var c = document.querySelector('[data-count="compras"]');
      if (c) c.textContent = n ? String(n) : '';
      pintarCompras();
    } catch (err) {
      stt.textContent = 'No se pudo cargar: ' + err.message;
    }
  }

  function pintarCompras() {
    var esc = S().esc;
    var d = pc.datos;
    var body = $('pc-body');
    var provs = d.porProveedor.map(function (p) {
      return p.proveedor;
    });
    var toolbar =
      '<div class="pc-toolbar"><div class="view-toggle" role="group" aria-label="Vista">' +
      '<button type="button" class="view-btn' +
      (pc.vista === 'venta' ? ' is-active' : '') +
      '" data-pc-vista="venta">Por proyecto o pedido</button>' +
      '<button type="button" class="view-btn' +
      (pc.vista === 'proveedor' ? ' is-active' : '') +
      '" data-pc-vista="proveedor">Por proveedor</button></div>' +
      '<select id="pc-prov" aria-label="Proveedor"><option value="">Todos los proveedores</option>' +
      provs
        .map(function (p) {
          return '<option' + (p === pc.proveedor ? ' selected' : '') + '>' + esc(p) + '</option>';
        })
        .join('') +
      '</select></div>';

    var resumen =
      '<div class="pc-resumen">' +
      d.porProveedor
        .filter(function (p) {
          return !pc.proveedor || p.proveedor === pc.proveedor;
        })
        .map(function (p) {
          return (
            '<button type="button" class="pc-prov-pill' +
            (p.proveedor === 'Por confirmar' ? ' pc-prov-pill--pend' : '') +
            '" data-pc-filtro="' +
            esc(p.proveedor) +
            '"><b>' +
            esc(p.proveedor) +
            '</b> ' +
            p.porPedir +
            ' por pedir' +
            (p.pedidas ? ' · ' + p.pedidas + ' pedidas' : '') +
            '</button>'
          );
        })
        .join('') +
      '</div>';

    var contenido = pc.vista === 'venta' ? htmlPorVenta(d) : htmlPorProveedor(d);
    if (!d.ventas.length)
      contenido =
        '<div class="seg-empty"><p>No hay equipos por comprar.</p><p class="seg-hint">Cuando se apruebe una compra o un proyecto, sus equipos aparecen aquí hasta que lleguen del proveedor.</p></div>';
    body.innerHTML = toolbar + (d.ventas.length ? resumen : '') + contenido;
    enlazarCompras(body);
  }

  function filaItem(v, it) {
    var esc = S().esc;
    var editable = ['por_pedir', 'pedido', 'comprado', 'no_aplica'].indexOf(it.estado) >= 0;
    var estadoCompra = it.compra ? it.compra.estado : it.estado === 'comprado' ? 'recibido' : it.estado === 'pedido' ? 'pedido' : 'por_pedir';
    var sel = editable
      ? '<select data-pc-estado="' +
        esc(v.id) +
        '|' +
        it.idx +
        '" aria-label="Estado de compra">' +
        COMPRA.map(function (o) {
          return '<option value="' + o[0] + '"' + (o[0] === estadoCompra ? ' selected' : '') + '>' + o[1] + '</option>';
        }).join('') +
        '</select>'
      : chip(pc.datos.estados[it.estado] || it.estado, 'ok');
    return (
      '<tr class="pc-row pc-row--' +
      it.estado +
      '"><td class="pc-cant">' +
      it.cantidad +
      '</td><td>' +
      esc(it.nombre) +
      (it.codigoProveedor ? '<small class="pc-muted">Cód. proveedor: ' + esc(it.codigoProveedor) + '</small>' : '') +
      '</td><td>' +
      esc(it.proveedor) +
      '</td><td>' +
      chipTienda(it.tienda) +
      '</td><td>' +
      sel +
      '</td><td><input class="pc-nota" data-pc-nota="' +
      esc(v.id) +
      '|' +
      it.idx +
      '" value="' +
      esc(it.compra && it.compra.nota ? it.compra.nota : '') +
      '" placeholder="N.º de pedido o factura" aria-label="Referencia del pedido" /></td></tr>'
    );
  }

  function htmlPorVenta(d) {
    var esc = S().esc;
    return d.ventas
      .map(function (v) {
        var items = v.items.filter(function (it) {
          return !pc.proveedor || it.proveedor === pc.proveedor;
        });
        if (!items.length) return '';
        var pg = PAGO[v.pago] || ['', ''];
        var pend = items.filter(function (it) {
          return it.estado === 'por_pedir';
        });
        return (
          '<article class="pc-venta"><header class="pc-venta-h"><div><p class="modal-kicker">' +
          (v.tipo === 'proyecto' ? 'Proyecto' : 'Compra en tienda') +
          (v.cotizacion ? ' · ' + esc(v.cotizacion) : '') +
          '</p><h3><button type="button" class="in-link" data-abrir="' +
          esc(v.id) +
          '">' +
          esc(v.titulo) +
          '</button></h3><p class="pc-muted">' +
          esc([v.cliente !== v.titulo ? v.cliente : '', v.ciudad].filter(Boolean).join(' · ')) +
          '</p></div><div class="pc-venta-st">' +
          chip(pg[0], pg[1]) +
          (v.diasDesdePago != null && pend.length
            ? '<small class="' +
              (v.diasDesdePago >= 1 ? 'pc-alerta' : 'pc-muted') +
              '">' +
              (v.diasDesdePago < 1 ? 'Pagó hoy: pedir hoy mismo' : 'Pagó hace ' + v.diasDesdePago + ' día(s) y falta pedir') +
              '</small>'
            : '') +
          '</div></header>' +
          '<div class="table-wrap"><table class="pc-tabla"><thead><tr><th>Cant.</th><th>Equipo</th><th>Proveedor</th><th>En la tienda</th><th>Compra</th><th>Referencia</th></tr></thead><tbody>' +
          items
            .map(function (it) {
              return filaItem(v, it);
            })
            .join('') +
          '</tbody></table></div>' +
          (pend.length > 1
            ? '<div class="pc-acciones"><button type="button" class="btn btn-secondary seg-mini" data-pc-todo="' +
              esc(v.id) +
              '">Marcar los ' +
              pend.length +
              ' por pedir como pedidos</button></div>'
            : '') +
          '</article>'
        );
      })
      .join('');
  }

  function htmlPorProveedor(d) {
    var esc = S().esc;
    return d.porProveedor
      .filter(function (p) {
        return !pc.proveedor || p.proveedor === pc.proveedor;
      })
      .map(function (p) {
        var grupos = {};
        p.lineas.forEach(function (l) {
          var k = l.nombre + '|' + (l.codigo || '');
          var g = (grupos[k] = grupos[k] || { nombre: l.nombre, codigo: l.codigo, porPedir: 0, pedidas: 0, ventas: [] });
          if (l.estado === 'por_pedir') g.porPedir += l.cantidad;
          else g.pedidas += l.cantidad;
          g.ventas.push(l);
        });
        var listos = p.lineas.filter(function (l) {
          return l.estado === 'por_pedir' && l.pago !== 'sin_pago';
        });
        var sinPago = p.lineas.filter(function (l) {
          return l.estado === 'por_pedir' && l.pago === 'sin_pago';
        });
        var filas = Object.keys(grupos)
          .map(function (k) {
            var g = grupos[k];
            return (
              '<tr><td class="pc-cant">' +
              (g.porPedir || '—') +
              '</td><td>' +
              esc(g.nombre) +
              (g.codigo ? '<small class="pc-muted">Cód.: ' + esc(g.codigo) + '</small>' : '') +
              '<small class="pc-muted">' +
              g.ventas
                .map(function (l) {
                  return esc(l.cantidad + ' para ' + l.titulo) + (l.estado === 'pedido' ? ' (ya pedido)' : l.pago === 'sin_pago' ? ' (sin pago)' : '');
                })
                .join(' · ') +
              '</small></td><td>' +
              (g.pedidas || '—') +
              '</td></tr>'
            );
          })
          .join('');
        return (
          '<article class="pc-venta"><header class="pc-venta-h"><div><h3>' +
          esc(p.proveedor) +
          '</h3><p class="pc-muted">' +
          p.porPedir +
          ' unidades por pedir · ' +
          p.pedidas +
          ' ya pedidas</p></div></header>' +
          '<div class="table-wrap"><table class="pc-tabla"><thead><tr><th>Por pedir</th><th>Equipo y para qué venta</th><th>Pedidas</th></tr></thead><tbody>' +
          filas +
          '</tbody></table></div>' +
          (p.proveedor === 'Por confirmar'
            ? '<p class="pc-alerta pc-nota-pie">Estos equipos no tienen proveedor. Ábrelos en la venta y escribe el proveedor en la tabla de equipos.</p>'
            : '') +
          (listos.length && p.proveedor !== 'Por confirmar'
            ? '<div class="pc-acciones"><button type="button" class="btn btn-ghost seg-mini" data-pc-copiar="' +
              esc(p.proveedor) +
              '"><i class="fas fa-copy" aria-hidden="true"></i> Copiar pedido</button><input class="pc-nota" id="pc-ref-' +
              esc(p.proveedor.replace(/\W/g, '')) +
              '" placeholder="N.º de pedido (opcional)" aria-label="Número de pedido" /><button type="button" class="btn btn-primary seg-mini" data-pc-pedir="' +
              esc(p.proveedor) +
              '">Marcar ' +
              listos.length +
              ' línea(s) como pedidas</button></div>'
            : '') +
          (sinPago.length ? '<p class="pc-muted pc-nota-pie">' + sinPago.length + ' línea(s) de ventas sin pago no se incluyen al copiar ni al marcar.</p>' : '') +
          '</article>'
        );
      })
      .join('');
  }

  async function guardar(cambios, msg) {
    var stt = $('pc-status');
    stt.textContent = msg || 'Guardando…';
    try {
      var j = await S().api('compra', { cambios: cambios });
      (j.expedientes || []).forEach(function (e) {
        S().upsert(e);
      });
      await cargarCompras();
      stt.textContent = 'Guardado.';
      setTimeout(function () {
        if (stt.textContent === 'Guardado.') stt.textContent = '';
      }, 2500);
    } catch (err) {
      stt.textContent = 'No se pudo guardar: ' + err.message;
    }
  }

  function textoPedido(p) {
    var hoy = new Date().toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'America/Bogota' });
    var grupos = {};
    p.lineas.forEach(function (l) {
      if (l.estado !== 'por_pedir' || l.pago === 'sin_pago') return;
      var k = l.nombre + '|' + (l.codigo || '');
      grupos[k] = grupos[k] || { nombre: l.nombre, codigo: l.codigo, n: 0 };
      grupos[k].n += l.cantidad;
    });
    return (
      'Hola, buen día. Pedido de Reiki Energía Solar SAS (NIT 901942389) — ' +
      hoy +
      ':\n' +
      Object.keys(grupos)
        .map(function (k) {
          var g = grupos[k];
          return '• ' + g.n + ' × ' + g.nombre + (g.codigo ? ' (ref. ' + g.codigo + ')' : '');
        })
        .join('\n') +
      '\n\n¿Nos confirman disponibilidad, valor y tiempo de despacho? Gracias.'
    );
  }

  function enlazarCompras(body) {
    body.querySelectorAll('[data-pc-vista]').forEach(function (b) {
      b.addEventListener('click', function () {
        pc.vista = b.getAttribute('data-pc-vista');
        pintarCompras();
      });
    });
    var sp = $('pc-prov');
    if (sp)
      sp.addEventListener('change', function () {
        pc.proveedor = sp.value;
        pintarCompras();
      });
    body.querySelectorAll('[data-pc-filtro]').forEach(function (b) {
      b.addEventListener('click', function () {
        var v = b.getAttribute('data-pc-filtro');
        pc.proveedor = pc.proveedor === v ? '' : v;
        pintarCompras();
      });
    });
    body.querySelectorAll('[data-abrir]').forEach(function (b) {
      b.addEventListener('click', function () {
        S().abrir(b.getAttribute('data-abrir'));
      });
    });
    body.querySelectorAll('[data-pc-estado]').forEach(function (s) {
      s.addEventListener('change', function () {
        var k = s.getAttribute('data-pc-estado').split('|');
        var nota = body.querySelector('[data-pc-nota="' + k[0] + '|' + k[1] + '"]');
        guardar([{ id: k[0], idx: Number(k[1]), estado: s.value, nota: nota ? nota.value : undefined }]);
      });
    });
    body.querySelectorAll('[data-pc-nota]').forEach(function (inp) {
      inp.addEventListener('change', function () {
        var k = inp.getAttribute('data-pc-nota').split('|');
        var s = body.querySelector('[data-pc-estado="' + k[0] + '|' + k[1] + '"]');
        guardar([{ id: k[0], idx: Number(k[1]), estado: s ? s.value : 'pedido', nota: inp.value }]);
      });
    });
    body.querySelectorAll('[data-pc-todo]').forEach(function (b) {
      b.addEventListener('click', function () {
        var id = b.getAttribute('data-pc-todo');
        var v = pc.datos.ventas.find(function (x) {
          return x.id === id;
        });
        if (!v) return;
        guardar(
          v.items
            .filter(function (it) {
              return it.estado === 'por_pedir' && (!pc.proveedor || it.proveedor === pc.proveedor);
            })
            .map(function (it) {
              return { id: id, idx: it.idx, estado: 'pedido' };
            }),
          'Marcando como pedidos…'
        );
      });
    });
    body.querySelectorAll('[data-pc-copiar]').forEach(function (b) {
      b.addEventListener('click', function () {
        var p = pc.datos.porProveedor.find(function (x) {
          return x.proveedor === b.getAttribute('data-pc-copiar');
        });
        if (!p) return;
        copiar(textoPedido(p)).then(function () {
          b.innerHTML = '<i class="fas fa-check" aria-hidden="true"></i> Copiado';
          setTimeout(function () {
            b.innerHTML = '<i class="fas fa-copy" aria-hidden="true"></i> Copiar pedido';
          }, 2000);
        });
      });
    });
    body.querySelectorAll('[data-pc-pedir]').forEach(function (b) {
      b.addEventListener('click', function () {
        var nombre = b.getAttribute('data-pc-pedir');
        var p = pc.datos.porProveedor.find(function (x) {
          return x.proveedor === nombre;
        });
        if (!p) return;
        var ref = $('pc-ref-' + nombre.replace(/\W/g, ''));
        guardar(
          p.lineas
            .filter(function (l) {
              return l.estado === 'por_pedir' && l.pago !== 'sin_pago';
            })
            .map(function (l) {
              return { id: l.id, idx: l.idx, estado: 'pedido', nota: ref && ref.value ? ref.value : undefined };
            }),
          'Marcando como pedidos…'
        );
      });
    });
  }

  window.reikiPanes = window.reikiPanes || {};
  window.reikiPanes.inicio = cargarInicio;
  window.reikiPanes.compras = cargarCompras;
})();
