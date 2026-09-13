---
title: "Dataset y Base de Datos — Agente de Educación Financiera"
subtitle: "Esquema, datos de demo e infraestructura"
---

# Dataset y Base de Datos

**Proyecto:** Agente de Educación Financiera — Banorte Challenge (HackMTY / Tec de Monterrey)

---

## 1. Infraestructura utilizada

- **Motor:** Azure Database for PostgreSQL (**Flexible Server**).
- **Acceso:** conexión SSL obligatoria (`ssl: { rejectUnauthorized: true }`),
  restringida por firewall a IPs autorizadas explícitamente (equipo de
  desarrollo + el servicio de Railway durante despliegue/demo).
- **Dos pools de conexión independientes**, uno por servicio, ambos
  apuntando a la misma base:
  - `backend/` — usado para login (lee `usuarios.password_hash`) y para
    servir el perfil vía REST.
  - `mcp/` — el único componente que ejecuta las consultas financieras
    reales (tools que usa el agente).
- **Variables de entorno** (mismas en ambos servicios): `DB_HOST`,
  `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `DB_PORT` — nunca se guardan
  credenciales en el repositorio.
- **Datos:** 100% sintéticos, generados por el equipo para la demo — no hay
  datos reales de clientes de Banorte ni de ninguna institución.

---

## 2. Esquema completo (estado actual)

Seis tablas. `usuarios` es la raíz; el resto cuelga de ella por
`usuario_id`. El dataset fue creciendo en dos etapas: el esquema original
(`usuarios`, `transacciones`, `resumen_mensual`, `recomendaciones_ia`) y una
ampliación posterior (`password_hash`/`saldo_actual` en `usuarios`, más las
tablas `deudas` e `inversiones`) para cubrir el modelo de datos completo que
necesita el agente (deuda con tasa de interés/CAT, inversión con
rendimiento/plazo/riesgo). Lo que sigue es el script consolidado para
recrear el estado **actual**, no el historial de cambios.

```sql
-- =========================================================
-- 1. Usuarios y perfiles
-- =========================================================
CREATE TABLE usuarios (
  id               SERIAL PRIMARY KEY,
  auth_uid         VARCHAR(128) UNIQUE NOT NULL,
  nombre           VARCHAR(100) NOT NULL,
  perfil           VARCHAR(50) CHECK (perfil IN ('Deudor', 'Inversor', 'Ahorrativo', 'Novato')) DEFAULT 'Novato',
  racha_inversion  INT DEFAULT 0,
  fecha_registro   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  password_hash    TEXT,                          -- hash bcrypt, autenticación
  saldo_actual     DECIMAL(12,2) DEFAULT 0.00      -- saldo real de la cuenta
);

-- =========================================================
-- 2. Movimientos (entradas y salidas)
-- =========================================================
CREATE TABLE transacciones (
  id            SERIAL PRIMARY KEY,
  usuario_id    INT REFERENCES usuarios(id) ON DELETE CASCADE,
  tipo          VARCHAR(20) CHECK (tipo IN ('ingreso', 'gasto', 'deuda', 'ahorro', 'inversion')) NOT NULL,
  monto         DECIMAL(12,2) NOT NULL,
  fecha         TIMESTAMP NOT NULL,
  categoria     VARCHAR(100),
  descripcion   TEXT
);

-- =========================================================
-- 3. Resumen mensual (para comparar periodos y calcular balance)
-- =========================================================
CREATE TABLE resumen_mensual (
  id                 SERIAL PRIMARY KEY,
  usuario_id         INT REFERENCES usuarios(id) ON DELETE CASCADE,
  mes                DATE NOT NULL,               -- primer día del mes, ej. '2026-09-01'
  total_ingresos     DECIMAL(12,2) DEFAULT 0.00,
  total_gastos       DECIMAL(12,2) DEFAULT 0.00,
  saldo_calculado    DECIMAL(12,2) DEFAULT 0.00,   -- ingresos - gastos
  total_deuda        DECIMAL(12,2) DEFAULT 0.00,
  total_ahorro       DECIMAL(12,2) DEFAULT 0.00,
  total_inversion    DECIMAL(12,2) DEFAULT 0.00,
  CONSTRAINT unique_usuario_mes UNIQUE (usuario_id, mes)
);

-- =========================================================
-- 4. Recomendaciones del agente (niveles fácil/medio/difícil)
-- =========================================================
CREATE TABLE recomendaciones_ia (
  id            SERIAL PRIMARY KEY,
  usuario_id    INT REFERENCES usuarios(id) ON DELETE CASCADE,
  tipo_plan     VARCHAR(20) CHECK (tipo_plan IN ('ahorro', 'inversion')) NOT NULL,
  nivel         VARCHAR(20) CHECK (nivel IN ('facil', 'medio', 'dificil')) NOT NULL,
  porcentaje    INT NOT NULL,
  activa        BOOLEAN DEFAULT TRUE
);

