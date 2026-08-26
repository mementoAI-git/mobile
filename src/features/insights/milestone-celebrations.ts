export interface Milestone {
  id: string;
  title: string;
  description: string;
  achieved: boolean;
  progressLabel: string;
  iconName: string;
}

export interface MilestoneStatsInput {
  memoryCount?: number;
  streakDays?: number;
  capsuleCount?: number;
  enrichmentScore?: number;
  beneficiaryCount?: number;
}

export function calculateMilestones(stats: MilestoneStatsInput): Milestone[] {
  const memories = Math.max(0, stats.memoryCount || 0);
  const streak = Math.max(0, stats.streakDays || 0);
  const capsules = Math.max(0, stats.capsuleCount || 0);
  const enrichment = Math.max(0, stats.enrichmentScore || 0);
  const beneficiaries = Math.max(0, stats.beneficiaryCount || 0);

  return [
    {
      id: 'first-story',
      title: 'First Reflection',
      description: 'Preserved your first memory in your personal legacy vault.',
      achieved: memories >= 1,
      progressLabel: memories >= 1 ? 'Unlocked' : `${memories} / 1`,
      iconName: 'BookOpen',
    },
    {
      id: 'story-five',
      title: 'Archive Keeper',
      description: 'Documented 5 meaningful chapters of your journey.',
      achieved: memories >= 5,
      progressLabel: memories >= 5 ? 'Unlocked' : `${memories} / 5`,
      iconName: 'Sparkles',
    },
    {
      id: 'streak-seven',
      title: 'Reflective Habit',
      description: 'Maintained a 7-day continuous reflection streak.',
      achieved: streak >= 7,
      progressLabel: streak >= 7 ? 'Unlocked' : `${streak} / 7 days`,
      iconName: 'Flame',
    },
    {
      id: 'time-capsule',
      title: 'Future Messenger',
      description: 'Scheduled your first time capsule for future delivery.',
      achieved: capsules >= 1,
      progressLabel: capsules >= 1 ? 'Unlocked' : '0 / 1 capsule',
      iconName: 'Clock',
    },
    {
      id: 'legacy-contact',
      title: 'Trusted Circle',
      description: 'Designated a legacy contact or beneficiary.',
      achieved: beneficiaries >= 1,
      progressLabel: beneficiaries >= 1 ? 'Unlocked' : '0 / 1 contact',
      iconName: 'Users',
    },
  ];
}
