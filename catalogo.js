/**
 * catalogo.js
 * Carga assets/data/productos.json y renderiza las pestañas
 * de categoría y las tarjetas de producto del catálogo.
 * Depende de whatsapp.js (debe cargarse antes en el HTML).
 */

const RUTA_DATOS = 'assets/data/productos.json';

/**
 * Si "hojaCalculoCSV" viene definido en productos.json, se espera un Google Sheet
 * publicado en la web como CSV (Archivo > Compartir > Publicar en la web > CSV)
 * con columnas: id, precio, unidad, disponible, precio_chica, precio_mediana, precio_grande
 *
 * Fila especial opcional: id = "config-precio-punto", columna "precio" = costo por
 * puntada por metro (ej. 22). Si no existe esa fila, se usa precioPorPuntadaDefault
 * definido en productos.json.
 *
 * Esto permite actualizar precios sin tocar el código del sitio.
 */
async function obtenerDatosDesdeHoja(url) {
  if (!url) return { productos: {}, precioPorPuntada: null };

  try {
    const respuesta = await fetch(url);
    if (!respuesta.ok) throw new Error('No se pudo leer la hoja de cálculo.');
    const texto = await respuesta.text();
    const filas = texto.trim().split('\n').map((fila) => fila.split(','));
    const [encabezadosCrudos, ...datos] = filas;
    const encabezados = encabezadosCrudos.map((h) => h.trim().toLowerCase());

    const idx = (nombre) => encabezados.findIndex((h) => h === nombre);
    const idxId = idx('id');
    const idxPrecio = idx('precio');
    const idxUnidad = idx('unidad');
    const idxDisponible = idx('disponible');
    const idxChica = idx('precio_chica');
    const idxMediana = idx('precio_mediana');
    const idxGrande = idx('precio_grande');

    const numero = (valor) => {
      if (!valor) return null;
      const limpio = Number(valor.replace(/[^0-9.]/g, ''));
      return Number.isFinite(limpio) && valor.trim() !== '' ? limpio : null;
    };

    const mapa = {};
    let precioPorPuntada = null;

    datos.forEach((fila) => {
      if (!fila[idxId]) return;
      const id = fila[idxId].trim();

      if (id === 'config-precio-punto') {
        precioPorPuntada = idxPrecio >= 0 ? numero(fila[idxPrecio]) : null;
        return;
      }

      mapa[id] = {
        precio: idxPrecio >= 0 ? numero(fila[idxPrecio]) : null,
        unidad: idxUnidad >= 0 ? fila[idxUnidad].trim() : null,
        disponible: idxDisponible >= 0 ? fila[idxDisponible].trim().toLowerCase() !== 'no' : true,
        precioChica: idxChica >= 0 ? numero(fila[idxChica]) : null,
        precioMediana: idxMediana >= 0 ? numero(fila[idxMediana]) : null,
        precioGrande: idxGrande >= 0 ? numero(fila[idxGrande]) : null,
      };
    });

    return { productos: mapa, precioPorPuntada };
  } catch (error) {
    console.error('No se pudieron cargar los datos desde la hoja de cálculo:', error);
    return { productos: {}, precioPorPuntada: null };
  }
}

function crearIconoFlecha() {
  return `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
      <path d="M5 12h13" />
      <path d="M13 6l6 6-6 6" />
    </svg>
  `;
}

function formatoMXN(valor) {
  return `$${valor.toLocaleString('es-MX')} MXN`;
}

/**
 * Arma el bloque de precio + controles según el tipo de precio del producto:
 * - "talla": selector Chica/Mediana/Grande, cada una con su propio precio.
 * - "puntada": selector de puntadas + metraje, precio calculado en vivo.
 * - por defecto ("fijo"): precio único ya resuelto en producto.precio.
 */
