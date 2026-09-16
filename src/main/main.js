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
server.use(cors()); // Permite que el celular hable con la laptop
server.use(express.json());

// A. Ruta de Prueba: Para saber si el celular "ve" a la laptop
server.get('/api/ping', (req, res) => {
    res.json({ status: 'ok', mensaje: '¡Conectado al Cerebro del Salvador Gym!' });
});

// B. Ruta de Caja Rápida: Recibe el carrito desde el celular y lo guarda en SQLite
server.post('/api/venta', (req, res) => {
    const { carrito, metodoPago } = req.body;
    
    if (!carrito || carrito.length === 0) {
        return res.status(400).json({ error: 'El carrito está vacío' });
    }

    // Calcular hora exacta peruana
    let d = new Date();
    d.setHours(d.getHours() - 5);
    const fechaHoraFija = d.toISOString().replace('T', ' ').substring(0, 19);

    db.serialize(() => {
        db.run("BEGIN TRANSACTION");
        
        const stmtVenta = db.prepare(`INSERT INTO ventas (producto_nombre, precio_total, metodo_pago, fecha) VALUES (?, ?, ?, ?)`);
        const stmtStock = db.prepare(`UPDATE productos SET stock = stock - 1 WHERE id = ?`);

        carrito.forEach(item => {
            stmtStock.run([item.id]);
            stmtVenta.run([item.nombre, item.precio, metodoPago, fechaHoraFija]);
        });

        stmtVenta.finalize();
        stmtStock.finalize();

        db.run("COMMIT", (err) => {
            if (err) {
                console.error("Error guardando venta móvil:", err);
                return res.status(500).json({ error: 'Error interno en la BD' });
            }
            res.json({ status: 'success', mensaje: 'Venta registrada y stock descontado' });
        });
    });
});

// Arrancar el portero en el puerto 3000
const PORT = 3000;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`\n========================================`);
    console.log(`🔌 Servidor móvil activado en el puerto ${PORT}`);
    
    // Escáner inteligente: Busca tu IP Local para mostrártela en consola
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