'use client';

import { useTranslations } from 'next-intl';
import type { EventCustomQuestion } from '@/types';

export type CheckoutAnswers = Record<string, string | string[]>;

interface CheckoutQuestionsProps {
  questions: EventCustomQuestion[];
  answers: CheckoutAnswers;
  invalidQuestionId?: string | null;
  onChange: (questionId: string, answer: string | string[]) => void;
}

export function CheckoutQuestions({ questions, answers, invalidQuestionId, onChange }: CheckoutQuestionsProps) {
  const t = useTranslations('checkout');
  const persistedQuestions = questions.filter(
    (question): question is EventCustomQuestion & { id: string } => Boolean(question.id)
  );
  if (persistedQuestions.length === 0) return null;

  return (
    <section className="rounded-md border border-[var(--surface-border)] bg-[var(--surface)] p-5 space-y-4">
      <h2 className="text-sm font-bold text-[var(--text-primary)]">{t('questions_title')}</h2>
      {persistedQuestions.map((question) => {
        const invalid = invalidQuestionId === question.id;
        const value = answers[question.id];
        return (
          <fieldset key={question.id} className="space-y-2">
            <legend className="text-xs font-semibold text-[var(--text-primary)]">
              {question.questionText}{question.isRequired ? <span className="ml-1 text-[var(--error)]">*</span> : null}
            </legend>
            {question.questionType === 'text' ? (
              <textarea
                value={typeof value === 'string' ? value : ''}
                onChange={(event) => onChange(question.id, event.target.value)}
                aria-invalid={invalid}
                className="min-h-20 w-full rounded-md border border-[var(--surface-border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--primary)]"
              />
            ) : question.options.map((option) => {
              const selected = question.questionType === 'multi_choice'
                ? Array.isArray(value) && value.includes(option)
                : value === option;
              return (
                <label key={option} className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                  <input
                    type={question.questionType === 'multi_choice' ? 'checkbox' : 'radio'}
                    name={question.id}
                    checked={selected}
                    onChange={() => {
                      if (question.questionType === 'multi_choice') {
                        const current = Array.isArray(value) ? value : [];
                        onChange(question.id, selected ? current.filter((item) => item !== option) : [...current, option]);
                      } else {
                        onChange(question.id, option);
                      }
                    }}
                  />
                  {option}
                </label>
              );
            })}
            {invalid ? <p className="text-xs text-[var(--error)]">{t('question_required')}</p> : null}
          </fieldset>
        );
      })}
    </section>
  );
}
