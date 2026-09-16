// Archivo: src/renderer/js/inventario.js
const db = require('../../main/db.js');

document.addEventListener('DOMContentLoaded', () => {
    const tbody = document.getElementById('tabla-inventario');
    const modal = document.getElementById('modal-producto');
    const formProducto = document.getElementById('form-producto');
    const btnNuevo = document.getElementById('btn-nuevo-producto');
    const btnCerrar = document.getElementById('btn-cerrar-modal');
    const modalTitulo = document.getElementById('modal-titulo');

    // Cargar los productos desde SQLite a la tabla
    function cargarInventario() {
        tbody.innerHTML = '';
        
        db.all("SELECT * FROM productos ORDER BY nombre ASC", [], (err, filas) => {
            if (err) return console.error(err);
            
            filas.forEach(producto => {
                const tr = document.createElement('tr');
                
                // Pinta de rojo si quedan menos de 10
                const stockHtml = producto.stock < 10 
                    ? `<span style="color: #ff4444; font-weight: bold;">${producto.stock} (¡Bajo!)</span>` 
                    : `<span style="color: #00E5FF;">${producto.stock}</span>`;

                tr.innerHTML = `
                    <td>${producto.nombre}</td>
                    <td>S/ ${producto.precio.toFixed(2)}</td>
                    <td>${stockHtml}</td>
                    <td>
                        <button class="action-btn btn-edit" onclick="editarProducto(${producto.id}, '${producto.nombre.replace(/'/g, "\\'")}', ${producto.precio}, ${producto.stock})">Editar</button>
                        <button class="action-btn btn-delete" onclick="eliminarProducto(${producto.id}, '${producto.nombre.replace(/'/g, "\\'")}')">Eliminar</button>
                    </td>
                `;
                tbody.appendChild(tr);
            });
        });
    }

    // --- Funciones Globales para los botones de Editar y Eliminar ---
    window.editarProducto = (id, nombre, precio, stock) => {
        modalTitulo.textContent = 'Editar Producto';
        document.getElementById('input-id').value = id;
        document.getElementById('input-nombre').value = nombre;
        document.getElementById('input-precio').value = precio;
        document.getElementById('input-stock').value = stock;
        modal.style.display = 'flex';
    };

    window.eliminarProducto = (id, nombre) => {
        mostrarConfirmacionNeon(
            `¿Estás seguro de eliminar "${nombre}" del inventario de forma permanente?`,
            () => {
                db.run("DELETE FROM productos WHERE id = ?", [id], (err) => {
                    if (err) return console.error(err);
                    cargarInventario();
                    mostrarAlertaNeon("Producto eliminado exitosamente.", "info", "🗑️ Borrado Confirmado");
                });
            },
            "❌ Eliminar Producto"
        );
    };

    // --- Eventos de la Ventana Emergente (Modal) ---
    btnNuevo.addEventListener('click', () => {
        modalTitulo.textContent = 'Registrar Nuevo Producto';
        formProducto.reset();
        document.getElementById('input-id').value = ''; // Limpiar ID oculto
        modal.style.display = 'flex';
    });

    btnCerrar.addEventListener('click', () => {
        modal.style.display = 'none';
    });

    // Guardar o Actualizar en la base de datos
    formProducto.addEventListener('submit', (e) => {
        e.preventDefault();

        const id = document.getElementById('input-id').value;
        const nombre = document.getElementById('input-nombre').value;
        const precio = parseFloat(document.getElementById('input-precio').value);
        const stock = parseInt(document.getElementById('input-stock').value);

        if (id) {
            // Si el ID existe, estamos ACTUALIZANDO un producto
            db.run(
                `UPDATE productos SET nombre = ?, precio = ?, stock = ? WHERE id = ?`,
                [nombre, precio, stock, id],
                (err) => {
                    if (err) return console.error(err);
                    modal.style.display = 'none';
                    cargarInventario();
                    mostrarAlertaNeon("Producto actualizado correctamente.", "success", "✅ Stock Actualizado");
                }
            );
        } else {
            // Si el ID está vacío, estamos CREANDO un producto nuevo
            db.run(
                `INSERT INTO productos (nombre, precio, stock) VALUES (?, ?, ?)`,
                [nombre, precio, stock],
                (err) => {
                    if (err) return console.error(err);
                    modal.style.display = 'none';
                    cargarInventario();
                    mostrarAlertaNeon("Nuevo producto agregado al inventario.", "success", "✅ Producto Registrado");
                }
            );
        }
    });

    // Iniciar
    cargarInventario();
});