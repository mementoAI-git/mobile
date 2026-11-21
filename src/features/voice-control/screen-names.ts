/**
 * The name of the screen in front, as the host would say it. Voice tools
 * report it after every action ("Went back. Now on Your stories.") so
 * Memento always knows where the host is.
 */

const EXACT: Record<string, string> = {
  '/': 'Home (Overview)',
  '/overview': 'Home (Overview)',
  '/chat': 'Chat',
  '/chat/media': 'Chat media',
  '/chat/settings': 'Chat settings',
  '/stories': 'Your stories',
  '/capsule': 'Time capsules',
  '/explore': 'Topics',
  '/insights': 'Insights',
  '/account': 'Account',
  '/settings': 'Settings',
  '/settings/account': 'Account settings',
  '/settings/activities': 'Your activity',
  '/settings/beneficiaries': 'Beneficiaries',
  '/settings/billing': 'Plan and billing',
  '/settings/cancel-plan': 'Cancel plan',
  '/settings/feedback': 'Feedback',
  '/settings/privacy': 'Privacy settings',
  '/settings/profile': 'Profile',
  '/settings/two-factor': 'Two-factor settings',
  '/pricing': 'Plans',
  '/voice-call': 'Voice call',
  '/editor': 'Editor',
  '/create': 'Create',
  '/share': 'Share',
  '/summary': 'Summary',
  '/article': 'Article',
};

const PATTERNS: [RegExp, string][] = [
  [/^\/stories\/[^/]+$/, 'A story'],
  [/^\/chat\/[^/]+$/, 'A conversation'],
  [/^\/explore\/[^/]+$/, 'A prompt category'],
  [/^\/settings\/beneficiary\/[^/]+$/, 'A connection'],
  [/^\/settings\/group\/[^/]+$/, 'A group'],
];

export function voiceScreenName(pathname: string | undefined, search = ''): string {
  const path = (pathname || '/').replace(/\/+$/, '') || '/';
  if (path === '/editor') {
    return /mode=quick-capture/.test(search) ? 'Quick note editor' : 'Story editor';
  }
  if (EXACT[path]) return EXACT[path];
  for (const [pattern, name] of PATTERNS) if (pattern.test(path)) return name;
  return path.split('/').filter(Boolean).pop()?.replace(/[-_]/g, ' ') ?? 'an app screen';
}

/** Whether `href` is the screen at `pathname` (route groups and query ignored). */
export function isCurrentScreen(href: string, pathname: string): boolean {
  const target = href.split('?')[0].replace(/\/\([^)]+\)/g, '').replace(/\/+$/, '') || '/';
  return target === (pathname.replace(/\/+$/, '') || '/');
}
