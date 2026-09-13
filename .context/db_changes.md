# Cambios en la base de datos (Azure PostgreSQL)

Registro de las queries originales con las que se generó la base de datos,
y de las modificaciones aplicadas en esta sesión sobre esa misma base ya
hospedada en Azure. Complementa `.ai/db_context.md` (que quedó desactualizado
tras estos cambios) y `.context/context.md` (razonamiento general de la
sesión).

---

## 1. Queries originales (antes de esta sesión)

Esto es lo que existía en la base de datos **antes** de tocar nada — el
schema y los datos de ejemplo generados por el equipo, sin columna de
password y con el perfil incluido como sufijo dentro de `nombre`.

```sql
-- 1. Tabla de Usuarios y Perfiles IA
-- Incluye la "racha de inversión" como incentivo psicológico y el perfil dinámico.
CREATE TABLE usuarios (
                          id SERIAL PRIMARY KEY,
                          auth_uid VARCHAR(128) UNIQUE NOT NULL,
                          nombre VARCHAR(100) NOT NULL,
                          perfil VARCHAR(50) CHECK (perfil IN ('Deudor', 'Inversor', 'Ahorrativo', 'Novato')) DEFAULT 'Novato',
                          racha_inversion INT DEFAULT 0,
                          fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Registro de Entradas y Salidas
-- El agente usará el campo "categoria" para clasificar automáticamente sin intervención del usuario.
CREATE TABLE transacciones (
                               id SERIAL PRIMARY KEY,
                               usuario_id INT REFERENCES usuarios(id) ON DELETE CASCADE,
                               tipo VARCHAR(20) CHECK (tipo IN ('ingreso', 'gasto', 'deuda', 'ahorro', 'inversion')) NOT NULL,
                               monto DECIMAL(12,2) NOT NULL,
                               fecha TIMESTAMP NOT NULL,
                               categoria VARCHAR(100),
                               descripcion TEXT
);

-- 3. Resumen Mensual (Control de Gastos y Saldo Actual)
-- Permite comparar meses anteriores rápidamente y saber "¿Cuánto saldo debería tener?".
CREATE TABLE resumen_mensual (
                                 id SERIAL PRIMARY KEY,
                                 usuario_id INT REFERENCES usuarios(id) ON DELETE CASCADE,
                                 mes DATE NOT NULL, -- Primer día de cada mes (ej. '2026-09-01')
                                 total_ingresos DECIMAL(12,2) DEFAULT 0.00,
                                 total_gastos DECIMAL(12,2) DEFAULT 0.00,
                                 saldo_calculado DECIMAL(12,2) DEFAULT 0.00, -- Diferencia de salidas con entradas
                                 total_deuda DECIMAL(12,2) DEFAULT 0.00,
                                 total_ahorro DECIMAL(12,2) DEFAULT 0.00,
                                 total_inversion DECIMAL(12,2) DEFAULT 0.00,
                                 CONSTRAINT unique_usuario_mes UNIQUE (usuario_id, mes)
);

-- 4. Recomendaciones Dinámicas del Agente
-- Almacena las opciones (Easy, Medium, Hardcore) basadas en el perfil.
CREATE TABLE recomendaciones_ia (
                                    id SERIAL PRIMARY KEY,
                                    usuario_id INT REFERENCES usuarios(id) ON DELETE CASCADE,
                                    tipo_plan VARCHAR(20) CHECK (tipo_plan IN ('ahorro', 'inversion')) NOT NULL,
                                    nivel VARCHAR(20) CHECK (nivel IN ('facil', 'medio', 'dificil')) NOT NULL,
                                    porcentaje INT NOT NULL,
                                    activa BOOLEAN DEFAULT TRUE
);



-- Insertar los 4 perfiles definidos
INSERT INTO usuarios (id, auth_uid, nombre, perfil, racha_inversion) VALUES
                                                                         (1, 'uid_1', 'Luis (Novato)', 'Novato', 0),
                                                                         (2, 'uid_2', 'Ana (Deudor)', 'Deudor', 0),
                                                                         (3, 'uid_3', 'Carlos (Inversor)', 'Inversor', 5),
                                                                         (4, 'uid_4', 'Marta (Ahorrativo)', 'Ahorrativo', 0);

-- Datos crudos de ejemplo (Entradas y Salidas con fechas específicas)
INSERT INTO transacciones (usuario_id, tipo, monto, fecha, categoria, descripcion) VALUES
                                                                                       (2, 'ingreso', 10000.00, '2026-09-01 10:00:00', 'Nomina', 'Pago quincenal'),
                                                                                       (2, 'gasto', 8000.00, '2026-09-05 14:30:00', 'Estilo de vida', 'Salidas y compras'),
                                                                                       (2, 'deuda', 1500.00, '2026-09-10 09:00:00', 'Tarjeta de Crédito', 'Pago mensualidad');

-- Resumen mensual generado por el agente para comparar
-- El Deudor (ID 2): Deuda (1500) es > 10% de ingresos (10000)
-- El Inversor (ID 3): Ahorro y entradas balanceadas, 10% en inversiones.
INSERT INTO resumen_mensual (usuario_id, mes, total_ingresos, total_gastos, saldo_calculado, total_deuda, total_ahorro, total_inversion) VALUES
                                                                                                                                             (1, '2026-09-01', 0.00, 0.00, 0.00, 0.00, 0.00, 0.00), -- Novato: Sin histórico
                                                                                                                                             (2, '2026-09-01', 10000.00, 8000.00, 2000.00, 1500.00, 0.00, 0.00), -- Deudor
                                                                                                                                             (3, '2026-09-01', 20000.00, 10000.00, 10000.00, 0.00, 8000.00, 2000.00), -- Inversor
                                                                                                                                             (4, '2026-09-01', 15000.00, 5000.00, 10000.00, 500.00, 9500.00, 0.00); -- Ahorrativo

-- Planes inyectados por la IA según el perfil detectado
INSERT INTO recomendaciones_ia (usuario_id, tipo_plan, nivel, porcentaje) VALUES
-- Novato: Proponer planes de ahorro (10%, 15%, 25%), nada de inversión
(1, 'ahorro', 'facil', 10),
(1, 'ahorro', 'medio', 15),
(1, 'ahorro', 'dificil', 25),

-- Deudor: Recomendar ahorro (5%, 15%, 25%), no recomendar inversión
(2, 'ahorro', 'facil', 5),
(2, 'ahorro', 'medio', 15),
(2, 'ahorro', 'dificil', 25),

-- Inversor: Aumentar inversión y ahorro (15%, 25%, 30%)
(3, 'inversion', 'facil', 15),
(3, 'inversion', 'medio', 25),
(3, 'inversion', 'dificil', 30),

-- Ahorrativo: Recomendar inversiones nivel básico (10%, 15%, 25%), no recomendar ahorro
(4, 'inversion', 'facil', 10),
(4, 'inversion', 'medio', 15),
(4, 'inversion', 'dificil', 25);
```

