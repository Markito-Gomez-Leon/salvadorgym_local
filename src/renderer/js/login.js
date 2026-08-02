// Archivo: src/renderer/js/login.js
const db = require('../../main/db.js');

document.addEventListener('DOMContentLoaded', () => {
    const formLogin = document.getElementById('form-login');
    const errorMsg = document.getElementById('error-msg');

    formLogin.addEventListener('submit', (e) => {
        e.preventDefault(); // Evitamos que la página se recargue al dar enter
        
        // Capturamos los valores de los inputs del nuevo HTML
        const user = document.getElementById('usuario').value.trim();
        const pass = document.getElementById('password').value.trim();

        // Limpiamos mensajes de error previos
        errorMsg.textContent = '';

        // Consultamos a la base de datos
        db.get(`SELECT * FROM configuracion WHERE usuario = ? AND password = ?`, [user, pass], (err, row) => {
            if (err) {
                console.error("Error consultando credenciales:", err);
                errorMsg.textContent = 'Error interno de la base de datos.';
                return;
            }

            if (row) {
                // Credenciales correctas -> Redirigimos a la Caja Rápida (index.html)
                window.location.href = 'index.html';
            } else {
                // Validación Anti-Bloqueo: Comprobamos si la tabla de configuración está vacía
                db.get(`SELECT COUNT(*) as count FROM configuracion`, [], (errCount, res) => {
                    if (res && res.count === 0) {
                        // Si no hay usuarios en la BD, creamos el de por defecto y validamos
                        db.run(`INSERT INTO configuracion (usuario, password) VALUES ('admin', 'admin')`, [], () => {
                            if (user === 'admin' && pass === 'admin') {
                                window.location.href = 'index.html';
                            } else {
                                errorMsg.textContent = 'Datos incorrectos. (Usa admin / admin por defecto).';
                            }
                        });
                    } else {
                        // Si ya existen usuarios pero escribió mal la contraseña
                        errorMsg.textContent = 'Usuario o contraseña incorrectos.';
                    }
                });
            }
        });
    });
});