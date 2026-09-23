<?php
declare(strict_types=1);

require __DIR__ . '/config.php';
require __DIR__ . '/auth.php';
require __DIR__ . '/week_helpers.php';

require_login();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    respond_error('Método no permitido.', 405);
}

const DAY_KEYS = ['lun', 'mar', 'mie', 'jue', 'vie', 'sab', 'dom'];
const REQUIRED_DAY_KEYS = ['lun', 'mar', 'mie', 'jue', 'vie'];

/**
 * Importa una lista de semanas: [{monday_date, days:{lun..vie: <día>}, overrides?}].
 * Semana que ya existe (mismo monday_date) se reemplaza por completo
 * (se borran sus ejercicios, overrides y sesión actuales y se insertan los
 * del archivo). Semanas que no vienen en el archivo quedan intactas. Todo
 * o nada: se valida la forma completa antes de escribir nada en la base.
 * "sab"/"dom" son opcionales (backups viejos no los tienen) — si
 * faltan, se importan como día vacío.
 * "overrides" es opcional (backups de antes de "Migrar día" no lo
 * tienen): { [day_key]: {group_name, notes, migrated_from} } — solo
 * para días cuyo grupo/notas no son los del template por defecto,
 * porque recibieron contenido migrado de otro día esa semana. Desde la
 * 1.64.0 también traen template_key (plantilla de la Guía del día).
 * "groups" es opcional (backups de antes de los splits no lo tienen):
 * { [day_key]: {group_name, notes?, template_key?} } — grupo congelado de
 * cada día de esa semana (week_day_groups, ADR 0018). Si falta, la semana
 * toma el split vigente, igual que una semana recién creada.
 *
 * <día> acepta dos formas, para no romper backups viejos:
 *   - Legacy: una lista plana de ejercicios [{name,kg,reps,series,note,done}].
 *   - Actual: un objeto {exercises:[...], start_time?, end_time?, duration_min?}
 *     — start_time/end_time/duration_min son opcionales, y si vienen se
 *     guardan en week_day_sessions (ver api/db/schema.sql).
 * Se distinguen por la presencia de la clave "exercises": json_decode(...,
 * true) convierte tanto `[]` como `{}` en un array PHP vacío, pero un día
 * nuevo siempre trae "exercises" (aunque sea []), así que no hay ambigüedad.
 */

function day_exercises_list($dayValue): array
{
    return isset($dayValue['exercises']) ? $dayValue['exercises'] : $dayValue;
}

function day_session_fields($dayValue): ?array
{
    if (!isset($dayValue['exercises'])) {
        return null; // forma legacy, sin campos de sesión
    }
    $startTime = !empty($dayValue['start_time']) ? (string) $dayValue['start_time'] : null;
    $endTime = !empty($dayValue['end_time']) ? (string) $dayValue['end_time'] : null;
    $durationMin = isset($dayValue['duration_min']) && $dayValue['duration_min'] !== null && $dayValue['duration_min'] !== ''
        ? (int) $dayValue['duration_min']
        : null;
    if ($startTime === null && $endTime === null && $durationMin === null) {
        return null;
    }
    return ['start_time' => $startTime, 'end_time' => $endTime, 'duration_min' => $durationMin];
}

$weeks = read_json_body();
if (!is_array($weeks) || empty($weeks)) {
    respond_error('El archivo debe ser una lista de semanas.', 422);
}

