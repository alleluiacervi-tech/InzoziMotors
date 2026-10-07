// The film's clock. Every cut, tap and sound is placed here, on the beat, and
// read by both the scenes (src/scenes) and the soundtrack (audio/synth.mjs),
// so picture and sound cannot drift apart.
//
// 120 BPM: one beat = 0.5 s, one bar = 2 s. Every scene boundary is a whole
// second, so every cut lands on a beat; the big ones land on a bar.

export const FPS = 60
export const DURATION = 60
export const BPM = 120
export const BEAT = 60 / BPM
export const W = 1080
export const H = 1920

export const SCENES = {
  hook: [0, 3],
  web: [3, 10],
  store: [10, 17],
  signin: [17, 23],
  browse: [23, 38],
  chat: [38, 49],
  deal: [49, 56],
  end: [56, 60],
}

// Named moments, in seconds.
export const T = {
  // 1 · hook
  hookCuts: [0, 0.5, 1, 1.5, 2, 2.5],
  hookWords: [0, 1, 2],
  hookWipe: [2.625, 3.0],

  // 2 · web
  phoneIn: [3, 3.7],
  webHeadline: 3.25,
  webFlick: 4.75,
  webScroll: [4.8, 6.3],
  webPunch: 6.5,
  webTapStore: 8,
  webZoomThrough: [9.375, 10],

  // 3 · store
  storeTapGet: 11,
  storeRing: [11.25, 12.75],
  storeOpen: 13,
  homeCut: 13.5,
  iconLand: 14,
  tapIcon: 16,
  appOpen: [16.25, 17],

  // 4 · sign in
  splash: [17, 17.75],
  signinIn: [17.7, 18.3],
  signinPunch: 19,
  typeEmail: [19.25, 20.25],
  typePassword: [20.5, 21],
  tapSignIn: 21.5,
  toFeed: [22.5, 23],

  // 5 · browse
  feedScroll: [23.5, 26.125],
  chipPunch: 26.5,
  tapChip: 27,
  reflow: [27.1, 27.9],
  cardPunch: 30,
  tapCard: 30.5,
  expand: [30.55, 31.3],
  photoPull: 33.5,
  photoSwaps: [34.5, 35.25],
  specsPunch: 36,
  specTiles: [36, 36.25, 36.5, 36.75],
  inspectRow: 37,

  // 6 · chat
  tapContact: 38.5,
  contactIn: [38.6, 39.05],
  typeMessage: [39.25, 40.35],
  tapConfirm: 40.75,
  tapSend: 41.25,
  chatIn: [41.4, 41.85],
  myMessage1: 41.75,
  typing1: [42.25, 43.8],
  seller1: 44,
  replyPunch: 45,
  typeReply: [45.2, 45.8],
  myMessage2: 46,
  typing2: [46.5, 47.8],
  seller2: 48,

  // 7 · deal
  drop: 49,
  lift: [49, 49.75],
  check: [49.75, 50.5],
  agreedText: 50,
  dealCut: 52.5,
  dealLine1: 52.75,
  dealLine2: 54.25,

  // 8 · end
  collapse: [56, 56.625],
  mark: 56.25,
  wordmark: 56.625,
  tagline: 57,
  badges: 57.5,
}

// Sound cues for audio/synth.mjs. `gain` is relative (1 = default level).
export const CUES = [
  { t: 0, type: 'impact', gain: 1 },
  { t: T.hookWipe[0], type: 'whoosh', gain: 0.9 },
  { t: 3, type: 'thump', gain: 0.7 },
  { t: T.webFlick, type: 'swipe', gain: 0.8 },
  { t: T.webTapStore, type: 'tap' },
  { t: T.webZoomThrough[0], type: 'whoosh', gain: 0.8 },
  { t: T.storeTapGet, type: 'tap' },
  { t: T.storeOpen, type: 'chime' },
  { t: T.iconLand, type: 'thump', gain: 0.6 },
  { t: T.tapIcon, type: 'tap' },
  { t: T.appOpen[0], type: 'whoosh', gain: 0.6 },
  ...typingCues(T.typeEmail, 17),
  ...typingCues(T.typePassword, 8),
  { t: T.tapSignIn, type: 'tap' },
  { t: T.toFeed[0], type: 'swipe', gain: 0.5 },
  { t: T.feedScroll[0], type: 'swipe', gain: 0.5 },
  { t: T.tapChip, type: 'tap' },
  { t: T.tapCard, type: 'tap' },
  { t: T.photoPull, type: 'whoosh', gain: 0.7 },
  { t: T.photoSwaps[0], type: 'click', gain: 0.8 },
  { t: T.photoSwaps[1], type: 'click', gain: 0.8 },
  ...T.specTiles.map((t) => ({ t, type: 'pop', gain: 0.55 })),
  { t: T.inspectRow, type: 'pop', gain: 0.8 },
  { t: T.tapContact, type: 'tap' },
  ...typingCues(T.typeMessage, 22),
  { t: T.tapConfirm, type: 'tap' },
  { t: T.tapSend, type: 'tap' },
  { t: T.myMessage1, type: 'send' },
  { t: T.seller1, type: 'receive' },
  ...typingCues(T.typeReply, 10),
  { t: T.myMessage2, type: 'send' },
  { t: T.seller2, type: 'receive' },
  { t: T.drop, type: 'impact', gain: 0.9 },
  { t: T.check[0], type: 'chime', gain: 0.9 },
  { t: T.dealCut, type: 'whoosh', gain: 0.6 },
  { t: T.collapse[0], type: 'impact', gain: 0.8 },
]

function typingCues([from, to], keys) {
  const cues = []
  for (let i = 0; i < keys; i += 1) {
    // Slightly uneven, like a thumb: a fixed jitter pattern, so renders are identical.
    const jitter = ((i * 7919) % 11) / 11 - 0.5
    cues.push({ t: from + ((to - from) * (i + 0.5 + jitter * 0.4)) / keys, type: 'key', gain: 0.45 })
  }
  return cues
}
