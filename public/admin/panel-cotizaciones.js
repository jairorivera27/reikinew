/*
 * Panel Reiki: sección "Cotizaciones".
 * Todas las cotizaciones (chats de Claude, página web, bot de WhatsApp, panel) con envío por correo,
 * seguimiento y paso a Aceptada (crea la venta) o Rechazada.
 */
(function () {
  'use strict';

  var S = function () {
    return window.reikiSeg;
  };
  var $ = function (id) {
    return document.getElementById(id);
  };
  var EST = {
    por_enviar: ['Por enviar', 'amber'],
    enviada: ['Enviada', 'info'],
    seguimiento: ['En seguimiento', 'info'],
    aceptada: ['Aceptada', 'ok'],
    rechazada: ['Rechazada', 'bad'],
  };
  var ORIGEN = { chat: 'Claude', web: 'Página web', whatsapp: 'WhatsApp', panel: 'Panel' };
  var FILTROS = [
    ['hoy', 'Seguimiento hoy'],
    ['abiertas', 'Abiertas'],
    ['por_enviar', 'Por enviar'],
    ['enviada', 'Enviadas'],
    ['seguimiento', 'En seguimiento'],
    ['aceptada', 'Aceptadas'],
    ['rechazada', 'Rechazadas'],
    ['todas', 'Todas'],
  ];
  var MOTIVOS = ['Precio', 'Compró a otro proveedor', 'No respondió', 'Pospuso el proyecto', 'Sin presupuesto', 'Equipo no disponible', 'Otro'];
  var st = { items: [], filtro: 'abiertas', q: '', origen: '', abierta: null, panel: '' };

  function esc(s) {
    return S().esc(s);
  }
  function cop(n) {
    return S().cop(n);
  }
  function hoy() {
    return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' });
  }
  function sumar(n) {
    var d = new Date(hoy() + 'T12:00:00Z');
    d.setUTCDate(d.getUTCDate() + n);
    if (d.getUTCDay() === 0) d.setUTCDate(d.getUTCDate() + 1);
    return d.toISOString().slice(0, 10);
  }
  function fCorta(ymd) {
    if (!ymd) return '';
    var d = new Date(String(ymd).length <= 10 ? ymd + 'T12:00:00-05:00' : ymd);
    if (isNaN(d.getTime())) return String(ymd);
    return d.toLocaleDateString('es-CO', { day: 'numeric', month: 'short', timeZone: 'America/Bogota' });
  }
  function fLarga(iso) {
    var d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString('es-CO', { day: 'numeric', month: 'long', timeZone: 'America/Bogota' });
  }
  function primerNombre(c) {
    var n = String((c.cliente && (c.cliente.contacto || c.cliente.nombre)) || '').trim();
    if (!n) return '';
    if (/\b(s\.?a\.?s|ltda|s\.?a\b|e\.?s\.?p|bic|asociaci|comunidad|ut\b)/i.test(n)) return '';
    var p = n.split(/\s+/)[0];
    return p.charAt(0).toUpperCase() + p.slice(1).toLowerCase();
  }
  function chip(estado) {
    var e = EST[estado] || [estado, ''];
    return '<span class="oc-badge oc-badge--' + e[1] + '">' + esc(e[0]) + '</span>';
  }

  /* ---------------- datos ---------------- */
  async function cargar() {
    var stt = $('ct-status');
    if (S().isDemo()) {
      stt.textContent = 'Disponible solo con sesión real.';
      return;
    }
    stt.textContent = 'Cargando cotizaciones…';
    try {
      var j = await S().api('cot-list');
      st.items = j.cotizaciones || [];
      stt.textContent = '';
      contar();
      pintar();
      if (st.abierta) abrir(st.abierta);
    } catch (err) {
      stt.textContent = 'No se pudo cargar: ' + err.message;
    }
  }
  function contar() {
    var n = st.items.filter(function (c) {
      return c.resumen.seguimientoVencido || c.estado === 'por_enviar';
    }).length;
    var el = document.querySelector('[data-count="cotizaciones"]');
    if (el) el.textContent = n ? String(n) : '';
  }
  function upsert(c) {
    var i = st.items.findIndex(function (x) {
      return x.id === c.id;
    });
    if (i >= 0) st.items[i] = c;
    else st.items.unshift(c);
    contar();
  }
  function pasa(c) {
    var f = st.filtro;
    if (f === 'hoy' && !c.resumen.seguimientoVencido) return false;
    if (f === 'abiertas' && !c.resumen.abierta) return false;
    if (['por_enviar', 'enviada', 'seguimiento', 'aceptada', 'rechazada'].indexOf(f) >= 0 && c.estado !== f) return false;
    if (st.origen && (c.origen || 'chat') !== st.origen) return false;
    if (!st.q) return true;
    var q = st.q.toLowerCase();
    return [c.numero, c.id, c.titulo, c.descripcion, c.cliente && c.cliente.nombre, c.cliente && c.cliente.ciudad, c.cliente && c.cliente.celular, c.cliente && c.cliente.correo]
      .concat(
        (c.items || []).map(function (i) {
          return i.nombre;
        })
      )
      .join(' ')
      .toLowerCase()
      .indexOf(q) >= 0;
  }

  /* ---------------- lista ---------------- */
  function pintar() {
    var cont = $('ct-body');
    var todas = st.items;
    var abiertas = todas.filter(function (c) {
      return c.resumen.abierta;
    });
    var cerradas = todas.filter(function (c) {
      return c.estado === 'aceptada' || c.estado === 'rechazada';
    });
    var acept = cerradas.filter(function (c) {
      return c.estado === 'aceptada';
    });
    var mes = hoy().slice(0, 7);
    var delMes = todas.filter(function (c) {
      return String(c.creada || '').slice(0, 7) === mes;
    });
    var metricas =
      '<section class="seg-metrics">' +
      met('Abiertas', abiertas.length + ' · ' + cop(sum(abiertas))) +
      met('Seguimiento hoy', todas.filter(function (c) {
        return c.resumen.seguimientoVencido;
      }).length) +
      met('Hechas este mes', delMes.length + ' · ' + cop(sum(delMes))) +
      met('Aceptadas', cerradas.length ? Math.round((acept.length / cerradas.length) * 100) + ' % (' + acept.length + ' de ' + cerradas.length + ')' : '—') +
      '</section>';
    var conteo = {};
    FILTROS.forEach(function (f) {
      conteo[f[0]] = 0;
    });
    todas.forEach(function (c) {
      if (c.resumen.seguimientoVencido) conteo.hoy++;
      if (c.resumen.abierta) conteo.abiertas++;
      conteo[c.estado] = (conteo[c.estado] || 0) + 1;
      conteo.todas++;
    });
    var chips =
      '<div class="ct-filtros" role="group" aria-label="Estado">' +
      FILTROS.map(function (f) {
        return (
          '<button type="button" class="ct-chip' +
          (st.filtro === f[0] ? ' is-active' : '') +
          (f[0] === 'hoy' && conteo.hoy ? ' ct-chip--alerta' : '') +
          '" data-ct-filtro="' +
          f[0] +
          '">' +
          esc(f[1]) +
          ' <b>' +
          conteo[f[0]] +
          '</b></button>'
        );
      }).join('') +
      '</div>';
    var lista = todas.filter(pasa);
    lista.sort(function (a, b) {
      var va = a.resumen.seguimientoVencido ? 0 : 1;
      var vb = b.resumen.seguimientoVencido ? 0 : 1;
      if (va !== vb) return va - vb;
      if (a.resumen.abierta && b.resumen.abierta) return String(a.proximoSeguimiento || '9').localeCompare(String(b.proximoSeguimiento || '9'));
      return String(b.updatedAt || b.creada).localeCompare(String(a.updatedAt || a.creada));
    });
    var cards = lista.length
      ? '<section class="seg-grid">' + lista.map(card).join('') + '</section>'
      : '<div class="seg-empty"><p>No hay cotizaciones en esta vista.</p><p class="seg-hint">Las cotizaciones que hace Claude en cualquier chat y las que generan los clientes en la página o por WhatsApp aparecen aquí solas.</p></div>';
    cont.innerHTML = metricas + chips + cards;
    cont.querySelectorAll('[data-ct-filtro]').forEach(function (b) {
      b.addEventListener('click', function () {
        st.filtro = b.getAttribute('data-ct-filtro');
        pintar();
      });
    });
    cont.querySelectorAll('[data-cot]').forEach(function (n) {
      n.addEventListener('click', function () {
        abrir(n.getAttribute('data-cot'));
      });
      n.addEventListener('keydown', function (ev) {
        if (ev.key === 'Enter') abrir(n.getAttribute('data-cot'));
      });
    });
  }
  function sum(arr) {
    return arr.reduce(function (a, c) {
      return a + (c.total || 0);
    }, 0);
  }
  function met(t, v) {
    return '<div class="seg-metric"><span>' + esc(t) + '</span><strong>' + esc(v) + '</strong></div>';
  }
  function card(c) {
    var r = c.resumen;
    var linea = '';
    if (c.estado === 'aceptada') linea = 'Aceptada ' + fCorta(c.cerrada) + (c.expedienteId ? ' · venta ' + c.expedienteId : '');
    else if (c.estado === 'rechazada') linea = 'Rechazada' + (c.motivoRechazo ? ': ' + c.motivoRechazo : '');
    else if (c.estado === 'por_enviar')
      linea =
        c.origen === 'web' || c.origen === 'whatsapp'
          ? 'La generó el cliente el ' + fCorta(c.creada) + ' · sin contactar'
          : 'Hecha ' + fCorta(c.creada) + ' · aún no se le envía al cliente';
    else linea = (r.diasDesdeEnvio != null ? 'Enviada hace ' + r.diasDesdeEnvio + ' día(s)' : 'Enviada') + (c.proximoSeguimiento ? ' · seguimiento ' + fCorta(c.proximoSeguimiento) : '');
    return (
      '<article class="seg-card ct-card' +
      (r.seguimientoVencido ? ' ct-card--hoy' : '') +
      '" tabindex="0" data-cot="' +
      esc(c.id) +
      '"><div class="seg-card-head">' +
      chip(c.estado) +
      '<span class="seg-id">' +
      esc(c.numero || c.id) +
      '</span></div><h3>' +
      esc((c.cliente && c.cliente.nombre) || c.titulo) +
      '</h3><p class="seg-sub">' +
      esc([c.descripcion && c.descripcion.length < 90 ? c.descripcion : '', c.cliente && c.cliente.ciudad].filter(Boolean).join(' · ')) +
      '</p><p class="seg-next' +
      (r.seguimientoVencido ? ' ct-hoy' : '') +
      '">' +
      (r.seguimientoVencido ? '<i class="fas fa-phone" aria-hidden="true"></i> Hacer seguimiento hoy · ' : '') +
      esc(linea) +
      '</p><div class="seg-card-foot"><span class="ct-origen">' +
      esc((c.tipo === 'proyecto' ? 'Proyecto' : 'Equipos') + ' · ' + (ORIGEN[c.origen] || 'Claude')) +
      (r.tienePdf ? ' · PDF' : '') +
      '</span><strong>' +
      cop(c.total) +
      '</strong></div></article>'
    );
  }

  /* ---------------- detalle ---------------- */
  function modal() {
    var m = $('ct-modal');
    if (m) return m;
    m = document.createElement('div');
    m.id = 'ct-modal';
    m.className = 'modal';
    m.hidden = true;
    m.innerHTML =
      '<div class="modal-backdrop" data-ct-close="1"></div><div class="modal-card seg-modal-card" role="dialog" aria-modal="true" aria-labelledby="ct-title"><button type="button" class="modal-x" data-ct-close="1" aria-label="Cerrar">&times;</button><div id="ct-modal-body"></div></div>';
    document.body.appendChild(m);
    m.addEventListener('click', function (ev) {
      if (ev.target && ev.target.getAttribute('data-ct-close')) cerrar();
    });
    document.addEventListener('keydown', function (ev) {
      if (ev.key === 'Escape' && !m.hidden) cerrar();
    });
    return m;
  }
  function cerrar() {
    modal().hidden = true;
    st.abierta = null;
    st.panel = '';
  }
  function cot(id) {
    return st.items.find(function (x) {
      return x.id === id;
    });
  }

  function plantilla(c, tipo) {
    var n = primerNombre(c);
    var saludo = 'Buen día' + (n ? ', ' + n : '') + ':';
    var desc = c.descripcion && c.descripcion.length < 140 && !/generada por el cliente/i.test(c.descripcion) ? ' (' + c.descripcion + ')' : '';
    var firma =
      '\n\nCordialmente,\n\nAlexander Rivera\nAsesor comercial · Reiki Energía Solar S.A.S.\n+57 300 405 2638 · info@reikisolar.com.co\nwww.reikisolar.com.co';
    if (tipo === 'seguimiento') {
      var env = c.resumen.ultimoEnvio ? ' el ' + fLarga(c.resumen.ultimoEnvio) : '';
      return {
        asunto: 'Seguimiento a su cotización ' + (c.numero || c.id) + ' | Reiki Energía Solar',
        cuerpo:
          saludo +
          '\n\nLe escribimos para saber si pudo revisar la cotización ' +
          (c.numero || c.id) +
          ' que le enviamos' +
          env +
          ', por ' +
          cop(c.total) +
          '.\n\n¿Tiene alguna pregunta sobre los equipos o desea que ajustemos algo (cantidades, referencias o forma de pago)? Con gusto le enviamos una nueva versión.\n\nLos precios están sujetos a la disponibilidad del inventario; si desea avanzar, le confirmamos existencias y tiempos de entrega.\n\nQuedamos atentos.' +
          firma,
      };
    }
    return {
      asunto: 'Cotización ' + (c.numero || c.id) + ' | Reiki Energía Solar',
      cuerpo:
        saludo +
        '\n\nAdjuntamos la cotización ' +
        (c.numero || c.id) +
        desc +
        ', por un valor total de ' +
        cop(c.total) +
        ' (IVA incluido).' +
        (c.validez ? '\n\nValidez de la oferta: ' + c.validez + '.' : '') +
        '\n\nQuedamos atentos a sus comentarios. Si desea ajustar equipos, cantidades o la forma de pago, con gusto le enviamos una nueva versión. Para confirmar su pedido puede responder este correo o escribirnos por WhatsApp al +57 300 405 2638.' +
        firma,
    };
  }
  /* ---------- mensaje para pedir los datos al aprobar ---------- */
  function faltantes(c, venta) {
    var cl = Object.assign({}, c.cliente || {}, (venta && venta.cliente) || {});
    var empresa = /\b(s\.?a\.?s|ltda|s\.?a\b|e\.?s\.?p|bic|asociaci|comunidad|universidad|fundaci|cooperativa|ut\b)/i.test(cl.nombre || '') || String(cl.tipoDoc || '').toUpperCase() === 'NIT';
    var f = [];
    if (!cl.nombre || cl.nombre.split(/\s+/).length < 2) f.push(empresa ? 'Razón social completa' : 'Nombre completo');
    if (!cl.documento) f.push(empresa ? 'NIT y RUT actualizado (adjunto)' : 'Número de cédula');
    else if (empresa) f.push('RUT actualizado (adjunto)');
    if (!cl.correo) f.push('Correo electrónico para recibir la factura electrónica');
    if (!cl.celular) f.push('Celular de contacto');
    if (c.tipo === 'proyecto') {
      if (!cl.direccion) f.push('Dirección exacta del predio donde se hará la instalación (barrio o vereda, municipio)');
      f.push('Foto de la última factura de energía (para el número de cuenta ante el operador de red)');
      f.push('Nombre y celular de la persona que nos recibirá en el sitio');
    } else {
      if (!cl.direccion) f.push('Dirección completa de entrega (barrio, ciudad y departamento)');
      f.push('Nombre y celular de quien recibe el pedido');
    }
    var r = venta && venta.resumen;
    var falta = r ? r.saldo > 0 && r.porVerificar <= 0 : true;
    return { lista: f, pago: falta, saldo: r ? r.saldo : c.total, empresa: empresa };
  }
  function textoDatos(c, venta, canal) {
    var F = faltantes(c, venta);
    var n = primerNombre(c);
    var num = c.numero || c.id;
    var wa = canal === 'whatsapp';
    var lineas = F.lista.map(function (x, i) {
      return (i + 1) + '. ' + x;
    });
    if (F.pago)
      lineas.push(
        (lineas.length + 1) +
          '. Comprobante de pago' +
          (c.tipo === 'proyecto' && c.condicionesPago ? ' del anticipo (forma de pago ' + c.condicionesPago + ')' : '') +
          '. Puede pagar por transferencia a Bancolombia, cuenta de ahorros 366-000084-77 a nombre de Reiki Energía Solar SAS, o con la llave Bre-B 0089262235.'
      );
    var intro =
      (wa ? 'Hola' + (n ? ' ' + n : '') + ', ¡muchas gracias por aprobar la cotización ' + num + '! 🙌' : 'Buen día' + (n ? ', ' + n : '') + ':\n\nMuchas gracias por aprobar la cotización ' + num + '.') +
      (c.tipo === 'proyecto'
        ? ' Para registrar su proyecto, programar la visita técnica y emitir la factura electrónica, por favor ' + (wa ? 'compártanos' : 'envíenos') + ':'
        : ' Para registrar su pedido, despacharlo y emitir la factura electrónica, por favor ' + (wa ? 'compártanos' : 'envíenos') + ':');
    var cierre = wa
      ? 'Apenas los tengamos le confirmamos ' + (c.tipo === 'proyecto' ? 'la fecha de la visita técnica' : 'el despacho') + '. ¡Gracias! ☀️\n\nAlexander Rivera – Reiki Energía Solar'
      : 'Puede responder este correo con la información y los adjuntos. Apenas la recibamos le confirmamos ' +
        (c.tipo === 'proyecto' ? 'la fecha de la visita técnica' : 'el despacho') +
        '.\n\nCordialmente,\n\nAlexander Rivera\nAsesor comercial · Reiki Energía Solar S.A.S.\n+57 300 405 2638 · info@reikisolar.com.co\nwww.reikisolar.com.co';
    if (!lineas.length) return '';
    return intro + '\n\n' + lineas.join('\n') + '\n\n' + cierre;
  }

  function waLink(c) {
    var cel = String((c.cliente && c.cliente.celular) || '').replace(/\D/g, '');
    if (!cel) return '';
    if (cel.length === 10) cel = '57' + cel;
    var n = primerNombre(c);
    var txt =
      'Hola' +
      (n ? ' ' + n : '') +
      ', le saluda Alexander de Reiki Energía Solar. ' +
      (c.estado === 'por_enviar'
        ? 'Le comparto la cotización ' + (c.numero || c.id) + ' por ' + cop(c.total) + '.' + (c.pdfUrl ? ' Puede verla aquí: ' + c.pdfUrl : '')
        : '¿Pudo revisar la cotización ' + (c.numero || c.id) + ' por ' + cop(c.total) + '? Quedo atento a sus comentarios o a cualquier ajuste.');
    return 'https://wa.me/' + cel + '?text=' + encodeURIComponent(txt);
  }

  function abrir(id) {
    var c = cot(id);
    if (!c) return;
    st.abierta = id;
    var m = modal();
    var body = $('ct-modal-body');
    var cl = c.cliente || {};
    var r = c.resumen;
    var abierta = r.abierta;
    var wa = waLink(c);

    var acciones =
      '<div class="ct-acciones">' +
      (r.tienePdf ? '<button type="button" class="btn btn-ghost seg-mini" data-ct-pdf><i class="fas fa-file-pdf" aria-hidden="true"></i> Ver PDF</button>' : '') +
      (abierta
        ? '<button type="button" class="btn btn-primary seg-mini" data-ct-panel="envio"><i class="fas fa-paper-plane" aria-hidden="true"></i> ' +
          (c.estado === 'por_enviar' ? 'Enviar al cliente' : 'Reenviar') +
          '</button>' +
          (c.estado !== 'por_enviar' ? '<button type="button" class="btn btn-secondary seg-mini" data-ct-panel="seguimiento-correo"><i class="fas fa-envelope" aria-hidden="true"></i> Correo de seguimiento</button>' : '') +
          (wa ? '<a class="btn btn-wa seg-mini" href="' + esc(wa) + '" target="_blank" rel="noopener" data-ct-wa><i class="fab fa-whatsapp" aria-hidden="true"></i> WhatsApp</a>' : '') +
          '<button type="button" class="btn btn-ghost seg-mini" data-ct-panel="nota"><i class="fas fa-phone" aria-hidden="true"></i> Registrar seguimiento</button>' +
          '<button type="button" class="btn btn-ghost seg-mini ct-ok" data-ct-panel="aceptar"><i class="fas fa-check" aria-hidden="true"></i> Aceptada</button>' +
          '<button type="button" class="btn btn-ghost seg-mini ct-no" data-ct-panel="rechazar"><i class="fas fa-times" aria-hidden="true"></i> Rechazada</button>'
        : '<button type="button" class="btn btn-ghost seg-mini" data-ct-reabrir><i class="fas fa-undo" aria-hidden="true"></i> Reabrir</button>' +
          (c.estado === 'aceptada' ? '<button type="button" class="btn btn-secondary seg-mini" data-ct-panel="datos"><i class="fas fa-id-card" aria-hidden="true"></i> Pedir datos al cliente</button>' : '') +
          (c.expedienteId ? '<button type="button" class="btn btn-primary seg-mini" data-ct-venta="' + esc(c.expedienteId) + '"><i class="fas fa-store" aria-hidden="true"></i> Ver la venta</button>' : '')) +
      '</div>';

    var panel = htmlPanel(c);

    var items = (c.items || []).length
      ? '<div class="table-wrap"><table><thead><tr><th>Cant.</th><th>Ítem</th><th>Valor</th></tr></thead><tbody>' +
        c.items
          .map(function (i) {
            return '<tr><td>' + i.cantidad + '</td><td>' + esc(i.nombre) + '</td><td>' + cop(i.precioUnit * i.cantidad) + '</td></tr>';
          })
          .join('') +
        '</tbody></table></div>'
      : '<p class="notes-empty">Sin detalle de ítems.</p>';

    var contactos = []
      .concat(
        (c.envios || []).map(function (e) {
          return {
            at: e.at,
            html:
              (e.estado === 'enviado' ? '<span class="oc-badge oc-badge--ok">Correo</span> ' : '<span class="oc-badge oc-badge--bad">No enviado</span> ') +
              esc(e.asunto) +
              ' → ' +
              esc(e.para) +
              (e.adjunto ? ' (con PDF)' : '') +
              (e.motivo ? ' · ' + esc(e.motivo) : ''),
          };
        })
      )
      .concat(
        (c.seguimientos || [])
          .filter(function (s) {
            return !/^Correo de seguimiento/.test(s.nota || '');
          })
          .map(function (s) {
            return { at: s.at, html: '<span class="oc-badge oc-badge--info">' + esc(s.canal) + '</span> ' + esc(s.nota || '') };
          })
      )
      .sort(function (a, b) {
        return String(b.at).localeCompare(String(a.at));
      });

    body.innerHTML =
      '<p class="modal-kicker">' +
      (c.tipo === 'proyecto' ? 'Cotización de proyecto' : 'Cotización de equipos') +
      ' · ' +
      esc(c.numero || c.id) +
      ' · ' +
      esc(ORIGEN[c.origen] || 'Claude') +
      '</p><h2 id="ct-title">' +
      esc(cl.nombre || c.titulo) +
      '</h2><p class="modal-when">' +
      chip(c.estado) +
      ' ' +
      cop(c.total) +
      (c.fecha ? ' · ' + esc(c.fecha) : '') +
      (c.proximoSeguimiento && abierta ? ' · próximo seguimiento ' + esc(fCorta(c.proximoSeguimiento)) : '') +
      (c.motivoRechazo ? ' · ' + esc(c.motivoRechazo) : '') +
      '</p>' +
      (c.descripcion ? '<p class="ct-desc">' + esc(c.descripcion) + '</p>' : '') +
      acciones +
      panel +
      '<p id="ct-msg" class="dash-status" aria-live="polite"></p>' +
      '<form id="ct-cliente" class="modal-block"><h3>Cliente</h3><div class="seg-form-grid">' +
      campo('nombre', 'Nombre o empresa', cl.nombre) +
      campo('contacto', 'Persona de contacto', cl.contacto) +
      campo('correo', 'Correo', cl.correo, 'email') +
      campo('celular', 'Celular', cl.celular) +
      campo('ciudad', 'Ciudad', cl.ciudad) +
      campo('documento', 'Cédula / NIT', cl.documento) +
      '</div><div class="modal-actions"><button class="btn btn-ghost seg-mini" type="submit">Guardar datos del cliente</button></div></form>' +
      '<section class="modal-block"><h3>Contactos con el cliente</h3>' +
      (contactos.length
        ? '<ul class="seg-hist">' +
          contactos
            .map(function (x) {
              return '<li><time>' + esc(fCorta(x.at)) + '</time> ' + x.html + '</li>';
            })
            .join('') +
          '</ul>'
        : '<p class="notes-empty">Todavía no hay contactos registrados.</p>') +
      '</section><section class="modal-block"><h3>Ítems</h3>' +
      items +
      '</section>' +
      ((c.historial || []).length
        ? '<section class="modal-block"><h3>Historial</h3><ul class="seg-hist">' +
          c.historial
            .slice(0, 12)
            .map(function (h) {
              return '<li><time>' + esc(fCorta(h.at)) + ' · ' + esc(h.by) + '</time> ' + esc(h.texto) + '</li>';
            })
            .join('') +
          '</ul></section>'
        : '');
    m.hidden = false;
    enlazar(c);
  }
  async function abrirDatos(id) {
    var c = cot(id);
    st.venta = null;
    if (c && c.expedienteId) {
      try {
        var j = await S().api('get&id=' + encodeURIComponent(c.expedienteId));
        st.venta = j.expediente;
      } catch (_e) {
        st.venta = null;
      }
    }
    st.panel = 'datos';
    abrir(id);
  }

  function campo(n, l, v, t) {
    return '<label class="seg-field"><span>' + esc(l) + '</span><input name="' + n + '" type="' + (t || 'text') + '" value="' + esc(v || '') + '" /></label>';
  }

  function htmlPanel(c) {
    var p = st.panel;
    if (!p) return '';
    if (p === 'envio' || p === 'seguimiento-correo') {
      var t = plantilla(c, p === 'envio' ? 'envio' : 'seguimiento');
      var tienePdf = c.resumen.tienePdf;
      return (
        '<form id="ct-form-envio" class="modal-block ct-panel"><h3>' +
        (p === 'envio' ? 'Enviar la cotización por correo' : 'Correo de seguimiento') +
        '</h3><p class="pc-muted">Sale desde info@reikisolar.com.co. Revisa y ajusta el texto antes de enviar.</p><div class="seg-form-grid">' +
        campo('para', 'Para', c.cliente && c.cliente.correo, 'email') +
        campo('cc', 'CC (opcional)', '', 'email') +
        '</div><label class="seg-field seg-field--full"><span>Asunto</span><input name="asunto" value="' +
        esc(t.asunto) +
        '" /></label><label class="seg-field seg-field--full"><span>Mensaje</span><textarea name="cuerpo" rows="12">' +
        esc(t.cuerpo) +
        '</textarea></label><label class="seg-check"><input type="checkbox" name="pdf"' +
        (tienePdf ? ' checked' : ' disabled') +
        ' /> Adjuntar el PDF de la cotización' +
        (tienePdf ? '' : ' (esta cotización no tiene PDF cargado)') +
        '</label><div class="modal-actions"><button class="btn btn-primary" type="submit"><i class="fas fa-paper-plane" aria-hidden="true"></i> Enviar</button><button class="btn btn-ghost" type="button" data-ct-panel="">Cancelar</button></div></form>'
      );
    }
    if (p === 'nota') {
      return (
        '<form id="ct-form-nota" class="modal-block ct-panel"><h3>Registrar seguimiento</h3><div class="seg-form-grid">' +
        '<label class="seg-field"><span>Canal</span><select name="canal"><option>llamada</option><option>whatsapp</option><option>correo</option><option>visita</option></select></label>' +
        '<label class="seg-field"><span>Próximo seguimiento</span><input type="date" name="proximo" value="' +
        sumar(4) +
        '" /></label></div><label class="seg-field seg-field--full"><span>¿Qué dijo el cliente?</span><textarea name="nota" rows="3" placeholder="Ej: lo revisa con el socio, llamar el lunes"></textarea></label><div class="modal-actions"><button class="btn btn-primary" type="submit">Guardar</button><button class="btn btn-ghost" type="button" data-ct-panel="">Cancelar</button></div></form>'
      );
    }
    if (p === 'datos') {
      var v = st.venta && st.venta.id === c.expedienteId ? st.venta : null;
      var txtWa = textoDatos(c, v, 'whatsapp');
      if (!txtWa) return '<div class="modal-block ct-panel"><h3>Datos del cliente</h3><p>Ya están todos los datos necesarios en la venta.</p></div>';
      var cel = String((c.cliente && c.cliente.celular) || '').replace(/\D/g, '');
      if (cel.length === 10) cel = '57' + cel;
      return (
        '<form id="ct-form-datos" class="modal-block ct-panel"><h3>Pedir los datos al cliente</h3><p class="pc-muted">Solo pide lo que falta en la venta. Ajusta el texto si quieres.</p>' +
        '<label class="seg-field seg-field--full"><span>Mensaje</span><textarea name="texto" rows="14">' +
        esc(txtWa) +
        '</textarea></label><div class="modal-actions">' +
        (cel ? '<a class="btn btn-wa seg-mini" data-ct-datos-wa href="#"><i class="fab fa-whatsapp" aria-hidden="true"></i> Abrir en WhatsApp</a>' : '') +
        '<button type="button" class="btn btn-ghost seg-mini" data-ct-datos-copiar><i class="fas fa-copy" aria-hidden="true"></i> Copiar</button>' +
        (c.cliente && c.cliente.correo ? '<button type="button" class="btn btn-primary seg-mini" data-ct-datos-correo><i class="fas fa-envelope" aria-hidden="true"></i> Enviar por correo</button>' : '') +
        '<button class="btn btn-ghost seg-mini" type="button" data-ct-panel="">Cerrar</button></div></form>'
      );
    }
    if (p === 'aceptar') {
      return (
        '<div class="modal-block ct-panel"><h3>Marcar como aceptada</h3><p>Se crea la venta en <b>' +
        (c.tipo === 'proyecto' ? 'Proyectos' : 'Compras en tienda') +
        '</b> con el cliente, los ítems y el total de la cotización, y sus equipos pasan a <b>Por comprar</b>.' +
        (c.cliente && c.cliente.correo ? '' : ' <b>Ojo:</b> el cliente no tiene correo registrado; no recibirá los avisos de la venta hasta que lo agregues.') +
        '</p><div class="modal-actions"><button class="btn btn-primary" type="button" data-ct-aceptar>Confirmar: aceptada</button><button class="btn btn-ghost" type="button" data-ct-panel="">Cancelar</button></div></div>'
      );
    }
    if (p === 'rechazar') {
      return (
        '<form id="ct-form-rech" class="modal-block ct-panel"><h3>Marcar como rechazada</h3><div class="seg-form-grid"><label class="seg-field"><span>Motivo</span><select name="motivo">' +
        MOTIVOS.map(function (x) {
          return '<option>' + esc(x) + '</option>';
        }).join('') +
        '</select></label>' +
        campo('detalle', 'Detalle (opcional)', '') +
        '</div><div class="modal-actions"><button class="btn btn-primary" type="submit">Guardar como rechazada</button><button class="btn btn-ghost" type="button" data-ct-panel="">Cancelar</button></div></form>'
      );
    }
    return '';
  }

  function msg(t) {
    var e = $('ct-msg');
    if (e) e.textContent = t || '';
  }
  async function correr(op, body, despues) {
    msg('Guardando…');
    try {
      var j = await S().api(op, body);
      if (j.cotizacion) upsert(j.cotizacion);
      if (j.expediente && S().upsert) S().upsert(j.expediente);
      st.panel = '';
      pintar();
      abrir(j.cotizacion ? j.cotizacion.id : st.abierta);
      msg(despues || 'Listo.');
    } catch (err) {
      msg('No se pudo: ' + err.message);
    }
  }

  function enlazar(c) {
    var body = $('ct-modal-body');
    body.querySelectorAll('[data-ct-panel]').forEach(function (b) {
      b.addEventListener('click', function () {
        if (b.getAttribute('data-ct-panel') === 'datos') {
          abrirDatos(c.id);
          return;
        }
        st.panel = b.getAttribute('data-ct-panel');
        abrir(c.id);
        var p = body.querySelector('.ct-panel');
        if (p) p.scrollIntoView({ block: 'nearest' });
      });
    });
    var wa = body.querySelector('[data-ct-wa]');
    if (wa)
      wa.addEventListener('click', function () {
        setTimeout(function () {
          st.panel = 'nota';
          abrir(c.id);
          var sel = body.querySelector('#ct-form-nota select[name=canal]');
          if (sel) sel.value = 'whatsapp';
          msg('Cuando termines en WhatsApp, registra aquí qué le dijiste o qué respondió.');
        }, 300);
      });
    var pdf = body.querySelector('[data-ct-pdf]');
    if (pdf)
      pdf.addEventListener('click', async function () {
        if (c.pdfUrl && !(c.pdf && c.pdf.partes)) {
          window.open(c.pdfUrl, '_blank', 'noopener');
          return;
        }
        var w = window.open('', '_blank');
        msg('Abriendo PDF…');
        try {
          var j = await S().api('cot-pdf&id=' + encodeURIComponent(c.id));
          var bin = atob(j.base64);
          var arr = new Uint8Array(bin.length);
          for (var i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
          var url = URL.createObjectURL(new Blob([arr], { type: 'application/pdf' }));
          if (w) w.location.href = url;
          else window.open(url, '_blank');
          msg('');
        } catch (err) {
          if (w) w.close();
          msg('No se pudo abrir el PDF: ' + err.message);
        }
      });
    var fe = $('ct-form-envio');
    if (fe)
      fe.addEventListener('submit', function (ev) {
        ev.preventDefault();
        var f = new FormData(fe);
        correr(
          'cot-enviar',
          {
            id: c.id,
            para: f.get('para'),
            cc: f.get('cc'),
            asunto: f.get('asunto'),
            cuerpo: f.get('cuerpo'),
            adjuntarPdf: !!f.get('pdf'),
            tipo: st.panel === 'envio' ? 'envio' : 'seguimiento',
          },
          'Correo enviado.'
        );
      });
    var fn = $('ct-form-nota');
    if (fn)
      fn.addEventListener('submit', function (ev) {
        ev.preventDefault();
        var f = new FormData(fn);
        correr('cot-seguimiento', { id: c.id, canal: f.get('canal'), nota: f.get('nota'), proximo: f.get('proximo') }, 'Seguimiento registrado.');
      });
    var fr = $('ct-form-rech');
    if (fr)
      fr.addEventListener('submit', function (ev) {
        ev.preventDefault();
        var f = new FormData(fr);
        var m = String(f.get('motivo') || '') + (f.get('detalle') ? ': ' + f.get('detalle') : '');
        correr('cot-estado', { id: c.id, estado: 'rechazada', motivo: m }, 'Marcada como rechazada.');
      });
    var ac = body.querySelector('[data-ct-aceptar]');
    if (ac)
      ac.addEventListener('click', function () {
        correr('cot-estado', { id: c.id, estado: 'aceptada' }, 'Aceptada: la venta quedó creada. Abajo está el mensaje para pedirle los datos al cliente.').then(function () {
          abrirDatos(c.id);
        });
      });
    var fd = $('ct-form-datos');
    if (fd) {
      var ta = fd.querySelector('textarea');
      var bw = fd.querySelector('[data-ct-datos-wa]');
      if (bw)
        bw.addEventListener('click', function (ev) {
          ev.preventDefault();
          var cel = String((c.cliente && c.cliente.celular) || '').replace(/\D/g, '');
          if (cel.length === 10) cel = '57' + cel;
          window.open('https://wa.me/' + cel + '?text=' + encodeURIComponent(ta.value), '_blank', 'noopener');
          S().api('cot-seguimiento', { id: c.id, canal: 'whatsapp', nota: 'Se le pidieron los datos para registrar la venta y facturar.' }).then(function (j) {
            if (j.cotizacion) upsert(j.cotizacion);
          });
        });
      var bc = fd.querySelector('[data-ct-datos-copiar]');
      if (bc)
        bc.addEventListener('click', function () {
          ta.select();
          try {
            navigator.clipboard.writeText(ta.value);
          } catch (_e) {
            document.execCommand('copy');
          }
          msg('Mensaje copiado.');
        });
      var be = fd.querySelector('[data-ct-datos-correo]');
      if (be)
        be.addEventListener('click', function () {
          var v = st.venta && st.venta.id === c.expedienteId ? st.venta : null;
          correr(
            'cot-enviar',
            { id: c.id, asunto: 'Datos para su pedido – Cotización ' + (c.numero || c.id) + ' | Reiki Energía Solar', cuerpo: textoDatos(c, v, 'correo'), adjuntarPdf: false, tipo: 'seguimiento' },
            'Correo enviado pidiendo los datos.'
          );
        });
    }
    var re = body.querySelector('[data-ct-reabrir]');
    if (re)
      re.addEventListener('click', function () {
        correr('cot-estado', { id: c.id, estado: (c.envios || []).some(function (e) { return e.estado === 'enviado'; }) ? 'seguimiento' : 'por_enviar' }, 'Reabierta.');
      });
    var ve = body.querySelector('[data-ct-venta]');
    if (ve)
      ve.addEventListener('click', function () {
        var id = ve.getAttribute('data-ct-venta');
        cerrar();
        S().setCat(c.tipo === 'proyecto' ? 'proyecto' : 'tienda');
        S().abrir(id);
      });
    var fc = $('ct-cliente');
    if (fc)
      fc.addEventListener('submit', function (ev) {
        ev.preventDefault();
        var f = new FormData(fc);
        var cli = {};
        ['nombre', 'contacto', 'correo', 'celular', 'ciudad', 'documento'].forEach(function (k) {
          cli[k] = f.get(k);
        });
        correr('cot-save', { id: c.id, cliente: cli }, 'Datos del cliente guardados.');
      });
  }

  function iniciar() {
    var q = $('ct-q');
    if (q && !q.__ok) {
      q.__ok = true;
      q.addEventListener('input', function () {
        st.q = q.value || '';
        pintar();
      });
      var o = $('ct-origen');
      o.addEventListener('change', function () {
        st.origen = o.value;
        pintar();
      });
    }
    cargar();
  }

  window.reikiPanes = window.reikiPanes || {};
  window.reikiPanes.cotizaciones = iniciar;
  window.reikiCot = {
    abrir: async function (id) {
      if (!cot(id)) await cargar();
      abrir(id);
    },
    cargar: cargar,
  };
})();
