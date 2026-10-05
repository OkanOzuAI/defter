/**
 * Static exercise library. Names stay in English in both languages (gym convention).
 * This is a catalogue to pick from, never a program: no sets, reps or loads live here.
 */

export type Category =
  | 'chest'
  | 'shoulders'
  | 'triceps'
  | 'back'
  | 'biceps'
  | 'quads'
  | 'hamstrings_glutes'
  | 'calves'
  | 'core'

export type Equipment =
  | 'barbell'
  | 'smith'
  | 'dumbbell'
  | 'machine'
  | 'plate_loaded'
  | 'cable'
  | 'bodyweight'
  | 'ez_bar'
  | 'trap_bar'
  | 'safety_bar'
  | 'landmine'
  | 'plate'

export type Muscle =
  | 'chest'
  | 'front_delts'
  | 'side_delts'
  | 'rear_delts'
  | 'traps'
  | 'triceps'
  | 'lats'
  | 'upper_back'
  | 'lower_back'
  | 'biceps'
  | 'forearms'
  | 'quads'
  | 'hamstrings'
  | 'glutes'
  | 'adductors'
  | 'abductors'
  | 'calves'
  | 'abs'
  | 'obliques'

export type Pattern = keyof typeof PATTERNS

/** How the logged weight relates to the load actually moved. */
export type LoadMode = 'total' | 'per_hand' | 'added_bodyweight'

export type Exercise = {
  id: string
  name: string
  category: Category
  equipment: Equipment
  pattern: Pattern
  angle?: string
  grip?: string
  primaryMuscles: Muscle[]
  secondaryMuscles: Muscle[]
  isCompound: boolean
  unilateral: boolean
  loadMode: LoadMode
  /** Smallest usual jump in kg. */
  increment: number
  /** Bar weight in kg; null when the exercise has no bar. Smith = 0: the bar is not logged. */
  barWeight: number | null
  /** Default rest in seconds. */
  restSec: number
  /** Set from the user's data, not the library: */
  custom?: boolean
  hidden?: boolean
  /** The user's own rest time for this exercise; overrides the profile defaults. */
  restOverride?: number
  note?: string
}

export const CATEGORIES: Category[] = [
  'chest',
  'shoulders',
  'triceps',
  'back',
  'biceps',
  'quads',
  'hamstrings_glutes',
  'calves',
  'core',
]

export const EQUIPMENT: Equipment[] = [
  'barbell',
  'smith',
  'dumbbell',
  'machine',
  'plate_loaded',
  'cable',
  'bodyweight',
  'ez_bar',
  'trap_bar',
  'safety_bar',
  'landmine',
  'plate',
]

export const MUSCLES: Muscle[] = [
  'chest',
  'front_delts',
  'side_delts',
  'rear_delts',
  'traps',
  'triceps',
  'lats',
  'upper_back',
  'lower_back',
  'biceps',
  'forearms',
  'quads',
  'hamstrings',
  'glutes',
  'adductors',
  'abductors',
  'calves',
  'abs',
  'obliques',
]

export const REST_COMPOUND_SEC = 180
export const REST_ISOLATION_SEC = 90

type PatternDef = { compound: boolean; primary: Muscle[]; secondary: Muscle[] }

const pattern = (compound: boolean, primary: Muscle[], secondary: Muscle[] = []): PatternDef => ({
  compound,
  primary,
  secondary,
})

