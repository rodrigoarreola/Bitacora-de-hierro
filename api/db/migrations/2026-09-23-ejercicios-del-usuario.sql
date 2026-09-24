-- ============================================================
-- Ejercicios del usuario (ADR 0021, paso 2). Correr DESPUÉS de
-- 2026-09-23-catalogo.sql. Idempotente y en una transacción.
--
-- 1. Crea user_exercises (reemplaza a exercise_library) y
--    exercises.user_exercise_id.
-- 2. Crea un ejercicio del usuario por cada nombre usado en sus registros
--    o guardado en su librería (sin las filas sintéticas "Garmin: …").
--    Dueño: el usuario original (el de id más bajo) — hoy la app es de un
--    solo usuario; la Fase 2 repartirá por user_id.
-- 3. Los vincula al catálogo con los IDs aprobados en ADR 0019; los que no
--    tienen equivalente quedan propios (con músculo si se conoce).
-- 4. Apunta cada registro a su ejercicio del usuario por nombre.
-- exercise_library NO se borra (respaldo por una versión).
-- ============================================================

SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS user_exercises (
  id                  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id             INT UNSIGNED NOT NULL,
  name                VARCHAR(150) NOT NULL,
  catalog_exercise_id INT UNSIGNED NULL,
  target              VARCHAR(40)  NULL,
  equipment           VARCHAR(40)  NULL,
  archived_at         DATETIME     NULL,
  created_at          DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_user_exercises_name (user_id, name),
  KEY idx_user_exercises_catalog (catalog_exercise_id),
  CONSTRAINT fk_user_exercises_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_user_exercises_catalog FOREIGN KEY (catalog_exercise_id) REFERENCES catalog_exercises(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

SET @exists = (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'exercises' AND COLUMN_NAME = 'user_exercise_id'
);
SET @sql = IF(@exists = 0,
  'ALTER TABLE exercises ADD COLUMN user_exercise_id INT UNSIGNED NULL AFTER week_id, ADD KEY idx_exercises_user_exercise (user_exercise_id), ADD CONSTRAINT fk_exercises_user_exercise FOREIGN KEY (user_exercise_id) REFERENCES user_exercises(id) ON DELETE SET NULL',
  'SELECT "exercises.user_exercise_id ya existe, se omite"');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

START TRANSACTION;

SET @owner = (SELECT MIN(id) FROM users);

-- Un ejercicio del usuario por nombre (registros + librería). INSERT IGNORE:
-- la llave única (user_id, name) evita duplicados al volver a correrlo.
INSERT IGNORE INTO user_exercises (user_id, name)
  SELECT @owner, TRIM(name) FROM exercises
  WHERE TRIM(name) <> '' AND name NOT LIKE 'Garmin:%'
  GROUP BY TRIM(name);
INSERT IGNORE INTO user_exercises (user_id, name)
  SELECT @owner, TRIM(name) FROM exercise_library
  WHERE TRIM(name) <> '' AND name NOT LIKE 'Garmin:%';

-- Vínculo al catálogo (IDs aprobados en la revisión de ADR 0019).
UPDATE user_exercises SET catalog_exercise_id = 597 WHERE user_id = @owner AND name = 'Abducción de cadera sentado con máquina' AND catalog_exercise_id IS NULL;
UPDATE user_exercises SET catalog_exercise_id = 319 WHERE user_id = @owner AND name = 'Apertura inclinado con mancuerna' AND catalog_exercise_id IS NULL;
UPDATE user_exercises SET catalog_exercise_id = 602 WHERE user_id = @owner AND name = 'Apertura invertida sentado con máquina' AND catalog_exercise_id IS NULL;
UPDATE user_exercises SET catalog_exercise_id = 294 WHERE user_id = @owner AND name = 'Curl de bíceps con mancuerna' AND catalog_exercise_id IS NULL;
UPDATE user_exercises SET catalog_exercise_id = 364 WHERE user_id = @owner AND name = 'Curl de muñeca a una mano con mancuerna' AND catalog_exercise_id IS NULL;
UPDATE user_exercises SET catalog_exercise_id = 586 WHERE user_id = @owner AND name = 'Curl femoral acostado con máquina' AND catalog_exercise_id IS NULL;
UPDATE user_exercises SET catalog_exercise_id = 599 WHERE user_id = @owner AND name = 'Curl femoral sentado con máquina' AND catalog_exercise_id IS NULL;
UPDATE user_exercises SET catalog_exercise_id = 313 WHERE user_id = @owner AND name = 'Curl martillo con mancuerna' AND catalog_exercise_id IS NULL;
UPDATE user_exercises SET catalog_exercise_id = 70 WHERE user_id = @owner AND name = 'Curl predicador con barra' AND catalog_exercise_id IS NULL;
UPDATE user_exercises SET catalog_exercise_id = 594 WHERE user_id = @owner AND name = 'Elevación de pantorrillas sentado con máquina' AND catalog_exercise_id IS NULL;
UPDATE user_exercises SET catalog_exercise_id = 310 WHERE user_id = @owner AND name = 'Elevación frontal con mancuerna' AND catalog_exercise_id IS NULL;
UPDATE user_exercises SET catalog_exercise_id = 334 WHERE user_id = @owner AND name = 'Elevación lateral con mancuerna' AND catalog_exercise_id IS NULL;
UPDATE user_exercises SET catalog_exercise_id = 584 WHERE user_id = @owner AND name = 'Elevación lateral con máquina' AND catalog_exercise_id IS NULL;
UPDATE user_exercises SET catalog_exercise_id = 380 WHERE user_id = @owner AND name = 'Elevación lateral posterior con mancuerna' AND catalog_exercise_id IS NULL;
UPDATE user_exercises SET catalog_exercise_id = 2286 WHERE user_id = @owner AND name = 'Extensión de cadera en máquina' AND catalog_exercise_id IS NULL;
UPDATE user_exercises SET catalog_exercise_id = 585 WHERE user_id = @owner AND name = 'Extensión de cuádriceps con máquina' AND catalog_exercise_id IS NULL;
UPDATE user_exercises SET catalog_exercise_id = 1748 WHERE user_id = @owner AND name = 'Extensión de tríceps detrás de la cabeza agarre cerrado acostado con barra Z' AND catalog_exercise_id IS NULL;
UPDATE user_exercises SET catalog_exercise_id = 201 WHERE user_id = @owner AND name = 'Extensión de tríceps en polea' AND catalog_exercise_id IS NULL;
UPDATE user_exercises SET catalog_exercise_id = 2188 WHERE user_id = @owner AND name = 'Extensión de tríceps sentado con mancuerna' AND catalog_exercise_id IS NULL;
UPDATE user_exercises SET catalog_exercise_id = 362 WHERE user_id = @owner AND name = 'Extensión de tríceps sobre la cabeza a una mano con mancuerna' AND catalog_exercise_id IS NULL;
UPDATE user_exercises SET catalog_exercise_id = 194 WHERE user_id = @owner AND name = 'Extensión de tríceps sobre la cabeza con cuerda' AND catalog_exercise_id IS NULL;
UPDATE user_exercises SET catalog_exercise_id = 233 WHERE user_id = @owner AND name = 'Face pull (remo posterior de pie) con cuerda' AND catalog_exercise_id IS NULL;
UPDATE user_exercises SET catalog_exercise_id = 743 WHERE user_id = @owner AND name = 'Hack squat con prensa' AND catalog_exercise_id IS NULL;
UPDATE user_exercises SET catalog_exercise_id = 197 WHERE user_id = @owner AND name = 'Jalón (barra recta) con polea' AND catalog_exercise_id IS NULL;
UPDATE user_exercises SET catalog_exercise_id = 2616 WHERE user_id = @owner AND name = 'Jalón agarre cerrado con maneral en V' AND catalog_exercise_id IS NULL;
UPDATE user_exercises SET catalog_exercise_id = 1459 WHERE user_id = @owner AND name = 'Peso muerto rumano con mancuerna' AND catalog_exercise_id IS NULL;
UPDATE user_exercises SET catalog_exercise_id = 1463 WHERE user_id = @owner AND name = 'Prensa de piernas 45°' AND catalog_exercise_id IS NULL;
UPDATE user_exercises SET catalog_exercise_id = 25 WHERE user_id = @owner AND name = 'Press de banca con barra' AND catalog_exercise_id IS NULL;
UPDATE user_exercises SET catalog_exercise_id = 47 WHERE user_id = @owner AND name = 'Press de banca inclinado con barra' AND catalog_exercise_id IS NULL;
UPDATE user_exercises SET catalog_exercise_id = 314 WHERE user_id = @owner AND name = 'Press de banca inclinado con mancuerna' AND catalog_exercise_id IS NULL;
UPDATE user_exercises SET catalog_exercise_id = 587 WHERE user_id = @owner AND name = 'Press militar con máquina' AND catalog_exercise_id IS NULL;
UPDATE user_exercises SET catalog_exercise_id = 405 WHERE user_id = @owner AND name = 'Press militar sentado con mancuerna' AND catalog_exercise_id IS NULL;
UPDATE user_exercises SET catalog_exercise_id = 292 WHERE user_id = @owner AND name = 'Remo a una mano con mancuerna' AND catalog_exercise_id IS NULL;
UPDATE user_exercises SET catalog_exercise_id = 120 WHERE user_id = @owner AND name = 'Remo al mentón con barra' AND catalog_exercise_id IS NULL;
UPDATE user_exercises SET catalog_exercise_id = 1349 WHERE user_id = @owner AND name = 'Remo con barra T invertido con máquina' AND catalog_exercise_id IS NULL;
UPDATE user_exercises SET catalog_exercise_id = 1350 WHERE user_id = @owner AND name = 'Remo sentado con máquina' AND catalog_exercise_id IS NULL;
UPDATE user_exercises SET catalog_exercise_id = 1323 WHERE user_id = @owner AND name = 'Remo sentado con polea' AND catalog_exercise_id IS NULL;
UPDATE user_exercises SET catalog_exercise_id = 410 WHERE user_id = @owner AND name = 'Sentadilla búlgara a una pierna con mancuerna' AND catalog_exercise_id IS NULL;
UPDATE user_exercises SET catalog_exercise_id = 43 WHERE user_id = @owner AND name = 'Sentadilla libre con barra' AND catalog_exercise_id IS NULL;

-- Propios sin equivalente en el dataset: músculo conocido.
UPDATE user_exercises SET target = 'glutes' WHERE user_id = @owner AND name = 'Hip thrust en maquina' AND catalog_exercise_id IS NULL AND target IS NULL;

-- Cada registro apunta a su ejercicio del usuario.
UPDATE exercises e
  JOIN user_exercises u ON u.user_id = @owner AND u.name = TRIM(e.name)
  SET e.user_exercise_id = u.id
  WHERE e.user_exercise_id IS NULL;

COMMIT;

-- Verificación: debe dar 0.
SELECT COUNT(*) AS registros_sin_vinculo FROM exercises
  WHERE user_exercise_id IS NULL AND TRIM(name) <> '' AND name NOT LIKE 'Garmin:%';
