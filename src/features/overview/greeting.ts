// Matches the web Overview welcome section.
export function getGreeting(at: Date = new Date(), random: () => number = Math.random): string {
  const hour = at.getHours();
  const greetings =
    hour >= 4 && hour < 7
      ? ["Up early today,", "Starting the day early,", "Rise and shine,"]
      : hour >= 7 && hour < 12
        ? ["Good morning,", "Back at it,", "Morning,"]
        : hour >= 12 && hour < 17
          ? ["Good afternoon,", "Welcome back,", "Afternoon,"]
          : hour >= 17 && hour < 21
            ? ["Good evening,", "Evening,", "Ready to reflect,"]
            : hour >= 21
              ? [
                  "Keeping a late night,",
                  "Night owl mode,",
                  "Burning the midnight oil,",
                ]
              : ["Still going,", "Can't sleep,", "Late night session,"];
  return greetings[Math.floor(random() * greetings.length)];
}

/** Greetings that are implied questions; use "?" after the name instead of "." */
const QUESTION_GREETINGS = new Set([
  "Back at it,",
  "Can't sleep,",
  "Burning the midnight oil,",
  "Keeping a late night,",
  "Late night session,",
  "Still going,",
]);

export function getGreetingPunctuation(greeting: string): "." | "?" {
  return QUESTION_GREETINGS.has(greeting) ? "?" : ".";
}

/** Bright control 6:00–16:59 local; moonface from 17:00 (evening) through 5:59. */
export function shouldUseBrightWelcomeIcon(at: Date = new Date()): boolean {
  const hour = at.getHours();
  return hour >= 6 && hour < 17;
}

/**
 * Second line after a question greeting ("Back at it, Groot?"). Statements,
 * never questions, so the greeting doesn't ask twice. One is picked per visit.
 */
export const GREETING_FOLLOW_UPS = [
  'Ready when you are.',
  'I’m all ears.',
  'Take your time.',
  'Pick up wherever you like.',
  'Tell me anything.',
  'Your stories are safe here.',
] as const;

export function getGreetingFollowUp(random: () => number = Math.random): string {
  return GREETING_FOLLOW_UPS[Math.floor(random() * GREETING_FOLLOW_UPS.length)];
}
