// Archivo: src/renderer/js/finanzas.js
const db = require('../../main/db.js');

document.addEventListener('DOMContentLoaded', () => {
    cargarFinanzasHoy();
});

let transaccionesHoy = [];
let sumaEfectivo = 0;
let sumaYape = 0;
let sumaFiados = 0;
let sumaIngresosReales = 0;

function cargarFinanzasHoy() {
    const tbody = document.getElementById('tabla-ventas-hoy');
    tbody.innerHTML = '';
    
    sumaEfectivo = 0;
    sumaYape = 0;
    sumaFiados = 0;
    sumaIngresosReales = 0;
    transaccionesHoy = [];

    const hoyStr = obtenerFechaLocal().split(' ')[0];

    db.all(`SELECT * FROM ventas WHERE fecha LIKE ? ORDER BY id DESC`, [`${hoyStr}%`], (err, rows) => {
        if (err) return console.error(err);

        rows.forEach(venta => {
            transaccionesHoy.push(venta);
            const tr = document.createElement('tr');
            let metodoStyle = '';
            
            if (venta.metodo_pago === 'Fiado') {
                sumaFiados += venta.precio_total;
                tr.classList.add('row-fiado');
                metodoStyle = 'color: #FF0055; font-weight: bold;';
            } else if (venta.metodo_pago === 'Yape') {
                sumaYape += venta.precio_total;
                sumaIngresosReales += venta.precio_total;
                metodoStyle = 'color: #00E5FF; font-weight: bold;';
            } else {
                sumaEfectivo += venta.precio_total;
                sumaIngresosReales += venta.precio_total;
                metodoStyle = 'color: #25D366; font-weight: bold;';
            }

            // ATENCIÓN: Mejoramos el diseño usando la clase 'btn-delete' (borde neón y efecto hover) y un ícono más claro.
            tr.innerHTML = `
                <td>${venta.fecha.split(' ')[1]}</td>
                <td><strong>${venta.producto_nombre}</strong></td>
                <td>S/ ${venta.precio_total.toFixed(2)}</td>
                <td style="${metodoStyle}">${venta.metodo_pago}</td>
                <td>
                    <button class="action-btn btn-delete" style="padding: 6px 12px; border-radius: 6px; font-size: 13px;" 
                    onclick="anularVenta(${venta.id}, '${venta.producto_nombre.replace(/'/g, "\\'")}', '${venta.metodo_pago}', '${venta.fecha}', ${venta.precio_total})">🗑️ Anular</button>
                </td>
            `;
            tbody.appendChild(tr);
        });

        document.getElementById('total-efectivo').textContent = `S/ ${sumaEfectivo.toFixed(2)}`;
        document.getElementById('total-yape').textContent = `S/ ${sumaYape.toFixed(2)}`;
        document.getElementById('total-ingresos-hoy').textContent = `S/ ${sumaIngresosReales.toFixed(2)}`;
        document.getElementById('total-fiados-hoy').textContent = `S/ ${sumaFiados.toFixed(2)}`;
    });
}

// ANULACIÓN CON TUS NUEVAS ALERTAS NEÓN
window.anularVenta = (idVenta, productoNombre, metodoPago, fechaVenta, montoVenta) => {
    mostrarConfirmacionNeon(
        `¿Estás seguro de que deseas ANULAR el registro de:\n"${productoNombre}"?\n\nEsta acción recalculará tu caja de hoy.`,
        () => {
            db.run(`DELETE FROM ventas WHERE id = ?`, [idVenta], (err) => {
                if (err) {
                    console.error("Error al anular la venta:", err);
                    mostrarAlertaNeon("Hubo un error al intentar anular desde la base de datos.", "danger", "⚠️ Error Crítico");
                    return;
                }

                // ELIMINACIÓN INDIVIDUAL DE DEUDA: Borra usando Fecha + Nombre + Monto
                if (metodoPago === 'Fiado') {
                    db.run(`DELETE FROM fiados WHERE fecha = ? AND descripcion = ? AND monto = ?`, [fechaVenta, productoNombre, montoVenta]);
                }

                // Devolver Stock si es físico
                if (!productoNombre.includes('Mensualidad') && !productoNombre.includes('Renovación') && !productoNombre.includes('Pago de')) {
                    db.run(`UPDATE productos SET stock = stock + 1 WHERE nombre = ?`, [productoNombre]);
                }

                mostrarAlertaNeon("Registro anulado y contabilidad corregida exitosamente.", "info", "✅ Anulación Completada");
                cargarFinanzasHoy();
            });
        },
        "🗑️ Confirmar Anulación"
    );
};

// EXPORTACIÓN CON ALERTA NEÓN
window.exportarExcelHoy = () => {
    if (transaccionesHoy.length === 0) {
        mostrarAlertaNeon("No hay transacciones registradas hoy para exportar.", "danger", "⚠️ Sin datos");
        return;
    }

    let csvContent = "sep=;\n";
    csvContent += "Hora;Producto / Servicio;Monto Cobrado;Metodo de Pago\n";

    transaccionesHoy.forEach(v => {
        const hora = v.fecha.split(' ')[1];
        csvContent += `${hora};${v.producto_nombre};${v.precio_total.toFixed(2)};${v.metodo_pago}\n`;
    });

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