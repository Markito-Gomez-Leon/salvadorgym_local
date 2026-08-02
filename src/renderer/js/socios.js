// Archivo: src/renderer/js/socios.js
const db = require('../../main/db.js');
const { shell } = require('electron');
 
let planesMembresia = [];
 
document.addEventListener('DOMContentLoaded', () => {
    cargarPlanes();
    cargarSociosYCumpleanos();
    
    const btnNuevoSocio = document.getElementById('btn-nuevo-socio');
    const modalSocio = document.getElementById('modal-socio');
    const formSocio = document.getElementById('form-socio');
    const btnCerrarModal = document.getElementById('btn-cerrar-modal');
    const selectPlan = document.getElementById('socio-plan');
    const inputVencimiento = document.getElementById('socio-vencimiento');
 
    btnNuevoSocio.addEventListener('click', () => {
        formSocio.reset();
        document.getElementById('socio-id').value = '';
        document.getElementById('modal-titulo').textContent = 'Registrar Nuevo Socio';
        modalSocio.style.display = 'flex';
        calcularVencimientoLocal(selectPlan.value, new Date(), inputVencimiento);
    });
 
    btnCerrarModal.addEventListener('click', () => modalSocio.style.display = 'none');
 
    selectPlan.addEventListener('change', (e) => {
        calcularVencimientoLocal(e.target.value, new Date(), inputVencimiento);
    });
 
    formSocio.addEventListener('submit', (e) => {
        e.preventDefault();
        const id = document.getElementById('socio-id').value;
        const nombre = document.getElementById('socio-nombre').value;
        const telefono = document.getElementById('socio-telefono').value;
        const nacimiento = document.getElementById('socio-nacimiento').value;
        const planSelect = document.getElementById('socio-plan');
        const planNombre = planSelect.options[planSelect.selectedIndex].text;
        const vencimiento = document.getElementById('socio-vencimiento').value;
        const metodoPagoSocio = document.getElementById('socio-metodo').value; 
 
        const planElegido = planesMembresia.find(p => p.id == planSelect.value);
        const precio = planElegido ? planElegido.precio : 0;
        const fechaHoraFija = obtenerFechaHoraPeru();
 
        if (id) {
            db.run(`UPDATE socios SET nombre = ?, telefono = ?, fecha_nacimiento = ?, plan = ?, fecha_vencimiento = ? WHERE id = ?`,
                [nombre, telefono, nacimiento, planNombre, vencimiento, id], (err) => {
                    if (err) console.error(err);
                    modalSocio.style.display = 'none';
                    cargarSociosYCumpleanos();
                });
        } else {
            db.run(`INSERT INTO socios (nombre, telefono, fecha_nacimiento, plan, fecha_vencimiento) VALUES (?, ?, ?, ?, ?)`,
                [nombre, telefono, nacimiento, planNombre, vencimiento], function(err) {
                    if (err) console.error(err);
                    db.run(`INSERT INTO ventas (producto_nombre, precio_total, metodo_pago, fecha) VALUES (?, ?, ?, ?)`,
                        [`Mensualidad: ${nombre}`, precio, metodoPagoSocio, fechaHoraFija], (errVenta) => {
                            if(errVenta) console.error(errVenta);
                        });
                    modalSocio.style.display = 'none';
                    cargarSociosYCumpleanos();
                });
        }
    });
 
    document.getElementById('btn-cerrar-perfil').addEventListener('click', () => {
        document.getElementById('modal-perfil').style.display = 'none';
    });
 
    document.getElementById('form-renovar').addEventListener('submit', (e) => {
        e.preventDefault();
        const socioId = document.getElementById('renovar-socio-id').value;
        const nombre = document.getElementById('renovar-socio-nombre').value;
        const planSelect = document.getElementById('renovar-plan');
        const planNombre = planSelect.options[planSelect.selectedIndex].text;
        const nuevoVencimiento = document.getElementById('renovar-vencimiento').value;
        const metodoPagoRenovacion = document.getElementById('renovar-metodo').value; 
        
        const planElegido = planesMembresia.find(p => p.id == planSelect.value);
        const precio = planElegido ? planElegido.precio : 0;
        const fechaHoraFija = obtenerFechaHoraPeru();
 
        db.run(`UPDATE socios SET plan = ?, fecha_vencimiento = ? WHERE id = ?`, [planNombre, nuevoVencimiento, socioId], (err) => {
            if(err) console.error(err);
            db.run(`INSERT INTO ventas (producto_nombre, precio_total, metodo_pago, fecha) VALUES (?, ?, ?, ?)`,
                [`Renovación: ${nombre}`, precio, metodoPagoRenovacion, fechaHoraFija], (errVenta) => {
                    if(errVenta) console.error(errVenta);
                });
            document.getElementById('modal-renovar').style.display = 'none';
            document.getElementById('modal-perfil').style.display = 'none';
            cargarSociosYCumpleanos();
        });
    });
 
    document.getElementById('renovar-plan').addEventListener('change', (e) => {
        const id = document.getElementById('renovar-socio-id').value;
        db.get(`SELECT fecha_vencimiento FROM socios WHERE id = ?`, [id], (err, row) => {
            if(row) {
                const hoy = new Date();
                hoy.setHours(0,0,0,0);
                let vActual = new Date(row.fecha_vencimiento);
                let fechaBase = (vActual > hoy) ? vActual : new Date();
                
                calcularVencimientoLocal(e.target.value, fechaBase, document.getElementById('renovar-vencimiento'));
            }
        });
    });
});
 
