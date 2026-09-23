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
//   sugerido ejercicio a proponer si tu historial no tiene ninguno para esos
//            targets — de preferencia un nombre que ya esté en
//            data/exercise-name-mapping.json, para que cuente como cubierto.
//
// SPLITS: presets que asignan a cada día de la semana un grupo (nombre que
// se ve en la app) y una plantilla (plan: clave de DAY_PLANS, o null = sin
// guía). Elegir uno en Ajustes escribe estos valores en day_templates.
window.SPLIT_CATALOG = (function(){
  const DAY_PLANS = {
    pecho_triceps: { label: 'Pecho y Tríceps', slots: [
      { targets: ['pectorals'], label: 'Pecho', tipo: 'compuesto', series: '4', reps: '6–8', sugerido: 'Press de banca con barra' },
      { targets: ['pectorals'], label: 'Pecho (inclinado)', tipo: 'compuesto', series: '3', reps: '8–10', sugerido: 'Press de banca inclinado con barra' },
      { targets: ['pectorals'], label: 'Pecho', tipo: 'aislamiento', series: '3', reps: '10–12', sugerido: 'Apertura inclinado con mancuerna' },
      { targets: ['triceps'], label: 'Tríceps', tipo: 'aislamiento', series: '3', reps: '10–12', sugerido: 'Extensión de tríceps en polea' },
      { targets: ['triceps'], label: 'Tríceps', tipo: 'aislamiento', series: '3', reps: '10–12', sugerido: 'Extensión de tríceps detrás de la cabeza agarre cerrado acostado con barra Z' },
    ]},
    espalda_biceps: { label: 'Espalda y Bíceps', slots: [
      { targets: ['lats'], label: 'Dorsales', tipo: 'compuesto', series: '4', reps: '6–10', sugerido: 'Jalón (barra recta) con polea' },
      { targets: ['upper back', 'lats'], label: 'Espalda (remo)', tipo: 'compuesto', series: '3', reps: '8–10', sugerido: 'Remo con barra T invertido con máquina' },
      { targets: ['upper back', 'lats'], label: 'Espalda (remo)', tipo: 'compuesto', series: '3', reps: '10–12', sugerido: 'Remo sentado con polea' },
      { targets: ['biceps'], label: 'Bíceps', tipo: 'aislamiento', series: '3', reps: '10–12', sugerido: 'Curl de bíceps con mancuerna' },
      { targets: ['biceps'], label: 'Bíceps', tipo: 'aislamiento', series: '3', reps: '10–12', sugerido: 'Curl martillo con mancuerna' },
    ]},
    hombro: { label: 'Hombros', slots: [
      { targets: ['delts'], label: 'Hombro', tipo: 'compuesto', series: '4', reps: '6–10', sugerido: 'Press militar sentado con mancuerna' },
      { targets: ['delts'], label: 'Deltoides lateral', tipo: 'aislamiento', series: '3', reps: '12–15', sugerido: 'Elevación lateral con mancuerna' },
      { targets: ['delts'], label: 'Deltoides posterior', tipo: 'aislamiento', series: '3', reps: '12–15', sugerido: 'Apertura invertida sentado con máquina' },
      { targets: ['delts', 'traps'], label: 'Deltoides / trapecio', tipo: 'aislamiento', series: '3', reps: '10–12', sugerido: 'Elevación frontal con mancuerna' },
    ]},
    pierna: { label: 'Pierna', slots: [
      { targets: ['quads', 'glutes'], label: 'Cuádriceps / glúteo', tipo: 'compuesto', series: '4', reps: '6–8', sugerido: 'Sentadilla libre con barra' },
      { targets: ['quads', 'glutes'], label: 'Cuádriceps / glúteo', tipo: 'compuesto', series: '3', reps: '10–12', sugerido: 'Prensa de piernas 45°' },
      { targets: ['hamstrings'], label: 'Isquiotibiales', tipo: 'aislamiento', series: '3', reps: '10–12', sugerido: 'Curl femoral acostado con máquina' },
      { targets: ['glutes', 'hamstrings'], label: 'Cadena posterior', tipo: 'compuesto', series: '3', reps: '8–10', sugerido: 'Peso muerto rumano con mancuerna' },
      { targets: ['quads'], label: 'Cuádriceps', tipo: 'aislamiento', series: '3', reps: '12–15', sugerido: 'Extensión de cuádriceps con máquina' },
      { targets: ['calves'], label: 'Pantorrilla', tipo: 'aislamiento', series: '3', reps: '12–15', sugerido: 'Elevación de pantorrillas sentado con máquina' },
    ]},
    empuje: { label: 'Empuje', slots: [
      { targets: ['pectorals'], label: 'Pecho', tipo: 'compuesto', series: '4', reps: '6–8', sugerido: 'Press de banca con barra' },
      { targets: ['delts'], label: 'Hombro', tipo: 'compuesto', series: '3', reps: '8–10', sugerido: 'Press militar sentado con mancuerna' },
      { targets: ['pectorals'], label: 'Pecho (inclinado)', tipo: 'compuesto', series: '3', reps: '8–10', sugerido: 'Press de banca inclinado con mancuerna' },
      { targets: ['delts'], label: 'Deltoides lateral', tipo: 'aislamiento', series: '3', reps: '12–15', sugerido: 'Elevación lateral con mancuerna' },
      { targets: ['triceps'], label: 'Tríceps', tipo: 'aislamiento', series: '3', reps: '10–12', sugerido: 'Extensión de tríceps en polea' },
    ]},
    jalon: { label: 'Jalón', slots: [
      { targets: ['lats'], label: 'Dorsales', tipo: 'compuesto', series: '4', reps: '6–10', sugerido: 'Jalón (barra recta) con polea' },
      { targets: ['upper back', 'lats'], label: 'Espalda (remo)', tipo: 'compuesto', series: '3', reps: '8–10', sugerido: 'Remo con barra T invertido con máquina' },
      { targets: ['upper back', 'lats'], label: 'Espalda (remo)', tipo: 'compuesto', series: '3', reps: '10–12', sugerido: 'Remo a una mano con mancuerna' },
      { targets: ['delts'], label: 'Deltoides posterior', tipo: 'aislamiento', series: '3', reps: '12–15', sugerido: 'Apertura invertida sentado con máquina' },
      { targets: ['biceps'], label: 'Bíceps', tipo: 'aislamiento', series: '3', reps: '10–12', sugerido: 'Curl de bíceps con mancuerna' },
      { targets: ['biceps'], label: 'Bíceps', tipo: 'aislamiento', series: '2', reps: '10–12', sugerido: 'Curl martillo con mancuerna' },
    ]},
    torso: { label: 'Torso', slots: [
      { targets: ['pectorals'], label: 'Pecho', tipo: 'compuesto', series: '3', reps: '6–8', sugerido: 'Press de banca con barra' },
      { targets: ['lats'], label: 'Dorsales', tipo: 'compuesto', series: '3', reps: '8–10', sugerido: 'Jalón (barra recta) con polea' },
      { targets: ['delts'], label: 'Hombro', tipo: 'compuesto', series: '3', reps: '8–10', sugerido: 'Press militar sentado con mancuerna' },
      { targets: ['upper back', 'lats'], label: 'Espalda (remo)', tipo: 'compuesto', series: '3', reps: '8–10', sugerido: 'Remo sentado con polea' },
      { targets: ['biceps'], label: 'Bíceps', tipo: 'aislamiento', series: '2', reps: '10–12', sugerido: 'Curl de bíceps con mancuerna' },
      { targets: ['triceps'], label: 'Tríceps', tipo: 'aislamiento', series: '2', reps: '10–12', sugerido: 'Extensión de tríceps en polea' },
    ]},
    torso_fuerza: { label: 'Torso fuerza', slots: [
      { targets: ['pectorals'], label: 'Pecho', tipo: 'compuesto', series: '4', reps: '4–6', sugerido: 'Press de banca con barra' },
      { targets: ['upper back', 'lats'], label: 'Espalda (remo)', tipo: 'compuesto', series: '4', reps: '4–6', sugerido: 'Remo con barra T invertido con máquina' },
      { targets: ['delts'], label: 'Hombro', tipo: 'compuesto', series: '3', reps: '5–8', sugerido: 'Press militar sentado con mancuerna' },
      { targets: ['lats'], label: 'Dorsales', tipo: 'compuesto', series: '3', reps: '5–8', sugerido: 'Jalón agarre cerrado con maneral en V' },
      { targets: ['biceps'], label: 'Bíceps', tipo: 'aislamiento', series: '2', reps: '6–10', sugerido: 'Curl de bíceps con mancuerna' },
      { targets: ['triceps'], label: 'Tríceps', tipo: 'aislamiento', series: '2', reps: '6–10', sugerido: 'Extensión de tríceps detrás de la cabeza agarre cerrado acostado con barra Z' },
    ]},
    torso_hipertrofia: { label: 'Torso hipertrofia', slots: [
      { targets: ['pectorals'], label: 'Pecho (inclinado)', tipo: 'compuesto', series: '3', reps: '8–12', sugerido: 'Press de banca inclinado con mancuerna' },
      { targets: ['upper back', 'lats'], label: 'Espalda (remo)', tipo: 'compuesto', series: '3', reps: '8–12', sugerido: 'Remo sentado con polea' },
      { targets: ['delts'], label: 'Deltoides lateral', tipo: 'aislamiento', series: '3', reps: '12–15', sugerido: 'Elevación lateral con mancuerna' },
      { targets: ['pectorals'], label: 'Pecho', tipo: 'aislamiento', series: '3', reps: '12–15', sugerido: 'Apertura inclinado con mancuerna' },
      { targets: ['lats'], label: 'Dorsales', tipo: 'compuesto', series: '3', reps: '10–12', sugerido: 'Jalón (barra recta) con polea' },
      { targets: ['biceps'], label: 'Bíceps', tipo: 'aislamiento', series: '3', reps: '10–15', sugerido: 'Curl predicador con barra' },
      { targets: ['triceps'], label: 'Tríceps', tipo: 'aislamiento', series: '3', reps: '10–15', sugerido: 'Extensión de tríceps en polea' },
    ]},
    pierna_fuerza: { label: 'Pierna fuerza', slots: [
      { targets: ['quads', 'glutes'], label: 'Cuádriceps / glúteo', tipo: 'compuesto', series: '4', reps: '4–6', sugerido: 'Sentadilla libre con barra' },
      { targets: ['glutes', 'hamstrings'], label: 'Cadena posterior', tipo: 'compuesto', series: '3', reps: '6–8', sugerido: 'Peso muerto rumano con mancuerna' },
      { targets: ['quads', 'glutes'], label: 'Cuádriceps / glúteo', tipo: 'compuesto', series: '3', reps: '8–10', sugerido: 'Prensa de piernas 45°' },
      { targets: ['hamstrings'], label: 'Isquiotibiales', tipo: 'aislamiento', series: '3', reps: '8–10', sugerido: 'Curl femoral acostado con máquina' },
      { targets: ['calves'], label: 'Pantorrilla', tipo: 'aislamiento', series: '3', reps: '8–12', sugerido: 'Elevación de pantorrillas sentado con máquina' },
    ]},
    pierna_hipertrofia: { label: 'Pierna hipertrofia', slots: [
      { targets: ['quads', 'glutes'], label: 'Cuádriceps / glúteo', tipo: 'compuesto', series: '3', reps: '8–12', sugerido: 'Hack squat con prensa' },
      { targets: ['quads'], label: 'Cuádriceps', tipo: 'aislamiento', series: '3', reps: '12–15', sugerido: 'Extensión de cuádriceps con máquina' },
      { targets: ['hamstrings'], label: 'Isquiotibiales', tipo: 'aislamiento', series: '3', reps: '10–15', sugerido: 'Curl femoral sentado con máquina' },
      { targets: ['glutes'], label: 'Glúteo', tipo: 'compuesto', series: '3', reps: '10–12', sugerido: 'Extensión de cadera en máquina' },
      { targets: ['calves'], label: 'Pantorrilla', tipo: 'aislamiento', series: '3', reps: '12–15', sugerido: 'Elevación de pantorrillas sentado con máquina' },
    ]},
    full_body: { label: 'Full Body', slots: [
      { targets: ['quads', 'glutes'], label: 'Cuádriceps / glúteo', tipo: 'compuesto', series: '3', reps: '8–10', sugerido: 'Sentadilla libre con barra' },
      { targets: ['pectorals'], label: 'Pecho', tipo: 'compuesto', series: '3', reps: '8–10', sugerido: 'Press de banca con barra' },
      { targets: ['lats', 'upper back'], label: 'Espalda', tipo: 'compuesto', series: '3', reps: '8–10', sugerido: 'Jalón (barra recta) con polea' },
      { targets: ['delts'], label: 'Hombro', tipo: 'compuesto', series: '2', reps: '10–12', sugerido: 'Press militar con máquina' },
      { targets: ['hamstrings'], label: 'Isquiotibiales', tipo: 'aislamiento', series: '2', reps: '10–12', sugerido: 'Curl femoral acostado con máquina' },
    ]},
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

  return { DAY_PLANS, SPLITS };
})();