-- =========================================================
-- 5. Deudas (obligaciones financieras pendientes)
-- =========================================================
CREATE TABLE deudas (
  id                  SERIAL PRIMARY KEY,
  usuario_id          INT REFERENCES usuarios(id) ON DELETE CASCADE,
  nombre              VARCHAR(100) NOT NULL,
  tipo                VARCHAR(30) CHECK (tipo IN (
                         'tarjeta_credito','prestamo_personal','credito_automotriz',
                         'hipotecario','credito_nomina','linea_credito','financiamiento','otro'
                       )) NOT NULL,
  saldo_pendiente     DECIMAL(12,2) NOT NULL,
  monto_original      DECIMAL(12,2),
  pago_periodico      DECIMAL(12,2),
  periodicidad_pago   VARCHAR(20) CHECK (periodicidad_pago IN ('semanal','quincenal','mensual')),
  tasa_interes        DECIMAL(5,2),                -- % anual
  cat                 DECIMAL(5,2),                -- Costo Anual Total, % anual
  fecha_corte         DATE,
  fecha_limite        DATE,
  pagos_restantes     INT,
  cuenta_asociada     VARCHAR(100),
  estado              VARCHAR(20) CHECK (estado IN ('activa','pagada','vencida')) DEFAULT 'activa'
);

-- =========================================================
-- 6. Inversiones (instrumentos con objetivo de rendimiento)
-- =========================================================
CREATE TABLE inversiones (
  id                   SERIAL PRIMARY KEY,
  usuario_id           INT REFERENCES usuarios(id) ON DELETE CASCADE,
  tipo_inversion       VARCHAR(30) CHECK (tipo_inversion IN (
                          'renta_fija','fondos','acciones','etf','bonos','cetes','otro'
                        )) NOT NULL,
  nombre_instrumento   VARCHAR(100) NOT NULL,
  monto_invertido      DECIMAL(12,2) NOT NULL,
  valor_actual         DECIMAL(12,2) NOT NULL,
  rendimiento          DECIMAL(12,2),
  rendimiento_pct      DECIMAL(5,2),
  fecha_inicio         DATE,
  fecha_vencimiento    DATE,
  plazo                VARCHAR(50),
  nivel_riesgo         VARCHAR(20) CHECK (nivel_riesgo IN ('bajo','medio','alto')),
  liquidez             VARCHAR(20) CHECK (liquidez IN ('alta','media','baja'))
);
```

### Diagrama de relaciones

```
usuarios (1) ──< transacciones
usuarios (1) ──< resumen_mensual
usuarios (1) ──< recomendaciones_ia
usuarios (1) ──< deudas
usuarios (1) ──< inversiones
```

Todas las relaciones son `usuario_id → usuarios.id`, con `ON DELETE
CASCADE` — borrar un usuario limpia automáticamente todos sus movimientos,
resúmenes, recomendaciones, deudas e inversiones.

---

## 3. Datos de demo (seed)

Cuatro usuarios, uno por cada perfil que el agente debe reconocer y tratar
de forma distinta.

### 3.1 `usuarios`

```sql
INSERT INTO usuarios (id, auth_uid, nombre, perfil, racha_inversion) VALUES
  (1, 'uid_1', 'Luis',   'Novato',     0),
  (2, 'uid_2', 'Ana',    'Deudor',     0),
  (3, 'uid_3', 'Carlos', 'Inversor',   5),
  (4, 'uid_4', 'Marta',  'Ahorrativo', 0);
```

`password_hash` y `saldo_actual` se sembraron después (ver sección 4). La
contraseña de demo para los 4 usuarios es **`banorte2026`**; el hash se
genera con bcrypt (no es un valor literal reproducible, es un hash con
salt aleatorio):

```js
const hash = await bcrypt.hash('banorte2026', 10);
await pool.query('UPDATE usuarios SET password_hash = $1 WHERE id = $2', [hash, id]);
```

```sql
UPDATE usuarios SET saldo_actual = 0.00     WHERE id = 1; -- Luis
UPDATE usuarios SET saldo_actual = 1800.00  WHERE id = 2; -- Ana (desfase deliberado, ver 3.5)
UPDATE usuarios SET saldo_actual = 10000.00 WHERE id = 3; -- Carlos
UPDATE usuarios SET saldo_actual = 10000.00 WHERE id = 4; -- Marta
```

### 3.2 `transacciones`

```sql
INSERT INTO transacciones (usuario_id, tipo, monto, fecha, categoria, descripcion) VALUES
  (2, 'ingreso', 10000.00, '2026-09-01 10:00:00', 'Nomina',            'Pago quincenal'),
  (2, 'gasto',    8000.00, '2026-09-05 14:30:00', 'Estilo de vida',    'Salidas y compras'),
  (2, 'deuda',    1500.00, '2026-09-10 09:00:00', 'Tarjeta de Crédito','Pago mensualidad');