function crearBloquePrecio(producto) {
  if (producto.tipoPrecio === 'talla') {
    const idSelect = `talla-${producto.id}`;
    const opciones = producto.tallas
      .map((talla) => {
        const clave = `precio${talla}`; // precioChica / precioMediana / precioGrande
        const tienePrecio = producto[clave] != null;
        return `<option value="${talla}">${talla}${tienePrecio ? '' : ' (consultar)'}</option>`;
      })
      .join('');

    return `
      <div class="producto-card__campo">
        <label for="${idSelect}">Elige tu talla</label>
        <select id="${idSelect}" data-rol="talla">
          ${opciones}
        </select>
      </div>
      <p class="producto-card__precio" data-rol="precio-mostrado"></p>
    `;
  }

  if (producto.tipoPrecio === 'puntada' && producto.exclusivo) {
    const puntadaFija = producto.puntadasDisponibles[0];
    const precioPorMetro = puntadaFija * producto.precioPorPuntada;

    return `
      <p class="producto-card__precio" data-rol="precio-mostrado">${formatoMXN(precioPorMetro)} <span>/ metro (${puntadaFija} puntadas)</span></p>
      <p class="producto-card__nota-exclusiva">Este diseño solo está disponible en ${puntadaFija} puntadas. ¿Buscas otra cantidad de puntadas, más metros o algún detalle? Pregúntanos por WhatsApp.</p>
    `;
  }

  if (producto.tipoPrecio === 'puntada') {
    const idPuntada = `puntada-${producto.id}`;
    const idMetros = `metros-${producto.id}`;
    const opciones = producto.puntadasDisponibles
      .map((p) => `<option value="${p}">${p} puntadas</option>`)
      .join('');

    return `
      <div class="producto-card__campo">
        <label for="${idPuntada}">Puntadas</label>
        <select id="${idPuntada}" data-rol="puntada">
          ${opciones}
        </select>
      </div>
      <div class="producto-card__campo">
        <label for="${idMetros}">Metros</label>
        <input type="number" id="${idMetros}" data-rol="metros" value="1" min="1" step="1" inputmode="numeric" />
      </div>
      <p class="producto-card__precio" data-rol="precio-mostrado"></p>
    `;
  }

  const precioHTML = producto.precio
    ? `$${producto.precio.toLocaleString('es-MX')} MXN <span>/ ${producto.unidad || 'pieza'}</span>`
    : 'Consultar precio';

  return `<p class="producto-card__precio" data-rol="precio-mostrado">${precioHTML}</p>`;
}

/**
 * Calcula el precio actual mostrado en la tarjeta y regresa también
 * un texto listo para incluir en el mensaje de WhatsApp.
 */
function actualizarPrecioMostrado(card, producto) {
  const elementoPrecio = card.querySelector('[data-rol="precio-mostrado"]');

  if (producto.tipoPrecio === 'talla') {
    const talla = card.querySelector('[data-rol="talla"]').value;
    const clave = `precio${talla}`;
    const precio = producto[clave];

    elementoPrecio.innerHTML = precio
      ? `${formatoMXN(precio)} <span>/ talla ${talla.toLowerCase()}</span>`
      : `<span class="producto-card__precio--consultar">Consultar precio (talla ${talla.toLowerCase()})</span>`;

    return { talla, precio, resumen: precio ? `Talla ${talla}: ${formatoMXN(precio)}` : `Talla ${talla} (consultar precio)` };
  }

  if (producto.tipoPrecio === 'puntada' && producto.exclusivo) {
    const puntadaFija = producto.puntadasDisponibles[0];
    const precioPorMetro = puntadaFija * producto.precioPorPuntada;

    return {
      puntada: puntadaFija,
      precioPorMetro,
      resumen: `Diseño exclusivo, ${puntadaFija} puntadas — ${formatoMXN(precioPorMetro)}/m (metraje a confirmar por WhatsApp)`,
    };
  }

  if (producto.tipoPrecio === 'puntada') {
    const puntada = Number(card.querySelector('[data-rol="puntada"]').value);
    const campoMetros = card.querySelector('[data-rol="metros"]');
    let metros = Math.round(Number(campoMetros.value)) || 1;
    if (metros < 1) metros = 1;
    campoMetros.value = metros;

    const precioPorMetro = puntada * producto.precioPorPuntada;
    const total = precioPorMetro * metros;

    elementoPrecio.innerHTML = `${formatoMXN(total)} <span>(${puntada} puntadas × ${metros} m)</span>`;

    return {
      puntada,
      metros,
      precioPorMetro,
      total,
      resumen: `${puntada} puntadas, ${metros} m — ${formatoMXN(precioPorMetro)}/m — Total: ${formatoMXN(total)}`,
    };
  }

  return { resumen: producto.precio ? `${formatoMXN(producto.precio)} / ${producto.unidad || 'pieza'}` : 'Consultar precio' };
}

