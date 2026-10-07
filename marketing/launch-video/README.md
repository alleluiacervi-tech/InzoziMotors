# Sawa Cars launch film

A 60-second vertical film (1080×1920, 60 fps, H.264 + AAC) that follows one
buyer from sawacars.com to agreeing a viewing in the app. It is built from
the live listings and the app's own screens, and renders with one command.
Shot list and rationale: [STORYBOARD.md](STORYBOARD.md).

```bash
cd marketing/launch-video
npm install                 # Playwright (once). Needs the repo root's node_modules too, for the app's icon font.
npm run video               # → out/sawa-cars-launch.mp4 and out/poster.png
```

Requirements: Node 20+, `ffmpeg` on PATH, and Playwright's Chromium. If it is
missing, run `npx playwright install chromium`. A render takes about 10
minutes on four cores; pass `--workers N` to change the parallelism.

## Changing the cars

- `npm run cars` re-reads the public listings (GET only, the same data
  sawacars.com shows anyone) and rewrites `data/cars.json`. It also downloads
  and measures the photos.
- Which cars appear, and in which order their photos are used, is set in
  `data/curation.json`. The car with `"role": "hero"` is the one the buyer
  opens and messages about.
- Any photo narrower than `min_photo_width` (1400 px) is dropped, because the
  film never enlarges a photograph. A listing that is no longer live is
  dropped too. Both are reported.
- Then run `npm run video` again. Every scene reads `data/cars.json`; nothing
  queries the API while rendering.

## Checking before a render

- `npm run stills`: renders about 50 key frames to `out/stills/`, with
  contact sheets. It also fails if any visible photo is shown larger than
  1:1. Pass seconds to render specific moments: `npm run stills -- 31 52.9`.
- `node scripts/beats.mjs`: confirms that every cut is on a beat and every
  tap and UI sound is on the sixteenth-note grid.

## Music

The soundtrack and UI sounds are synthesised by `audio/synth.mjs`: 120 BPM, A
minor, arranged against `src/timeline.js`. No samples are used, so there is
nothing to license.

To use a licensed track instead, save it as `audio/music.wav` (or `.mp3`) at
120 BPM. The render uses it in place of the generated music, keeps the UI
sounds on top, and levels the mix to −14 LUFS.

## How it is built

- `src/timeline.js`: every cut, tap and sound cue, in seconds. Both the
  picture and the audio read it.
- `src/scenes/s1…s8`: one file per scene. Each one owns its time range and is
  a pure function of the clock, so any frame renders identically on its own.
  Screens shared between scenes have their state functions exported, such as
  `homeState` and `chatState`.
- `src/ui/screens.js`: the website, the App Store page, the home screen and
  the app screens, rebuilt from `src/screens/*.js` and `web/src` with the
  app's own labels, colours, Satoshi and Ionicons.
- `scripts/render.mjs`: several headless Chromium workers, frame-accurate
  seeking, PNG frames piped straight into x264, then the segments are joined
  and the audio is laid underneath.

## Rules the film keeps

- **No invented data.** Only data from `data/cars.json` appears: no
  invented cars, prices or stats, and no ratings, review counts or download
  figures.
- **No personal details.** Sellers appear as "Verified Seller". There are no
  names, phone numbers or addresses, and the plates keep Sawa's own *plate
  hidden* badge.
- **Scripted demo content.** The chat lines and the demo login
  (`aline@example.com`, masked password) are written for the film, never
  pulled from real conversations or accounts.
- **No transaction claims.** Sawa Cars is not a party to the deal: no
  checkout, deposit or reservation is shown. The film ends at a viewing the
  buyer and seller agree between themselves.
- **App Store only.** Google Play is shown as *coming soon* until
  `APP.androidLive` is true in `web/src/lib/site.ts`. After that, update the
  end card and the footer in `src/ui/screens.js` to match.
