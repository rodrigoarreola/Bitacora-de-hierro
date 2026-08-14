<?php
/**
 * Conexión PDO + arranque de sesión. Todo endpoint bajo api/ empieza
 * con `require __DIR__ . '/config.php';`.
 */

declare(strict_types=1);

$localConfig = __DIR__ . '/config.local.php';
if (!is_file($localConfig)) {
    http_response_code(500);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['ok' => false, 'error' => 'Falta api/config.local.php. Copia config.local.php.example y complétalo.']);
    exit;
}
require $localConfig;

$isHttps = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
    || (($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https');

// Sesión persistente: 30 días. App de un solo usuario en su propio
// dispositivo, así que se prioriza no tener que iniciar sesión seguido
// por encima del riesgo de una sesión larga.
const SESSION_LIFETIME = 30 * 24 * 60 * 60;
ini_set('session.gc_maxlifetime', (string) SESSION_LIFETIME);

session_set_cookie_params([
    'lifetime' => SESSION_LIFETIME,
    'path'     => '/',
    'domain'   => '',
    'secure'   => $isHttps,
    'httponly' => true,
    'samesite' => 'Lax',
]);
session_start();

try {
    $pdo = new PDO(
        'mysql:host=' . DB_HOST . ';dbname=' . DB_NAME . ';charset=utf8mb4',
        DB_USER,
        DB_PASS,
        [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES   => false,
        ]
    );
} catch (PDOException $e) {
    http_response_code(500);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['ok' => false, 'error' => 'No se pudo conectar a la base de datos.']);
    exit;
}

// Bypass de login solo para desarrollo local: requiere las tres cosas a la
// vez — PHP_SAPI === 'cli-server' (el servidor embebido de `php -S`, nunca
// lo que corre Hostgator/Apache/PHP-FPM en producción), la constante
// DEV_AUTOLOGIN definida en config.local.php (gitignored, por entorno — no
// existe copia en git ni en el servidor real salvo que alguien la agregue a
// mano) y que la request venga de localhost. Con las tres, auto-loguea al
// único usuario que existe (no hay nada que elegir, es un solo usuario).
if (
    empty($_SESSION['user_id'])
    && PHP_SAPI === 'cli-server'
    && defined('DEV_AUTOLOGIN') && DEV_AUTOLOGIN === true
    && in_array($_SERVER['REMOTE_ADDR'] ?? '', ['127.0.0.1', '::1'], true)
) {
    $devUser = $pdo->query('SELECT id FROM users LIMIT 1')->fetch();
    if ($devUser) {
        $_SESSION['user_id'] = (int) $devUser['id'];
    }
}