---

## 2. Modificaciones aplicadas en esta sesión

Todas ejecutadas contra la base ya hospedada en Azure (no contra un script
de creación nuevo). Ambas fueron confirmadas explícitamente por el dueño
del proyecto antes de ejecutarse, por tratarse de escrituras sobre datos
reales compartidos.

### 2.1 Agregar columna de contraseña

El schema original no tenía forma de autenticar con contraseña — el login
documentado en `.ai/contexto-proyecto-banorte-hackathon.md` (bcrypt + JWT)
no podía funcionar tal cual contra este schema. Se agregó la columna y se
sembró un hash por usuario:

```sql
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS password_hash TEXT;

-- Seed: un password_hash (bcrypt, cost 10) por usuario,
-- generado en Node con bcrypt.hash('banorte2026', 10) y actualizado
-- individualmente por id:
UPDATE usuarios SET password_hash = $HASH WHERE id = $ID;
-- (mismo password para los 4 usuarios demo: banorte2026)
```

### 2.2 Simplificar `nombre` (quitar el perfil del nombre)

El sufijo `(Novato)` / `(Deudor)` / `(Inversor)` / `(Ahorrativo)` dentro de
`nombre` era redundante con la columna `perfil`, que ya guarda ese mismo
dato de forma estructurada. Además, `nombre` se usa como username de login,
y ese sufijo lo hacía incómodo de escribir/decir en una demo en vivo.

