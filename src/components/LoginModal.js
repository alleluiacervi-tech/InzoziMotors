import React from 'react';
import { View, Text, StyleSheet, Modal, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, shadows, fonts } from '../theme';
import { LogoMark } from './Logo';
import Button from './Button';
import { useApp } from '../context/AppContext';

export default function LoginModal({ visible, onClose, onSignIn, onContinueAsGuest }) {
  const { t } = useApp();

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <View style={[styles.container, shadows.card]}>
          {/* Close button */}
          <Pressable style={styles.closeBtn} onPress={onClose} hitSlop={8} accessibilityRole="button" accessibilityLabel={t('common.close')}>
            <Ionicons name="close" size={24} color={colors.textSecondary} />
          </Pressable>

          <View style={styles.logoWrapper}>
            <LogoMark size={52} />
          </View>

          <Text style={styles.title}>{t('auth.signInToContinue')}</Text>
          <Text style={styles.subtitle}>
            {t('auth.signInRequiredSub')}
          </Text>

          <Button title={t('common.signIn')} onPress={onSignIn} />

          {onContinueAsGuest && (
            <Button
              title={t('auth.browseDemoAccount')}
              variant="secondary"
              onPress={onContinueAsGuest}
              style={styles.guestBtn}
            />
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  container: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 32,
    paddingHorizontal: 24,
    alignItems: 'center',
    position: 'relative',
  },
  closeBtn: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoWrapper: {
    marginBottom: 12,
  },
  title: {
    fontSize: 20,
    fontFamily: fonts.extraBold,
    color: colors.textPrimary,
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 28,
  },
  guestBtn: {
    marginTop: 10,
  },
});
