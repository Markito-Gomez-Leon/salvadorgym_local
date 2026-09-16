// Archivo: src/renderer/js/caja_global.js
const db = require('../../main/db.js');

let registrosGlobales = [];
let ingresosBrutos = 0;
let gastosTotales = 0;
let gananciaNeta = 0;

document.addEventListener('DOMContentLoaded', () => {
    const hoy = new Date();
    const primerDia = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    
    document.getElementById('filtro-desde').value = primerDia.toISOString().split('T')[0];
    document.getElementById('filtro-hasta').value = hoy.toISOString().split('T')[0];

    cargarCajaGlobal();

    document.getElementById('btn-nuevo-gasto').addEventListener('click', () => {
        document.getElementById('form-gasto').reset();
        document.getElementById('modal-gasto').style.display = 'flex';
    });

    document.getElementById('form-gasto').addEventListener('submit', (e) => {
        e.preventDefault();
        const desc = document.getElementById('gasto-desc').value;
        const monto = parseFloat(document.getElementById('gasto-monto').value);
        const fecha = obtenerFechaLocal();

        db.run(`INSERT INTO egresos (descripcion, monto, fecha) VALUES (?, ?, ?)`, [desc, monto, fecha], (err) => {
            if(err) console.error(err);
            document.getElementById('modal-gasto').style.display = 'none';
            cargarCajaGlobal();
            mostrarAlertaNeon("El egreso ha sido registrado correctamente en la contabilidad.", "info", "✅ Gasto Guardado");
        });
    });

    document.getElementById('input-importar-excel').addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const csvText = event.target.result;
            procesarImportacionCSV(csvText);
            e.target.value = ''; 
        };
        reader.readAsText(file);
    });
});

window.filtrarCajaGlobal = () => cargarCajaGlobal();

function cargarCajaGlobal() {
    const tbody = document.getElementById('tabla-caja-global');
    tbody.innerHTML = '';
    registrosGlobales = [];
    ingresosBrutos = 0;
    gastosTotales = 0;
    gananciaNeta = 0;

    let desde = document.getElementById('filtro-desde').value;
    let hasta = document.getElementById('filtro-hasta').value;
    if(!desde || !hasta) return;
    
    hasta = hasta + " 23:59:59"; 

    Promise.all([
        new Promise(resolve => db.all(`SELECT * FROM ventas WHERE fecha >= ? AND fecha <= ?`, [desde, hasta], (err, rows) => resolve(rows || []))),
        new Promise(resolve => db.all(`SELECT * FROM egresos WHERE fecha >= ? AND fecha <= ?`, [desde, hasta], (err, rows) => resolve(rows || [])))
    ]).then(([ventas, egresos]) => {
        
        ventas.forEach(v => {
            registrosGlobales.push({ fecha: v.fecha, concepto: v.producto_nombre, tipo: 'Ingreso', monto: v.precio_total, metodo: v.metodo_pago });
        });

        egresos.forEach(e => {
            registrosGlobales.push({ fecha: e.fecha, concepto: e.descripcion, tipo: 'Egreso', monto: e.monto, metodo: 'Efectivo/Banco' });
        });

        registrosGlobales.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

        registrosGlobales.forEach(r => {
            const tr = document.createElement('tr');
            let tipoStyle = '';
            let metodoStyle = '';

            if (r.tipo === 'Ingreso') {
                tipoStyle = 'color: #25D366; font-weight: bold;';
                
                if (r.metodo === 'Fiado') {
                    tr.classList.add('row-fiado');
                    metodoStyle = 'color: #FF0055; font-weight: bold;';
                } else {
                    ingresosBrutos += r.monto;
                    metodoStyle = 'color: #00E5FF;';
                }
            } else {
                tipoStyle = 'color: #ff4444; font-weight: bold;';
                gastosTotales += r.monto;
            }

            tr.innerHTML = `
                <td>${r.fecha}</td>
                <td><strong>${r.concepto}</strong></td>
                <td style="${tipoStyle}">${r.tipo}</td>
                <td>S/ ${r.monto.toFixed(2)}</td>
                <td style="${metodoStyle}">${r.metodo}</td>
            `;
            tbody.appendChild(tr);
        });

        gananciaNeta = ingresosBrutos - gastosTotales;

        document.getElementById('total-ingresos').textContent = `S/ ${ingresosBrutos.toFixed(2)}`;
        document.getElementById('total-egresos').textContent = `S/ ${gastosTotales.toFixed(2)}`;
        document.getElementById('total-neto').textContent = `S/ ${gananciaNeta.toFixed(2)}`;
    });
}

