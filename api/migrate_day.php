<?php
declare(strict_types=1);

require __DIR__ . '/config.php';
require __DIR__ . '/auth.php';
require __DIR__ . '/week_helpers.php';

require_login();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    respond_error('Método no permitido.', 405);
}

const MIGRATE_DAY_ORDER = ['lun', 'mar', 'mie', 'jue', 'vie', 'sab', 'dom'];
const MIGRATE_DAY_LABELS = [
    'lun' => 'Lunes', 'mar' => 'Martes', 'mie' => 'Miércoles', 'jue' => 'Jueves',
    'vie' => 'Viernes', 'sab' => 'Sábado', 'dom' => 'Domingo',
];

/**
 * Mueve el contenido de from_day a to_day dentro de la misma semana,
 * con to_day estrictamente posterior a from_day. Si to_day (o algún día
 * entre medio) ya tiene ejercicios, esos días se recorren un lugar hacia
 * adelante en cadena hasta encontrar un día vacío — no se bloquea solo
 * por haber contenido, salvo que ese contenido ya esté marcado como
 * hecho (eso nunca se mueve solo) o no quede espacio en la semana.
 */

function move_day_content(PDO $pdo, int $weekId, string $fromKey, string $toKey): void
{
    // Mismo orden de prioridad que fetch_week_detail(): override > grupo
    // congelado de la semana (week_day_groups) > split vigente.
    if (split_schema_ready($pdo)) {
        $effective = $pdo->prepare(
            'SELECT COALESCE(wo.group_name, wg.group_name, dt.group_name) AS group_name,
                    CASE WHEN wo.week_id IS NOT NULL THEN COALESCE(wo.notes, dt.notes)
                         WHEN wg.week_id IS NOT NULL THEN wg.notes
                         ELSE dt.notes END AS notes,
                    CASE WHEN wo.week_id IS NOT NULL THEN wo.template_key
                         WHEN wg.week_id IS NOT NULL THEN wg.template_key
                         ELSE dt.template_key END AS template_key
             FROM day_templates dt
             LEFT JOIN week_day_overrides wo ON wo.week_id = :w AND wo.day_key = dt.day_key
             LEFT JOIN week_day_groups wg ON wg.week_id = :w2 AND wg.day_key = dt.day_key
             WHERE dt.day_key = :from_day'
        );
        $effective->execute(['w' => $weekId, 'w2' => $weekId, 'from_day' => $fromKey]);
    } else {
        $effective = $pdo->prepare(
            'SELECT COALESCE(wo.group_name, dt.group_name) AS group_name,
                    COALESCE(wo.notes, dt.notes) AS notes
             FROM day_templates dt
             LEFT JOIN week_day_overrides wo ON wo.week_id = :w AND wo.day_key = dt.day_key
             WHERE dt.day_key = :from_day'
        );
        $effective->execute(['w' => $weekId, 'from_day' => $fromKey]);
    }
    $source = $effective->fetch();

    if (split_schema_ready($pdo)) {
        $upsert = $pdo->prepare(
            'INSERT INTO week_day_overrides (week_id, day_key, group_name, notes, template_key, migrated_from)
             VALUES (:w, :to_day, :group_name, :notes, :template_key, :from_day)
             ON DUPLICATE KEY UPDATE group_name = VALUES(group_name), notes = VALUES(notes),
                                     template_key = VALUES(template_key), migrated_from = VALUES(migrated_from)'
        );
        $upsert->execute([
            'w'            => $weekId,
            'to_day'       => $toKey,
            'group_name'   => $source['group_name'],
            'notes'        => $source['notes'],
            'template_key' => $source['template_key'],
            'from_day'     => $fromKey,
        ]);
    } else {
        $upsert = $pdo->prepare(
            'INSERT INTO week_day_overrides (week_id, day_key, group_name, notes, migrated_from)
             VALUES (:w, :to_day, :group_name, :notes, :from_day)
             ON DUPLICATE KEY UPDATE group_name = VALUES(group_name), notes = VALUES(notes), migrated_from = VALUES(migrated_from)'
        );
        $upsert->execute([
            'w'          => $weekId,
            'to_day'     => $toKey,
            'group_name' => $source['group_name'],
            'notes'      => $source['notes'],
            'from_day'   => $fromKey,
        ]);
    }

    $pdo->prepare('DELETE FROM week_day_overrides WHERE week_id = :w AND day_key = :from_day')
        ->execute(['w' => $weekId, 'from_day' => $fromKey]);

    $pdo->prepare('UPDATE exercises SET day_key = :to_day WHERE week_id = :w AND day_key = :from_day')
        ->execute(['w' => $weekId, 'to_day' => $toKey, 'from_day' => $fromKey]);
}

