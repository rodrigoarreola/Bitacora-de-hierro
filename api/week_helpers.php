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
 * group_name/notes de un día vienen de day_templates (valor por
 * defecto) salvo que exista un override para esa semana (creado al
 * migrar un día a otro) — en ese caso el override manda. migrated_from
 * (solo presente en el override) le dice al frontend de qué día vino
 * el contenido, para que el cálculo de racha no cuente el día de
 * origen como fallido.
 */
function fetch_week_detail(PDO $pdo, int $weekId, string $mondayDate): array
{
    $stmtTemplates = $pdo->prepare(
        'SELECT dt.day_key,
                COALESCE(wo.group_name, dt.group_name) AS group_name,
                COALESCE(wo.notes, dt.notes) AS notes,
                wo.migrated_from
         FROM day_templates dt
         LEFT JOIN week_day_overrides wo
           ON wo.week_id = :week_id AND wo.day_key = dt.day_key
         ORDER BY dt.sort_order'
    );
    $stmtTemplates->execute(['week_id' => $weekId]);
    $templates = $stmtTemplates->fetchAll();

    $days = [];
    foreach ($templates as $t) {
        $days[$t['day_key']] = [
            'group_name'    => $t['group_name'],
            'notes'         => $t['notes'],
            'migrated_from' => $t['migrated_from'],
            'exercises'     => [],
        ];
    }

    $stmt = $pdo->prepare(
        'SELECT id, day_key, name, kg, reps, series, note, done
         FROM exercises WHERE week_id = :week_id ORDER BY day_key, sort_order, id'
    );
    $stmt->execute(['week_id' => $weekId]);
    foreach ($stmt->fetchAll() as $row) {
        $row['id'] = (int) $row['id'];
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

    $templates = $pdo->query(
        'SELECT day_key, group_name, notes FROM day_templates ORDER BY sort_order'
    )->fetchAll();

    $overridesByWeek = [];
    $stmtOverrides = $pdo->query('SELECT week_id, day_key, group_name, notes, migrated_from FROM week_day_overrides');
    foreach ($stmtOverrides as $row) {
        $overridesByWeek[$row['week_id']][$row['day_key']] = $row;
    }

    $exercisesByWeek = [];
    $stmtExercises = $pdo->query(
        'SELECT id, week_id, day_key, name, kg, reps, series, note, done
         FROM exercises ORDER BY week_id, day_key, sort_order, id'
    );
    foreach ($stmtExercises as $row) {
        $row['id'] = (int) $row['id'];
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
            $days[$dayKey] = [
                'group_name'    => $override ? $override['group_name'] : $t['group_name'],
                'notes'         => $override && $override['notes'] !== null ? $override['notes'] : $t['notes'],
                'migrated_from' => $override ? $override['migrated_from'] : null,
                'exercises'     => $exercisesByWeek[$weekId][$dayKey] ?? [],
            ];
        }

        $weeks[$mondayDate] = ['monday_date' => $mondayDate, 'note' => $w['note'] ?: '', 'days' => $days];
    }

    return ['order' => $order, 'weeks' => $weeks];
}
