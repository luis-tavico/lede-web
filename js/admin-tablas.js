/* En celular las tablas de los paneles se apilan: cada celda necesita el título de su
   columna (data-titulo), que el CSS muestra delante del valor. Se etiquetan solas
   cada vez que una pantalla pinta una tabla. */
(function () {
  'use strict';

  function etiquetar(raiz) {
    raiz.querySelectorAll('table.wp-tabla').forEach(function (tabla) {
      var titulos = Array.prototype.map.call(tabla.querySelectorAll(':scope > thead th'), function (th) {
        return th.querySelector('.solo-lectores') ? '' : th.textContent.trim();
      });
      tabla.querySelectorAll(':scope > tbody > tr').forEach(function (fila) {
        Array.prototype.forEach.call(fila.children, function (celda, i) {
          if (i > 0 && titulos[i] && titulos[i].length > 1 && !celda.hasAttribute('colspan')) celda.setAttribute('data-titulo', titulos[i]);
        });
      });
    });
  }

  var cuerpo = document.querySelector('.wp-cuerpo');
  if (!cuerpo) return;
  new MutationObserver(function () { etiquetar(cuerpo); }).observe(cuerpo, { childList: true, subtree: true });
  etiquetar(cuerpo);
})();
