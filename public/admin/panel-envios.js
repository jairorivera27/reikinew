/* Envíos con transportadora (Envia.com) dentro del detalle de cada venta. */
(function () {
  var S = function () {
    return window.reikiSeg;
  };
  var estado = { cfg: null, cotiz: {} };

  async function config(forzar) {
    if (estado.cfg && !forzar) return estado.cfg;
    try {
      estado.cfg = await S().api('envia-estado');
    } catch (e) {
      estado.cfg = { configurado: false, entorno: 'pruebas', bodegas: {} };
    }
    return estado.cfg;
  }

  function hoyMas(dias) {
    var d = new Date(Date.now() + dias * 86400000);
    // las bodegas reciben recogidas de lunes a viernes
    while (d.getUTCDay() === 0 || d.getUTCDay() === 6) d = new Date(d.getTime() + 86400000);
    return d.toLocaleDateString('en-CA', { timeZone: 'America/Bogota' });
  }

  function filaCaja(p, i) {
    var esc = S().esc;
    p = p || {};
    var inp = function (k, ph, w) {
      return '<input data-caja="' + i + '" data-k="' + k + '" value="' + esc(p[k] == null ? '' : p[k]) + '" placeholder="' + ph + '" aria-label="' + ph + '"' + (w ? ' inputmode="decimal"' : '') + ' />';
    };
    return '<tr>' + '<td>' + inp('contenido', 'Contenido') + '</td><td>' + inp('cantidad', 'Cajas', 1) + '</td><td>' + inp('peso', 'Kg c/u', 1) + '</td><td>' + inp('largo', 'Largo cm', 1) + '</td><td>' + inp('ancho', 'Ancho cm', 1) + '</td><td>' + inp('alto', 'Alto cm', 1) + '</td><td><button type="button" class="btn btn-ghost seg-mini" data-quitar-caja="' + i + '" aria-label="Quitar caja">×</button></td></tr>';
  }

  var norm = function (x) {
    return String(x || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');
  };
  function bodegaDe(it, bodegas) {
    if (it.bodega && bodegas[it.bodega]) return it.bodega;
    var ids = Object.keys(bodegas).filter(function (k) {
      return norm(bodegas[k].proveedor) && norm(bodegas[k].proveedor) === norm(it.proveedor);
    });
    return ids.length === 1 ? ids[0] : '';
  }
  function esEquipo(it) {
    return !(it.compra && it.compra.estado === 'no_aplica') && it.sku !== 'ENVIO' && !/env[ií]o/i.test(it.nombre || '');
  }
  /** Equipos agrupados por bodega de recogida: [{ key, items:[{it, idx}] }] */
  function grupos(e, bodegas) {
    var g = {};
    (e.items || []).forEach(function (it, idx) {
      if (!esEquipo(it)) return;
      var k = bodegaDe(it, bodegas);
      (g[k] = g[k] || []).push({ it: it, idx: idx });
    });
    return Object.keys(g).map(function (k) {
      return { key: k, items: g[k] };
    });
  }

  function contenidoDe(e, lista) {
    var n = lista || (e.items || []).filter(esEquipo);
    return n.length === 1 ? n[0].nombre.slice(0, 50) : 'Equipos solares (' + n.length + ' ítems)';
  }

  function htmlDespacho(e, x, bodegas) {
    var esc = S().esc,
      cop = S().cop;
    var rec = x.recogida;
    var bodega = bodegas[x.bodegaId];
    var tel = bodega && bodega.telefono ? bodega.telefono.replace(/\D/g, '') : '';
    return (
      '<div class="envia-grupo envia-grupo--ok"><p><b>' + esc(x.bodega || 'Bodega') + '</b> → ' + esc(x.transportadora) + ' · guía <b>' + esc(x.guia) + '</b>' + (x.costoFlete ? ' · ' + cop(x.costoFlete) : '') + (x.entorno === 'produccion' ? '' : ' <span class="oc-badge oc-badge--warn">prueba</span>') + '</p>' +
      (x.estado ? '<p>Estado: <b>' + esc(x.estado) + '</b></p>' : '') +
      (rec ? '<p class="pc-muted">' + (rec.error ? 'Recogida no programada: ' + esc(rec.error) : 'Recogida programada' + (rec.confirmacion ? ' n.º ' + esc(rec.confirmacion) : '')) + '</p>' : '') +
      '<div class="modal-actions">' +
      (x.rotulo ? '<a class="btn btn-primary seg-mini" href="' + esc(x.rotulo) + '" target="_blank" rel="noopener"><i class="fas fa-print" aria-hidden="true"></i> Rótulo (PDF)</a>' : '') +
      (x.trackUrl ? '<a class="btn btn-ghost seg-mini" href="' + esc(x.trackUrl) + '" target="_blank" rel="noopener">Rastreo</a>' : '') +
      (x.rotulo && tel
        ? '<a class="btn seg-mini pc-wa" target="_blank" rel="noopener" href="https://wa.me/' + esc((tel.length === 10 ? '57' : '') + tel) + '?text=' + encodeURIComponent('Hola' + (bodega.contacto ? ' ' + bodega.contacto.split(' ')[0] : '') + ', ¿cómo estás? Te comparto el rótulo de ' + x.transportadora + ' (guía ' + x.guia + ') del pedido ' + ((e.cotizacion && e.cotizacion.numero) || e.id) + ' para pegarlo en la caja. La transportadora pasa a recogerlo. ' + x.rotulo) + '"><i class="fab fa-whatsapp" aria-hidden="true"></i> Enviar rótulo a la bodega</a>'
        : '') +
      '</div></div>'
    );
  }

  function htmlGrupo(e, gr, cfg) {
    var esc = S().esc,
      cop = S().cop;
    var bodegas = cfg.bodegas || {};
    var key = e.id + '|' + gr.key;
    var c = estado.cotiz[key] || { bodegaId: gr.key, cajas: [{ contenido: contenidoDe(e, gr.items.map(function (x) { return x.it; })), cantidad: 1 }] };
    estado.cotiz[key] = c;
    var lista = gr.items.map(function (x) { return x.it.cantidad + ' × ' + x.it.nombre; }).join(' · ');
    var opts = Object.keys(bodegas)
      .map(function (id) {
        return '<option value="' + esc(id) + '"' + (c.bodegaId === id ? ' selected' : '') + '>' + esc(bodegas[id].nombre + ' · ' + bodegas[id].ciudad) + '</option>';
      })
      .join('');
    var tarifas = c.tarifas
      ? c.tarifas.length
        ? '<div class="table-wrap"><table><thead><tr><th></th><th>Transportadora</th><th>Servicio</th><th>Entrega</th><th>Flete</th></tr></thead><tbody>' +
          c.tarifas
            .map(function (t, i) {
              return '<tr><td><input type="radio" name="envia-tarifa-' + esc(gr.key || 'x') + '" data-tarifa="' + i + '" value="' + i + '"' + (c.elegida === i ? ' checked' : '') + ' aria-label="Escoger ' + esc(t.carrierNombre) + '" /></td><td>' + esc(t.carrierNombre) + '</td><td>' + esc(t.servicio) + (t.recogida ? '' : ' <small>(llevar a oficina)</small>') + '</td><td>' + esc(t.entrega || t.fechaEntrega || '—') + '</td><td><b>' + cop(t.precio) + '</b></td></tr>';
            })
            .join('') +
          '</tbody></table></div>' +
          (c.errores && c.errores.length ? '<p class="pc-muted">Sin tarifa: ' + esc(c.errores.map(function (x) { return x.carrier; }).join(', ')) + '</p>' : '') +
          '<div class="seg-form-grid"><label class="seg-field"><span>Recogida en la bodega</span><input type="date" data-envia-fecha value="' + esc(c.fecha || hoyMas(1)) + '" /></label>' +
          '<label class="seg-field"><span>Desde (h)</span><input inputmode="numeric" data-envia-desde value="' + esc(c.desde || 9) + '" /></label>' +
          '<label class="seg-field"><span>Hasta (h)</span><input inputmode="numeric" data-envia-hasta value="' + esc(c.hasta || 16) + '" /></label></div>' +
          '<label class="seg-check"><input type="checkbox" data-envia-sinrecogida' + (c.sinRecogida ? ' checked' : '') + ' /> No pedir recogida (se lleva a la oficina de la transportadora)</label>' +
          '<div class="modal-actions"><button type="button" class="btn btn-primary seg-mini" data-envia-comprar' + (c.elegida == null ? ' disabled' : '') + '>' + (c.confirmar ? 'Confirmar: comprar guía por ' + cop(c.tarifas[c.elegida].precio) : 'Comprar guía') + '</button>' + (c.confirmar ? '<button type="button" class="btn btn-ghost seg-mini" data-envia-cancelar>No, volver</button>' : '') + '</div>'
        : '<p class="seg-warn">Ninguna transportadora dio tarifa para esta ruta y estas cajas.' + (c.errores && c.errores.length ? ' ' + esc(c.errores.map(function (x) { return x.carrier + ': ' + x.error; }).join(' · ')) : '') + '</p>'
      : '';
    return (
      '<div class="envia-grupo" data-grupo="' + esc(gr.key) + '">' +
      '<p><b>' + esc(gr.key && bodegas[gr.key] ? bodegas[gr.key].nombre : 'Sin bodega asignada') + '</b> · ' + esc(lista) + '</p>' +
      '<label class="seg-field"><span>Sale de</span><select data-envia-bodega><option value="">Escoge la bodega…</option>' + opts + '</select></label>' +
      '<div class="table-wrap"><table class="envia-cajas"><thead><tr><th>Contenido</th><th>Cajas</th><th>Kg c/u</th><th>Largo</th><th>Ancho</th><th>Alto</th><th></th></tr></thead><tbody>' +
      c.cajas.map(filaCaja).join('') +
      '</tbody></table></div><div class="modal-actions"><button type="button" class="btn btn-ghost seg-mini" data-envia-caja>+ Otra caja</button><button type="button" class="btn btn-secondary seg-mini" data-envia-cotizar><i class="fas fa-truck" aria-hidden="true"></i> Cotizar flete</button></div>' +
      tarifas +
      '<p class="seg-warn" data-envia-err hidden></p></div>'
    );
  }

  function html(e, cfg) {
    var esc = S().esc;
    if (!cfg.configurado)
      return '<section class="modal-block"><h3>Envío con transportadora</h3><p class="seg-warn">Envia aún no está conectado. Agrega <b>ENVIA_TOKEN</b> en Vercel (Envia → Developers → API Keys) y publica de nuevo.</p></section>';
    var bodegas = cfg.bodegas || {};
    var en = e.envio || {};
    var despachos = (en.despachos || []).slice();
    if (!despachos.length && en.envia && en.guia) despachos.push({ bodega: en.bodega, transportadora: en.transportadora, guia: en.guia, trackUrl: en.trackUrl, rotulo: en.rotulo, costoFlete: en.costoFlete, recogida: en.envia.recogida, entorno: en.envia.entorno, estado: en.estadoEnvio });
    var hechas = despachos.map(function (x) { return x.bodegaId; });
    var pend = grupos(e, bodegas).filter(function (g) { return !g.key || hechas.indexOf(g.key) < 0; });
    var badge = cfg.entorno === 'produccion' ? '' : ' <span class="oc-badge oc-badge--warn">Modo de prueba: guías sin validez</span>';
    return (
      '<section class="modal-block"><h3>Envío con transportadora' + badge + '</h3>' +
      '<p class="pc-muted">Va para: ' + esc((e.cliente && e.cliente.direccion) || '(sin dirección)') + ', ' + esc((e.cliente && e.cliente.ciudad) || '') + '</p>' +
      despachos.map(function (x) { return htmlDespacho(e, x, bodegas); }).join('') +
      (despachos.length ? '<div class="modal-actions"><button type="button" class="btn btn-secondary seg-mini" data-envia-rastrear>Actualizar estado</button></div>' : '') +
      (!Object.keys(bodegas).length ? '<p class="seg-warn">Registra primero las bodegas de donde salen los equipos (abajo, en "Bodegas de despacho").</p>' : '') +
      (pend.length > 1 ? '<p class="pc-muted">Los equipos salen de ' + pend.length + ' bodegas: se compra una guía por cada una.</p>' : '') +
      pend.map(function (g) { return htmlGrupo(e, g, cfg); }).join('') +
      (!pend.length && !despachos.length ? '<p class="notes-empty">No hay equipos para despachar.</p>' : '') +
      '<p class="seg-warn" data-envia-err-global hidden></p>' +
      htmlBodegas(cfg) +
      '</section>'
    );
  }

  function htmlBodegas(cfg) {
    var esc = S().esc;
    var b = cfg.bodegas || {};
    var campos = [['nombre', 'Nombre (ej. Bodega K2 Chía)'], ['proveedor', 'Proveedor'], ['contacto', 'Contacto'], ['telefono', 'Celular'], ['correo', 'Correo'], ['direccion', 'Dirección'], ['ciudad', 'Municipio, Departamento'], ['horario', 'Horario / indicaciones']];
    var fila = function (id, x) {
      return '<div class="envia-bodega" data-bodega="' + esc(id) + '">' + campos.map(function (c) { return '<input data-bk="' + c[0] + '" value="' + esc(x[c[0]] || '') + '" placeholder="' + c[1] + '" aria-label="' + c[1] + '" />'; }).join('') + '</div>';
    };
    return (
      '<details class="pc-contactos"><summary>Bodegas de despacho (' + Object.keys(b).length + ')</summary>' +
      Object.keys(b).map(function (id) { return fila(id, b[id]); }).join('') +
      fila('nueva', {}) +
      '<div class="pc-acciones"><button type="button" class="btn btn-primary seg-mini" data-bodegas-guardar>Guardar bodegas</button></div></details>'
    );
  }

  function leerGrupo(gbox, key) {
    var c = estado.cotiz[key];
    gbox.querySelectorAll('[data-caja]').forEach(function (inp) {
      var i = Number(inp.getAttribute('data-caja'));
      c.cajas[i] = c.cajas[i] || {};
      var k = inp.getAttribute('data-k');
      c.cajas[i][k] = k === 'contenido' ? inp.value : inp.value.replace(',', '.');
    });
    var g = function (s) {
      return gbox.querySelector(s);
    };
    if (g('[data-envia-bodega]')) c.bodegaId = g('[data-envia-bodega]').value;
    if (g('[data-envia-fecha]')) c.fecha = g('[data-envia-fecha]').value;
    if (g('[data-envia-desde]')) c.desde = g('[data-envia-desde]').value;
    if (g('[data-envia-hasta]')) c.hasta = g('[data-envia-hasta]').value;
    if (g('[data-envia-sinrecogida]')) c.sinRecogida = g('[data-envia-sinrecogida]').checked;
    return c;
  }

  async function montar(box, e) {
    if (!box) return;
    var cfg = await config();
    var pintar = function () {
      box.innerHTML = html(e, cfg);
      enlazar();
    };
    function enlazar() {
      box.querySelectorAll('[data-grupo]').forEach(function (gbox) {
        var gk = gbox.getAttribute('data-grupo');
        var key = e.id + '|' + gk;
        var gr = grupos(e, cfg.bodegas || {}).find(function (x) { return x.key === gk; }) || { items: [] };
        var q = function (s) {
          return gbox.querySelector(s);
        };
        var error = function (t) {
          var p = q('[data-envia-err]');
          p.hidden = !t;
          p.textContent = t || '';
        };
        gbox.querySelectorAll('[data-caja], [data-envia-bodega], [data-envia-fecha], [data-envia-desde], [data-envia-hasta], [data-envia-sinrecogida]').forEach(function (inp) {
          inp.addEventListener('change', function () {
            leerGrupo(gbox, key);
          });
        });
        q('[data-envia-caja]').addEventListener('click', function () {
          leerGrupo(gbox, key).cajas.push({ contenido: '', cantidad: 1 });
          pintar();
        });
        gbox.querySelectorAll('[data-quitar-caja]').forEach(function (b) {
          b.addEventListener('click', function () {
            var c = leerGrupo(gbox, key);
            if (c.cajas.length > 1) c.cajas.splice(Number(b.getAttribute('data-quitar-caja')), 1);
            pintar();
          });
        });
        q('[data-envia-cotizar]').addEventListener('click', async function (ev) {
          var c = leerGrupo(gbox, key);
          if (!c.bodegaId) return error('Escoge la bodega de donde salen estos equipos.');
          ev.target.disabled = true;
          ev.target.textContent = 'Cotizando con las transportadoras…';
          try {
            var j = await S().api('envia-cotizar', { id: e.id, bodegaId: c.bodegaId, paquetes: c.cajas });
            c.tarifas = j.tarifas || [];
            c.errores = j.errores || [];
            c.elegida = c.tarifas.length ? 0 : null;
            c.confirmar = false;
            pintar();
          } catch (err) {
            ev.target.disabled = false;
            ev.target.textContent = 'Cotizar flete';
            error(err.message);
          }
        });
        gbox.querySelectorAll('[data-tarifa]').forEach(function (r) {
          r.addEventListener('change', function () {
            var c = leerGrupo(gbox, key);
            c.elegida = Number(r.value);
            c.confirmar = false;
            pintar();
          });
        });
        if (q('[data-envia-cancelar]'))
          q('[data-envia-cancelar]').addEventListener('click', function () {
            leerGrupo(gbox, key).confirmar = false;
            pintar();
          });
        if (q('[data-envia-comprar]'))
          q('[data-envia-comprar]').addEventListener('click', async function (ev) {
            var c = leerGrupo(gbox, key);
            if (!c.confirmar) {
              c.confirmar = true;
              return pintar();
            }
            var t = c.tarifas[c.elegida];
            ev.target.disabled = true;
            ev.target.textContent = 'Comprando la guía…';
            try {
              var j = await S().api('envia-guia', {
                id: e.id,
                bodegaId: c.bodegaId,
                items: gr.items.map(function (x) { return x.idx; }),
                paquetes: c.cajas,
                carrier: t.carrier,
                service: t.service,
                recogida: c.sinRecogida ? null : { fecha: c.fecha || hoyMas(1), desde: Number(c.desde) || 9, hasta: Number(c.hasta) || 16 },
              });
              delete estado.cotiz[key];
              S().upsert(j.expediente);
              S().abrir(e.id);
            } catch (err) {
              ev.target.disabled = false;
              ev.target.textContent = 'Comprar guía';
              c.confirmar = false;
              error(err.message);
            }
          });
      });
      var errG = function (t) {
        var p = box.querySelector('[data-envia-err-global]');
        if (p) {
          p.hidden = !t;
          p.textContent = t || '';
        }
      };
      var br = box.querySelector('[data-envia-rastrear]');
      if (br)
        br.addEventListener('click', async function () {
          br.disabled = true;
          try {
            var j = await S().api('envia-rastrear', { id: e.id });
            if (j.expediente) {
              S().upsert(j.expediente);
              S().abrir(e.id);
            } else errG('Envia no devolvió estado para estas guías.');
          } catch (err) {
            br.disabled = false;
            errG(err.message);
          }
        });
      var bg = box.querySelector('[data-bodegas-guardar]');
      if (bg)
        bg.addEventListener('click', async function () {
          var out = {};
          box.querySelectorAll('[data-bodega]').forEach(function (f) {
            var x = {};
            f.querySelectorAll('[data-bk]').forEach(function (i) {
              x[i.getAttribute('data-bk')] = i.value.trim();
            });
            var id = f.getAttribute('data-bodega');
            if (id === 'nueva') {
              if (!x.nombre) return;
              id = x.nombre;
            }
            out[id] = x.nombre ? x : null;
          });
          bg.disabled = true;
          try {
            var j = await S().api('bodegas', { bodegas: out });
            cfg.bodegas = j.bodegas || {};
            pintar();
          } catch (err) {
            bg.disabled = false;
            errG(err.message);
          }
        });
    }
    pintar();
  }

  window.reikiEnvios = { montar: montar };
})();
