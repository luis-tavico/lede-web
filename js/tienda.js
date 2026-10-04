/* ==========================================================================
   Tienda de un emprendedor. La tienda se elige con ?t=<subsitio>, el
   equivalente a /<tienda>/ del Multisite original. Lo que el emprendedor
   cambia en su panel (wp-admin.html) se lee con TiendaEstado.
   El carrito y los pedidos se guardan en localStorage (solo demostración).
   ========================================================================== */
(function () {
  'use strict';

  var E = window.Estacion;
  var TE = window.TiendaEstado;
  var slug = E.parametro('t');
  var estado = slug ? TE(slug) : null;

  if (!estado) {
    document.querySelector('main').innerHTML = '<div class="contenedor seccion"><p class="pendiente">No se encontró la tienda. ' +
      'Las tiendas se abren desde el perfil de cada emprendimiento en el <a href="../emprendimientos.html">directorio</a>.</p></div>';
    E.iniciar();
    return;
  }
  if (estado.tienda.estadoSitio !== 'activo') {
    document.querySelector('main').innerHTML = '<div class="contenedor seccion"><p class="aviso aviso--info">' +
      (estado.tienda.estadoSitio === 'desactivado' ? 'Este sitio ya no está disponible.' : 'Este sitio ha sido archivado o suspendido.') +
      '</p><p><a class="boton boton--indigo" href="../portal.html">Volver a La Estación del Emprendedor</a></p></div>';
    document.querySelectorAll('.encabezado-tienda, .barra-superior, .pie nav, .pie__acceso').forEach(function (n) { n.hidden = true; });
    E.iniciar();
    return;
  }

  var tienda = estado.tienda;
  var cfg = estado.ajustes.config;
  var leer = TE.leer;
  var guardar = TE.escribir;
  var CLAVE_CARRITO = 'estacion-carrito-' + slug;
  var CLAVE_CUPON = 'estacion-cupon-' + slug;

  function q(s) { return '?t=' + slug + (s || ''); }
  function urlProducto(p) { return 'producto.html' + q('&p=' + encodeURIComponent(p.slug)); }

  // ---------- Precios ----------
  function precioHtml(p) {
    if (!Number(p.precio)) return '<span class="precio">Precio a cotizar</span>';
    var desde = p.desde ? '<small>Desde </small>' : '';
    if (estado.precio(p) < Number(p.precio)) {
      return '<span class="precio">' + desde + '<del>' + E.dinero(p.precio) + '</del> <ins>' + E.dinero(estado.precio(p)) + '</ins></span>';
    }
    return '<span class="precio">' + desde + E.dinero(p.precio) + '</span>';
  }

  function botonCompra(p, clases) {
    if (!Number(p.precio)) return '<a class="' + clases + '" href="contacto.html' + q() + '">Solicitar cotización</a>';
    if (p.desde || p.tipo === 'variable' || p.tipo === 'bundle') return '<a class="' + clases + '" href="' + urlProducto(p) + '">Seleccionar opciones</a>';
    return '<button class="' + clases + '" type="button" data-agregar="' + p.slug + '">Añadir al carrito</button>';
  }

  function tarjetaProducto(p) {
    return '<article class="producto">' +
      '<a class="producto__imagen" href="' + urlProducto(p) + '" tabindex="-1" aria-hidden="true">' + E.imagen(p.imagen, p.nombre) + '</a>' +
      '<h3><a class="producto__nombre" href="' + urlProducto(p) + '">' + E.escapar(p.nombre) + '</a></h3>' +
      precioHtml(p) + botonCompra(p, 'boton boton--borde boton--chico') + '</article>';
  }

  function sinProductos() {
    return '<p class="pendiente">No se archivaron productos de esta tienda.</p>';
  }

  // ---------- Carrito ----------
  // Cada línea: { slug, cantidad, contenido } — «contenido» solo en los packs.
  function lineas() {
    return leer(CLAVE_CARRITO, []).map(function (l, i) {
      var p = estado.producto(l.slug);
      if (!p) return null;
      return { indice: i, producto: p, cantidad: l.cantidad, contenido: l.contenido || null, total: estado.precio(p) * l.cantidad };
    }).filter(Boolean);
  }
  function subtotal() { return lineas().reduce(function (s, l) { return s + l.total; }, 0); }
  function cuponActivo() { return estado.cupon(leer(CLAVE_CUPON, '')); }
  function descuento() { return estado.descuento(cuponActivo(), subtotal()); }

  function agregar(s, cantidad, contenido) {
    var items = leer(CLAVE_CARRITO, []);
    var clave = JSON.stringify(contenido || null);
    var item = items.find(function (l) { return l.slug === s && JSON.stringify(l.contenido || null) === clave; });
    if (item) item.cantidad += cantidad; else items.push({ slug: s, cantidad: cantidad, contenido: contenido || null });
    guardar(CLAVE_CARRITO, items);
    actualizarMinicarrito();
  }
  function fijarCantidad(indice, cantidad) {
    var items = leer(CLAVE_CARRITO, []);
    if (items[indice]) items[indice].cantidad = Math.max(0, cantidad);
    guardar(CLAVE_CARRITO, items.filter(function (l) { return l.cantidad > 0; }));
    actualizarMinicarrito();
  }

  function detalleContenido(contenido) {
    if (!contenido) return '';
    return '<ul class="contenido-pack">' + Object.keys(contenido).map(function (s) {
      var p = estado.producto(s);
      return '<li>' + contenido[s] + ' × ' + E.escapar(p ? p.nombre : s) + '</li>';
    }).join('') + '</ul>';
  }

  function actualizarMinicarrito() {
    var cuantos = lineas().reduce(function (s, l) { return s + l.cantidad; }, 0);
    document.querySelectorAll('[data-minicarrito-total]').forEach(function (el) { el.textContent = E.dinero(subtotal()); });
    document.querySelectorAll('[data-minicarrito-cantidad]').forEach(function (el) { el.textContent = cuantos || ''; });
  }

  function avisar(html) {
    var aviso = document.querySelector('[data-aviso]');
    if (!aviso) return;
    aviso.innerHTML = html;
    aviso.hidden = false;
    aviso.scrollIntoView({ block: 'nearest' });
  }

  document.addEventListener('click', function (ev) {
    var b = ev.target.closest('[data-agregar]');
    if (!b || b.disabled) return;
    var p = estado.producto(b.getAttribute('data-agregar'));
    var campo = document.querySelector('[data-cantidad]');
    var cantidad = campo ? Math.max(1, parseInt(campo.value, 10) || 1) : 1;
    var contenido = null;
    if (p.tipo === 'bundle') {
      contenido = {};
      document.querySelectorAll('[data-pack]').forEach(function (i) {
        var n = parseInt(i.value, 10) || 0;
        if (n > 0) contenido[i.getAttribute('data-pack')] = n;
      });
    }
    agregar(p.slug, cantidad, contenido);
    avisar('<span>«' + E.escapar(p.nombre) + '» se ha añadido a tu carrito.</span>' +
      '<a class="boton boton--indigo boton--chico" href="carrito.html' + q() + '">Ver carrito</a>');
  });

  // ---------- Inicio ----------
  function carruselTienda(pista) {
    var c = cfg.carrusel;
    var imagen = c.computadora || (tienda.portada ? E.ruta(tienda.portada) : null);
    if (!imagen) return;
    var d = document.createElement(c.enlace ? 'a' : 'div');
    if (c.enlace) d.href = c.enlace;
    d.className = 'carrusel__diapositiva';
    d.innerHTML = '<picture>' + (c.movil ? '<source media="(max-width: 767px)" srcset="' + c.movil + '">' : '') +
      '<img src="' + imagen + '" alt="' + E.escapar(tienda.nombre) + '"></picture>';
    pista.appendChild(d);
  }

  function masVendidos(el) {
    var lista = estado.productos().slice(0, 8);
    el.innerHTML = lista.length ? '<div class="productos">' + lista.map(tarjetaProducto).join('') + '</div>' : sinProductos();
    if (!lista.length) document.querySelector('.ver-todos').hidden = true;
  }

  function botonesInfo(el) {
    el.innerHTML = cfg.botones.map(function (b) {
      return '<div class="beneficio"><img src="' + E.ruta('assets/iconos/beneficios/' + b.icono + '.png') + '" alt="">' +
        '<strong>' + E.escapar(b.titulo) + '</strong><span>' + E.escapar(b.subtitulo) + '</span></div>';
    }).join('');
  }

  function promocion(el) {
    var pr = cfg.promocion;
    if (!pr.imagen) return;
    var img = '<img src="' + pr.imagen + '" alt="Promoción de ' + E.escapar(tienda.nombre) + '">';
    el.innerHTML = pr.enlace ? '<a href="' + E.escapar(pr.enlace) + '">' + img + '</a>' : '<div>' + img + '</div>';
  }

  // ---------- Catálogo ----------
  function catalogo(el) {
    var consulta = E.normalizar((E.parametro('q') || '').trim());
    var orden = el.querySelector('select');
    var rejilla = el.querySelector('[data-rejilla]');
    var cuenta = el.querySelector('[data-cuenta]');
    var lista = estado.productos().filter(function (p) { return !consulta || E.normalizar(p.nombre).indexOf(consulta) !== -1; });
    if (consulta) document.querySelectorAll('input[name="q"]').forEach(function (i) { i.value = E.parametro('q'); });

    function pintar() {
      var ordenada = lista.slice();
      if (orden.value === 'precio') ordenada.sort(function (a, b) { return estado.precio(a) - estado.precio(b); });
      if (orden.value === 'precio-desc') ordenada.sort(function (a, b) { return estado.precio(b) - estado.precio(a); });
      cuenta.textContent = ordenada.length === 1 ? 'Mostrando el único resultado' : 'Mostrando los ' + ordenada.length + ' resultados';
      rejilla.innerHTML = ordenada.length ? '<div class="productos">' + ordenada.map(tarjetaProducto).join('') + '</div>'
        : (consulta ? '<p class="aviso aviso--info">No se encontraron productos que coincidan con tu búsqueda.</p>' : sinProductos());
    }
    orden.addEventListener('change', pintar);
    pintar();
  }

  // ---------- Ficha de producto ----------
  function filaPack(p) {
    return '<li class="pack__fila"><span class="pack__imagen">' + E.imagen(p.imagen, p.nombre) + '</span>' +
      '<a href="' + urlProducto(p) + '">' + E.escapar(p.nombre) + '</a>' +
      '<label class="solo-lectores" for="pack-' + p.slug + '">Cantidad de ' + E.escapar(p.nombre) + '</label>' +
      '<input class="cantidad" id="pack-' + p.slug + '" type="number" min="0" value="0" data-pack="' + p.slug + '">' +
      precioHtml(p) + '</li>';
  }

  function ficha(el) {
    var p = estado.producto(E.parametro('p'));
    // Una variación (p. ej. desde el carrito) abre su producto con esa opción elegida.
    var elegida = p && p.padre ? p.slug : '';
    if (elegida) p = estado.producto(p.padre);
    if (!p || (p.visibilidad === 'privado' && !leer(estado.claveAdmin, false))) {
      el.innerHTML = '<p class="pendiente">No se encontró el producto. <a href="tienda.html' + q() + '">Volver a la tienda</a></p>';
      return;
    }
    document.title = p.nombre + ' – ' + tienda.nombre;
    var imagen = p.imagen ? E.imagen(p.imagen, p.nombre)
      : '<div class="sin-imagen"><span>' + E.escapar(E.iniciales(p.nombre)) + '</span><small>Imagen no recuperada</small></div>';
    var fotos = p.imagen ? [p.imagen].concat(p.galeria || []) : [];
    var opciones = (p.variaciones || []).map(function (v) { return { etiqueta: v.etiqueta, producto: estado.producto(v.slug) }; })
      .filter(function (v) { return v.producto; });
    opciones.forEach(function (v) { if (v.producto.imagen && fotos.indexOf(v.producto.imagen) === -1) fotos.push(v.producto.imagen); });
    var miniaturas = fotos.length > 1 ? '<ul class="ficha__galeria">' + fotos.map(function (f, i) {
      return '<li><button type="button" data-foto="' + E.escapar(f) + '"' + (i ? '' : ' aria-current="true"') + ' aria-label="Ver foto ' + (i + 1) + '"><img src="' + E.escapar(f) + '" alt="" loading="lazy"></button></li>';
    }).join('') + '</ul>' : '';
    var corta = p.corta ? '<div class="ficha__corta">' + E.escapar(p.corta) + '</div>'
      : '';
    var pack = '';
    var comprar;
    if (p.tipo === 'bundle' && p.pack) {
      var items = (p.pack.items || []).map(estado.producto).filter(Boolean);
      pack = (p.pack.arriba ? '<p class="pack__texto">' + E.escapar(p.pack.arriba) + '</p>' : '') +
        '<ul class="pack">' + items.map(filaPack).join('') + '</ul>' +
        (p.pack.abajo ? '<p class="pack__texto">' + E.escapar(p.pack.abajo) + '</p>' : '') +
        '<p class="aviso aviso--info pack__aviso" data-pack-aviso></p>';
    }
    if (opciones.length) {
      comprar = '<div class="ficha__comprar"><label class="solo-lectores" for="cantidad">Cantidad</label>' +
        '<input class="cantidad" id="cantidad" type="number" min="1" value="1" data-cantidad>' +
        '<button class="boton boton--indigo" type="button" data-agregar="" disabled>Añadir al carrito</button></div>';
    } else if (Number(p.precio)) {
      comprar = '<div class="ficha__comprar"><label class="solo-lectores" for="cantidad">Cantidad</label>' +
        '<input class="cantidad" id="cantidad" type="number" min="1" value="1" data-cantidad>' +
        '<button class="boton boton--' + (p.tipo === 'bundle' ? 'borde' : 'indigo') + '" type="button" data-agregar="' + p.slug + '">Añadir al carrito</button></div>';
    } else {
      comprar = '<div class="ficha__comprar">' + botonCompra(p, 'boton boton--indigo') + '</div>';
    }
    // Atributos «nombre: valor | valor» definidos en el panel → listas, como en la captura de /base/.
    var atributos = (p.atributos || '').split('\n').map(function (l) { return l.split(':'); }).filter(function (a) { return a.length > 1 && a[1].trim(); });
    var variaciones = opciones.length
      ? '<table class="variaciones"><tbody><tr><th><label for="variacion">Tamaño</label></th><td><select id="variacion" data-variacion><option value="">Elige una opción</option>' +
        opciones.map(function (v) {
          return '<option value="' + v.producto.slug + '"' + (v.producto.slug === elegida ? ' selected' : '') + '>' + E.escapar(v.etiqueta) + '</option>';
        }).join('') + '</select></td></tr></tbody></table>'
      : p.tipo === 'variable' && atributos.length
      ? '<table class="variaciones"><tbody>' + atributos.map(function (a, i) {
        return '<tr><th><label for="var-' + i + '">' + E.escapar(a[0].trim()) + '</label></th><td><select id="var-' + i + '"><option value="">Elige una opción</option>' +
          a.slice(1).join(':').split('|').map(function (v) { return '<option>' + E.escapar(v.trim()) + '</option>'; }).join('') + '</select></td></tr>';
      }).join('') + '</tbody></table>'
      : '';
    var meta = (p.sku || opciones.length ? '<p><strong>SKU:</strong> <span data-sku>' + E.escapar(p.sku || 'N/D') + '</span></p>' : '') +
      (p.categorias && p.categorias.length ? '<p><strong>Categoría:</strong> ' + E.escapar(p.categorias.join(', ')) + '</p>' : '') +
      '<p>Vendido por <a href="index.html' + q() + '">' + E.escapar(tienda.nombre) + '</a></p>';
    var relacionados = estado.productos().filter(function (o) { return o.slug !== p.slug; }).slice(0, 4);
    var descripcion = p.descripcion ? '<div class="texto"><p>' + E.escapar(p.descripcion).replace(/\n/g, '<br>') + '</p></div>' : '';

    // Orden de las capturas: título, descripción corta y precio.
    el.innerHTML =
      '<nav class="migas" aria-label="Ruta"><a href="index.html' + q() + '">Inicio</a> / <a href="tienda.html' + q() + '">Tienda</a> / ' + E.escapar(p.nombre) + '</nav>' +
      '<div class="ficha"><div><div class="ficha__imagen">' + imagen + '</div>' + miniaturas + '</div><div>' +
      '<h1 class="ficha__titulo">' + E.escapar(p.nombre) + '</h1>' + corta +
      '<p class="ficha__precio" data-precio>' + (Number(p.precio) ? precioHtml(p) : 'Precio a cotizar') + '</p>' +
      variaciones + pack + comprar + '<div class="ficha__meta">' + meta + '</div>' +
      '</div></div>' +
      '<div class="pestanas-producto"><ul><li>Descripción</li><li>Valoraciones (0)</li></ul>' + descripcion + '</div>' +
      (relacionados.length ? '<section class="relacionados"><h2>Productos relacionados</h2><div class="productos">' +
        relacionados.map(tarjetaProducto).join('') + '</div></section>' : '');

    // Galería: la miniatura elegida pasa a ser la foto grande.
    function mostrarFoto(src) {
      var grande = el.querySelector('.ficha__imagen img');
      if (grande) grande.src = src;
      el.querySelectorAll('[data-foto]').forEach(function (b) {
        if (b.getAttribute('data-foto') === src) b.setAttribute('aria-current', 'true'); else b.removeAttribute('aria-current');
      });
    }
    el.querySelectorAll('[data-foto]').forEach(function (b) {
      b.addEventListener('click', function () { mostrarFoto(b.getAttribute('data-foto')); });
    });

    // Variaciones: cada opción tiene su precio, SKU y foto; sin elegir no se puede comprar.
    var selector = el.querySelector('[data-variacion]');
    if (selector) {
      var elegir = function () {
        var v = estado.producto(selector.value);
        var botonVariacion = el.querySelector('[data-agregar]');
        botonVariacion.disabled = !v;
        botonVariacion.setAttribute('data-agregar', v ? v.slug : '');
        el.querySelector('[data-precio]').innerHTML = precioHtml(v || p);
        el.querySelector('[data-sku]').textContent = v && v.sku ? v.sku : 'N/D';
        if (v && v.imagen) mostrarFoto(v.imagen);
      };
      selector.addEventListener('change', elegir);
      elegir();
    }

    // Pack: la compra queda deshabilitada hasta alcanzar el mínimo («Configuración de Packs»).
    if (p.tipo === 'bundle' && p.pack) {
      var boton = el.querySelector('[data-agregar]');
      var aviso = el.querySelector('[data-pack-aviso]');
      var minimo = Number(p.pack.min) || 1;
      var maximo = Number(p.pack.max) || Infinity;
      var revisar = function () {
        var total = 0;
        el.querySelectorAll('[data-pack]').forEach(function (i) { total += parseInt(i.value, 10) || 0; });
        var valido = total >= minimo && total <= maximo;
        if (boton) boton.disabled = !valido;
        aviso.hidden = valido;
        aviso.textContent = total < minimo
          ? 'Elige al menos ' + minimo + ' en total antes de añadir este pack al carrito.'
          : 'Puedes elegir como máximo ' + maximo + ' en total.';
      };
      el.querySelectorAll('[data-pack]').forEach(function (i) { i.addEventListener('input', revisar); });
      revisar();
    }
  }

  // ---------- Carrito ----------
  function carrito(el) {
    var ls = lineas();
    if (!ls.length) {
      el.innerHTML = '<p class="aviso aviso--info">Tu carrito está vacío.</p>' +
        '<a class="boton boton--indigo" href="tienda.html' + q() + '">Volver a la tienda</a>';
      return;
    }
    var c = cuponActivo();
    var filas = ls.map(function (l) {
      var p = l.producto;
      return '<tr>' +
        '<td><button class="quitar" type="button" data-quitar="' + l.indice + '" aria-label="Quitar ' + E.escapar(p.nombre) + '">×</button></td>' +
        '<td class="tabla-carrito__imagen"><div>' + E.imagen(p.imagen, p.nombre) + '</div></td>' +
        '<td class="tabla-carrito__nombre" data-titulo="Producto"><a href="' + urlProducto(p) + '">' + E.escapar(p.nombre) + '</a>' + detalleContenido(l.contenido) + '</td>' +
        '<td data-titulo="Precio">' + E.dinero(estado.precio(p)) + '</td>' +
        '<td data-titulo="Cantidad"><input class="cantidad" type="number" min="0" value="' + l.cantidad + '" data-linea="' + l.indice + '" aria-label="Cantidad de ' + E.escapar(p.nombre) + '"></td>' +
        '<td data-titulo="Subtotal">' + E.dinero(l.total) + '</td></tr>';
    }).join('');

    el.innerHTML =
      '<table class="tabla-carrito"><thead><tr><th><span class="solo-lectores">Quitar</span></th><th><span class="solo-lectores">Imagen</span></th>' +
      '<th>Producto</th><th>Precio</th><th>Cantidad</th><th>Subtotal</th></tr></thead><tbody>' + filas + '</tbody></table>' +
      '<div class="carrito__acciones"><form class="cupon" data-cupon><label class="solo-lectores" for="cupon">Código de cupón</label>' +
      '<input id="cupon" placeholder="Código de cupón"><button class="boton boton--borde boton--chico">Aplicar cupón</button></form>' +
      '<button class="boton boton--borde-gris boton--chico" type="button" data-actualizar disabled>Actualizar carrito</button></div>' +
      '<p class="aviso aviso--info" data-cupon-aviso hidden></p>' +
      '<div class="totales"><h2>Total del carrito</h2><table>' +
      '<tr><th>Subtotal</th><td>' + E.dinero(subtotal()) + '</td></tr>' +
      (c ? '<tr><th>Cupón: ' + E.escapar(c.codigo) + '</th><td>−' + E.dinero(descuento()) + ' <button class="enlace" type="button" data-quitar-cupon>[Quitar]</button></td></tr>' : '') +
      '<tr><th>Envío</th><td>Los costes de envío se calculan al finalizar compra.</td></tr>' +
      '<tr><th>Total</th><td><strong>' + E.dinero(subtotal() - descuento()) + '</strong></td></tr></table>' +
      '<a class="boton boton--borde" href="finalizar-compra.html' + q() + '">Finalizar compra</a></div>';

    el.querySelectorAll('[data-quitar]').forEach(function (b) {
      b.addEventListener('click', function () { fijarCantidad(Number(b.getAttribute('data-quitar')), 0); carrito(el); });
    });
    // Como en WooCommerce: las cantidades se aplican con «Actualizar carrito».
    var actualizar = el.querySelector('[data-actualizar]');
    el.querySelectorAll('[data-linea]').forEach(function (i) {
      i.addEventListener('input', function () { actualizar.disabled = false; });
    });
    actualizar.addEventListener('click', function () {
      var items = leer(CLAVE_CARRITO, []);
      el.querySelectorAll('[data-linea]').forEach(function (i) {
        var item = items[Number(i.getAttribute('data-linea'))];
        if (item) item.cantidad = Math.max(0, parseInt(i.value, 10) || 0);
      });
      guardar(CLAVE_CARRITO, items.filter(function (l) { return l.cantidad > 0; }));
      actualizarMinicarrito();
      carrito(el);
    });
    var quitarCupon = el.querySelector('[data-quitar-cupon]');
    if (quitarCupon) quitarCupon.addEventListener('click', function () { guardar(CLAVE_CUPON, ''); carrito(el); });
    el.querySelector('[data-cupon]').addEventListener('submit', function (ev) {
      ev.preventDefault();
      var codigo = el.querySelector('#cupon').value.trim();
      var aviso = el.querySelector('[data-cupon-aviso]');
      if (codigo && estado.cupon(codigo)) {
        guardar(CLAVE_CUPON, codigo.toUpperCase());
        carrito(el);
        el.querySelector('[data-cupon-aviso]').textContent = 'El código de cupón se ha aplicado correctamente.';
        el.querySelector('[data-cupon-aviso]').hidden = false;
        return;
      }
      aviso.textContent = codigo ? 'El cupón «' + codigo + '» no existe.' : 'Por favor, introduce un código de cupón.';
      aviso.hidden = false;
    });
  }

  // ---------- Finalizar compra ----------
  function finalizar(el) {
    var ls = lineas();
    var form = el.querySelector('form');
    if (!ls.length) {
      el.innerHTML = '<h1 class="titulo-pagina">Finalizar compra</h1><p class="aviso aviso--info">Tu carrito está vacío.</p>' +
        '<a class="boton boton--indigo" href="tienda.html' + q() + '">Volver a la tienda</a>';
      return;
    }
    var estadoSelect = form.querySelector('[name="estado"]');
    var municipioCampo = form.querySelector('[data-municipio]');
    var postal = form.querySelector('[name="postal"]');
    var envioElegido = null;

    estadoSelect.innerHTML = TE.DEPARTAMENTOS.map(function (d) { return '<option' + (d === 'Guatemala' ? ' selected' : '') + '>' + d + '</option>'; }).join('');

    // Municipio: lista desplegable para Guatemala («Checkout Form»), texto libre para el resto.
    function pintarMunicipio() {
      municipioCampo.innerHTML = estadoSelect.value === 'Guatemala'
        ? '<select name="municipio" required>' + TE.MUNICIPIOS_GUATEMALA.map(function (m) { return '<option>' + m + '</option>'; }).join('') + '</select>'
        : '<input name="municipio" autocomplete="address-level2" required>';
    }

    function pintarPagos() {
      var pagos = estado.ajustes.pagos;
      var ids = ['cod', 'pagalo', 'bacs'].filter(function (id) { return pagos[id].activo; });
      el.querySelector('[data-pagos]').innerHTML = ids.map(function (id, i) {
        var marcas = id === 'pagalo' ? ' <span class="tarjetas-pago tarjetas-pago--en-linea"><span>VISA</span><span>Mastercard</span></span>' : '';
        return '<li><label><input type="radio" name="pago" value="' + id + '"' + (i === ids.length - 1 ? ' checked' : '') + ' required>' +
          E.escapar(pagos[id].titulo) + marcas + '</label><p>' + E.escapar(pagos[id].descripcion) +
          (id === 'pagalo' ? ' Demostración: no se piden datos de tarjeta.' : '') + '</p></li>';
      }).join('') || '<li>No hay métodos de pago disponibles.</li>';
    }

    function pintarResumen() {
      var c = cuponActivo();
      var metodos = estado.metodosEnvio(estadoSelect.value, postal.value, subtotal());
      var elegido = form.querySelector('input[name="envio"]:checked');
      envioElegido = metodos.find(function (m) { return elegido && m.id === elegido.value; }) || metodos[0] || null;
      var envioHtml = metodos.length
        ? (metodos.length === 1
          ? '<input type="hidden" name="envio" value="' + E.escapar(metodos[0].id) + '"><strong>' + E.escapar(metodos[0].titulo) + (metodos[0].costo ? ': ' + E.dinero(metodos[0].costo) : '') + '</strong>'
          : '<ul class="envios">' + metodos.map(function (m) {
            return '<li><label><input type="radio" name="envio" value="' + E.escapar(m.id) + '"' + (m === envioElegido ? ' checked' : '') + '><span><strong>' +
              E.escapar(m.titulo) + (m.costo ? ': ' + E.dinero(m.costo) : '') + '</strong></span></label></li>';
          }).join('') + '</ul>')
        : 'No hay métodos de envío disponibles. Por favor, verifica tu dirección o contáctanos si necesitas ayuda.';
      var envio = envioElegido ? envioElegido.costo : 0;
      el.querySelector('[data-resumen]').innerHTML =
        '<thead><tr><th>Producto</th><th>Subtotal</th></tr></thead><tbody>' +
        ls.map(function (l) { return '<tr><td>' + E.escapar(l.producto.nombre) + ' <strong>× ' + l.cantidad + '</strong>' + detalleContenido(l.contenido) + '</td><td>' + E.dinero(l.total) + '</td></tr>'; }).join('') +
        '</tbody><tfoot><tr><th>Subtotal</th><td>' + E.dinero(subtotal()) + '</td></tr>' +
        (c ? '<tr><th>Cupón: ' + E.escapar(c.codigo) + '</th><td>−' + E.dinero(descuento()) + '</td></tr>' : '') +
        '<tr><th>Envío</th><td class="resumen__envio">' + envioHtml + '</td></tr>' +
        '<tr><th>Total</th><td>' + E.dinero(subtotal() - descuento() + envio) + '</td></tr></tfoot>';
      el.querySelectorAll('input[name="envio"]').forEach(function (r) { r.addEventListener('change', pintarResumen); });
    }

    estadoSelect.addEventListener('change', function () { pintarMunicipio(); pintarResumen(); });
    postal.addEventListener('input', pintarResumen);
    pintarMunicipio();
    pintarPagos();
    pintarResumen();

    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      var error = el.querySelector('[data-error]');
      if (!envioElegido) {
        error.textContent = 'No hay métodos de envío disponibles para tu dirección. Revisa el departamento y el código postal.';
        error.hidden = false;
        error.scrollIntoView({ block: 'center' });
        return;
      }
      var pago = form.querySelector('input[name="pago"]:checked');
      var datos = new FormData(form);
      var pedidos = leer(estado.clavePedidos, []);
      var pedido = {
        numero: 1000 + pedidos.length + 1,
        fecha: new Date().toLocaleDateString('es-GT', { day: 'numeric', month: 'long', year: 'numeric' }),
        // Págalo cobra en línea; transferencia y contra entrega quedan «En espera».
        estado: pago.value === 'pagalo' ? 'Procesando' : 'En espera',
        cliente: (datos.get('nombre') + ' ' + datos.get('apellidos')).trim(),
        correo: datos.get('correo'),
        direccion: [datos.get('direccion'), datos.get('direccion2'), datos.get('municipio'), datos.get('estado'), datos.get('postal')].filter(Boolean).join(', '),
        nit: datos.get('nit') || 'CF',
        envio: envioElegido.titulo,
        costoEnvio: envioElegido.costo,
        cupon: cuponActivo() ? cuponActivo().codigo : null,
        descuento: descuento(),
        total: subtotal() - descuento() + envioElegido.costo,
        metodo: estado.ajustes.pagos[pago.value].titulo,
        lineas: ls.map(function (l) { return { nombre: l.producto.nombre, cantidad: l.cantidad, total: l.total }; }),
        articulos: ls.reduce(function (s, l) { return s + l.cantidad; }, 0)
      };
      pedidos.push(pedido);
      guardar(estado.clavePedidos, pedidos);
      guardar(CLAVE_CARRITO, []);
      guardar(CLAVE_CUPON, '');
      actualizarMinicarrito();
      // Textos del correo «¡Hemos recibido tu pedido!» (documento «Q&A emprendedores»).
      var mensaje = pago.value === 'pagalo'
        ? 'Gracias. Tu pedido ha sido recibido.'
        : 'Gracias por tu pedido. Está en espera hasta que confirmemos que se ha recibido el pago. ' + estado.ajustes.pagos[pago.value].descripcion;
      el.innerHTML = '<h1 class="titulo-pagina">Pedido recibido</h1>' +
        '<p class="aviso">' + E.escapar(mensaje) + ' (Demostración: no se procesó ningún pago).</p>' +
        '<div class="resumen"><table><tr><th>Número del pedido</th><td>' + pedido.numero + '</td></tr>' +
        '<tr><th>Fecha</th><td>' + pedido.fecha + '</td></tr><tr><th>Total</th><td>' + E.dinero(pedido.total) + '</td></tr>' +
        '<tr><th>Método de pago</th><td>' + E.escapar(pedido.metodo) + '</td></tr></table>' +
        '<a class="boton boton--indigo" href="mi-cuenta.html' + q() + '">Ver mis pedidos</a></div>';
      window.scrollTo(0, 0);
    });
  }

  // ---------- Mi cuenta ----------
  function cuenta(el) {
    var acceso = el.querySelector('[data-acceso]');
    var panel = el.querySelector('[data-panel]');
    function pintar() {
      var activa = leer(estado.claveSesion, false);
      acceso.hidden = activa;
      panel.hidden = !activa;
      if (!activa) return;
      var pedidos = leer(estado.clavePedidos, []);
      panel.querySelector('[data-pedidos]').innerHTML = pedidos.length
        ? '<table class="tabla-carrito"><thead><tr><th>Pedido</th><th>Fecha</th><th>Estado</th><th>Total</th></tr></thead><tbody>' +
          pedidos.slice().reverse().map(function (o) {
            return '<tr><td data-titulo="Pedido">#' + o.numero + '</td><td data-titulo="Fecha">' + o.fecha + '</td>' +
              '<td data-titulo="Estado">' + E.escapar(o.estado || 'En espera') + '</td><td data-titulo="Total">' + E.dinero(o.total) +
              ' por ' + o.articulos + ' artículo' + (o.articulos === 1 ? '' : 's') + '</td></tr>';
          }).join('') + '</tbody></table>'
        : '<p class="aviso aviso--info">No se ha hecho ningún pedido todavía.</p>';
    }
    el.querySelectorAll('form').forEach(function (f) {
      f.addEventListener('submit', function (ev) { ev.preventDefault(); guardar(estado.claveSesion, true); pintar(); });
    });
    el.querySelector('[data-salir]').addEventListener('click', function () { guardar(estado.claveSesion, false); pintar(); });
    pintar();
  }

  // ---------- Páginas que edita el emprendedor ----------
  function parrafos(texto) {
    return texto.split(/\n{2,}/).map(function (p) { return '<p>' + E.escapar(p).replace(/\n/g, '<br>') + '</p>'; }).join('');
  }

  function quienesSomos(el) {
    var propio = estado.ajustes.paginas.quienes;
    // Sin texto propio: la descripción que el emprendedor envió al CME, o la corta del directorio.
    var texto = propio || tienda.descripcionOriginal || (/^\[/.test(tienda.descripcion) ? '' : tienda.descripcion);
    el.innerHTML = texto ? parrafos(texto) : '<p>' + E.escapar(tienda.nombre) + ' forma parte de La Estación del Emprendedor.</p>';
  }

  function historiaImagen(el) {
    var src = tienda.portada || tienda.foto;
    if (!src) return;
    el.innerHTML = E.imagen(src, tienda.nombre);
    el.hidden = false;
  }

  function contacto(el) {
    el.querySelector('[data-datos]').innerHTML =
      '<li>' + E.icono('telefono') + '<span>' + E.escapar(cfg.telefono) + '</span></li>' +
      '<li>' + E.icono('correo') + '<span>' + E.escapar(cfg.correo) + '</span></li>';
    el.querySelector('form').addEventListener('submit', function (ev) {
      ev.preventDefault();
      el.querySelector('[data-enviado]').hidden = false;
      ev.target.reset();
    });
  }

  function politicas(el) {
    var propio = estado.ajustes.paginas.politicas;
    if (propio) {
      el.innerHTML = '<h1 class="titulo-pagina">Políticas de Envío y Devoluciones</h1>' + parrafos(propio);
      return;
    }
    el.querySelectorAll('[data-tienda-mayus]').forEach(function (s) { s.textContent = tienda.nombre.toUpperCase(); });
  }

  // ---------- Arranque ----------
  document.title = document.title.replace('Tienda', tienda.nombre);
  document.querySelectorAll('a[data-tienda]').forEach(function (a) { a.href = a.getAttribute('data-tienda') + q(); });
  document.querySelectorAll('input[name="t"]').forEach(function (i) { i.value = slug; });
  document.querySelectorAll('[data-tienda-nombre]').forEach(function (n) { n.textContent = tienda.nombre; });
  document.querySelectorAll('[data-tienda-telefono]').forEach(function (n) { n.textContent = cfg.telefono; });
  document.querySelectorAll('[data-tienda-correo]').forEach(function (n) { n.textContent = cfg.correo; });
  // Redes de la tienda (formulario del CME). Las que no se tienen quedan ocultas.
  document.querySelectorAll('a[data-red]').forEach(function (a) {
    var url = (tienda.redes || {})[a.getAttribute('data-red')];
    if (!url) return;
    a.href = url;
    a.parentElement.hidden = false;
  });
  // Sin logo propio se queda el de la plantilla /base/: el del CME.
  document.querySelectorAll('[data-tienda-logo]').forEach(function (n) {
    n.innerHTML = '<img src="' + estado.logo() + '" alt="Logo de ' + E.escapar(tienda.nombre) + '">';
  });

  var acciones = {
    'mas-vendidos': masVendidos,
    'botones-info': botonesInfo,
    'carrusel-tienda': carruselTienda,
    promocion: promocion,
    catalogo: catalogo,
    producto: ficha,
    carrito: carrito,
    finalizar: finalizar,
    cuenta: cuenta,
    'quienes-somos': quienesSomos,
    'historia-imagen': historiaImagen,
    contacto: contacto,
    politicas: politicas
  };
  document.querySelectorAll('[data-render]').forEach(function (el) { acciones[el.getAttribute('data-render')](el); });
  actualizarMinicarrito();
  E.iniciar();
})();
