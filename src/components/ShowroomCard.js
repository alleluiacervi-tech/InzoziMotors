import React from 'react';
import { View, Text, StyleSheet, Pressable, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Photo from './Photo';
import BrandMark from './BrandMark';
import { colors, radius, fonts, typography } from '../theme';
import { PHOTO } from '../utils/photo';
import { openStatus, openStatusText } from '../utils/showroomHours';

const TONE_DOT = { open: colors.green, soon: colors.amber, closed: colors.textMuted };

// ─────────────────────────────────────────────────────────────────────────────
// A verified showroom, as a card worth tapping: a real photo on top (the
// showroom itself when the team set one, else its newest car), its logo on the
// photo's edge, the name on up to two lines, whether it is open right now, and
// the brands it stocks. Width is the caller's: full width when there are one or
// two showrooms, a peeking rail when there are more.
//
// The logo is fitted inside a white square, never cropped into a circle: a
// business's logo is usually a word, and cropping cut "MOTORHEADS" to "TORHEA".
// ─────────────────────────────────────────────────────────────────────────────
export default function ShowroomCard({ room, width, onPress, brandLogo, t, now }) {
  const brands = Array.isArray(room.brands) ? room.brands : [];
  const status = openStatus(room.hours, now);
  const statusText = openStatusText(status, t);
  const count = t('browse.showroomCars', { count: room.live_count });

  return (
    <Pressable
      style={({ pressed }) => [styles.card, width ? { width } : null, pressed && styles.pressed]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={[room.name, statusText, count].filter(Boolean).join(', ')}
    >
      <View style={styles.cover}>
        {room.cover_image ? (
          <Photo uri={room.cover_image} width={PHOTO.CARD} style={StyleSheet.absoluteFill} resizeMode="cover" />
        ) : null}
        <View style={styles.logo}>
          {room.avatar_url ? (
            <Image source={{ uri: room.avatar_url }} style={styles.logoImage} resizeMode="contain" accessibilityIgnoresInvertColors />
          ) : (
            <Text style={styles.logoInitial}>{String(room.name || '?').charAt(0).toUpperCase()}</Text>
          )}
        </View>
      </View>

      <View style={styles.body}>
        <Text style={styles.name} numberOfLines={2}>{room.name}</Text>
        <View style={styles.row}>
          <Ionicons name="shield-checkmark" size={13} color={colors.green} />
          <Text style={styles.verified} numberOfLines={1}>
            {t('browse.verifiedShowroom')}{room.location ? ` · ${room.location}` : ''}
          </Text>
        </View>
        {statusText ? (
          <View style={styles.row}>
            <View style={[styles.dot, { backgroundColor: TONE_DOT[status.tone] }]} />
            <Text style={styles.status} numberOfLines={1}>{statusText}</Text>
          </View>
        ) : null}
        <View style={styles.foot}>
          <View style={styles.marks}>
            {brands.slice(0, 4).map((b) => (
              <BrandMark key={b.make} name={b.make} logoUrl={brandLogo(b.make)} size={24} style={styles.mark} />
            ))}
            {brands.length > 4 ? <Text style={styles.more}>+{brands.length - 4}</Text> : null}
          </View>
          <Text style={styles.count} numberOfLines={1}>{count}</Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    overflow: 'hidden',
  },
  pressed: { opacity: 0.94 },
  cover: { height: 132, backgroundColor: colors.surfaceAlt },
  logo: {
    position: 'absolute', left: 14, bottom: -26,
    width: 60, height: 60, borderRadius: 14, padding: 3,
    backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: colors.borderSoft,
    alignItems: 'center', justifyContent: 'center',
  },
  logoImage: { width: '100%', height: '100%' },
  logoInitial: { fontFamily: fonts.extraBold, fontSize: 20, color: '#14110F' },
  body: { paddingTop: 34, paddingHorizontal: 14, paddingBottom: 14, gap: 6 },
  name: { ...typography.cardTitle, fontSize: 16, lineHeight: 21, color: colors.textPrimary },
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  verified: { flex: 1, fontSize: 12.5, fontFamily: fonts.semiBold, color: colors.greenText },
  dot: { width: 8, height: 8, borderRadius: 4 },
  status: { flex: 1, fontSize: 13, fontFamily: fonts.medium, color: colors.textSecondary },
  foot: { marginTop: 4, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  marks: { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1 },
  mark: { borderWidth: 1, borderColor: colors.borderSoft },
  more: { fontSize: 12, fontFamily: fonts.semiBold, color: colors.textMuted },
  count: { fontSize: 13, fontFamily: fonts.semiBold, color: colors.textSecondary },
});
