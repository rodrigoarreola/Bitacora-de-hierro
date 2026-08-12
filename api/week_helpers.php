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