async function procesarImportacionCSV(csvText) {
    const lineas = csvText.split('\n');
    let insertados = 0;
    let omitidos = 0;

    for (let i = 0; i < lineas.length; i++) {
        const linea = lineas[i].trim();
        
        if (!linea || linea.includes('sep=;') || linea.includes('Fecha y Hora') || linea.includes('=== RESUMEN')) {
            if(linea.includes('=== RESUMEN')) break; 
            continue;
        }

        const cols = linea.split(';');
        if (cols.length >= 5) {
            const fecha = cols[0];
            const concepto = cols[1];
            const tipo = cols[2];
            const monto = parseFloat(cols[3]);
            const metodo = cols[4];

            if (tipo === 'Ingreso') {
                const existe = await new Promise(resolve => {
                    db.get(`SELECT id FROM ventas WHERE fecha = ? AND producto_nombre = ? AND precio_total = ?`, [fecha, concepto, monto], (err, row) => {
                        resolve(row ? true : false);
                    });
                });
                
                if (!existe) {
                    await new Promise(resolve => {
                        db.run(`INSERT INTO ventas (producto_nombre, precio_total, metodo_pago, fecha) VALUES (?, ?, ?, ?)`, [concepto, monto, metodo, fecha], () => resolve());
                    });
                    insertados++;
                } else {
                    omitidos++;
                }
            } else if (tipo === 'Egreso') {
                const existe = await new Promise(resolve => {
                    db.get(`SELECT id FROM egresos WHERE fecha = ? AND descripcion = ? AND monto = ?`, [fecha, concepto, monto], (err, row) => {
                        resolve(row ? true : false);
                    });
                });
                
                if (!existe) {
                    await new Promise(resolve => {
                        db.run(`INSERT INTO egresos (descripcion, monto, fecha) VALUES (?, ?, ?)`, [concepto, monto, fecha], () => resolve());
                    });
                    insertados++;
                } else {
                    omitidos++;
                }
            }
        }
    }

    mostrarAlertaNeon(`Análisis Completado.\n\nNuevos registros: ${insertados}\nOmitidos (ya existían): ${omitidos}\n\nCaja Global actualizada.`, 'info', '📥 Importación Finalizada');
    cargarCajaGlobal();
}

window.exportarExcelGlobal = () => {
    if (registrosGlobales.length === 0) {
        mostrarAlertaNeon("No hay registros en este rango de fechas para exportar.", "danger", "⚠️ Sin Datos");
        return;
    }

    let csvContent = "sep=;\n";
    csvContent += "Fecha y Hora;Concepto;Tipo de Movimiento;Monto;Metodo o Estado\n";

    registrosGlobales.forEach(r => {
        csvContent += `${r.fecha};${r.concepto};${r.tipo};${r.monto.toFixed(2)};${r.metodo}\n`;
    });

    csvContent += `\n\n=== RESUMEN FINANCIERO CONSOLIDADO ===;\n`;
    csvContent += `1. Ingresos Brutos Totales (Reales Cobrados);S/ ${ingresosBrutos.toFixed(2)}\n`;
    csvContent += `2. Egresos / Gastos Totales;S/ ${gastosTotales.toFixed(2)}\n`;
    csvContent += `3. GANANCIA NETA FINAL;S/ ${gananciaNeta.toFixed(2)}\n`;

    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    let desde = document.getElementById('filtro-desde').value;
    let hasta = document.getElementById('filtro-hasta').value;
    link.setAttribute("download", `Caja_Global_${desde}_al_${hasta}.csv`);
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

function obtenerFechaLocal() {
    let d = new Date();
    d.setHours(d.getHours() - 5);
    return d.toISOString().replace('T', ' ').substring(0, 19);
}