-- ============================================================
-- Quita exercise_library (ADR 0021, paso 5). Desde la 1.67.0 la app usa
-- user_exercises; exercise_library se conservó una versión como respaldo.
-- Correr DESPUÉS de 2026-09-23-ejercicios-del-usuario.sql y con la 1.67.3
-- ya desplegada (la 1.67.2 y anteriores todavía la leen en library.php).
--
-- Solo borra la tabla si cada nombre de la librería ya tiene su ejercicio
-- del usuario; si no, no toca nada y lo dice. Idempotente: si la tabla ya
-- no existe, tampoco hace nada.
-- ============================================================

SET NAMES utf8mb4;

SET @existe = (
  SELECT COUNT(*) FROM information_schema.TABLES
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'exercise_library'
);

SET @sql = IF(@existe = 0,
  'SELECT 0 INTO @pendientes',
  'SELECT COUNT(*) INTO @pendientes FROM exercise_library l
     WHERE TRIM(l.name) <> '''' AND l.name NOT LIKE ''Garmin:%''
       AND NOT EXISTS (SELECT 1 FROM user_exercises u WHERE u.name = TRIM(l.name))');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = CASE
  WHEN @existe = 0 THEN 'SELECT "exercise_library ya no existe, nada que hacer" AS resultado'
  WHEN @pendientes > 0 THEN CONCAT('SELECT "NO se borró: ', @pendientes, ' nombres de la librería sin ejercicio del usuario — corre antes 2026-09-23-ejercicios-del-usuario.sql" AS resultado')
  ELSE 'DROP TABLE exercise_library'
END;
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
