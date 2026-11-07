import { describe, expect, test } from 'bun:test';
import { getGreeting, getGreetingPunctuation } from './greeting';

const atHour = (hour: number) => new Date(2026, 9, 18, hour);

describe('Overview greeting web parity', () => {
  test.each([
    [0, ['Still going,', "Can't sleep,", 'Late night session,']],
    [3, ['Still going,', "Can't sleep,", 'Late night session,']],
    [4, ['Up early today,', 'Starting the day early,', 'Rise and shine,']],
    [6, ['Up early today,', 'Starting the day early,', 'Rise and shine,']],
    [7, ['Good morning,', 'Back at it,', 'Morning,']],
    [11, ['Good morning,', 'Back at it,', 'Morning,']],
    [12, ['Good afternoon,', 'Welcome back,', 'Afternoon,']],
    [16, ['Good afternoon,', 'Welcome back,', 'Afternoon,']],
    [17, ['Good evening,', 'Evening,', 'Ready to reflect,']],
    [20, ['Good evening,', 'Evening,', 'Ready to reflect,']],
    [21, ['Keeping a late night,', 'Night owl mode,', 'Burning the midnight oil,']],
    [23, ['Keeping a late night,', 'Night owl mode,', 'Burning the midnight oil,']],
  ] as const)('uses web greeting choices at hour %i', (hour, choices) => {
    choices.forEach((phrase, i) => expect(getGreeting(atHour(hour), () => (i + 0.5) / 3)).toBe(phrase));
  });

  test.each(['Back at it,', "Can't sleep,", 'Burning the midnight oil,', 'Keeping a late night,', 'Late night session,', 'Still going,'])('ends the question greeting %s with a question mark', (phrase) => {
    expect(`${phrase} Groot${getGreetingPunctuation(phrase)}`).toBe(`${phrase} Groot?`);
  });

  test.each(['Good morning,', 'Rise and shine,', 'Good afternoon,', 'Good evening,', 'Night owl mode,', 'Welcome back,'])('ends the statement %s with a period', (phrase) => {
    expect(getGreetingPunctuation(phrase)).toBe('.');
  });
});
