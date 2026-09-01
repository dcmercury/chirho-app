# Wallpaper carousel

Horizontal wallpaper picker used **only during first-time setup onboarding**. Existing accounts keep the default home background (`/intro.png`) and never see this step.

Copied from `react-native-animations` (`wallpaper-animated-carousel-react-native-reanimated`).

Source: [animatereactnative.com/post/wallpaper-animated-carousel-react-native-reanimated](https://www.animatereactnative.com/post/wallpaper-animated-carousel-react-native-reanimated)

## What the user can do

New accounts swipe left and right through full-bleed scenes during setup. The centered wallpaper scales and rotates into focus. Neighboring cards sit slightly smaller and tilted. A blurred copy of the active scene fills the backdrop and crossfades as you scroll. The scene title slides with the active card.

**Use this background** saves that scene as the home wallpaper. **Keep the default** leaves `/intro.png`. The profile drawer can still change backgrounds later.

The first card is always the bundled ChiRho default; the rest come from the admin-managed background library (`GET /api/backgrounds`), so the choices change whenever the library is curated at `/admin/backgrounds` — no app release needed. The centered card is the selection. `onIndexChange` reports that item when the scroll settles, including its `path`.

Saving sends the library `backgrounduuid` rather than a URL, so the server copies the image into the user's own storage. Later admin edits to the library never change a background someone already picked.

## Who sees it

| Account | Behavior |
| --- | --- |
| New (no groups, loved ones, cards, focuses, or daily deck) | Setup onboarding includes this as the first chapter |
| Existing | Setup is skipped; home uses `/intro.png` unless they already saved backgrounds |

## Files

| Path | Role |
| --- | --- |
| `src/components/wallpaper/index.tsx` | `WallpaperCarousel` + animation |
| `src/lib/backgroundLibrary.ts` | Fetches, caches and prefetches the remote library |
| `src/lib/setupOnboarding.ts` | `background` chapter for new accounts only |
| `src/components/onboarding/SetupOnboarding.tsx` | Renders the carousel as that chapter |

The playground used interior room PNGs and faker photographer names. This port uses the ChiRho background library so the picker matches what the home rotation offers.
