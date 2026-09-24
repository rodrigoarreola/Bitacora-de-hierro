<?php
declare(strict_types=1);

/**
 * Helpers de semana compartidos por weeks.php y migrate_day.php.
 * Requiere que config.php ya se haya incluido ($pdo disponible).
 */

function is_monday(string $isoDate): bool
{
    $d = DateTime::createFromFormat('Y-m-d', $isoDate);
    return $d !== false && $d->format('Y-m-d') === $isoDate && $d->format('N') === '1';
}

function find_week_id(PDO $pdo, string $mondayDate): ?int
{
    $stmt = $pdo->prepare('SELECT id FROM weeks WHERE monday_date = :d');
    $stmt->execute(['d' => $mondayDate]);
    $id = $stmt->fetchColumn();
    return $id === false ? null : (int) $id;
}

/**
 * ¿Ya se corrió la migración de splits (ADR 0018) en esta base? El código
 * puede llegar a producción antes que el ALTER/CREATE — en ese caso todo
 * sigue funcionando como antes (grupo leído de day_templates en vivo, sin
 * template_key), en vez de romper cada GET de semanas. Se consulta una
 * sola vez por request.
 */
function split_schema_ready(PDO $pdo): bool
{
    static $ready = null;
    if ($ready === null) {
        $ready = (bool) $pdo->query(
            "SELECT COUNT(*) FROM information_schema.TABLES
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'week_day_groups'"
        )->fetchColumn();
    }
    return $ready;
}

/**
 * ¿Existe exercises.original_name (ADR 0019)? Mismo criterio que
 * split_schema_ready(): el código puede llegar antes que el ALTER.
 */
function original_name_ready(PDO $pdo): bool
{
    static $ready = null;
    if ($ready === null) {
        $ready = (bool) $pdo->query(
            "SELECT COUNT(*) FROM information_schema.COLUMNS
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'exercises' AND COLUMN_NAME = 'original_name'"
        )->fetchColumn();
    }
    return $ready;
}

/**
 * ¿Existe exercises.user_exercise_id (ADR 0021)? Copia local de
 * catalog_ready() para no obligar a cada endpoint que lee semanas a incluir
 * exercise_helpers.php.
 */
function catalog_ready_wh(PDO $pdo): bool
{
    static $ready = null;
    if ($ready === null) {
        $ready = (bool) $pdo->query(
            "SELECT COUNT(*) FROM information_schema.COLUMNS
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'exercises' AND COLUMN_NAME = 'user_exercise_id'"
        )->fetchColumn();
    }
    return $ready;
}

/**
 * Congela el split vigente (day_templates) en week_day_groups para una
 * semana recién creada, así un cambio de split posterior no la renombra.
 * INSERT IGNORE: si la semana ya tenía sus grupos, no los toca.
 */
function materialize_week_groups(PDO $pdo, int $weekId): void
{
    if (!split_schema_ready($pdo)) {
        return;
    }
    $pdo->prepare(
        'INSERT IGNORE INTO week_day_groups (week_id, day_key, group_name, notes, template_key)
         SELECT :w, day_key, group_name, notes, template_key FROM day_templates'
    )->execute(['w' => $weekId]);
}

/**
 * group_name/notes de un día salen, en orden de prioridad, de: un override
 * de esa semana (creado al migrar un día a otro), el grupo congelado al
 * crear la semana (week_day_groups) o, si no hay ninguno, el split vigente
 * (day_templates). migrated_from (solo presente en el override) le dice al
 * frontend de qué día vino el contenido, para que el cálculo de racha no
 * cuente el día de origen como fallido. template_key dice qué plantilla
 * de día usa la Guía del día (NULL = sin guía).
 */
