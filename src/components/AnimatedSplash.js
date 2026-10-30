import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LogoMark, BrandName } from './Logo';
import { lightColors, fonts } from '../theme';
import { useApp } from '../context/AppContext';

// A brief, static handover from the native splash. No required tap, rotation,
// or animation; the optional introduction remains the user's next screen.
export default function AnimatedSplash({ onFinish }) {
  const { t } = useApp();
  const finish = useRef(onFinish);
  finish.current = onFinish;
  useEffect(() => {
    const timer = setTimeout(() => finish.current?.(), 450);
    return () => clearTimeout(timer);
  }, []);
  return (
    <View style={styles.root} accessibilityViewIsModal>
      <LogoMark size={96} />
      <View style={styles.word}><BrandName height={18} color={lightColors.textPrimary} /></View>
      <Text style={styles.tag}>{t('drawer.tagline')}</Text>
    </View>
  );
}
const styles = StyleSheet.create({
  root: { ...StyleSheet.absoluteFillObject, backgroundColor: lightColors.surface, zIndex: 100, elevation: 100, alignItems: 'center', justifyContent: 'center', padding: 24 },
  word: { marginTop: 24 },
  tag: { marginTop: 12, fontFamily: fonts.medium, fontSize: 13, color: lightColors.textMuted, textAlign: 'center' },
});
