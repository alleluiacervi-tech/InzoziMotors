// Whether the OS-level "Reduce Motion" setting is on, kept live.
//
// Motion is the whole point of the components that call this — spring press
// physics, staggered list entrances, the inspection score ring. Someone who
// has told their phone to reduce motion is not asking for a subtler version
// of it; they are asking for none, and the setting can change at any moment
// while the app is open (Settings is one swipe away on both platforms), so
// this subscribes rather than reading once at mount.
import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

export default function useReducedMotion() {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    let live = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((value) => { if (live) setReduced(!!value); })
      .catch(() => {});

    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', (value) => {
      setReduced(!!value);
    });

    return () => {
      live = false;
      // RN >= 0.65 returns a subscription object; older returns nothing to
      // clean up. Guarding the call keeps this safe either way.
      sub?.remove?.();
    };
  }, []);

  return reduced;
}
