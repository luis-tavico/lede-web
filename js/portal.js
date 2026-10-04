/* ==========================================================================
   Portal: pinta las partes que dependen de datos según <body data-pagina>.
   ========================================================================== */
(function () {
  'use strict';

  var E = window.Estacion;
  var datos = E.datos;

  function urlPerfil(e) { return 'emprendedor.html?perfil=' + encodeURIComponent(e.perfil); }
  function urlEntrada(p) { return 'articulo.html?entrada=' + encodeURIComponent(p.slug); }

  // Tarjeta del directorio: foto del emprendimiento; si no hay, el logo; si no, iniciales.
  function tarjetaEmprendedor(e) {
    var media = e.foto
      ? '<div class="tarjeta__imagen">' + E.imagen(e.foto, '') + '</div>'
      : '<div class="tarjeta__imagen' + (e.logo ? ' tarjeta__imagen--logo' : '') + '">' + E.imagen(e.logo, '', e.nombre) + '</div>';
    return '<a class="tarjeta" href="' + urlPerfil(e) + '">' + media +
      '<span class="tarjeta__titulo">' + E.escapar(e.nombre) + '</span></a>';
  }

  // Tarjeta de /emprendimientos/ (documento «Versión móvil»): foto, logo redondo
  // encima de la foto, título y descripción corta, alineados a la izquierda.
  function tarjetaDetalle(e) {
    var media = e.foto || e.logo;
    var logo = e.logo && e.foto ? '<span class="tarjeta__logo">' + E.imagen(e.logo, '') + '</span>' : '';
    var descripcion = /^\[/.test(e.descripcion) ? '' : '<p class="tarjeta__descripcion">' + E.escapar(e.descripcion) + '</p>';
    return '<a class="tarjeta tarjeta--detalle" href="' + urlPerfil(e) + '">' +
      '<div class="tarjeta__media"><div class="tarjeta__imagen' + (!e.foto && e.logo ? ' tarjeta__imagen--logo' : '') + '">' +
      E.imagen(media, '', e.nombre) + '</div>' + logo + '</div>' +
      '<div class="tarjeta__cuerpo"><span class="tarjeta__titulo">' + E.escapar(e.nombre) + '</span>' + descripcion + '</div></a>';
  }

  function tarjetaEntrada(p) {
    return '<a class="entrada" href="' + urlEntrada(p) + '">' +
      '<div class="entrada__imagen"></div>' +
      '<div class="entrada__cuerpo">' +
      '<h3 class="entrada__titulo">' + E.escapar(p.titulo) + '</h3>' +
      '<div class="entrada__meta">' +
      // La fecha de un artículo no se recuperó («[fecha]»): no se muestra el marcador.
      (/^\[/.test(p.fecha) ? '<span></span>' : '<span>' + E.icono('reloj') + E.escapar(p.fecha) + '</span>') +
      '<span class="entrada__categoria">' + E.icono('carpeta') + E.escapar(p.categoria) + '</span>' +
      '</div></div></a>';
  }

  // ---------- Directorio con pestañas por categoría ----------
  function directorio(contenedor) {
    var lista = contenedor.querySelector('.pestanas');
    var rejilla = contenedor.querySelector('.rejilla');
    var resultado = contenedor.querySelector('.directorio__resultado');
    var actualizarUrl = contenedor.hasAttribute('data-actualizar-url');
    var tarjeta = contenedor.getAttribute('data-tarjetas') === 'detalle' ? tarjetaDetalle : tarjetaEmprendedor;
    var consulta = (E.parametro('q') || '').trim();
    var elegida = E.parametro('cat');
    if (!E.categoria(elegida)) elegida = datos.categorias[0].slug;

    lista.innerHTML = datos.categorias.map(function (c) {
      return '<li role="presentation"><button class="pestana" type="button" role="tab" id="pestana-' + c.slug + '"' +
        ' aria-controls="' + rejilla.id + '" data-cat="' + c.slug + '">' +
        E.icono('cat-' + c.slug) + E.escapar(c.nombre) + '</button></li>';
    }).join('');

    function mostrar(lista_) {
      rejilla.innerHTML = lista_.map(tarjeta).join('');
      if (!lista_.length) rejilla.innerHTML = '<p class="directorio__vacio">No hay emprendimientos que coincidan.</p>';
    }

    function elegir(slug, enfocar) {
      elegida = slug;
      lista.querySelectorAll('.pestana').forEach(function (b) {
        var activa = b.getAttribute('data-cat') === slug;
        b.setAttribute('aria-selected', String(activa));
        b.tabIndex = activa ? 0 : -1;
        if (activa && enfocar) b.focus();
      });
      rejilla.setAttribute('aria-labelledby', 'pestana-' + slug);
      mostrar(datos.emprendedores.filter(function (e) { return e.categorias.indexOf(slug) !== -1; }));
      if (actualizarUrl) history.replaceState(null, '', '?cat=' + slug);
    }

    lista.addEventListener('click', function (ev) {
      var b = ev.target.closest('.pestana');
      if (!b) return;
      if (resultado) resultado.hidden = true;
      elegir(b.getAttribute('data-cat'));
    });

    // Flechas izquierda/derecha entre pestañas.
    lista.addEventListener('keydown', function (ev) {
      if (ev.key !== 'ArrowRight' && ev.key !== 'ArrowLeft') return;
      var slugs = datos.categorias.map(function (c) { return c.slug; });
      var i = slugs.indexOf(elegida) + (ev.key === 'ArrowRight' ? 1 : -1);
      elegir(slugs[(i + slugs.length) % slugs.length], true);
    });

    // Búsqueda desde el encabezado: resultados en todas las categorías.
    if (consulta && resultado) {
      var q = E.normalizar(consulta);
      var hallados = datos.emprendedores.filter(function (e) {
        return E.normalizar(e.nombre + ' ' + e.descripcion + ' ' + e.productos.map(function (p) { return p.nombre; }).join(' '))
          .indexOf(q) !== -1;
      });
      resultado.hidden = false;
      resultado.innerHTML = hallados.length + ' resultado' + (hallados.length === 1 ? '' : 's') +
        ' para «<strong>' + E.escapar(consulta) + '</strong>» · <a href="emprendimientos.html">Quitar búsqueda</a>';
      document.querySelectorAll('input[name="q"]').forEach(function (i) { i.value = consulta; });
      lista.querySelectorAll('.pestana').forEach(function (b) { b.setAttribute('aria-selected', 'false'); });
      mostrar(hallados);
      return;
    }
    elegir(elegida);
  }

  function logosEmprendedores(lista) {
    lista.innerHTML = datos.emprendedores.filter(function (e) { return e.logo; }).map(function (e) {
      return '<li><a href="' + urlPerfil(e) + '" title="' + E.escapar(e.nombre) + '">' +
        E.imagen(e.logo, e.nombre) + '</a></li>';
    }).join('');
  }

  function entradas(contenedor, cuantas) {
    contenedor.innerHTML = datos.blog.slice(0, cuantas).map(tarjetaEntrada).join('');
  }

  // ---------- Perfil del emprendedor ----------
  function perfil(contenedor) {
    var e = E.porPerfil(E.parametro('perfil'));
    if (!e) {
      contenedor.innerHTML = '<div class="contenedor seccion"><p class="directorio__vacio">No se encontró el emprendimiento. ' +
        '<a href="emprendimientos.html">Ver todos los emprendimientos</a></p></div>';
      return;
    }
    document.title = e.nombre + ' – La Estación del Emprendedor';
    var portada = e.portada ? E.imagen(e.portada, '') : '';
    var logo = e.logo ? E.imagen(e.logo, 'Logo de ' + e.nombre) : E.escapar(E.iniciales(e.nombre));
    var categorias = e.categorias.map(function (slug) {
      var c = E.categoria(slug);
      return '<li><a href="emprendimientos.html?cat=' + slug + '">' + E.escapar(c.nombre) + '</a></li>';
    }).join('');
    // En el perfil va el texto que escribió el emprendedor; si no se tiene, la descripción corta.
    var texto = e.descripcionOriginal || (/^\[/.test(e.descripcion) ? '' : e.descripcion);
    var descripcion = texto ? '<p class="perfil__descripcion">' + E.escapar(texto).replace(/\n/g, '<br>') + '</p>' : '';
    var tienda = e.tienda
      ? '<a class="boton boton--indigo perfil__visitar" href="tienda/index.html?t=' + e.tienda + '">Visitar tienda</a>'
      : '<p class="perfil__sin-tienda">Tienda en línea no disponible por el momento.</p>';

    contenedor.innerHTML =
      '<div class="perfil__portada">' + portada + '</div>' +
      '<div class="contenedor perfil__contenido">' +
      '<div class="perfil__logo">' + logo + '</div>' +
      '<h1 class="perfil__nombre">' + E.escapar(e.nombre) + '</h1>' +
      '<ul class="perfil__categorias" aria-label="Categorías">' + categorias + '</ul>' +
      descripcion +
      tienda + '</div>';
  }

  // ---------- Artículo del blog ----------
  function articulo(contenedor) {
    var p = datos.blog.find(function (b) { return b.slug === E.parametro('entrada'); }) || datos.blog[0];
    document.title = p.titulo + ' – La Estación del Emprendedor';
    // El texto de tres artículos no se conservó: se muestra un texto de ejemplo, como en las plantillas del sitio.
    var cuerpo = p.parrafos
      ? p.parrafos.map(function (t) { return '<p>' + E.escapar(t) + '</p>'; }).join('') +
        (p.autor ? '<p class="articulo__autor">Escrito por: ' + E.escapar(p.autor) + '</p>' : '')
      : '<p class="nota-demo">El texto original de este artículo no se conservó. Se muestra un texto de ejemplo para ilustrar el diseño.</p>' +
        '<p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Vestibulum sagittis orci ac odio dictum tincidunt. Donec ut metus leo. Class aptent taciti sociosqu ad litora torquent per conubia nostra, per inceptos himenaeos.</p>' +
        '<h2>Lorem ipsum dolor sit amet</h2>' +
        '<p>Sed luctus, dui eu sagittis sodales, nulla nibh sagittis augue, vel porttitor diam enim non metus. Vestibulum aliquam augue neque. Phasellus tincidunt odio eget ullamcorper efficitur.</p>';
    // Título, fecha e imagen centrados (documento «Versión móvil»).
    contenedor.innerHTML =
      '<header class="articulo__cabecera"><h1 class="titulo-pagina">' + E.escapar(p.titulo) + '</h1>' +
      '<p class="articulo__meta">' + (/^\[/.test(p.fecha) ? '' : E.escapar(p.fecha) + ' · ') + E.escapar(p.categoria) + '</p></header>' +
      '<div class="articulo__imagen" role="img" aria-label="Imagen destacada no recuperada"></div>' +
      '<div class="texto articulo__cuerpo">' + cuerpo + '</div>' +
      '<p><a class="boton boton--borde" href="blog.html">← Volver al blog</a></p>';
  }

  var acciones = {
    directorio: directorio,
    logos: logosEmprendedores,
    noticias: function (el) { entradas(el, 3); },
    blog: function (el) { entradas(el, datos.blog.length); },
    perfil: perfil,
    articulo: articulo
  };

  document.querySelectorAll('[data-render]').forEach(function (el) {
    acciones[el.getAttribute('data-render')](el);
  });
  E.iniciar();
})();
