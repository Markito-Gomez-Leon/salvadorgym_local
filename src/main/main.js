// Archivo: src/main/main.js
const { app, BrowserWindow } = require('electron');
const path = require('path');
const express = require('express');
const cors = require('cors');
const os = require('os');

// Conectar la base de datos al iniciar
const db = require('./db.js');

// ==========================================
// 1. CONFIGURACIÓN DE LA VENTANA DE ESCRITORIO
// ==========================================
function createWindow () {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    title: "Salvador Gym - Sistema POS",
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  mainWindow.loadFile(path.join(__dirname, '../renderer/views/login.html'));
  mainWindow.setMenuBarVisibility(false);
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// ==========================================
// 2. EL "PORTERO" WI-FI (SERVIDOR LOCAL PARA LA APP MÓVIL)
// ==========================================
const server = express();
server.use(cors()); 
server.use(express.json());

// A. Ruta de Prueba
server.get('/api/ping', (req, res) => res.json({ status: 'ok' }));

// B. Ruta de Catálogo
server.get('/api/productos', (req, res) => {
    db.all("SELECT * FROM productos WHERE stock > 0 ORDER BY nombre ASC", [], (err, filas) => {
        if (err) return res.status(500).json({ error: 'Error interno' });
        res.json(filas);
    });
});

// C. Ruta de Socios
server.get('/api/socios', (req, res) => {
    db.all("SELECT id, nombre FROM socios ORDER BY nombre ASC", [], (err, filas) => {
        if (err) return res.status(500).json({ error: 'Error interno' });
        res.json(filas);
    });
});

// D. Sincronización en Lote Exacta (Ventas y Fiados)
server.post('/api/ventas-batch', (req, res) => {
    const { ventas } = req.body;
    
    if (!ventas || ventas.length === 0) {
        return res.status(400).json({ error: 'El lote está vacío' });
    }

    db.serialize(() => {
        db.run("BEGIN TRANSACTION");
        
        const stmtVenta = db.prepare(`INSERT INTO ventas (producto_nombre, precio_total, metodo_pago, fecha) VALUES (?, ?, ?, ?)`);
        const stmtStock = db.prepare(`UPDATE productos SET stock = stock - 1 WHERE id = ?`);
        const stmtFiado = db.prepare(`INSERT INTO fiados (socio_id, descripcion, monto, fecha, estado) VALUES (?, ?, ?, ?, 'Pendiente')`);

        ventas.forEach(venta => {
            const { fechaHora, metodoPago, items, socioId } = venta;
            
            items.forEach(item => {
                stmtStock.run([item.id]);
                stmtVenta.run([item.nombre, item.precio, metodoPago, fechaHora]);
                
                if (metodoPago === 'Fiado' && socioId) {
                    stmtFiado.run([socioId, item.nombre, item.precio, fechaHora]);
                }
            });
        });

        stmtVenta.finalize();
        stmtStock.finalize();
        stmtFiado.finalize();

        db.run("COMMIT", (err) => {
            if (err) return res.status(500).json({ error: 'Error BD' });
            res.json({ status: 'success', mensaje: 'Sincronización perfecta' });
        });
    });
});

// Arrancar el portero en el puerto 3000
const PORT = 3000;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`\n========================================`);
    console.log(`🔌 Servidor móvil activado en el puerto ${PORT}`);
    
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            if (iface.family === 'IPv4' && !iface.internal) {
                console.log(`📲 IP PARA LA APP MÓVIL: http://${iface.address}:${PORT}`);
            }
        }
    }
    console.log(`========================================\n`);
});