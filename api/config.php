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

// Cookie "recordarme": el `ini_set` de arriba solo afecta la limpieza
// probabilística que el propio proceso PHP podría disparar al llamar
// session_start() — el barrido real de archivos de sesión viejos en
// hosting compartido lo suele hacer un cron aparte que lee el
// gc_maxlifetime del php.ini del servidor, no el que este script fija en
// caliente. Cuando ese cron borra el archivo antes de los 30 días
// prometidos, $_SESSION queda vacío aunque la cookie de sesión siga siendo
// válida — se ve como "la sesión se cerró sola a las pocas horas". Esta
// segunda cookie, con un token propio guardado (con hash) en `users`, no
// depende de que el archivo de sesión sobreviva: la controla enteramente
// esta app. Ver ADR 0017.
const REMEMBER_COOKIE = 'remember_token';

function set_remember_cookie(string $token, bool $isHttps): void
{
    setcookie(REMEMBER_COOKIE, $token, [
        'expires'  => time() + SESSION_LIFETIME,
        'path'     => '/',
        'domain'   => '',
        'secure'   => $isHttps,
        'httponly' => true,
        'samesite' => 'Lax',
    ]);
}

function clear_remember_cookie(bool $isHttps): void
{
    setcookie(REMEMBER_COOKIE, '', [
        'expires'  => time() - 3600,
        'path'     => '/',
        'domain'   => '',
        'secure'   => $isHttps,
        'httponly' => true,
        'samesite' => 'Lax',
    ]);
}

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
    // ORDER BY id: con datos por usuario (user_exercises, ADR 0021) importa
    // cuál; sin orden, MariaDB puede devolver otro usuario de prueba.
    $devUser = $pdo->query('SELECT id FROM users ORDER BY id LIMIT 1')->fetch();
    if ($devUser) {
        $_SESSION['user_id'] = (int) $devUser['id'];
    }
}

// Respaldo de "recordarme": si la sesión de PHP no tiene user_id (por lo
// descrito arriba, o simplemente porque el navegador nunca mandó
// PHPSESSID — otra cookie, otro dispositivo), el token propio la
// reestablece sin pedir login de nuevo.
//
// No se rota el valor del token en cada uso — a propósito: esta app dispara
// varias requests en paralelo al cargar (Promise.all en loadAppData()), y
// rotar el token en cada una correría a que la primera en responder
// invalide el hash que las demás ya están por comparar. En cambio, el
// valor es fijo desde el login (o desde el último "recordarme" exitoso) y
// solo se extiende remember_token_expires — ventana deslizante sin ese
// riesgo de carrera, porque todas las requests en paralelo comparan
// siempre contra el mismo hash.
// try/catch a propósito: si remember_token_hash/expires todavía no existen
// en esta BD (deploy sin el ALTER TABLE todavía), el respaldo simplemente
// no hace nada — la sesión normal sigue exactamente igual que antes.
if (empty($_SESSION['user_id']) && !empty($_COOKIE[REMEMBER_COOKIE])) {
    try {
        $tokenHash = hash('sha256', $_COOKIE[REMEMBER_COOKIE]);
        $stmt = $pdo->prepare(
            'SELECT id FROM users
             WHERE remember_token_hash = :hash AND remember_token_expires > NOW()'
        );
        $stmt->execute(['hash' => $tokenHash]);
        $remembered = $stmt->fetch();
        if ($remembered) {
            $_SESSION['user_id'] = (int) $remembered['id'];
            $pdo->prepare(
                'UPDATE users SET remember_token_expires = DATE_ADD(NOW(), INTERVAL :sec SECOND) WHERE id = :id'
            )->execute(['sec' => SESSION_LIFETIME, 'id' => $remembered['id']]);
            set_remember_cookie($_COOKIE[REMEMBER_COOKIE], $isHttps);
        } else {
            // Token inexistente/expirado: nada que hacer del lado de la BD,
            // pero sí conviene borrar la cookie para no seguir mandándola.
            clear_remember_cookie($isHttps);
        }
    } catch (PDOException $e) {
        // Columnas inexistentes todavía — se ignora.
    }
}
