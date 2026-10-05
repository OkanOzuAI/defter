/**
 * The user's view of the exercise library: the static list plus their custom
 * exercises, with their per-exercise overrides applied. Held in a small store so
 * any component (and plain functions) can look an exercise up synchronously.
 */
import { useQuery } from '@tanstack/react-query'
import { useEffect, useSyncExternalStore } from 'react'
import { getExerciseData, type ExerciseData } from '../api/exercises'
import {
  CATEGORIES,
  EQUIPMENT,
  EXERCISES,
  MUSCLES,
  REST_COMPOUND_SEC,
  REST_ISOLATION_SEC,
  type Category,
  type Equipment,
  type Exercise,
  type Muscle,
  type Pattern,
} from '../data/exercises'
import { withDeviceCache } from '../lib/deviceCache'

type Snapshot = {
  /** Every exercise, hidden ones included. */
  all: Exercise[]
  /** What pickers offer: hidden exercises left out. */
  visible: Exercise[]
  get: (id: string) => Exercise
}

function stub(id: string): Exercise {
  return {
    id,
    name: id,
    category: 'core',
    equipment: 'machine',
    pattern: 'anti_extension',
    primaryMuscles: [],
    secondaryMuscles: [],
    isCompound: false,
    unilateral: false,
    loadMode: 'total',
    increment: 2.5,
    barWeight: null,
    restSec: REST_ISOLATION_SEC,
  }
}

const oneOf = <T extends string>(allowed: readonly T[], value: string, fallback: T): T =>
  (allowed as readonly string[]).includes(value) ? (value as T) : fallback

export function buildSnapshot(data: ExerciseData): Snapshot {
  const custom: Exercise[] = data.custom.map((row) => ({
    id: row.id,
    name: row.name,
    category: oneOf<Category>(CATEGORIES, row.category, 'core'),
    equipment: oneOf<Equipment>(EQUIPMENT, row.equipment, 'machine'),
    // A custom pattern only matters for swap suggestions; any text is fine there.
    pattern: (row.pattern ?? `custom-${row.id}`) as Pattern,
    primaryMuscles: row.primary_muscles.filter((m): m is Muscle =>
      (MUSCLES as string[]).includes(m),
    ),
    secondaryMuscles: row.secondary_muscles.filter((m): m is Muscle =>
      (MUSCLES as string[]).includes(m),
    ),
    isCompound: row.is_compound,
    unilateral: row.unilateral,
    loadMode: row.load_mode,
    increment: row.increment,
    barWeight: row.bar_weight,
    restSec: row.is_compound ? REST_COMPOUND_SEC : REST_ISOLATION_SEC,
    custom: true,
  }))

  const settings = new Map(data.settings.map((row) => [row.exercise_id, row]))
  const all = [...EXERCISES, ...custom].map((exercise) => {
    const own = settings.get(exercise.id)
    if (!own) return exercise
    return {
      ...exercise,
      hidden: own.hidden,
      increment: own.increment ?? exercise.increment,
      barWeight: own.bar_weight ?? exercise.barWeight,
      restOverride: own.rest_sec ?? undefined,
      note: own.note ?? undefined,
    }
  })

  const byId = new Map(all.map((exercise) => [exercise.id, exercise]))
  return {
    all,
    visible: all.filter((exercise) => !exercise.hidden),
    // Unknown ids (e.g. a deleted custom exercise) still render in old sessions.
    get: (id) => byId.get(id) ?? stub(id),
  }
}

let snapshot = buildSnapshot({ custom: [], settings: [] })
const listeners = new Set<() => void>()

export function setExerciseData(data: ExerciseData) {
  snapshot = buildSnapshot(data)
  listeners.forEach((fn) => fn())
}

/** For code outside React. Components should use `useExercises()` so they update. */
export function resolveExercise(id: string): Exercise {
  return snapshot.get(id)
}

export function useExercises(): Snapshot {
  return useSyncExternalStore(
    (fn) => {
      listeners.add(fn)
      return () => listeners.delete(fn)
    },
    () => snapshot,
  )
}

export const exerciseDataKey = (userId: string | undefined) => ['exercise-data', userId] as const

/** Loads the user's custom exercises and overrides (also offline) into the store. */
export function useExerciseDataSync(userId: string | undefined) {
  const { data } = useQuery({
    queryKey: exerciseDataKey(userId),
    queryFn: () => withDeviceCache(userId!, 'exercises', getExerciseData),
    enabled: Boolean(userId),
    networkMode: 'always',
    staleTime: 5 * 60_000,
  })
  useEffect(() => {
    setExerciseData(data ?? { custom: [], settings: [] })
  }, [data])
}
