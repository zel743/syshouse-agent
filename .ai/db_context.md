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