/** Movement patterns with the muscles they usually train; single exercises may override. */
const PATTERNS = {
  horizontal_press: pattern(true, ['chest'], ['front_delts', 'triceps']),
  incline_press: pattern(true, ['chest'], ['front_delts', 'triceps']),
  decline_press: pattern(true, ['chest'], ['triceps', 'front_delts']),
  chest_fly: pattern(false, ['chest'], ['front_delts']),
  dip: pattern(true, ['chest'], ['triceps', 'front_delts']),
  vertical_press: pattern(true, ['front_delts'], ['triceps', 'side_delts']),
  lateral_raise: pattern(false, ['side_delts']),
  front_raise: pattern(false, ['front_delts']),
  rear_delt_fly: pattern(false, ['rear_delts'], ['upper_back']),
  upright_row: pattern(true, ['side_delts'], ['traps']),
  shrug: pattern(false, ['traps']),
  triceps_press: pattern(true, ['triceps'], ['chest', 'front_delts']),
  elbow_extension: pattern(false, ['triceps']),
  overhead_extension: pattern(false, ['triceps']),
  vertical_pull: pattern(true, ['lats'], ['biceps', 'upper_back']),
  straight_arm_pull: pattern(false, ['lats']),
  horizontal_pull: pattern(true, ['upper_back', 'lats'], ['biceps', 'rear_delts']),
  deadlift: pattern(true, ['glutes', 'hamstrings', 'lower_back'], ['quads', 'traps', 'forearms']),
  hip_hinge: pattern(true, ['hamstrings', 'glutes'], ['lower_back']),
  back_extension: pattern(false, ['lower_back'], ['glutes', 'hamstrings']),
  curl: pattern(false, ['biceps'], ['forearms']),
  wrist_curl: pattern(false, ['forearms']),
  squat: pattern(true, ['quads', 'glutes'], ['adductors', 'lower_back']),
  machine_squat: pattern(true, ['quads'], ['glutes', 'adductors']),
  leg_press: pattern(true, ['quads'], ['glutes', 'adductors']),
  lunge: pattern(true, ['quads', 'glutes'], ['hamstrings', 'adductors']),
  knee_extension: pattern(false, ['quads']),
  knee_flexion: pattern(false, ['hamstrings']),
  hip_thrust: pattern(true, ['glutes'], ['hamstrings']),
  hip_extension: pattern(false, ['glutes'], ['hamstrings']),
  hip_abduction: pattern(false, ['abductors'], ['glutes']),
  hip_adduction: pattern(false, ['adductors']),
  calf_raise: pattern(false, ['calves']),
  spinal_flexion: pattern(false, ['abs']),
  leg_raise: pattern(false, ['abs']),
  anti_extension: pattern(false, ['abs']),
  rotation: pattern(false, ['obliques'], ['abs']),
} satisfies Record<string, PatternDef>

const EQUIPMENT_DEFAULTS: Record<Equipment, { increment: number; barWeight: number | null }> = {
  barbell: { increment: 2.5, barWeight: 20 },
  smith: { increment: 2.5, barWeight: 0 },
  dumbbell: { increment: 2, barWeight: null },
  machine: { increment: 5, barWeight: null },
  plate_loaded: { increment: 2.5, barWeight: null },
  cable: { increment: 2.5, barWeight: null },
  bodyweight: { increment: 2.5, barWeight: null },
  ez_bar: { increment: 2.5, barWeight: 10 },
  trap_bar: { increment: 2.5, barWeight: 25 },
  safety_bar: { increment: 2.5, barWeight: 30 },
  landmine: { increment: 2.5, barWeight: null },
  plate: { increment: 5, barWeight: null },
}

type Options = {
  angle?: string
  grip?: string
  /** Single-arm / single-leg: logged per side. */
  uni?: boolean
  p?: Muscle[]
  s?: Muscle[]
  compound?: boolean
  load?: LoadMode
  inc?: number
}

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/°/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

function defaultLoadMode(equipment: Equipment): LoadMode {
  if (equipment === 'dumbbell') return 'per_hand'
  if (equipment === 'bodyweight') return 'added_bodyweight'
  return 'total'
}

const list: Exercise[] = []

