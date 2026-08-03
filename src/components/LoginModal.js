import React from 'react';
import { View, Text, StyleSheet, Modal, Pressable, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, shadows, fonts } from '../theme';
import { LogoMark } from './Logo';

// There is no social sign-in yet — the old "Continue with Google" here did not
// talk to Google at all, it just dropped the user into the demo account. Both
// paths below now say exactly what they do.
export default function LoginModal({ visible, onClose, onSignIn, onContinueAsGuest }) {
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
          <Pressable style={styles.closeBtn} onPress={onClose} hitSlop={8} accessibilityRole="button" accessibilityLabel="Close">
            <Ionicons name="close" size={24} color={colors.textSecondary} />
          </Pressable>

          <View style={styles.logoWrapper}>
            <LogoMark size={52} />
          </View>

          <Text style={styles.title}>Sign in to continue</Text>
          <Text style={styles.subtitle}>
            Saving cars and messaging sellers{'\n'}needs an account.
          </Text>

          <Pressable style={styles.signInBtn} onPress={onSignIn}>
            <Text style={styles.signInText}>Sign in</Text>
          </Pressable>

          {/* The demo account only exists in development builds — see DEMO_MODE
              in AppContext. Rendering it in a release build would offer a door
              that leads nowhere. */}
          {onContinueAsGuest && (
            <Pressable style={styles.guestBtn} onPress={onContinueAsGuest}>
              <Text style={styles.guestText}>Browse with a demo account</Text>
            </Pressable>
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
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 32,
    paddingHorizontal: 24,
    alignItems: 'center',
    position: 'relative',
  },
  closeBtn: {
    position: 'absolute',
    top: 16,
    right: 16,
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
  signInBtn: {
    width: '100%',
    height: 48,
    borderRadius: radius.lg,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  signInText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontFamily: fonts.extraBold,
    letterSpacing: -0.2,
  },
  guestBtn: {
    paddingVertical: 8,
  },
  guestText: {
    fontSize: 13,
    color: colors.primary,
    fontFamily: fonts.bold,
  },
});
