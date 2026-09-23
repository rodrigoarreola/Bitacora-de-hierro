-- ============================================================
-- Estandarización de nombres de ejercicios (ADR 0019)
-- Generado desde la tabla de revisión aprobada el 2026-09-23.
--
-- Renombra TODO el historial al nombre estándar elegido para cada
-- ejercicio y guarda el nombre como estaba en exercises.original_name
-- (solo la primera vez: COALESCE conserva el original si se corre de
-- nuevo). Idempotente: correrlo dos veces no cambia nada más, porque
-- después del primer paso ya no quedan filas con el nombre viejo.
--
-- ANTES DE CORRER: backup (Perfil → Exportar datos, o
-- api/db/backup_export.php). Correr entero vía phpMyAdmin → SQL.
-- ============================================================

SET NAMES utf8mb4;

SET @exists = (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'exercises' AND COLUMN_NAME = 'original_name'
);
SET @sql = IF(@exists = 0,
  'ALTER TABLE exercises ADD COLUMN original_name VARCHAR(150) NULL AFTER name',
  'SELECT "exercises.original_name ya existe, se omite"');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

START TRANSACTION;

-- 43 nombres cambian (3 ya estaban bien). Varias líneas con el
-- mismo nombre nuevo = fusión: esos ejercicios pasan a ser uno solo.
UPDATE exercises SET original_name = COALESCE(original_name, name), name = 'Abducción de cadera sentado con máquina' WHERE name = 'Abductores en maquina';
UPDATE exercises SET original_name = COALESCE(original_name, name), name = 'Curl de muñeca a una mano con mancuerna' WHERE name = 'Antebrazo';
UPDATE exercises SET original_name = COALESCE(original_name, name), name = 'Apertura inclinado con mancuerna' WHERE name = 'Apertura en banco con mancuerna';
UPDATE exercises SET original_name = COALESCE(original_name, name), name = 'Apertura inclinado con mancuerna' WHERE name = 'Aperturas con mancuernas o en máquina';
UPDATE exercises SET original_name = COALESCE(original_name, name), name = 'Jalón agarre cerrado con maneral en V' WHERE name = 'Chin up con maquina';
UPDATE exercises SET original_name = COALESCE(original_name, name), name = 'Jalón agarre cerrado con maneral en V' WHERE name = 'Chin ups';
UPDATE exercises SET original_name = COALESCE(original_name, name), name = 'Extensión de tríceps sentado con mancuerna' WHERE name = 'Copa sobre la cabeza';
UPDATE exercises SET original_name = COALESCE(original_name, name), name = 'Curl martillo con mancuerna' WHERE name = 'Curl de bicep martillo';
UPDATE exercises SET original_name = COALESCE(original_name, name), name = 'Curl de bíceps con mancuerna' WHERE name = 'Curl de bíceps mancuerna';
UPDATE exercises SET original_name = COALESCE(original_name, name), name = 'Curl predicador con barra' WHERE name = 'Curl de bíceps predicador';
UPDATE exercises SET original_name = COALESCE(original_name, name), name = 'Elevación frontal con mancuerna' WHERE name = 'Elevación frontal de mancuernas';
UPDATE exercises SET original_name = COALESCE(original_name, name), name = 'Elevación lateral con mancuerna' WHERE name = 'Elevaciones laterales mancuerna';
UPDATE exercises SET original_name = COALESCE(original_name, name), name = 'Extensión de cuádriceps con máquina' WHERE name = 'Extensión de cuadriceps sentado';
UPDATE exercises SET original_name = COALESCE(original_name, name), name = 'Curl femoral sentado con máquina' WHERE name = 'Extensión de femoral sentado';
UPDATE exercises SET original_name = COALESCE(original_name, name), name = 'Curl femoral sentado con máquina' WHERE name = 'Extensión de isquios sentado';
UPDATE exercises SET original_name = COALESCE(original_name, name), name = 'Extensión de tríceps sobre la cabeza a una mano con mancuerna' WHERE name = 'Extensión de tríceps con mancuerna';
UPDATE exercises SET original_name = COALESCE(original_name, name), name = 'Extensión de tríceps sobre la cabeza con cuerda' WHERE name = 'Extensión de tríceps sobre la cabeza';
UPDATE exercises SET original_name = COALESCE(original_name, name), name = 'Face pull (remo posterior de pie) con cuerda' WHERE name = 'Face pull';
UPDATE exercises SET original_name = COALESCE(original_name, name), name = 'Hack squat con prensa' WHERE name = 'Hack squat';
UPDATE exercises SET original_name = COALESCE(original_name, name), name = 'Hip thrust en maquina' WHERE name = 'Hip trust';
UPDATE exercises SET original_name = COALESCE(original_name, name), name = 'Hip thrust en maquina' WHERE name = 'Hip trust en maquina';
UPDATE exercises SET original_name = COALESCE(original_name, name), name = 'Jalón (barra recta) con polea' WHERE name = 'Jalones al pecho';
UPDATE exercises SET original_name = COALESCE(original_name, name), name = 'Curl femoral acostado con máquina' WHERE name = 'Leg curl acostado';
UPDATE exercises SET original_name = COALESCE(original_name, name), name = 'Elevación lateral posterior con mancuerna' WHERE name = 'Pájaros en banca';
UPDATE exercises SET original_name = COALESCE(original_name, name), name = 'Elevación lateral con máquina' WHERE name = 'Pájaros en maquina';
UPDATE exercises SET original_name = COALESCE(original_name, name), name = 'Elevación de pantorrillas sentado con máquina' WHERE name = 'Pantorrilla sentado';
UPDATE exercises SET original_name = COALESCE(original_name, name), name = 'Extensión de cadera en máquina' WHERE name = 'Patada de glúteo en maquina';
UPDATE exercises SET original_name = COALESCE(original_name, name), name = 'Press de banca con barra' WHERE name = 'Press de banca plano con barra';
UPDATE exercises SET original_name = COALESCE(original_name, name), name = 'Curl femoral sentado con máquina' WHERE name = 'Press de isquiotibiales sentado';
UPDATE exercises SET original_name = COALESCE(original_name, name), name = 'Prensa de piernas 45°' WHERE name = 'Press de pierna';
UPDATE exercises SET original_name = COALESCE(original_name, name), name = 'Press de banca inclinado con mancuerna' WHERE name = 'Press en banco inclinado con mancuerna';
UPDATE exercises SET original_name = COALESCE(original_name, name), name = 'Extensión de tríceps detrás de la cabeza agarre cerrado acostado con barra Z' WHERE name = 'Press francés con barra Z';
UPDATE exercises SET original_name = COALESCE(original_name, name), name = 'Press de banca inclinado con barra' WHERE name = 'Press inclinado con barra';
UPDATE exercises SET original_name = COALESCE(original_name, name), name = 'Press militar con máquina' WHERE name = 'Press militar en maquina';
UPDATE exercises SET original_name = COALESCE(original_name, name), name = 'Press militar sentado con mancuerna' WHERE name = 'Press militar mancuerna';
UPDATE exercises SET original_name = COALESCE(original_name, name), name = 'Curl femoral acostado con máquina' WHERE name = 'Prone leg curl acostado';
UPDATE exercises SET original_name = COALESCE(original_name, name), name = 'Apertura invertida sentado con máquina' WHERE name = 'Rear delt fly en maquina';
UPDATE exercises SET original_name = COALESCE(original_name, name), name = 'Remo al mentón con barra' WHERE name = 'Remo al menton barra z';
UPDATE exercises SET original_name = COALESCE(original_name, name), name = 'Remo con barra T invertido con máquina' WHERE name = 'Remo con barra T';
UPDATE exercises SET original_name = COALESCE(original_name, name), name = 'Remo a una mano con mancuerna' WHERE name = 'Remo con mancuerna';
UPDATE exercises SET original_name = COALESCE(original_name, name), name = 'Remo sentado con polea' WHERE name = 'Remo con polea baja';
UPDATE exercises SET original_name = COALESCE(original_name, name), name = 'Remo sentado con máquina' WHERE name = 'Remo en maquina';
UPDATE exercises SET original_name = COALESCE(original_name, name), name = 'Sentadilla búlgara a una pierna con mancuerna' WHERE name = 'Sentadilla individual con mancuerna';

