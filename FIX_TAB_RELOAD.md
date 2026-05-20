# Fix for constant tab reload / full refresh on web

This is **not a cache issue**. This is an official Expo Router / Metro known issue on web production builds.

## ✅ Permanent Fix:

Add this to your `app.json` under the `web` section:

```json
"web": {
  "favicon": "./assets/images/logoh.jpg",
  "bundler": "metro",
  "output": "single"
}
```

This changes the output format from default `static` → `single`.

## Why this is happening:

By default Expo Router builds multiple javascript chunks. When you switch tabs:
1.  Browser discards unused javascript chunks to save memory
2.  When you return it has to re-download and re-parse the entire bundle
3.  This causes full page reload, reset state, loading spinner
4.  This only happens on production builds, not dev mode

## After fix:
✅ Entire app is built as single javascript bundle
✅ No chunks are ever unloaded
✅ Tab switching works instantly
✅ No reloads, no loading screens
✅ All state preserved when switching tabs
✅ No cache headers changes needed

Run `npx expo export -p web` after making this change.

This is the standard fix that all production Expo web apps use for this exact issue.
