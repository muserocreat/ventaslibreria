const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'db', 'panel.db');
const db = new Database(dbPath);

try {
    db.prepare('ALTER TABLE pedidos ADD COLUMN notificar_whatsapp INTEGER DEFAULT 1').run();
    console.log('Columna notificar_whatsapp añadida con éxito.');
} catch (error) {
    if (error.message.includes('duplicate column name')) {
        console.log('La columna ya existe.');
    } else {
        console.error('Error al migrar:', error.message);
    }
} finally {
    db.close();
}
