import PostHog from 'posthog-react-native';

/**
 * Product analytics for the app. Users are identified by their account ID,
 * the same ID web and the API use, so one person's events join up across all
 * three. Analytics is off when the build has no key, and it never records
 * screen contents, taps, or session replays: journals and chats stay private.
 */

const key = process.env.EXPO_PUBLIC_POSTHOG_KEY?.trim() ?? '';
const host = process.env.EXPO_PUBLIC_POSTHOG_HOST?.trim() || 'https://us.i.posthog.com';
export const ANALYTICS_ENVIRONMENT =
  process.env.EXPO_PUBLIC_POSTHOG_ENVIRONMENT?.trim() || 'development';

const isTest = process.env.NODE_ENV === 'test';

export const analytics: PostHog | null =
  key && !isTest
    ? new PostHog(key, {
        host,
        // Records Application Installed / Opened / Became Active, which is
        // what returning-user and retention charts are built from.
        captureAppLifecycleEvents: true,
        enableSessionReplay: false,
      })
    : null;

analytics?.register({ environment: ANALYTICS_ENVIRONMENT, platform: 'mobile' });

type Person = {
  _id?: string;
  email?: string;
  nickname?: string;
  first_name?: string;
  last_name?: string;
};

type IdentityClient = Pick<PostHog, 'identify' | 'reset'>;

/** Keeps one analytics client pointed at whoever is signed in. */
export function createUserSync(client: IdentityClient | null) {
  let identifiedId: string | null = null;
  return (user: Person | null | undefined, signedIn: boolean) => {
    if (!client) return;
    if (!signedIn) {
      if (identifiedId) client.reset();
      identifiedId = null;
      return;
    }
    const id = user?._id;
    if (!id || id === identifiedId) return;
    if (identifiedId) client.reset();
    const name = user.nickname || [user.first_name, user.last_name].filter(Boolean).join(' ');
    client.identify(id, {
      ...(user.email ? { email: user.email } : {}),
      ...(name ? { name } : {}),
    });
    identifiedId = id;
  };
}

/** Point analytics at the signed-in account, or clear it after sign-out. */
export const syncAnalyticsUser = createUserSync(analytics);

/**
 * Screen name from expo-router segments, e.g. "(tabs)/chat/[id]". Segments
 * keep dynamic parts as placeholders, so memory or chat IDs never leave the app.
 */
export function screenNameFromSegments(segments: readonly string[]): string {
  return segments.length ? segments.join('/') : 'index';
}

export function trackScreen(segments: readonly string[]) {
  analytics?.screen(screenNameFromSegments(segments));
}