foreach ($weeks as $i => $w) {
    if (!is_array($w) || !isset($w['monday_date']) || !isset($w['days']) || !is_array($w['days'])) {
        respond_error("Semana #{$i}: formato inválido.", 422);
    }
    $mondayDate = (string) $w['monday_date'];
    $d = DateTime::createFromFormat('Y-m-d', $mondayDate);
    if (!$d || $d->format('Y-m-d') !== $mondayDate || $d->format('N') !== '1') {
        respond_error("Semana #{$i}: \"{$mondayDate}\" no es un lunes válido (YYYY-MM-DD).", 422);
    }
    foreach (REQUIRED_DAY_KEYS as $dayKey) {
        if (!isset($w['days'][$dayKey]) || !is_array($w['days'][$dayKey])) {
            respond_error("Semana {$mondayDate}: falta el día \"{$dayKey}\".", 422);
        }
    }
    foreach (DAY_KEYS as $dayKey) {
        if (!isset($w['days'][$dayKey])) {
            continue;
        }
        $dayValue = $w['days'][$dayKey];
        if (!is_array($dayValue)) {
            respond_error("Semana {$mondayDate}: el día \"{$dayKey}\" debe ser una lista o un objeto.", 422);
        }
        if (isset($dayValue['exercises']) && !is_array($dayValue['exercises'])) {
            respond_error("Semana {$mondayDate}, día {$dayKey}: \"exercises\" debe ser una lista.", 422);
        }
        foreach (day_exercises_list($dayValue) as $e) {
            if (!is_array($e) || !array_key_exists('name', $e)) {
                respond_error("Semana {$mondayDate}, día {$dayKey}: ejercicio con formato inválido.", 422);
            }
        }
    }
    if (isset($w['overrides'])) {
        if (!is_array($w['overrides'])) {
            respond_error("Semana {$mondayDate}: \"overrides\" debe ser un objeto.", 422);
        }
        foreach ($w['overrides'] as $dayKey => $ov) {
            if (!in_array($dayKey, DAY_KEYS, true) || !is_array($ov) || !isset($ov['group_name'])) {
                respond_error("Semana {$mondayDate}: override de \"{$dayKey}\" con formato inválido.", 422);
            }
            $mf = $ov['migrated_from'] ?? null;
            if ($mf !== null && !in_array($mf, DAY_KEYS, true)) {
                respond_error("Semana {$mondayDate}: migrated_from inválido en override de \"{$dayKey}\".", 422);
            }
        }
    }
    if (isset($w['groups'])) {
        if (!is_array($w['groups'])) {
            respond_error("Semana {$mondayDate}: \"groups\" debe ser un objeto.", 422);
        }
        foreach ($w['groups'] as $dayKey => $g) {
            if (!in_array($dayKey, DAY_KEYS, true) || !is_array($g) || !isset($g['group_name'])) {
                respond_error("Semana {$mondayDate}: grupo de \"{$dayKey}\" con formato inválido.", 422);
            }
        }
    }
}

$findWeek = $pdo->prepare('SELECT id FROM weeks WHERE monday_date = :d');
$insertWeek = $pdo->prepare('INSERT INTO weeks (monday_date) VALUES (:d)');
$updateWeekNote = $pdo->prepare('UPDATE weeks SET note = :n WHERE id = :id');
$deleteExercises = $pdo->prepare('DELETE FROM exercises WHERE week_id = :w');
$deleteOverrides = $pdo->prepare('DELETE FROM week_day_overrides WHERE week_id = :w');
$deleteSessions = $pdo->prepare('DELETE FROM week_day_sessions WHERE week_id = :w');
$withGroups = split_schema_ready($pdo);
$insertOverride = $pdo->prepare(
    $withGroups
    ? 'INSERT INTO week_day_overrides (week_id, day_key, group_name, notes, template_key, migrated_from)
       VALUES (:week_id, :day_key, :group_name, :notes, :template_key, :migrated_from)'
    : 'INSERT INTO week_day_overrides (week_id, day_key, group_name, notes, migrated_from)
       VALUES (:week_id, :day_key, :group_name, :notes, :migrated_from)'
);
$deleteGroups = $withGroups ? $pdo->prepare('DELETE FROM week_day_groups WHERE week_id = :w') : null;
$insertGroup = $withGroups ? $pdo->prepare(
    'INSERT INTO week_day_groups (week_id, day_key, group_name, notes, template_key)
     VALUES (:week_id, :day_key, :group_name, :notes, :template_key)'
) : null;
$insertSession = $pdo->prepare(
    'INSERT INTO week_day_sessions (week_id, day_key, start_time, end_time, duration_min)
     VALUES (:week_id, :day_key, :start_time, :end_time, :duration_min)'
);
$insertEx = $pdo->prepare(
    'INSERT INTO exercises (week_id, day_key, name, kg, reps, series, note, done, sort_order)
     VALUES (:week_id, :day_key, :name, :kg, :reps, :series, :note, :done, :sort_order)'
);
$libCheck = $pdo->prepare('SELECT id FROM exercise_library WHERE LOWER(name) = LOWER(:name)');
$libInsert = $pdo->prepare('INSERT INTO exercise_library (name) VALUES (:name)');

