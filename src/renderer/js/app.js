// Archivo: src/renderer/js/app.js
const db = require('../../main/db.js');

document.addEventListener('DOMContentLoaded', () => {
    const gridProductos = document.getElementById('grid-productos');
    const ticketItemsContainer = document.querySelector('.ticket-items');
    const totalSection = document.querySelector('.total-section h3');
    const yapeBtn = document.querySelector('.yape-btn');
    const cashBtn = document.querySelector('.cash-btn');
    
    // Elementos del Fiado
    const fiadoBtn = document.querySelector('.fiado-btn');
    const modalFiado = document.getElementById('modal-fiado');
    const btnCerrarFiado = document.getElementById('btn-cerrar-fiado');
    const btnConfirmarFiado = document.getElementById('btn-confirmar-fiado');
    const selectSocioFiado = document.getElementById('select-socio-fiado');

    // Elementos de Cobrar Deuda
    const btnAbrirCobrarDeuda = document.getElementById('btn-abrir-cobrar-deuda');
    const modalCobrarDeuda = document.getElementById('modal-cobrar-deuda');
    const btnCerrarCobrarDeuda = document.getElementById('btn-cerrar-cobrar-deuda');
    const btnConfirmarCobroDeuda = document.getElementById('btn-confirmar-cobro-deuda');
    const selectDeudaCobrar = document.getElementById('select-deuda-cobrar');
    const selectMetodoCobroDeuda = document.getElementById('select-metodo-cobro-deuda');

    let carrito = [];
    let total = 0;

    function obtenerFechaHoraPeru() {
        const ahora = new Date();
        const año = ahora.getFullYear();
        const mes = String(ahora.getMonth() + 1).padStart(2, '0');
        const dia = String(ahora.getDate()).padStart(2, '0');
        const hora = String(ahora.getHours()).padStart(2, '0');
        const minutos = String(ahora.getMinutes()).padStart(2, '0');
        const segundos = String(ahora.getSeconds()).padStart(2, '0');
        return `${año}-${mes}-${dia} ${hora}:${minutos}:${segundos}`;
    }

    function cargarProductos() {
        gridProductos.innerHTML = '';
        db.all("SELECT * FROM productos WHERE stock > 0 ORDER BY nombre ASC", [], (err, productos) => {
            if (err) return console.error(err);
            productos.forEach(producto => {
                const btn = document.createElement('button');
                btn.className = 'product-btn';
                btn.innerHTML = `${producto.nombre} <br><small style="color: #00E5FF;">S/ ${producto.precio.toFixed(2)}</small>`;
                btn.addEventListener('click', () => {
                    carrito.push({ ...producto, uid: Date.now() + Math.random() });
                    total += producto.precio;
                    actualizarCarrito();
                });
                gridProductos.appendChild(btn);
            });
        });
    }

    function actualizarCarrito() {
        ticketItemsContainer.innerHTML = '';
        total = 0;
        carrito.forEach(item => {
            total += item.precio;
            const p = document.createElement('p');
            p.style.display = "flex";
            p.style.justifyContent = "space-between";
            p.style.marginBottom = "8px";
            p.style.color = '#E0E0E0';
            p.style.borderBottom = "1px dashed #333";
            p.style.paddingBottom = "5px";
            
            p.innerHTML = `
                <span>1x ${item.nombre} - S/ ${item.precio.toFixed(2)}</span>
                <button class="btn-remove-item" onclick="borrarDelCarrito('${item.uid}')">❌</button>
            `;
            ticketItemsContainer.appendChild(p);
        });
        totalSection.textContent = `Total: S/ ${total.toFixed(2)}`;
    }

    window.borrarDelCarrito = (uid) => {
        carrito = carrito.filter(item => String(item.uid) !== String(uid));
        actualizarCarrito();
    };

    function procesarCobro(metodoPago, socioId = null) {
        if (carrito.length === 0) return mostrarAlertaNeon('El carrito está vacío. Agrega productos antes de cobrar.', 'danger', '⚠️ Carrito Vacío');
        
        let itemsProcesados = 0;
        const fechaHoraFija = obtenerFechaHoraPeru();

        carrito.forEach(item => {
            if (metodoPago === 'Fiado' && socioId) {
                db.run(`INSERT INTO fiados (socio_id, descripcion, monto, fecha) VALUES (?, ?, ?, ?)`,
                    [socioId, item.nombre, item.precio, fechaHoraFija], (err) => {
                    if(err) console.error("Error al guardar deuda individual:", err);
                });
            }

            db.run(`INSERT INTO ventas (producto_nombre, precio_total, metodo_pago, fecha) VALUES (?, ?, ?, ?)`,
                [item.nombre, item.precio, metodoPago, fechaHoraFija], (err) => {
                    if (err) console.error("Error al registrar venta:", err);
                });

            db.run(`UPDATE productos SET stock = stock - 1 WHERE id = ?`, [item.id], (err) => {
                itemsProcesados++;
                if (itemsProcesados === carrito.length) {
                    mostrarAlertaNeon(`¡Venta procesada con éxito!\nTotal: S/ ${total.toFixed(2)}\nMétodo: ${metodoPago}`, 'success', '✅ Venta Completada');
                    carrito = [];
                    total = 0;
                    actualizarCarrito();
                    cargarProductos();
                    modalFiado.style.display = 'none';
                }
            });
        });
    }

    yapeBtn.addEventListener('click', () => procesarCobro('Yape'));
    cashBtn.addEventListener('click', () => procesarCobro('Efectivo'));

    // --- LÓGICA DE DEJAR FIADO (BLINDADA CONTRA FANTASMAS) ---
    fiadoBtn.addEventListener('click', () => {
        if (carrito.length === 0) return mostrarAlertaNeon('Agrega algo al carrito para poder fiarlo.', 'danger', '⚠️ Acción no permitida');
        
        selectSocioFiado.innerHTML = '';
        // FIX ARQUITECTÓNICO: Excluimos a los socios eliminados lógicamente
        db.all("SELECT id, nombre FROM socios WHERE activo = 1 OR activo IS NULL ORDER BY nombre ASC", [], (err, socios) => {
            if (err) return console.error(err);
            if (socios.length === 0) return mostrarAlertaNeon('No hay socios activos registrados para dar crédito.', 'danger', '⚠️ Directorio Vacío');
            
            socios.forEach(socio => {
                const opcion = document.createElement('option');
                opcion.value = socio.id;
                opcion.textContent = socio.nombre;
                selectSocioFiado.appendChild(opcion);
            });
            
            modalFiado.style.display = 'flex';
        });
    });

    btnCerrarFiado.addEventListener('click', () => modalFiado.style.display = 'none');
    
    btnConfirmarFiado.addEventListener('click', () => {
        const socioId = selectSocioFiado.value;
        if(socioId) procesarCobro('Fiado', socioId);
    });

    // --- COBRO RÁPIDO DE DEUDAS ---
    btnAbrirCobrarDeuda.addEventListener('click', () => {
        selectDeudaCobrar.innerHTML = '';
        
        // Se mantiene el inner join natural, si un fantasma debe dinero, permitiremos que lo pague.
        const query = `
            SELECT f.id, s.nombre, f.descripcion, f.monto, f.fecha 
            FROM fiados f 
            JOIN socios s ON f.socio_id = s.id 
            WHERE f.estado = 'Pendiente' 
            ORDER BY f.id ASC
        `;
        
        db.all(query, [], (err, deudas) => {
            if (err) return console.error(err);
            if (deudas.length === 0) return mostrarAlertaNeon('No hay deudas pendientes por cobrar. ¡Todos los socios están al día!', 'info', '👍 Todo al día');
            
            deudas.forEach(deuda => {
                const fechaSegura = deuda.fecha ? deuda.fecha.split(' ')[0] : 'Fecha no reg.';
                const descripcionVisual = `${deuda.nombre} debe S/${deuda.monto.toFixed(2)} (${deuda.descripcion}) - ${fechaSegura}`;
                
                const opcion = document.createElement('option');
                opcion.value = `${deuda.id}_${deuda.monto}_${deuda.descripcion}`;
                opcion.textContent = descripcionVisual;
                
                selectDeudaCobrar.appendChild(opcion);
            });
            
            modalCobrarDeuda.style.display = 'flex';
        });
    });

    btnCerrarCobrarDeuda.addEventListener('click', () => modalCobrarDeuda.style.display = 'none');

    btnConfirmarCobroDeuda.addEventListener('click', () => {
        const seleccion = selectDeudaCobrar.value;
        if (!seleccion) return;

        const partes = seleccion.split('_');
        const deudaId = partes[0];
        const monto = parseFloat(partes[1]);
        const desc = partes.slice(2).join('_');
        
        const metodoPago = selectMetodoCobroDeuda.value;
        const fechaHoraFija = obtenerFechaHoraPeru();
        const conceptoVenta = `Pago de Deuda: ${desc}`;

        db.run(`INSERT INTO ventas (producto_nombre, precio_total, metodo_pago, fecha) VALUES (?, ?, ?, ?)`,
            [conceptoVenta, monto, metodoPago, fechaHoraFija], (err) => {
                if (err) return console.error("Error al registrar venta de deuda:", err);
                
                db.run(`UPDATE fiados SET estado = 'Pagado' WHERE id = ?`, [deudaId], (err2) => {
                    if (err2) return console.error("Error al actualizar fiado:", err2);
                    
                    mostrarAlertaNeon(`¡Deuda cobrada con éxito!\nIngresó S/ ${monto.toFixed(2)} a tu caja por ${metodoPago}.`, 'success', '💰 Deuda Liquidada');
                    modalCobrarDeuda.style.display = 'none';
                });
            });
    });

    cargarProductos();
    actualizarCarrito();
});