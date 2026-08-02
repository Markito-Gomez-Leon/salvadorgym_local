// Archivo: src/renderer/js/app.js
const db = require('../../main/db.js');

document.addEventListener('DOMContentLoaded', () => {
    const gridProductos = document.getElementById('grid-productos');
    const ticketItemsContainer = document.querySelector('.ticket-items');
    const totalSection = document.getElementById('texto-total');
    const yapeBtn = document.getElementById('btn-yape');
    const cashBtn = document.getElementById('btn-efectivo');
    
    // Elementos del Fiado
    const fiadoBtn = document.getElementById('btn-fiado');
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
        let d = new Date();
        d.setHours(d.getHours() - 5);
        return d.toISOString().replace('T', ' ').substring(0, 19);
    }

    function cargarProductos() {
        gridProductos.innerHTML = ''; 
        db.all("SELECT * FROM productos WHERE stock > 0 ORDER BY nombre ASC", [], (err, productos) => {
            if (err) return console.error(err);
            productos.forEach(producto => {
                const btn = document.createElement('button');
                btn.className = 'product-btn';
                btn.innerHTML = `${producto.nombre} <br><br><span style="color: #00E5FF; font-weight: bold;">S/ ${producto.precio.toFixed(2)}</span><br><small style="color: #888;">Stock: ${producto.stock}</small>`;
                
                btn.addEventListener('click', () => {
                    // ID único temporal (uid) para borrar ítem
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
            const div = document.createElement('div');
            div.style.display = "flex";
            div.style.justifyContent = "space-between";
            div.style.alignItems = "center";
            div.style.marginBottom = "8px";
            div.style.color = '#E0E0E0';
            div.style.borderBottom = "1px dashed #333";
            div.style.paddingBottom = "8px";
            
            div.innerHTML = `
                <span style="font-size: 14px;">1x ${item.nombre}</span>
                <div>
                    <span style="color: #00E5FF; font-weight: bold; margin-right: 10px;">S/ ${item.precio.toFixed(2)}</span>
                    <button class="btn-remove-item" onclick="borrarDelCarrito('${item.uid}')">❌</button>
                </div>
            `;
            ticketItemsContainer.appendChild(div);
        });
        totalSection.textContent = `Total: S/ ${total.toFixed(2)}`;
    }

    window.borrarDelCarrito = (uid) => {
        carrito = carrito.filter(item => String(item.uid) !== String(uid));
        actualizarCarrito();
    };

    // =========================================================
    // MOTOR DE COBRO ANTI-LAG CON LÓGICA DE FIADO RESTAURADA
    // =========================================================
    function procesarCobro(metodoPago, socioId = null) {
        if (carrito.length === 0) return alert('El carrito está vacío.');

        const descripcionCarrito = carrito.map(i => i.nombre).join(', ');
        const fechaHoraFija = obtenerFechaHoraPeru();

        // 1. Bloqueo de UI (Evita Lag Visual)
        const botones = document.querySelectorAll('.pay-btn');
        botones.forEach(b => { b.disabled = true; b.style.opacity = '0.4'; });
        totalSection.innerHTML = `<span style="color: #FF9800;">⚡ Procesando...</span>`;

        // 2. Macro-tarea Asíncrona
        setTimeout(() => {
            db.serialize(() => {
                db.run("BEGIN TRANSACTION"); // Arrancamos transacción masiva

                const stmtVenta = db.prepare(`INSERT INTO ventas (producto_nombre, precio_total, metodo_pago, fecha) VALUES (?, ?, ?, ?)`);
                const stmtStock = db.prepare(`UPDATE productos SET stock = stock - 1 WHERE id = ?`);
                
                let stmtFiado = null;
                if (metodoPago === 'Fiado' && socioId) {
                    stmtFiado = db.prepare(`INSERT INTO fiados (socio_id, descripcion, monto, fecha, estado) VALUES (?, ?, ?, ?, 'Pendiente')`);
                    stmtFiado.run([socioId, descripcionCarrito, total, fechaHoraFija]);
                }

                carrito.forEach(item => {
                    stmtStock.run([item.id]);
                    stmtVenta.run([item.nombre, item.precio, metodoPago, fechaHoraFija]);
                });

                stmtVenta.finalize();
                stmtStock.finalize();
                if(stmtFiado) stmtFiado.finalize();

                db.run("COMMIT", (err) => {
                    if (err) {
                        console.error("Error crítico procesando venta:", err);
                        alert("Hubo un error en la base de datos.");
                    } else {
                        // Limpieza tras el éxito
                        carrito = [];
                        total = 0;
                        actualizarCarrito();
                        cargarProductos(); 
                        modalFiado.style.display = 'none';
                    }
                    
                    // Restauración visual
                    botones.forEach(b => { b.disabled = false; b.style.opacity = '1'; });
                });
            });
        }, 150);
    }

    yapeBtn.addEventListener('click', () => procesarCobro('Yape'));
    cashBtn.addEventListener('click', () => procesarCobro('Efectivo'));

    // --- LÓGICA DE FIADO ---
    fiadoBtn.addEventListener('click', () => {
        if (carrito.length === 0) return alert('Agrega algo al carrito para poder fiarlo.');
        
        selectSocioFiado.innerHTML = '';
        db.all("SELECT id, nombre FROM socios ORDER BY nombre ASC", [], (err, socios) => {
            if (err) return console.error(err);
            if (socios.length === 0) return alert('No hay socios registrados para fiar.');
            
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

    // --- COBRO DE DEUDAS (AHORA CON MOTOR ANTI-LAG) ---
    btnAbrirCobrarDeuda.addEventListener('click', () => {
        selectDeudaCobrar.innerHTML = ''; 
        const query = `
            SELECT f.id, s.nombre, f.descripcion, f.monto, f.fecha 
            FROM fiados f JOIN socios s ON f.socio_id = s.id 
            WHERE f.estado = 'Pendiente' ORDER BY f.id ASC
        `;
        db.all(query, [], (err, deudas) => {
            if (err) return console.error(err);
            if (deudas.length === 0) return alert('No hay deudas pendientes por cobrar.');
            
            deudas.forEach(deuda => {
                const fechaSegura = deuda.fecha ? deuda.fecha.split(' ')[0] : 'Fecha no reg.';
                const opcion = document.createElement('option');
                opcion.value = `${deuda.id}_${deuda.monto}_${deuda.descripcion}`;
                opcion.textContent = `${deuda.nombre} debe S/${deuda.monto.toFixed(2)} (${deuda.descripcion}) - ${fechaSegura}`;
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

        // Anti-Lag Visual para el Modal
        btnConfirmarCobroDeuda.disabled = true;
        btnConfirmarCobroDeuda.innerHTML = "⚡ Procesando...";

        setTimeout(() => {
            db.serialize(() => {
                db.run("BEGIN TRANSACTION");
                
                db.run(`INSERT INTO ventas (producto_nombre, precio_total, metodo_pago, fecha) VALUES (?, ?, ?, ?)`, [conceptoVenta, monto, metodoPago, fechaHoraFija]);
                db.run(`UPDATE fiados SET estado = 'Pagado' WHERE id = ?`, [deudaId]);
                
                db.run("COMMIT", (err) => {
                    btnConfirmarCobroDeuda.disabled = false;
                    btnConfirmarCobroDeuda.innerHTML = "✅ Cobrar y Registrar";
                    if (err) {
                        console.error("Error en cobro de deuda:", err);
                        alert("Error cobrando la deuda.");
                    } else {
                        modalCobrarDeuda.style.display = 'none';
                    }
                });
            });
        }, 150);
    });

    cargarProductos();
});