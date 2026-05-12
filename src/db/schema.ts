import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const productos = sqliteTable('productos', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  codigo_barras: text('codigo_barras'),
  tipo: text('tipo'),
  marca: text('marca'),
  descripcion: text('descripcion'),
  precio_costo: real('precio_costo'),
  precio_venta_minorista: real('precio_venta_minorista'),
  precio_venta_mayorista: real('precio_venta_mayorista'),
  stock: integer('stock'),
  activo: integer('activo').default(1),
  familia: text('familia'),
  rubro: text('rubro'),
});

export const clientes = sqliteTable('clientes', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  nombre: text('nombre').notNull(),
  telefono: text('telefono').notNull(),
  dni: text('dni').notNull(),
  barrio: text('barrio').notNull(),
  puntos: integer('puntos').default(0),
  observaciones: text('observaciones'),
  nivel: text('nivel').default('Bronce'),
  descuento_activo: integer('descuento_activo').default(0),
  limite_credito: real('limite_credito').default(10000),
  bloqueado_cc: integer('bloqueado_cc').default(0),
});

export const cuentas_corrientes = sqliteTable('cuentas_corrientes', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  cliente_id: integer('cliente_id').notNull(),
  saldo_actual: real('saldo_actual').default(0),
  fecha_ultimo_movimiento: text('fecha_ultimo_movimiento'),
});

export const ventas = sqliteTable('ventas', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  cliente_id: integer('cliente_id').notNull(),
  total: real('total').notNull(),
  fecha: text('fecha'),
  metodo_pago: text('metodo_pago'),
  descuento: real('descuento').default(0),
  pedido_id: integer('pedido_id'),
  tipo: text('tipo'),
  estado: text('estado').default('completado'), // completado, anulado
});

export const variantes_producto = sqliteTable('variantes_producto', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  producto_id: integer('producto_id').notNull(),
  nombre: text('nombre').notNull(), // ej: Azul, XL, 500ml
  precio_venta: real('precio_venta'), // Si es null, usa el del producto
  stock: integer('stock').default(0),
  codigo_barras: text('codigo_barras'),
});

export const detalle_venta = sqliteTable('detalle_venta', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  venta_id: integer('venta_id'),
  producto_id: integer('producto_id'),
  variante_id: integer('variante_id'),
  cantidad: integer('cantidad'),
  subtotal: real('subtotal'),
  nombre_producto: text('nombre_producto'),
  nombre_variante: text('nombre_variante'),
  precio_venta_historico: real('precio_venta_historico'),
  precio_costo_historico: real('precio_costo_historico'),
  tipo_linea: text('tipo_linea'),
});

export const gastos = sqliteTable('gastos', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  descripcion: text('descripcion').notNull(),
  monto: real('monto').notNull(),
  fecha: text('fecha'),
  categoria: integer('categoria').notNull().default(1),
  medio_pago: text('medio_pago'),
  excluir_distribucion: integer('excluir_distribucion').default(0),
});

export const gastos_fijos = sqliteTable('gastos_fijos', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  nombre: text('nombre').notNull(),
  monto_mensual: real('monto_mensual').notNull().default(0),
  fecha_desde: text('fecha_desde').notNull(),
  fecha_hasta: text('fecha_hasta'),
});

export const gastos_variables = sqliteTable('gastos_variables', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  nombre: text('nombre').notNull(),
  porcentaje_sobre_venta: real('porcentaje_sobre_venta').notNull().default(0),
});

export const reporte_financiero = sqliteTable('reporte_financiero', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  mes: text('mes').notNull(),
  anio: integer('anio').notNull(),
  total_gastos: real('total_gastos').notNull(),
  total_ingresos: real('total_ingresos').notNull(),
  rentabilidad: real('rentabilidad').notNull(),
  fecha_registro: text('fecha_registro'),
});

export const obligaciones_fijas = sqliteTable('obligaciones_fijas', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  nombre: text('nombre'),
  descripcion: text('descripcion'),
  monto_estimado: real('monto_estimado'),
  vencimiento_dia: integer('vencimiento_dia'),
  activa: integer('activa'),
  fecha_creacion: text('fecha_creacion'),
});

