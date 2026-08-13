<?php
declare(strict_types=1);

/**
 * Backup automático: vuelca todas las semanas a un JSON con el mismo
 * formato que exporta el frontend (Perfil > Exportar datos), en
 * api/db/backups/. Pensado para correr semanalmente vía cron (cPanel >
 * Cron Jobs no necesita acceso SSH, ver README). Guarda solo los
 * últimos BACKUP_RETENTION archivos y borra el resto.
 *
 * Uso: php backup_export.php
 */

if (PHP_SAPI !== 'cli') {
    http_response_code(403);
    exit('Este script solo se puede ejecutar por línea de comandos.');
}

require __DIR__ . '/../config.php';

const BACKUP_RETENTION = 14;
$backupDir = __DIR__ . '/backups';
if (!is_dir($backupDir)) {
    mkdir($backupDir, 0750, true);
}

const DAY_KEYS = ['lun', 'mar', 'mie', 'jue', 'vie', 'sab', 'dom'];

$weeks = $pdo->query('SELECT id, monday_date, note FROM weeks ORDER BY monday_date')->fetchAll();
$payload = [];
$exStmt = $pdo->prepare('SELECT day_key, name, kg, reps, series, note, done FROM exercises WHERE week_id = :w ORDER BY day_key, sort_order, id');
$ovStmt = $pdo->prepare('SELECT day_key, group_name, notes, migrated_from FROM week_day_overrides WHERE week_id = :w');
$sessStmt = $pdo->prepare('SELECT day_key, start_time, end_time, duration_min FROM week_day_sessions WHERE week_id = :w');

foreach ($weeks as $w) {
    $weekId = (int) $w['id'];

    $exByDay = [];
    $exStmt->execute(['w' => $weekId]);
    foreach ($exStmt->fetchAll() as $row) {
        $exByDay[$row['day_key']][] = [
            'name' => $row['name'], 'kg' => $row['kg'], 'reps' => $row['reps'],
            'series' => $row['series'], 'note' => $row['note'], 'done' => (bool) $row['done'],
        ];
    }

    $sessStmt->execute(['w' => $weekId]);
    $sessByDay = [];
    foreach ($sessStmt->fetchAll() as $s) {
        $sessByDay[$s['day_key']] = $s;
    }

    // Cada día se exporta como {exercises, start_time?, end_time?,
    // duration_min?} — los campos de horario solo se incluyen si hay dato,
    // mismo criterio que ya usa "note"/"overrides" acá abajo.
    $days = [];
    foreach (DAY_KEYS as $dayKey) {
        $day = ['exercises' => $exByDay[$dayKey] ?? []];
        $sess = $sessByDay[$dayKey] ?? null;
        if ($sess) {
            if ($sess['start_time'] !== null) $day['start_time'] = $sess['start_time'];
            if ($sess['end_time'] !== null) $day['end_time'] = $sess['end_time'];
            if ($sess['duration_min'] !== null) $day['duration_min'] = (int) $sess['duration_min'];
        }
        $days[$dayKey] = $day;
    }
    $entry = ['monday_date' => $w['monday_date'], 'note' => $w['note'] ?? '', 'days' => (object) $days];

    $ovStmt->execute(['w' => $weekId]);
    $overrides = [];
    foreach ($ovStmt->fetchAll() as $o) {
        $overrides[$o['day_key']] = ['group_name' => $o['group_name'], 'notes' => $o['notes'], 'migrated_from' => $o['migrated_from']];
    }
    if ($overrides) {
        $entry['overrides'] = (object) $overrides;
    }
    $payload[] = $entry;
}

$filename = sprintf('%s/backup-%s.json', $backupDir, date('Y-m-d-His'));
file_put_contents($filename, json_encode($payload, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
echo "Backup escrito: {$filename} (" . count($payload) . " semanas)\n";

$files = glob($backupDir . '/backup-*.json');
sort($files);
$excess = count($files) - BACKUP_RETENTION;
for ($i = 0; $i < $excess; $i++) {
    unlink($files[$i]);
    echo "Eliminado backup viejo: {$files[$i]}\n";
}