function crearTarjetaProducto(producto, numeroWhatsapp, likesScriptURL) {
  const card = document.createElement('article');
  card.className = 'producto-card reveal';
  card.dataset.categoria = producto.categoria;

  if (producto.disponible === false) {
    card.classList.add('producto-card--agotado');
  }

  const idNota = `nota-${producto.id}`;

  card.innerHTML = `
    <div class="producto-card__imagen">
      <img src="${producto.imagen}" alt="${producto.nombre}, bordado artesanal en punto de lomillo, hecho a mano en Tabasco" loading="lazy" />
    </div>
    <div class="producto-card__cuerpo">
      <p class="producto-card__categoria">Bordado artesanal · Hecho a mano</p>
      ${producto.exclusivo ? '<span class="etiqueta-exclusiva">Diseño exclusivo</span>' : ''}
      <h3 class="producto-card__nombre">${producto.nombre}</h3>
      <p class="producto-card__descripcion">${producto.descripcion}</p>
      ${crearBloquePrecio(producto)}
      <div class="producto-card__campo">
        <label for="${idNota}">¿Te encantó? Cuéntanos los detalles y pídelo ahora</label>
        <div class="producto-card__input-grupo">
          <input type="text" id="${idNota}" placeholder="Escribe aquí y presiona enviar" />
          <button type="button" class="boton-flecha" data-rol="enviar-pedido" aria-label="Enviar pedido de ${producto.nombre} por WhatsApp">
            ${crearIconoFlecha()}
          </button>
        </div>
        <p class="producto-card__ayuda">Tu mensaje se envía directo por WhatsApp.</p>
      </div>
    </div>
  `;

  const refrescarPrecio = () => actualizarPrecioMostrado(card, producto);
  refrescarPrecio();

  card.querySelectorAll('[data-rol="talla"], [data-rol="puntada"], [data-rol="metros"]').forEach((control) => {
    control.addEventListener('change', refrescarPrecio);
    control.addEventListener('input', refrescarPrecio);
  });

  const campoMetros = card.querySelector('[data-rol="metros"]');
  if (campoMetros) {
    campoMetros.addEventListener('focus', () => campoMetros.select());
  }

  const botonEnviar = card.querySelector('[data-rol="enviar-pedido"]');
  botonEnviar.addEventListener('click', () => {
    const nota = card.querySelector(`#${idNota}`).value.trim();
    const { resumen } = refrescarPrecio();

    const url = construirEnlaceWhatsapp(numeroWhatsapp, {
      nombre: producto.nombre,
      detallePrecio: resumen,
      nota,
    });

    window.open(url, '_blank', 'noopener');
  });

  agregarBotonLike(card.querySelector('.producto-card__imagen'), producto.id, producto.likes, likesScriptURL);

  return card;
}

function crearTab(categoria, activa) {
  const boton = document.createElement('button');
  boton.type = 'button';
  boton.className = 'catalogo__tab';
  boton.textContent = categoria.nombre;
  boton.dataset.categoria = categoria.id;
  boton.setAttribute('role', 'tab');
  boton.setAttribute('aria-selected', String(activa));
  return boton;
}

function filtrarGrid(grid, categoriaId) {
  grid.querySelectorAll('.producto-card').forEach((card) => {
    const visible = categoriaId === 'todas' || card.dataset.categoria === categoriaId;
    card.hidden = !visible;
  });
}

const SITIO_URL = 'https://arteenlomillo.com';

/**
 * Arma el bloque "offers" de un producto para Schema.org, usando siempre
 * los precios ya resueltos (mezcla de productos.json + Google Sheet) en
 * el momento de la carga. Así nunca queda desincronizado con lo que se
 * le muestra al visitante.
 */
