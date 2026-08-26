import dayjs from 'dayjs';

export interface CapsuleRecipientPreviewData {
  id: string;
  title: string;
  subtitle?: string;
  unlockDate: string | Date;
  themeColor?: string;
  recipientCount: number;
  memoryCount: number;
  attachmentCount: number;
}

export function formatUnlockCountdown(unlockDate: string | Date): string {
  const target = dayjs(unlockDate);
  const now = dayjs();

  if (!target.isValid()) {
    return 'Unlock date pending';
  }

  const diffDays = target.diff(now, 'day');
  if (diffDays <= 0) {
    const diffHours = target.diff(now, 'hour');
    if (diffHours <= 0) {
      return 'Unlocked now';
    }
    return `Unlocks in ${diffHours} hour${diffHours === 1 ? '' : 's'}`;
  }

  if (diffDays < 30) {
    return `Unlocks in ${diffDays} day${diffDays === 1 ? '' : 's'}`;
  }

  const diffMonths = target.diff(now, 'month');
  if (diffMonths < 12) {
    return `Unlocks in ${diffMonths} month${diffMonths === 1 ? '' : 's'}`;
  }

  const diffYears = target.diff(now, 'year');
  return `Unlocks in ${diffYears} year${diffYears === 1 ? '' : 's'}`;
}

export function formatRecipientSummary(recipientCount: number): string {
  if (recipientCount <= 0) return 'No recipients added yet';
  if (recipientCount === 1) return 'Delivered to 1 recipient upon unlock';
  return `Delivered to ${recipientCount} recipients upon unlock`;
}
