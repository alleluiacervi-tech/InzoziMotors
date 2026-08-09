import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, fonts } from '../theme';

// The last line of defence. In a release bundle a render-time throw has no
// redbox — without a boundary it is a permanent white screen with no way out
// except force-quitting the app. This catches it, says something human, and
// offers a reset (remounting the whole tree via `key`, so no stale state
// survives into the retry).
//
// A class because React only exposes error boundaries through
// getDerivedStateFromError/componentDidCatch — there is no hook for this.
export default class ErrorBoundary extends React.Component {
  state = { failed: false, resetKey: 0 };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error) {
    // Log-only: no crash-reporting service is wired up yet, and the message
    // alone (never the user's data) is what a `adb logcat` / device log needs.
    console.warn('Render crash caught by ErrorBoundary:', error?.message);
  }

  handleReset = () => {
    this.setState((s) => ({ failed: false, resetKey: s.resetKey + 1 }));
  };

  render() {
    if (this.state.failed) {
      return (
        <View style={styles.wrap}>
          <View style={styles.iconWrap}>
            <Ionicons name="construct-outline" size={30} color={colors.textMuted} />
          </View>
          <Text style={styles.title}>Something went wrong</Text>
          <Text style={styles.sub}>
            The app hit an unexpected problem. Your account and data are fine —
            tap below to pick up where you left off.
          </Text>
          <Pressable style={styles.btn} onPress={this.handleReset} accessibilityRole="button">
            <Text style={styles.btnText}>Reload</Text>
          </Pressable>
        </View>
      );
    }
    return <React.Fragment key={this.state.resetKey}>{this.props.children}</React.Fragment>;
  }
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    padding: 32, backgroundColor: colors.bg, gap: 10,
  },
  iconWrap: {
    width: 56, height: 56, borderRadius: 28, marginBottom: 4,
    alignItems: 'center', justifyContent: 'center', backgroundColor: '#F1EDED',
  },
  title: { fontSize: 17, fontFamily: fonts.extraBold, color: colors.textPrimary, textAlign: 'center' },
  sub: {
    fontSize: 13, fontFamily: fonts.regular, color: colors.textSecondary,
    textAlign: 'center', lineHeight: 19, maxWidth: 300,
  },
  btn: {
    marginTop: 12, backgroundColor: colors.primary,
    paddingHorizontal: 26, paddingVertical: 13, borderRadius: radius.xl,
  },
  btnText: { color: '#fff', fontSize: 14, fontFamily: fonts.bold },
});
