import { Router } from 'expo-router';

/**
 * Safely navigate back — if there's nothing to go back to, navigate to `fallback`.
 * This avoids the dev warning "The action 'GO_BACK' was not handled by any navigator.".
 */
export function safeBack(router: any, fallback = '/') {
  try {
    // If the router exposes canGoBack (react-navigation style), use it
    if (typeof router?.canGoBack === 'function') {
      if (router.canGoBack()) {
        router.back();
        return;
      }
    }

    // Some router instances don't expose canGoBack. Try a best-effort back first.
    // Wrap in try/catch because it may throw a dev warning but won't throw at runtime.
    try {
      router.back();
      return;
    } catch (e) {
      // fallthrough to fallback
    }

    // If back didn't work, replace with a known route to avoid stacking.
    if (typeof router?.replace === 'function') {
      router.replace(fallback);
      return;
    }

    // Last resort: push the fallback route
    if (typeof router?.push === 'function') {
      router.push(fallback);
      return;
    }
  } catch (e) {
    // swallow any unexpected errors to avoid crashing the app
    // eslint-disable-next-line no-console
    console.warn('safeBack failed, unable to navigate back', e);
  }
}

export default safeBack;