function cargarPlanes() {
    db.all(`SELECT * FROM membresias WHERE activo = 1`, [], (err, rows) => {
        if (!err) {
            planesMembresia = rows;
            const select = document.getElementById('socio-plan');
            const selectRenovar = document.getElementById('renovar-plan');
            select.innerHTML = '';
            selectRenovar.innerHTML = '';
            rows.forEach(p => {
                const opt = `<option value="${p.id}">${p.nombre} (S/ ${p.precio})</option>`;
                select.innerHTML += opt;
                selectRenovar.innerHTML += opt;
            });
        }
    });
}
 
function cargarSociosYCumpleanos() {
    const tbody = document.getElementById('tabla-socios');
    tbody.innerHTML = '';
    const hoy = new Date();
    let hayCumpleaneros = false;
    let nombresCumpleaneros = [];
 
    db.all(`SELECT * FROM socios ORDER BY id DESC`, [], (err, rows) => {
        if (err) return console.error(err);
        rows.forEach(socio => {
            if (socio.fecha_nacimiento) {
                const parts = socio.fecha_nacimiento.split('-');
                if(parts.length === 3) {
                    const mes = parseInt(parts[1], 10);
                    const dia = parseInt(parts[2], 10);
                    if (mes === (hoy.getMonth() + 1) && dia === hoy.getDate()) {
                        hayCumpleaneros = true;
                        nombresCumpleaneros.push(socio.nombre);
                    }
                }
            }
 
            const tr = document.createElement('tr');
            const vencimiento = new Date(socio.fecha_vencimiento);
            const vencido = vencimiento < hoy;
            const colorVencimiento = vencido ? 'color: #ff4444; font-weight: bold;' : 'color: #25D366;';
 
            tr.innerHTML = `
                <td>${socio.id}</td>
                <td><strong>${socio.nombre}</strong></td>
                <td>${socio.telefono}</td>
                <td>${socio.plan}</td>
                <td style="${colorVencimiento}">${socio.fecha_vencimiento} ${vencido ? '(Vencido)' : ''}</td>
                <td>
                    <button class="action-btn" style="background: #2A2A2A; border: 1px solid #00E5FF; color: #00E5FF;" onclick="abrirMegaPerfil(${socio.id}, '${socio.nombre}', '${socio.telefono}', '${socio.fecha_vencimiento}')">📋 Mega Perfil</button>
                    <button class="action-btn btn-edit" onclick="editarSocio(${socio.id})">Editar</button>
                </td>
            `;
            tbody.appendChild(tr);
        });
 
        const banner = document.getElementById('banner-cumpleanos');
        if (hayCumpleaneros) {
            document.getElementById('nombre-cumpleanero').textContent = nombresCumpleaneros.join(', ');
            banner.style.display = 'block';
        } else {
            banner.style.display = 'none';
        }
    });
}
 
window.abrirMegaPerfil = (id, nombre, telefono, fechaVencimiento) => {
    document.getElementById('perfil-id').value = id;
    document.getElementById('perfil-nombre').textContent = nombre;
    document.getElementById('modal-perfil').style.display = 'flex';
    document.getElementById('box-resultados').style.display = 'none';
    document.getElementById('btn-enviar-reporte').style.display = 'none';
    
    window.telefonoSocioActual = telefono;
    window.nombreSocioActual = nombre;
    
    document.getElementById('btn-renovar-perfil').onclick = () => {
        document.getElementById('renovar-socio-id').value = id;
        document.getElementById('renovar-socio-nombre').value = nombre;
        document.getElementById('modal-renovar').style.display = 'flex';
        document.getElementById('renovar-plan').dispatchEvent(new Event('change'));
    };
 
    cargarHistorialProgreso(id);
    cargarDeudasPerfil(id);
};
 