-- Librería de autocompletado: entran los nombres nuevos y salen los viejos
-- que ya no usa ninguna fila.
INSERT IGNORE INTO exercise_library (name) VALUES ('Abducción de cadera sentado con máquina');
INSERT IGNORE INTO exercise_library (name) VALUES ('Apertura inclinado con mancuerna');
INSERT IGNORE INTO exercise_library (name) VALUES ('Apertura invertida sentado con máquina');
INSERT IGNORE INTO exercise_library (name) VALUES ('Curl de bíceps con mancuerna');
INSERT IGNORE INTO exercise_library (name) VALUES ('Curl de muñeca a una mano con mancuerna');
INSERT IGNORE INTO exercise_library (name) VALUES ('Curl femoral acostado con máquina');
INSERT IGNORE INTO exercise_library (name) VALUES ('Curl femoral sentado con máquina');
INSERT IGNORE INTO exercise_library (name) VALUES ('Curl martillo con mancuerna');
INSERT IGNORE INTO exercise_library (name) VALUES ('Curl predicador con barra');
INSERT IGNORE INTO exercise_library (name) VALUES ('Elevación de pantorrillas sentado con máquina');
INSERT IGNORE INTO exercise_library (name) VALUES ('Elevación frontal con mancuerna');
INSERT IGNORE INTO exercise_library (name) VALUES ('Elevación lateral con mancuerna');
INSERT IGNORE INTO exercise_library (name) VALUES ('Elevación lateral con máquina');
INSERT IGNORE INTO exercise_library (name) VALUES ('Elevación lateral posterior con mancuerna');
INSERT IGNORE INTO exercise_library (name) VALUES ('Extensión de cadera en máquina');
INSERT IGNORE INTO exercise_library (name) VALUES ('Extensión de cuádriceps con máquina');
INSERT IGNORE INTO exercise_library (name) VALUES ('Extensión de tríceps detrás de la cabeza agarre cerrado acostado con barra Z');
INSERT IGNORE INTO exercise_library (name) VALUES ('Extensión de tríceps en polea');
INSERT IGNORE INTO exercise_library (name) VALUES ('Extensión de tríceps sentado con mancuerna');
INSERT IGNORE INTO exercise_library (name) VALUES ('Extensión de tríceps sobre la cabeza a una mano con mancuerna');
INSERT IGNORE INTO exercise_library (name) VALUES ('Extensión de tríceps sobre la cabeza con cuerda');
INSERT IGNORE INTO exercise_library (name) VALUES ('Face pull (remo posterior de pie) con cuerda');
INSERT IGNORE INTO exercise_library (name) VALUES ('Hack squat con prensa');
INSERT IGNORE INTO exercise_library (name) VALUES ('Hip thrust en maquina');
INSERT IGNORE INTO exercise_library (name) VALUES ('Jalón (barra recta) con polea');
INSERT IGNORE INTO exercise_library (name) VALUES ('Jalón agarre cerrado con maneral en V');
INSERT IGNORE INTO exercise_library (name) VALUES ('Peso muerto rumano con mancuerna');
INSERT IGNORE INTO exercise_library (name) VALUES ('Prensa de piernas 45°');
INSERT IGNORE INTO exercise_library (name) VALUES ('Press de banca con barra');
INSERT IGNORE INTO exercise_library (name) VALUES ('Press de banca inclinado con barra');
INSERT IGNORE INTO exercise_library (name) VALUES ('Press de banca inclinado con mancuerna');
INSERT IGNORE INTO exercise_library (name) VALUES ('Press militar con máquina');
INSERT IGNORE INTO exercise_library (name) VALUES ('Press militar sentado con mancuerna');
INSERT IGNORE INTO exercise_library (name) VALUES ('Remo a una mano con mancuerna');
INSERT IGNORE INTO exercise_library (name) VALUES ('Remo al mentón con barra');
INSERT IGNORE INTO exercise_library (name) VALUES ('Remo con barra T invertido con máquina');
INSERT IGNORE INTO exercise_library (name) VALUES ('Remo sentado con máquina');
INSERT IGNORE INTO exercise_library (name) VALUES ('Remo sentado con polea');
INSERT IGNORE INTO exercise_library (name) VALUES ('Sentadilla búlgara a una pierna con mancuerna');
INSERT IGNORE INTO exercise_library (name) VALUES ('Sentadilla libre con barra');
DELETE FROM exercise_library WHERE name = 'Abductores en maquina' AND NOT EXISTS (SELECT 1 FROM exercises WHERE name = 'Abductores en maquina');
DELETE FROM exercise_library WHERE name = 'Antebrazo' AND NOT EXISTS (SELECT 1 FROM exercises WHERE name = 'Antebrazo');
DELETE FROM exercise_library WHERE name = 'Apertura en banco con mancuerna' AND NOT EXISTS (SELECT 1 FROM exercises WHERE name = 'Apertura en banco con mancuerna');
DELETE FROM exercise_library WHERE name = 'Aperturas con mancuernas o en máquina' AND NOT EXISTS (SELECT 1 FROM exercises WHERE name = 'Aperturas con mancuernas o en máquina');
DELETE FROM exercise_library WHERE name = 'Chin up con maquina' AND NOT EXISTS (SELECT 1 FROM exercises WHERE name = 'Chin up con maquina');
DELETE FROM exercise_library WHERE name = 'Chin ups' AND NOT EXISTS (SELECT 1 FROM exercises WHERE name = 'Chin ups');
DELETE FROM exercise_library WHERE name = 'Copa sobre la cabeza' AND NOT EXISTS (SELECT 1 FROM exercises WHERE name = 'Copa sobre la cabeza');
DELETE FROM exercise_library WHERE name = 'Curl de bicep martillo' AND NOT EXISTS (SELECT 1 FROM exercises WHERE name = 'Curl de bicep martillo');
DELETE FROM exercise_library WHERE name = 'Curl de bíceps mancuerna' AND NOT EXISTS (SELECT 1 FROM exercises WHERE name = 'Curl de bíceps mancuerna');
DELETE FROM exercise_library WHERE name = 'Curl de bíceps predicador' AND NOT EXISTS (SELECT 1 FROM exercises WHERE name = 'Curl de bíceps predicador');
DELETE FROM exercise_library WHERE name = 'Elevación frontal de mancuernas' AND NOT EXISTS (SELECT 1 FROM exercises WHERE name = 'Elevación frontal de mancuernas');
DELETE FROM exercise_library WHERE name = 'Elevaciones laterales mancuerna' AND NOT EXISTS (SELECT 1 FROM exercises WHERE name = 'Elevaciones laterales mancuerna');
DELETE FROM exercise_library WHERE name = 'Extensión de cuadriceps sentado' AND NOT EXISTS (SELECT 1 FROM exercises WHERE name = 'Extensión de cuadriceps sentado');
DELETE FROM exercise_library WHERE name = 'Extensión de femoral sentado' AND NOT EXISTS (SELECT 1 FROM exercises WHERE name = 'Extensión de femoral sentado');
DELETE FROM exercise_library WHERE name = 'Extensión de isquios sentado' AND NOT EXISTS (SELECT 1 FROM exercises WHERE name = 'Extensión de isquios sentado');
DELETE FROM exercise_library WHERE name = 'Extensión de tríceps con mancuerna' AND NOT EXISTS (SELECT 1 FROM exercises WHERE name = 'Extensión de tríceps con mancuerna');
DELETE FROM exercise_library WHERE name = 'Extensión de tríceps sobre la cabeza' AND NOT EXISTS (SELECT 1 FROM exercises WHERE name = 'Extensión de tríceps sobre la cabeza');
DELETE FROM exercise_library WHERE name = 'Face pull' AND NOT EXISTS (SELECT 1 FROM exercises WHERE name = 'Face pull');
DELETE FROM exercise_library WHERE name = 'Hack squat' AND NOT EXISTS (SELECT 1 FROM exercises WHERE name = 'Hack squat');
DELETE FROM exercise_library WHERE name = 'Hip trust' AND NOT EXISTS (SELECT 1 FROM exercises WHERE name = 'Hip trust');
DELETE FROM exercise_library WHERE name = 'Hip trust en maquina' AND NOT EXISTS (SELECT 1 FROM exercises WHERE name = 'Hip trust en maquina');
DELETE FROM exercise_library WHERE name = 'Jalones al pecho' AND NOT EXISTS (SELECT 1 FROM exercises WHERE name = 'Jalones al pecho');
DELETE FROM exercise_library WHERE name = 'Leg curl acostado' AND NOT EXISTS (SELECT 1 FROM exercises WHERE name = 'Leg curl acostado');
DELETE FROM exercise_library WHERE name = 'Pájaros en banca' AND NOT EXISTS (SELECT 1 FROM exercises WHERE name = 'Pájaros en banca');
DELETE FROM exercise_library WHERE name = 'Pájaros en maquina' AND NOT EXISTS (SELECT 1 FROM exercises WHERE name = 'Pájaros en maquina');
DELETE FROM exercise_library WHERE name = 'Pantorrilla sentado' AND NOT EXISTS (SELECT 1 FROM exercises WHERE name = 'Pantorrilla sentado');
DELETE FROM exercise_library WHERE name = 'Patada de glúteo en maquina' AND NOT EXISTS (SELECT 1 FROM exercises WHERE name = 'Patada de glúteo en maquina');
DELETE FROM exercise_library WHERE name = 'Press de banca plano con barra' AND NOT EXISTS (SELECT 1 FROM exercises WHERE name = 'Press de banca plano con barra');
DELETE FROM exercise_library WHERE name = 'Press de isquiotibiales sentado' AND NOT EXISTS (SELECT 1 FROM exercises WHERE name = 'Press de isquiotibiales sentado');
DELETE FROM exercise_library WHERE name = 'Press de pierna' AND NOT EXISTS (SELECT 1 FROM exercises WHERE name = 'Press de pierna');
DELETE FROM exercise_library WHERE name = 'Press en banco inclinado con mancuerna' AND NOT EXISTS (SELECT 1 FROM exercises WHERE name = 'Press en banco inclinado con mancuerna');
DELETE FROM exercise_library WHERE name = 'Press francés con barra Z' AND NOT EXISTS (SELECT 1 FROM exercises WHERE name = 'Press francés con barra Z');
DELETE FROM exercise_library WHERE name = 'Press inclinado con barra' AND NOT EXISTS (SELECT 1 FROM exercises WHERE name = 'Press inclinado con barra');
DELETE FROM exercise_library WHERE name = 'Press militar en maquina' AND NOT EXISTS (SELECT 1 FROM exercises WHERE name = 'Press militar en maquina');
DELETE FROM exercise_library WHERE name = 'Press militar mancuerna' AND NOT EXISTS (SELECT 1 FROM exercises WHERE name = 'Press militar mancuerna');
DELETE FROM exercise_library WHERE name = 'Prone leg curl acostado' AND NOT EXISTS (SELECT 1 FROM exercises WHERE name = 'Prone leg curl acostado');
DELETE FROM exercise_library WHERE name = 'Rear delt fly en maquina' AND NOT EXISTS (SELECT 1 FROM exercises WHERE name = 'Rear delt fly en maquina');
DELETE FROM exercise_library WHERE name = 'Remo al menton barra z' AND NOT EXISTS (SELECT 1 FROM exercises WHERE name = 'Remo al menton barra z');
DELETE FROM exercise_library WHERE name = 'Remo con barra T' AND NOT EXISTS (SELECT 1 FROM exercises WHERE name = 'Remo con barra T');
DELETE FROM exercise_library WHERE name = 'Remo con mancuerna' AND NOT EXISTS (SELECT 1 FROM exercises WHERE name = 'Remo con mancuerna');
DELETE FROM exercise_library WHERE name = 'Remo con polea baja' AND NOT EXISTS (SELECT 1 FROM exercises WHERE name = 'Remo con polea baja');
DELETE FROM exercise_library WHERE name = 'Remo en maquina' AND NOT EXISTS (SELECT 1 FROM exercises WHERE name = 'Remo en maquina');
DELETE FROM exercise_library WHERE name = 'Sentadilla individual con mancuerna' AND NOT EXISTS (SELECT 1 FROM exercises WHERE name = 'Sentadilla individual con mancuerna');

COMMIT;