```sql
UPDATE usuarios
SET nombre = TRIM(SPLIT_PART(nombre, '(', 1))
WHERE nombre LIKE '%(%';
```

**Antes → Después:**

| id | auth_uid | nombre (antes)       | nombre (después) | perfil       |
|----|----------|-----------------------|-------------------|--------------|
| 1  | uid_1    | 'Luis (Novato)'       | 'Luis'            | 'Novato'     |
| 2  | uid_2    | 'Ana (Deudor)'        | 'Ana'             | 'Deudor'     |
| 3  | uid_3    | 'Carlos (Inversor)'   | 'Carlos'          | 'Inversor'   |
| 4  | uid_4    | 'Marta (Ahorrativo)'  | 'Marta'           | 'Ahorrativo' |

Ninguna otra tabla (`transacciones`, `resumen_mensual`, `recomendaciones_ia`)
fue tocada — solo `usuarios.nombre` y el nuevo `usuarios.password_hash`.

---

## 3. Schema actual resultante de `usuarios`

Equivalente a correr `\d usuarios` después de los cambios de arriba:

```sql
CREATE TABLE usuarios (
    id               SERIAL PRIMARY KEY,
    auth_uid         VARCHAR(128) UNIQUE NOT NULL,
    nombre           VARCHAR(100) NOT NULL,      -- ahora solo el primer nombre
    perfil           VARCHAR(50) CHECK (perfil IN ('Deudor', 'Inversor', 'Ahorrativo', 'Novato')) DEFAULT 'Novato',
    racha_inversion  INT DEFAULT 0,
    fecha_registro   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    password_hash    TEXT                        -- columna nueva, bcrypt hash
);
```

Datos actuales (verificado con `SELECT id, auth_uid, nombre, perfil FROM usuarios ORDER BY id`):

| id | auth_uid | nombre | perfil       | racha_inversion | password (demo) |
|----|----------|--------|--------------|------------------|------------------|
| 1  | uid_1    | Luis   | Novato       | 0                | banorte2026      |
| 2  | uid_2    | Ana    | Deudor       | 0                | banorte2026      |
| 3  | uid_3    | Carlos | Inversor     | 5                | banorte2026      |
| 4  | uid_4    | Marta  | Ahorrativo   | 0                | banorte2026      |

## 4. Cómo se usa desde el backend

`backend/src/routes/auth.ts` hace login contra esta tabla así:

```sql
SELECT id, auth_uid, nombre, perfil, racha_inversion, password_hash
FROM usuarios
WHERE LOWER(TRIM(nombre)) = LOWER(TRIM($1));
```

y compara `password_hash` con `bcrypt.compare(password, password_hash)`.
El `auth_uid` devuelto es el mismo que consume
`backend/src/routes/education.ts` (`/api/education/perfil/:auth_uid`).

## 5. Nota para `.ai/db_context.md`

Ese documento (el original del equipo) **no se modificó** y ya quedó
desactualizado en tres puntos: no incluye `password_hash` ni `saldo_actual`,
sus `INSERT` de ejemplo todavía muestran `nombre` con el sufijo de perfil, y
no incluye las tablas `deudas`/`inversiones` (sección 6). Si se vuelve a
correr ese script desde cero contra una base nueva, hay que aplicarle
también las modificaciones de las secciones 2 y 6 de este documento.

## 6. Nuevas tablas: `deudas` e `inversiones` + `usuarios.saldo_actual`

Motivo: el documento del agente
(`.context/agente-educacion-financiera-CLAUDE.md`) modela deudas e
inversiones como objetos completos (saldo pendiente, tasa de interés, CAT,
valor actual, rendimiento, plazo, riesgo, liquidez) — datos que
`transacciones` no puede representar (solo guarda movimientos puntuales,
tipo `'deuda'`/`'inversion'`, no el estado de la obligación/instrumento en
sí). También hacía falta un `saldo_actual` real para poder calcular la
"diferencia entre saldo esperado y saldo actual" que pide el principio 18
del agente.

