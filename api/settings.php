<?php
declare(strict_types=1);

require __DIR__ . '/config.php';
require __DIR__ . '/auth.php';

require_login();

/**
 * Reglas de negocio editables desde Ajustes. Sin fila en app_settings
 * para una clave = se usa el valor por defecto de aquí abajo, así que
 * la tabla puede empezar vacía. Los rangos (min/max) son el mismo
 * límite que aplica tanto al guardar (PUT) como el que el frontend
 * debería usar en sus inputs — si cambian aquí, cambiar también el
 * min/max de los <input type="number"> en index.html.
 */
const RULES = [
    'min_done_per_day'       => ['default' => 3, 'min' => 1, 'max' => 15],
    'week_streak_min_days'   => ['default' => 5, 'min' => 1, 'max' => 6],
    'milestone_strong_min'   => ['default' => 3, 'min' => 1, 'max' => 6],
    'milestone_min_run_weeks'=> ['default' => 2, 'min' => 1, 'max' => 10],
];

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $rows = $pdo->query('SELECT setting_key, setting_value FROM app_settings')->fetchAll();
    $stored = [];
    foreach ($rows as $r) {
        $stored[$r['setting_key']] = $r['setting_value'];
    }
    $result = [];
    foreach (RULES as $key => $rule) {
        $result[$key] = isset($stored[$key]) ? (int) $stored[$key] : $rule['default'];
    }
    respond_ok($result);
}

if ($method === 'PUT') {
    $body = read_json_body();
    $updates = [];
    foreach ($body as $key => $value) {
        if (!array_key_exists($key, RULES)) {
            respond_error("Regla desconocida: \"{$key}\".", 422);
        }
        if (!is_numeric($value) || (int) $value != $value) {
            respond_error("\"{$key}\" debe ser un número entero.", 422);
        }
        $intVal = (int) $value;
        $rule = RULES[$key];
        if ($intVal < $rule['min'] || $intVal > $rule['max']) {
            respond_error("\"{$key}\" debe estar entre {$rule['min']} y {$rule['max']}.", 422);
        }
        $updates[$key] = $intVal;
    }
    if (empty($updates)) {
        respond_error('No se envió ninguna regla para actualizar.', 422);
    }

    $upsert = $pdo->prepare(
        'INSERT INTO app_settings (setting_key, setting_value) VALUES (:k, :v)
         ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)'
    );
    foreach ($updates as $key => $value) {
        $upsert->execute(['k' => $key, 'v' => (string) $value]);
    }

    $rows = $pdo->query('SELECT setting_key, setting_value FROM app_settings')->fetchAll();
    $stored = [];
    foreach ($rows as $r) {
        $stored[$r['setting_key']] = $r['setting_value'];
    }
    $result = [];
    foreach (RULES as $key => $rule) {
        $result[$key] = isset($stored[$key]) ? (int) $stored[$key] : $rule['default'];
    }
    respond_ok($result);
}

respond_error('Método no permitido.', 405);
