import type { ContentStatus, TranslationStatus } from './status';

export interface PublicSource {
  readonly title: string;
  readonly url: string;
  readonly verifiedAt: string;
}

export interface PublicObjective {
  readonly id: string;
  readonly bloom: string;
  readonly text: string;
  readonly sources: readonly PublicSource[];
}

export interface PublicHeading {
  readonly id: string;
  readonly text: string;
}

export interface PublicLesson {
  readonly id: string;
  readonly trackId: string;
  readonly moduleId: string;
  readonly title: string;
  readonly summary: string;
  readonly status: ContentStatus;
  readonly durationMinutes: number;
  readonly objectiveIds: readonly string[];
  readonly sources: readonly PublicSource[];
  readonly translations: { readonly fr: 'complete'; readonly en: TranslationStatus };
  readonly exerciseId: string | null;
  readonly labId: string | null;
  readonly interactionWaiver: string | null;
  readonly verifiedOn: { readonly platform: string; readonly date: string } | null;
  readonly headings: readonly PublicHeading[];
  readonly bodyFr: string;
  readonly quizQuestionCount: number;
}

export interface PublicModule {
  readonly id: string;
  readonly title: string;
  readonly summary: string;
  readonly lessonIds: readonly string[];
}

export interface PublicTrack {
  readonly id: string;
  readonly version: string;
  readonly title: string;
  readonly summary: string;
  readonly level: string;
  readonly modules: readonly PublicModule[];
}

export interface PublicQuizChoice {
  readonly id: string;
  readonly text: string;
}

export interface PublicQuizQuestion {
  readonly id: string;
  readonly objectiveId: string;
  readonly kind: 'single' | 'multiple';
  readonly prompt: string;
  readonly code: string | null;
  readonly choices: readonly PublicQuizChoice[];
}

export interface PublicQuiz {
  readonly lessonId: string;
  readonly questions: readonly PublicQuizQuestion[];
}

/** Exercice tel qu'envoyé au navigateur : ni solution ni empreinte attendue. */
export interface PublicExercise {
  readonly id: string;
  readonly title: string;
  readonly objectiveIds: readonly string[];
  readonly statement: string;
  readonly hints: readonly string[];
  readonly setupSql: string;
  readonly table: string;
  readonly rows: number;
  readonly starterSql: string;
  readonly ordered: boolean;
  readonly expectedShape: { readonly columns: readonly string[]; readonly rowCount: number };
  readonly dialectNotes: readonly string[];
}