/** Returns a function that adds exercises to one category. */
function group(category: Category) {
  return (name: string, equipment: Equipment, patternId: Pattern, o: Options = {}) => {
    const def: PatternDef = PATTERNS[patternId]
    const isCompound = o.compound ?? def.compound
    list.push({
      id: slugify(name),
      name,
      category,
      equipment,
      pattern: patternId,
      angle: o.angle,
      grip: o.grip,
      primaryMuscles: o.p ?? def.primary,
      secondaryMuscles: o.s ?? def.secondary,
      isCompound,
      unilateral: o.uni ?? false,
      loadMode: o.load ?? defaultLoadMode(equipment),
      increment: o.inc ?? EQUIPMENT_DEFAULTS[equipment].increment,
      barWeight: EQUIPMENT_DEFAULTS[equipment].barWeight,
      restSec: isCompound ? REST_COMPOUND_SEC : REST_ISOLATION_SEC,
    })
  }
}

// --- Chest -----------------------------------------------------------------
const chest = group('chest')
chest('Barbell Flat Bench Press', 'barbell', 'horizontal_press', { angle: 'flat' })
chest('Barbell Low Incline Bench Press', 'barbell', 'incline_press', { angle: '15–30°' })
chest('Barbell Incline Bench Press', 'barbell', 'incline_press', { angle: '30–45°' })
chest('Barbell Decline Bench Press', 'barbell', 'decline_press', { angle: 'decline' })
chest('Barbell Wide-Grip Bench Press', 'barbell', 'horizontal_press', {
  angle: 'flat',
  grip: 'wide',
})
chest('Barbell Paused Bench Press', 'barbell', 'horizontal_press', { angle: 'flat' })
chest('Smith Flat Bench Press', 'smith', 'horizontal_press', { angle: 'flat' })
chest('Smith Low Incline Bench Press', 'smith', 'incline_press', { angle: '15–30°' })
chest('Smith Incline Bench Press', 'smith', 'incline_press', { angle: '30–45°' })
chest('Smith Decline Bench Press', 'smith', 'decline_press', { angle: 'decline' })
chest('Smith Wide-Grip Bench Press', 'smith', 'horizontal_press', { angle: 'flat', grip: 'wide' })
chest('DB Flat Press', 'dumbbell', 'horizontal_press', { angle: 'flat' })
chest('DB Low Incline Press', 'dumbbell', 'incline_press', { angle: '15–30°' })
chest('DB Incline Press', 'dumbbell', 'incline_press', { angle: '30–45°' })
chest('DB Decline Press', 'dumbbell', 'decline_press', { angle: 'decline' })
chest('DB Flat Fly', 'dumbbell', 'chest_fly', { angle: 'flat' })
chest('DB Incline Fly', 'dumbbell', 'chest_fly', { angle: 'incline' })
chest('Single-Arm DB Press', 'dumbbell', 'horizontal_press', { angle: 'flat', uni: true })
chest('Seated Machine Chest Press', 'machine', 'horizontal_press')
chest('Machine Incline Chest Press', 'machine', 'incline_press', { angle: 'incline' })
chest('Machine Decline Chest Press', 'machine', 'decline_press', { angle: 'decline' })
chest('Iso-Lateral Chest Press', 'plate_loaded', 'horizontal_press')
chest('Iso-Lateral Incline Press', 'plate_loaded', 'incline_press', { angle: 'incline' })
chest('Pec Deck', 'machine', 'chest_fly')
chest('Single-Arm Pec Deck', 'machine', 'chest_fly', { uni: true })
chest('Cable Crossover (High-to-Low)', 'cable', 'chest_fly', { angle: 'high-to-low' })
chest('Cable Low-to-High Fly', 'cable', 'chest_fly', { angle: 'low-to-high' })
chest('Cable Mid Fly', 'cable', 'chest_fly', { angle: 'mid' })
chest('Single-Arm Cable Fly', 'cable', 'chest_fly', { uni: true })
chest('Single-Arm Cable Press', 'cable', 'horizontal_press', { uni: true })
chest('Chest Dip', 'bodyweight', 'dip')
chest('Push-Up', 'bodyweight', 'horizontal_press')
chest('Deficit Push-Up', 'bodyweight', 'horizontal_press')
chest('Weighted Push-Up', 'bodyweight', 'horizontal_press')

