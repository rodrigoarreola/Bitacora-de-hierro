<?php
declare(strict_types=1);

/**
 * Traductor EN->ES por plantillas para nombres del dataset
 * hasaneyldrm/exercises-dataset. No es un traductor general — es un
 * diccionario de vocabulario de gimnasio (equipo/modificador/movimiento)
 * más una recomposición simple "{movimiento} {modificadores} con
 * {equipo}". Si después de sacar equipo+modificadores+movimiento queda
 * texto en inglés sin traducir, se descarta la traducción entera (nunca
 * se devuelve una mezcla de idiomas) y el caller usa el nombre original
 * en inglés como fallback.
 */

const EX_EQUIP = [
    'leverage machine' => 'máquina', 'resistance band' => 'banda', 'stability ball' => 'balón',
    'exercise ball' => 'balón', 'medicine ball' => 'balón medicinal', 'sled machine' => 'prensa',
    'olympic barbell' => 'barra olímpica', 'trap bar' => 'barra hexagonal', 'ez barbell' => 'barra Z',
    'ez bar' => 'barra Z', 'body weight' => 'peso corporal', 'wheel roller' => 'rueda abdominal',
    'stepmill machine' => 'escaladora', 'stationary bike' => 'bicicleta', 'elliptical machine' => 'elíptica',
    'vibrate plate' => 'plataforma vibratoria', 'barbell' => 'barra', 'dumbbells' => 'mancuernas',
    'dumbbell' => 'mancuerna', 'cable' => 'polea', 'lever' => 'máquina', 'smith' => 'multipower',
    'sled' => 'prensa', 'kettlebell' => 'pesa rusa', 'band' => 'banda', 'assisted' => 'asistido',
    'weighted' => 'con peso', 'rope' => 'cuerda', 'roller' => 'rodillo', 'tire' => 'llanta',
];

const EX_MODS = [
    'close-grip' => 'agarre cerrado', 'close grip' => 'agarre cerrado', 'wide-grip' => 'agarre ancho',
    'wide grip' => 'agarre ancho', 'reverse grip' => 'agarre invertido', 'narrow grip' => 'agarre estrecho',
    'parallel grip' => 'agarre paralelo', 'neutral grip' => 'agarre neutro', 'bent over' => 'inclinado',
    'bent-over' => 'inclinado', 'behind the head' => 'detrás de la cabeza', 'behind head' => 'detrás de la cabeza',
    'on exercise ball' => 'en balón', 'with support' => 'con apoyo', 'with arm blaster' => 'con arm blaster',
    '(v-bar)' => '(barra V)', '(rope attachment)' => '(con cuerda)', '(pro lat bar)' => '(barra recta)',
    '(back pov)' => '', '(side pov)' => '', '(front pov)' => '', 'palms up' => 'palmas arriba',
    'palms down' => 'palmas abajo', 'single leg' => 'a una pierna', 'one leg' => 'a una pierna',
    'single arm' => 'a un brazo', 'v. 2' => '(v.2)', 'v. 3' => '(v.3)', 'seated' => 'sentado',
    'standing' => 'de pie', 'lying' => 'acostado', 'kneeling' => 'arrodillado', 'incline' => 'inclinado',
    'decline' => 'declinado', 'flat' => 'plano', 'overhead' => 'sobre la cabeza', 'one arm' => 'a una mano',
    'two arm' => 'a dos manos', 'alternate' => 'alterno', 'alternating' => 'alterno', 'narrow' => 'estrecho',
    'wide' => 'ancho', 'pronated' => 'pronado', 'supinated' => 'supinado', 'underhand' => 'agarre supino',
    'overhand' => 'agarre prono', 'reverse' => 'invertido',
];

