# Sawa Cars: 60-second launch film

One buyer's journey from the website to agreeing a viewing in the app. The
line to remember: **Find it. Chat. Deal direct.**

The ending was changed from a purchase to a viewing on purpose. Sawa Cars is
not a party to any deal: there is no checkout, reservation or deposit in the
app, so the film ends where the product really ends. The buyer and seller agree
to meet, and the money is handled between them. Google Play is shown as
*coming soon*, exactly as sawacars.com shows it, because the Android listing is
not live yet.

1080×1920, 60 fps, 120 BPM. Every scene starts on a beat, and every tap and
message sound sits on the sixteenth-note grid (`npm run beats` checks this).
No shot holds longer than 4 s.

| # | Time | Shot | On-screen copy | Car / data | Motion | Sound |
|---|------|------|----------------|------------|--------|-------|
| 1 | 0–3 | Six listing photos, cut on every beat, full width | Real **cars.** / 150-point **checked.** / Verified **sellers.** | Bora, Denza N7, Qin Plus, Dongfeng, Bora side, Denza side | Each photo whips in and keeps pushing; a red rail fills beat by beat; a Signal Red wipe rises at 2.6 | Impact on frame 1, full beat, whoosh into the wipe |
| 2 | 3–6.5 | The phone rises out of the wipe on sawacars.com (Safari) | Spotted on **sawacars.com** | Site hero copy, the Bora and two others as site cards | Spring up from below; a thumb flicks down to the footer | Thump, swipe |
| 2b | 6.5–10 | Tight on the footer's *Download on the App Store* badge | — | — | Snap punch-in, tap at 8.0, zoom straight through the badge into white | Tap, whoosh |
| 3 | 10–13.5 | App Store page, tight on the header | Free on the **App Store.** | Live listing fields: name, Free, 4+, Shopping. No ratings | Get → progress ring → Open | Tap, chime on Open |
| 3b | 13.5–17 | Home screen | On your **home screen.** | Neutral glass tiles, no other apps' icons | The page swipes home, the icon flies to its slot on a spring, tap, the app opens out of the icon | Thump on landing, tap, whoosh |
| 4 | 17–19 | Splash → Sign in (Apple and Google as icons, email below) | Sign in **in seconds.** | — | Sign-in rises over the splash | — |
| 4b | 19–23 | Tight on the form | — | Demo address `aline@example.com`, password masked | Email types, then 8 dots, tap Sign in, spinner, the feed rises | Key clicks, tap, snare roll into 23 |
| 5 | 23–26.5 | Home feed (Buy) | Every car, **inspected.** | Bora, Dongfeng, Denza N7, Qin Plus as CarCards: title, year, km, *x/150 inspected*, price | Cards stagger in, the feed glides | Swipe; the lead melody enters |
| 5b | 26.5–30 | Tight on the chips, then the grid | Filter **in a tap.** | The *EV·Hybrid* chip (the Dongfeng is listed as petrol, so it leaves) | Tap at 27.0, the grid reflows | Tap |
| 5c | 30–33.5 | Bora card → detail page | Every detail, **upfront.** | 2025 Volkswagen Bora, Kigali · LHD, 24M RWF, specs, 150/150 | Tap at 30.5; the detail page grows out of the card image | Tap |
| 5d | 33.5–36 | Off the phone into the photos, full width | 2025 · 100 km · 150/150 / Volkswagen Bora / **24M RWF** | Bora photos 1–3 | The gallery hands off seamlessly at 1:1; swipes on the beat | Whoosh, two clicks |
| 5e | 36–38 | Tight on specs and the inspection row | — | 100 km · Electric · Automatic · 2025, "Scored 150/150" | Tiles pulse on the beat, then the inspection row; pan to the CTA bar | Pops |
| 6 | 38–41.5 | Contact verified seller → the real contact step | Message **the seller.** | In-app message only; direct-deal notice confirmed | Tap 38.5, iOS push, message types, Confirm → Done, Contact Seller | Taps, keys |
| 6b | 41.5–45 | Chat with the pinned car | Ask **anything.** | Scripted: "Hi! Is the Bora still available?" / "Yes, it is! Want to see it tomorrow?" | Bubbles pop; typing dots | Send, receive |
| 6c | 45–49 | Tight on the conversation | — | "Yes! 10am works for me." / "Perfect. See you at 10." | Reply types and sends; the seller confirms | Send, receive, riser, snare roll |
| 7 | 49–52.5 | The reply lifts out of the phone | Viewing **agreed.** | — | The phone falls away, the bubble springs to centre, a check draws | Drop, impact, chime |
| 7b | 52.5–56 | Bora, full width | Meet **the seller.** → Deal **direct.** + "Sawa Cars never holds the money." | Bora photo 1 | Bottom-up reveal, slow push | Full chorus |
| 8 | 56–60 | End card | Sawa Cars / Find it. Chat. / Deal **direct.** / App Store · Google Play *coming soon* / sawacars.com | App icon | The photo folds into the icon, the icon springs, then the type and badges rise | Final hit, the chord rings out |

## What is real, what is scripted

- **Real:** every car, photo, price, mileage, inspection score and title comes
  from the public listings via `data/cars.json`. The app and website screens
  are rebuilt from the repository's own code, labels and fonts. The App Store
  fields come from the live listing.
- **Scripted:** the chat messages and the demo sign-in (`example.com` is
  reserved and never delivers mail). The seller is shown only as "Verified
  Seller"; no real name, number or plate appears anywhere.
- **Not shown:** ratings, review counts, download figures, phone numbers,
  plates (Sawa's own *plate hidden* badge stays on), addresses.
