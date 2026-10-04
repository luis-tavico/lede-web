/* ==========================================================================
   Estado editable de una tienda: lo que el emprendedor cambia en su panel
   (wp-admin.html) y la tienda pública lee. Se guarda en localStorage por
   tienda, igual que cada subsitio del Multisite tenía su propia base de datos.
   Requiere js/comun.js.
   ========================================================================== */
(function () {
  'use strict';

  var E = window.Estacion;

  var DEPARTAMENTOS = ['Alta Verapaz', 'Baja Verapaz', 'Chimaltenango', 'Chiquimula', 'El Progreso', 'Escuintla',
    'Guatemala', 'Huehuetenango', 'Izabal', 'Jalapa', 'Jutiapa', 'Petén', 'Quetzaltenango', 'Quiché',
    'Retalhuleu', 'Sacatepéquez', 'San Marcos', 'Santa Rosa', 'Sololá', 'Suchitepéquez', 'Totonicapán', 'Zacapa'];

  // Municipios del departamento de Guatemala (lista desplegable del checkout).
  var MUNICIPIOS_GUATEMALA = ['Ciudad de Guatemala', 'Santa Catarina Pinula', 'San José Pinula', 'San José del Golfo',
    'Palencia', 'Chinautla', 'San Pedro Ayampuc', 'Mixco', 'San Pedro Sacatepéquez', 'San Juan Sacatepéquez',
    'San Raymundo', 'Chuarrancho', 'Fraijanes', 'Amatitlán', 'Villa Nueva', 'Villa Canales', 'San Miguel Petapa'];

  // Los 13 íconos que el CME entregó para los botones informativos.
  var ICONOS_INFO = ['abierto-24h', 'asesoria-personalizada', 'compra-en-linea', 'descuentos', 'ecologico',
    'empaque-reciclable', 'entregas-en-departamentos', 'entregas-inmediatas', 'envio-gratis', 'pago-en-cuotas',
    'pago-tarjeta', 'reservas', 'satisfaccion-garantizada'];

  function codigos(desde, hasta) {
    var lista = [];
    for (var i = desde; i <= hasta; i++) lista.push(String(i));
    return lista;
  }

  // Configuración de la plantilla /base/ y de WooCommerce › Ajustes › Envío tal como
  // aparece en el documento «Configuración de Envíos» (capturas del admin real).
  function valoresBase() {
    return {
      config: {
        telefono: '2300-0000',
        correo: 'info@minegocio.com',
        logo: null,
        botones: [
          { icono: 'compra-en-linea', titulo: 'Compra en línea', subtitulo: 'sin salir de casa' },
          { icono: 'envio-gratis', titulo: 'Envío gratis', subtitulo: 'a partir de Q150' },
          { icono: 'pago-tarjeta', titulo: 'Paga de forma segura', subtitulo: 'con tu tarjeta' }
        ],
        carrusel: { computadora: null, movil: null, enlace: '' },
        promocion: { imagen: null, enlace: '' }
      },
      envios: {
        zonas: [
          {
            nombre: 'Ciudad de Guatemala', departamentos: ['Guatemala'], postales: codigos(1001, 1019).concat('1021'),
            metodos: [
              { titulo: 'Envío en Ciudad de Guatemala', tipo: 'precio_fijo', costo: 25, activo: true },
              { titulo: 'Recoger en Oficinas - debes llamar para quedar en día y hora de la recolección', tipo: 'recogida_local', costo: 0, activo: true }
            ]
          },
          {
            nombre: 'Municipios del Departamento de Guatemala', departamentos: ['Guatemala'],
            postales: ['1064', '1057', '1066', '1051', '1052', '1062', '1073'],
            metodos: [
              { titulo: 'Envío a Villa Nueva, Mixco, Petapa, Santa Catarina Pinula, San José Pinula, Fraijanes, Puerta Parada', tipo: 'precio_fijo', costo: 35, activo: true }
            ]
          },
          {
            nombre: 'Departamental', departamentos: DEPARTAMENTOS.filter(function (d) { return d !== 'Guatemala'; }), postales: [],
            metodos: [
              { titulo: 'entre Q33 - Q50 dependiendo de peso y distancia - pagas el envío al recibir tu paquete', tipo: 'precio_fijo', costo: 0, activo: true }
            ]
          }
        ]
      },
      pagos: {
        pagalo: { activo: true, titulo: 'Tarjeta de crédito o débito', descripcion: 'Paga con tu tarjeta Visa o Mastercard de forma segura con Págalo.' },
        bacs: { activo: false, titulo: 'Transferencia bancaria directa', descripcion: 'Realiza tu pago directamente en nuestra cuenta bancaria. Por favor, usa el número del pedido como referencia de pago. Tu pedido no se procesará hasta que se haya recibido el importe en nuestra cuenta.' },
        cod: { activo: true, titulo: 'Pago contra entrega', descripcion: 'Paga en efectivo en el momento de la entrega.' }
      },
      correos: { nuevo: '', cancelado: '', fallido: '' },
      productos: { nuevos: [], cambios: {}, papelera: {} },
      cupones: [],
      paginas: { quienes: null, politicas: null }
    };
  }

  function leer(clave, porDefecto) {
    try { var v = JSON.parse(localStorage.getItem(clave)); return v === null ? porDefecto : v; } catch (e) { return porDefecto; }
  }
  function escribir(clave, valor) {
    try { localStorage.setItem(clave, JSON.stringify(valor)); return true; } catch (e) { return false; }
  }

  // Mezcla superficial por secciones: lo guardado reemplaza a la base.
  function combinar(base, guardado) {
    Object.keys(guardado || {}).forEach(function (k) {
      if (base[k] && typeof base[k] === 'object' && !Array.isArray(base[k]) && guardado[k] && typeof guardado[k] === 'object' && !Array.isArray(guardado[k])) {
        base[k] = combinar(base[k], guardado[k]);
      } else {
        base[k] = guardado[k];
      }
    });
    return base;
  }

  function soloDigitos(codigo) { return String(codigo || '').replace(/\D/g, '').replace(/^0+/, ''); }

  window.TiendaEstado = function (slug) {
    var tienda = E.porTienda(slug);
    if (!tienda) return null;
    var CLAVE = 'estacion-admin-' + slug;
    var ajustes = combinar(valoresBase(), leer(CLAVE, {}));

    function guardar() { return escribir(CLAVE, ajustes); }

    // Productos del catálogo archivado + cambios del panel.
    function productos(incluirPrivados) {
      var lista = tienda.productos.map(function (p) {
        var base = { slug: p.slug, nombre: p.nombre, precio: p.precio, rebajado: null, desde: p.desde, imagen: p.imagen ? E.ruta(p.imagen) : null,
          tipo: p.desde ? 'variable' : 'simple', descripcion: '', corta: '', sku: '', existencias: '', categorias: [], visibilidad: 'publico', archivado: true };
        // Datos del catálogo que el emprendedor entregó al CME (descripción, SKU, galería, variaciones…).
        ['descripcion', 'corta', 'sku', 'gestionar', 'existencias', 'categorias', 'variaciones', 'padre', 'visibilidad'].forEach(function (c) {
          if (p[c] !== undefined) base[c] = p[c];
        });
        if (p.galeria) base.galeria = p.galeria.map(E.ruta);
        if (p.variaciones) base.tipo = 'variable';
        return Object.assign(base, ajustes.productos.cambios[p.slug] || {});
      }).concat(ajustes.productos.nuevos.map(function (p) { return Object.assign({ archivado: false }, p); }));
      return lista.filter(function (p) {
        // La tienda oculta borradores y privados (los privados sí pueden ir dentro de un pack).
        return !ajustes.productos.papelera[p.slug] && (incluirPrivados || (p.visibilidad !== 'privado' && p.estado !== 'borrador'));
      });
    }

    function producto(s) {
      return productos(true).find(function (p) { return p.slug === s; });
    }

    // Precio que paga el cliente (rebajado si lo hay).
    function precio(p) { return p.rebajado !== null && p.rebajado !== '' && p.rebajado !== undefined ? Number(p.rebajado) : Number(p.precio); }

    function guardarProducto(datos) {
      if (tienda.productos.some(function (p) { return p.slug === datos.slug; })) {
        ajustes.productos.cambios[datos.slug] = datos;
      } else {
        var i = ajustes.productos.nuevos.findIndex(function (p) { return p.slug === datos.slug; });
        if (i === -1) ajustes.productos.nuevos.push(datos); else ajustes.productos.nuevos[i] = datos;
      }
      return guardar();
    }

    function enviarAPapelera(s) { ajustes.productos.papelera[s] = true; return guardar(); }

    // WooCommerce asigna la primera zona (de arriba abajo) que coincide con la dirección.
    function zonaPara(departamento, postal) {
      var cp = soloDigitos(postal);
      return ajustes.envios.zonas.find(function (z) {
        if (z.departamentos.indexOf(departamento) === -1) return false;
        if (!z.postales.length) return true;
        return z.postales.some(function (c) { return soloDigitos(c) === cp; });
      }) || null;
    }

    function metodosEnvio(departamento, postal, subtotal) {
      var zona = zonaPara(departamento, postal);
      if (!zona) return [];
      // El envío gratuito solo aparece si el pedido alcanza su importe mínimo.
      return zona.metodos.map(function (m, i) {
        return { id: zona.nombre + '-' + i, titulo: m.titulo, costo: m.tipo === 'envio_gratuito' ? 0 : Number(m.costo) || 0, tipo: m.tipo, activo: m.activo, minimo: Number(m.minimo) || 0 };
      }).filter(function (m) { return m.activo && (m.tipo !== 'envio_gratuito' || subtotal >= m.minimo); });
    }

    function cupon(codigo) {
      codigo = String(codigo || '').trim().toUpperCase();
      return ajustes.cupones.find(function (c) { return c.codigo === codigo; }) || null;
    }

    function descuento(c, subtotal) {
      if (!c) return 0;
      return Math.min(subtotal, c.tipo === 'porcentaje' ? subtotal * c.importe / 100 : c.importe);
    }

    return {
      tienda: tienda,
      ajustes: ajustes,
      guardar: guardar,
      productos: productos,
      producto: producto,
      precio: precio,
      guardarProducto: guardarProducto,
      enviarAPapelera: enviarAPapelera,
      zonaPara: zonaPara,
      metodosEnvio: metodosEnvio,
      cupon: cupon,
      descuento: descuento,
      logo: function () { return ajustes.config.logo || (tienda.logo ? E.ruta(tienda.logo) : E.ruta('assets/logos/cme.png')); },
      reiniciar: function () { try { localStorage.removeItem(CLAVE); } catch (e) { /* nada */ } },
      clavePedidos: 'estacion-pedidos-' + slug,
      claveSesion: 'estacion-sesion-' + slug,
      claveAdmin: 'estacion-acceso-admin-' + slug
    };
  };

  window.TiendaEstado.DEPARTAMENTOS = DEPARTAMENTOS;
  window.TiendaEstado.MUNICIPIOS_GUATEMALA = MUNICIPIOS_GUATEMALA;
  window.TiendaEstado.ICONOS_INFO = ICONOS_INFO;
  window.TiendaEstado.leer = leer;
  window.TiendaEstado.escribir = escribir;

  // Reduce una imagen subida a máx. 900 px (JPEG) para que quepa en localStorage.
  window.TiendaEstado.leerImagen = function (archivo, anchoMax) {
    return new Promise(function (resolver, rechazar) {
      var lector = new FileReader();
      lector.onerror = rechazar;
      lector.onload = function () {
        var img = new Image();
        img.onerror = rechazar;
        img.onload = function () {
          var escala = Math.min(1, (anchoMax || 900) / img.width);
          var lienzo = document.createElement('canvas');
          lienzo.width = Math.round(img.width * escala);
          lienzo.height = Math.round(img.height * escala);
          var ctx = lienzo.getContext('2d');
          ctx.fillStyle = '#fff';
          ctx.fillRect(0, 0, lienzo.width, lienzo.height);
          ctx.drawImage(img, 0, 0, lienzo.width, lienzo.height);
          resolver(lienzo.toDataURL('image/jpeg', .8));
        };
        img.src = lector.result;
      };
      lector.readAsDataURL(archivo);
    });
  };
})();