const EX_MOVES = [
    'incline bench press' => 'press de banca inclinado', 'decline bench press' => 'press de banca declinado',
    'bench press' => 'press de banca', 'shoulder press' => 'press militar', 'overhead press' => 'press militar',
    'military press' => 'press militar', 'leg press' => 'prensa de piernas', 'leg extension' => 'extensión de cuádriceps',
    'leg curl' => 'curl femoral', 'calf raise' => 'elevación de talones', 'calf press' => 'prensa de pantorrilla',
    'hip thrusts' => 'empuje de cadera', 'hip thrust' => 'empuje de cadera', 'glute bridge' => 'puente de glúteos',
    'hip abduction' => 'abducción de cadera', 'hip adduction' => 'aducción de cadera', 'wrist curl' => 'curl de muñeca',
    'hammer curl' => 'curl martillo', 'preacher curl' => 'curl predicador', 'concentration curl' => 'curl concentrado',
    'biceps curl' => 'curl de bíceps', 'bicep curl' => 'curl de bíceps', 'triceps pushdown' => 'extensión de tríceps en polea',
    'tricep pushdown' => 'extensión de tríceps en polea', 'triceps extension' => 'extensión de tríceps',
    'tricep kickback' => 'patada de tríceps', 'triceps kickback' => 'patada de tríceps', 'lateral raise' => 'elevación lateral',
    'front raise' => 'elevación frontal', 'rear lateral raise' => 'elevación lateral posterior', 'reverse fly' => 'apertura invertida',
    'chest fly' => 'apertura de pecho', 'flye' => 'apertura', 'fly' => 'apertura', 'upright row' => 'remo al mentón',
    'bent over row' => 'remo inclinado', 'one arm row' => 'remo a una mano', 't-bar row' => 'remo con barra T',
    'seated row' => 'remo sentado', 'low row' => 'remo bajo', 'high row' => 'remo alto', 'lat pulldown' => 'jalón al pecho',
    'pulldown' => 'jalón', 'pull-up' => 'dominada', 'pull up' => 'dominada', 'chin-up' => 'dominada supina',
    'chin up' => 'dominada supina', 'full squat' => 'sentadilla libre', 'hack squat' => 'hack squat',
    'single leg squat' => 'sentadilla a una pierna', 'split squat' => 'sentadilla búlgara', 'front squat' => 'sentadilla frontal',
    'back squat' => 'sentadilla trasera', 'romanian deadlift' => 'peso muerto rumano',
    'stiff leg deadlift' => 'peso muerto piernas rígidas', 'sumo deadlift' => 'peso muerto sumo', 'deadlift' => 'peso muerto',
    'shrug' => 'encogimiento de hombros', 'dips' => 'fondos', 'dip' => 'fondo', 'lunge' => 'zancada',
    'crunch' => 'abdominal', 'sit-up' => 'abdominal', 'sit up' => 'abdominal', 'leg raise' => 'elevación de piernas',
    'plank' => 'plancha', 'skullcrusher' => 'press francés', 'skull crusher' => 'press francés',
    'french press' => 'press francés', 'good morning' => 'buenos días',
];

function ex_strip_tokens(string $text, array $dict): array
{
    $keys = array_keys($dict);
    usort($keys, fn($a, $b) => strlen($b) <=> strlen($a));
    $found = [];
    foreach ($keys as $k) {
        $pos = stripos($text, $k);
        if ($pos !== false) {
            if ($dict[$k] !== '') {
                $found[] = $dict[$k];
            }
            $text = substr_replace($text, ' ', $pos, strlen($k));
        }
    }
    return [$text, $found];
}

/**
 * @return array{0:string,1:string} [nombre_es, 'alta'|'baja']
 */
function translate_exercise_name(string $name): array
{
    $n = ' ' . strtolower($name) . ' ';
    [$n, $equip] = ex_strip_tokens($n, EX_EQUIP);
    // Las frases de movimiento van antes que los modificadores: varias
    // frases de MOVES contienen palabras que también son modificadores
    // sueltos (p. ej. "bent over row" vs el modificador "bent over"), y
    // si el modificador se saca primero se pierde la frase compuesta.
    [$n, $moves] = ex_strip_tokens($n, EX_MOVES);
    [$n2, $mods] = ex_strip_tokens($n, EX_MODS);
    $leftover = trim(preg_replace('/\s+/', ' ', $n2));

    if (empty($moves) || $leftover !== '') {
        return [$name, 'baja'];
    }

    $core = implode(' ', $moves);
    $parts = [$core];
    if (!empty($mods)) {
        $parts[] = implode(' ', $mods);
    }
    $label = trim(implode(' ', $parts));
    // Algunas frases de movimiento ya incluyen el equipo en su traducción
    // (p. ej. "extensión de tríceps EN POLEA" para "cable ... pushdown") —
    // no repetirlo como sufijo "con X" si ya aparece en el texto.
    if (!empty($equip) && stripos($label, $equip[0]) === false) {
        $label .= ' con ' . $equip[0];
    }
    $label = ucfirst($label);

    return [$label, 'alta'];
}