export const pagos_obligaciones = sqliteTable('pagos_obligaciones', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  obligacion_id: integer('obligacion_id'),
  fecha_pago: text('fecha_pago'),
  monto_pagado: real('monto_pagado'),
  periodo_financiero: text('periodo_financiero'),
  notas: text('notas'),
  fecha_registro: text('fecha_registro'),
});

export const pagos_tarjeta = sqliteTable('pagos_tarjeta', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  fecha: text('fecha'),
  monto: real('monto'),
  nota: text('nota'),
  periodo: text('periodo'),
});

export const movimientos_cuenta_corriente = sqliteTable('movimientos_cuenta_corriente', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  cliente_id: integer('cliente_id'),
  tipo_movimiento: text('tipo_movimiento'),
  monto: real('monto'),
  descripcion: text('descripcion'),
  fecha: text('fecha'),
  producto_id: integer('producto_id'),
  categoria_id: integer('categoria_id'),
  detalles: text('detalles'),
});

export const pedidos = sqliteTable('pedidos', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  codigo: text('codigo'),
  cliente_id: integer('cliente_id'),
  detalles: text('detalles'),
  total: real('total'),
  estado: text('estado'),
  fecha: text('fecha'),
  venta_generada: integer('venta_generada'),
  fecha_estimada_entrega: text('fecha_estimada_entrega'),
  fecha_estimada: text('fecha_estimada'),
  adelanto: real('adelanto'),
  saldo: real('saldo'),
  productos_json: text('productos_json'),
  notificar_whatsapp: integer('notificar_whatsapp').default(1),
});

export const mp_transactions = sqliteTable('mp_transactions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  mp_id: text('mp_id'),
  direction: text('direction'),
  type: text('type'),
  method: text('method'),
  status: text('status'),
  amount: real('amount'),
  currency: text('currency'),
  description: text('description'),
  occurred_at: text('occurred_at'),
  created_at: text('created_at'),
  updated_at: text('updated_at'),
  raw_json: text('raw_json'),
});

// Combos (múltiples productos con precio especial)
export const promociones_combo = sqliteTable('promociones_combo', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  nombre: text('nombre'),
  precio_combo: real('precio_combo').notNull(),
  activa: integer('activa').default(1),
  fecha_expiracion: text('fecha_expiracion'),
  creado_en: text('creado_en').default(sql`datetime('now','localtime')`),
});

export const promociones_combo_items = sqliteTable('promociones_combo_items', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  combo_id: integer('combo_id').notNull(),
  producto_id: integer('producto_id').notNull(),
  cantidad: integer('cantidad').notNull().default(1),
});

// Promociones por producto (tramos de cantidad)
export const promociones = sqliteTable('promociones', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  producto_id: integer('producto_id').notNull(),
  cantidad_minima: integer('cantidad_minima').notNull(),
  precio_promocional: real('precio_promocional').notNull(),
  activa: integer('activa').default(1),
  fecha_expiracion: text('fecha_expiracion'),
});

// Deudas (tarjeta de crédito, préstamos, etc.)
export const deudas = sqliteTable('deudas', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  nombre: text('nombre').notNull(),
  descripcion: text('descripcion'),
  monto_total: real('monto_total').notNull().default(0),
  activa: integer('activa').default(1),
  fecha_vencimiento: text('fecha_vencimiento'), // Nueva columna para control de vencimientos
  fecha_creacion: text('fecha_creacion').default(sql`datetime('now','localtime')`),
});

export const pagos_deuda = sqliteTable('pagos_deuda', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  deuda_id: integer('deuda_id').notNull(),
  monto: real('monto').notNull().default(0),
  fecha: text('fecha').default(sql`datetime('now','localtime')`),
  nota: text('nota'),
});

export const configuraciones = sqliteTable('configuraciones', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  clave: text('clave').notNull().unique(),
  valor: text('valor').notNull(),
  descripcion: text('descripcion'),
  categoria: text('categoria').default('general'),
  tipo: text('tipo').default('texto'), // texto, numero, booleano
  actualizado_en: text('actualizado_en').default(sql`datetime('now','localtime')`),
});