function fetch_week_detail(PDO $pdo, int $weekId, string $mondayDate): array
{
    $withGroups = split_schema_ready($pdo);
    $stmtTemplates = $pdo->prepare(
        $withGroups
        ? 'SELECT dt.day_key,
                  COALESCE(wo.group_name, wg.group_name, dt.group_name) AS group_name,
                  CASE WHEN wo.week_id IS NOT NULL THEN COALESCE(wo.notes, dt.notes)
                       WHEN wg.week_id IS NOT NULL THEN wg.notes
                       ELSE dt.notes END AS notes,
                  CASE WHEN wo.week_id IS NOT NULL THEN wo.template_key
                       WHEN wg.week_id IS NOT NULL THEN wg.template_key
                       ELSE dt.template_key END AS template_key,
                  wo.migrated_from,
                  ws.start_time, ws.end_time, ws.duration_min
           FROM day_templates dt
           LEFT JOIN week_day_overrides wo
             ON wo.week_id = :week_id_ov AND wo.day_key = dt.day_key
           LEFT JOIN week_day_groups wg
             ON wg.week_id = :week_id_wg AND wg.day_key = dt.day_key
           LEFT JOIN week_day_sessions ws
             ON ws.week_id = :week_id_ws AND ws.day_key = dt.day_key
           ORDER BY dt.sort_order'
        : 'SELECT dt.day_key,
                  COALESCE(wo.group_name, dt.group_name) AS group_name,
                  COALESCE(wo.notes, dt.notes) AS notes,
                  NULL AS template_key,
                  wo.migrated_from,
                  ws.start_time, ws.end_time, ws.duration_min
           FROM day_templates dt
           LEFT JOIN week_day_overrides wo
             ON wo.week_id = :week_id_ov AND wo.day_key = dt.day_key
           LEFT JOIN week_day_sessions ws
             ON ws.week_id = :week_id_ws AND ws.day_key = dt.day_key
           ORDER BY dt.sort_order'
    );
    // PDO::ATTR_EMULATE_PREPARES está en false (config.php) — con
    // prepares nativos no se puede repetir el mismo placeholder con
    // nombre en dos JOIN distintos, por eso :week_id_ov / :week_id_wg /
    // :week_id_ws en vez de reusar :week_id.
    $params = ['week_id_ov' => $weekId, 'week_id_ws' => $weekId];
    if ($withGroups) {
        $params['week_id_wg'] = $weekId;
    }
    $stmtTemplates->execute($params);
    $templates = $stmtTemplates->fetchAll();

    $days = [];
    foreach ($templates as $t) {
        $days[$t['day_key']] = [
            'group_name'    => $t['group_name'],
            'notes'         => $t['notes'],
            'template_key'  => $t['template_key'],
            'migrated_from' => $t['migrated_from'],
            'start_time'    => $t['start_time'],
            'end_time'      => $t['end_time'],
            'duration_min'  => $t['duration_min'] !== null ? (int) $t['duration_min'] : null,
            'exercises'     => [],
        ];
    }

    $stmt = $pdo->prepare(
        'SELECT id, day_key, ' . (catalog_ready_wh($pdo) ? 'user_exercise_id' : 'NULL AS user_exercise_id') . ', name, ' . (original_name_ready($pdo) ? 'original_name' : 'NULL AS original_name') . ', kg, reps, series, note, done
         FROM exercises WHERE week_id = :week_id ORDER BY day_key, sort_order, id'
    );
    $stmt->execute(['week_id' => $weekId]);
    foreach ($stmt->fetchAll() as $row) {
        $row['id'] = (int) $row['id'];
        $row['user_exercise_id'] = $row['user_exercise_id'] !== null ? (int) $row['user_exercise_id'] : null;
        $row['done'] = (bool) $row['done'];
        $days[$row['day_key']]['exercises'][] = $row;
    }

    $stmtNote = $pdo->prepare('SELECT note FROM weeks WHERE id = :id');
    $stmtNote->execute(['id' => $weekId]);
    $note = $stmtNote->fetchColumn();

    return ['monday_date' => $mondayDate, 'note' => $note ?: '', 'days' => $days];
}

/**
 * Misma forma que fetch_week_detail(), para todas las semanas a la vez,
 * en 4 queries totales en vez de 3 por semana. Reemplaza el patrón previo
 * del frontend (una petición HTTP por semana en loadAppData(), vía
 * Promise.all) que en cuentas con muchas semanas terminaba lanzando
 * decenas de peticiones simultáneas — en hosting compartido eso agotaba
 * el cupo de procesos PHP/el lock del archivo de sesión y producía una
 * mezcla de 504 (timeout) y 401 (sesión no reconocida a tiempo) justo
 * después de loguearse. Devuelve { order: [...fechas desc], weeks: {
 * [monday_date]: detalle } }.
 */
