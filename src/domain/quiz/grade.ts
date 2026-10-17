export interface QuizKeyChoice {
  readonly id: string;
  readonly correct: boolean;
  readonly explanation: string;
}

export interface QuizKeyQuestion {
  readonly id: string;
  readonly kind: 'single' | 'multiple';
  readonly choices: readonly QuizKeyChoice[];
  readonly sectionAnchor?: string;
}

export interface QuestionFeedback {
  readonly questionId: string;
  readonly correct: boolean;
  readonly correctChoiceIds: readonly string[];
  /** Explication de chaque choix (bonne réponse et distracteurs). */
  readonly explanations: Readonly<Record<string, string>>;
  readonly sectionAnchor: string | null;
}

export interface QuizGrade {
  readonly score: number;
  readonly maxScore: number;
  readonly feedback: readonly QuestionFeedback[];
}

export type QuizAnswers = Readonly<Record<string, readonly string[]>>;

export function gradeQuiz(questions: readonly QuizKeyQuestion[], answers: QuizAnswers): QuizGrade {
  const feedback = questions.map((question): QuestionFeedback => {
    const expected = question.choices
      .filter((c) => c.correct)
      .map((c) => c.id)
      .sort();
    const knownIds = new Set(question.choices.map((c) => c.id));
    const given = [...new Set(answers[question.id] ?? [])].filter((id) => knownIds.has(id)).sort();
    const correct =
      given.length === expected.length && given.every((id, index) => id === expected[index]);
    return {
      questionId: question.id,
      correct,
      correctChoiceIds: expected,
      explanations: Object.fromEntries(question.choices.map((c) => [c.id, c.explanation])),
      sectionAnchor: question.sectionAnchor ?? null,
    };
  });
  return {
    score: feedback.filter((f) => f.correct).length,
    maxScore: questions.length,
    feedback,
  };
}
