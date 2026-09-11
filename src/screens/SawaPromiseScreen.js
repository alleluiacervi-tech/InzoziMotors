import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Screen from '../components/Screen';
import BackHeader from '../components/BackHeader';
import Button from '../components/Button';
import { LogoMark } from '../components/Logo';
import { colors, fonts, radius, shadows } from '../theme';
import { useApp } from '../context/AppContext';

export default function SawaPromiseScreen({ navigation }) {
  const { t } = useApp();

  const controls = [
    { icon: 'person-circle-outline', title: t('sawaPromise.ctrl1Title'), text: t('sawaPromise.ctrl1Text') },
    { icon: 'construct-outline', title: t('sawaPromise.ctrl2Title'), text: t('sawaPromise.ctrl2Text') },
    { icon: 'eye-outline', title: t('sawaPromise.ctrl3Title'), text: t('sawaPromise.ctrl3Text') },
    { icon: 'lock-closed-outline', title: t('sawaPromise.ctrl4Title'), text: t('sawaPromise.ctrl4Text') },
    { icon: 'flag-outline', title: t('sawaPromise.ctrl5Title'), text: t('sawaPromise.ctrl5Text') },
  ];

  return (
    <Screen background={colors.bg}>
      <BackHeader title={t('sawaPromise.title')} onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <LogoMark size={78} />
          <Text style={styles.heroTitle}>{t('sawaPromise.heroTitle')}</Text>
          <Text style={styles.heroText}>{t('sawaPromise.heroText')}</Text>
        </View>
        <Text style={styles.sectionTitle}>{t('sawaPromise.whatWeControl')}</Text>
        {controls.map((item) => (
          <View key={item.title} style={styles.card}>
            <View style={styles.icon}>
              <Ionicons name={item.icon} size={21} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>{item.title}</Text>
              <Text style={styles.cardText}>{item.text}</Text>
            </View>
          </View>
        ))}
        <View style={styles.directCard}>
          <Text style={styles.directTitle}>{t('sawaPromise.whatUsersControl')}</Text>
          <Text style={styles.directText}>{t('sawaPromise.whatUsersControlText')}</Text>
        </View>
        <View style={styles.noGuarantee}>
          <Ionicons name="information-circle-outline" size={22} color={colors.amber} />
          <Text style={styles.noGuaranteeText}>{t('sawaPromise.noGuarantee')}</Text>
        </View>
        <Button
          title={t('sawaPromise.howDirectBuyingWorks')}
          icon="book-outline"
          onPress={() => navigation.navigate('BuyingGuide')}
          style={{ marginTop: 16 }}
        />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingTop: 8, paddingBottom: 46 },
  hero: { alignItems: 'center', borderRadius: radius.xxl, borderWidth: 1, borderColor: colors.borderSoft, backgroundColor: colors.surface, padding: 23, ...shadows.card },
  heroTitle: { marginTop: 14, fontSize: 21, fontFamily: fonts.extraBold, color: colors.textPrimary, textAlign: 'center' },
  heroText: { marginTop: 8, fontSize: 13, lineHeight: 20, color: colors.textSecondary, textAlign: 'center' },
  sectionTitle: { marginTop: 24, marginBottom: 10, fontSize: 17, fontFamily: fonts.extraBold, color: colors.textPrimary },
  card: { flexDirection: 'row', alignItems: 'flex-start', gap: 13, marginBottom: 10, borderRadius: radius.xl, borderWidth: 1, borderColor: colors.borderSoft, backgroundColor: colors.surface, padding: 15 },
  icon: { width: 42, height: 42, borderRadius: 14, backgroundColor: colors.blueTint, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { fontSize: 15, fontFamily: fonts.extraBold, color: colors.textPrimary },
  cardText: { marginTop: 4, fontSize: 13, lineHeight: 18, color: colors.textSecondary },
  directCard: { marginTop: 8, borderRadius: radius.xl, backgroundColor: colors.navyDeep, padding: 17 },
  directTitle: { fontSize: 15, fontFamily: fonts.extraBold, color: '#fff' },
  directText: { marginTop: 6, fontSize: 13, lineHeight: 19, color: 'rgba(255,255,255,0.82)' },
  noGuarantee: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginTop: 12, borderRadius: radius.xl, backgroundColor: '#FFF8E8', padding: 15 },
  noGuaranteeText: { flex: 1, fontSize: 13, lineHeight: 19, color: colors.textSecondary },
});