$weekCount = 0;
$exCount = 0;

$pdo->beginTransaction();
try {
    foreach ($weeks as $w) {
        $mondayDate = (string) $w['monday_date'];

        $findWeek->execute(['d' => $mondayDate]);
        $weekId = $findWeek->fetchColumn();
        if ($weekId === false) {
            $insertWeek->execute(['d' => $mondayDate]);
            $weekId = (int) $pdo->lastInsertId();
        } else {
            $weekId = (int) $weekId;
            $deleteExercises->execute(['w' => $weekId]);
            $deleteOverrides->execute(['w' => $weekId]);
            $deleteSessions->execute(['w' => $weekId]);
            if ($deleteGroups) {
                $deleteGroups->execute(['w' => $weekId]);
            }
        }

        if ($insertGroup) {
            foreach (($w['groups'] ?? []) as $dayKey => $g) {
                $insertGroup->execute([
                    'week_id'      => $weekId,
                    'day_key'      => $dayKey,
                    'group_name'   => (string) $g['group_name'],
                    'notes'        => isset($g['notes']) && $g['notes'] !== '' ? (string) $g['notes'] : null,
                    'template_key' => isset($g['template_key']) && $g['template_key'] !== '' ? (string) $g['template_key'] : null,
                ]);
            }
            // Días que no vinieron en "groups" (o backup sin "groups"): split vigente.
            materialize_week_groups($pdo, $weekId);
        }

        $updateWeekNote->execute(['n' => (string) ($w['note'] ?? ''), 'id' => $weekId]);

        foreach (($w['overrides'] ?? []) as $dayKey => $ov) {
            $params = [
                'week_id'       => $weekId,
                'day_key'       => $dayKey,
                'group_name'    => (string) $ov['group_name'],
                'notes'         => isset($ov['notes']) && $ov['notes'] !== '' ? (string) $ov['notes'] : null,
                'migrated_from' => $ov['migrated_from'] ?? null,
            ];
            if ($withGroups) {
                $params['template_key'] = isset($ov['template_key']) && $ov['template_key'] !== '' ? (string) $ov['template_key'] : null;
            }
            $insertOverride->execute($params);
        }

        foreach (DAY_KEYS as $dayKey) {
            $dayValue = $w['days'][$dayKey] ?? [];
            $sessionFields = day_session_fields($dayValue);
            if ($sessionFields !== null) {
                $insertSession->execute([
                    'week_id'      => $weekId,
                    'day_key'      => $dayKey,
                    'start_time'   => $sessionFields['start_time'],
                    'end_time'     => $sessionFields['end_time'],
                    'duration_min' => $sessionFields['duration_min'],
                ]);
            }

            $sortOrder = 0;
            foreach (day_exercises_list($dayValue) as $e) {
                $name = trim((string) ($e['name'] ?? ''));
                $insertEx->execute([
                    'week_id'    => $weekId,
                    'day_key'    => $dayKey,
                    'name'       => $name,
                    'kg'         => (string) ($e['kg'] ?? ''),
                    'reps'       => (string) ($e['reps'] ?? ''),
                    'series'     => (string) ($e['series'] ?? ''),
                    'note'       => (string) ($e['note'] ?? ''),
                    'done'       => !empty($e['done']) ? 1 : 0,
                    'sort_order' => $sortOrder++,
                ]);
                $exCount++;

                // Los nombres "Garmin: ..." son filas sinteticas generadas al
                // importar historico de Garmin (categoria agregada, no un
                // ejercicio real) -- no tiene caso que aparezcan como sugerencia
                // de autocompletado al agregar ejercicios nuevos.
                if ($name !== '' && !str_starts_with($name, 'Garmin: ')) {
                    $libCheck->execute(['name' => $name]);
                    if ($libCheck->fetchColumn() === false) {
                        $libInsert->execute(['name' => $name]);
                    }
                }
            }
        }
        $weekCount++;
    }
    $pdo->commit();
} catch (Throwable $e) {
    $pdo->rollBack();
    respond_error('Error al importar, no se guardó nada: ' . $e->getMessage(), 500);
}

respond_ok(['weeks' => $weekCount, 'exercises' => $exCount]);
