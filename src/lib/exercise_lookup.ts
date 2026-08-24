import { EXERCISES, EXERCISES_BY_ID } from "../data/exercises.js";

/** Resolve the exact ID, catalog name, or case-insensitive catalog name locally. */
export function resolveOfficialExercise(value: string): string | null {
  const trimmed = value.trim();
  if (EXERCISES_BY_ID.has(trimmed)) return trimmed;
  const normalized = trimmed.toLowerCase();
  return EXERCISES.find((exercise) => exercise.name.toLowerCase() === normalized)?.exercise_id ?? null;
}
