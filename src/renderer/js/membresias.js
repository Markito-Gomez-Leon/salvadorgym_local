// Archivo: src/renderer/js/membresias.js
const db = require('../../main/db.js');

document.addEventListener('DOMContentLoaded', () => {
    const tbody = document.getElementById('tabla-membresias');
    const modal = document.getElementById('modal-membresia');
    const formMembresia = document.getElementById('form-membresia');
    const btnCerrar = document.getElementById('btn-cerrar-membresia');
    const btnNueva = document.getElementById('btn-nueva-membresia');
    const modalTitulo = document.getElementById('modal-titulo-membresia');

    // 1. Cargar membresías habilitadas (activo = 1)
    function cargarMembresias() {
        tbody.innerHTML = '';
        db.all(`SELECT * FROM membresias WHERE activo = 1 ORDER BY id DESC`, [], (err, rows) => {
            if (err) {
                console.error("Error al cargar membresías:", err);
                return;
            }
            rows.forEach(plan => {
                const tr = document.createElement('tr');
                const tipoSeguro = plan.duracion_tipo || 'Meses'; // Por si hay planes antiguos sin tipo

                tr.innerHTML = `
                    <td>${plan.id}</td>
                    <td><strong>${plan.nombre}</strong></td>
                    <td>S/ ${plan.precio.toFixed(2)}</td>
                    <td>${plan.duracion_meses} ${tipoSeguro}</td>
                    <td>
                        <button class="action-btn btn-edit" onclick="editarMembresia(${plan.id}, '${plan.nombre.replace(/'/g, "\\'")}', ${plan.precio}, ${plan.duracion_meses}, '${tipoSeguro}')">Editar</button>
                        <button class="action-btn btn-delete" onclick="deshabilitarMembresia(${plan.id})">Eliminar</button>
                    </td>
                `;
                tbody.appendChild(tr);
            });
        });
    }

    // 2. Abrir Modal para crear "Nueva Membresía"
    btnNueva.addEventListener('click', () => {
        document.getElementById('membresia-id').value = ''; 
        formMembresia.reset(); 
        document.getElementById('duracion-tipo').value = 'Meses'; // Default
        modalTitulo.textContent = 'Nueva Membresía';
        modal.style.display = 'flex';
    });

    // 3. Cerrar Modal
    btnCerrar.addEventListener('click', () => {
        modal.style.display = 'none';
    });

    // 4. Guardar (Detecta si es un UPDATE o un INSERT)
    formMembresia.addEventListener('submit', (e) => {
        e.preventDefault();
        const id = document.getElementById('membresia-id').value;
        const nombre = document.getElementById('nombre-plan').value;
        const precio = parseFloat(document.getElementById('precio-plan').value);
        const duracion = parseInt(document.getElementById('duracion-plan').value);
        const tipo = document.getElementById('duracion-tipo').value;

        if (id) {
            // EDITANDO
            db.run(`UPDATE membresias SET nombre = ?, precio = ?, duracion_meses = ?, duracion_tipo = ? WHERE id = ?`, 
            [nombre, precio, duracion, tipo, id], (err) => {
                if (err) console.error(err);
                modal.style.display = 'none';
                cargarMembresias();
                mostrarAlertaNeon("Membresía actualizada con éxito.", "success", "✅ Plan Editado");
            });
        } else {
            // CREANDO (activo = 1)
            db.run(`INSERT INTO membresias (nombre, precio, duracion_meses, duracion_tipo, activo) VALUES (?, ?, ?, ?, 1)`, 
            [nombre, precio, duracion, tipo], (err) => {
                if (err) console.error(err);
                modal.style.display = 'none';
                cargarMembresias();
                mostrarAlertaNeon("Nueva membresía habilitada en el sistema.", "success", "✅ Plan Creado");
            });
        }
    });

    // 5. Preparar el Modal para Edición
    window.editarMembresia = (id, nombre, precio, duracion, tipo) => {
        document.getElementById('membresia-id').value = id; 
        document.getElementById('nombre-plan').value = nombre;
        document.getElementById('precio-plan').value = precio;
        document.getElementById('duracion-plan').value = duracion;
        document.getElementById('duracion-tipo').value = tipo;
        
        modalTitulo.textContent = 'Editar Membresía';
        modal.style.display = 'flex';
    };

    // 6. Deshabilitar Membresía (Eliminación Lógica)
    window.deshabilitarMembresia = (id) => {
        mostrarConfirmacionNeon(
            "¿Estás seguro de que deseas eliminar este plan?\n\nYa no aparecerá para nuevos registros, pero se mantendrá en el historial de ventas para cuadrar caja.",
            () => {
                db.run(`UPDATE membresias SET activo = 0 WHERE id = ?`, [id], (err) => {
                    if (err) console.error(err);
                    cargarMembresias();
                    mostrarAlertaNeon("Plan eliminado del catálogo.", "info", "✅ Membresía Deshabilitada");
                });
            },
            "⚠️ Eliminar Plan"
        );
    };

    // Iniciar tabla al arrancar
    cargarMembresias();
});