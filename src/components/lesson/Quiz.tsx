'use client';

import { useState } from 'react';
import type { PublicQuiz } from '@/domain/content/public-types';
import type { QuizGrade } from '@/domain/quiz/grade';
import type { Messages } from '@/i18n/messages';
import { apiJson } from '@/lib/client/api';
import { useAuth } from '@/lib/client/auth-context';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/primitives';
import styles from './interactive.module.css';

type Answers = Record<string, string[]>;

export function Quiz({ quiz, t }: { readonly quiz: PublicQuiz; readonly t: Messages }) {
  const { ensureSession } = useAuth();
  const [answers, setAnswers] = useState<Answers>({});
  const [grade, setGrade] = useState<QuizGrade | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const complete = quiz.questions.every((q) => (answers[q.id]?.length ?? 0) > 0);

  function toggle(questionId: string, choiceId: string, multiple: boolean): void {
    if (grade !== null) return;
    setAnswers((prev) => {
      const current = prev[questionId] ?? [];
      const next = multiple
        ? current.includes(choiceId)
          ? current.filter((c) => c !== choiceId)
          : [...current, choiceId]
        : [choiceId];
      return { ...prev, [questionId]: next };
    });
  }

  async function submit(): Promise<void> {
    setBusy(true);
    setError(null);
    try {
      await ensureSession();
      setGrade(
        await apiJson<QuizGrade>('POST', '/api/quiz/check', { lessonId: quiz.lessonId, answers }),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : t.common.error);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className={styles.panel} aria-labelledby="quiz-title">
      <header className={styles.panelHeader}>
        <h2 id="quiz-title">{t.quiz.title}</h2>
        {grade !== null && (
          <Badge tone={grade.score === grade.maxScore ? 'success' : 'warning'}>
            {t.quiz.score} : {grade.score} / {grade.maxScore}
          </Badge>
        )}
      </header>
      <ol className={styles.questions}>
        {quiz.questions.map((question) => {
          const feedback = grade?.feedback.find((f) => f.questionId === question.id);
          const multiple = question.kind === 'multiple';
          return (
            <li key={question.id} className={styles.question}>
              <fieldset>
                <legend>
                  {question.prompt}
                  {multiple && <span className="muted"> ({t.quiz.multiple})</span>}
                </legend>
                {question.code !== null && (
                  <pre>
                    <code>{question.code}</code>
                  </pre>
                )}
                {question.choices.map((choice) => {
                  const checked = answers[question.id]?.includes(choice.id) ?? false;
                  const isCorrect = feedback?.correctChoiceIds.includes(choice.id) ?? false;
                  const stateClass =
                    feedback === undefined
                      ? ''
                      : isCorrect
                        ? styles.choiceCorrect
                        : checked
                          ? styles.choiceWrong
                          : '';
                  return (
                    <div key={choice.id} className={`${styles.choice} ${stateClass}`}>
                      <label>
                        <input
                          type={multiple ? 'checkbox' : 'radio'}
                          name={question.id}
                          value={choice.id}
                          checked={checked}
                          disabled={grade !== null}
                          onChange={() => {
                            toggle(question.id, choice.id, multiple);
                          }}
                        />{' '}
                        {choice.text}
                      </label>
                      {feedback !== undefined && (checked || isCorrect) && (
                        <p className={styles.explanation}>{feedback.explanations[choice.id]}</p>
                      )}
                    </div>
                  );
                })}
                {feedback !== undefined && (
                  <p>
                    <Badge tone={feedback.correct ? 'success' : 'danger'}>
                      {feedback.correct ? t.quiz.correct : t.quiz.incorrect}
                    </Badge>
                    {!feedback.correct && feedback.sectionAnchor !== null && (
                      <>
                        {' '}
                        <a href={`#${feedback.sectionAnchor}`}>{t.quiz.review}</a>
                      </>
                    )}
                  </p>
                )}
              </fieldset>
            </li>
          );
        })}
      </ol>
      <div className={styles.actions}>
        {grade === null ? (
          <Button
            onClick={() => void submit()}
            disabled={!complete || busy}
            aria-describedby="quiz-hint"
          >
            {t.quiz.submit}
          </Button>
        ) : (
          <Button
            variant="secondary"
            onClick={() => {
              setGrade(null);
              setAnswers({});
            }}
          >
            {t.quiz.retry}
          </Button>
        )}
        {!complete && grade === null && (
          <span id="quiz-hint" className="muted">
            {t.quiz.incomplete}
          </span>
        )}
        {error !== null && (
          <span role="alert" className={styles.error}>
            {error}
          </span>
        )}
      </div>
    </section>
  );
}
