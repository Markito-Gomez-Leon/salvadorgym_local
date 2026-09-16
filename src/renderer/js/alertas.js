// Archivo: src/renderer/js/alertas.js

// Alerta Simple (Reemplaza a alert())
window.mostrarAlertaNeon = function(mensaje, tipo = 'info', titulo = '') {
    const overlay = document.createElement('div');
    overlay.className = 'neon-alert-overlay';
    
    const esPeligro = tipo === 'danger';
    const tituloFinal = titulo || (esPeligro ? '⚠️ Atención' : '💡 Salvador Gym');
    
    overlay.innerHTML = `
        <div class="neon-alert-box ${esPeligro ? 'danger' : ''}">
            <h3>${tituloFinal}</h3>
            <p>${mensaje}</p>
            <div class="neon-alert-actions">
                <button class="neon-btn ${esPeligro ? 'neon-btn-danger' : 'neon-btn-ok'}" id="neon-alert-btn-ok">Entendido</button>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);

    // Animación de entrada
    setTimeout(() => {
        overlay.style.opacity = '1';
        overlay.querySelector('.neon-alert-box').style.transform = 'scale(1)';
    }, 10);

    // Cerrar
    document.getElementById('neon-alert-btn-ok').addEventListener('click', () => {
        overlay.style.opacity = '0';
        setTimeout(() => document.body.removeChild(overlay), 200);
    });
};

// Confirmación (Reemplaza a confirm())
window.mostrarConfirmacionNeon = function(mensaje, callbackAceptar, titulo = '🤔 Confirmación') {
    const overlay = document.createElement('div');
    overlay.className = 'neon-alert-overlay';
    
    overlay.innerHTML = `
        <div class="neon-alert-box">
            <h3 style="color: #FF9800;">${titulo}</h3>
            <p>${mensaje}</p>
            <div class="neon-alert-actions">
                <button class="neon-btn neon-btn-cancel" id="neon-btn-cancelar">Cancelar</button>
                <button class="neon-btn neon-btn-ok" id="neon-btn-aceptar">Sí, Aceptar</button>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);

    setTimeout(() => {
        overlay.style.opacity = '1';
        overlay.querySelector('.neon-alert-box').style.transform = 'scale(1)';
    }, 10);

    const cerrar = () => {
        overlay.style.opacity = '0';
        setTimeout(() => document.body.removeChild(overlay), 200);
    };

    document.getElementById('neon-btn-cancelar').addEventListener('click', cerrar);
    
    document.getElementById('neon-btn-aceptar').addEventListener('click', () => {
        cerrar();
        if (callbackAceptar) callbackAceptar(); // Ejecuta la función si dijo que sí
    });
};