function construirOfertaProducto(producto) {
  const disponibilidad = producto.disponible === false
    ? 'https://schema.org/OutOfStock'
    : 'https://schema.org/InStock';

  if (producto.tipoPrecio === 'talla') {
    const precios = ['precioChica', 'precioMediana', 'precioGrande']
      .map((clave) => producto[clave])
      .filter((precio) => precio != null);

    if (!precios.length) return null;

    if (precios.length === 1) {
      return { '@type': 'Offer', priceCurrency: 'MXN', price: precios[0], availability: disponibilidad };
    }

    return {
      '@type': 'AggregateOffer',
      priceCurrency: 'MXN',
      lowPrice: Math.min(...precios),
      highPrice: Math.max(...precios),
      offerCount: precios.length,
      availability: disponibilidad,
    };
  }

  if (producto.tipoPrecio === 'puntada') {
    const precios = producto.puntadasDisponibles.map((p) => p * producto.precioPorPuntada);

    if (precios.length === 1) {
      return {
        '@type': 'Offer',
        priceCurrency: 'MXN',
        price: precios[0],
        availability: disponibilidad,
        priceSpecification: { '@type': 'UnitPriceSpecification', price: precios[0], priceCurrency: 'MXN', unitText: 'metro' },
      };
    }

    return {
      '@type': 'AggregateOffer',
      priceCurrency: 'MXN',
      lowPrice: Math.min(...precios),
      highPrice: Math.max(...precios),
      offerCount: precios.length,
      availability: disponibilidad,
    };
  }

  if (producto.precio) {
    return { '@type': 'Offer', priceCurrency: 'MXN', price: producto.precio, availability: disponibilidad };
  }

  return null;
}

function inyectarDatosEstructuradosProductos(productos) {
  const items = productos
    .map((producto) => {
      const offers = construirOfertaProducto(producto);
      if (!offers) return null;

      return {
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: producto.nombre,
        description: producto.descripcion,
        image: `${SITIO_URL}/${producto.imagen}`,
        category: 'Ropa y accesorios bordados a mano',
        brand: { '@type': 'Brand', name: 'Arte en Lomillo' },
        offers,
      };
    })
    .filter(Boolean);

  if (!items.length) return;

  const script = document.createElement('script');
  script.type = 'application/ld+json';
  script.textContent = JSON.stringify(items);
  document.head.appendChild(script);
}

async function iniciarCatalogo() {
  const contenedorTabs = document.querySelector('[data-catalogo-tabs]');
  const grid = document.querySelector('[data-catalogo-grid]');

  if (!contenedorTabs || !grid) return;

  try {
    const respuesta = await fetch(RUTA_DATOS);
    if (!respuesta.ok) throw new Error('No se pudo cargar el catálogo.');
    const datos = await respuesta.json();

    const { productos: preciosHoja, precioPorPuntada } = await obtenerDatosDesdeHoja(datos.hojaCalculoCSV);
    const tarifaPuntada = precioPorPuntada ?? datos.precioPorPuntadaDefault ?? 22;
    const conteosLikes = await obtenerConteosDesdeScript(datos.likesScriptURL);

    datos.productos = datos.productos.map((producto) => {
      const override = preciosHoja[producto.id] || {};
      return {
        ...producto,
        precio: override.precio ?? producto.precio ?? null,
        unidad: override.unidad || producto.unidad,
        disponible: override.disponible,
        precioChica: override.precioChica ?? null,
        precioMediana: override.precioMediana ?? null,
        precioGrande: override.precioGrande ?? null,
        precioPorPuntada: tarifaPuntada,
        likes: conteosLikes[producto.id] || 0,
      };
    });

    datos.categorias.forEach((categoria, indice) => {
      const tab = crearTab(categoria, indice === 0);
      tab.addEventListener('click', () => {
        contenedorTabs.querySelectorAll('.catalogo__tab').forEach((t) => t.setAttribute('aria-selected', 'false'));
        tab.setAttribute('aria-selected', 'true');
        filtrarGrid(grid, categoria.id);
      });
      contenedorTabs.appendChild(tab);
    });

    datos.productos.forEach((producto) => {
      grid.appendChild(crearTarjetaProducto(producto, datos.whatsapp, datos.likesScriptURL));
    });

    if (datos.categorias[0]) {
      filtrarGrid(grid, datos.categorias[0].id);
    }

    inyectarDatosEstructuradosProductos(datos.productos);

    window.dispatchEvent(new Event('catalogo:listo'));
  } catch (error) {
    grid.innerHTML = '<p>No se pudo cargar el catálogo en este momento. Escríbenos por WhatsApp para conocer los productos disponibles.</p>';
    console.error(error);
  }
}

document.addEventListener('DOMContentLoaded', iniciarCatalogo);
