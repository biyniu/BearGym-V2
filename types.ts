
export type ExerciseType = 'standard' | 'time' | 'reps_only';

export interface WarmupExercise {
  name: string;
  pl: string;
  link: string;
  reps: string;
}

export interface Exercise {
  id: string;
  name: string;
  pl: string;
  sets: number;
  reps: string;
  tempo: string;
  rir: string;
  rest: number;
  link: string;
  type: ExerciseType;
}

export interface WorkoutPlan {
  title: string;
  warmup: WarmupExercise[];
  exercises: Exercise[];
}

export interface WorkoutsMap {
  [key: string]: WorkoutPlan;
}

export interface WorkoutSessionResult {
  [exerciseId: string]: string;
}

export interface WorkoutHistoryEntry {
  date: string;
  timestamp: number;
  results: WorkoutSessionResult;
}

export interface AppSettings {
  volume: number;
  soundType: 'beep1' | 'beep2' | 'beep3';
}

export interface BodyMeasurement {
  id: string;
  date: string;
  weight: string;
  waist: string;
  chest: string;
  biceps: string;
  thigh: string;
}

export type CardioType = 'rowerek' | 'bieznia' | 'schody' | 'orbitrek';

export interface CardioSession {
  id: string;
  date: string;
  type: CardioType;
  duration: string; // np. "30 min"
  notes?: string;
}
