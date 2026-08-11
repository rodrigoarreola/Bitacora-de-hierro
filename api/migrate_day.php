<?php
declare(strict_types=1);

require __DIR__ . '/config.php';
require __DIR__ . '/auth.php';
require __DIR__ . '/week_helpers.php';

require_login();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    respond_error('Método no permitido.', 405);
}

const MIGRATE_DAY_KEYS = ['lun', 'mar', 'mie', 'jue', 'vie', 'sab', 'dom'];

/**
 * Mueve todos los ejercicios de un día a otro dentro de la misma semana
 * (mismo group_name/notes, mismo estado done). Se bloquea si el día
 * destino ya tiene ejercicios — nada de merge ni sobreescritura.
 */

$body = read_json_body();
$mondayDate = trim((string) ($body['monday_date'] ?? ''));
$fromDay = trim((string) ($body['from_day'] ?? ''));
$toDay = trim((string) ($body['to_day'] ?? ''));

if (!in_array($fromDay, MIGRATE_DAY_KEYS, true) || !in_array($toDay, MIGRATE_DAY_KEYS, true)) {
    respond_error('from_day/to_day inválidos.', 422);
}
if ($fromDay === $toDay) {
    respond_error('El día de origen y destino no pueden ser el mismo.', 422);
}
if (!is_monday($mondayDate)) {
    respond_error('monday_date debe ser una fecha ISO (YYYY-MM-DD) que caiga en lunes.', 422);
}

$weekId = find_week_id($pdo, $mondayDate);
if ($weekId === null) {
    respond_error('Semana no encontrada.', 404);
}

$countStmt = $pdo->prepare('SELECT COUNT(*) FROM exercises WHERE week_id = :w AND day_key = :d');

$countStmt->execute(['w' => $weekId, 'd' => $fromDay]);
if ((int) $countStmt->fetchColumn() === 0) {
    respond_error('El día de origen no tiene ejercicios para migrar.', 422);
}

$countStmt->execute(['w' => $weekId, 'd' => $toDay]);
if ((int) $countStmt->fetchColumn() > 0) {
    respond_error('El día destino ya tiene ejercicios. Muévelos o bórralos antes de migrar.', 409);
}

$pdo->beginTransaction();
try {
    $effective = $pdo->prepare(
        'SELECT COALESCE(wo.group_name, dt.group_name) AS group_name,
                COALESCE(wo.notes, dt.notes) AS notes
         FROM day_templates dt
         LEFT JOIN week_day_overrides wo ON wo.week_id = :w AND wo.day_key = dt.day_key
         WHERE dt.day_key = :from_day'
    );
    $effective->execute(['w' => $weekId, 'from_day' => $fromDay]);
    $source = $effective->fetch();

    $upsert = $pdo->prepare(
        'INSERT INTO week_day_overrides (week_id, day_key, group_name, notes, migrated_from)
         VALUES (:w, :to_day, :group_name, :notes, :from_day)
         ON DUPLICATE KEY UPDATE group_name = VALUES(group_name), notes = VALUES(notes), migrated_from = VALUES(migrated_from)'
    );
    $upsert->execute([
        'w'          => $weekId,
        'to_day'     => $toDay,
        'group_name' => $source['group_name'],
        'notes'      => $source['notes'],
        'from_day'   => $fromDay,
    ]);

    $pdo->prepare('DELETE FROM week_day_overrides WHERE week_id = :w AND day_key = :from_day')
        ->execute(['w' => $weekId, 'from_day' => $fromDay]);

    $pdo->prepare('UPDATE exercises SET day_key = :to_day WHERE week_id = :w AND day_key = :from_day')
        ->execute(['w' => $weekId, 'to_day' => $toDay, 'from_day' => $fromDay]);

    $pdo->commit();
} catch (Throwable $e) {
    $pdo->rollBack();
    respond_error('Error al migrar el día, no se guardó nada: ' . $e->getMessage(), 500);
}

respond_ok(fetch_week_detail($pdo, $weekId, $mondayDate));