// --- Shoulders -------------------------------------------------------------
const shoulders = group('shoulders')
shoulders('Standing Barbell OHP', 'barbell', 'vertical_press')
shoulders('Seated Barbell OHP', 'barbell', 'vertical_press')
shoulders('Push Press', 'barbell', 'vertical_press')
shoulders('Smith Seated Shoulder Press', 'smith', 'vertical_press')
shoulders('Seated DB Shoulder Press', 'dumbbell', 'vertical_press')
shoulders('Standing DB Shoulder Press', 'dumbbell', 'vertical_press')
shoulders('Arnold Press', 'dumbbell', 'vertical_press')
shoulders('Machine Shoulder Press', 'machine', 'vertical_press')
shoulders('Plate-Loaded Shoulder Press', 'plate_loaded', 'vertical_press')
shoulders('Single-Arm Landmine Press', 'landmine', 'vertical_press', {
  uni: true,
  s: ['triceps', 'chest'],
})
shoulders('DB Lateral Raise', 'dumbbell', 'lateral_raise')
shoulders('Seated DB Lateral Raise', 'dumbbell', 'lateral_raise')
shoulders('Single-Arm Cable Lateral Raise', 'cable', 'lateral_raise', { uni: true })
shoulders('Cable Y-Raise', 'cable', 'lateral_raise', { s: ['traps', 'rear_delts'] })
shoulders('Machine Lateral Raise', 'machine', 'lateral_raise')
shoulders('Lean-Away DB Lateral Raise', 'dumbbell', 'lateral_raise', { uni: true })
shoulders('Wide-Grip Cable Upright Row', 'cable', 'upright_row', { grip: 'wide' })
shoulders('Wide-Grip Smith Upright Row', 'smith', 'upright_row', { grip: 'wide' })
shoulders('DB Front Raise', 'dumbbell', 'front_raise')
shoulders('Cable Front Raise', 'cable', 'front_raise')
shoulders('Plate Front Raise', 'plate', 'front_raise')
shoulders('Reverse Pec Deck', 'machine', 'rear_delt_fly')
shoulders('Face Pull', 'cable', 'rear_delt_fly', { s: ['upper_back', 'traps'] })
shoulders('Cable Rear Delt Fly', 'cable', 'rear_delt_fly')
shoulders('Bent-Over DB Rear Delt Fly', 'dumbbell', 'rear_delt_fly')
shoulders('Chest-Supported Rear Delt Raise', 'dumbbell', 'rear_delt_fly')
shoulders('Barbell Shrug', 'barbell', 'shrug')
shoulders('DB Shrug', 'dumbbell', 'shrug')
shoulders('Smith Shrug', 'smith', 'shrug')
shoulders('Trap-Bar Shrug', 'trap_bar', 'shrug')
shoulders('Machine Shrug', 'machine', 'shrug')

// --- Triceps ---------------------------------------------------------------
const triceps = group('triceps')
triceps('Barbell Close-Grip Bench Press', 'barbell', 'triceps_press', { grip: 'close' })
triceps('Smith Close-Grip Bench Press', 'smith', 'triceps_press', { grip: 'close' })
triceps('Barbell JM Press', 'barbell', 'triceps_press')
triceps('Smith JM Press', 'smith', 'triceps_press')
triceps('EZ-Bar Skull Crusher', 'ez_bar', 'elbow_extension')
triceps('DB Skull Crusher', 'dumbbell', 'elbow_extension')
triceps('Rope Pushdown', 'cable', 'elbow_extension', { grip: 'rope' })
triceps('Straight-Bar Pushdown', 'cable', 'elbow_extension', { grip: 'straight bar' })
triceps('V-Bar Pushdown', 'cable', 'elbow_extension', { grip: 'V-bar' })
triceps('Single-Arm Reverse-Grip Pushdown', 'cable', 'elbow_extension', {
  grip: 'reverse',
  uni: true,
})
triceps('Overhead Rope Extension', 'cable', 'overhead_extension', { grip: 'rope' })
triceps('Single-Arm Overhead Cable Extension', 'cable', 'overhead_extension', { uni: true })
triceps('Cross-Body Cable Extension', 'cable', 'elbow_extension', { uni: true })
triceps('Seated DB Overhead Extension', 'dumbbell', 'overhead_extension', { load: 'total' })
triceps('Triceps Dip', 'bodyweight', 'dip', { p: ['triceps'], s: ['chest', 'front_delts'] })
triceps('Machine Dip', 'machine', 'dip', { p: ['triceps'], s: ['chest', 'front_delts'] })
triceps('Machine Triceps Extension', 'machine', 'elbow_extension')
triceps('DB Kickback', 'dumbbell', 'elbow_extension', { uni: true })
triceps('Cable Kickback', 'cable', 'elbow_extension', { uni: true })

