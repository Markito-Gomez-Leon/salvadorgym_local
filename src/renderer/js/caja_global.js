// Archivo: src/renderer/js/caja_global.js
const db = require('../../main/db.js');

let registrosGlobales = [];
let ingresosBrutos = 0;
let gastosTotales = 0;
let gananciaNeta = 0;

document.addEventListener('DOMContentLoaded', () => {
    // Rango automático: 1er día del mes actual hasta hoy
    const hoy = new Date();
    const primerDia = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    
    document.getElementById('filtro-desde').value = primerDia.toISOString().split('T')[0];
    document.getElementById('filtro-hasta').value = hoy.toISOString().split('T')[0];

    cargarCajaGlobal();

    // Eventos de Gasto
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
        });
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
    
    // Le decimos que cubra hasta las 23:59 de ese día para no omitir la última venta
    hasta = hasta + " 23:59:59"; 

    // Consultamos ventas y egresos paralelamente y los unificamos
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

        // Ordenar cronológicamente (lo más nuevo arriba)
        registrosGlobales.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

        registrosGlobales.forEach(r => {
            const tr = document.createElement('tr');
            let tipoStyle = '';
            let metodoStyle = '';

            if (r.tipo === 'Ingreso') {
                tipoStyle = 'color: #25D366; font-weight: bold;';
                
                // ERROR GRAVE SOLUCIONADO: Los fiados no se suman a los ingresos brutos
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

        // Fórmula matemática de ganancia
        gananciaNeta = ingresosBrutos - gastosTotales;

        document.getElementById('total-ingresos').textContent = `S/ ${ingresosBrutos.toFixed(2)}`;
        document.getElementById('total-egresos').textContent = `S/ ${gastosTotales.toFixed(2)}`;
        document.getElementById('total-neto').textContent = `S/ ${gananciaNeta.toFixed(2)}`;
    });
}

// CREADOR DE REPORTE EXCEL (GLOBAL)
window.exportarExcelGlobal = () => {
    if (registrosGlobales.length === 0) {
        alert("No hay registros en este rango de fechas para exportar.");
        return;
    }

    let csvContent = "sep=;\n";
    csvContent += "Fecha y Hora;Concepto;Tipo de Movimiento;Monto;Metodo o Estado\n";

    registrosGlobales.forEach(r => {
        csvContent += `${r.fecha};${r.concepto};${r.tipo};${r.monto.toFixed(2)};${r.metodo}\n`;
    });

    // 3 FILAS DE RESUMEN AL FINAL DEL EXCEL
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