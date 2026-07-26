/**
 * whatsapp.js
 * Construye enlaces de WhatsApp con mensaje prellenado a partir
 * de los datos de un producto y las selecciones del visitante.
 */

const NUMERO_WHATSAPP_RESPALDO = '5219933840634';

/**
 * Arma la URL de wa.me con el mensaje ya codificado.
 * @param {string} numero - Número de WhatsApp en formato internacional sin '+'.
 * @param {object} datos - { nombre, precio, unidad, talla, color }
 * @returns {string} URL lista para usar en un enlace.
 */
function construirEnlaceWhatsapp(numero, datos) {
  const partes = [`Hola, me interesa: ${datos.nombre}.`];

  if (datos.precio) {
    partes.push(`Precio: $${datos.precio} MXN por ${datos.unidad}.`);
  }

  if (datos.nota) {
    partes.push(`Notas: ${datos.nota}.`);
  }

  partes.push('¿Me pueden dar más información para hacer mi pedido?');

  const mensaje = encodeURIComponent(partes.join(' '));
  const numeroFinal = numero || NUMERO_WHATSAPP_RESPALDO;

  return `https://wa.me/${numeroFinal}?text=${mensaje}`;
}
