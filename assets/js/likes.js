/**
 * likes.js
 * Corazón de "me gusta" por producto.
 *
 * Si "likesScriptURL" está configurado en productos.json (un Google Apps Script
 * publicado como Web App, ver instrucciones en Docs/likes-apps-script.js),
 * el conteo se comparte entre todas las personas que visitan el sitio.
 *
 * Si no está configurado, el corazón sigue funcionando pero el conteo solo
 * se guarda en este navegador (no es un conteo real entre visitantes).
 */

function claveLocal(id) {
  return `arte-en-lomillo:like:${id}`;
}

function yaLeDioLike(id) {
  return localStorage.getItem(claveLocal(id)) === '1';
}

function marcarLocal(id, estado) {
  try {
    localStorage.setItem(claveLocal(id), estado ? '1' : '0');
  } catch (error) {
    // Si el navegador bloquea localStorage (modo privado, etc.) el corazón
    // sigue funcionando visualmente, solo no recuerda el estado entre visitas.
  }
}

async function obtenerConteosDesdeScript(url) {
  if (!url) return {};

  try {
    const respuesta = await fetch(url);
    if (!respuesta.ok) throw new Error('No se pudieron leer los likes.');
    const datos = await respuesta.json();
    return datos.conteos || {};
  } catch (error) {
    console.error('No se pudieron cargar los likes compartidos:', error);
    return {};
  }
}

async function enviarLike(url, id, accion) {
  if (!url) return null;

  try {
    const respuesta = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ id, accion }),
    });
    if (!respuesta.ok) throw new Error('No se pudo guardar el like.');
    const datos = await respuesta.json();
    return datos.likes;
  } catch (error) {
    console.error('No se pudo sincronizar el like:', error);
    return null;
  }
}

function crearIconoCorazon() {
  return `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true" focusable="false">
      <path d="M12 20.5s-7.5-4.6-10-9.3C.6 8 1.8 4.5 5 3.4c2-.7 4 0 5.3 1.8L12 7l1.7-1.8c1.3-1.8 3.3-2.5 5.3-1.8 3.2 1.1 4.4 4.6 3 7.8-2.5 4.7-10 9.3-10 9.3Z" />
    </svg>
  `;
}

/**
 * Agrega el botón de corazón dentro del contenedor de imagen de una tarjeta ya creada.
 * @param {HTMLElement} contenedorImagen - el .producto-card__imagen de la tarjeta.
 * @param {string} id - id del producto.
 * @param {number} conteoInicial - likes conocidos al momento de renderizar.
 * @param {string} scriptURL - endpoint de Apps Script (puede venir vacío).
 */
function agregarBotonLike(contenedorImagen, id, conteoInicial, scriptURL) {
  const activo = yaLeDioLike(id);
  let conteo = conteoInicial || 0;

  const boton = document.createElement('button');
  boton.type = 'button';
  boton.className = 'boton-corazon';
  if (activo) boton.classList.add('boton-corazon--activo');
  boton.setAttribute('aria-pressed', String(activo));
  boton.setAttribute('aria-label', 'Me gusta este producto');
  boton.innerHTML = `${crearIconoCorazon()}<span data-rol="like-contador">${conteo}</span>`;

  boton.addEventListener('click', async () => {
    const nuevoEstado = !boton.classList.contains('boton-corazon--activo');
    boton.classList.toggle('boton-corazon--activo', nuevoEstado);
    boton.setAttribute('aria-pressed', String(nuevoEstado));

    conteo = Math.max(0, conteo + (nuevoEstado ? 1 : -1));
    boton.querySelector('[data-rol="like-contador"]').textContent = conteo;
    marcarLocal(id, nuevoEstado);

    const confirmado = await enviarLike(scriptURL, id, nuevoEstado ? 'like' : 'unlike');
    if (confirmado != null) {
      conteo = confirmado;
      boton.querySelector('[data-rol="like-contador"]').textContent = conteo;
    }
  });

  contenedorImagen.appendChild(boton);
}

// obtenerConteosDesdeScript se usa directamente desde catalogo.js (script clásico)
