/* ==========================================================================
   Panel del emprendedor (/<tienda>/wp-admin/). Reconstruido de las capturas
   de los manuales del CME en el Drive. Las rutas van en el hash:
   #/productos, #/producto/nuevo, #/ajustes/envio, #/opciones…
   Lo que se guarda aquí lo lee la tienda pública (js/tienda-estado.js).
   ========================================================================== */
(function () {
  'use strict';

  var E = window.Estacion;
  var TE = window.TiendaEstado;
  var esc = E.escapar;
  var slug = E.parametro('t');
  var estado = slug ? TE(slug) : null;

  if (!estado) {
    document.body.innerHTML = '<div class="acceso"><p>No se encontró la tienda. Abre el panel desde el pie de una tienda: «Acceso emprendedor».</p></div>';
    return;
  }
  if (!TE.leer(estado.claveAdmin, false)) {
    location.replace('wp-login.html?t=' + slug);
    return;
  }

  var tienda = estado.tienda;
  var aj = estado.ajustes;
  var contenido = document.getElementById('wp-contenido');
  var aviso = null;
  var urlTienda = 'index.html?t=' + slug;
  var PLAYLIST = 'https://www.youtube.com/playlist?list=PLtTuc0YavbN4wQdaTpfM3vCAxXPz9aJP-';

  var SVG = window.ADMIN_SVG;
  function svg(n) { return '<svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">' + SVG[n] + '</svg>'; }

  // Menú del emprendedor tal como aparece en las capturas del manual.
  var MENU = [
    { id: 'escritorio', etiqueta: 'Escritorio', ruta: '' },
    { id: 'medios', etiqueta: 'Medios', ruta: 'pantalla/medios' },
    { id: 'paginas', etiqueta: 'Páginas', ruta: 'paginas', sub: [['Todas las páginas', 'paginas'], ['Añadir nueva', 'pantalla/nueva-pagina']] },
    { id: 'comentarios', etiqueta: 'Comentarios', ruta: 'pantalla/comentarios' },
    { separador: true },
    { id: 'woo', etiqueta: 'WooCommerce', ruta: 'pedidos', sub: [['Inicio', 'pantalla/wc-inicio'], ['Pedidos', 'pedidos'], ['Checkout Form', 'pantalla/checkout-form'], ['Clientes', 'clientes'], ['Informes', 'pantalla/informes'], ['Ajustes', 'ajustes'], ['Estado', 'pantalla/estado'], ['Extensiones', 'pantalla/extensiones']] },
    { id: 'productos', etiqueta: 'Productos', ruta: 'productos', sub: [['Todos los productos', 'productos'], ['Añadir nuevo', 'producto/nuevo'], ['Categorías', 'categorias'], ['Etiquetas', 'pantalla/etiquetas'], ['Atributos', 'pantalla/atributos']] },
    { id: 'analisis', etiqueta: 'Análisis', ruta: 'pantalla/analisis' },
    { id: 'mercadeo', etiqueta: 'Mercadeo', ruta: 'cupones', sub: [['Cupones', 'cupones']] },
    { separador: true },
    { id: 'plugins', etiqueta: 'Plugins', ruta: 'pantalla/plugins' },
    { id: 'usuarios', etiqueta: 'Usuarios', ruta: 'pantalla/usuarios' },
    { id: 'opciones', etiqueta: 'Options', ruta: 'opciones' }
  ];

  // Pantalla → grupo del menú y migas de la cabecera de WooCommerce.
  var GRUPO = {
    '': 'escritorio', paginas: 'paginas', pagina: 'paginas', pedidos: 'woo', clientes: 'woo', ajustes: 'woo',
    productos: 'productos', producto: 'productos', categorias: 'productos', cupones: 'mercadeo', opciones: 'opciones'
  };
  var GRUPO_PANTALLA = {
    medios: 'medios', 'nueva-pagina': 'paginas', comentarios: 'comentarios', 'wc-inicio': 'woo', 'checkout-form': 'woo',
    informes: 'woo', estado: 'woo', extensiones: 'woo', etiquetas: 'productos', atributos: 'productos',
    analisis: 'analisis', plugins: 'plugins', usuarios: 'usuarios'
  };

  function partes() { return location.hash.replace(/^#\/?/, '').split('/').filter(Boolean); }
  function ir(ruta) { location.hash = '#/' + ruta; }
  function avisar(html, tipo) { aviso = { html: html, tipo: tipo || '' }; }

  function guardarTodo(mensaje) {
    if (estado.guardar()) { avisar('<p>' + mensaje + '</p>'); return true; }
    avisar('<p>No se pudo guardar: el navegador no tiene espacio suficiente. Prueba con imágenes más livianas.</p>', 'error');
    return false;
  }

  // ---------- Marco: menú lateral y barra superior ----------
  function pintarMenu(p) {
    var ruta = p.join('/');
    var grupo = p[0] === 'pantalla' ? GRUPO_PANTALLA[p[1]] : GRUPO[p[0] || ''];
    document.getElementById('wp-menu').innerHTML = '<ul>' + MENU.map(function (m) {
      if (m.separador) return '<li class="wp-menu__separador" aria-hidden="true"></li>';
      var actual = m.id === grupo;
      var sub = actual && m.sub ? '<ul class="wp-submenu">' + m.sub.map(function (s) {
        var esta = s[1] === ruta || (s[1] === 'ajustes' && p[0] === 'ajustes') || (s[1] === 'producto/nuevo' && ruta === 'producto/nuevo');
        return '<li><a href="#/' + s[1] + '"' + (esta ? ' aria-current="page"' : '') + '>' + s[0] + '</a></li>';
      }).join('') + '</ul>' : '';
      return '<li class="wp-menu__item' + (actual ? ' wp-menu__item--actual' : '') + '"><a href="#/' + m.ruta + '">' + svg(m.id) +
        '<span>' + m.etiqueta + '</span></a>' + sub + '</li>';
    }).join('') + '<li class="wp-menu__item"><a href="#" data-plegar>' + svg('cerrar') + '<span>Collapse menu</span></a></li></ul>';
  }

  function pintarCabeceraWoo(migas) {
    var cab = document.getElementById('woo-cabecera');
    cab.hidden = !migas;
    if (migas) {
      cab.innerHTML = '<nav aria-label="Migas">' + migas + '</nav>' +
        '<div class="woo-cabecera__accesos" aria-hidden="true"><span>▭<br>Inbox</span><span>◌<br>Store Setup</span></div>';
    }
  }

  function pintarBarra() {
    document.getElementById('barra-admin').innerHTML =
      '<ul><li><a href="#/" aria-label="Escritorio">' + svg('wordpress') + '</a></li>' +
      (TE.leer('estacion-acceso-red', false) ? '<li><a href="../wp-admin.html#/sitios">' + svg('red') + 'Mis sitios</a></li>' : '') +
      '<li><a href="' + urlTienda + '">' + svg('inicio') + esc(tienda.nombre) + '</a></li>' +
      '<li><a href="#/pantalla/comentarios" aria-label="0 comentarios">' + svg('comentarios') + '0</a></li>' +
      '<li><a href="#/producto/nuevo">' + svg('mas') + 'Añadir</a></li></ul>' +
      '<ul><li><a href="../index.html">← Guía de la demostración</a></li><li><span class="barra-admin__usuario" style="padding: 0 8px">Hola, emprendedor</span></li>' +
      '<li><button type="button" data-salir>Salir</button></li></ul>';
    document.querySelector('[data-salir]').addEventListener('click', function () {
      TE.escribir(estado.claveAdmin, false);
      location.href = '../index.html';
    });
  }

  // ---------- Utilidades de pantalla ----------
  function caja(titulo, cuerpo, extra) {
    return '<div class="wp-caja"' + (extra || '') + '><div class="wp-caja__cabecera"><h2>' + titulo + '</h2></div><div class="wp-caja__cuerpo">' + cuerpo + '</div></div>';
  }
  function slugificar(texto) {
    return E.normalizar(texto).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'producto';
  }
  function miniatura(p) {
    return p.imagen ? '<img src="' + esc(p.imagen) + '" alt="">' : '<span class="sin-imagen">' + esc(E.iniciales(p.nombre)) + '</span>';
  }
  function textoInventario(p) {
    if (p.gestionar && p.existencias !== '' && Number(p.existencias) <= 0) return '<span class="existencias existencias--no">Sin existencias</span>';
    if (p.estadoInventario === 'outofstock') return '<span class="existencias existencias--no">Sin existencias</span>';
    return '<span class="existencias">Hay existencias' + (p.gestionar && p.existencias !== '' ? ' (' + p.existencias + ')' : '') + '</span>';
  }
  function precioAdmin(p) {
    if (!Number(p.precio)) return '–';
    var actual = estado.precio(p);
    return (p.desde ? 'Desde ' : '') + (actual < Number(p.precio) ? '<del>' + E.dinero(p.precio) + '</del> ' + E.dinero(actual) : E.dinero(p.precio));
  }
  function pedidos() { return TE.leer(estado.clavePedidos, []); }
  function categoriasDisponibles() {
    var nombres = tienda.categorias.map(function (c) { return E.categoria(c).nombre; });
    estado.productos(true).forEach(function (p) { (p.categorias || []).forEach(function (c) { if (nombres.indexOf(c) === -1) nombres.push(c); }); });
    (aj.categoriasExtra || []).forEach(function (c) { if (nombres.indexOf(c) === -1) nombres.push(c); });
    return nombres;
  }
  var TIPOS = { simple: 'Producto simple', grouped: 'Producto agrupado', external: 'Producto externo/afiliado', variable: 'Producto variable', bundle: 'Smart bundle' };
  var ESTADOS_PEDIDO = ['Pendiente de pago', 'Procesando', 'En espera', 'Completado', 'Cancelado', 'Reembolsado', 'Fallido'];

  // Las cajas marcadas así no estaban en el escritorio original: resumen los manuales del CME.
  var REF = ' <small style="font-weight: 400; color: #646970">· guía añadida en esta reconstrucción</small>';

  // ---------- Escritorio ----------
  function escritorio() {
    var ps = pedidos();
    var enEspera = ps.filter(function (o) { return o.estado === 'Procesando' || o.estado === 'En espera' || o.estado === 'Pendiente de pago'; }).length;
    var lista = estado.productos(true);
    var pocas = lista.filter(function (p) { return p.gestionar && p.existencias !== '' && Number(p.existencias) <= 2; }).length;
    var ventas = ps.filter(function (o) { return ['Cancelado', 'Reembolsado', 'Fallido'].indexOf(o.estado) === -1; })
      .reduce(function (s, o) { return s + o.total; }, 0);
    var pasos = [
      ['1. Options › Configuración de Emprendedor: botones informativos, carrusel, promoción e información', '#/opciones', 'Configurar'],
      ['2. WooCommerce › Ajustes: General, Envío, Pagos (credenciales de Págalo) y Correos electrónicos', '#/ajustes', 'Abrir'],
      ['3. Subir productos: simples, agrupados (combos) o variables. Fotos de 1000 × 1000 px', '#/producto/nuevo', 'Añadir'],
      ['4. Editar las páginas «Políticas de Envío y Devoluciones» y «Quiénes Somos»', '#/paginas', 'Páginas'],
      ['5. Probar desde modo incógnito: comprar «Prueba de compra con Tarjeta de Crédito»', urlTienda, 'Ver tienda']
    ];
    contenido.innerHTML = '<div class="wp-titulo"><h1>Escritorio</h1></div><div class="escritorio"><div>' +
      // Caja de la captura del manual: «Bienvenido — Si tienes alguna duda… comunícate al CME».
      caja('Bienvenido', '<p>Si tienes alguna duda del funcionamiento de tu tienda comunícate al CME.</p>') +
      caja('Puntos que cada emprendedor debe actualizar' + REF, '<ul class="pasos">' + pasos.map(function (s) {
        return '<li><span>' + s[0] + '</span><a class="wp-boton" href="' + s[1] + '">' + s[2] + '</a></li>';
      }).join('') + '</ul>') +
      caja('Videos de capacitación del CME' + REF, '<ol><li>Personalizando mi tienda</li><li>WooCommerce ajustes iniciales</li><li>Creando productos simples</li>' +
        '<li>Producto variable</li><li>Cupones</li><li>Creando y editando entradas del blog</li></ol>' +
        '<p><a href="' + PLAYLIST + '" target="_blank" rel="noopener">Abrir la lista en YouTube</a></p>') +
      '</div><div>' +
      '<div class="wp-caja"><div class="wp-caja__cabecera"><h2>Estado de WooCommerce</h2></div><ul class="estado-woo">' +
      '<li><span class="estado-woo__icono" style="background: #5b841b">…</span><span><strong>' + enEspera + ' pedidos</strong>en espera de procesar</span></li>' +
      '<li><span class="estado-woo__icono" style="background: #dba617">!</span><span><strong>' + pocas + ' productos</strong>casi sin existencias</span></li>' +
      '<li><span class="estado-woo__icono" style="background: var(--wp-azul)">Q</span><span><strong>' + E.dinero(ventas) + '</strong>ventas en esta demostración</span></li>' +
      '<li><span class="estado-woo__icono" style="background: #50575e">' + lista.length + '</span><span><strong>' + lista.length + ' productos</strong>en el catálogo</span></li>' +
      '</ul></div>' +
      caja('Lineamientos del CME para el emprendedor' + REF, '<ul>' +
        '<li>Mantener el inventario actualizado y la información real de los productos.</li>' +
        '<li>Fotografías reales y de buena calidad, en fondo blanco.</li>' +
        '<li>No modificar el precio después de realizada la compra.</li>' +
        '<li>Procesar el pedido en el tiempo indicado y facturar cada venta.</li>' +
        '<li>Empaque adecuado; aceptar cambios de productos defectuosos.</li>' +
        '<li>Entregar un reporte mensual de ventas y aceptar la auditoría del CME.</li></ul>') +
      '</div></div>';
  }

  // ---------- Productos ----------
  function listaProductos() {
    var consulta = '';
    var todos = estado.productos(true);
    function cuenta(f) { return todos.filter(f).length; }
    var filtros = [
      ['', 'Todos', function () { return true; }],
      ['publicado', 'Publicados', function (p) { return p.estado !== 'borrador' && p.visibilidad !== 'privado'; }],
      ['borrador', 'Borradores', function (p) { return p.estado === 'borrador'; }],
      ['privado', 'Privados', function (p) { return p.visibilidad === 'privado'; }]
    ];
    var actual = filtros.find(function (f) { return f[0] === (location.hash.split('?estado=')[1] || ''); }) || filtros[0];

    contenido.innerHTML = '<div class="wp-titulo"><h1>Productos</h1><a class="wp-boton" href="#/producto/nuevo">Añadir nuevo</a></div>' +
      '<ul class="subsubsub">' + filtros.filter(function (f) { return !f[0] || cuenta(f[2]); }).map(function (f, i) {
        return (i ? '<li>|</li>' : '') + '<li><a href="#/productos' + (f[0] ? '?estado=' + f[0] : '') + '"' + (f === actual ? ' aria-current="page"' : '') + '>' +
          f[1] + ' <span>(' + cuenta(f[2]) + ')</span></a></li>';
      }).join('') + '</ul>' +
      '<div class="wp-herramientas"><span>' + todos.filter(actual[2]).length + ' elementos</span>' +
      '<form role="search" data-buscar><label class="solo-lectores" for="buscar-productos">Buscar productos</label>' +
      '<input class="wp-campo" id="buscar-productos" type="search"> <button class="wp-boton">Buscar productos</button></form></div>' +
      '<div data-tabla></div>';

    function pintar() {
      var lista = todos.filter(actual[2]).filter(function (p) { return !consulta || E.normalizar(p.nombre).indexOf(consulta) !== -1; });
      contenido.querySelector('[data-tabla]').innerHTML = '<table class="wp-tabla"><thead><tr><th class="wp-tabla__imagen"><span class="solo-lectores">Imagen</span>▣</th><th>Nombre</th><th>SKU</th><th>Inventario</th><th>Precio</th><th>Categorías</th><th>Tipo</th></tr></thead><tbody>' +
        (lista.length ? lista.map(function (p) {
          var marca = p.estado === 'borrador' ? ' — <span>Borrador</span>' : (p.visibilidad === 'privado' ? ' — <span>Privado</span>' : '');
          return '<tr><td class="wp-tabla__imagen">' + miniatura(p) + '</td>' +
            '<td class="wp-tabla__nombre"><a href="#/producto/' + p.slug + '">' + esc(p.nombre) + '</a>' + marca +
            '<div class="wp-acciones"><a href="#/producto/' + p.slug + '">Editar</a> | <button class="wp-enlace wp-enlace--peligro" type="button" data-papelera="' + p.slug + '">Papelera</button> | <a href="producto.html?t=' + slug + '&p=' + p.slug + '">Ver</a></div></td>' +
            '<td>' + (esc(p.sku) || '–') + '</td><td>' + textoInventario(p) + '</td><td>' + precioAdmin(p) + '</td>' +
            '<td>' + (p.categorias && p.categorias.length ? esc(p.categorias.join(', ')) : '–') + '</td><td>' + TIPOS[p.tipo || 'simple'] + '</td></tr>';
        }).join('') : '<tr><td colspan="7" class="vacio">No se encontraron productos.</td></tr>') + '</tbody></table>';
      contenido.querySelectorAll('[data-papelera]').forEach(function (b) {
        b.addEventListener('click', function () {
          estado.enviarAPapelera(b.getAttribute('data-papelera'));
          avisar('<p>1 producto movido a la papelera.</p>');
          render();
        });
      });
    }
    contenido.querySelector('[data-buscar]').addEventListener('submit', function (ev) {
      ev.preventDefault();
      consulta = E.normalizar(contenido.querySelector('#buscar-productos').value.trim());
      pintar();
    });
    pintar();
  }

  // ---------- Editor de producto ----------
  function editorProducto(cual) {
    var existente = cual && cual !== 'nuevo' ? estado.producto(cual) : null;
    if (cual && cual !== 'nuevo' && !existente) { contenido.innerHTML = '<div class="wp-aviso wp-aviso--error"><p>Ese producto no existe.</p></div>'; return; }
    var b = Object.assign({
      slug: '', nombre: '', descripcion: '', corta: '', tipo: 'simple', precio: '', rebajado: '', sku: '', gestionar: false,
      existencias: '', estadoInventario: 'instock', peso: '', largo: '', ancho: '', alto: '', ventasDirigidas: '', ventasCruzadas: '',
      atributos: '', notaCompra: '', orden: 0, categorias: [], etiquetas: '', imagen: null, estado: 'publicado', visibilidad: 'publico', desde: false
    }, existente ? JSON.parse(JSON.stringify(existente)) : { estado: 'borrador' });
    b.pack = Object.assign({ items: [], fijo: true, libre: true, min: 1, max: 10, minItem: '', maxItem: '', envio: 'whole', arriba: '', abajo: '', descuento: 0 }, b.pack || {});
    var pestana = 'general';

    var opcionesTipo = Object.keys(TIPOS).map(function (k) { return '<option value="' + k + '"' + (b.tipo === k ? ' selected' : '') + '>' + TIPOS[k] + '</option>'; }).join('');
    var categorias = categoriasDisponibles();

    contenido.innerHTML =
      '<div class="wp-titulo"><h1>' + (existente ? 'Editar producto' : 'Añadir nuevo producto') + '</h1>' + (existente ? '<a class="wp-boton" href="#/producto/nuevo">Añadir nuevo</a>' : '') + '</div>' +
      '<form class="editor" data-editor novalidate><div>' +
      '<label class="solo-lectores" for="titulo">Nombre del producto</label>' +
      '<input class="wp-campo wp-campo--titulo" id="titulo" name="nombre" placeholder="Nombre del producto" value="' + esc(b.nombre) + '">' +
      (existente ? '<p style="margin: 8px 0 0"><strong>Enlace permanente:</strong> <a href="producto.html?t=' + slug + '&p=' + b.slug + '">…/' + slug + '/tienda/' + b.slug + '/</a></p>' : '') +
      '<p style="margin: 20px 0"><button class="wp-boton wp-boton--elementor" type="button" disabled title="Elementor no está disponible en esta demostración">Editar con Elementor</button></p>' +
      '<div class="editor__barra"><button class="wp-boton" type="button" disabled>Añadir objeto</button><span class="editor__modos"><button type="button" aria-pressed="true">Visual</button><button type="button" aria-pressed="false">HTML</button></span></div>' +
      '<div class="editor__formato" aria-hidden="true"><span>Párrafo ▾</span><span>B</span><span><em>I</em></span><span>•≡</span><span>1≡</span><span>❝</span></div>' +
      '<label class="solo-lectores" for="descripcion">Descripción</label><textarea class="wp-area" id="descripcion" name="descripcion" rows="8">' + esc(b.descripcion) + '</textarea>' +
      '<div class="editor__palabras">Número de palabras: <span data-palabras>0</span></div><br>' +

      // Datos del producto
      '<div class="wp-caja"><div class="wp-caja__cabecera datos-producto__cabecera"><h2>Datos del producto —</h2>' +
      '<label class="solo-lectores" for="tipo">Tipo de producto</label><select class="wp-select" id="tipo" name="tipo">' + opcionesTipo + '</select>' +
      '<label><input type="checkbox" name="virtual"> Virtual:</label><label><input type="checkbox" name="descargable"> Descargable:</label></div>' +
      '<div class="datos-producto"><ul class="datos-producto__pestanas">' +
      [['general', 'General'], ['inventario', 'Inventario'], ['envio', 'Envío'], ['relacionados', 'Productos relacionados'], ['atributos', 'Atributos'], ['avanzado', 'Avanzado'], ['pack', 'Bundled Products']]
        .map(function (t) { return '<li data-solo="' + (t[0] === 'pack' ? 'bundle' : '') + '"><a href="#" data-pestana="' + t[0] + '">' + t[1] + '</a></li>'; }).join('') +
      '</ul><div class="datos-producto__panel">' +
      '<div data-panel="general">' +
      '<div class="campo-woo"><label for="precio">Precio normal (Q)</label><input class="wp-campo" id="precio" name="precio" type="number" min="0" step="0.01" value="' + esc(b.precio) + '"></div>' +
      '<div class="campo-woo"><label for="rebajado">Precio rebajado (Q)</label><input class="wp-campo" id="rebajado" name="rebajado" type="number" min="0" step="0.01" value="' + esc(b.rebajado === null ? '' : b.rebajado) + '"><span class="ayuda"><a href="#" aria-disabled="true">Horario</a></span></div>' +
      '<p class="campo-woo ayuda" data-solo-variable>En los productos variables la tienda muestra «Desde» con este precio. Define las opciones en «Atributos».</p>' +
      '</div>' +
      '<div data-panel="inventario" hidden>' +
      '<div class="campo-woo"><label for="sku">SKU</label><input class="wp-campo" id="sku" name="sku" value="' + esc(b.sku) + '"></div>' +
      '<div class="campo-woo"><span>¿Gestionar inventario?</span><label><input type="checkbox" name="gestionar"' + (b.gestionar ? ' checked' : '') + '> Activar la gestión de inventario a nivel de producto</label></div>' +
      '<div class="campo-woo"><label for="existencias">Cantidad en inventario</label><input class="wp-campo" id="existencias" name="existencias" type="number" step="1" value="' + esc(b.existencias) + '"></div>' +
      '<div class="campo-woo"><label for="estadoInventario">Estado del inventario</label><select class="wp-select" id="estadoInventario" name="estadoInventario">' +
      [['instock', 'Hay existencias'], ['outofstock', 'Sin existencias'], ['onbackorder', 'Se puede reservar']].map(function (o) { return '<option value="' + o[0] + '"' + (b.estadoInventario === o[0] ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('') + '</select></div>' +
      '</div>' +
      '<div data-panel="envio" hidden>' +
      '<div class="campo-woo"><label for="peso">Peso (kg)</label><input class="wp-campo" id="peso" name="peso" type="number" min="0" step="0.01" value="' + esc(b.peso) + '"></div>' +
      '<div class="campo-woo"><span>Dimensiones (cm)</span><span class="limites"><input class="wp-campo" name="largo" placeholder="Longitud" value="' + esc(b.largo) + '" aria-label="Longitud"><input class="wp-campo" name="ancho" placeholder="Anchura" value="' + esc(b.ancho) + '" aria-label="Anchura"><input class="wp-campo" name="alto" placeholder="Altura" value="' + esc(b.alto) + '" aria-label="Altura"></span></div>' +
      '</div>' +
      '<div data-panel="relacionados" hidden>' +
      '<div class="campo-woo"><label for="ventasDirigidas">Ventas dirigidas</label><input class="wp-campo" id="ventasDirigidas" name="ventasDirigidas" placeholder="Buscar un producto…" value="' + esc(b.ventasDirigidas) + '"></div>' +
      '<div class="campo-woo"><label for="ventasCruzadas">Ventas cruzadas</label><input class="wp-campo" id="ventasCruzadas" name="ventasCruzadas" placeholder="Buscar un producto…" value="' + esc(b.ventasCruzadas) + '"></div>' +
      '</div>' +
      '<div data-panel="atributos" hidden>' +
      '<div class="campo-woo campo-woo--arriba"><label for="atributos">Atributos</label><textarea class="wp-area" id="atributos" name="atributos" rows="4" placeholder="color: Verde | Azul&#10;size: S | M | L">' + esc(b.atributos) + '</textarea>' +
      '<span class="ayuda">Uno por línea: «nombre: valor | valor». En los productos variables se muestran como listas para elegir.</span></div>' +
      '</div>' +
      '<div data-panel="avanzado" hidden>' +
      '<div class="campo-woo campo-woo--arriba"><label for="notaCompra">Nota de compra</label><textarea class="wp-area" id="notaCompra" name="notaCompra" rows="3">' + esc(b.notaCompra) + '</textarea></div>' +
      '<div class="campo-woo"><label for="orden">Orden en el menú</label><input class="wp-campo" id="orden" name="orden" type="number" value="' + esc(b.orden) + '"></div>' +
      '</div>' +
      // Pestaña del plugin WPC Product Bundles (capturas de «Configuración de Packs»; el plugin estaba en inglés).
      '<div data-panel="pack" hidden>' +
      '<div class="campo-woo campo-woo--arriba"><label for="pack-buscar">Search (<a href="#" aria-disabled="true">settings</a>)</label><div class="pack-busqueda"><input class="wp-campo" id="pack-buscar" type="search" autocomplete="off"><ul class="pack-resultados" data-resultados></ul></div></div>' +
      '<div class="campo-woo campo-woo--arriba"><span>Selected</span><ul class="pack-elegidos" data-elegidos></ul></div>' +
      '<div class="campo-woo"><span>Regular price (Q)</span><span data-precio-pack></span></div>' +
      '<div class="campo-woo"><span>Fixed price</span><label><input type="checkbox" name="fijo"' + (b.pack.fijo ? ' checked' : '') + '> Disable auto calculate price. If checked, <a href="#" data-pestana="general">click here to set price</a> manually.</label></div>' +
      '<div class="campo-woo"><span>Discount</span><span class="limites"><input class="wp-campo" name="descuento" type="number" min="0" value="' + esc(b.pack.descuento) + '"> % or amount . If you fill both, the amount will be used.</span></div>' +
      '<div class="campo-woo"><span>Custom quantity</span><label><input type="checkbox" name="libre"' + (b.pack.libre ? ' checked' : '') + '> Buyer can change the quantity of bundled products.</label></div>' +
      '<div class="campo-woo"><span>Each item\'s quantity limit</span><span class="limites"><label><input type="checkbox" disabled> Use default quantity as min?</label> or Min <input class="wp-campo" name="minItem" value="' + esc(b.pack.minItem) + '" aria-label="Mínimo por producto"> Max <input class="wp-campo" name="maxItem" value="' + esc(b.pack.maxItem) + '" aria-label="Máximo por producto"></span></div>' +
      '<div class="campo-woo"><span>All items\' quantity limit</span><span class="limites">Min <input class="wp-campo" name="min" type="number" min="1" value="' + esc(b.pack.min) + '" aria-label="Mínimo total"> Max <input class="wp-campo" name="max" type="number" min="1" value="' + esc(b.pack.max) + '" aria-label="Máximo total"></span></div>' +
      '<div class="campo-woo"><label for="envioPack">Shipping fee</label><select class="wp-select" id="envioPack" name="envioPack"><option value="whole">Apply to the whole bundle</option><option value="each">Apply to each bundled product</option></select></div>' +
      '<div class="campo-woo"><span>Manage stock</span><label><input type="checkbox" disabled> Enable stock management at bundle level.</label></div>' +
      '<div class="campo-woo"><label for="arriba">Above text</label><textarea class="wp-area" id="arriba" name="arriba" rows="2">' + esc(b.pack.arriba) + '</textarea></div>' +
      '<div class="campo-woo"><label for="abajo">Under text</label><textarea class="wp-area" id="abajo" name="abajo" rows="2" placeholder="Debes elegir 4 hamburguesas completar tu combo">' + esc(b.pack.abajo) + '</textarea></div>' +
      '</div>' +
      '</div></div></div>' +
      caja('Descripción corta del producto', '<label class="solo-lectores" for="corta">Descripción corta del producto</label><textarea class="wp-area" id="corta" name="corta" rows="4">' + esc(b.corta) + '</textarea>' +
        '<p class="descripcion" style="color: #646970">En los combos, la descripción va aquí («Configuración de Packs»).</p>') +
      '</div>' +

      // Columna derecha
      '<div>' +
      '<div class="wp-caja publicar"><div class="wp-caja__cabecera"><h2>Publicar</h2></div><div class="wp-caja__cuerpo">' +
      '<p style="justify-content: space-between"><button class="wp-boton" type="submit" data-accion="borrador">Solo guardar</button>' +
      (existente ? '<a class="wp-boton" href="producto.html?t=' + slug + '&p=' + b.slug + '" target="_blank">Vista previa</a>' : '') + '</p>' +
      '<p>📌 Estado: <strong>' + (b.estado === 'borrador' ? 'Borrador' : 'Publicado') + '</strong></p>' +
      '<p>👁 <label for="visibilidad">Visibilidad:</label><select class="wp-select" id="visibilidad" name="visibilidad"><option value="publico">Público</option><option value="privado"' + (b.visibilidad === 'privado' ? ' selected' : '') + '>Privado</option></select></p>' +
      '<p>📅 Publicar <strong>inmediatamente</strong></p>' +
      '<p>Visibilidad catálogo: <strong>En la tienda y en los resultados de búsqueda</strong></p>' +
      '</div><div class="wp-caja__pie">' + (existente ? '<button class="wp-enlace wp-enlace--peligro" type="button" data-borrar>Mover a la papelera</button>' : '<span></span>') +
      '<button class="wp-boton wp-boton--primario" type="submit" data-accion="publicar">' + (existente && b.estado !== 'borrador' ? 'Actualizar' : 'Publicar') + '</button></div></div>' +
      caja('Categorías del producto', '<ul class="categorias-lista">' + categorias.map(function (c) {
        return '<li><label><input type="checkbox" name="categoria" value="' + esc(c) + '"' + (b.categorias.indexOf(c) !== -1 ? ' checked' : '') + '> ' + esc(c) + '</label></li>';
      }).join('') + '</ul><p style="margin-top: 10px"><label class="solo-lectores" for="nueva-cat">Nueva categoría</label><input class="wp-campo" id="nueva-cat" placeholder="Nueva categoría de producto"> <button class="wp-boton" type="button" data-nueva-cat>+ Añadir</button></p>') +
      caja('Etiquetas del producto', '<label class="solo-lectores" for="etiquetas">Etiquetas</label><input class="wp-campo" id="etiquetas" name="etiquetas" value="' + esc(b.etiquetas) + '" style="width: 100%"><p class="descripcion" style="color: #646970">Separa las etiquetas con comas</p>') +
      caja('Imagen del producto', '<div class="imagen-producto" data-imagen></div><input type="file" accept="image/*" id="subir-imagen" class="solo-lectores"><label for="subir-imagen" class="wp-enlace" style="cursor: pointer">Establecer la imagen del producto</label> <button class="wp-enlace wp-enlace--peligro" type="button" data-quitar-imagen>Quitar la imagen del producto</button><p class="descripcion" style="color: #646970">1000 × 1000 px, fondo blanco.</p>') +
      caja('Galería del producto', '<a href="#" aria-disabled="true">Añadir imágenes a la galería del producto</a>') +
      '</div></form>';

    var form = contenido.querySelector('[data-editor]');

    function mostrarPestana(id) {
      pestana = id;
      form.querySelectorAll('[data-panel]').forEach(function (p) { p.hidden = p.getAttribute('data-panel') !== id; });
      form.querySelectorAll('.datos-producto__pestanas a').forEach(function (a) { a.setAttribute('aria-current', String(a.getAttribute('data-pestana') === id)); });
    }
    function segunTipo() {
      var tipo = form.tipo.value;
      form.querySelectorAll('[data-solo="bundle"]').forEach(function (li) { li.hidden = tipo !== 'bundle'; });
      form.querySelector('[data-solo-variable]').hidden = tipo !== 'variable';
      if (pestana === 'pack' && tipo !== 'bundle') mostrarPestana('general');
    }
    function contarPalabras() {
      var t = form.descripcion.value.trim();
      form.querySelector('[data-palabras]').textContent = t ? t.split(/\s+/).length : 0;
    }
    function pintarImagen() {
      form.querySelector('[data-imagen]').innerHTML = b.imagen ? '<img src="' + esc(b.imagen) + '" alt="">' : '';
      form.querySelector('[data-quitar-imagen]').hidden = !b.imagen;
    }

    // Smart bundle: buscar productos ya cargados y armar el pack.
    function pintarPack() {
      var q = E.normalizar(form.querySelector('#pack-buscar').value.trim());
      var candidatos = estado.productos(true).filter(function (p) { return p.slug !== b.slug && p.tipo !== 'bundle' && b.pack.items.indexOf(p.slug) === -1; });
      form.querySelector('[data-resultados]').innerHTML = q ? candidatos.filter(function (p) { return E.normalizar(p.nombre).indexOf(q) !== -1; }).slice(0, 8).map(function (p) {
        return '<li><span>' + esc(p.nombre.toUpperCase()) + ' <em>' + E.dinero(estado.precio(p)) + '</em></span><span><em>' + (p.tipo || 'simple') + '</em> <button type="button" data-anadir="' + p.slug + '" aria-label="Añadir ' + esc(p.nombre) + '">+</button></span></li>';
      }).join('') : '';
      form.querySelector('[data-elegidos]').innerHTML = b.pack.items.map(function (s) {
        var p = estado.producto(s);
        return p ? '<li><span>' + esc(p.nombre) + ' <em>' + E.dinero(estado.precio(p)) + '</em></span><button type="button" data-quitar-item="' + s + '" aria-label="Quitar ' + esc(p.nombre) + '">×</button></li>' : '';
      }).join('') || '<li><em>Busca y añade los productos del pack.</em></li>';
      var suma = b.pack.items.reduce(function (s, x) { var p = estado.producto(x); return s + (p ? estado.precio(p) : 0); }, 0);
      form.querySelector('[data-precio-pack]').textContent = E.dinero(suma) + ' (suma de los productos; con «Fixed price» se usa el precio de General)';
    }

    form.addEventListener('click', function (ev) {
      var t = ev.target;
      if (t.matches('[data-pestana]')) { ev.preventDefault(); mostrarPestana(t.getAttribute('data-pestana')); }
      if (t.matches('[data-anadir]')) { b.pack.items.push(t.getAttribute('data-anadir')); form.querySelector('#pack-buscar').value = ''; pintarPack(); }
      if (t.matches('[data-quitar-item]')) { b.pack.items = b.pack.items.filter(function (s) { return s !== t.getAttribute('data-quitar-item'); }); pintarPack(); }
      if (t.matches('[data-quitar-imagen]')) { b.imagen = null; pintarImagen(); }
      if (t.matches('[data-nueva-cat]')) {
        var nombre = form.querySelector('#nueva-cat').value.trim();
        if (!nombre) return;
        aj.categoriasExtra = (aj.categoriasExtra || []).concat(nombre);
        var li = document.createElement('li');
        li.innerHTML = '<label><input type="checkbox" name="categoria" value="' + esc(nombre) + '" checked> ' + esc(nombre) + '</label>';
        form.querySelector('.categorias-lista').appendChild(li);
        form.querySelector('#nueva-cat').value = '';
      }
      if (t.matches('[data-borrar]')) {
        estado.enviarAPapelera(b.slug);
        avisar('<p>1 producto movido a la papelera.</p>');
        ir('productos');
      }
    });
    form.tipo.addEventListener('change', segunTipo);
    form.descripcion.addEventListener('input', contarPalabras);
    form.querySelector('#pack-buscar').addEventListener('input', pintarPack);
    form.envioPack.value = b.pack.envio;
    form.querySelector('#subir-imagen').addEventListener('change', function (ev) {
      var archivo = ev.target.files[0];
      if (!archivo) return;
      TE.leerImagen(archivo, 900).then(function (url) { b.imagen = url; pintarImagen(); });
    });

    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      var nombre = form.nombre.value.trim();
      if (!nombre) { alert('El producto necesita un nombre.'); form.nombre.focus(); return; }
      var accion = ev.submitter ? ev.submitter.getAttribute('data-accion') : 'publicar';
      if (!b.slug) {
        var base = slugificar(nombre), s = base, n = 2;
        while (estado.producto(s) || aj.productos.papelera[s]) s = base + '-' + n++;
        b.slug = s;
      }
      var f = form;
      Object.assign(b, {
        nombre: nombre, descripcion: f.descripcion.value, corta: f.corta.value, tipo: f.tipo.value,
        precio: f.precio.value === '' ? 0 : Number(f.precio.value), rebajado: f.rebajado.value === '' ? null : Number(f.rebajado.value),
        desde: f.tipo.value === 'variable', sku: f.sku.value.trim(), gestionar: f.gestionar.checked, existencias: f.existencias.value,
        estadoInventario: f.estadoInventario.value, peso: f.peso.value, largo: f.largo.value, ancho: f.ancho.value, alto: f.alto.value,
        ventasDirigidas: f.ventasDirigidas.value, ventasCruzadas: f.ventasCruzadas.value, atributos: f.atributos.value,
        notaCompra: f.notaCompra.value, orden: Number(f.orden.value) || 0, etiquetas: f.etiquetas.value, visibilidad: f.visibilidad.value,
        categorias: Array.prototype.map.call(f.querySelectorAll('[name="categoria"]:checked'), function (c) { return c.value; }),
        estado: accion === 'borrador' ? 'borrador' : 'publicado'
      });
      Object.assign(b.pack, {
        fijo: f.fijo.checked, libre: f.libre.checked, descuento: Number(f.descuento.value) || 0, minItem: f.minItem.value, maxItem: f.maxItem.value,
        min: Number(f.min.value) || 1, max: Number(f.max.value) || 10, envio: f.envioPack.value, arriba: f.arriba.value, abajo: f.abajo.value
      });
      if (estado.guardarProducto(b)) {
        avisar('<p>Producto ' + (b.estado === 'borrador' ? 'guardado como borrador' : (existente ? 'actualizado' : 'publicado')) +
          '. <a href="producto.html?t=' + slug + '&p=' + b.slug + '">Ver producto</a></p>');
      } else {
        avisar('<p>No se pudo guardar: el navegador no tiene espacio suficiente. Prueba con una imagen más liviana.</p>', 'error');
      }
      if (location.hash === '#/producto/' + b.slug) render(); else ir('producto/' + b.slug);
    });

    mostrarPestana('general');
    segunTipo();
    contarPalabras();
    pintarImagen();
    pintarPack();
  }

  function listaCategorias() {
    var todos = estado.productos(true);
    contenido.innerHTML = '<div class="wp-titulo"><h1>Categorías de productos</h1></div>' +
      '<div class="wp-aviso wp-aviso--info"><p>Las categorías se crean desde el editor de cada producto («+ Añadir»).</p></div>' +
      '<table class="wp-tabla"><thead><tr><th>Nombre</th><th>Slug</th><th>Cantidad</th></tr></thead><tbody>' +
      categoriasDisponibles().map(function (c) {
        var n = todos.filter(function (p) { return (p.categorias || []).indexOf(c) !== -1; }).length;
        return '<tr><td><strong>' + esc(c) + '</strong></td><td>' + slugificar(c) + '</td><td>' + n + '</td></tr>';
      }).join('') + '</tbody></table>';
  }

  // ---------- Pedidos y clientes ----------
  function listaPedidos() {
    var ps = pedidos();
    contenido.innerHTML = '<div class="wp-titulo"><h1>Pedidos</h1></div>' +
      (ps.length ? '<table class="wp-tabla"><thead><tr><th>Pedido</th><th>Fecha</th><th>Estado</th><th>Total</th></tr></thead><tbody>' +
        ps.slice().reverse().map(function (o) {
          var i = ps.indexOf(o);
          return '<tr><td class="wp-tabla__nombre"><details><summary><a>#' + o.numero + ' ' + esc(o.cliente || 'Cliente') + '</a></summary>' +
            '<p style="margin-top: 8px">' + (o.lineas || []).map(function (l) { return esc(l.nombre) + ' × ' + l.cantidad + ' — ' + E.dinero(l.total); }).join('<br>') + '</p>' +
            '<p><strong>Envío:</strong> ' + esc(o.envio || '–') + (o.costoEnvio ? ' (' + E.dinero(o.costoEnvio) + ')' : '') + '<br>' +
            '<strong>Pago:</strong> ' + esc(o.metodo) + '<br><strong>NIT:</strong> ' + esc(o.nit || 'CF') + '<br>' +
            '<strong>Dirección:</strong> ' + esc(o.direccion || '–') + '<br><strong>Correo:</strong> ' + esc(o.correo || '–') +
            (o.cupon ? '<br><strong>Cupón:</strong> ' + esc(o.cupon) + ' (−' + E.dinero(o.descuento) + ')' : '') + '</p></details></td>' +
            '<td>' + esc(o.fecha) + '</td>' +
            '<td><label class="solo-lectores" for="estado-' + i + '">Estado del pedido</label><select class="wp-select" id="estado-' + i + '" data-pedido="' + i + '">' +
            ESTADOS_PEDIDO.map(function (s) { return '<option' + ((o.estado || 'En espera') === s ? ' selected' : '') + '>' + s + '</option>'; }).join('') + '</select></td>' +
            '<td>' + E.dinero(o.total) + '</td></tr>';
        }).join('') + '</tbody></table>'
        : '<div class="wp-caja"><div class="wp-caja__cuerpo"><p><strong>Cuando recibas un nuevo pedido, aparecerá aquí.</strong></p><p>Haz una compra en <a href="' + urlTienda + '">tu tienda</a> para probarlo; el estado que elijas aquí lo verá el cliente en «Mi cuenta».</p></div></div>');
    contenido.querySelectorAll('[data-pedido]').forEach(function (sel) {
      sel.addEventListener('change', function () {
        var lista = pedidos();
        var o = lista[Number(sel.getAttribute('data-pedido'))];
        o.estado = sel.value;
        TE.escribir(estado.clavePedidos, lista);
        avisar('<p>Estado del pedido #' + o.numero + ' cambiado a «' + esc(sel.value) + '». El cliente lo verá en «Mi cuenta».</p>');
        render();
      });
    });
  }

  function listaClientes() {
    var porCorreo = {};
    pedidos().forEach(function (o) {
      var k = o.correo || o.cliente || 'Cliente';
      var c = porCorreo[k] || (porCorreo[k] = { nombre: o.cliente || 'Cliente', correo: o.correo || '–', pedidos: 0, total: 0, ultimo: '' });
      c.pedidos++;
      c.total += o.total;
      c.ultimo = o.fecha;
    });
    var lista = Object.keys(porCorreo).map(function (k) { return porCorreo[k]; });
    contenido.innerHTML = '<div class="wp-titulo"><h1>Clientes</h1></div>' +
      '<table class="wp-tabla"><thead><tr><th>Nombre</th><th>Correo electrónico</th><th>Pedidos</th><th>Gasto total</th><th>Último pedido</th></tr></thead><tbody>' +
      (lista.length ? lista.map(function (c) {
        return '<tr><td><strong>' + esc(c.nombre) + '</strong></td><td>' + esc(c.correo) + '</td><td>' + c.pedidos + '</td><td>' + E.dinero(c.total) + '</td><td>' + esc(c.ultimo) + '</td></tr>';
      }).join('') : '<tr><td colspan="5" class="vacio">Todavía no hay clientes.</td></tr>') + '</tbody></table>';
  }

  // ---------- Cupones (Mercadeo) ----------
  function listaCupones() {
    contenido.innerHTML = '<div class="wp-titulo"><h1>Cupones</h1></div>' +
      '<div class="editor"><div><table class="wp-tabla"><thead><tr><th>Código</th><th>Tipo de cupón</th><th>Importe del cupón</th><th>Descripción</th><th>Caducidad</th></tr></thead><tbody>' +
      (aj.cupones.length ? aj.cupones.map(function (c, i) {
        return '<tr><td class="wp-tabla__nombre"><strong>' + esc(c.codigo) + '</strong><div class="wp-acciones"><button class="wp-enlace wp-enlace--peligro" type="button" data-borrar-cupon="' + i + '">Papelera</button></div></td>' +
          '<td>' + (c.tipo === 'porcentaje' ? 'Descuento porcentual' : 'Descuento fijo en el carrito') + '</td>' +
          '<td>' + (c.tipo === 'porcentaje' ? c.importe + ' %' : E.dinero(c.importe)) + '</td><td>' + esc(c.descripcion || '–') + '</td><td>' + esc(c.caduca || '–') + '</td></tr>';
      }).join('') : '<tr><td colspan="5" class="vacio">Todavía no hay cupones. Crea uno y pruébalo en el carrito de la tienda.</td></tr>') +
      '</tbody></table></div><form class="wp-caja" data-cupon><div class="wp-caja__cabecera"><h2>Añadir cupón</h2></div><div class="wp-caja__cuerpo">' +
      '<p><label for="codigo">Código del cupón</label><br><input class="wp-campo" id="codigo" required style="width: 100%" placeholder="BIENVENIDA10"></p>' +
      '<p><label for="cdesc">Descripción (opcional)</label><br><textarea class="wp-area" id="cdesc" rows="2"></textarea></p>' +
      '<p><label for="ctipo">Tipo de descuento</label><br><select class="wp-select" id="ctipo"><option value="porcentaje">Descuento porcentual</option><option value="fijo">Descuento fijo en el carrito</option></select></p>' +
      '<p><label for="cimporte">Importe del cupón</label><br><input class="wp-campo" id="cimporte" type="number" min="0" step="0.01" required></p>' +
      '<p><label for="ccaduca">Fecha de caducidad del cupón</label><br><input class="wp-campo" id="ccaduca" type="date"></p>' +
      '</div><div class="wp-caja__pie"><span></span><button class="wp-boton wp-boton--primario">Publicar</button></div></form></div>';
    contenido.querySelector('[data-cupon]').addEventListener('submit', function (ev) {
      ev.preventDefault();
      var codigo = contenido.querySelector('#codigo').value.trim().toUpperCase();
      var importe = Number(contenido.querySelector('#cimporte').value);
      if (!codigo || !(importe > 0)) return;
      aj.cupones = aj.cupones.filter(function (c) { return c.codigo !== codigo; }).concat({
        codigo: codigo, descripcion: contenido.querySelector('#cdesc').value.trim(), tipo: contenido.querySelector('#ctipo').value,
        importe: importe, caduca: contenido.querySelector('#ccaduca').value
      });
      guardarTodo('Cupón «' + esc(codigo) + '» publicado. Pruébalo en el <a href="carrito.html?t=' + slug + '">carrito de la tienda</a>.');
      render();
    });
    contenido.querySelectorAll('[data-borrar-cupon]').forEach(function (b) {
      b.addEventListener('click', function () {
        aj.cupones.splice(Number(b.getAttribute('data-borrar-cupon')), 1);
        guardarTodo('1 cupón movido a la papelera.');
        render();
      });
    });
  }

  // ---------- WooCommerce › Ajustes ----------
  var PESTANAS_AJUSTES = [['general', 'General'], ['productos', 'Productos'], ['envio', 'Envío'], ['pagos', 'Pagos'],
    ['cuentas', 'Cuentas y privacidad'], ['correos', 'Correos electrónicos'], ['integracion', 'Integración'], ['avanzado', 'Avanzado']];
  var DESCRIPCION_METODO = {
    precio_fijo: ['Precio fijo', 'Te permite cobrar un precio fijo por envío.'],
    recogida_local: ['Recogida local', 'Permitir a los clientes que recojan los pedidos ellos mismos. Por defecto, cuando se usa la recogida local, se aplican los impuestos base de la tienda sin importar la dirección del cliente.'],
    envio_gratuito: ['Envío gratuito', 'El envío gratuito es un método especial que puede activarse con cupones y gastos mínimos.']
  };

  function ajustes(p) {
    var tab = p[1] || 'general';
    var cabecera = '<ul class="wp-pestanas">' + PESTANAS_AJUSTES.map(function (t) {
      return '<li><a href="#/ajustes/' + t[0] + '"' + (t[0] === tab ? ' aria-current="page"' : '') + '>' + t[1] + '</a></li>';
    }).join('') + '</ul>';
    var cuerpo = {
      general: ajustesGeneral, envio: ajustesEnvio, pagos: ajustesPagos, correos: ajustesCorreos
    }[tab];
    contenido.innerHTML = cabecera + '<div data-ajustes></div>';
    var zona = contenido.querySelector('[data-ajustes]');
    if (cuerpo) cuerpo(zona, p);
    else zona.innerHTML = '<p class="nota-demo">Pestaña simulada: no se encontró información suficiente para recrearla tal como era en el marketplace original.</p>';
  }

  function ajustesGeneral(zona) {
    var g = aj.general || {};
    zona.innerHTML = '<form data-general><h2>Dirección de la tienda</h2><p>Aquí es donde se encuentra tu negocio. Las tarifas de impuestos y de envío usarán esta dirección.</p>' +
      '<table class="form-table">' +
      '<tr><th><label for="g1">Dirección línea 1</label></th><td><input class="wp-campo" id="g1" name="linea1" style="width: 350px" value="' + esc(g.linea1 || '') + '"></td></tr>' +
      '<tr><th><label for="g2">Dirección línea 2</label></th><td><input class="wp-campo" id="g2" name="linea2" style="width: 350px" value="' + esc(g.linea2 || '') + '"></td></tr>' +
      '<tr><th><label for="g3">Ciudad</label></th><td><input class="wp-campo" id="g3" name="ciudad" style="width: 350px" value="' + esc(g.ciudad || 'Guatemala') + '"></td></tr>' +
      '<tr><th><label for="g4">País / Estado</label></th><td><select class="wp-select" id="g4" name="estado">' + TE.DEPARTAMENTOS.map(function (d) {
        return '<option' + ((g.estado || 'Guatemala') === d ? ' selected' : '') + '>Guatemala — ' + d + '</option>';
      }).join('') + '</select></td></tr>' +
      '<tr><th><label for="g5">Código postal</label></th><td><input class="wp-campo" id="g5" name="postal" value="' + esc(g.postal || '') + '"></td></tr>' +
      '</table><h2>Opciones de moneda</h2><table class="form-table">' +
      '<tr><th>Moneda</th><td>Quetzal guatemalteco (Q)</td></tr><tr><th>Posición de la moneda</th><td>Izquierda</td></tr>' +
      '<tr><th>Separador de miles</th><td>,</td></tr><tr><th>Separador decimal</th><td>.</td></tr><tr><th>Número de decimales</th><td>2</td></tr>' +
      '</table><p><button class="wp-boton wp-boton--primario">Guardar los cambios</button></p></form>';
    zona.querySelector('form').addEventListener('submit', function (ev) {
      ev.preventDefault();
      var f = ev.target;
      aj.general = { linea1: f.linea1.value, linea2: f.linea2.value, ciudad: f.ciudad.value, estado: f.estado.value.replace('Guatemala — ', ''), postal: f.postal.value };
      guardarTodo('Tus ajustes se han guardado.');
      render();
    });
  }

  function ajustesEnvio(zona, p) {
    if (p[2] === 'zona') return editarZona(zona, p[3]);
    var zonas = aj.envios.zonas;
    zona.innerHTML = '<p><strong>Zonas de envío</strong> | <a href="#" aria-disabled="true">Opciones de envío</a> | <a href="#" aria-disabled="true">Clases de envío</a></p>' +
      '<div class="wp-titulo"><h2 style="font-size: 1.3em; font-weight: 600">Zonas de envío</h2><button class="wp-boton" type="button" data-nueva-zona>Añadir zona de envío</button></div>' +
      '<p>Una zona de envío es una región geográfica en la que se ofrecen una cierta variedad de métodos de envío. WooCommerce asociará un cliente a una sola zona usando su dirección de envío, y le mostrará los métodos de envío de esa zona.</p>' +
      '<table class="wp-tabla"><thead><tr><th>Nombre de la zona</th><th>Región(es)</th><th>Método(s) de envío</th></tr></thead><tbody>' +
      zonas.map(function (z, i) {
        var regiones = z.departamentos.concat(z.postales);
        var resumen = regiones.slice(0, 10).join(', ') + (regiones.length > 10 ? ' y ' + (regiones.length - 10) + ' otras regiones' : '');
        return '<tr><td class="wp-tabla__nombre"><a href="#/ajustes/envio/zona/' + i + '">' + esc(z.nombre) + '</a>' +
          '<div class="wp-acciones"><a href="#/ajustes/envio/zona/' + i + '">Editar</a> | <button class="wp-enlace wp-enlace--peligro" type="button" data-eliminar-zona="' + i + '">Eliminar</button></div></td>' +
          '<td>' + esc(resumen) + '</td><td>' + (z.metodos.map(function (m) { return esc(m.titulo); }).join(', ') || 'No hay métodos de envío') + '</td></tr>';
      }).join('') +
      '<tr><td><strong>Ubicaciones no cubiertas por tus otras zonas</strong></td><td>Esta zona la pueden usar de manera <strong>opcional</strong> las regiones que no estén incluidas en otra zona de envío.</td><td>No hay métodos de envío para esta zona.</td></tr>' +
      '</tbody></table>';
    zona.querySelector('[data-nueva-zona]').addEventListener('click', function () {
      zonas.push({ nombre: 'Zona nueva', departamentos: [], postales: [], metodos: [] });
      estado.guardar();
      ir('ajustes/envio/zona/' + (zonas.length - 1));
    });
    zona.querySelectorAll('[data-eliminar-zona]').forEach(function (b) {
      b.addEventListener('click', function () {
        zonas.splice(Number(b.getAttribute('data-eliminar-zona')), 1);
        guardarTodo('Zona de envío eliminada.');
        render();
      });
    });
  }

  function editarZona(zona, indice) {
    var z = aj.envios.zonas[Number(indice)];
    if (!z) { ir('ajustes/envio'); return; }
    var metodos = JSON.parse(JSON.stringify(z.metodos));
    zona.innerHTML = '<h2 style="font-size: 1.3em; font-weight: 400; margin-bottom: 10px"><a href="#/ajustes/envio">Zonas de envío</a> &gt; ' + esc(z.nombre) + '</h2>' +
      '<form data-zona><table class="form-table">' +
      '<tr><th><label for="znombre">Nombre de la zona</label></th><td><input class="wp-campo" id="znombre" name="nombre" style="width: 100%; max-width: 440px" value="' + esc(z.nombre) + '"></td></tr>' +
      '<tr><th>Región(es) de la zona</th><td><div class="zona-regiones" role="group" aria-label="Departamentos">' + TE.DEPARTAMENTOS.map(function (d) {
        return '<label><input type="checkbox" name="dep" value="' + d + '"' + (z.departamentos.indexOf(d) !== -1 ? ' checked' : '') + '> ' + d + '</label>';
      }).join('') + '</div>' +
      '<p style="margin: 10px 0 4px"><label for="zpostales">Limitar a códigos postales específicos (uno por línea)</label></p>' +
      '<textarea class="wp-area" id="zpostales" name="postales" rows="6" style="max-width: 440px">' + esc(z.postales.join('\n')) + '</textarea>' +
      '<p class="descripcion">Los códigos postales que contienen comodines (p.ej. CB23*) o rangos totalmente numéricos (p.ej. <code>90210...99000</code>) también se pueden utilizar. Ciudad de Guatemala: 01001 a 01021 («Configuración de Envíos»).</p></td></tr>' +
      '<tr><th>Métodos de envío</th><td><table class="wp-tabla metodos-envio"><thead><tr><th>Título</th><th>Activado</th><th>Descripción</th><th>Coste (Q)</th><th></th></tr></thead><tbody data-metodos></tbody>' +
      '<tfoot><tr><td colspan="5"><label class="solo-lectores" for="nuevo-metodo">Tipo de método</label><select class="wp-select" id="nuevo-metodo">' +
      Object.keys(DESCRIPCION_METODO).map(function (k) { return '<option value="' + k + '">' + DESCRIPCION_METODO[k][0] + '</option>'; }).join('') +
      '</select> <button class="wp-boton" type="button" data-anadir-metodo>Añadir método de envío</button></td></tr></tfoot></table></td></tr>' +
      '</table><p><button class="wp-boton wp-boton--primario">Guardar los cambios</button></p></form>';

    function pintarMetodos() {
      zona.querySelector('[data-metodos]').innerHTML = metodos.map(function (m, i) {
        return '<tr><td><label class="solo-lectores" for="mt-' + i + '">Título</label><input class="wp-campo" id="mt-' + i + '" data-mt="' + i + '" value="' + esc(m.titulo) + '" style="width: 100%"></td>' +
          '<td><span class="interruptor"><input type="checkbox" data-ma="' + i + '"' + (m.activo ? ' checked' : '') + ' aria-label="Activado"><span></span></span></td>' +
          '<td><strong>' + DESCRIPCION_METODO[m.tipo][0] + '</strong><br>' + DESCRIPCION_METODO[m.tipo][1] + '</td>' +
          '<td>' + (m.tipo === 'recogida_local' ? '–' : '<input class="wp-campo" type="number" min="0" step="0.01" data-mc="' + i + '" value="' + esc(m.tipo === 'envio_gratuito' ? (m.minimo || '') : m.costo) + '" style="width: 90px" aria-label="' + (m.tipo === 'envio_gratuito' ? 'Importe mínimo del pedido' : 'Coste') + '">' + (m.tipo === 'envio_gratuito' ? '<br><small>Importe mínimo</small>' : '')) + '</td>' +
          '<td><button class="wp-enlace wp-enlace--peligro" type="button" data-mb="' + i + '">Eliminar</button></td></tr>';
      }).join('') || '<tr><td colspan="5">Puedes añadir varios métodos de envío en esta zona. Solo los clientes de la zona los verán.</td></tr>';
    }
    zona.addEventListener('input', function (ev) {
      var t = ev.target;
      if (t.dataset.mt) metodos[t.dataset.mt].titulo = t.value;
      if (t.dataset.mc) { var m = metodos[t.dataset.mc]; if (m.tipo === 'envio_gratuito') m.minimo = t.value; else m.costo = Number(t.value) || 0; }
      if (t.dataset.ma) metodos[t.dataset.ma].activo = t.checked;
    });
    zona.addEventListener('click', function (ev) {
      var t = ev.target;
      if (t.matches('[data-mb]')) { metodos.splice(Number(t.dataset.mb), 1); pintarMetodos(); }
      if (t.matches('[data-anadir-metodo]')) {
        var tipo = zona.querySelector('#nuevo-metodo').value;
        metodos.push({ titulo: DESCRIPCION_METODO[tipo][0], tipo: tipo, costo: 0, activo: true });
        pintarMetodos();
      }
    });
    zona.querySelector('[data-zona]').addEventListener('submit', function (ev) {
      ev.preventDefault();
      var f = ev.target;
      z.nombre = f.nombre.value.trim() || 'Zona';
      z.departamentos = Array.prototype.map.call(f.querySelectorAll('[name="dep"]:checked'), function (c) { return c.value; });
      z.postales = f.postales.value.split(/\s*\n\s*/).filter(Boolean);
      z.metodos = metodos;
      guardarTodo('Tus cambios se han guardado.');
      render();
    });
    pintarMetodos();
  }

  function ajustesPagos(zona) {
    var pagos = aj.pagos;
    var ids = ['pagalo', 'bacs', 'cod'];
    zona.innerHTML = '<p>Los métodos de pago instalados se muestran abajo y pueden ordenarse para controlar su orden de visualización en la tienda.</p>' +
      '<table class="wp-tabla"><thead><tr><th>Método</th><th>Activado</th><th>Descripción</th><th></th></tr></thead><tbody>' +
      ids.map(function (id) {
        var m = pagos[id];
        return '<tr><td><strong>' + esc(m.titulo) + '</strong>' + (id === 'pagalo' ? ' (Págalo)' : '') + '</td>' +
          '<td><span class="interruptor"><input type="checkbox" data-activar="' + id + '"' + (m.activo ? ' checked' : '') + ' aria-label="Activar ' + esc(m.titulo) + '"><span></span></span></td>' +
          '<td>' + esc(m.descripcion) + '</td><td><details><summary class="wp-boton">Gestionar</summary><form data-pago="' + id + '" style="margin-top: 10px; min-width: 260px">' +
          '<p><label>Título<br><input class="wp-campo" name="titulo" value="' + esc(m.titulo) + '" style="width: 100%"></label></p>' +
          '<p><label>Descripción<br><textarea class="wp-area" name="descripcion" rows="3">' + esc(m.descripcion) + '</textarea></label></p>' +
          (id === 'pagalo' ? '<p><label>Credenciales de Págalo<br><input class="wp-campo" disabled placeholder="[Cada emprendedor colocaba aquí sus credenciales]" style="width: 100%"></label></p><p class="descripcion">Demostración: no se guardan credenciales reales.</p>' : '') +
          (id === 'bacs' ? '<p class="descripcion">Detalles de la cuenta: cada tienda coloca aquí su banco y número de cuenta.</p>' : '') +
          '<button class="wp-boton wp-boton--primario">Guardar los cambios</button></form></details></td></tr>';
      }).join('') + '</tbody></table>';
    zona.querySelectorAll('[data-activar]').forEach(function (c) {
      c.addEventListener('change', function () {
        pagos[c.dataset.activar].activo = c.checked;
        guardarTodo('Método de pago ' + (c.checked ? 'activado' : 'desactivado') + '.');
        render();
      });
    });
    zona.querySelectorAll('[data-pago]').forEach(function (f) {
      f.addEventListener('submit', function (ev) {
        ev.preventDefault();
        var m = pagos[f.dataset.pago];
        m.titulo = f.titulo.value.trim() || m.titulo;
        m.descripcion = f.descripcion.value.trim();
        guardarTodo('Tus ajustes se han guardado.');
        render();
      });
    });
  }

  function ajustesCorreos(zona) {
    var c = aj.correos;
    var filas = [['nuevo', 'Nuevo pedido'], ['cancelado', 'Pedido cancelado'], ['fallido', 'Pedido fallido']];
    var cliente = ['Pedido en espera', 'Procesando tu pedido', 'Pedido completado', 'Pedido reembolsado', 'Detalles del cliente/factura', 'Nota de cliente', 'Restablecer contraseña', 'Cuenta nueva'];
    zona.innerHTML = '<form><h2>Notificaciones por correo electrónico</h2><p>Los correos electrónicos enviados desde WooCommerce se listan abajo. El manual pide completar el destinatario de los tres primeros.</p>' +
      '<table class="wp-tabla"><thead><tr><th>Correo electrónico</th><th>Tipo de contenido</th><th>Destinatario(s)</th><th>Activado</th></tr></thead><tbody>' +
      filas.map(function (f) {
        return '<tr><td><strong>' + f[1] + '</strong></td><td>text/html</td><td><label class="solo-lectores" for="c-' + f[0] + '">Destinatario de ' + f[1] + '</label><input class="wp-campo" type="email" id="c-' + f[0] + '" name="' + f[0] + '" value="' + esc(c[f[0]] || '') + '" placeholder="' + esc(aj.config.correo) + '"></td><td>✔</td></tr>';
      }).join('') +
      cliente.map(function (n) { return '<tr><td>' + n + '</td><td>text/html</td><td>Cliente</td><td>✔</td></tr>'; }).join('') +
      '</tbody></table><p><button class="wp-boton wp-boton--primario">Guardar los cambios</button></p></form>';
    zona.querySelector('form').addEventListener('submit', function (ev) {
      ev.preventDefault();
      filas.forEach(function (f) { c[f[0]] = ev.target[f[0]].value.trim(); });
      guardarTodo('Tus ajustes se han guardado.');
      render();
    });
  }

  // ---------- Páginas ----------
  var PAGINAS = [
    ['Carrito', ' — Página del carrito', null], ['Contacto', '', null], ['Finalizar compra', ' — Página de finalizar compra', null],
    ['Inicio', ' — Portada', null], ['Mi cuenta', ' — Página de mi cuenta', null],
    ['Políticas de Envío y Devoluciones', ' — Página de términos y condiciones', 'politicas'],
    ['Quiénes Somos', '', 'quienes'], ['Tienda', ' — Página de la tienda', null]
  ];

  function listaPaginas() {
    contenido.innerHTML = '<div class="wp-titulo"><h1>Páginas</h1><a class="wp-boton" href="#/pantalla/nueva-pagina">Añadir nueva</a></div>' +
      '<ul class="subsubsub"><li><a aria-current="page">Todas <span>(' + PAGINAS.length + ')</span></a></li><li>|</li><li><a>Publicadas <span>(' + PAGINAS.length + ')</span></a></li></ul>' +
      '<table class="wp-tabla"><thead><tr><th>Título</th><th>Autor</th><th>Fecha</th></tr></thead><tbody>' +
      PAGINAS.map(function (pg) {
        var ver = { politicas: 'politicas-de-envio-y-devoluciones.html', quienes: 'quienes-somos.html' }[pg[2]] ||
          { Carrito: 'carrito.html', Contacto: 'contacto.html', 'Finalizar compra': 'finalizar-compra.html', Inicio: 'index.html', 'Mi cuenta': 'mi-cuenta.html', Tienda: 'tienda.html' }[pg[0]];
        var editar = pg[2] ? '<a href="#/pagina/' + pg[2] + '">Editar</a> | <a href="#/pagina/' + pg[2] + '">Edición rápida</a> | <span>Enviar a la papelera</span> | ' : '<span title="Se edita con Elementor">Editar con Elementor</span> | ';
        return '<tr><td class="wp-tabla__nombre">' + (pg[2] ? '<a href="#/pagina/' + pg[2] + '">' + pg[0] + '</a>' : '<strong>' + pg[0] + '</strong>') + pg[1] +
          '<div class="wp-acciones">' + editar + '<a href="' + ver + '?t=' + slug + '">Ver</a></div></td><td>CME</td><td>Publicada</td></tr>';
      }).join('') + '</tbody></table>';
  }

  function editarPagina(clave) {
    var titulo = { quienes: 'Quiénes Somos', politicas: 'Políticas de Envío y Devoluciones' }[clave];
    if (!titulo) { ir('paginas'); return; }
    var actual = aj.paginas[clave];
    var vista = clave === 'quienes' ? 'quienes-somos.html' : 'politicas-de-envio-y-devoluciones.html';
    var porDefecto = clave === 'quienes' ? (/^\[/.test(tienda.descripcion) ? '' : tienda.descripcion) : '';
    contenido.innerHTML = '<div class="wp-titulo"><h1>Editar página</h1></div>' +
      '<form class="editor" data-pagina><div><label class="solo-lectores" for="ptitulo">Título</label><input class="wp-campo wp-campo--titulo" id="ptitulo" value="' + titulo + '" readonly>' +
      '<p style="margin: 20px 0"><button class="wp-boton wp-boton--elementor" type="button" disabled>Editar con Elementor</button></p>' +
      '<div class="editor__barra"><button class="wp-boton" type="button" disabled>Añadir objeto</button><span class="editor__modos"><button type="button" aria-pressed="true">Visual</button><button type="button" aria-pressed="false">HTML</button></span></div>' +
      '<label class="solo-lectores" for="ptexto">Contenido</label><textarea class="wp-area" id="ptexto" rows="16" placeholder="' +
      (clave === 'politicas' ? 'Mientras esta página esté vacía, la tienda muestra la plantilla del CME («Marketplace Textos»).' : '') + '">' + esc(actual === null ? porDefecto : actual) + '</textarea>' +
      '<p class="descripcion" style="color: #646970">Separa los párrafos con una línea en blanco.</p></div>' +
      '<div><div class="wp-caja publicar"><div class="wp-caja__cabecera"><h2>Publicar</h2></div><div class="wp-caja__cuerpo">' +
      '<p><a class="wp-boton" href="' + vista + '?t=' + slug + '" target="_blank">Ver página</a></p><p>Estado: <strong>Publicada</strong></p><p>Visibilidad: <strong>Pública</strong></p></div>' +
      '<div class="wp-caja__pie"><button class="wp-enlace" type="button" data-restaurar>Restaurar plantilla</button><button class="wp-boton wp-boton--primario">Actualizar</button></div></div></div></form>';
    var form = contenido.querySelector('[data-pagina]');
    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      aj.paginas[clave] = form.querySelector('#ptexto').value.trim() || null;
      guardarTodo('Página actualizada. <a href="' + vista + '?t=' + slug + '">Ver página</a>');
      render();
    });
    form.querySelector('[data-restaurar]').addEventListener('click', function () {
      aj.paginas[clave] = null;
      guardarTodo('Se restauró el texto de la plantilla.');
      render();
    });
  }

  // ---------- Options › Configuración de Emprendedor (ACF) ----------
  function opciones() {
    var c = JSON.parse(JSON.stringify(aj.config));
    var tab = 'botones';
    function imagenCampo(clave, valor, clase) {
      return '<div class="acf-imagen ' + (clase || '') + '">' + (valor ? '<img src="' + esc(valor) + '" alt="">' : '<p>No hay ninguna imagen seleccionada</p>') + '</div>' +
        '<p style="margin-top: 8px"><input type="file" accept="image/*" id="img-' + clave + '" class="solo-lectores" data-subir="' + clave + '"><label for="img-' + clave + '" class="wp-boton">Añadir imagen</label> ' +
        (valor ? '<button class="wp-enlace wp-enlace--peligro" type="button" data-quitar="' + clave + '">Quitar</button>' : '') + '</p>';
    }
    function fijar(clave, v) { var ks = clave.split('.'); var u = ks.pop(); ks.reduce(function (o, k) { return o[k]; }, c)[u] = v; }

    function pintar() {
      var paneles = {
        botones: '<p class="descripcion" style="padding: 12px 12px 0">Tres características de tu negocio. Puedes usar los íconos que entregó el CME.</p><div class="wp-caja__cuerpo">' +
          c.botones.map(function (b, i) {
            return '<details class="acf-boton"' + (i === 0 ? ' open' : '') + '><summary>Botón ' + (i + 1) + '</summary>' +
              '<div class="acf-campo"><span class="acf-etiqueta">Icono <span class="requerido">*</span></span>' +
              '<div class="acf-imagen acf-imagen--icono"><img src="' + E.ruta('assets/iconos/beneficios/' + b.icono + '.png') + '" alt=""></div>' +
              '<div class="selector-iconos" role="group" aria-label="Íconos disponibles">' + TE.ICONOS_INFO.map(function (ic) {
                return '<button type="button" data-icono-boton="' + i + '" data-icono="' + ic + '" aria-pressed="' + (b.icono === ic) + '"><img src="' + E.ruta('assets/iconos/beneficios/' + ic + '.png') + '" alt="">' + ic.replace(/-/g, ' ') + '</button>';
              }).join('') + '</div></div>' +
              '<div class="acf-campo"><label for="bt-' + i + '">Titulo <span class="requerido">*</span></label><input class="wp-campo" id="bt-' + i + '" data-campo="botones.' + i + '.titulo" value="' + esc(b.titulo) + '"></div>' +
              '<div class="acf-campo"><label for="bs-' + i + '">Subtitulo <span class="requerido">*</span></label><input class="wp-campo" id="bs-' + i + '" data-campo="botones.' + i + '.subtitulo" value="' + esc(b.subtitulo) + '"></div></details>';
          }).join('') + '</div>',
        carrusel: '<div class="acf-campo"><span class="acf-etiqueta">Carrusel 1</span><p>La primera imagen del carrusel es la del CME («Compra con sentido») y ya está colocada.</p></div>' +
          '<div class="acf-campo"><span class="acf-etiqueta">Carrusel 2 Computadora</span>' + imagenCampo('carrusel.computadora', c.carrusel.computadora) + '<p class="descripcion">1920 × 550 px. Máximo 2 MB.</p></div>' +
          '<div class="acf-campo"><span class="acf-etiqueta">Carrusel 2 Móviles</span>' + imagenCampo('carrusel.movil', c.carrusel.movil) + '<p class="descripcion">1080 × 551 px. Máximo 2 MB.</p></div>' +
          '<div class="acf-campo"><label for="c-enlace">Enlace</label><input class="wp-campo" id="c-enlace" type="url" placeholder="https://" data-campo="carrusel.enlace" value="' + esc(c.carrusel.enlace) + '"></div>',
        promocion: '<div class="acf-campo"><span class="acf-etiqueta">Banner Promocional <span class="requerido">*</span></span>' + imagenCampo('promocion.imagen', c.promocion.imagen) + '<p class="descripcion">1280 × 370 px. Máximo 2 MB.</p></div>' +
          '<div class="acf-campo"><label for="p-enlace">Enlace del Promocional</label><input class="wp-campo" id="p-enlace" type="url" placeholder="https://" data-campo="promocion.enlace" value="' + esc(c.promocion.enlace) + '"></div>',
        informacion: '<div class="acf-campo"><span class="acf-etiqueta">Logo <span class="requerido">*</span></span>' + imagenCampo('logo', c.logo || estado.logo(), 'acf-imagen--logo') + '<p class="descripcion">800 × 800 px.</p></div>' +
          '<div class="acf-campo"><label for="i-tel">Telefono <span class="requerido">*</span></label><input class="wp-campo" id="i-tel" placeholder="0000-0000" data-campo="telefono" value="' + esc(c.telefono) + '"></div>' +
          '<div class="acf-campo"><label for="i-correo">Correo Electronico <span class="requerido">*</span></label><input class="wp-campo" id="i-correo" type="email" data-campo="correo" value="' + esc(c.correo) + '"></div>'
      };
      contenido.innerHTML = '<div class="wp-titulo"><h1>Options</h1></div><div class="opciones"><div class="wp-caja">' +
        '<div class="wp-caja__cabecera"><h2>Configuración de Emprendedor</h2></div>' +
        '<ul class="wp-pestanas" style="margin-top: 10px">' + [['botones', 'Botones Informativos'], ['carrusel', 'Carrusel Principal'], ['promocion', 'Promoción'], ['informacion', 'Información']].map(function (t) {
          return '<li><a href="#" data-tab="' + t[0] + '"' + (t[0] === tab ? ' aria-current="page"' : '') + '>' + t[1] + '</a></li>';
        }).join('') + '</ul>' + paneles[tab] + '</div>' +
        '<div class="wp-caja publicar"><div class="wp-caja__cabecera"><h2>Publicar</h2></div><div class="wp-caja__cuerpo"><p>Los cambios se ven en el inicio de tu tienda.</p><p><a href="' + urlTienda + '" target="_blank">Ver tienda</a></p></div>' +
        '<div class="wp-caja__pie"><span></span><button class="wp-boton wp-boton--primario" type="button" data-actualizar>Actualizar</button></div></div></div>';
    }

    contenido.addEventListener('click', function (ev) {
      var t = ev.target.closest('button, a');
      if (!t || !contenido.contains(t)) return;
      if (t.dataset.tab) { ev.preventDefault(); tab = t.dataset.tab; pintar(); }
      if (t.dataset.iconoBoton !== undefined) { c.botones[Number(t.dataset.iconoBoton)].icono = t.dataset.icono; pintar(); }
      if (t.dataset.quitar) { fijar(t.dataset.quitar, null); pintar(); }
      if (t.matches('[data-actualizar]')) {
        aj.config = c;
        guardarTodo('Opciones actualizadas. <a href="' + urlTienda + '">Ver tienda</a>');
        render();
      }
    });
    contenido.addEventListener('input', function (ev) {
      if (ev.target.dataset.campo) fijar(ev.target.dataset.campo, ev.target.value);
    });
    contenido.addEventListener('change', function (ev) {
      var clave = ev.target.dataset.subir;
      if (!clave || !ev.target.files[0]) return;
      var ancho = clave === 'logo' ? 600 : (clave === 'carrusel.movil' ? 1080 : 1600);
      TE.leerImagen(ev.target.files[0], ancho).then(function (url) { fijar(clave, url); pintar(); });
    });
    pintar();
  }

  // ---------- Pantallas sin información suficiente para recrearlas ----------
  var PANTALLAS = {
    medios: 'Biblioteca de medios', 'nueva-pagina': 'Añadir nueva página', comentarios: 'Comentarios', 'wc-inicio': 'Inicio de WooCommerce',
    'checkout-form': 'Checkout Form', informes: 'Informes', estado: 'Estado del sistema', extensiones: 'Extensiones', etiquetas: 'Etiquetas de productos',
    atributos: 'Atributos', analisis: 'Análisis', plugins: 'Plugins', usuarios: 'Usuarios'
  };
  function pantalla(clave) {
    var notas = {
      'checkout-form': 'Aquí se configuraban los campos del checkout (por ejemplo, la lista de municipios y el NIT).',
      'nueva-pagina': 'Las páginas de la tienda venían de la plantilla /base/ y se editaban con Elementor.',
      usuarios: 'El usuario del emprendedor se creaba con el Gmail registrado en «Aperturas de tiendas».'
    };
    contenido.innerHTML = '<div class="wp-titulo"><h1>' + (PANTALLAS[clave] || 'Pantalla') + '</h1></div>' +
      '<p class="nota-demo">' + (notas[clave] ? notas[clave] + ' ' : '') + 'Pantalla simulada: no se encontró información suficiente para recrearla tal como era en el marketplace original.</p>';
  }

  // ---------- Enrutador ----------
  function render() {
    var p = partes();
    var ruta0 = (p[0] || '').split('?')[0];
    pintarMenu([ruta0].concat(p.slice(1)));
    var migas = {
      productos: '<a href="#/pedidos">WooCommerce</a> / Productos',
      producto: '<a href="#/pedidos">WooCommerce</a> / <a href="#/productos">Productos</a> / ' + (p[1] === 'nuevo' ? 'Añadir nuevo' : 'Editar producto'),
      categorias: '<a href="#/pedidos">WooCommerce</a> / <a href="#/productos">Productos</a> / Categorías',
      pedidos: '<a href="#/pedidos">WooCommerce</a> / Pedidos', clientes: '<a href="#/pedidos">WooCommerce</a> / Clientes',
      ajustes: '<a href="#/pedidos">WooCommerce</a> / <a href="#/ajustes">Ajustes</a> / ' + ((PESTANAS_AJUSTES.find(function (t) { return t[0] === (p[1] || 'general'); }) || [0, 'General'])[1]),
      cupones: 'Mercadeo / Cupones'
    }[ruta0];
    pintarCabeceraWoo(migas);

    // Cada pantalla usa un contenedor nuevo para no acumular escuchadores.
    var nuevo = contenido.cloneNode(false);
    contenido.parentNode.replaceChild(nuevo, contenido);
    contenido = nuevo;

    var pantallas = {
      '': escritorio, productos: listaProductos, producto: function () { editorProducto(p[1]); }, categorias: listaCategorias,
      pedidos: listaPedidos, clientes: listaClientes, cupones: listaCupones, ajustes: function () { ajustes(p); },
      paginas: listaPaginas, pagina: function () { editarPagina(p[1]); }, opciones: opciones, pantalla: function () { pantalla(p[1]); }
    };
    (pantallas[ruta0] || escritorio)();

    if (aviso) {
      var div = document.createElement('div');
      div.className = 'wp-aviso' + (aviso.tipo ? ' wp-aviso--' + aviso.tipo : '');
      div.setAttribute('role', 'status');
      div.innerHTML = aviso.html;
      var titulo = contenido.querySelector('.wp-titulo, .wp-pestanas');
      if (titulo) titulo.insertAdjacentElement('afterend', div); else contenido.prepend(div);
      aviso = null;
    }
    document.title = (document.querySelector('.wp-contenido h1') || { textContent: 'Escritorio' }).textContent + ' ‹ ' + tienda.nombre + ' — WordPress';
    window.scrollTo(0, 0);
  }

  // «Collapse menu»: pliega el menú lateral, como en WordPress.
  document.getElementById('wp-menu').addEventListener('click', function (ev) {
    if (!ev.target.closest('[data-plegar]')) return;
    ev.preventDefault();
    document.body.classList.toggle('menu-plegado');
  });
  pintarBarra();
  window.addEventListener('hashchange', render);
  render();
})();
