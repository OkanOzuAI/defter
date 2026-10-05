import { getLibraryExercise, REST_ISOLATION_SEC, type Exercise } from '../data/exercises'

/**
 * Looks an exercise up by id. Unknown ids (e.g. a deleted custom exercise) still
 * get a usable stand-in so old sessions keep rendering.
 */
export function resolveExercise(id: string): Exercise {
  return (
    getLibraryExercise(id) ?? {
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
  )
}
