// A capped, staggered entrance for list/grid items — used on the two screens
// whose whole job is showing a grid of cars (Home, Search results).
//
// CAPPED, not applied to every row: an uncapped stagger on a 200-item search
// result means item #180 waits 6+ seconds for its turn, which is not a
// polish detail, it is a bug that looks like the list stopped loading. Only
// the first screenful (default 10) animates in; everything past that appears
// immediately, because by the time it is on screen the user has already
// started scrolling and any delay there reads as lag, not delight.
//
// `flexGrid` mirrors the parent's own sizing need: a two-column FlatList
// relies on each item claiming flex:1 of its row, and CarCard supplies that
// on ITSELF — wrapping it in a plain View with no size breaks the column
// math, because the wrapper (not the card) is now the row's direct child.
import Animated, { FadeInDown, ReduceMotion } from 'react-native-reanimated';
import { StyleSheet } from 'react-native';

const STAGGER_STEP_MS = 35;
export const STAGGER_CAP = 10;

export default function StaggerEntrance({ index, flexGrid = false, children }) {
  if (index >= STAGGER_CAP) return children;
  return (
    <Animated.View
      style={flexGrid ? styles.flexCell : undefined}
      entering={
        FadeInDown.delay(index * STAGGER_STEP_MS)
          .duration(280)
          .springify()
          .damping(18)
          // Predefined Reanimated entering animations default to respecting
          // the system reduce-motion setting, but this is explicit rather
          // than relying on that default surviving a future library upgrade.
          .reduceMotion(ReduceMotion.System)
      }
    >
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  flexCell: { flex: 1 },
});
