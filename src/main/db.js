// Archivo: src/main/db.js
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Apuntamos a la raíz del proyecto para que tanto el Main como el Renderer puedan leerla sin colapsar.
const dbPath = path.join(__dirname, '../../salvador.db');

console.log("===========================================");
console.log("📁 DB UNIFICADA EN:", dbPath);
console.log("===========================================");

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) console.error("Error al abrir BD:", err);
});

db.serialize(() => {
    // CREACIÓN DE TABLAS PRINCIPALES
    db.run(`CREATE TABLE IF NOT EXISTS productos (id INTEGER PRIMARY KEY AUTOINCREMENT, nombre TEXT NOT NULL, precio REAL NOT NULL, stock INTEGER NOT NULL)`);
    db.run(`CREATE TABLE IF NOT EXISTS ventas (id INTEGER PRIMARY KEY AUTOINCREMENT, producto_nombre TEXT NOT NULL, precio_total REAL NOT NULL, metodo_pago TEXT NOT NULL, fecha DATETIME)`);
    db.run(`CREATE TABLE IF NOT EXISTS socios (id INTEGER PRIMARY KEY AUTOINCREMENT, nombre TEXT NOT NULL, telefono TEXT, fecha_nacimiento TEXT, plan TEXT, fecha_vencimiento TEXT)`);
    db.run(`CREATE TABLE IF NOT EXISTS progreso_socios (id INTEGER PRIMARY KEY AUTOINCREMENT, socio_id INTEGER, peso REAL, grasa REAL, medidas TEXT, fecha DATETIME DEFAULT (datetime('now', 'localtime')))`);
    db.run(`CREATE TABLE IF NOT EXISTS fiados (id INTEGER PRIMARY KEY AUTOINCREMENT, socio_id INTEGER, descripcion TEXT, monto REAL, fecha DATETIME, estado TEXT DEFAULT 'Pendiente')`);
    db.run(`CREATE TABLE IF NOT EXISTS plantillas_whatsapp (id INTEGER PRIMARY KEY AUTOINCREMENT, titulo TEXT NOT NULL, mensaje TEXT NOT NULL)`);
    db.run(`CREATE TABLE IF NOT EXISTS egresos (id INTEGER PRIMARY KEY AUTOINCREMENT, descripcion TEXT NOT NULL, monto REAL NOT NULL, fecha DATETIME)`);
    db.run(`CREATE TABLE IF NOT EXISTS configuracion (id INTEGER PRIMARY KEY AUTOINCREMENT, usuario TEXT NOT NULL, password TEXT NOT NULL)`);

    // TABLA MEMBRESÍAS (Con soporte para Borrado Lógico "activo")
    db.run(`CREATE TABLE IF NOT EXISTS membresias (
        id INTEGER PRIMARY KEY AUTOINCREMENT, 
        nombre TEXT NOT NULL, 
        precio REAL NOT NULL, 
        duracion_meses INTEGER NOT NULL,
        activo INTEGER DEFAULT 1
    )`, (err) => {
        if (!err) {
            // Intento seguro de añadir la columna por si el usuario ya tenía la tabla vieja creada
            db.run(`ALTER TABLE membresias ADD COLUMN activo INTEGER DEFAULT 1`, (alterErr) => {
                // Si da error, significa que la columna ya existe, lo cual es perfecto.
            });
        }
    });
});

module.exports = db;