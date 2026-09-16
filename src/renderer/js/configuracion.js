// Archivo: src/renderer/js/configuracion.js
const db = require('../../main/db.js');

document.addEventListener('DOMContentLoaded', () => {
    
    // ==========================================
    // 1. LÓGICA DE CREDENCIALES (ACCESOS)
    // ==========================================
    const formCredenciales = document.getElementById('form-credenciales');
    
    // Cargar credenciales actuales desde SQLite
    db.get("SELECT usuario, password FROM configuracion WHERE id = 1", [], (err, row) => {
        if (row) {
            document.getElementById('config-user').value = row.usuario;
            document.getElementById('config-pass').value = row.password;
        }
    });

    formCredenciales.addEventListener('submit', (e) => {
        e.preventDefault();
        const user = document.getElementById('config-user').value;
        const pass = document.getElementById('config-pass').value;
        
        db.run("UPDATE configuracion SET usuario = ?, password = ? WHERE id = 1", [user, pass], (err) => {
            if (err) return console.error(err);
            mostrarAlertaNeon('Accesos actualizados correctamente. Usa estos datos la próxima vez que inicies sesión.', 'success', '🔐 Seguridad Actualizada');
        });
    });

    // ==========================================
    // 2. GESTOR DE PLANTILLAS WHATSAPP (CRUD)
    // ==========================================
    const tablaWsp = document.getElementById('tabla-wsp');
    const formWsp = document.getElementById('form-wsp');
    const inputWspId = document.getElementById('input-wsp-id');
    const inputWspTitulo = document.getElementById('input-wsp-titulo');
    const inputWspMensaje = document.getElementById('input-wsp-mensaje');
    const btnGuardarWsp = document.getElementById('btn-guardar-wsp');
    const btnCancelarWsp = document.getElementById('btn-cancelar-wsp');

    function cargarPlantillas() {
        tablaWsp.innerHTML = '';
        db.all("SELECT * FROM plantillas_whatsapp ORDER BY id DESC", [], (err, plantillas) => {
            if (err) return console.error(err);
            
            plantillas.forEach(p => {
                const tr = document.createElement('tr');
                
                // Cortamos el mensaje visualmente si es muy largo para que la tabla no se deforme
                const mensajeCorto = p.mensaje.length > 60 ? p.mensaje.substring(0, 60) + '...' : p.mensaje;
                
                tr.innerHTML = `
                    <td style="color: #00E5FF; font-weight: bold;">${p.titulo}</td>
                    <td style="font-size: 13px; color: #ccc;">${mensajeCorto}</td>
                    <td>
                        <button class="action-btn btn-edit" onclick="editarPlantilla(${p.id}, '${p.titulo.replace(/'/g, "\\'")}', '${p.mensaje.replace(/[\n\r]/g, '\\n').replace(/'/g, "\\'")}')" style="padding: 5px 10px; font-size: 12px; margin-right: 5px;">Editar</button>
                        <button class="action-btn" onclick="borrarPlantilla(${p.id})" style="background: #ff4444; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer; font-size: 12px;">🗑️ Anular</button>
                    </td>
                `;
                tablaWsp.appendChild(tr);
            });
        });
    }

    // Función para inyectar datos en el formulario al presionar "Editar"
    window.editarPlantilla = (id, titulo, mensaje) => {
        inputWspId.value = id;
        inputWspTitulo.value = titulo;
        inputWspMensaje.value = mensaje.replace(/\\n/g, '\n'); // Restaura los saltos de línea reales
        
        btnGuardarWsp.textContent = "💾 Actualizar Plantilla";
        btnGuardarWsp.style.backgroundColor = "#00E5FF"; // Cambiamos a azul neón para indicar modo edición
        btnCancelarWsp.style.display = "block";
        
        window.scrollTo({ top: 0, behavior: 'smooth' }); // Sube la pantalla suavemente
    };

    // Función para eliminar
    window.borrarPlantilla = (id) => {
        mostrarConfirmacionNeon(
            "¿Estás seguro de que deseas ELIMINAR esta plantilla de WhatsApp de forma permanente?",
            () => {
                db.run("DELETE FROM plantillas_whatsapp WHERE id = ?", [id], (err) => {
                    if (err) return console.error(err);
                    cargarPlantillas();
                    mostrarAlertaNeon("Plantilla eliminada de la base de datos.", "info", "🗑️ Borrado Exitoso");
                });
            },
            "❌ Borrar Plantilla"
        );
    };

    // Botón para cancelar la edición y volver a modo "Crear Nuevo"
    btnCancelarWsp.addEventListener('click', () => {
        formWsp.reset();
        inputWspId.value = '';
        btnGuardarWsp.textContent = "+ Agregar / Guardar Plantilla";
        btnGuardarWsp.style.backgroundColor = "#25D366";
        btnCancelarWsp.style.display = "none";
    });

    // Envío del formulario (Sirve para INSERTAR y ACTUALIZAR)
    formWsp.addEventListener('submit', (e) => {
        e.preventDefault();
        const id = inputWspId.value;
        const titulo = inputWspTitulo.value;
        const mensaje = inputWspMensaje.value;
        
        if (id) {
            // MODO EDICIÓN: El campo oculto tiene ID, ejecutamos UPDATE
            db.run("UPDATE plantillas_whatsapp SET titulo = ?, mensaje = ? WHERE id = ?", [titulo, mensaje, id], (err) => {
                if (err) return console.error(err);
                mostrarAlertaNeon("Plantilla actualizada exitosamente.", "success", "✅ CRM Actualizado");
                btnCancelarWsp.click(); // Esto resetea el formulario y los botones a su estado original
                cargarPlantillas();
            });
        } else {
            // MODO NUEVO REGISTRO: El campo oculto está vacío, ejecutamos INSERT
            db.run("INSERT INTO plantillas_whatsapp (titulo, mensaje) VALUES (?, ?)", [titulo, mensaje], (err) => {
                if (err) return console.error(err);
                mostrarAlertaNeon("Nueva plantilla de WhatsApp guardada.", "success", "✅ Plantilla Creada");
                formWsp.reset();
                cargarPlantillas();
            });
        }
    });

    // Inicializar cargando la tabla al abrir la ventana
    cargarPlantillas();
});