```sql
CREATE TABLE deudas (
  id SERIAL PRIMARY KEY,
  usuario_id INT REFERENCES usuarios(id) ON DELETE CASCADE,
  nombre VARCHAR(100) NOT NULL,
  tipo VARCHAR(30) CHECK (tipo IN (
    'tarjeta_credito','prestamo_personal','credito_automotriz',
    'hipotecario','credito_nomina','linea_credito','financiamiento','otro'
  )) NOT NULL,
  saldo_pendiente DECIMAL(12,2) NOT NULL,
  monto_original DECIMAL(12,2),
  pago_periodico DECIMAL(12,2),
  periodicidad_pago VARCHAR(20) CHECK (periodicidad_pago IN ('semanal','quincenal','mensual')),
  tasa_interes DECIMAL(5,2),
  cat DECIMAL(5,2),
  fecha_corte DATE,
  fecha_limite DATE,
  pagos_restantes INT,
  cuenta_asociada VARCHAR(100),
  estado VARCHAR(20) CHECK (estado IN ('activa','pagada','vencida')) DEFAULT 'activa'
);

CREATE TABLE inversiones (
  id SERIAL PRIMARY KEY,
  usuario_id INT REFERENCES usuarios(id) ON DELETE CASCADE,
  tipo_inversion VARCHAR(30) CHECK (tipo_inversion IN (
    'renta_fija','fondos','acciones','etf','bonos','cetes','otro'
  )) NOT NULL,
  nombre_instrumento VARCHAR(100) NOT NULL,
  monto_invertido DECIMAL(12,2) NOT NULL,
  valor_actual DECIMAL(12,2) NOT NULL,
  rendimiento DECIMAL(12,2),
  rendimiento_pct DECIMAL(5,2),
  fecha_inicio DATE,
  fecha_vencimiento DATE,
  plazo VARCHAR(50),
  nivel_riesgo VARCHAR(20) CHECK (nivel_riesgo IN ('bajo','medio','alto')),
  liquidez VARCHAR(20) CHECK (liquidez IN ('alta','media','baja'))
);

ALTER TABLE usuarios ADD COLUMN saldo_actual DECIMAL(12,2) DEFAULT 0.00;
```

**Seed sembrado** (pensado para que cada perfil demo tenga un caso
distinto y útil en vivo):

| usuario | deudas | inversiones | saldo_actual | Por qué |
|---|---|---|---|---|
| Luis (Novato) | ninguna | ninguna | 0.00 | sigue sin historial |
| Ana (Deudor) | Tarjeta Banorte Oro, saldo $14,000, tasa 45%, pago $1,500/mes | ninguna | **1,800.00** (saldo_calculado real es 2,000.00) | desfase deliberado de -$200 para probar el caso "diferencia sin explicar" (principio 18 del agente) |
| Carlos (Inversor) | ninguna | CETES 28 días, $20,000 invertidos, valor actual $21,500 (+7.50%) | 10,000.00 (coincide con saldo_calculado) | caso "todo coincide", inversión con rendimiento positivo |
| Marta (Ahorrativo) | Línea de crédito Banorte, saldo $500, casi liquidada | ninguna | 10,000.00 (coincide con saldo_calculado) | deuda mínima, sin inversión — perfil ahorrativo puro |

## 7. Tools de `mcp/` actualizadas para consumir todo esto

`mcp/src/tools.ts` pasó de 4 a 10 tools, alineadas 1:1 con el catálogo que
pide `.context/agente-educacion-financiera-CLAUDE.md` (sección 9 de
`backend/src/agent/systemPrompt.md`): `obtener_perfil_usuario`,
`obtener_resumen_mensual`, `obtener_balance` (nueva, usa `saldo_actual`),
`obtener_ingresos`/`obtener_gastos` (nuevas, filtran `transacciones` por
`tipo`), `obtener_ahorro` (nueva, calcula `tasa_ahorro` desde
`resumen_mensual`), `obtener_deudas`/`obtener_inversiones` (nuevas, leen las
tablas de esta sección), `obtener_historial_movimientos` (nueva, alias de
"transacciones de un mes"), `obtener_recomendaciones` (sin cambios). Se
quitó la tool genérica `obtener_transacciones` en favor de este set más
granular, para que el agente no tenga ambigüedad sobre cuál tool usar.