```

Solo Ana tiene movimientos individuales sembrados — es el caso usado para
probar el detalle de "ver mis transacciones"/"ver detalle del mes".

### 3.3 `resumen_mensual`

```sql
INSERT INTO resumen_mensual (usuario_id, mes, total_ingresos, total_gastos, saldo_calculado, total_deuda, total_ahorro, total_inversion) VALUES
  (1, '2026-09-01',     0.00,     0.00,     0.00,    0.00,    0.00,    0.00), -- Luis: sin actividad
  (2, '2026-09-01', 10000.00,  8000.00,  2000.00, 1500.00,    0.00,    0.00), -- Ana: deudora
  (3, '2026-09-01', 20000.00, 10000.00, 10000.00,    0.00, 8000.00, 2000.00), -- Carlos: inversor
  (4, '2026-09-01', 15000.00,  5000.00, 10000.00,  500.00, 9500.00,    0.00); -- Marta: ahorrativa
```

### 3.4 `recomendaciones_ia`

```sql
INSERT INTO recomendaciones_ia (usuario_id, tipo_plan, nivel, porcentaje) VALUES
  -- Luis (Novato): solo planes de ahorro
  (1, 'ahorro', 'facil', 10), (1, 'ahorro', 'medio', 15), (1, 'ahorro', 'dificil', 25),
  -- Ana (Deudor): ahorro, meta más conservadora
  (2, 'ahorro', 'facil', 5),  (2, 'ahorro', 'medio', 15), (2, 'ahorro', 'dificil', 25),
  -- Carlos (Inversor): planes de inversión más agresivos
  (3, 'inversion', 'facil', 15), (3, 'inversion', 'medio', 25), (3, 'inversion', 'dificil', 30),
  -- Marta (Ahorrativo): inversión nivel básico
  (4, 'inversion', 'facil', 10), (4, 'inversion', 'medio', 15), (4, 'inversion', 'dificil', 25);
```

### 3.5 `deudas`

```sql
INSERT INTO deudas (usuario_id, nombre, tipo, saldo_pendiente, monto_original, pago_periodico, periodicidad_pago, tasa_interes, cat, fecha_corte, fecha_limite, pagos_restantes, cuenta_asociada, estado) VALUES
  (2, 'Tarjeta Banorte Oro',       'tarjeta_credito', 14000.00, 18000.00, 1500.00, 'mensual', 45.00, 55.00, '2026-09-05', '2026-09-20', 10, 'Tarjeta Banorte Oro', 'activa'),
  (4, 'Línea de crédito Banorte',  'linea_credito',     500.00,   500.00,  500.00, 'mensual', 25.00, 30.00, NULL,         NULL,         NULL, NULL,                  'activa');
```

Ana (id=2) recibe además `saldo_actual = 1800.00` mientras su
`saldo_calculado` (resumen_mensual) es `2000.00` — un desfase deliberado de
**-$200** para poder demostrar en vivo el caso de "diferencia entre saldo
esperado y saldo actual sin causa identificable" (el agente debe reportarlo
sin inventar una explicación).

### 3.6 `inversiones`

```sql
INSERT INTO inversiones (usuario_id, tipo_inversion, nombre_instrumento, monto_invertido, valor_actual, rendimiento, rendimiento_pct, fecha_inicio, fecha_vencimiento, plazo, nivel_riesgo, liquidez) VALUES
  (3, 'cetes', 'CETES 28 días', 20000.00, 21500.00, 1500.00, 7.50, '2026-03-01', '2026-12-01', '9 meses', 'bajo', 'media');
```

### 3.7 Resumen por usuario

| Usuario | `perfil` | Deudas | Inversiones | `saldo_actual` vs. esperado |
|---|---|---|---|---|
| Luis (uid_1) | Novato | — | — | 0 / sin historial |
| Ana (uid_2) | Deudor | 1 (tarjeta, 45% anual) | — | $1,800 vs. $2,000 (desfase de prueba) |
| Carlos (uid_3) | Inversor | — | 1 (CETES, +7.5%) | $10,000 / coincide |
| Marta (uid_4) | Ahorrativo | 1 (línea de crédito, casi liquidada) | — | $10,000 / coincide |

---

## 4. Notas de procedencia

- El esquema original (tablas 1–4) y su seed inicial fueron generados por
  el equipo antes de este desarrollo.
- `password_hash`, `saldo_actual`, y las tablas `deudas`/`inversiones` se
  agregaron durante el desarrollo del agente, para poder representar el
  modelo de datos financieros completo (autenticación real, y deuda/
  inversión como objetos con estado propio en vez de solo movimientos
  puntuales en `transacciones`).
- `usuarios.nombre` se simplificó de `"Luis (Novato)"` a `"Luis"` — el
  perfil ya vive de forma estructurada en la columna `perfil`, tenerlo
  también en el nombre era redundante y menos práctico como usuario de
  login en una demo en vivo.
