import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, fonts } from '../theme';
import { reportClientError } from '../utils/crashReport';
import { getJSON } from '../storage';
import { translate, normalizeLanguage } from '../i18n';

// The last line of defence. In a release bundle a render-time throw has no
// redbox — without a boundary it is a permanent white screen with no way out
// except force-quitting the app. This catches it, says something human, and
// offers a reset (remounting the whole tree via `key`, so no stale state
// survives into the retry).
//
// A class because React only exposes error boundaries through
// getDerivedStateFromError/componentDidCatch — there is no hook for this.
export default class ErrorBoundary extends React.Component {
  state = { failed: false, resetKey: 0, language: 'en' };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error) {
    console.warn('Render crash caught by ErrorBoundary:', error?.message);
    // Message and stack only, to our own API — see utils/crashReport.js.
    reportClientError(error, 'render', { fatal: true });
    // This sits above the context that holds the language, so it reads the
    // saved choice directly. Failing to read it leaves English, never a blank.
    getJSON('language', null)
      .then((saved) => { if (saved) this.setState({ language: normalizeLanguage(saved) }); })
      .catch(() => {});
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
          <Text style={styles.title}>{translate(this.state.language, 'errors.title')}</Text>
          <Text style={styles.sub}>
            {translate(this.state.language, 'errors.body')}
          </Text>
          <Pressable style={styles.btn} onPress={this.handleReset} accessibilityRole="button">
            <Text style={styles.btnText}>{translate(this.state.language, 'errors.reload')}</Text>
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
    alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg,
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
