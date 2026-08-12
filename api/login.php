<?php
declare(strict_types=1);

require __DIR__ . '/config.php';
require __DIR__ . '/auth.php';

// Bloqueo por intentos fallidos. Sin tracking de IP a propósito — hay una
// sola cuenta posible de todos modos, así que un contador por cuenta ya
// cubre el riesgo real (la app está expuesta públicamente en
// tu-dominio.com/bitacora, sin este límite antes).
const LOGIN_MAX_ATTEMPTS = 5;
const LOGIN_LOCKOUT_MINUTES = 15;

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    respond_error('Método no permitido.', 405);
}

$body = read_json_body();
$username = trim((string) ($body['username'] ?? ''));
$password = (string) ($body['password'] ?? '');

if ($username === '' || $password === '') {
    respond_error('Usuario y contraseña son requeridos.', 422);
}

// is_locked se calcula con el NOW() de MySQL, no comparado después en PHP
// con strtotime() — el mismo desfase de zona horaria PHP-vs-MySQL que ya
// causó un bug real en el last-write-wins de la edición offline (ver
// CHANGELOG 1.14.0) aplicaría igual acá si se comparara del lado de PHP.
$stmt = $pdo->prepare(
    'SELECT id, password_hash, failed_attempts,
            (locked_until IS NOT NULL AND locked_until > NOW()) AS is_locked
     FROM users WHERE username = :username'
);
$stmt->execute(['username' => $username]);
$user = $stmt->fetch();

if ($user && (bool) $user['is_locked']) {
    respond_error('Demasiados intentos. Probá de nuevo en unos minutos.', 429);
}

if (!$user || !password_verify($password, $user['password_hash'])) {
    // Solo actualiza si el username existe — mismo mensaje/forma de
    // respuesta que un password incorrecto, para no revelar si la cuenta
    // existe con el comportamiento del endpoint.
    if ($user) {
        // OJO: en un UPDATE de MySQL las asignaciones del SET se evalúan de
        // izquierda a derecha, así que para cuando el CASE lee
        // failed_attempts acá ya ve el valor NUEVO (post +1), no el viejo —
        // por eso la condición compara contra :max directo, sin sumar 1 de
        // nuevo. Sumarlo (como en un primer intento de esta query) dispara
        // el bloqueo un intento antes de lo esperado; encontrado corriendo
        // el flujo real de 5 intentos fallidos durante la verificación.
        $pdo->prepare(
            'UPDATE users
             SET failed_attempts = failed_attempts + 1,
                 locked_until = CASE WHEN failed_attempts >= :max
                                      THEN DATE_ADD(NOW(), INTERVAL :minutes MINUTE)
                                      ELSE locked_until END
             WHERE id = :id'
        )->execute([
            'max' => LOGIN_MAX_ATTEMPTS,
            'minutes' => LOGIN_LOCKOUT_MINUTES,
            'id' => $user['id'],
        ]);
    }
    respond_error('Usuario o contraseña incorrectos.', 401);
}

$pdo->prepare('UPDATE users SET failed_attempts = 0, locked_until = NULL WHERE id = :id')
    ->execute(['id' => $user['id']]);

session_regenerate_id(true);
$_SESSION['user_id'] = (int) $user['id'];

respond_ok(['authenticated' => true]);
