/*
 * Etapas en carrusel: el detalle de cada venta muestra una etapa a la vez, con solo las partes del panel que
 * esa etapa necesita (datos del cliente, pagos, disponibilidad, envío, factura…). Las etapas se cierran solas
 * cuando sus datos quedan completos (lo hace el servidor) y el carrusel pasa a la siguiente.
 */
(function () {
  var S = function () {
    return window.reikiSeg;
  };
  var vista = {}; // id → { key, estado, todo }
  var ICONO = { hecho: '✓', en_curso: '•', no_aplica: '–' };

  function corto(l) {
    var t = String(l || '').replace(/^(Verificación|Generación|Envío|Confirmación|Coordinación) de(l)? (la |los )?/i, '');
    return t.charAt(0).toUpperCase() + t.slice(1);
  }

  function abierta(et) {
    return et.estado !== 'hecho' && et.estado !== 'no_aplica';
  }

  function siguienteAbierta(etapas, desde) {
    for (var i = desde + 1; i < etapas.length; i++) if (abierta(etapas[i])) return i;
    for (var j = 0; j < etapas.length; j++) if (abierta(etapas[j])) return j;
    return -1;
  }

  function esEquipo(it) {
    return !(it.compra && it.compra.estado === 'no_aplica') && it.sku !== 'ENVIO' && !/env[ií]o/i.test(it.nombre || '');
  }

  async function bodegas() {
    try {
      var j = await S().api('envia-estado');
      return j.bodegas || {};
    } catch (e) {
      return {};
    }
  }

  async function contactos() {
    try {
      var j = await S().api('prov-contactos');
      return j.contactos || {};
    } catch (e) {
      return {};
    }
  }

  function refDe(it) {
    if (it.codigoProveedor) return it.codigoProveedor;
    var t = String(it.nombre || '').split(/\s+/).filter(function (w) {
      return w.length >= 5 && /[A-Z]/.test(w) && /\d/.test(w) && !/[a-z]/.test(w);
    });
    return t[0] || '';
  }

  function botonesWa(e, cs) {
    var esc = S().esc;
    var norm = function (x) {
      return String(x || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');
    };
    var porProv = {};
    (e.items || []).forEach(function (it) {
      if (!esEquipo(it) || it.bodega) return;
      var p = it.proveedor || 'Por confirmar';
      (porProv[p] = porProv[p] || []).push(it);
    });
    return Object.keys(porProv)
      .map(function (p) {
        var k = Object.keys(cs).find(function (x) {
          return norm(x) === norm(p);
        });
        var c = k ? cs[k] : null;
        var items = porProv[p];
        var saludo = 'Hola' + (c && c.nombre ? ' ' + c.nombre.split(' ')[0] : '') + ', ¿cómo estás? ';
        var txt =
          saludo +
          (items.length > 1 ? '¿Tienes disponibles estos productos?' : '¿Tienes disponible este producto?') +
          '\n\n' +
          items
            .map(function (it) {
              var r = refDe(it);
              return '• ' + it.nombre + (r ? ' — Ref.: ' + r : '') + ' (' + it.cantidad + ' und.)';
            })
            .join('\n') +
          '\n\nGracias. Reiki Energía Solar.';
        var url = (c && c.celular ? 'https://wa.me/' + c.celular : 'https://wa.me/') + '?text=' + encodeURIComponent(txt);
        if (p === 'Por confirmar') return '<p class="pc-muted">' + items.length + ' equipo(s) sin proveedor: asígnalo en "Ver todo el expediente" → Equipos y proveedores.</p>';
        return (
          '<a class="btn seg-mini pc-wa' + (c && c.celular ? '' : ' pc-wa--sin') + '" target="_blank" rel="noopener" href="' + esc(url) + '"><i class="fab fa-whatsapp" aria-hidden="true"></i> Preguntar a ' + esc(p) + (c && c.nombre ? ' (' + esc(c.nombre.split(' ')[0]) + ')' : '') + ' · ' + items.length + ' equipo' + (items.length > 1 ? 's' : '') + '</a>' +
          (c && c.celular ? '' : ' <small class="pc-muted">sin número: agrégalo en Por comprar → Contactos de proveedores</small>')
        );
      })
      .join(' ');
  }

  async function htmlDisponibilidad(e) {
    var esc = S().esc;
    var cs = await contactos();
    var b = await bodegas();
    var ids = Object.keys(b);
    var norm = function (x) {
      return String(x || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, '');
    };
    var filas = (e.items || [])
      .map(function (it, idx) {
        if (!esEquipo(it)) return '';
        var sug = ids.filter(function (k) {
          return norm(b[k].proveedor) && norm(b[k].proveedor) === norm(it.proveedor);
        });
        var actual = it.bodega || '';
        return (
          '<tr><td>' + esc(it.cantidad) + '</td><td>' + esc(it.nombre) + '</td><td>' + esc(it.proveedor || 'Por confirmar') + '</td><td>' +
          '<select data-car-bodega="' + idx + '" aria-label="Bodega de recogida de ' + esc(it.nombre) + '"><option value="">' + (actual ? 'Por definir' : 'Escoge cuando confirme…') + '</option>' +
          ids.map(function (k) {
            return '<option value="' + esc(k) + '"' + (k === actual ? ' selected' : '') + '>' + esc(b[k].nombre) + (sug.indexOf(k) >= 0 && !actual ? ' (sugerida)' : '') + '</option>';
          }).join('') +
          '</select>' + (actual ? ' <span class="oc-badge oc-badge--ok">Disponible</span>' : '') + '</td></tr>'
        );
      })
      .join('');
    var wa = botonesWa(e, cs);
    return (
      (wa ? '<div class="modal-actions car-wa">' + wa + '</div>' : '') +
      '<div class="table-wrap car-dispo"><table><thead><tr><th>Cant.</th><th>Equipo</th><th>Proveedor</th><th>Disponible en (recoge en)</th></tr></thead><tbody>' +
      filas +
      '</tbody></table></div><p class="pc-muted">Pregunta la disponibilidad con el botón de WhatsApp (va un mensaje por proveedor con todos sus equipos pendientes). Cuando confirme, escoge la bodega donde se recoge cada equipo: al tenerlos todos, esta etapa se cierra sola.</p>'
    );
  }

  async function montar(body, e) {
    if (!body || !e || !(e.etapas || []).length) return;
    var esc = S().esc;
    var etapas = e.etapas;
    var v = vista[e.id] || {};
    var idx = etapas.findIndex(function (x) {
      return x.key === v.key;
    });
    // Si la etapa que se estaba viendo se cerró (al guardar), pasar sola a la siguiente abierta
    if (idx >= 0 && v.estado && abierta({ estado: v.estado }) && !abierta(etapas[idx])) {
      var sig = siguienteAbierta(etapas, idx);
      if (sig >= 0) idx = sig;
    }
    if (idx < 0) idx = etapas.findIndex(abierta);
    if (idx < 0) idx = etapas.length - 1;
    var et = etapas[idx];
    vista[e.id] = { key: et.key, estado: et.estado, todo: v.todo };

    // Navegación por etapas
    var nav =
      '<nav class="car-nav" aria-label="Etapas">' +
      etapas
        .map(function (x, i) {
          return '<button type="button" class="car-chip car-chip--' + x.estado + (i === idx ? ' car-chip--actual' : '') + '" data-car-ir="' + i + '" title="' + esc(x.label) + '"><b>' + (ICONO[x.estado] || i + 1) + '</b>' + esc(corto(x.label)) + '</button>';
        })
        .join('') +
      '</nav>';
    var estadoTxt = { pendiente: 'Pendiente', en_curso: 'En curso', hecho: 'Hecha', no_aplica: 'No aplica' }[et.estado] || et.estado;
    var card =
      '<div class="car-card"><p class="modal-kicker">Etapa ' + (idx + 1) + ' de ' + etapas.length + ' · <span class="car-estado">' + esc(estadoTxt) + '</span></p><h3>' + esc(et.label) + '</h3><p class="pc-muted">' + esc(et.ayuda || '') + '</p><div data-car-extra></div></div>';
    var botones =
      '<div class="car-botones"><button type="button" class="btn btn-ghost seg-mini" data-car-ant' + (idx === 0 ? ' disabled' : '') + '>← Anterior</button>' +
      '<span>' +
      (abierta(et) ? '<button type="button" class="btn btn-primary seg-mini" data-car-hecha>Marcar hecha y seguir →</button> ' : '') +
      '<button type="button" class="btn btn-secondary seg-mini" data-car-sig' + (idx === etapas.length - 1 ? ' disabled' : '') + '>Siguiente →</button></span></div>' +
      '<p><button type="button" class="btn btn-ghost seg-mini" data-car-todo>' + (v.todo ? 'Ver por etapas' : 'Ver todo el expediente') + '</button></p>';

    var callout = body.querySelector('.seg-callout');
    var wrap = document.createElement('div');
    wrap.className = 'car-wrap';
    wrap.innerHTML = nav + card + botones;
    if (callout) callout.replaceWith(wrap);
    else body.insertBefore(wrap, body.firstChild.nextSibling);

    // Mostrar solo lo que la etapa necesita
    if (!v.todo) {
      Array.prototype.forEach.call(body.children, function (n) {
        if (n === wrap || n.classList.contains('modal-kicker') || n.id === 'seg-modal-title' || n.classList.contains('modal-when')) return;
        if (n.hasAttribute('data-pasos-etapas')) {
          // Solo el renglón de la etapa actual (estado, nota, fecha para el cliente)
          n.querySelector('h3').textContent = 'Estado y nota de la etapa';
          n.querySelectorAll('li.seg-step').forEach(function (li, i) {
            if (i !== idx) li.classList.add('car-oculto');
          });
          return;
        }
        var pasos = (n.getAttribute && n.getAttribute('data-pasos')) || '';
        if (pasos.split(/\s+/).indexOf(et.key) < 0) n.classList.add('car-oculto');
      });
    }

    var extra = wrap.querySelector('[data-car-extra]');
    if (et.key === 'disponibilidad') {
      extra.innerHTML = '<p class="pc-muted">Cargando equipos…</p>';
      extra.innerHTML = await htmlDisponibilidad(e);
      extra.querySelectorAll('[data-car-bodega]').forEach(function (sel) {
        sel.addEventListener('change', async function () {
          sel.disabled = true;
          try {
            var j = await S().api('item-bodega', { id: e.id, idx: Number(sel.getAttribute('data-car-bodega')), bodegaId: sel.value });
            S().upsert(j.expediente);
            S().abrir(e.id);
          } catch (err) {
            sel.disabled = false;
            alert(err.message);
          }
        });
      });
    }

    var ir = function (i, todo) {
      var x = etapas[Math.max(0, Math.min(etapas.length - 1, i))];
      vista[e.id] = { key: x.key, estado: x.estado, todo: todo == null ? v.todo : todo };
      S().abrir(e.id);
      var m = document.querySelector('#seg-modal .modal-card, #seg-modal');
      if (m && m.scrollTo) m.scrollTo(0, 0);
    };
    wrap.querySelectorAll('[data-car-ir]').forEach(function (b) {
      b.addEventListener('click', function () {
        ir(Number(b.getAttribute('data-car-ir')));
      });
    });
    wrap.querySelector('[data-car-ant]').addEventListener('click', function () {
      ir(idx - 1);
    });
    wrap.querySelector('[data-car-sig]').addEventListener('click', function () {
      ir(idx + 1);
    });
    wrap.querySelector('[data-car-todo]').addEventListener('click', function () {
      ir(idx, !v.todo);
    });
    var bh = wrap.querySelector('[data-car-hecha]');
    if (bh)
      bh.addEventListener('click', function () {
        var sel = body.querySelector('[data-etapa="' + et.key + '"]');
        if (!sel) return;
        vista[e.id] = { key: et.key, estado: et.estado, todo: v.todo };
        bh.disabled = true;
        sel.value = 'hecho';
        sel.dispatchEvent(new Event('change'));
      });
  }

  window.reikiCarrusel = { montar: montar };
})();