function cargarHistorialProgreso(socioId) {
    const lista = document.getElementById('historial-progreso-lista');
    lista.innerHTML = '';
    db.all(`SELECT * FROM progreso_socios WHERE socio_id = ? ORDER BY id DESC`, [socioId], (err, rows) => {
        if(err) return console.error(err);
        if(rows.length === 0) {
            lista.innerHTML = '<p style="color:#888; font-size:12px; margin-top: 10px;">Aún no se han guardado registros de progreso para este socio.</p>';
            return;
        }
        rows.forEach(row => {
            lista.innerHTML += `
                <div class="historial-item">
                    <strong style="color: #00E5FF;">📅 ${row.fecha.split(' ')[0]}</strong><br>
                    Peso: ${row.peso}kg | Grasa: ${row.grasa ? row.grasa.toFixed(1) : '--'}%
                </div>
            `;
        });
    });
}
 
function cargarDeudasPerfil(socioId) {
    const tbody = document.getElementById('tabla-perfil-deudas');
    tbody.innerHTML = '';
    db.all(`SELECT * FROM fiados WHERE socio_id = ? ORDER BY id DESC`, [socioId], (err, rows) => {
        if(err) return;
        rows.forEach(r => {
            let colorEstado = r.estado === 'Pagado' ? '#25D366' : '#FF0055';
            tbody.innerHTML += `
                <tr>
                    <td>${r.fecha.split(' ')[0]}</td>
                    <td>${r.descripcion}</td>
                    <td>S/ ${r.monto.toFixed(2)}</td>
                    <td style="color:${colorEstado}; font-weight:bold;">${r.estado}</td>
                </tr>
            `;
        });
    });
}
 
