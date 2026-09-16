// Archivo: src/renderer/js/socios.js
const db = require('../../main/db.js');
const { shell } = require('electron');
 
let planesMembresia = [];
 
document.addEventListener('DOMContentLoaded', () => {
    cargarPlanes();
    cargarSociosYCumpleanos();
    cargarPlantillasCRM();
    
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
        
        document.getElementById('socio-plan').disabled = false;
        document.getElementById('socio-metodo').disabled = false;
        document.getElementById('socio-vencimiento').disabled = false;

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
        const vencimiento = document.getElementById('socio-vencimiento').value;
        
        const planSelect = document.getElementById('socio-plan');
        const planNombre = planSelect.options[planSelect.selectedIndex].text;
        const metodoPagoSocio = document.getElementById('socio-metodo').value; 
 
        const planElegido = planesMembresia.find(p => p.id == planSelect.value);
        const precio = planElegido ? planElegido.precio : 0;
        const fechaHoraFija = obtenerFechaHoraPeru();
 
        if (id) {
            db.run(`UPDATE socios SET nombre = ?, telefono = ?, fecha_nacimiento = ?, fecha_vencimiento = ? WHERE id = ?`,
                [nombre, telefono, nacimiento, vencimiento, id], (err) => {
                    if (err) console.error(err);
                    modalSocio.style.display = 'none';
                    cargarSociosYCumpleanos();
                    mostrarAlertaNeon("Socio actualizado con éxito.", "info", "✅ Edición Guardada");
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
                    mostrarAlertaNeon("Nuevo socio guardado y cobro registrado en Caja.", "success", "🎉 ¡Socio Registrado!");
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
            mostrarAlertaNeon(`Renovación cobrada con éxito (${metodoPagoRenovacion}).`, "success", "⚡ Plan Renovado");
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

    const selectWspCRM = document.getElementById('select-plantilla-wsp');
    const inputWspCRM = document.getElementById('preview-mensaje-wsp');
    const btnEnviarWspCRM = document.getElementById('btn-enviar-wsp-crm');

    if (selectWspCRM) {
        selectWspCRM.addEventListener('change', (e) => {
            let mensajeCrudo = e.target.value;
            if(window.nombreSocioActual) {
                mensajeCrudo = mensajeCrudo.replace(/\[NOMBRE\]/gi, window.nombreSocioActual);
                mensajeCrudo = mensajeCrudo.replace(/\(NOMBRE\)/gi, window.nombreSocioActual);
            }
            inputWspCRM.value = mensajeCrudo;
        });
    }

    if (btnEnviarWspCRM) {
        btnEnviarWspCRM.addEventListener('click', () => {
            if (!inputWspCRM.value) return mostrarAlertaNeon("Por favor, selecciona o escribe un mensaje para enviar.", "danger", "⚠️ Mensaje Vacío");
            if (!window.telefonoSocioActual) return mostrarAlertaNeon("El socio no tiene un teléfono registrado.", "danger", "⚠️ Sin Teléfono");
            
            let phone = window.telefonoSocioActual.replace(/\D/g, '');
            let url = `https://web.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(inputWspCRM.value)}`;
            shell.openExternal(url);
        });
    }

    // EVENTO DE IMPORTACIÓN (BACKUP DE SOCIOS)
    document.getElementById('input-importar-socios').addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const csvText = event.target.result;
            procesarImportacionSociosCSV(csvText);
            e.target.value = ''; 
        };
        reader.readAsText(file);
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

function cargarPlantillasCRM() {
    const selectWspCRM = document.getElementById('select-plantilla-wsp');
    if(!selectWspCRM) return;
    
    selectWspCRM.innerHTML = '<option value="">-- Selecciona un mensaje --</option>';
    db.all("SELECT * FROM plantillas_whatsapp ORDER BY id DESC", [], (err, plantillas) => {
        if (!err) {
            plantillas.forEach(p => {
                selectWspCRM.innerHTML += `<option value="${p.mensaje}">${p.titulo}</option>`;
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
    
    document.getElementById('select-plantilla-wsp').selectedIndex = 0;
    document.getElementById('preview-mensaje-wsp').value = '';
    
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

// ----------------------------------------------------
// MAGIA: COBROS PARCIALES DE DEUDAS (MODIFICADO)
// ----------------------------------------------------
function cargarDeudasPerfil(socioId) {
    const tbody = document.getElementById('tabla-perfil-deudas');
    tbody.innerHTML = '';
    db.all(`SELECT * FROM fiados WHERE socio_id = ? ORDER BY id DESC`, [socioId], (err, rows) => {
        if(err) return;
        rows.forEach(r => {
            let colorEstado = r.estado === 'Pagado' ? '#25D366' : '#FF0055';
            
            // Inyectamos el selector de Yape/Efectivo y el botón "Pagar" directamente en la columna de Estado
            let htmlAccion = '';
            if (r.estado === 'Pendiente') {
                htmlAccion = `
                    <div style="display:flex; gap:5px; align-items:center;">
                        <select id="metodo-fiado-${r.id}" style="background:#111; color:#fff; border:1px solid #444; padding:4px; border-radius:4px; font-size:12px;">
                            <option value="Efectivo">Efectivo</option>
                            <option value="Yape">Yape</option>
                        </select>
                        <button onclick="cobrarDeudaIndividual(${r.id}, ${r.monto}, '${r.descripcion.replace(/'/g, "\\'")}', ${socioId})" 
                        style="background:#25D366; color:black; border:none; padding:4px 8px; border-radius:4px; font-weight:bold; cursor:pointer;">Pagar</button>
                    </div>
                `;
            } else {
                htmlAccion = `<span style="color:${colorEstado}; font-weight:bold;">✅ Cancelado</span>`;
            }

            tbody.innerHTML += `
                <tr>
                    <td>${r.fecha.split(' ')[0]}</td>
                    <td>${r.descripcion}</td>
                    <td style="color: #FF9800; font-weight: bold;">S/ ${r.monto.toFixed(2)}</td>
                    <td>${htmlAccion}</td>
                </tr>
            `;
        });
    });
}

// NUEVA FUNCIÓN: Cobro Individual con Alerta Neón
window.cobrarDeudaIndividual = (idFiado, monto, descripcion, socioId) => {
    const metodoElegido = document.getElementById(`metodo-fiado-${idFiado}`).value;

    mostrarConfirmacionNeon(
        `¿Confirmas el pago de S/ ${monto.toFixed(2)} por "${descripcion}" usando ${metodoElegido}?`,
        () => {
            const fechaFija = obtenerFechaHoraPeru();
            const concepto = `Pago de Deuda: ${descripcion}`;

            // Insertamos el dinero real a las Finanzas
            db.run(`INSERT INTO ventas (producto_nombre, precio_total, metodo_pago, fecha) VALUES (?, ?, ?, ?)`, 
                [concepto, monto, metodoElegido, fechaFija], (err) => {
                    if (err) return console.error(err);
                    
                    // Actualizamos la deuda a 'Pagado'
                    db.run(`UPDATE fiados SET estado = 'Pagado' WHERE id = ?`, [idFiado], () => {
                        mostrarAlertaNeon(`El pago de S/ ${monto.toFixed(2)} ingresó a tu caja de hoy.`, "success", "💰 Deuda Liquidada");
                        cargarDeudasPerfil(socioId); // Recarga la tabla para que cambie a ✅ Cancelado
                    });
                });
        },
        "💰 Confirmar Pago Parcial"
    );
};
 
window.ejecutarCalculoYGuardar = () => {
    const genero = document.getElementById('calc-genero').value;
    const edad = parseFloat(document.getElementById('calc-edad').value);
    const peso = parseFloat(document.getElementById('calc-peso').value);
    const altura = parseFloat(document.getElementById('calc-altura').value);
    const cuello = parseFloat(document.getElementById('calc-cuello').value);
    const cintura = parseFloat(document.getElementById('calc-cintura').value);
    const cadera = parseFloat(document.getElementById('calc-cadera').value);
    
    const pecho = document.getElementById('calc-pecho').value ? parseFloat(document.getElementById('calc-pecho').value) : 0;
    const brazo = document.getElementById('calc-brazo').value ? parseFloat(document.getElementById('calc-brazo').value) : 0;
    const pantorrilla = document.getElementById('calc-pantorrilla').value ? parseFloat(document.getElementById('calc-pantorrilla').value) : 0;
    
    const factorActividad = parseFloat(document.getElementById('calc-actividad').value);
    const ajusteObjetivo = parseFloat(document.getElementById('calc-objetivo').value);
 
    if(!edad || !peso || !altura || !cuello || !cintura || !cadera) {
        mostrarAlertaNeon('Por favor, completa todos los campos obligatorios marcados con asterisco (*).', 'danger', '⚠️ Datos Incompletos');
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
            if(!err) {
                cargarHistorialProgreso(socioId);
                mostrarAlertaNeon('Progreso guardado correctamente.', 'info', '📈 Datos Clínicos');
            }
        });
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

function obtenerFechaLocal() {
    let d = new Date();
    d.setHours(d.getHours() - 5);
    return d.toISOString().replace('T', ' ').substring(0, 19);
}
 
window.editarSocio = (id) => {
    db.get(`SELECT * FROM socios WHERE id = ?`, [id], (err, socio) => {
        if (err) return console.error(err);
        if (socio) {
            document.getElementById('socio-id').value = socio.id;
            document.getElementById('socio-nombre').value = socio.nombre;
            document.getElementById('socio-telefono').value = socio.telefono;
            document.getElementById('socio-nacimiento').value = socio.fecha_nacimiento || '';

            const selectPlan = document.getElementById('socio-plan');
            for (let i = 0; i < selectPlan.options.length; i++) {
                if (selectPlan.options[i].text === socio.plan) {
                    selectPlan.selectedIndex = i;
                    break;
                }
            }
            
            document.getElementById('socio-vencimiento').value = socio.fecha_vencimiento;
            
            document.getElementById('socio-plan').disabled = true;
            document.getElementById('socio-metodo').disabled = true;
            document.getElementById('socio-vencimiento').disabled = false;

            document.getElementById('modal-titulo').textContent = 'Editar Socio';
            document.getElementById('modal-socio').style.display = 'flex';
        }
    });
};

window.exportarExcelSocios = () => {
    db.all(`SELECT * FROM socios ORDER BY id ASC`, [], (err, rows) => {
        if (err) return console.error(err);
        if (rows.length === 0) {
            mostrarAlertaNeon("No hay socios registrados para exportar.", "danger", "⚠️ Directorio Vacío");
            return;
        }

        let csvContent = "sep=;\n";
        csvContent += "ID;Nombre;Telefono;Fecha Nacimiento;Plan;Fecha Vencimiento\n";

        rows.forEach(s => {
            const nac = s.fecha_nacimiento ? s.fecha_nacimiento : '';
            csvContent += `${s.id};${s.nombre};${s.telefono};${nac};${s.plan};${s.fecha_vencimiento}\n`;
        });

        const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `Backup_Socios_SG_${obtenerFechaLocal().split(' ')[0]}.csv`);
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    });
};

async function procesarImportacionSociosCSV(csvText) {
    const lineas = csvText.split('\n');
    let insertados = 0;
    let omitidos = 0;

    for (let i = 0; i < lineas.length; i++) {
        const linea = lineas[i].trim();
        if (!linea || linea.includes('sep=;') || linea.includes('Nombre') || linea.includes('ID;')) continue;

        const cols = linea.split(';');
        if (cols.length >= 5) {
            const nombre = cols[1];
            const telefono = cols[2];
            const nacimiento = cols[3] || '';
            const plan = cols[4] || 'Mensualidad';
            const vencimiento = cols[5] || obtenerFechaLocal().split(' ')[0];

            const existe = await new Promise(resolve => {
                db.get(`SELECT id FROM socios WHERE nombre = ? AND telefono = ?`, [nombre, telefono], (err, row) => {
                    resolve(row ? true : false);
                });
            });

            if (!existe) {
                await new Promise(resolve => {
                    db.run(`INSERT INTO socios (nombre, telefono, fecha_nacimiento, plan, fecha_vencimiento) VALUES (?, ?, ?, ?, ?)`, 
                        [nombre, telefono, nacimiento, plan, vencimiento], () => resolve());
                });
                insertados++;
            } else {
                omitidos++;
            }
        }
    }

    mostrarAlertaNeon(`✅ Análisis Completado.\n\nNuevos socios restaurados: ${insertados}\nSocios omitidos (ya existían): ${omitidos}`, "info", "📥 Backup Restaurado");
    cargarSociosYCumpleanos();
}