// --- Back ------------------------------------------------------------------
const back = group('back')
back('Wide-Grip Pull-Up', 'bodyweight', 'vertical_pull', { grip: 'wide' })
back('Neutral-Grip Pull-Up', 'bodyweight', 'vertical_pull', { grip: 'neutral' })
back('Chin-Up', 'bodyweight', 'vertical_pull', { grip: 'underhand' })
back('Weighted Pull-Up', 'bodyweight', 'vertical_pull')
// The logged weight is the assistance, so it is not added to body weight.
back('Assisted Pull-Up Machine', 'machine', 'vertical_pull')
back('Wide-Grip Lat Pulldown', 'cable', 'vertical_pull', { grip: 'wide' })
back('Close-Grip (V-Bar) Lat Pulldown', 'cable', 'vertical_pull', { grip: 'V-bar' })
back('Neutral-Grip Lat Pulldown', 'cable', 'vertical_pull', { grip: 'neutral' })
back('Reverse-Grip Lat Pulldown', 'cable', 'vertical_pull', { grip: 'underhand' })
back('Single-Arm Lat Pulldown', 'cable', 'vertical_pull', { uni: true })
back('Plate-Loaded Pulldown', 'plate_loaded', 'vertical_pull')
back('Straight-Arm Pulldown', 'cable', 'straight_arm_pull')
back('Cable Pullover', 'cable', 'straight_arm_pull')
back('Machine Pullover', 'machine', 'straight_arm_pull')
back('Barbell Row', 'barbell', 'horizontal_pull', { grip: 'overhand' })
back('Underhand Barbell Row', 'barbell', 'horizontal_pull', { grip: 'underhand' })
back('Pendlay Row', 'barbell', 'horizontal_pull')
back('Smith Row', 'smith', 'horizontal_pull')
back('Single-Arm DB Row', 'dumbbell', 'horizontal_pull', { uni: true })
back('Chest-Supported DB Row', 'dumbbell', 'horizontal_pull')
back('Seal Row', 'barbell', 'horizontal_pull')
back('Landmine T-Bar Row', 'landmine', 'horizontal_pull')
back('Chest-Supported T-Bar Row', 'plate_loaded', 'horizontal_pull')
back('Seated Cable Row (V-Bar)', 'cable', 'horizontal_pull', { grip: 'V-bar' })
back('Wide-Grip Seated Cable Row', 'cable', 'horizontal_pull', { grip: 'wide' })
back('Single-Arm Seated Cable Row', 'cable', 'horizontal_pull', { uni: true })
back('Chest-Supported Machine Row', 'machine', 'horizontal_pull')
back('Iso-Lateral High Row', 'plate_loaded', 'horizontal_pull', {
  p: ['lats', 'upper_back'],
})
back('Iso-Lateral Low Row', 'plate_loaded', 'horizontal_pull')
back('Meadows Row', 'landmine', 'horizontal_pull', { uni: true })
back('Conventional Deadlift', 'barbell', 'deadlift')
back('Sumo Deadlift', 'barbell', 'deadlift', {
  p: ['glutes', 'quads', 'hamstrings'],
  s: ['adductors', 'lower_back', 'traps'],
})
back('Trap-Bar Deadlift', 'trap_bar', 'deadlift', {
  p: ['glutes', 'quads', 'hamstrings'],
  s: ['lower_back', 'traps', 'forearms'],
})
back('Rack Pull', 'barbell', 'deadlift', {
  p: ['lower_back', 'glutes', 'traps'],
  s: ['hamstrings', 'upper_back', 'forearms'],
})
back('45° Back Extension', 'bodyweight', 'back_extension')
back('Reverse Hyper', 'machine', 'back_extension')