window.ejecutarCalculoYGuardar = () => {
    const genero = document.getElementById('calc-genero').value;
    const edad = parseFloat(document.getElementById('calc-edad').value);
    const peso = parseFloat(document.getElementById('calc-peso').value);
    const altura = parseFloat(document.getElementById('calc-altura').value);
    const cuello = parseFloat(document.getElementById('calc-cuello').value);
    const cintura = parseFloat(document.getElementById('calc-cintura').value);
    
    // CORRECCIÓN: Ahora cadera siempre debe existir (se quitó el condicional del ternario)
    const cadera = parseFloat(document.getElementById('calc-cadera').value);
    
    const pecho = document.getElementById('calc-pecho').value ? parseFloat(document.getElementById('calc-pecho').value) : 0;
    const brazo = document.getElementById('calc-brazo').value ? parseFloat(document.getElementById('calc-brazo').value) : 0;
    const pantorrilla = document.getElementById('calc-pantorrilla').value ? parseFloat(document.getElementById('calc-pantorrilla').value) : 0;
    
    const factorActividad = parseFloat(document.getElementById('calc-actividad').value);
    const ajusteObjetivo = parseFloat(document.getElementById('calc-objetivo').value);
 
    // CORRECCIÓN: La validación ahora requiere cadera obligatoriamente sin importar el género
    if(!edad || !peso || !altura || !cuello || !cintura || !cadera) {
        alert('Por favor, completa todos los campos obligatorios marcados con asterisco (*).');
        return;
    }
 
    let porcentajeGrasa = 0;
    let tmb = 0;
 
    if (genero === 'Hombre') {
        porcentajeGrasa = 86.010 * Math.log10(cintura - cuello) - 70.041 * Math.log10(altura) + 36.76;
        tmb = (10 * peso) + (6.25 * altura) - (5 * edad) + 5;
    } else {
        porcentajeGrasa = 163.205 * Math.log10(cintura + cadera - cuello) - 97.684 * Math.log10(altura) - 78.387;
        tmb = (10 * peso) + (6.25 * altura) - (5 * edad) - 161;
    }
 
    const masaGrasa = peso * (porcentajeGrasa / 100);
    const masaMagra = peso - masaGrasa;
    const ffmi = masaMagra / Math.pow((altura / 100), 2);
    const tdee = tmb * factorActividad;
    const caloriasObjetivo = tdee + ajusteObjetivo;
 
    const proteinas = peso * 2.0;
    const grasas = peso * 1.0;
    const carbos = (caloriasObjetivo - (proteinas * 4) - (grasas * 9)) / 4;
 
    const ratioV = pecho && cintura ? (pecho / cintura).toFixed(2) : 'N/A';
    
    // CORRECCIÓN: El ICC siempre se calcula porque cadera ya es obligatoria
    const icc = (cintura / cadera).toFixed(2);
 
    let reporteLimpio = `
=== REPORTE CLÍNICO FITNESS: ${genero.toUpperCase()} ===
 
[1. DATOS INGRESADOS]
Edad: ${edad} años | Peso: ${peso} kg | Altura: ${altura} cm
Cuello: ${cuello} cm | Cintura: ${cintura} cm | Cadera: ${cadera} cm
Pecho: ${pecho || 'N/A'} cm | Brazo: ${brazo || 'N/A'} cm | Pantorrilla: ${pantorrilla || 'N/A'} cm
 
[2. RESULTADOS Y CÁLCULOS CLÍNICOS]
1. Grasa Corporal: ${porcentajeGrasa.toFixed(2)}%
2. Masa Grasa: ${masaGrasa.toFixed(2)} kg
3. Masa Magra (Músculo/Agua/Hueso): ${masaMagra.toFixed(2)} kg
4. Índice Masa Libre Grasa (FFMI): ${ffmi.toFixed(2)}
5. Tasa Metabólica Basal (TMB): ${tmb.toFixed(0)} kcal
6. Gasto Diario Total (TDEE): ${tdee.toFixed(0)} kcal
7. Calorías Objetivo: ${caloriasObjetivo.toFixed(0)} kcal
 
[3. MACRONUTRIENTES DIARIOS]
Proteínas: ${proteinas.toFixed(0)} g
Grasas: ${grasas.toFixed(0)} g
Carbohidratos: ${carbos.toFixed(0)} g
 
[4. PROPORCIONES ESTÉTICAS]
Ratio en V (Pecho/Cintura): ${ratioV}
Índice Cintura-Cadera (ICC): ${icc}
    `.trim().replace(/^ +/gm, ''); 
 
    document.getElementById('box-resultados').textContent = reporteLimpio;
    document.getElementById('box-resultados').style.display = 'block';
    
    const btnWsp = document.getElementById('btn-enviar-reporte');
    btnWsp.style.display = 'inline-block';
    btnWsp.onclick = () => {
        let phone = window.telefonoSocioActual.replace(/\D/g, '');
        let url = `https://web.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(reporteLimpio)}`;
        shell.openExternal(url);
    };
 
    const socioId = document.getElementById('perfil-id').value;
    const jsonMedidas = JSON.stringify({ edad, altura, cuello, cintura, cadera, pecho, brazo, pantorrilla });
    db.run(`INSERT INTO progreso_socios (socio_id, peso, grasa, medidas, fecha) VALUES (?, ?, ?, ?, ?)`,
        [socioId, peso, porcentajeGrasa, jsonMedidas, obtenerFechaHoraPeru()], (err) => {
            if(!err) cargarHistorialProgreso(socioId);
        });
};
 
window.enviarWspRecordatorio = () => {
    let phone = window.telefonoSocioActual.replace(/\D/g, '');
    let msg = `Hola ${window.nombreSocioActual}, te recordamos que tu membresía en Salvador Gym está por vencer. ¡Te esperamos para renovar y seguir entrenando duro!`;
    shell.openExternal(`https://web.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(msg)}`);
};
 
window.enviarWspCumpleanos = () => {
    let phone = window.telefonoSocioActual.replace(/\D/g, '');
    let msg = `🎉 ¡Hola ${window.nombreSocioActual}! Todo el equipo de Salvador Gym te desea un muy feliz cumpleaños. ¡Que la pases genial y que tus ganancias musculares se multipliquen! 💪`;
    shell.openExternal(`https://web.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(msg)}`);
};
 
function calcularVencimientoLocal(planId, fechaBaseDate, inputTarget) {
    if (!planId) return;
    const planElegido = planesMembresia.find(p => p.id == planId);
    if(planElegido) {
        let d = new Date(fechaBaseDate);
        d.setMonth(d.getMonth() + planElegido.duracion_meses);
        d.setHours(d.getHours() - 5); 
        inputTarget.value = d.toISOString().split('T')[0];
    }
}
 
function obtenerFechaHoraPeru() {
    let d = new Date();
    d.setHours(d.getHours() - 5); 
    return d.toISOString().replace('T', ' ').substring(0, 19);
}
 
window.editarSocio = (id) => {
    alert("Función de edición habilitada en futuras integraciones.");
};