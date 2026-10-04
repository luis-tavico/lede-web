/* ==========================================================================
   Administrador de la red (/wp-admin/network/): el panel del CME para gestionar
   todas las tiendas del Multisite. Reconstruido de «Q&A emprendedores» (lista de
   sitios con Editar | Escritorio | Desactivar | Archivar | Spam | Borrar |
   Visitar | Clone) y de la hoja «Aperturas de tiendas» (datos del alta).
   Rutas en el hash: #/sitios, #/sitio-nuevo, #/sitio/<tienda>, #/usuarios…
   ========================================================================== */
(function () {
  'use strict';

  var E = window.Estacion;
  var esc = E.escapar;
  var CLAVE_ACCESO = 'estacion-acceso-red';

  function leer(clave, porDefecto) {
    try { var v = JSON.parse(localStorage.getItem(clave)); return v === null ? porDefecto : v; } catch (e) { return porDefecto; }
  }
  function escribir(clave, valor) {
    try { localStorage.setItem(clave, JSON.stringify(valor)); } catch (e) { /* sin almacenamiento */ }
  }

  if (!leer(CLAVE_ACCESO, false)) { location.replace('wp-login.html'); return; }

  var contenido = document.getElementById('wp-contenido');
  var aviso = null;
  var SVG = window.ADMIN_SVG;
  function svg(n) { return '<svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">' + SVG[n] + '</svg>'; }
  function partes() { return location.hash.replace(/^#\/?/, '').split('/').filter(Boolean); }
  function ir(ruta) { location.hash = '#/' + ruta; }
  function avisar(html) { aviso = html; }
  function slugificar(texto) { return E.normalizar(texto).replace(/[^a-z0-9]+/g, ''); }
  function hoy() { return new Date().toLocaleDateString('es-GT', { day: 'numeric', month: 'long', year: 'numeric' }); }

  // Los datos se releen en cada pantalla: la red cambia al crear o borrar sitios.
  function tiendas() {
    var red = E.leerRed();
    return window.ESTACION.emprendedores.filter(function (e) { return e.tienda && red.estados[e.tienda] !== 'borrado'; })
      .concat(red.nuevos.filter(function (n) { return !window.ESTACION.emprendedores.some(function (e) { return e.tienda === n.tienda; }) && red.estados[n.tienda] !== 'borrado'; }))
      .map(function (e) { return Object.assign({}, e, { estadoSitio: red.estados[e.tienda] || 'activo' }); });
  }
  function fijarEstado(slug, estadoSitio) {
    var red = E.leerRed();
    if (estadoSitio === 'activo') delete red.estados[slug]; else red.estados[slug] = estadoSitio;
    if (estadoSitio === 'borrado') red.nuevos = red.nuevos.filter(function (n) { return n.tienda !== slug; });
    E.guardarRed(red);
  }

  var MENU = [
    { id: 'escritorio', etiqueta: 'Escritorio', ruta: '' },
    { id: 'red', etiqueta: 'Sitios', ruta: 'sitios', sub: [['Todos los sitios', 'sitios'], ['Añadir nuevo', 'sitio-nuevo']] },
    { id: 'usuarios', etiqueta: 'Usuarios', ruta: 'usuarios' },
    { id: 'temas', etiqueta: 'Temas', ruta: 'temas' },
    { id: 'plugins', etiqueta: 'Plugins', ruta: 'plugins' },
    { id: 'opciones', etiqueta: 'Ajustes', ruta: 'ajustes' }
  ];
  var GRUPO = { '': 'escritorio', sitios: 'red', 'sitio-nuevo': 'red', sitio: 'red', usuarios: 'usuarios', temas: 'temas', plugins: 'plugins', ajustes: 'opciones' };

  function pintarMarco(p) {
    var grupo = GRUPO[p[0] || ''];
    document.getElementById('wp-menu').innerHTML = '<ul>' + MENU.map(function (m) {
      var actual = m.id === grupo;
      var sub = actual && m.sub ? '<ul class="wp-submenu">' + m.sub.map(function (s) {
        return '<li><a href="#/' + s[1] + '"' + (s[1] === p[0] ? ' aria-current="page"' : '') + '>' + s[0] + '</a></li>';
      }).join('') + '</ul>' : '';
      return '<li class="wp-menu__item' + (actual ? ' wp-menu__item--actual' : '') + '"><a href="#/' + m.ruta + '">' + svg(m.id) + '<span>' + m.etiqueta + '</span></a>' + sub + '</li>';
    }).join('') + '<li class="wp-menu__separador"></li><li class="wp-menu__item"><a href="#" data-plegar>' + svg('cerrar') + '<span>Collapse menu</span></a></li></ul>';

    document.getElementById('barra-admin').innerHTML =
      '<ul><li><a href="#/" aria-label="Escritorio de la red">' + svg('wordpress') + '</a></li>' +
      '<li><a href="#/sitios">' + svg('red') + 'Mis sitios</a></li>' +
      '<li><a href="#/">' + svg('inicio') + 'Administrador de la red: La Estación del Emprendedor</a></li></ul>' +
      '<ul><li><a href="index.html">← Guía de la demostración</a></li><li><span style="padding: 0 8px">Hola, CME</span></li><li><button type="button" data-salir>Salir</button></li></ul>';
    document.querySelector('[data-salir]').addEventListener('click', function () {
      escribir(CLAVE_ACCESO, false);
      location.href = 'index.html';
    });
  }

  function caja(titulo, cuerpo) {
    return '<div class="wp-caja"><div class="wp-caja__cabecera"><h2>' + titulo + '</h2></div><div class="wp-caja__cuerpo">' + cuerpo + '</div></div>';
  }
  // Las cajas marcadas así no estaban en el escritorio original: resumen los documentos del CME.
  var REF = ' <small style="font-weight: 400; color: #646970">· guía añadida en esta reconstrucción</small>';
  var ETIQUETA_ESTADO = { desactivado: 'Desactivado', archivado: 'Archivado', spam: 'Spam' };

  // ---------- Escritorio de la red ----------
  function escritorio() {
    var lista = tiendas();
    var inactivas = lista.filter(function (t) { return t.estadoSitio !== 'activo'; }).length;
    var productos = lista.reduce(function (s, t) { return s + t.productos.length; }, 0);
    contenido.innerHTML = '<div class="wp-titulo"><h1>Escritorio</h1></div><div class="escritorio"><div>' +
      caja('De un vistazo', '<p><a class="wp-boton" href="#/sitio-nuevo">Crear un sitio nuevo</a> <a class="wp-boton" href="#/usuarios">Ver usuarios</a></p>' +
        '<p>Tienes <strong>' + (lista.length + 2) + ' sitios</strong> (' + lista.length + ' tiendas, el portal y la plantilla /base/) y <strong>' + (lista.length + 2) + ' usuarios</strong>.</p>' +
        '<p>' + inactivas + ' tiendas desactivadas, archivadas o marcadas como spam · ' + productos + ' productos en el catálogo recuperado.</p>') +
      caja('Alta de una tienda (proceso del CME)' + REF, '<ol><li>Convocatoria y selección con el formulario.</li><li>Contratación de la pasarela de pago.</li>' +
        '<li>Datos de «Aperturas de tiendas»: emprendedor, emprendimiento, nombre EXACTO de la tienda, Gmail y descripción.</li>' +
        '<li><a href="#/sitio-nuevo">Clonar la plantilla /base/</a> y crear el usuario del emprendedor con su Gmail.</li><li>Capacitación y carga de productos.</li></ol>') +
      '</div><div>' +
      caja('Cómo suspender una tienda' + REF, '<p>En <a href="#/sitios">Sitios</a>, pasa el cursor sobre la tienda y elige <strong>Desactivar</strong>. La tienda deja de verse y sus datos se conservan; se reactiva con <strong>Activar</strong>.</p>' +
        '<p>(Respuesta del documento «Q&amp;A emprendedores».)</p>') +
      caja('Supervisión' + REF, '<ul><li>Revisión mensual de tiendas.</li><li>Información, textos, fotos y precios supervisados por el CME.</li>' +
        '<li>Reporte mensual de ventas de cada emprendedor y auditoría del CME.</li><li>El CME puede dar de baja las cuentas que incumplan los lineamientos.</li></ul>') +
      '</div></div>';
  }

  // ---------- Sitios ----------
  function listaSitios() {
    var consulta = '';
    contenido.innerHTML = '<div class="wp-titulo"><h1>Sitios</h1><a class="wp-boton" href="#/sitio-nuevo">Añadir nuevo</a></div>' +
      '<div class="wp-herramientas"><span data-cuenta></span><form role="search" data-buscar><label class="solo-lectores" for="buscar-sitios">Buscar sitios</label>' +
      '<input class="wp-campo" id="buscar-sitios" type="search"> <button class="wp-boton">Buscar sitios</button></form></div><div data-tabla></div>';

    function fila(url, nombre, estado, acciones, usuarios, registrado) {
      return '<tr><td class="wp-tabla__nombre"><a>' + url + '</a>' + (estado ? ' — <span>' + estado + '</span>' : '') +
        '<br><span style="color: #646970">' + nombre + '</span><div class="wp-acciones">' + acciones + '</div></td><td>' + usuarios + '</td><td>' + registrado + '</td></tr>';
    }
    function pintar() {
      var lista = tiendas().filter(function (t) { return !consulta || E.normalizar(t.nombre + ' ' + t.tienda).indexOf(consulta) !== -1; });
      contenido.querySelector('[data-cuenta]').textContent = (lista.length + (consulta ? 0 : 2)) + ' elementos';
      var fijas = consulta ? '' :
        fila('/', 'La Estación del Emprendedor (portal)', 'Sitio principal', '<a href="portal.html">Visitar</a>', 'CME', '–') +
        fila('/base/', 'Plantilla que se clona para cada tienda nueva', 'Plantilla', '<a href="#/sitio-nuevo">Clone</a>', 'CME', '–');
      contenido.querySelector('[data-tabla]').innerHTML = '<table class="wp-tabla"><thead><tr><th>URL</th><th>Usuarios</th><th>Registrado</th></tr></thead><tbody>' + fijas +
        lista.map(function (t) {
          var activo = t.estadoSitio === 'activo';
          var b = function (accion, texto, peligro) { return '<button class="wp-enlace' + (peligro ? ' wp-enlace--peligro' : '') + '" type="button" data-accion="' + accion + '" data-sitio="' + t.tienda + '">' + texto + '</button>'; };
          var acciones = '<a href="#/sitio/' + t.tienda + '">Editar</a> | ' + b('escritorio', 'Escritorio') + ' | ' +
            (t.estadoSitio === 'desactivado' ? b('activo', 'Activar') : b('desactivado', 'Desactivar')) + ' | ' +
            (t.estadoSitio === 'archivado' ? b('activo', 'Desarchivar') : b('archivado', 'Archivar')) + ' | ' +
            (t.estadoSitio === 'spam' ? b('activo', 'No es spam') : b('spam', 'Spam', true)) + ' | ' + b('borrado', 'Borrar', true) + ' | ' +
            (activo ? '<a href="tienda/index.html?t=' + t.tienda + '">Visitar</a>' : '<span>Visitar</span>') + ' | <a href="#/sitio-nuevo/' + t.tienda + '">Clone</a>';
          return fila('/' + t.tienda + '/', esc(t.nombre), ETIQUETA_ESTADO[t.estadoSitio] || '', acciones, esc(t.correo || 'emprendedor'), esc(t.registrado || '–'));
        }).join('') + '</tbody></table>';
    }
    contenido.addEventListener('click', function (ev) {
      var t = ev.target.closest('[data-accion]');
      if (!t) return;
      var slug = t.getAttribute('data-sitio');
      var accion = t.getAttribute('data-accion');
      if (accion === 'escritorio') {
        // El administrador de la red entra al escritorio de cualquier tienda sin otra contraseña.
        escribir('estacion-acceso-admin-' + slug, true);
        location.href = 'tienda/wp-admin.html?t=' + slug;
        return;
      }
      if (accion === 'borrado') { ir('borrar/' + slug); return; }
      fijarEstado(slug, accion);
      var mensajes = { activo: 'Sitio activado.', desactivado: 'Sitio desactivado.', archivado: 'Sitio archivado.', spam: 'Sitio marcado como spam.' };
      avisar('<p>' + mensajes[accion] + '</p>');
      render();
    });
    contenido.querySelector('[data-buscar]').addEventListener('submit', function (ev) {
      ev.preventDefault();
      consulta = E.normalizar(contenido.querySelector('#buscar-sitios').value.trim());
      pintar();
    });
    pintar();
  }

  // WordPress pide confirmación antes de borrar un sitio.
  function confirmarBorrado(slug) {
    var t = tiendas().find(function (x) { return x.tienda === slug; });
    if (!t) { ir('sitios'); return; }
    contenido.innerHTML = '<div class="wp-titulo"><h1>Confirma tu acción</h1></div>' +
      '<div class="wp-caja"><div class="wp-caja__cuerpo"><p>Estás a punto de borrar el sitio <strong>/' + slug + '/</strong> (' + esc(t.nombre) + ').</p>' +
      '<p>Se borran su perfil en el portal, sus productos y su configuración. Si solo quieres suspenderla, usa «Desactivar».</p>' +
      '<p><button class="wp-boton wp-boton--primario" type="button" data-confirmar>Confirmar</button> <a class="wp-boton" href="#/sitios">Cancelar</a></p></div></div>';
    contenido.querySelector('[data-confirmar]').addEventListener('click', function () {
      fijarEstado(slug, 'borrado');
      avisar('<p>Sitio borrado.</p>');
      ir('sitios');
    });
  }

  function campo(etiqueta, html, ayuda) {
    return '<tr><th>' + etiqueta + '</th><td>' + html + (ayuda ? '<p class="descripcion">' + ayuda + '</p>' : '') + '</td></tr>';
  }
  function casillasCategorias(marcadas) {
    return '<div class="zona-regiones">' + window.ESTACION.categorias.map(function (c) {
      return '<label><input type="checkbox" name="cat" value="' + c.slug + '"' + (marcadas.indexOf(c.slug) !== -1 ? ' checked' : '') + '> ' + esc(c.nombre) + '</label>';
    }).join('') + '</div>';
  }

  // ---------- Añadir nuevo sitio: clona /base/ (o una tienda existente) ----------
  function sitioNuevo(origen) {
    var fuente = origen ? tiendas().find(function (t) { return t.tienda === origen; }) : null;
    contenido.innerHTML = '<div class="wp-titulo"><h1>Añadir nuevo sitio</h1></div>' +
      '<div class="wp-aviso wp-aviso--info"><p>Se clona <strong>/' + (fuente ? fuente.tienda : 'base') + '/</strong>: páginas, menú, zonas de envío y textos del CME' +
      (fuente ? ', y también sus productos' : '') + '. Los campos son los de la hoja «Aperturas de tiendas».</p></div>' +
      '<form data-nuevo><table class="form-table">' +
      campo('<label for="n-dir">Dirección del sitio (URL)</label>', '…/<input class="wp-campo" id="n-dir" name="direccion" required pattern="[a-z0-9]+" style="width: 220px">/',
        'Nombre EXACTO de la tienda: solo letras minúsculas y números. <strong>No se puede cambiar después.</strong>') +
      campo('<label for="n-titulo">Título del sitio</label>', '<input class="wp-campo" id="n-titulo" name="titulo" required style="width: 350px">', 'Nombre del emprendimiento.') +
      campo('<label for="n-emp">Nombre del emprendedor</label>', '<input class="wp-campo" id="n-emp" name="emprendedor" required style="width: 350px">') +
      campo('<label for="n-correo">Correo del administrador</label>', '<input class="wp-campo" id="n-correo" name="correo" type="email" required style="width: 350px" placeholder="tienda@gmail.com">',
        'Gmail obligatorio: ahí recibe su usuario y contraseña. Se crea un usuario nuevo si no existe.') +
      campo('<label for="n-desc">Descripción del negocio</label>', '<textarea class="wp-area" id="n-desc" name="descripcion" rows="3" style="max-width: 500px" required></textarea>', 'Aparece en su perfil del portal.') +
      campo('Categorías del directorio', casillasCategorias(fuente ? fuente.categorias : []), 'Un emprendimiento puede estar en varias categorías.') +
      '</table><p><button class="wp-boton wp-boton--primario">Añadir sitio</button></p></form>';
    var form = contenido.querySelector('[data-nuevo]');
    form.titulo.addEventListener('input', function () { if (!form.direccion.dataset.tocado) form.direccion.value = slugificar(form.titulo.value); });
    form.direccion.addEventListener('input', function () { form.direccion.dataset.tocado = '1'; });
    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      var slug = slugificar(form.direccion.value);
      var categorias = Array.prototype.map.call(form.querySelectorAll('[name="cat"]:checked'), function (c) { return c.value; });
      var red = E.leerRed();
      var ocupado = slug === 'base' || window.ESTACION.emprendedores.some(function (e) { return e.tienda === slug; }) || red.nuevos.some(function (n) { return n.tienda === slug; });
      var error = !slug ? 'Escribe la dirección del sitio.' : ocupado ? 'Lo siento, ¡ese sitio ya existe!' : !categorias.length ? 'Elige al menos una categoría del directorio.' : '';
      if (error) { avisar('<p>' + error + '</p>'); render(); return; }
      red.nuevos.push({
        tienda: slug, perfil: slug, nombre: form.titulo.value.trim(), categorias: categorias, descripcion: form.descripcion.value.trim(),
        logo: null, foto: null, portada: null, productos: fuente ? JSON.parse(JSON.stringify(fuente.productos)) : [],
        emprendedor: form.emprendedor.value.trim(), correo: form.correo.value.trim(), registrado: hoy()
      });
      delete red.estados[slug];
      E.guardarRed(red);
      avisar('<p>Sitio añadido. <a href="tienda/index.html?t=' + slug + '">Visitar el sitio</a> o <a href="#/sitio/' + slug + '">editar el sitio</a>. ' +
        'Se envió el acceso a ' + esc(form.correo.value.trim()) + ' (demostración: no se envía ningún correo).</p>');
      ir('sitios');
    });
  }

  // ---------- Editar sitio ----------
  function editarSitio(slug) {
    var t = tiendas().find(function (x) { return x.tienda === slug; });
    if (!t) { ir('sitios'); return; }
    var esNuevo = E.leerRed().nuevos.some(function (n) { return n.tienda === slug; });
    contenido.innerHTML = '<div class="wp-titulo"><h1>Editar el sitio: ' + esc(t.nombre) + '</h1></div>' +
      '<p><a href="tienda/index.html?t=' + slug + '">Visitar</a> | <button class="wp-enlace" type="button" data-entrar>Escritorio</button></p>' +
      '<ul class="wp-pestanas"><li><a aria-current="page">Información</a></li><li><a>Usuarios</a></li><li><a>Temas</a></li><li><a>Ajustes</a></li></ul>' +
      '<form data-editar><table class="form-table">' +
      campo('Dirección del sitio (URL)', '<code>…/' + slug + '/</code>', 'No se puede cambiar.') +
      campo('Registrado', esc(t.registrado || '—')) +
      campo('<label for="e-titulo">Título del sitio</label>', '<input class="wp-campo" id="e-titulo" name="titulo" style="width: 350px" value="' + esc(t.nombre) + '"' + (esNuevo ? '' : ' readonly') + '>',
        esNuevo ? '' : 'Tienda del catálogo recuperado: el título viene de las capturas.') +
      campo('Atributos', ['activo', 'archivado', 'spam', 'desactivado'].map(function (s) {
        return '<label style="display: block; margin-bottom: 6px"><input type="radio" name="estado" value="' + s + '"' + (t.estadoSitio === s ? ' checked' : '') + '> ' +
          { activo: 'Público', archivado: 'Archivado', spam: 'Spam', desactivado: 'Desactivado' }[s] + '</label>';
      }).join('')) +
      '</table><p><button class="wp-boton wp-boton--primario">Guardar los cambios</button></p></form>';
    contenido.querySelector('[data-entrar]').addEventListener('click', function () {
      escribir('estacion-acceso-admin-' + slug, true);
      location.href = 'tienda/wp-admin.html?t=' + slug;
    });
    contenido.querySelector('[data-editar]').addEventListener('submit', function (ev) {
      ev.preventDefault();
      var f = ev.target;
      if (esNuevo) {
        var red = E.leerRed();
        red.nuevos.find(function (n) { return n.tienda === slug; }).nombre = f.titulo.value.trim() || t.nombre;
        E.guardarRed(red);
      }
      fijarEstado(slug, f.estado.value);
      avisar('<p>Sitio actualizado.</p>');
      render();
    });
  }

  // ---------- Usuarios, temas, plugins y ajustes ----------
  function usuarios() {
    var lista = tiendas();
    contenido.innerHTML = '<div class="wp-titulo"><h1>Usuarios</h1></div>' +
      '<ul class="subsubsub"><li><a aria-current="page">Todos <span>(' + (lista.length + 2) + ')</span></a></li><li>|</li><li><a>Super administrador <span>(2)</span></a></li></ul>' +
      '<table class="wp-tabla"><thead><tr><th>Nombre de usuario</th><th>Perfil</th><th>Correo electrónico</th><th>Sitios</th></tr></thead><tbody>' +
      // Usuarios del CME que aparecen en las capturas de los manuales.
      '<tr><td><strong>luciaa</strong> — Super administrador</td><td>CME</td><td>—</td><td>Todos</td></tr>' +
      '<tr><td><strong>oscarj</strong> — Super administrador</td><td>CME</td><td>—</td><td>Todos</td></tr>' +
      lista.map(function (t) {
        return '<tr><td><strong>' + esc((t.correo || t.tienda).split('@')[0]) + '</strong></td><td>Emprendedor</td><td>' + esc(t.correo || '—') + '</td><td>/' + t.tienda + '/</td></tr>';
      }).join('') + '</tbody></table>';
  }

  function listaSimple(titulo, intro, filas) {
    contenido.innerHTML = '<div class="wp-titulo"><h1>' + titulo + '</h1></div><p class="nota-demo">' + intro + '</p>' +
      '<table class="wp-tabla"><thead><tr><th>Nombre</th><th>Descripción</th><th>Estado en la red</th></tr></thead><tbody>' +
      filas.map(function (f) { return '<tr><td><strong>' + f[0] + '</strong></td><td>' + f[1] + '</td><td>' + f[2] + '</td></tr>'; }).join('') + '</tbody></table>';
  }
  function temas() {
    listaSimple('Temas', 'Pantalla simulada con los temas confirmados del sitio original.', [
      ['Hello Elementor', 'Tema base de Elementor.', 'Activado para la red'],
      ['Tema hijo de La Estación', 'Colores, tipografía Montserrat, encabezado y pie.', 'Activo en el portal y en todas las tiendas']
    ]);
  }
  function plugins() {
    listaSimple('Plugins', 'Pantalla simulada con los plugins que se ven en los menús de las capturas de los manuales del CME.', [
      ['WooCommerce', 'Tienda, carrito, pedidos, envíos y pagos de cada subsitio.', 'Activo para la red'],
      ['Elementor y Elementor Pro', 'Constructor de páginas y plantillas (encabezado, pie, archivo de emprendimientos).', 'Activo para la red'],
      ['Essential Addons for Elementor', 'Pestañas por categoría del inicio y otros bloques.', 'Activo para la red'],
      ['Advanced Custom Fields (Custom Fields)', 'Página «Options › Configuración de Emprendedor».', 'Activo para la red'],
      ['WPC Product Bundles (WPClever)', 'Tipo de producto «Smart bundle» para los packs.', 'Activo para la red'],
      ['Checkout Form', 'Campos del checkout: municipio, NIT y código postal.', 'Activo para la red'],
      ['Capabilities', 'Permisos del rol del emprendedor.', 'Activo para la red'],
      ['Clonador de sitios', 'Acción «Clone» de la lista de sitios, para copiar /base/.', 'Activo para la red'],
      ['Pasarela de pago (Págalo; después ebi pay de Banco Industrial)', 'Cobro con tarjeta con las credenciales de cada emprendedor.', 'Activo para la red']
    ]);
  }
  function ajustes() {
    contenido.innerHTML = '<div class="wp-titulo"><h1>Ajustes de la red</h1></div><table class="form-table">' +
      campo('Título de la red', 'La Estación del Emprendedor') + campo('Correo del administrador de la red', 'emprende@muniguate.com') +
      campo('Tipo de red', 'Multisite en subdirectorios: una tienda en <code>/&lt;tienda&gt;/</code>') +
      campo('Permitir nuevos registros', 'Los registros están desactivados. Las tiendas las crea el CME.') +
      campo('Archivos de cada sitio', '<code>wp-content/uploads/sites/N/</code>') + '</table>' +
      '<p class="nota-demo">Pantalla simulada: no se encontró información suficiente para recrearla tal como era en el marketplace original. Se muestran los datos confirmados de la arquitectura.</p>';
  }

  // ---------- Enrutador ----------
  function render() {
    var p = partes();
    pintarMarco(p);
    var nuevo = contenido.cloneNode(false);
    contenido.parentNode.replaceChild(nuevo, contenido);
    contenido = nuevo;
    var pantallas = {
      '': escritorio, sitios: listaSitios, 'sitio-nuevo': function () { sitioNuevo(p[1]); }, sitio: function () { editarSitio(p[1]); },
      borrar: function () { confirmarBorrado(p[1]); }, usuarios: usuarios, temas: temas, plugins: plugins, ajustes: ajustes
    };
    (pantallas[p[0] || ''] || escritorio)();
    if (aviso) {
      var div = document.createElement('div');
      div.className = 'wp-aviso';
      div.setAttribute('role', 'status');
      div.innerHTML = aviso;
      var titulo = contenido.querySelector('.wp-titulo');
      if (titulo) titulo.insertAdjacentElement('afterend', div); else contenido.prepend(div);
      aviso = null;
    }
    document.title = (contenido.querySelector('h1') || { textContent: 'Escritorio' }).textContent + ' ‹ Administrador de la red — WordPress';
    window.scrollTo(0, 0);
  }

  document.getElementById('wp-menu').addEventListener('click', function (ev) {
    if (!ev.target.closest('[data-plegar]')) return;
    ev.preventDefault();
    document.body.classList.toggle('menu-plegado');
  });
  window.addEventListener('hashchange', render);
  render();
})();