$body = read_json_body();
$mondayDate = trim((string) ($body['monday_date'] ?? ''));
$fromDay = trim((string) ($body['from_day'] ?? ''));
$toDay = trim((string) ($body['to_day'] ?? ''));

$fromIdx = array_search($fromDay, MIGRATE_DAY_ORDER, true);
$toIdx = array_search($toDay, MIGRATE_DAY_ORDER, true);
if ($fromIdx === false || $toIdx === false) {
    respond_error('from_day/to_day inválidos.', 422);
}
if ($toIdx <= $fromIdx) {
    respond_error('El día destino debe ser posterior al de origen, dentro de la misma semana.', 422);
}
if (!is_monday($mondayDate)) {
    respond_error('monday_date debe ser una fecha ISO (YYYY-MM-DD) que caiga en lunes.', 422);
}

$weekId = find_week_id($pdo, $mondayDate);
if ($weekId === null) {
    respond_error('Semana no encontrada.', 404);
}

$countStmt = $pdo->prepare('SELECT COUNT(*) FROM exercises WHERE week_id = :w AND day_key = :d');
$doneCountStmt = $pdo->prepare('SELECT COUNT(*) FROM exercises WHERE week_id = :w AND day_key = :d AND done = 1');

$countStmt->execute(['w' => $weekId, 'd' => $fromDay]);
if ((int) $countStmt->fetchColumn() === 0) {
    respond_error('El día de origen no tiene ejercicios para migrar.', 422);
}

// Camina la cadena desde to_day hacia adelante: cada día ocupado se
// agrega a la cola de "hay que recorrerlo un lugar más", hasta dar con
// un día vacío (el hueco final) o quedarse sin semana.
$chain = [];
$cursor = $toIdx;
while (true) {
    $cursorKey = MIGRATE_DAY_ORDER[$cursor];
    $countStmt->execute(['w' => $weekId, 'd' => $cursorKey]);
    if ((int) $countStmt->fetchColumn() === 0) {
        break;
    }
    $doneCountStmt->execute(['w' => $weekId, 'd' => $cursorKey]);
    if ((int) $doneCountStmt->fetchColumn() > 0) {
        respond_error(
            'No se puede migrar: "' . MIGRATE_DAY_LABELS[$cursorKey] . '" ya tiene ejercicios marcados como hechos, no se puede recorrer.',
            409
        );
    }
    $chain[] = $cursorKey;
    $cursor++;
    if ($cursor >= count(MIGRATE_DAY_ORDER)) {
        respond_error('La semana ya está completa hasta el domingo, no hay espacio para migrar.', 409);
    }
}
$emptySlot = MIGRATE_DAY_ORDER[$cursor];

$pdo->beginTransaction();
try {
    for ($i = count($chain) - 1; $i >= 0; $i--) {
        $src = $chain[$i];
        $dst = ($i === count($chain) - 1) ? $emptySlot : $chain[$i + 1];
        move_day_content($pdo, $weekId, $src, $dst);
    }
    move_day_content($pdo, $weekId, $fromDay, $toDay);
    $pdo->commit();
} catch (Throwable $e) {
    $pdo->rollBack();
    respond_error('Error al migrar el día, no se guardó nada: ' . $e->getMessage(), 500);
}

respond_ok(array_merge(fetch_week_detail($pdo, $weekId, $mondayDate), ['shifted' => count($chain)]));
