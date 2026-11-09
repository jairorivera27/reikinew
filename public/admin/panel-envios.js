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

  function contenidoDe(e) {
    var n = (e.items || []).filter(function (i) {
      return !/env[ií]o/i.test(i.nombre) && i.sku !== 'ENVIO';
    });
    return n.length === 1 ? n[0].nombre.slice(0, 50) : 'Equipos solares (' + n.length + ' ítems)';
  }

  function html(e, cfg) {
    var esc = S().esc,
      cop = S().cop;
    var en = e.envio || {};
    var badge = cfg.entorno === 'produccion' ? '' : ' <span class="oc-badge oc-badge--warn">Modo de prueba: guías sin validez</span>';
    if (!cfg.configurado)
      return '<section class="modal-block"><h3>Envío con transportadora</h3><p class="seg-warn">Envia aún no está conectado. Agrega <b>ENVIA_TOKEN</b> en Vercel (Envia → Developers → API Keys) y haz Redeploy. Para pruebas usa el token del sandbox; para guías reales, el de producción y <b>ENVIA_ENTORNO=produccion</b>.</p></section>';
    if (en.envia && en.guia) {
      var rec = en.envia.recogida;
      var bodega = Object.values(cfg.bodegas || {}).find(function (b) {
        return b.nombre === en.bodega;
      });
      return (
        '<section class="modal-block"><h3>Envío con transportadora' + (en.envia.entorno === 'produccion' ? '' : ' <span class="oc-badge oc-badge--warn">Guía de prueba</span>') + '</h3>' +
        '<p><b>' + esc(en.transportadora) + '</b> · guía <b>' + esc(en.guia) + '</b>' + (en.costoFlete ? ' · flete ' + cop(en.costoFlete) : '') + (en.bodega ? ' · sale de ' + esc(en.bodega) : '') + '</p>' +
        (en.estadoEnvio ? '<p>Estado: <b>' + esc(en.estadoEnvio) + '</b></p>' : '') +
        (rec ? '<p class="pc-muted">' + (rec.error ? 'Recogida no programada: ' + esc(rec.error) : 'Recogida programada' + (rec.confirmacion ? ' n.º ' + esc(rec.confirmacion) : '')) + '</p>' : '') +
        '<div class="modal-actions">' +
        (en.rotulo ? '<a class="btn btn-primary seg-mini" href="' + esc(en.rotulo) + '" target="_blank" rel="noopener"><i class="fas fa-print" aria-hidden="true"></i> Rótulo (PDF)</a>' : '') +
        (en.trackUrl ? '<a class="btn btn-ghost seg-mini" href="' + esc(en.trackUrl) + '" target="_blank" rel="noopener">Rastreo</a>' : '') +
        (en.rotulo && bodega && bodega.telefono
          ? '<a class="btn seg-mini pc-wa" target="_blank" rel="noopener" href="https://wa.me/' + esc((bodega.telefono.replace(/\D/g, '').length === 10 ? '57' : '') + bodega.telefono.replace(/\D/g, '')) + '?text=' + encodeURIComponent('Hola, ¿cómo estás? Te comparto el rótulo de ' + en.transportadora + ' (guía ' + en.guia + ') del pedido ' + ((e.cotizacion && e.cotizacion.numero) || e.id) + ' para pegarlo en la caja. La transportadora pasa a recogerlo. ' + en.rotulo) + '"><i class="fab fa-whatsapp" aria-hidden="true"></i> Enviar rótulo a la bodega</a>'
          : '') +
        '<button type="button" class="btn btn-secondary seg-mini" data-envia-rastrear>Actualizar estado</button></div>' +
        '<p class="seg-warn" data-envia-err hidden></p></section>'
      );
    }
    var bodegas = cfg.bodegas || {};
    var ids = Object.keys(bodegas);
    var c = estado.cotiz[e.id] || { cajas: [{ contenido: contenidoDe(e), cantidad: 1 }] };
    estado.cotiz[e.id] = c;
    var opts = ids
      .map(function (id) {
        return '<option value="' + esc(id) + '"' + (c.bodegaId === id ? ' selected' : '') + '>' + esc(bodegas[id].nombre + ' · ' + bodegas[id].ciudad) + '</option>';
      })
      .join('');
    var tarifas = c.tarifas
      ? c.tarifas.length
        ? '<div class="table-wrap"><table><thead><tr><th></th><th>Transportadora</th><th>Servicio</th><th>Entrega</th><th>Flete</th></tr></thead><tbody>' +
          c.tarifas
            .map(function (t, i) {
              return '<tr><td><input type="radio" name="envia-tarifa" value="' + i + '"' + (c.elegida === i ? ' checked' : '') + ' aria-label="Escoger ' + esc(t.carrierNombre) + '" /></td><td>' + esc(t.carrierNombre) + '</td><td>' + esc(t.servicio) + (t.recogida ? '' : ' <small>(llevar a oficina)</small>') + '</td><td>' + esc(t.entrega || t.fechaEntrega || '—') + '</td><td><b>' + cop(t.precio) + '</b></td></tr>';
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
      '<section class="modal-block"><h3>Envío con transportadora' + badge + '</h3>' +
      (ids.length
        ? '<label class="seg-field"><span>Sale de</span><select data-envia-bodega><option value="">Escoge la bodega…</option>' + opts + '</select></label>'
        : '<p class="seg-warn">Registra primero la bodega de donde salen los equipos (abajo, en "Bodegas de despacho").</p>') +
      '<p class="pc-muted">Va para: ' + esc((e.cliente && e.cliente.direccion) || '(sin dirección)') + ', ' + esc((e.cliente && e.cliente.ciudad) || '') + '</p>' +
      '<div class="table-wrap"><table class="envia-cajas"><thead><tr><th>Contenido</th><th>Cajas</th><th>Kg c/u</th><th>Largo</th><th>Ancho</th><th>Alto</th><th></th></tr></thead><tbody>' +
      c.cajas.map(filaCaja).join('') +
      '</tbody></table></div><div class="modal-actions"><button type="button" class="btn btn-ghost seg-mini" data-envia-caja>+ Otra caja</button><button type="button" class="btn btn-secondary seg-mini" data-envia-cotizar' + (ids.length ? '' : ' disabled') + '><i class="fas fa-truck" aria-hidden="true"></i> Cotizar flete</button></div>' +
      tarifas +
      '<p class="seg-warn" data-envia-err hidden></p>' +
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

  function leerCajas(box, e) {
    var c = estado.cotiz[e.id];
    box.querySelectorAll('[data-caja]').forEach(function (inp) {
      var i = Number(inp.getAttribute('data-caja'));
      c.cajas[i] = c.cajas[i] || {};
      var k = inp.getAttribute('data-k');
      c.cajas[i][k] = k === 'contenido' ? inp.value : inp.value.replace(',', '.');
    });
    var sel = box.querySelector('[data-envia-bodega]');
    if (sel) c.bodegaId = sel.value;
    var f = box.querySelector('[data-envia-fecha]');
    if (f) c.fecha = f.value;
    var d = box.querySelector('[data-envia-desde]');
    if (d) c.desde = d.value;
    var h = box.querySelector('[data-envia-hasta]');
    if (h) c.hasta = h.value;
    var sr = box.querySelector('[data-envia-sinrecogida]');
    if (sr) c.sinRecogida = sr.checked;
    return c;
  }

  async function montar(box, e) {
    if (!box) return;
    var cfg = await config();
    var pintar = function () {
      box.innerHTML = html(e, cfg);
      enlazar();
    };
    var error = function (t) {
      var p = box.querySelector('[data-envia-err]');
      if (p) {
        p.hidden = !t;
        p.textContent = t || '';
      }
    };
    function enlazar() {
      var q = function (s) {
        return box.querySelector(s);
      };
      box.querySelectorAll('[data-caja], [data-envia-bodega]').forEach(function (inp) {
        inp.addEventListener('change', function () {
          leerCajas(box, e);
        });
      });
      if (q('[data-envia-caja]'))
        q('[data-envia-caja]').addEventListener('click', function () {
          var c = leerCajas(box, e);
          c.cajas.push({ contenido: '', cantidad: 1 });
          pintar();
        });
      box.querySelectorAll('[data-quitar-caja]').forEach(function (b) {
        b.addEventListener('click', function () {
          var c = leerCajas(box, e);
          if (c.cajas.length > 1) c.cajas.splice(Number(b.getAttribute('data-quitar-caja')), 1);
          pintar();
        });
      });
      if (q('[data-envia-cotizar]'))
        q('[data-envia-cotizar]').addEventListener('click', async function (ev) {
          var c = leerCajas(box, e);
          if (!c.bodegaId) return error('Escoge la bodega de donde sale el envío.');
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
      box.querySelectorAll('[name="envia-tarifa"]').forEach(function (r) {
        r.addEventListener('change', function () {
          var c = leerCajas(box, e);
          c.elegida = Number(r.value);
          c.confirmar = false;
          pintar();
        });
      });
      if (q('[data-envia-cancelar]'))
        q('[data-envia-cancelar]').addEventListener('click', function () {
          var c = leerCajas(box, e);
          c.confirmar = false;
          pintar();
        });
      if (q('[data-envia-comprar]'))
        q('[data-envia-comprar]').addEventListener('click', async function (ev) {
          var c = leerCajas(box, e);
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
              paquetes: c.cajas,
              carrier: t.carrier,
              service: t.service,
              recogida: c.sinRecogida ? null : { fecha: c.fecha || hoyMas(1), desde: Number(c.desde) || 9, hasta: Number(c.hasta) || 16 },
            });
            delete estado.cotiz[e.id];
            S().upsert(j.expediente);
            S().abrir(e.id);
          } catch (err) {
            ev.target.disabled = false;
            ev.target.textContent = 'Comprar guía';
            c.confirmar = false;
            error(err.message);
          }
        });
      if (q('[data-envia-rastrear]'))
        q('[data-envia-rastrear]').addEventListener('click', async function (ev) {
          ev.target.disabled = true;
          try {
            var j = await S().api('envia-rastrear', { id: e.id });
            if (j.expediente) {
              S().upsert(j.expediente);
              S().abrir(e.id);
            } else error('Envia no devolvió estado para esta guía.');
          } catch (err) {
            ev.target.disabled = false;
            error(err.message);
          }
        });
      if (q('[data-bodegas-guardar]'))
        q('[data-bodegas-guardar]').addEventListener('click', async function (ev) {
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
          ev.target.disabled = true;
          try {
            var j = await S().api('bodegas', { bodegas: out });
            cfg.bodegas = j.bodegas || {};
            pintar();
          } catch (err) {
            ev.target.disabled = false;
            error(err.message);
          }
        });
    }
    pintar();
  }

  window.reikiEnvios = { montar: montar };
})();
