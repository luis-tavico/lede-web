/* ==========================================================================
   Utilidades compartidas por el portal y las tiendas.
   Requiere js/datos.js y js/iconos.js (archivos generados).
   ========================================================================== */
(function () {
  'use strict';

  // Las páginas de tienda viven en /tienda/, así que las rutas de assets llevan «../».
  var RAIZ = document.documentElement.getAttribute('data-raiz') || '';
  var datos = window.ESTACION;

  // Estado de la red que guarda el Administrador de la red (wp-admin.html de la raíz):
  // tiendas dadas de alta y sitios desactivados, archivados, marcados como spam o borrados.
  var CLAVE_RED = 'estacion-red';
  function leerRed() {
    var red;
    try { red = JSON.parse(localStorage.getItem(CLAVE_RED)); } catch (e) { red = null; }
    red = red || {};
    return { nuevos: red.nuevos || [], estados: red.estados || {} };
  }
  function guardarRed(red) {
    try { localStorage.setItem(CLAVE_RED, JSON.stringify(red)); return true; } catch (e) { return false; }
  }
  (function aplicarRed() {
    var red = leerRed();
    datos.emprendedores = datos.emprendedores.concat(red.nuevos)
      .filter(function (e) { return red.estados[e.tienda] !== 'borrado'; });
    datos.emprendedores.forEach(function (e) { e.estadoSitio = (e.tienda && red.estados[e.tienda]) || 'activo'; });
  })();

  // No toca rutas ya resueltas ni imágenes subidas desde el panel (data:).
  function ruta(relativa) { return /^(data:|https?:|\.\.\/|\/)/.test(relativa) ? relativa : RAIZ + relativa; }

  function parametro(nombre) {
    return new URLSearchParams(window.location.search).get(nombre);
  }

  function escapar(texto) {
    return String(texto).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  // Q1,250.00 — formato de WooCommerce configurado en quetzales.
  function dinero(monto) {
    return 'Q' + Number(monto).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  // Minúsculas y sin tildes, para que «cafe» encuentre «Café».
  function normalizar(texto) {
    return String(texto).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  }

  function iniciales(nombre) {
    return nombre.replace(/[^A-Za-zÁÉÍÓÚÑáéíóúñ0-9 ]/g, ' ').trim().split(/\s+/)
      .slice(0, 2).map(function (p) { return p.charAt(0).toUpperCase(); }).join('');
  }

  function icono(nombre) {
    var svg = (window.ICONOS || {})[nombre] || '';
    return '<span class="icono">' + svg + '</span>';
  }

  // Imagen o, si no se recuperó, el recuadro gris con iniciales.
  function imagen(src, alt, nombre) {
    if (src) return '<img src="' + ruta(src) + '" alt="' + escapar(alt) + '" loading="lazy">';
    return '<div class="sin-imagen" aria-hidden="true">' + escapar(iniciales(nombre || alt)) + '</div>';
  }

  // Los textos que no se recuperaron vienen como «[...]» y se muestran como pendientes.
  function textoOPendiente(texto, etiqueta) {
    etiqueta = etiqueta || 'p';
    var clase = /^\[/.test(texto) ? ' class="pendiente"' : '';
    return '<' + etiqueta + clase + '>' + escapar(texto) + '</' + etiqueta + '>';
  }

  function porPerfil(slug) {
    return datos.emprendedores.find(function (e) { return e.perfil === slug; });
  }

  function porTienda(slug) {
    if (!slug) return undefined;  // los perfiles sin tienda tienen tienda: null
    return datos.emprendedores.find(function (e) { return e.tienda === slug; });
  }

  function categoria(slug) {
    return datos.categorias.find(function (c) { return c.slug === slug; });
  }

  function pintarIconos(raiz) {
    (raiz || document).querySelectorAll('[data-icono]').forEach(function (el) {
      el.innerHTML = (window.ICONOS || {})[el.getAttribute('data-icono')] || '';
      el.classList.add('icono');
      el.removeAttribute('data-icono');
    });
  }

  // ---------- Menú plegable en celular ----------
  function iniciarMenu() {
    var boton = document.querySelector('.encabezado__abrir-menu');
    var menu = document.getElementById('menu-principal');
    if (!boton || !menu) return;
    boton.addEventListener('click', function () {
      var abierto = menu.classList.toggle('esta-abierto');
      boton.setAttribute('aria-expanded', String(abierto));
      boton.innerHTML = icono(abierto ? 'cerrar' : 'menu');
    });
  }

  // ---------- Carrusel principal ----------
  function iniciarCarrusel(carrusel) {
    var pista = carrusel.querySelector('.carrusel__pista');
    var diapositivas = pista.children;
    var puntos = carrusel.nextElementSibling && carrusel.nextElementSibling.classList.contains('carrusel__puntos')
      ? carrusel.nextElementSibling : null;
    var actual = 0;
    var temporizador;

    if (diapositivas.length < 2) {
      carrusel.querySelectorAll('.carrusel__flecha').forEach(function (b) { b.hidden = true; });
      if (puntos) puntos.hidden = true;
      return;
    }

    if (puntos) {
      puntos.innerHTML = '';
      Array.prototype.forEach.call(diapositivas, function (_, i) {
        var b = document.createElement('button');
        b.type = 'button';
        b.setAttribute('aria-label', 'Ir a la diapositiva ' + (i + 1));
        b.addEventListener('click', function () { ir(i); });
        puntos.appendChild(b);
      });
    }

    function ir(i) {
      actual = (i + diapositivas.length) % diapositivas.length;
      pista.style.transform = 'translateX(' + (-100 * actual) + '%)';
      Array.prototype.forEach.call(diapositivas, function (d, j) { d.setAttribute('aria-hidden', String(j !== actual)); });
      if (puntos) {
        Array.prototype.forEach.call(puntos.children, function (b, j) { b.setAttribute('aria-current', String(j === actual)); });
      }
    }

    function reiniciar() {
      clearInterval(temporizador);
      if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        temporizador = setInterval(function () { ir(actual + 1); }, 6000);
      }
    }

    carrusel.querySelector('.carrusel__flecha--anterior').addEventListener('click', function () { ir(actual - 1); reiniciar(); });
    carrusel.querySelector('.carrusel__flecha--siguiente').addEventListener('click', function () { ir(actual + 1); reiniciar(); });
    carrusel.addEventListener('mouseenter', function () { clearInterval(temporizador); });
    carrusel.addEventListener('mouseleave', reiniciar);
    ir(0);
    reiniciar();
  }

  // ---------- «Mantente informado» (demostración: no se guarda nada) ----------
  function iniciarBoletin() {
    document.querySelectorAll('.boletin form').forEach(function (form) {
      form.addEventListener('submit', function (ev) {
        ev.preventDefault();
        var aviso = form.parentElement.querySelector('.boletin__aviso');
        aviso.hidden = false;
        form.reset();
      });
    });
  }

  function iniciar() {
    var guia = document.createElement('a');
    guia.className = 'volver-guia';
    guia.href = RAIZ + 'index.html';
    guia.textContent = '← Guía de la demostración';
    document.body.appendChild(guia);
    pintarIconos();
    iniciarMenu();
    document.querySelectorAll('.carrusel').forEach(iniciarCarrusel);
    iniciarBoletin();
    var anio = document.querySelector('[data-anio]');
    if (anio) anio.textContent = new Date().getFullYear();
  }

  window.Estacion = {
    datos: datos,
    leerRed: leerRed,
    guardarRed: guardarRed,
    ruta: ruta,
    parametro: parametro,
    escapar: escapar,
    dinero: dinero,
    normalizar: normalizar,
    iniciales: iniciales,
    icono: icono,
    imagen: imagen,
    textoOPendiente: textoOPendiente,
    porPerfil: porPerfil,
    porTienda: porTienda,
    categoria: categoria,
    pintarIconos: pintarIconos,
    iniciarCarrusel: iniciarCarrusel,
    iniciar: iniciar
  };
})();
