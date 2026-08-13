-- Bitácora de Hierro — esquema inicial
-- Importar completo en phpMyAdmin (o `mysql -u ... -p nombre_bd < schema.sql`).
-- Requiere InnoDB para que las FOREIGN KEY con ON DELETE CASCADE funcionen.

SET NAMES utf8mb4;

-- ============================================================
-- users: un solo usuario esperado. La fila se crea con
-- api/db/create_user.php (CLI), nunca vía HTTP.
-- ============================================================
CREATE TABLE users (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  username      VARCHAR(50)  NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_users_username (username)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- day_templates: grupo muscular y notas por día de la semana.
-- Datos estáticos (7 filas), no se duplican por semana — son el
-- valor por defecto. Cuando un día se migra a otro (ver
-- week_day_overrides), el destino usa su propio group_name/notes
-- en vez de este valor por defecto.
-- ============================================================
CREATE TABLE day_templates (
  day_key    ENUM('lun','mar','mie','jue','vie','sab','dom') NOT NULL PRIMARY KEY,
  group_name VARCHAR(80)  NOT NULL DEFAULT '',
  notes      TEXT         NULL,
  sort_order TINYINT      NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO day_templates (day_key, group_name, notes, sort_order) VALUES
  ('lun', 'Pecho y Tríceps',    NULL,                                                        0),
  ('mar', 'Piernas',            NULL,                                                        1),
  ('mie', 'Espalda y Bíceps',   'Filas sin marcar: variantes que rotan semana a semana.',    2),
  ('jue', 'Hombros',            NULL,                                                        3),
  ('vie', 'Full Body',          'Día de cierre — se ajusta según lo que falte de la semana.', 4),
  ('sab', 'Recuperación',       'Día para recuperar un entrenamiento migrado de otro día.',   5),
  ('dom', 'Descanso',           'El gimnasio no abre los domingos.',                          6);

-- ============================================================
-- weeks: una fila por semana, identificada por el lunes (ISO).
-- ============================================================
CREATE TABLE weeks (
  id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  monday_date  DATE     NOT NULL,
  created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_weeks_monday_date (monday_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- exercises: filas editables por día dentro de una semana.
-- kg/reps/series son VARCHAR a propósito: la rutina base ya
-- incluye valores no numéricos como '40(8)', y los inputs del
-- frontend son de texto libre sin validación estricta.
-- ============================================================
CREATE TABLE exercises (
  id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  week_id    INT UNSIGNED NOT NULL,
  day_key    ENUM('lun','mar','mie','jue','vie','sab','dom') NOT NULL,
  name       VARCHAR(150) NOT NULL DEFAULT '',
  kg         VARCHAR(20)  NOT NULL DEFAULT '',
  reps       VARCHAR(20)  NOT NULL DEFAULT '',
  series     VARCHAR(20)  NOT NULL DEFAULT '',
  note       VARCHAR(200) NOT NULL DEFAULT '',
  done       TINYINT(1)   NOT NULL DEFAULT 0,
  sort_order INT          NOT NULL DEFAULT 0,
  created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_exercises_week_day (week_id, day_key),
  CONSTRAINT fk_exercises_week
    FOREIGN KEY (week_id) REFERENCES weeks(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- exercise_library: nombres reutilizables para autocompletar.
-- ============================================================
CREATE TABLE exercise_library (
  id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name       VARCHAR(150) NOT NULL,
  created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_exercise_library_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- week_day_overrides: group_name/notes específicos de una semana,
-- usados cuando un día se migra a otro (ver "Migrar día" en el
-- frontend / api/migrate_day.php). Sin fila = el día usa el valor
-- por defecto de day_templates. migrated_from registra de qué día
-- vino el contenido, para que el cálculo de racha no cuente el
-- día de origen como "fallido" cuando en realidad se movió acá.
-- ============================================================
CREATE TABLE week_day_overrides (
  week_id       INT UNSIGNED NOT NULL,
  day_key       ENUM('lun','mar','mie','jue','vie','sab','dom') NOT NULL,
  group_name    VARCHAR(80) NOT NULL,
  notes         TEXT NULL,
  migrated_from ENUM('lun','mar','mie','jue','vie','sab','dom') NULL,
  PRIMARY KEY (week_id, day_key),
  CONSTRAINT fk_week_day_overrides_week
    FOREIGN KEY (week_id) REFERENCES weeks(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- app_settings: reglas de negocio editables desde Ajustes (ver
-- api/settings.php), reemplazando constantes que antes vivían fijas
-- en js/app.js. Sin fila para una clave = se usa el valor por
-- defecto definido en api/settings.php, así que no hace falta
-- sembrar filas al crear la tabla.
-- ============================================================
CREATE TABLE app_settings (
  setting_key   VARCHAR(60)  NOT NULL PRIMARY KEY,
  setting_value VARCHAR(255) NOT NULL,
  updated_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- weeks.note: nota libre de la semana completa (cómo se sintió,
-- lesiones, ajustes), separada de exercises.note que es por
-- ejercicio. Nullable — la mayoría de semanas no van a tener nota.
-- ============================================================
ALTER TABLE weeks ADD COLUMN note TEXT NULL AFTER monday_date;

-- ============================================================
-- exercises.updated_at: habilita last-write-wins para la cola de
-- edición offline (ver js/offline-queue.js) — al reproducir una
-- mutación encolada, el backend compara su client_time contra este
-- valor y descarta la mutación si el registro ya tiene un cambio
-- más nuevo que el que se está reproduciendo.
-- ============================================================
ALTER TABLE exercises ADD COLUMN updated_at DATETIME NOT NULL
  DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER created_at;

-- ============================================================
-- users.failed_attempts / locked_until: protección contra fuerza bruta
-- en login.php. Sin tracking de IP a propósito — hay una sola cuenta
-- posible de todos modos, un contador por cuenta ya cubre el riesgo real.
-- ============================================================
ALTER TABLE users
  ADD COLUMN failed_attempts TINYINT UNSIGNED NOT NULL DEFAULT 0,
  ADD COLUMN locked_until DATETIME NULL;

-- ============================================================
-- week_day_sessions: hora de inicio/fin y duración del entrenamiento
-- de un día puntual (botón "Iniciar/Finalizar entrenamiento" en el
-- frontend, o backfill desde Garmin). Sin fila = ese día no tiene
-- horario registrado todavía. Los tres campos son independientes:
-- duration_min no siempre es end_time - start_time (puede venir de
-- Garmin con su propio cálculo, o editarse a mano sin tocar las horas).
-- ============================================================
CREATE TABLE week_day_sessions (
  week_id      INT UNSIGNED NOT NULL,
  day_key      ENUM('lun','mar','mie','jue','vie','sab','dom') NOT NULL,
  start_time   TIME NULL,
  end_time     TIME NULL,
  duration_min SMALLINT UNSIGNED NULL,
  PRIMARY KEY (week_id, day_key),
  CONSTRAINT fk_week_day_sessions_week
    FOREIGN KEY (week_id) REFERENCES weeks(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
