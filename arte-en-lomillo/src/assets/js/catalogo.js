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
 * con columnas: id,precio,unidad,disponible
 * Esto permite actualizar precios sin tocar el código del sitio.
 */
async function obtenerPreciosDesdeHoja(url) {
  if (!url) return {};

  try {
    const respuesta = await fetch(url);
    if (!respuesta.ok) throw new Error('No se pudo leer la hoja de cálculo.');
    const texto = await respuesta.text();
    const filas = texto.trim().split('\n').map((fila) => fila.split(','));
    const [encabezados, ...datos] = filas;

    const idxId = encabezados.findIndex((h) => h.trim().toLowerCase() === 'id');
    const idxPrecio = encabezados.findIndex((h) => h.trim().toLowerCase() === 'precio');
    const idxUnidad = encabezados.findIndex((h) => h.trim().toLowerCase() === 'unidad');
    const idxDisponible = encabezados.findIndex((h) => h.trim().toLowerCase() === 'disponible');

    const mapa = {};
    datos.forEach((fila) => {
      if (!fila[idxId]) return;
      const id = fila[idxId].trim();
      mapa[id] = {
        precio: idxPrecio >= 0 ? Number(fila[idxPrecio].replace(/[^0-9.]/g, '')) : null,
        unidad: idxUnidad >= 0 ? fila[idxUnidad].trim() : null,
        disponible: idxDisponible >= 0 ? fila[idxDisponible].trim().toLowerCase() !== 'no' : true,
      };
    });
    return mapa;
  } catch (error) {
    console.error('No se pudieron cargar los precios desde la hoja de cálculo:', error);
    return {};
  }
}

function crearIconoWhatsapp() {
  return `
    <svg class="icono-whatsapp" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false">
      <path d="M12 2a10 10 0 0 0-8.62 15.06L2 22l5.06-1.33A10 10 0 1 0 12 2Zm0 18.2a8.16 8.16 0 0 1-4.16-1.14l-.3-.18-3 .79.8-2.93-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.52-6.14c-.25-.13-1.47-.72-1.7-.8-.23-.08-.4-.13-.56.13-.17.25-.65.8-.79.96-.15.17-.29.19-.54.06a6.7 6.7 0 0 1-1.97-1.22 7.4 7.4 0 0 1-1.36-1.7c-.14-.25 0-.38.11-.5.11-.12.25-.29.37-.44.12-.15.16-.25.25-.42.08-.17.04-.31-.02-.44-.06-.13-.56-1.35-.77-1.85-.2-.48-.4-.42-.56-.42h-.48a.9.9 0 0 0-.65.3 2.75 2.75 0 0 0-.86 2.05c0 1.2.87 2.37 1 2.53.12.17 1.71 2.6 4.14 3.65.58.25 1.03.4 1.38.51.58.19 1.11.16 1.53.1.47-.07 1.47-.6 1.67-1.18.21-.58.21-1.07.15-1.18-.06-.1-.23-.16-.48-.28Z" />
    </svg>
  `;
}

function crearTarjetaProducto(producto, numeroWhatsapp) {
  const card = document.createElement('article');
  card.className = 'producto-card reveal';
  card.dataset.categoria = producto.categoria;

  if (producto.disponible === false) {
    card.classList.add('producto-card--agotado');
  }

  const idNota = `nota-${producto.id}`;

  const precioHTML = producto.precio
    ? `<p class="producto-card__precio">$${producto.precio.toLocaleString('es-MX')} MXN <span>/ ${producto.unidad}</span></p>`
    : `<p class="producto-card__precio producto-card__precio--consultar">Consultar precio</p>`;

  card.innerHTML = `
    <div class="producto-card__imagen">
      <img src="${producto.imagen}" alt="${producto.nombre}, bordado artesanal en punto de lomillo, hecho a mano en Tabasco" loading="lazy" />
    </div>
    <div class="producto-card__cuerpo">
      <p class="producto-card__categoria">Bordado artesanal · Hecho a mano</p>
      <h3 class="producto-card__nombre">${producto.nombre}</h3>
      <p class="producto-card__descripcion">${producto.descripcion}</p>
      ${precioHTML}
      <div class="producto-card__campo">
        <label for="${idNota}">Notas para tu pedido (opcional)</label>
        <input type="text" id="${idNota}" placeholder="Ej. color, talla o alguna preferencia" />
      </div>
      <div class="producto-card__accion">
        <a class="enlace-pedido" href="#" target="_blank" rel="noopener">
          ${crearIconoWhatsapp()} Pedir por WhatsApp
        </a>
      </div>
    </div>
  `;

  const enlace = card.querySelector('.enlace-pedido');
  enlace.addEventListener('click', (evento) => {
    evento.preventDefault();

    const nota = card.querySelector(`#${idNota}`).value.trim();

    const url = construirEnlaceWhatsapp(numeroWhatsapp, {
      nombre: producto.nombre,
      precio: producto.precio,
      unidad: producto.unidad,
      nota,
    });

    window.open(url, '_blank', 'noopener');
  });

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

async function iniciarCatalogo() {
  const contenedorTabs = document.querySelector('[data-catalogo-tabs]');
  const grid = document.querySelector('[data-catalogo-grid]');

  if (!contenedorTabs || !grid) return;

  try {
    const respuesta = await fetch(RUTA_DATOS);
    if (!respuesta.ok) throw new Error('No se pudo cargar el catálogo.');
    const datos = await respuesta.json();

    const preciosHoja = await obtenerPreciosDesdeHoja(datos.hojaCalculoCSV);

    datos.productos = datos.productos.map((producto) => {
      const override = preciosHoja[producto.id];
      if (!override) return producto;
      return {
        ...producto,
        precio: override.precio ?? producto.precio,
        unidad: override.unidad || producto.unidad,
        disponible: override.disponible,
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
      grid.appendChild(crearTarjetaProducto(producto, datos.whatsapp));
    });

    if (datos.categorias[0]) {
      filtrarGrid(grid, datos.categorias[0].id);
    }

    window.dispatchEvent(new Event('catalogo:listo'));
  } catch (error) {
    grid.innerHTML = '<p>No se pudo cargar el catálogo en este momento. Escríbenos por WhatsApp para conocer los productos disponibles.</p>';
    console.error(error);
  }
}

document.addEventListener('DOMContentLoaded', iniciarCatalogo);
