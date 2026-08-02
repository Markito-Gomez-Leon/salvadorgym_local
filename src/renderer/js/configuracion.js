const db = require('../../main/db.js');

document.addEventListener('DOMContentLoaded', () => {
    const selectRutina = document.getElementById('select-rutina');
    const textoRutina = document.getElementById('texto-rutina');
    const btnGuardarRutina = document.getElementById('btn-guardar-rutina');

    // Cargar credenciales actuales
    db.get("SELECT usuario, password FROM configuracion WHERE id = 1", [], (err, row) => {
        if (row) {
            document.getElementById('config-user').value = row.usuario;
            document.getElementById('config-pass').value = row.password;
        }
    });

    document.getElementById('form-credenciales').addEventListener('submit', (e) => {
        e.preventDefault();
        const user = document.getElementById('config-user').value;
        const pass = document.getElementById('config-pass').value;
        db.run("UPDATE configuracion SET usuario = ?, password = ? WHERE id = 1", [user, pass], () => {
            alert('Credenciales actualizadas correctamente.');
        });
    });

    // --- LÓGICA DE MARKETING (RUTINAS WSP) ---

    // Plantillas Maestras Predeterminadas
    const rutinasPredeterminadas = {
        'Hombre_Volumen': "¡Hola [NOMBRE]! 💪🔥\nSegún tu evaluación, esta es tu Rutina de VOLUMEN (Hipertrofia):\n\nLunes: Pecho y Tríceps (Pesado)\nMartes: Espalda y Bíceps\nMiércoles: Pierna Completa\nJueves: Hombros y Abdomen\nViernes: Brazo Completo\n\nRecuerda: Come tu superávit calórico. ¡A mutar! 🦍",
        'Hombre_Definicion': "¡Hola [NOMBRE]! ⚡🔥\nSegún tu evaluación, esta es tu Rutina de DEFINICIÓN (Quema de Grasa):\n\nLunes: Full Body + 20min Cardio HIIT\nMartes: Push (Pecho/Hombro/Tríceps)\nMiércoles: Pull (Espalda/Bíceps) + Cardio\nJueves: Piernas pesadas\nViernes: Full Body + 30min Cardio LISS\n\nRecuerda: Mantén tu déficit calórico estricto. ✂️",
        'Hombre_Mantenimiento': "¡Hola [NOMBRE]! 🛡️\nTu objetivo es MANTENIMIENTO y recomposición. Aquí tu rutina:\n\nEntrena intenso 4 días a la semana (L, M, J, V). Divide en torso/pierna. Mantén un equilibrio entre cardio suave y fuerza bruta para mantener masa y cuidar el corazón. 🚀",
        'Mujer_Volumen': "¡Hola [NOMBRE]! 🍑🔥\nEsta es tu Rutina de VOLUMEN enfocada en Tren Inferior:\n\nLunes: Glúteos y Femorales (Pesado)\nMartes: Espalda y Hombros\nMiércoles: Cuádriceps y Pantorrillas\nJueves: Descanso Activo\nViernes: Glúteos y Abdomen\n\nRecuerda comer bien para construir esa masa muscular. ¡A darle! 🚀",
        'Mujer_Definicion': "¡Hola [NOMBRE]! ⚡💃\nEsta es tu Rutina de DEFINICIÓN y Tonificación:\n\nLunes: Pierna + 20min Cardio\nMartes: Tren Superior + Abdomen\nMiércoles: Cardio HIIT 30 min\nJueves: Glúteos con bandas y peso moderado\nViernes: Full Body express\n\nRespeta el déficit para marcar. ✂️",
        'Mujer_Mantenimiento': "¡Hola [NOMBRE]! ✨\nTu plan es de MANTENIMIENTO y salud integral:\n\nCombina 3 días de pesas (enfocado en resistencia y tonificación) con 2 días de clases grupales o cardio divertido. Mantén tus calorías estables. ¡Mantente fuerte y sana! 🧘‍♀️"
    };

    function inicializarRutinas() {
        // Verificar si existen. Si no, insertarlas.
        db.all("SELECT * FROM plantillas_whatsapp", [], (err, filas) => {
            if (filas.length === 0) {
                for (const [clave, mensaje] of Object.entries(rutinasPredeterminadas)) {
                    db.run("INSERT INTO plantillas_whatsapp (titulo, mensaje) VALUES (?, ?)", [clave, mensaje]);
                }
                setTimeout(cargarRutinaEnEditor, 500); // Dar tiempo a que guarde
            } else {
                cargarRutinaEnEditor();
            }
        });
    }

    function cargarRutinaEnEditor() {
        const claveSeleccionada = selectRutina.value;
        db.get("SELECT mensaje FROM plantillas_whatsapp WHERE titulo = ?", [claveSeleccionada], (err, row) => {
            if (row) {
                textoRutina.value = row.mensaje;
            }
        });
    }

    selectRutina.addEventListener('change', cargarRutinaEnEditor);

    btnGuardarRutina.addEventListener('click', () => {
        const claveSeleccionada = selectRutina.value;
        const nuevoMensaje = textoRutina.value;
        db.run("UPDATE plantillas_whatsapp SET mensaje = ? WHERE titulo = ?", [nuevoMensaje, claveSeleccionada], () => {
            alert('¡Rutina actualizada y guardada para tus próximos envíos!');
        });
    });

    inicializarRutinas();
});