// --- Biceps & forearms -----------------------------------------------------
const biceps = group('biceps')
biceps('Barbell Curl', 'barbell', 'curl')
biceps('EZ-Bar Curl', 'ez_bar', 'curl')
biceps('Alternating DB Curl', 'dumbbell', 'curl')
biceps('Hammer Curl', 'dumbbell', 'curl', { grip: 'neutral', s: ['forearms'] })
biceps('Incline DB Curl', 'dumbbell', 'curl', { angle: 'incline' })
biceps('Spider Curl', 'ez_bar', 'curl')
biceps('Concentration Curl', 'dumbbell', 'curl', { uni: true })
biceps('EZ-Bar Preacher Curl', 'ez_bar', 'curl')
biceps('DB Preacher Curl', 'dumbbell', 'curl', { uni: true })
biceps('Machine Preacher Curl', 'machine', 'curl')
biceps('Machine Curl', 'machine', 'curl')
biceps('Straight-Bar Cable Curl', 'cable', 'curl', { grip: 'straight bar' })
biceps('Bayesian Cable Curl', 'cable', 'curl', { uni: true })
biceps('Rope Hammer Curl', 'cable', 'curl', { grip: 'rope', s: ['forearms'] })
biceps('Reverse EZ-Bar Curl', 'ez_bar', 'curl', {
  grip: 'overhand',
  p: ['forearms'],
  s: ['biceps'],
})
biceps('Wrist Curl', 'barbell', 'wrist_curl')
biceps('Reverse Wrist Curl', 'barbell', 'wrist_curl', { grip: 'overhand' })

// --- Legs: quads -----------------------------------------------------------
const quads = group('quads')
quads('High-Bar Back Squat', 'barbell', 'squat')
quads('Low-Bar Back Squat', 'barbell', 'squat')
quads('Front Squat', 'barbell', 'squat', { p: ['quads'], s: ['glutes', 'upper_back'] })
quads('Pause Squat', 'barbell', 'squat')
quads('Safety-Bar Squat', 'safety_bar', 'squat')
quads('Smith Squat', 'smith', 'squat')
quads('Hack Squat', 'plate_loaded', 'machine_squat')
quads('Reverse Hack Squat', 'plate_loaded', 'machine_squat', { p: ['quads', 'glutes'], s: [] })
quads('Pendulum Squat', 'plate_loaded', 'machine_squat')
quads('Belt Squat', 'plate_loaded', 'machine_squat')
quads('45° Leg Press', 'plate_loaded', 'leg_press', { inc: 5 })
quads('Horizontal Leg Press', 'machine', 'leg_press')
quads('Single-Leg Leg Press', 'plate_loaded', 'leg_press', { uni: true, inc: 5 })
quads('Goblet Squat', 'dumbbell', 'squat', { load: 'total' })
quads('DB Bulgarian Split Squat', 'dumbbell', 'lunge', { uni: true })
quads('Smith Bulgarian Split Squat', 'smith', 'lunge', { uni: true })
quads('Walking Lunge', 'dumbbell', 'lunge')
quads('Reverse Lunge', 'dumbbell', 'lunge', { uni: true })
quads('Smith Reverse Lunge', 'smith', 'lunge', { uni: true })
quads('Step-Up', 'dumbbell', 'lunge', { uni: true })
quads('Leg Extension', 'machine', 'knee_extension')
quads('Single-Leg Leg Extension', 'machine', 'knee_extension', { uni: true })
quads('Sissy Squat', 'bodyweight', 'knee_extension')

