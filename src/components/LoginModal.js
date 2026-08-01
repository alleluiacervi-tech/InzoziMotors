import React from 'react';
import { View, Text, StyleSheet, Modal, Pressable, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, shadows, fonts } from '../theme';
import Logo from './Logo';

export default function LoginModal({ visible, onClose, onLoginSuccess }) {
  const handleSocialLogin = () => {
    // Simulate social authentication
    onLoginSuccess();
    onClose();
  };

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
          <Pressable style={styles.closeBtn} onPress={onClose} hitSlop={8}>
            <Ionicons name="close" size={24} color={colors.textSecondary} />
          </Pressable>

          {/* Logo & Header */}
          <View style={styles.logoWrapper}>
            <Logo size={28} />
          </View>

          <Text style={styles.title}>Sawa</Text>
          <Text style={styles.subtitle}>
            Log in easily to send real-time{'\n'}inquiries to our dealers.
          </Text>

          {/* Google login button */}
          <Pressable style={styles.googleBtn} onPress={handleSocialLogin}>
            <Ionicons name="logo-google" size={20} color="#1A1A1A" />
            <Text style={styles.googleText}>Continue with Google</Text>
          </Pressable>

          {/* Guest login bypass */}
          <Pressable style={styles.guestBtn} onPress={handleSocialLogin}>
            <Text style={styles.guestText}>Continue as Guest</Text>
          </Pressable>
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
  googleBtn: {
    width: '100%',
    height: 48,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 16,
  },
  googleText: {
    color: '#1A1A1A',
    fontSize: 14,
    fontFamily: fonts.bold,
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
