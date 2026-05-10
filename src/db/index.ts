import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import * as schema from './schema';
import path from 'path';

// Ruta absoluta a la base de datos existente
const dbPath = path.resolve(process.cwd(), '../db/panel.db');
const sqlite = new Database(dbPath);
export const db = drizzle(sqlite, { schema });
