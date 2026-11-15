import { Redirect } from 'expo-router';

/**
 * Sign-in with Google and Apple is native and never comes back through this
 * link. It stays only so old memento://oauth-callback links open the login
 * screen instead of a missing page. It must never sign anyone in: any app or
 * page can open this link with tokens or a code of its choosing, and nothing
 * ties them to a sign-in the member started.
 */
export default function OAuthCallbackScreen() {
  return <Redirect href="/(auth)/login" />;
}
