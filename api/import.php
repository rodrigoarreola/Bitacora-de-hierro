<?php
declare(strict_types=1);

require __DIR__ . '/config.php';
require __DIR__ . '/auth.php';

require_login();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    respond_error('Método no permitido.', 405);
}

const DAY_KEYS = ['lun', 'mar', 'mie', 'jue', 'vie'];

/**
 * Importa una lista de semanas: [{monday_date, days:{lun..vie:[{name,kg,reps,series,note,done}]}}].
 * Semana que ya existe (mismo monday_date) se reemplaza por completo
 * (se borran sus ejercicios actuales y se insertan los del archivo).
 * Semanas que no vienen en el archivo quedan intactas. Todo o nada:
 * se valida la forma completa antes de escribir nada en la base.
 */

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
    foreach (DAY_KEYS as $dayKey) {
        if (!isset($w['days'][$dayKey]) || !is_array($w['days'][$dayKey])) {
            respond_error("Semana {$mondayDate}: falta el día \"{$dayKey}\".", 422);
        }
        foreach ($w['days'][$dayKey] as $e) {
            if (!is_array($e) || !array_key_exists('name', $e)) {
                respond_error("Semana {$mondayDate}, día {$dayKey}: ejercicio con formato inválido.", 422);
            }
        }
    }
}

$findWeek = $pdo->prepare('SELECT id FROM weeks WHERE monday_date = :d');
$insertWeek = $pdo->prepare('INSERT INTO weeks (monday_date) VALUES (:d)');
$deleteExercises = $pdo->prepare('DELETE FROM exercises WHERE week_id = :w');
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
        }

        foreach (DAY_KEYS as $dayKey) {
            $sortOrder = 0;
            foreach ($w['days'][$dayKey] as $e) {
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

                if ($name !== '') {
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
