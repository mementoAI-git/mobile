export interface CategoryProgress {
  answered: number;
  total: number;
  percent: number;
  label: string;
  isComplete: boolean;
}

/**
 * Derives clean category progress and label for Explore category cards.
 */
export function formatCategoryProgress(
  answered = 0,
  total = 0
): CategoryProgress | null {
  if (total <= 0) return null;

  const validAnswered = Math.max(0, Math.min(answered, total));
  const percent = Math.round((validAnswered / total) * 100);
  const isComplete = validAnswered >= total && total > 0;

  let label = `${validAnswered} of ${total} answered`;
  if (isComplete) {
    label = 'Chapter complete';
  } else if (validAnswered === 0) {
    label = `${total} prompts`;
  }

  return {
    answered: validAnswered,
    total,
    percent,
    label,
    isComplete,
  };
}