function fetch_all_weeks_detail(PDO $pdo): array
{
    $weekRows = $pdo->query('SELECT id, monday_date, note FROM weeks ORDER BY monday_date DESC')->fetchAll();
    if (!$weekRows) {
        return ['order' => [], 'weeks' => []];
    }

    $withGroups = split_schema_ready($pdo);
    $templates = $pdo->query(
        $withGroups
        ? 'SELECT day_key, group_name, notes, template_key FROM day_templates ORDER BY sort_order'
        : 'SELECT day_key, group_name, notes, NULL AS template_key FROM day_templates ORDER BY sort_order'
    )->fetchAll();

    $groupsByWeek = [];
    if ($withGroups) {
        foreach ($pdo->query('SELECT week_id, day_key, group_name, notes, template_key FROM week_day_groups') as $row) {
            $groupsByWeek[$row['week_id']][$row['day_key']] = $row;
        }
    }

    $overridesByWeek = [];
    $stmtOverrides = $pdo->query(
        $withGroups
        ? 'SELECT week_id, day_key, group_name, notes, template_key, migrated_from FROM week_day_overrides'
        : 'SELECT week_id, day_key, group_name, notes, NULL AS template_key, migrated_from FROM week_day_overrides'
    );
    foreach ($stmtOverrides as $row) {
        $overridesByWeek[$row['week_id']][$row['day_key']] = $row;
    }

    $sessionsByWeek = [];
    $stmtSessions = $pdo->query('SELECT week_id, day_key, start_time, end_time, duration_min FROM week_day_sessions');
    foreach ($stmtSessions as $row) {
        $sessionsByWeek[$row['week_id']][$row['day_key']] = $row;
    }

    $exercisesByWeek = [];
    $stmtExercises = $pdo->query(
        'SELECT id, week_id, day_key, ' . (catalog_ready_wh($pdo) ? 'user_exercise_id' : 'NULL AS user_exercise_id') . ', name, ' . (original_name_ready($pdo) ? 'original_name' : 'NULL AS original_name') . ', kg, reps, series, note, done
         FROM exercises ORDER BY week_id, day_key, sort_order, id'
    );
    foreach ($stmtExercises as $row) {
        $row['id'] = (int) $row['id'];
        $row['user_exercise_id'] = $row['user_exercise_id'] !== null ? (int) $row['user_exercise_id'] : null;
        $row['done'] = (bool) $row['done'];
        $weekId = $row['week_id'];
        $dayKey = $row['day_key'];
        unset($row['week_id']);
        $exercisesByWeek[$weekId][$dayKey][] = $row;
    }

    $order = [];
    $weeks = [];
    foreach ($weekRows as $w) {
        $weekId = $w['id'];
        $mondayDate = $w['monday_date'];
        $order[] = $mondayDate;

        $days = [];
        foreach ($templates as $t) {
            $dayKey = $t['day_key'];
            $override = $overridesByWeek[$weekId][$dayKey] ?? null;
            $frozen = $groupsByWeek[$weekId][$dayKey] ?? null;
            $session = $sessionsByWeek[$weekId][$dayKey] ?? null;
            $base = $frozen ?? $t; // grupo congelado de la semana, o el split vigente si no hay
            $days[$dayKey] = [
                'group_name'    => $override ? $override['group_name'] : $base['group_name'],
                'notes'         => $override ? ($override['notes'] ?? $t['notes']) : $base['notes'],
                'template_key'  => $override ? $override['template_key'] : $base['template_key'],
                'migrated_from' => $override ? $override['migrated_from'] : null,
                'start_time'    => $session ? $session['start_time'] : null,
                'end_time'      => $session ? $session['end_time'] : null,
                'duration_min'  => $session && $session['duration_min'] !== null ? (int) $session['duration_min'] : null,
                'exercises'     => $exercisesByWeek[$weekId][$dayKey] ?? [],
            ];
        }

        $weeks[$mondayDate] = ['monday_date' => $mondayDate, 'note' => $w['note'] ?: '', 'days' => $days];
    }

    return ['order' => $order, 'weeks' => $weeks];
}
