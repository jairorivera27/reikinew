/**
 * Filtrado en el cliente del listado de categoría.
 *
 * Sin filtros activos se deja intacto el HTML que renderizó Astro (bueno para SEO y para
 * el LCP). Al tocar un filtro se descarga una sola vez el índice de la categoría y el
 * grid pasa a pintarse aquí, sobre el catálogo completo en vez de la página visible.
 */

const POR_TANDA = 24;
const CUOTAS = 6;
/** Mismo factor que src/utils/addiHint.ts, para que la cuota coincida con el server. */
const FACTOR_INTERES = 1.12;

const cop = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
});

interface ItemIndice {
  slug: string;
  title: string;
  tipoPotencia: string;
  brand: string;
  model: string;
  image: string;
  price: string;
  priceNum: number;
  precioAnterior: string | null;
  descuentoPct: number | null;
  magnitud: number | null;
  precioPorUnidad: number | null;
  puntaje: number;
  destacado: boolean;
  stock: string;
  description: string;
  ordenTipo?: number | null;
  potenciaW?: number | null;
  tipoInversor?: string | null;
}

type Orden = 'valor' | 'tipo-potencia' | 'precio-asc' | 'precio-desc' | 'potencia-desc' | 'unitario-asc';

interface Filtros {
  marcas: string[];
  tipos: string[];
  precioMin: number | null;
  precioMax: number | null;
  potenciaMin: number | null;
  potenciaMax: number | null;
  soloDisponibles: boolean;
  orden: Orden;
}

const COMPARADORES: Record<Orden, (a: ItemIndice, b: ItemIndice) => number> = {
  valor: (a, b) => b.puntaje - a.puntaje || a.priceNum - b.priceNum,
  'tipo-potencia': (a, b) => {
    const oa = a.ordenTipo ?? 9;
    const ob = b.ordenTipo ?? 9;
    if (oa !== ob) return oa - ob;
    const pa = a.potenciaW ?? Number.POSITIVE_INFINITY;
    const pb = b.potenciaW ?? Number.POSITIVE_INFINITY;
    if (pa !== pb) return pa - pb;
    return a.title.localeCompare(b.title, 'es');
  },
  'precio-asc': (a, b) => a.priceNum - b.priceNum,
  'precio-desc': (a, b) => b.priceNum - a.priceNum,
  'potencia-desc': (a, b) => (b.magnitud ?? -1) - (a.magnitud ?? -1),
  'unitario-asc': (a, b) => (a.precioPorUnidad ?? Infinity) - (b.precioPorUnidad ?? Infinity),
};

