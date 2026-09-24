// Catálogo de splits y plantillas de día (ADR 0018). Datos estáticos, sin
// lógica: js/app.js los lee para el panel "Split" de Ajustes y para la
// "Guía del día" en Hoy.
//
// DAY_PLANS: qué necesita cada tipo de día, como lista de "huecos". Un hueco
// no es un ejercicio fijo sino un músculo + tipo + series×reps de referencia
// (solo guía — nunca se escriben en los campos reps/series):
//   targets  valores de `target` del dataset (data/exercises-dataset.json) que
//            cubren el hueco. Es lista porque el dataset clasifica sentadilla,
//            prensa y hack squat como `glutes`, no `quads`.
//   label    nombre del hueco en pantalla.
//   tipo     'compuesto' | 'aislamiento'.
//   sugerido id del ejercicio en el catálogo (catalog_exercises, ADR 0021) a
//            proponer para ese hueco; se usa el ejercicio del usuario
//            vinculado a ese id, y si no tiene uno, se ofrece del catálogo
//            con su nombre de SUGGESTED_NAMES.
//
// SPLITS: presets que asignan a cada día de la semana un grupo (nombre que
// se ve en la app) y una plantilla (plan: clave de DAY_PLANS, o null = sin
// guía). Elegir uno en Ajustes escribe estos valores en day_templates.
window.SPLIT_CATALOG = (function(){
  const DAY_PLANS = {
    pecho_triceps: { label: 'Pecho y Tríceps', slots: [
      { targets: ['pectorals'], label: 'Pecho', tipo: 'compuesto', series: '4', reps: '6–8', sugerido: 25 },
      { targets: ['pectorals'], label: 'Pecho (inclinado)', tipo: 'compuesto', series: '3', reps: '8–10', sugerido: 47 },
      { targets: ['pectorals'], label: 'Pecho', tipo: 'aislamiento', series: '3', reps: '10–12', sugerido: 319 },
      { targets: ['triceps'], label: 'Tríceps', tipo: 'aislamiento', series: '3', reps: '10–12', sugerido: 201 },
      { targets: ['triceps'], label: 'Tríceps', tipo: 'aislamiento', series: '3', reps: '10–12', sugerido: 1748 },
    ]},
    espalda_biceps: { label: 'Espalda y Bíceps', slots: [
      { targets: ['lats'], label: 'Dorsales', tipo: 'compuesto', series: '4', reps: '6–10', sugerido: 197 },
      { targets: ['upper back', 'lats'], label: 'Espalda (remo)', tipo: 'compuesto', series: '3', reps: '8–10', sugerido: 1349 },
      { targets: ['upper back', 'lats'], label: 'Espalda (remo)', tipo: 'compuesto', series: '3', reps: '10–12', sugerido: 1323 },
      { targets: ['biceps'], label: 'Bíceps', tipo: 'aislamiento', series: '3', reps: '10–12', sugerido: 294 },
      { targets: ['biceps'], label: 'Bíceps', tipo: 'aislamiento', series: '3', reps: '10–12', sugerido: 313 },
    ]},
    hombro: { label: 'Hombros', slots: [
      { targets: ['delts'], label: 'Hombro', tipo: 'compuesto', series: '4', reps: '6–10', sugerido: 405 },
      { targets: ['delts'], label: 'Deltoides lateral', tipo: 'aislamiento', series: '3', reps: '12–15', sugerido: 334 },
      { targets: ['delts'], label: 'Deltoides posterior', tipo: 'aislamiento', series: '3', reps: '12–15', sugerido: 602 },
      { targets: ['delts', 'traps'], label: 'Deltoides / trapecio', tipo: 'aislamiento', series: '3', reps: '10–12', sugerido: 310 },
    ]},
    pierna: { label: 'Pierna', slots: [
      { targets: ['quads', 'glutes'], label: 'Cuádriceps / glúteo', tipo: 'compuesto', series: '4', reps: '6–8', sugerido: 43 },
      { targets: ['quads', 'glutes'], label: 'Cuádriceps / glúteo', tipo: 'compuesto', series: '3', reps: '10–12', sugerido: 1463 },
      { targets: ['hamstrings'], label: 'Isquiotibiales', tipo: 'aislamiento', series: '3', reps: '10–12', sugerido: 586 },
      { targets: ['glutes', 'hamstrings'], label: 'Cadena posterior', tipo: 'compuesto', series: '3', reps: '8–10', sugerido: 1459 },
      { targets: ['quads'], label: 'Cuádriceps', tipo: 'aislamiento', series: '3', reps: '12–15', sugerido: 585 },
      { targets: ['calves'], label: 'Pantorrilla', tipo: 'aislamiento', series: '3', reps: '12–15', sugerido: 594 },
    ]},
    empuje: { label: 'Empuje', slots: [
      { targets: ['pectorals'], label: 'Pecho', tipo: 'compuesto', series: '4', reps: '6–8', sugerido: 25 },
      { targets: ['delts'], label: 'Hombro', tipo: 'compuesto', series: '3', reps: '8–10', sugerido: 405 },
      { targets: ['pectorals'], label: 'Pecho (inclinado)', tipo: 'compuesto', series: '3', reps: '8–10', sugerido: 314 },
      { targets: ['delts'], label: 'Deltoides lateral', tipo: 'aislamiento', series: '3', reps: '12–15', sugerido: 334 },
      { targets: ['triceps'], label: 'Tríceps', tipo: 'aislamiento', series: '3', reps: '10–12', sugerido: 201 },
    ]},
    jalon: { label: 'Jalón', slots: [
      { targets: ['lats'], label: 'Dorsales', tipo: 'compuesto', series: '4', reps: '6–10', sugerido: 197 },
      { targets: ['upper back', 'lats'], label: 'Espalda (remo)', tipo: 'compuesto', series: '3', reps: '8–10', sugerido: 1349 },
      { targets: ['upper back', 'lats'], label: 'Espalda (remo)', tipo: 'compuesto', series: '3', reps: '10–12', sugerido: 292 },
      { targets: ['delts'], label: 'Deltoides posterior', tipo: 'aislamiento', series: '3', reps: '12–15', sugerido: 602 },
      { targets: ['biceps'], label: 'Bíceps', tipo: 'aislamiento', series: '3', reps: '10–12', sugerido: 294 },
      { targets: ['biceps'], label: 'Bíceps', tipo: 'aislamiento', series: '2', reps: '10–12', sugerido: 313 },
    ]},
    torso: { label: 'Torso', slots: [
      { targets: ['pectorals'], label: 'Pecho', tipo: 'compuesto', series: '3', reps: '6–8', sugerido: 25 },
      { targets: ['lats'], label: 'Dorsales', tipo: 'compuesto', series: '3', reps: '8–10', sugerido: 197 },
      { targets: ['delts'], label: 'Hombro', tipo: 'compuesto', series: '3', reps: '8–10', sugerido: 405 },
      { targets: ['upper back', 'lats'], label: 'Espalda (remo)', tipo: 'compuesto', series: '3', reps: '8–10', sugerido: 1323 },
      { targets: ['biceps'], label: 'Bíceps', tipo: 'aislamiento', series: '2', reps: '10–12', sugerido: 294 },
      { targets: ['triceps'], label: 'Tríceps', tipo: 'aislamiento', series: '2', reps: '10–12', sugerido: 201 },
    ]},
    torso_fuerza: { label: 'Torso fuerza', slots: [
      { targets: ['pectorals'], label: 'Pecho', tipo: 'compuesto', series: '4', reps: '4–6', sugerido: 25 },
      { targets: ['upper back', 'lats'], label: 'Espalda (remo)', tipo: 'compuesto', series: '4', reps: '4–6', sugerido: 1349 },
      { targets: ['delts'], label: 'Hombro', tipo: 'compuesto', series: '3', reps: '5–8', sugerido: 405 },
      { targets: ['lats'], label: 'Dorsales', tipo: 'compuesto', series: '3', reps: '5–8', sugerido: 2616 },
      { targets: ['biceps'], label: 'Bíceps', tipo: 'aislamiento', series: '2', reps: '6–10', sugerido: 294 },
      { targets: ['triceps'], label: 'Tríceps', tipo: 'aislamiento', series: '2', reps: '6–10', sugerido: 1748 },
    ]},
    torso_hipertrofia: { label: 'Torso hipertrofia', slots: [
      { targets: ['pectorals'], label: 'Pecho (inclinado)', tipo: 'compuesto', series: '3', reps: '8–12', sugerido: 314 },
      { targets: ['upper back', 'lats'], label: 'Espalda (remo)', tipo: 'compuesto', series: '3', reps: '8–12', sugerido: 1323 },
      { targets: ['delts'], label: 'Deltoides lateral', tipo: 'aislamiento', series: '3', reps: '12–15', sugerido: 334 },
      { targets: ['pectorals'], label: 'Pecho', tipo: 'aislamiento', series: '3', reps: '12–15', sugerido: 319 },
      { targets: ['lats'], label: 'Dorsales', tipo: 'compuesto', series: '3', reps: '10–12', sugerido: 197 },
      { targets: ['biceps'], label: 'Bíceps', tipo: 'aislamiento', series: '3', reps: '10–15', sugerido: 70 },
      { targets: ['triceps'], label: 'Tríceps', tipo: 'aislamiento', series: '3', reps: '10–15', sugerido: 201 },
    ]},
    pierna_fuerza: { label: 'Pierna fuerza', slots: [
      { targets: ['quads', 'glutes'], label: 'Cuádriceps / glúteo', tipo: 'compuesto', series: '4', reps: '4–6', sugerido: 43 },
      { targets: ['glutes', 'hamstrings'], label: 'Cadena posterior', tipo: 'compuesto', series: '3', reps: '6–8', sugerido: 1459 },
      { targets: ['quads', 'glutes'], label: 'Cuádriceps / glúteo', tipo: 'compuesto', series: '3', reps: '8–10', sugerido: 1463 },
      { targets: ['hamstrings'], label: 'Isquiotibiales', tipo: 'aislamiento', series: '3', reps: '8–10', sugerido: 586 },
      { targets: ['calves'], label: 'Pantorrilla', tipo: 'aislamiento', series: '3', reps: '8–12', sugerido: 594 },
    ]},
    pierna_hipertrofia: { label: 'Pierna hipertrofia', slots: [
      { targets: ['quads', 'glutes'], label: 'Cuádriceps / glúteo', tipo: 'compuesto', series: '3', reps: '8–12', sugerido: 743 },
      { targets: ['quads'], label: 'Cuádriceps', tipo: 'aislamiento', series: '3', reps: '12–15', sugerido: 585 },
      { targets: ['hamstrings'], label: 'Isquiotibiales', tipo: 'aislamiento', series: '3', reps: '10–15', sugerido: 599 },
      { targets: ['glutes'], label: 'Glúteo', tipo: 'compuesto', series: '3', reps: '10–12', sugerido: 2286 },
      { targets: ['calves'], label: 'Pantorrilla', tipo: 'aislamiento', series: '3', reps: '12–15', sugerido: 594 },
    ]},
    full_body: { label: 'Full Body', slots: [
      { targets: ['quads', 'glutes'], label: 'Cuádriceps / glúteo', tipo: 'compuesto', series: '3', reps: '8–10', sugerido: 43 },
      { targets: ['pectorals'], label: 'Pecho', tipo: 'compuesto', series: '3', reps: '8–10', sugerido: 25 },
      { targets: ['lats', 'upper back'], label: 'Espalda', tipo: 'compuesto', series: '3', reps: '8–10', sugerido: 197 },
      { targets: ['delts'], label: 'Hombro', tipo: 'compuesto', series: '2', reps: '10–12', sugerido: 587 },
      { targets: ['hamstrings'], label: 'Isquiotibiales', tipo: 'aislamiento', series: '2', reps: '10–12', sugerido: 586 },
    ]},
  };

  // Nombre en el catálogo de cada ejercicio sugerido (id → name_es de
  // catalog_exercises), para ofrecerlo aunque el usuario todavía no lo tenga
  // entre sus ejercicios. Generado desde la base; si cambia un sugerido,
  // agregar aquí su nombre.
  const SUGGESTED_NAMES = {
    25: "Press de banca con barra",
    43: "Sentadilla libre con barra",
    47: "Press de banca inclinado con barra",
    70: "Curl predicador con barra",
    197: "Jalón (barra recta) con polea",
    201: "Extensión de tríceps en polea",
    292: "Remo a una mano con mancuerna",
    294: "Curl de bíceps con mancuerna",
    310: "Elevación frontal con mancuerna",
    313: "Curl martillo con mancuerna",
    314: "Press de banca inclinado con mancuerna",
    319: "Apertura inclinado con mancuerna",
    334: "Elevación lateral con mancuerna",
    405: "Press militar sentado con mancuerna",
    585: "Extensión de cuádriceps con máquina",
    586: "Curl femoral acostado con máquina",
    587: "Press militar con máquina",
    594: "Elevación de talones sentado con máquina",
    599: "Curl femoral sentado con máquina",
    602: "Apertura invertida sentado con máquina",
    743: "Hack squat con prensa",
    1323: "Remo sentado con cuerda en polea",
    1349: "Remo con barra T invertido con máquina",
    1459: "Peso muerto rumano con mancuerna",
    1463: "Prensa de piernas 45° (vista lateral)",
    1748: "Extensión de tríceps detrás de la cabeza agarre cerrado acostado con barra Z",
    2286: "Extensión de cadera en máquina",
    2616: "Jalón agarre cerrado con maneral en V",
  };

  const REST = { group: 'Descanso', plan: null };
  const RECOVERY = { group: 'Recuperación', plan: null };
  const day = (plan) => ({ group: DAY_PLANS[plan].label, plan });

  const SPLITS = [
    { key: 'bro', label: 'Bro Split', dias_semana: 5,
      desc: 'Un grupo muscular por día. Cada músculo 1× por semana.',
      dias: { lun: day('pecho_triceps'), mar: { group: 'Piernas', plan: 'pierna' }, mie: day('espalda_biceps'),
              jue: day('hombro'), vie: day('full_body'), sab: RECOVERY, dom: REST } },
    { key: 'full_body_3', label: 'Full Body', dias_semana: 3,
      desc: 'Todo el cuerpo en cada sesión, días alternos. Ideal con poco tiempo.',
      dias: { lun: day('full_body'), mar: REST, mie: day('full_body'), jue: REST,
              vie: day('full_body'), sab: RECOVERY, dom: REST } },
    { key: 'upper_lower', label: 'Torso / Pierna', dias_semana: 4,
      desc: 'Upper/Lower: cada músculo 2× por semana. El más equilibrado.',
      dias: { lun: day('torso'), mar: day('pierna'), mie: REST, jue: day('torso'),
              vie: day('pierna'), sab: RECOVERY, dom: REST } },
    { key: 'phul', label: 'PHUL', dias_semana: 4,
      desc: 'Torso/Pierna con 2 días de fuerza y 2 de hipertrofia.',
      dias: { lun: day('torso_fuerza'), mar: day('pierna_fuerza'), mie: REST, jue: day('torso_hipertrofia'),
              vie: day('pierna_hipertrofia'), sab: RECOVERY, dom: REST } },
    { key: 'ulppl', label: 'Torso/Pierna + PPL', dias_semana: 5,
      desc: 'Híbrido de 5 días: Torso, Pierna, Empuje, Jalón, Pierna.',
      dias: { lun: day('torso'), mar: day('pierna'), mie: day('empuje'), jue: day('jalon'),
              vie: day('pierna'), sab: RECOVERY, dom: REST } },
    { key: 'ppl', label: 'Push / Pull / Legs ×2', dias_semana: 6,
      desc: 'Empuje, Jalón y Pierna dos veces. Usa el sábado — ya no queda día de Recuperación.',
      dias: { lun: day('empuje'), mar: day('jalon'), mie: day('pierna'), jue: day('empuje'),
              vie: day('jalon'), sab: day('pierna'), dom: REST } },
  ];

  return { DAY_PLANS, SPLITS, SUGGESTED_NAMES };
})();
