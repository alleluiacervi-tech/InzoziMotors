// 4 · Sign in (17–23 s). Splash, then the real sign-in screen (Apple and
// Google as icons, email below). Punch in: a fictional demo address types
// itself, the password stays masked, Sign in, and the home feed rises.

import { SCENES, T } from '../timeline.js'
import { prog, ease, keys } from '../motion.js'
import { set, text } from '../ui/dom.js'
import { Headline, Chapter } from '../ui/kinetic.js'
import { MEDIUM, HEAD, tap, pressScale, typed, caretOn } from './common.js'
import { homeState } from './s5-browse.js'

// Fictional: example.com is reserved for documentation and never delivers mail.
const DEMO_EMAIL = 'aline@example.com'
const PASSWORD_LENGTH = 8

export default function signin(ctx) {
  const group = ctx.group()
  const { phone, views } = ctx
  const v = views.signin

  const email = ctx.measure(v.email)
  const button = ctx.measure(v.button)
  const formCam = { fx: 195, fy: (email.y + button.y + button.h) / 2 - 20, X: 540, Y: 1010, s: 2.55, r: 0 }

  const caret = document.createElement('span')
  caret.className = 'caret'

  const chapter = new Chapter(group.front, '03', 'Sign in')
  const head = new Headline(group.front, ['Sign in', '*in seconds.*'], { y: HEAD.y + 54, size: HEAD.size - 8 })

  return {
    name: 'signin',
    range: SCENES.signin,
    group,
    update(t) {
      const cam = keys(t, [
        [17.0, { ...MEDIUM, s: 1.56, Y: MEDIUM.Y + 6 }],
        [17.6, MEDIUM, ease.inOut],
        [18.95, { ...MEDIUM, s: 1.53 }, ease.drift],
        [19.4, formCam, ease.snap],
        [22.3, { ...formCam, s: formCam.s * 1.04 }, ease.drift],
        [23.0, MEDIUM, ease.inOut],
      ])
      phone.camera(cam)
      phone.status('dark')

      const appear = prog(t, T.signinIn[0], T.signinIn[1], ease.out)
      // The splash fully open (the store scene grew it out of the icon).
      views.splash.node.style.clipPath = 'none'
      set(views.splash.icon, { o: 0 })
      if (appear < 1) phone.place('splash', { z: 1 })
      phone.place('signin', { y: 70 * (1 - appear), o: appear * (1 - prog(t, T.toFeed[0] + 0.2, T.toFeed[1], ease.out)), z: 2 })

      // Email, then password, each with the caret while it is being typed.
      const emailText = typed(DEMO_EMAIL, t, T.typeEmail[0], T.typeEmail[1])
      text(v.emailVal, emailText)
      set(v.emailPh, { o: emailText ? 0 : 1 })
      const dots = typed('•'.repeat(PASSWORD_LENGTH), t, T.typePassword[0], T.typePassword[1])
      text(v.pwdVal, dots)
      set(v.pwdPh, { o: dots ? 0 : 1 })
      const inEmail = t >= T.typeEmail[0] - 0.25 && t < T.typePassword[0] - 0.1
      const inPwd = t >= T.typePassword[0] - 0.1 && t < T.tapSignIn
      if (inEmail && caret.parentElement !== v.emailVal.parentElement) v.emailVal.after(caret)
      if (inPwd && caret.parentElement !== v.pwdVal.parentElement) v.pwdVal.after(caret)
      caret.style.opacity = (inEmail || inPwd) && (caretOn(t) || t < T.typePassword[1] + 0.1) ? '1' : '0'
      v.email.style.borderColor = inEmail ? 'var(--red)' : ''
      v.pwd.style.borderColor = inPwd ? 'var(--red)' : ''

      tap(ctx, t, T.tapSignIn, button)
      set(v.button, { s: pressScale(t, T.tapSignIn), origin: '50% 50%' })
      const loading = t >= T.tapSignIn + 0.08
      v.buttonLabel.style.display = loading ? 'none' : ''
      v.spinner.style.display = loading ? '' : 'none'
      // A spinner turns at a constant rate in the real app too.
      v.spinner.style.transform = `rotate(${(t - T.tapSignIn) * 540}deg)`

      // The home feed fades up underneath as sign-in completes.
      if (t >= T.toFeed[0]) {
        const rise = prog(t, T.toFeed[0], T.toFeed[1], ease.out)
        homeState(ctx, t)
        phone.place('home', { y: 50 * (1 - rise), o: rise, z: 3 })
      }

      chapter.update(t, 17.75, 18.85)
      head.update(t, 17.8, 18.85)
    },
  }
}
