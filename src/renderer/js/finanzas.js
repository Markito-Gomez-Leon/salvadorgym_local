// Archivo: src/renderer/js/finanzas.js
const db = require('../../main/db.js');

document.addEventListener('DOMContentLoaded', () => {
    cargarFinanzasHoy();
});

let transaccionesHoy = [];
let sumaEfectivo = 0;
let sumaYape = 0;
let sumaFiados = 0;
let sumaIngresosReales = 0; // Efectivo + Yape

function cargarFinanzasHoy() {
    const tbody = document.getElementById('tabla-ventas-hoy');
    tbody.innerHTML = '';
    
    // Reiniciar contadores
    sumaEfectivo = 0;
    sumaYape = 0;
    sumaFiados = 0;
    sumaIngresosReales = 0;
    transaccionesHoy = [];

    const hoyStr = obtenerFechaLocal().split(' ')[0]; // Solo Año-Mes-Día

    db.all(`SELECT * FROM ventas WHERE fecha LIKE ? ORDER BY id DESC`, [`${hoyStr}%`], (err, rows) => {
        if (err) return console.error(err);

        rows.forEach(venta => {
            transaccionesHoy.push(venta);
            const tr = document.createElement('tr');
            let metodoStyle = '';
            
            // LÓGICA DE CLASIFICACIÓN CONTABLE
            if (venta.metodo_pago === 'Fiado') {
                sumaFiados += venta.precio_total;
                tr.classList.add('row-fiado');
                metodoStyle = 'color: #FF0055; font-weight: bold;';
            } else if (venta.metodo_pago === 'Yape') {
                sumaYape += venta.precio_total;
                sumaIngresosReales += venta.precio_total;
                metodoStyle = 'color: #00E5FF; font-weight: bold;';
            } else {
                // Por descarte es Efectivo
                sumaEfectivo += venta.precio_total;
                sumaIngresosReales += venta.precio_total;
                metodoStyle = 'color: #25D366; font-weight: bold;';
            }

            tr.innerHTML = `
                <td>${venta.fecha.split(' ')[1]}</td>
                <td><strong>${venta.producto_nombre}</strong></td>
                <td>S/ ${venta.precio_total.toFixed(2)}</td>
                <td style="${metodoStyle}">${venta.metodo_pago}</td>
            `;
            tbody.appendChild(tr);
        });

        // Actualizar UI de Tarjetas
        document.getElementById('total-efectivo').textContent = `S/ ${sumaEfectivo.toFixed(2)}`;
        document.getElementById('total-yape').textContent = `S/ ${sumaYape.toFixed(2)}`;
        document.getElementById('total-ingresos-hoy').textContent = `S/ ${sumaIngresosReales.toFixed(2)}`;
        document.getElementById('total-fiados-hoy').textContent = `S/ ${sumaFiados.toFixed(2)}`;
    });
}

// CREADOR DE REPORTE EXCEL (HOY) CON DESGLOSE DETALLADO
window.exportarExcelHoy = () => {
    if (transaccionesHoy.length === 0) {
        alert("No hay transacciones registradas hoy para exportar.");
        return;
    }

    let csvContent = "sep=;\n";
    csvContent += "Hora;Producto / Servicio;Monto Cobrado;Metodo de Pago\n";

    transaccionesHoy.forEach(v => {
        const hora = v.fecha.split(' ')[1];
        csvContent += `${hora};${v.producto_nombre};${v.precio_total.toFixed(2)};${v.metodo_pago}\n`;
    });

    // Filas automáticas de resumen ordenadas de forma contable
    csvContent += `\n\n=== RESUMEN DEL DIA (CIERRE DE CAJA) ===;\n`;
    csvContent += `A. Total en Caja Efectivo;S/ ${sumaEfectivo.toFixed(2)}\n`;
    csvContent += `B. Total en Cuenta Yape;S/ ${sumaYape.toFixed(2)}\n`;
    csvContent += `C. TOTAL INGRESOS REALES (A + B);S/ ${sumaIngresosReales.toFixed(2)}\n`;
    csvContent += `D. Total Fiados Entregados (No cobrados);S/ ${sumaFiados.toFixed(2)}\n`;

    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Finanzas_Hoy_${obtenerFechaLocal().split(' ')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

function obtenerFechaLocal() {
    let d = new Date();
    d.setHours(d.getHours() - 5);
    return d.toISOString().replace('T', ' ').substring(0, 19);
}