<?php
/**
 * Importa semanas desde un JSON con la forma:
 * [ { "monday_date": "YYYY-MM-DD", "days": { "lun": [ {name,kg,reps,series,note,done}, ... ], ... } }, ... ]
 *
 * Uso: php import_weeks_json.php <ruta.json> [--commit]
 * Sin --commit solo muestra un resumen (no toca la base). Solo CLI.
 */

declare(strict_types=1);

if (PHP_SAPI !== 'cli') {
    http_response_code(403);
    exit('Este script solo se puede ejecutar por línea de comandos.');
}

$args = array_slice($argv, 1);
$commit = in_array('--commit', $args, true);
$args = array_values(array_filter($args, fn($a) => $a !== '--commit'));

if (count($args) !== 1) {
    fwrite(STDERR, "Uso: php import_weeks_json.php <ruta.json> [--commit]\n");
    exit(1);
}

$jsonPath = $args[0];
if (!is_file($jsonPath)) {
    fwrite(STDERR, "No se encontró el archivo: {$jsonPath}\n");
    exit(1);
}

$weeks = json_decode(file_get_contents($jsonPath), true);
if (!is_array($weeks)) {
    fwrite(STDERR, "JSON inválido.\n");
    exit(1);
}

const DAY_KEYS = ['lun', 'mar', 'mie', 'jue', 'vie'];

$totalWeeks = 0;
$totalExercises = 0;
foreach ($weeks as $w) {
    $mondayDate = $w['monday_date'];
    $d = DateTime::createFromFormat('Y-m-d', $mondayDate);
    if (!$d || $d->format('Y-m-d') !== $mondayDate || $d->format('N') !== '1') {
        fwrite(STDERR, "Fecha inválida (no es lunes): {$mondayDate}\n");
        exit(1);
    }
    $count = 0;
    foreach (DAY_KEYS as $dk) {
        $count += count($w['days'][$dk] ?? []);
    }
    echo "{$mondayDate}: {$count} ejercicios\n";
    $totalWeeks++;
    $totalExercises += $count;
}
echo "\nTotal: {$totalWeeks} semanas, {$totalExercises} ejercicios.\n";

if (!$commit) {
    echo "\n(Solo vista previa. Vuelve a correr con --commit al final para escribir en la base.)\n";
    exit(0);
}

require __DIR__ . '/../config.php';

$findWeek = $pdo->prepare('SELECT id FROM weeks WHERE monday_date = :d');
$insertWeek = $pdo->prepare('INSERT INTO weeks (monday_date) VALUES (:d)');
$insertEx = $pdo->prepare(
    'INSERT INTO exercises (week_id, day_key, name, kg, reps, series, note, done, sort_order)
     VALUES (:week_id, :day_key, :name, :kg, :reps, :series, :note, :done, :sort_order)'
);
$libCheck = $pdo->prepare('SELECT id FROM exercise_library WHERE LOWER(name) = LOWER(:name)');
$libInsert = $pdo->prepare('INSERT INTO exercise_library (name) VALUES (:name)');

$pdo->beginTransaction();

foreach ($weeks as $w) {
    $mondayDate = $w['monday_date'];

    $findWeek->execute(['d' => $mondayDate]);
    $weekId = $findWeek->fetchColumn();
    if ($weekId === false) {
        $insertWeek->execute(['d' => $mondayDate]);
        $weekId = (int) $pdo->lastInsertId();
    } else {
        $weekId = (int) $weekId;
    }

    foreach (DAY_KEYS as $dayKey) {
        $sortOrder = 0;
        foreach (($w['days'][$dayKey] ?? []) as $e) {
            $insertEx->execute([
                'week_id'    => $weekId,
                'day_key'    => $dayKey,
                'name'       => $e['name'],
                'kg'         => $e['kg'],
                'reps'       => $e['reps'],
                'series'     => $e['series'],
                'note'       => $e['note'],
                'done'       => $e['done'] ? 1 : 0,
                'sort_order' => $sortOrder++,
            ]);

            if ($e['name'] !== '') {
                $libCheck->execute(['name' => $e['name']]);
                if ($libCheck->fetchColumn() === false) {
                    $libInsert->execute(['name' => $e['name']]);
                }
            }
        }
    }
}

$pdo->commit();
echo "\nImportado: {$totalWeeks} semanas.\n";
