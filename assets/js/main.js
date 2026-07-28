/**
 * main.js
 * Comportamiento general del sitio: menú móvil y
 * revelado de secciones al hacer scroll.
 */

function iniciarMenuMovil() {
  const boton = document.querySelector('[data-nav-toggle]');
  const menu = document.querySelector('[data-nav-menu]');

  if (!boton || !menu) return;

  boton.addEventListener('click', () => {
    const abierto = boton.getAttribute('aria-expanded') === 'true';
    boton.setAttribute('aria-expanded', String(!abierto));
    menu.hidden = abierto;
  });

  menu.querySelectorAll('a').forEach((enlace) => {
    enlace.addEventListener('click', () => {
      boton.setAttribute('aria-expanded', 'false');
      menu.hidden = true;
    });
  });
}

function iniciarRevelado() {
  const elementos = document.querySelectorAll('.reveal');

  if (!elementos.length) return;

  if (!('IntersectionObserver' in window)) {
    elementos.forEach((el) => el.classList.add('reveal--visible'));
    return;
  }

  const observador = new IntersectionObserver(
    (entradas) => {
      entradas.forEach((entrada, indice) => {
        if (entrada.isIntersecting) {
          setTimeout(() => {
            entrada.target.classList.add('reveal--visible');
          }, indice * 60);
          observador.unobserve(entrada.target);
        }
      });
    },
    { threshold: 0.15 }
  );

  elementos.forEach((el) => observador.observe(el));
}

document.addEventListener('DOMContentLoaded', () => {
  iniciarMenuMovil();
  iniciarRevelado();
});

// El catálogo se renderiza de forma asíncrona (fetch a productos.json),
// así que sus tarjetas .reveal aparecen después de DOMContentLoaded.
window.addEventListener('catalogo:listo', iniciarRevelado);