// --- Legs: hamstrings & glutes ---------------------------------------------
const posterior = group('hamstrings_glutes')
posterior('Barbell Romanian Deadlift', 'barbell', 'hip_hinge')
posterior('DB Romanian Deadlift', 'dumbbell', 'hip_hinge')
posterior('Smith Romanian Deadlift', 'smith', 'hip_hinge')
posterior('Stiff-Leg Deadlift', 'barbell', 'hip_hinge')
posterior('Good Morning', 'barbell', 'hip_hinge', {
  p: ['hamstrings', 'lower_back'],
  s: ['glutes'],
})
posterior('Lying Leg Curl', 'machine', 'knee_flexion')
posterior('Seated Leg Curl', 'machine', 'knee_flexion')
posterior('Standing Single-Leg Curl', 'machine', 'knee_flexion', { uni: true })
posterior('Nordic Curl', 'bodyweight', 'knee_flexion')
posterior('Glute-Ham Raise', 'bodyweight', 'knee_flexion', { s: ['glutes', 'lower_back'] })
posterior('Barbell Hip Thrust', 'barbell', 'hip_thrust')
posterior('Smith Hip Thrust', 'smith', 'hip_thrust')
posterior('Machine Hip Thrust', 'machine', 'hip_thrust')
posterior('Glute Bridge', 'barbell', 'hip_thrust')
posterior('Cable Glute Kickback', 'cable', 'hip_extension', { uni: true })
posterior('Machine Glute Kickback', 'machine', 'hip_extension', { uni: true })
posterior('Cable Pull-Through', 'cable', 'hip_extension')
posterior('Hip Abduction Machine', 'machine', 'hip_abduction')
posterior('Hip Adduction Machine', 'machine', 'hip_adduction')

// --- Calves ----------------------------------------------------------------
const calves = group('calves')
calves('Standing Calf Raise', 'machine', 'calf_raise')
calves('Seated Calf Raise', 'plate_loaded', 'calf_raise')
calves('Leg Press Calf Raise', 'plate_loaded', 'calf_raise', { inc: 5 })
calves('Smith Calf Raise', 'smith', 'calf_raise')
calves('Single-Leg DB Calf Raise', 'dumbbell', 'calf_raise', { uni: true, load: 'total' })
calves('Donkey Calf Raise', 'machine', 'calf_raise')

// --- Core ------------------------------------------------------------------
const core = group('core')
core('Cable Crunch', 'cable', 'spinal_flexion')
core('Machine Crunch', 'machine', 'spinal_flexion')
core('Hanging Leg Raise', 'bodyweight', 'leg_raise')
core("Captain's Chair Knee Raise", 'bodyweight', 'leg_raise')
core('Ab Wheel Rollout', 'bodyweight', 'anti_extension')
core('Decline Sit-Up', 'bodyweight', 'spinal_flexion')
core('Plank', 'bodyweight', 'anti_extension')
core('Side Plank', 'bodyweight', 'rotation', { uni: true })
core('Pallof Press', 'cable', 'rotation', { uni: true })
core('Cable Woodchopper', 'cable', 'rotation', { uni: true })

export const PATTERN_IDS = Object.keys(PATTERNS) as Pattern[]

export const EXERCISES: readonly Exercise[] = list

const byId = new Map(EXERCISES.map((exercise) => [exercise.id, exercise]))

export function getLibraryExercise(id: string): Exercise | undefined {
  return byId.get(id)
}

/**
 * Stand-ins for when a machine is busy: same movement pattern and at least one
 * shared primary muscle.
 */
export function findAlternatives(
  exercise: Exercise,
  pool: readonly Exercise[] = EXERCISES,
): Exercise[] {
  return pool.filter(
    (other) =>
      other.id !== exercise.id &&
      other.pattern === exercise.pattern &&
      other.primaryMuscles.some((muscle) => exercise.primaryMuscles.includes(muscle)),
  )
}