function escapar(valor: unknown): string {
  return String(valor ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function cuotaAddi(priceNum: number): string {
  if (!priceNum) return 'Paga a cuotas.';
  const porMes = Math.ceil((priceNum * FACTOR_INTERES) / CUOTAS);
  return `O llévalo en ${CUOTAS} cuotas de ${cop.format(porMes)}`;
}

function iniciar(): void {
  const raiz = document.querySelector<HTMLElement>('[data-filtros]');
  const grid = document.querySelector<HTMLElement>('.cat-grid');
  if (!raiz || !grid) return;

  const panel = raiz.querySelector<HTMLElement>('[data-filtros-panel]');
  const botonPanel = raiz.querySelector<HTMLElement>('[data-filtros-toggle]');
  const contadorActivos = raiz.querySelector<HTMLElement>('[data-filtros-contador]');
  const textoResultado = raiz.querySelector<HTMLElement>('[data-filtros-resultado]');
  const selectOrden = raiz.querySelector<HTMLSelectElement>('[data-filtro-orden]');
  const paginacion = document.querySelector<HTMLElement>('.paginacion');

  const unidad = raiz.dataset.unidad ?? '';
  const urlIndice = raiz.dataset.indice ?? '';
  const ordenDefault = (raiz.dataset.ordenDefault as Orden) || 'valor';
  /** Se toma del navegador para conservar la ruta tal como se cargó, sin filtros. */
  const urlBase = window.location.pathname;

  /** HTML original de Astro: se restaura cuando el usuario limpia los filtros. */
  const gridOriginal = grid.innerHTML;
  const resultadoOriginal = textoResultado?.textContent ?? '';

  let catalogo: ItemIndice[] | null = null;
  let visibles: ItemIndice[] = [];
  let mostrados = 0;

  function numero(selector: string): number | null {
    const el = raiz!.querySelector<HTMLInputElement>(selector);
    if (!el || el.value.trim() === '') return null;
    const n = parseFloat(el.value);
    return Number.isFinite(n) ? n : null;
  }

  function leerFiltros(): Filtros {
    const marcas = [...raiz!.querySelectorAll<HTMLInputElement>('[data-filtro-marca]')]
      .filter((el) => el.checked)
      .map((el) => el.value);
    const tipos = [...raiz!.querySelectorAll<HTMLInputElement>('[data-filtro-tipo]')]
      .filter((el) => el.checked)
      .map((el) => el.value);

    return {
      marcas,
      tipos,
      precioMin: numero('[data-filtro-precio-min]'),
      precioMax: numero('[data-filtro-precio-max]'),
      potenciaMin: numero('[data-filtro-potencia-min]'),
      potenciaMax: numero('[data-filtro-potencia-max]'),
      soloDisponibles:
        raiz!.querySelector<HTMLInputElement>('[data-filtro-disponibles]')?.checked === true,
      orden: (selectOrden?.value as Orden) || ordenDefault,
    };
  }

  function contarActivos(f: Filtros): number {
    return (
      f.marcas.length +
      f.tipos.length +
      (f.precioMin !== null || f.precioMax !== null ? 1 : 0) +
      (f.potenciaMin !== null || f.potenciaMax !== null ? 1 : 0) +
      (f.soloDisponibles ? 1 : 0)
    );
  }

  function hayFiltros(f: Filtros): boolean {
    return contarActivos(f) > 0 || f.orden !== ordenDefault;
  }

  function aplicar(f: Filtros, items: ItemIndice[]): ItemIndice[] {
    const filtrados = items.filter((p) => {
      if (f.marcas.length > 0 && !f.marcas.includes(p.brand)) return false;
      if (f.tipos.length > 0 && (!p.tipoInversor || !f.tipos.includes(p.tipoInversor))) return false;
      if (f.precioMin !== null && p.priceNum < f.precioMin) return false;
      if (f.precioMax !== null && p.priceNum > f.precioMax) return false;
      if (f.soloDisponibles && p.stock !== 'disponible') return false;

      if (f.potenciaMin !== null || f.potenciaMax !== null) {
        // Sin magnitud conocida no se puede afirmar que cumpla el rango.
        if (p.magnitud === null) return false;
        if (f.potenciaMin !== null && p.magnitud < f.potenciaMin) return false;
        if (f.potenciaMax !== null && p.magnitud > f.potenciaMax) return false;
      }

      return true;
    });

    return filtrados.sort(COMPARADORES[f.orden] ?? COMPARADORES.valor);
  }

  function tarjeta(p: ItemIndice): string {
    const etiquetaStock =
      p.stock === 'agotado' ? 'Agotado' : p.stock === 'pre-orden' ? 'Pre-orden' : 'Disponible';

    const badgeDescuento = p.descuentoPct
      ? `<div class="producto-badge-descuento">-${p.descuentoPct}%</div>`
      : '';
    const badgeValor = p.destacado
      ? '<div class="producto-badge-valor"><i class="fas fa-award" aria-hidden="true"></i> Mejor calidad-precio</div>'
      : '';
    const precioAnterior = p.precioAnterior
      ? `<span class="producto-price-anterior">${escapar(p.precioAnterior)}</span>`
      : '';
    // Mismo formato que etiquetaPrecioPorUnidad() en src/utils/calidadPrecio.ts.
    const precioUnitario =
      p.precioPorUnidad !== null && unidad
        ? `<p class="producto-precio-unitario">$${p.precioPorUnidad.toLocaleString('es-CO')} por ${escapar(unidad)}</p>`
        : '';
    // La marca ya va en la línea morada en la mayoría de categorías de tienda.
    const slugIndice = urlIndice.split('/').pop() || '';
    const marcaEnMorado = /^(inversores|baterias|controladores|protecciones|bombeo|reflectores|paneles)\.json$/.test(
      slugIndice
    );
    const marca =
      p.brand && !marcaEnMorado
        ? `<p class="producto-marca-gris">${escapar(p.brand)}</p>`
        : '';

    return `
      <div class="producto-card" data-product-slug="${escapar(p.slug)}">
        <a class="producto-image-link" href="/tienda/${escapar(p.slug)}" aria-label="Ver detalles de ${escapar(p.title)}">
          <div class="producto-image-container">
            <img src="${escapar(p.image)}" alt="${escapar(p.title)}" class="producto-image" loading="lazy" decoding="async" />
            <div class="producto-badge ${escapar(p.stock)}">${etiquetaStock}</div>
            ${badgeDescuento}
            ${badgeValor}
          </div>
        </a>
        <div class="producto-content">
          <a class="producto-meta-stack" href="/tienda/${escapar(p.slug)}">
            <p class="producto-tipo-potencia">${escapar(p.tipoPotencia)}</p>
            ${marca}
            <div class="producto-modelo-recuadro" title="${escapar(p.title)}">${escapar(p.model || p.title)}</div>
          </a>
          <div class="producto-footer-compact">
            <div class="producto-price">${escapar(p.price)}${precioAnterior}</div>
            ${precioUnitario}
            <p class="producto-addi-hint">
              <span>${cuotaAddi(p.priceNum)}</span>
              <img src="/images/Addi.png" alt="Addi" class="producto-addi-logo" loading="lazy" decoding="async" />
            </p>
            <a class="producto-ver-detalles" href="/tienda/${escapar(p.slug)}">Ver detalles</a>
            <div class="producto-actions">
              <div class="quantity-controls" data-product-id="${escapar(p.slug)}">
                <button class="qty-btn minus" type="button" aria-label="Disminuir cantidad">-</button>
                <input type="number" class="qty-input" value="1" min="1" readonly aria-label="Cantidad" />
                <button class="qty-btn plus" type="button" aria-label="Aumentar cantidad">+</button>
              </div>
              <button
                class="producto-btn add-to-cart"
                type="button"
                data-product-id="${escapar(p.slug)}"
                data-product-title="${escapar(p.title)}"
                data-product-description="${escapar(p.description)}"
                data-product-price="${escapar(p.price)}"
                data-product-image="${escapar(p.image)}"
                data-product-brand="${escapar(p.brand)}"
                data-product-model="${escapar(p.model)}"
              >
                <i class="fas fa-shopping-cart"></i>
                Agregar
              </button>
            </div>
          </div>
        </div>
      </div>`;
  }

  function quitarBotonMas(): void {
    document.querySelector('[data-filtros-mas]')?.remove();
  }

  function actualizarBotonMas(): void {
    quitarBotonMas();
    if (mostrados >= visibles.length) return;

    const restantes = visibles.length - mostrados;
    const boton = document.createElement('button');
    boton.type = 'button';
    boton.className = 'filtros-cargar-mas';
    boton.dataset.filtrosMas = '';
    boton.textContent = `Ver ${Math.min(POR_TANDA, restantes)} productos más (${restantes} restantes)`;
    boton.addEventListener('click', pintarTanda);
    grid!.insertAdjacentElement('afterend', boton);
  }

  function pintarTanda(): void {
    const tanda = visibles.slice(mostrados, mostrados + POR_TANDA);
    grid!.insertAdjacentHTML('beforeend', tanda.map(tarjeta).join(''));
    mostrados += tanda.length;
    actualizarBotonMas();
  }

  function sincronizarUrl(f: Filtros): void {
    const params = new URLSearchParams();
    if (f.tipos.length > 0) params.set('tipo', f.tipos.join(','));
    if (f.marcas.length > 0) params.set('marca', f.marcas.join(','));
    if (f.precioMin !== null) params.set('precioMin', String(f.precioMin));
    if (f.precioMax !== null) params.set('precioMax', String(f.precioMax));
    if (f.potenciaMin !== null) params.set('potMin', String(f.potenciaMin));
    if (f.potenciaMax !== null) params.set('potMax', String(f.potenciaMax));
    if (f.soloDisponibles) params.set('disponibles', '1');
    if (f.orden !== ordenDefault) params.set('orden', f.orden);

    const query = params.toString();
    window.history.replaceState(null, '', query ? `${urlBase}?${query}` : urlBase);
  }

  function restaurarEstatico(): void {
    quitarBotonMas();
    grid!.innerHTML = gridOriginal;
    if (paginacion) paginacion.hidden = false;
    if (textoResultado) textoResultado.textContent = resultadoOriginal;
  }

  async function refrescar(): Promise<void> {
    const f = leerFiltros();
    const activos = contarActivos(f);

    if (contadorActivos) {
      contadorActivos.hidden = activos === 0;
      contadorActivos.textContent = String(activos);
    }

    if (!hayFiltros(f)) {
      restaurarEstatico();
      sincronizarUrl(f);
      return;
    }

    if (catalogo === null) {
      if (textoResultado) textoResultado.textContent = 'Buscando…';
      try {
        const respuesta = await fetch(urlIndice);
        if (!respuesta.ok) throw new Error(`HTTP ${respuesta.status}`);
        catalogo = ((await respuesta.json()) as { items: ItemIndice[] }).items;
      } catch {
        if (textoResultado) {
          textoResultado.textContent = 'No se pudo cargar el catálogo. Recargá la página.';
        }
        return;
      }
    }

    visibles = aplicar(f, catalogo);
    mostrados = 0;

    if (paginacion) paginacion.hidden = true;
    quitarBotonMas();

    if (visibles.length === 0) {
      grid!.innerHTML = `
        <div class="filtros-vacio">
          <i class="fas fa-search" aria-hidden="true"></i>
          <p>Ningún producto coincide con estos filtros.</p>
          <button type="button" class="filtros-limpiar" data-filtros-limpiar>Limpiar filtros</button>
        </div>`;
    } else {
      grid!.innerHTML = '';
      pintarTanda();
    }

    if (textoResultado) {
      const sustantivo = visibles.length === 1 ? 'producto' : 'productos';
      textoResultado.textContent = `${visibles.length} ${sustantivo} de ${catalogo.length}`;
    }

    sincronizarUrl(f);
  }

  function limpiar(): void {
    raiz!.querySelectorAll<HTMLInputElement>('input[type="checkbox"]').forEach((el) => {
      el.checked = false;
    });
    raiz!.querySelectorAll<HTMLInputElement>('input[type="number"]').forEach((el) => {
      el.value = '';
    });
    if (selectOrden) selectOrden.value = ordenDefault;
    void refrescar();
  }

  // Espera a que el usuario termine de escribir antes de recalcular los rangos.
  let temporizador = 0;
  function refrescarConEspera(): void {
    window.clearTimeout(temporizador);
    temporizador = window.setTimeout(() => void refrescar(), 350);
  }

  raiz.addEventListener('change', (e) => {
    const destino = e.target;
    if (destino instanceof HTMLElement && destino.matches('input[type="checkbox"], select')) {
      void refrescar();
    }
  });

  raiz.addEventListener('input', (e) => {
    if (e.target instanceof HTMLInputElement && e.target.type === 'number') refrescarConEspera();
  });

  // Delegado en document porque el botón de "limpiar" también vive en el estado vacío.
  document.addEventListener('click', (e) => {
    if (e.target instanceof Element && e.target.closest('[data-filtros-limpiar]')) limpiar();
  });

  if (botonPanel && panel) {
    botonPanel.addEventListener('click', () => {
      const abierto = botonPanel.getAttribute('aria-expanded') === 'true';
      botonPanel.setAttribute('aria-expanded', String(!abierto));
      panel.hidden = abierto;
    });
  }

  aplicarFiltrosDeLaUrl();

  /** Rehidrata los controles cuando alguien abre un enlace con filtros ya aplicados. */
  function aplicarFiltrosDeLaUrl(): void {
    const params = new URLSearchParams(window.location.search);
    if ([...params.keys()].length === 0) return;

    const marcas = (params.get('marca') ?? '').split(',').filter(Boolean);
    raiz!.querySelectorAll<HTMLInputElement>('[data-filtro-marca]').forEach((el) => {
      el.checked = marcas.includes(el.value);
    });

    const tipos = (params.get('tipo') ?? '').split(',').filter(Boolean);
    raiz!.querySelectorAll<HTMLInputElement>('[data-filtro-tipo]').forEach((el) => {
      el.checked = tipos.includes(el.value);
    });

    const asignar = (selector: string, valor: string | null): void => {
      const el = raiz!.querySelector<HTMLInputElement>(selector);
      if (el && valor) el.value = valor;
    };
    asignar('[data-filtro-precio-min]', params.get('precioMin'));
    asignar('[data-filtro-precio-max]', params.get('precioMax'));
    asignar('[data-filtro-potencia-min]', params.get('potMin'));
    asignar('[data-filtro-potencia-max]', params.get('potMax'));

    const dispo = raiz!.querySelector<HTMLInputElement>('[data-filtro-disponibles]');
    if (dispo) dispo.checked = params.get('disponibles') === '1';

    const orden = params.get('orden');
    if (selectOrden && orden && orden in COMPARADORES) selectOrden.value = orden;

    if (panel && botonPanel) {
      panel.hidden = false;
      botonPanel.setAttribute('aria-expanded', 'true');
    }

    void refrescar();
  }
}

iniciar();
