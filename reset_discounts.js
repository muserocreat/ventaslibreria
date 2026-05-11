const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'db', 'panel.db');
const db = new Database(dbPath);

try {
    const result = db.prepare('UPDATE clientes SET descuento_activo = 0').run();
    console.log(`Éxito: Se ha desactivado el descuento para ${result.changes} clientes.`);
} catch (error) {
    console.error('Error al actualizar clientes:', error.message);
} finally {
    db.close();
}
