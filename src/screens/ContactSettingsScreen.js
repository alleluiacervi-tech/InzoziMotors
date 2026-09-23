import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Screen from '../components/Screen';
import BackHeader from '../components/BackHeader';
import Button from '../components/Button';
import { showToast } from '../components/Feedback';
import { useApp } from '../context/AppContext';
import { colors, fonts, radius } from '../theme';

function VisibilityRow({ icon, label, description, enabled, onPress, disabled }) {
  return <Pressable style={[styles.visibility, disabled && styles.disabled]} onPress={disabled ? undefined : onPress} accessibilityRole="switch" accessibilityState={{ checked: enabled, disabled }}><View style={styles.visibilityIcon}><Ionicons name={icon} size={20} color={colors.primary} /></View><View style={{ flex: 1 }}><Text style={styles.visibilityTitle}>{label}</Text><Text style={styles.visibilityText}>{description}</Text></View><View style={[styles.switch, enabled && styles.switchOn]}><View style={[styles.knob, enabled && styles.knobOn]} /></View></Pressable>;
}

export default function ContactSettingsScreen({ navigation }) {
  const { currentUser, updateCurrentUserProfile } = useApp();
  const [phone, setPhone] = useState(currentUser?.phone || '');
  const [whatsapp, setWhatsApp] = useState(currentUser?.whatsapp_phone || '');
  const [phoneVisible, setPhoneVisible] = useState(!!currentUser?.phone_visible);
  const [whatsappVisible, setWhatsAppVisible] = useState(!!currentUser?.whatsapp_visible);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const eligible = currentUser?.role === 'seller' && currentUser?.id_verified === 'approved' &&
    currentUser?.account_status === 'active' &&
    (currentUser?.seller_type !== 'showroom' || currentUser?.business_verified);

  useEffect(() => {
    if (!phone.trim()) setPhoneVisible(false);
  }, [phone]);
  useEffect(() => {
    if (!whatsapp.trim()) setWhatsAppVisible(false);
  }, [whatsapp]);

  const save = async () => {
    if (!eligible) return;
    const phonePattern = /^\+?[0-9 ()-]{9,24}$/;
    if (phone.trim() && !phonePattern.test(phone.trim())) return setError('Enter a valid phone number including the country code.');
    if (whatsapp.trim() && !phonePattern.test(whatsapp.trim())) return setError('Enter a valid WhatsApp number including the country code.');
    setSaving(true); setError('');
    try {
      await updateCurrentUserProfile({ phone: phone.trim(), whatsapp_phone: whatsapp.trim(), phone_visible: phoneVisible && !!phone.trim(), whatsapp_visible: whatsappVisible && !!whatsapp.trim() });
      showToast('Contact settings saved.', 'success');
      navigation.goBack();
    } catch (err) {
      setError(err?.message || 'Could not save your contact settings.');
    } finally { setSaving(false); }
  };

  return <Screen background={colors.bg}><BackHeader title="Contact visibility" onBack={() => navigation.goBack()} /><ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
    {!eligible && <View style={styles.locked}><Ionicons name="lock-closed-outline" size={23} color={colors.amberText} /><View style={{ flex: 1 }}><Text style={styles.lockedTitle}>Verification required</Text><Text style={styles.lockedText}>Contact disclosure unlocks after the team approves your identity{currentUser?.seller_type === 'showroom' ? ' and business' : ''}. An administrator can also add these details for you.</Text></View></View>}
    <Text style={styles.intro}>Choose exactly which details signed-in buyers can request from a live listing. Turning visibility off hides that channel immediately.</Text>
    <Text style={styles.label}>Phone number</Text><TextInput value={phone} onChangeText={(value) => { setPhone(value); setError(''); }} editable={eligible && !saving} keyboardType="phone-pad" placeholder="+250 ..." placeholderTextColor={colors.textMuted} style={styles.input} />
    <Text style={[styles.label, { marginTop: 17 }]}>WhatsApp number</Text><TextInput value={whatsapp} onChangeText={(value) => { setWhatsApp(value); setError(''); }} editable={eligible && !saving} keyboardType="phone-pad" placeholder="+250 ..." placeholderTextColor={colors.textMuted} style={styles.input} />
    <Text style={styles.section}>Buyer access</Text>
    <VisibilityRow icon="call-outline" label="Allow phone calls" description={phone.trim() ? 'Signed-in buyers can request this phone number.' : 'Add a phone number first.'} enabled={phoneVisible} onPress={() => setPhoneVisible((value) => !value)} disabled={!eligible || !phone.trim()} />
    <VisibilityRow icon="logo-whatsapp" label="Allow WhatsApp" description={whatsapp.trim() ? 'Signed-in buyers can request this WhatsApp number.' : 'Add a WhatsApp number first.'} enabled={whatsappVisible} onPress={() => setWhatsAppVisible((value) => !value)} disabled={!eligible || !whatsapp.trim()} />
    <View style={styles.safety}><Ionicons name="shield-checkmark-outline" size={20} color={colors.primary} /><Text style={styles.safetyText}>Every disclosure is authenticated and logged. Buyers still accept the direct-deal notice before your contact is returned.</Text></View>
    {!!error && <Text style={styles.error}>{error}</Text>}
    <Button title="Save contact settings" icon="checkmark-outline" loading={saving} disabled={!eligible} onPress={save} style={{ marginTop: 16 }} />
  </ScrollView></Screen>;
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingTop: 8, paddingBottom: 40 }, intro: { marginBottom: 20, fontSize: 13, lineHeight: 20, color: colors.textSecondary }, locked: { flexDirection: 'row', alignItems: 'flex-start', gap: 11, marginBottom: 18, borderRadius: radius.xl, backgroundColor: colors.amberTint, padding: 15 }, lockedTitle: { fontSize: 14, fontFamily: fonts.extraBold, color: colors.textPrimary }, lockedText: { marginTop: 4, fontSize: 13, lineHeight: 18, color: colors.textSecondary },
  label: { marginBottom: 7, fontSize: 13, fontFamily: fonts.bold, color: colors.textPrimary }, input: { height: 50, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, backgroundColor: colors.surface, paddingHorizontal: 14, fontSize: 15, color: colors.textPrimary }, section: { marginTop: 24, marginBottom: 10, fontSize: 16, fontFamily: fonts.extraBold, color: colors.textPrimary },
  visibility: { minHeight: 76, flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10, borderWidth: 1, borderColor: colors.borderSoft, borderRadius: radius.xl, backgroundColor: colors.surface, padding: 14 }, disabled: { opacity: 0.5 }, visibilityIcon: { width: 40, height: 40, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.blueTint }, visibilityTitle: { fontSize: 14, fontFamily: fonts.extraBold, color: colors.textPrimary }, visibilityText: { marginTop: 3, fontSize: 12, lineHeight: 16, color: colors.textMuted }, switch: { width: 48, height: 28, borderRadius: 14, justifyContent: 'center', padding: 3, backgroundColor: colors.border }, switchOn: { backgroundColor: colors.primary }, knob: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#fff' }, knobOn: { alignSelf: 'flex-end' },
  safety: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginTop: 8, borderRadius: radius.lg, backgroundColor: colors.blueTint, padding: 13 }, safetyText: { flex: 1, fontSize: 12, lineHeight: 18, color: colors.textSecondary }, error: { marginTop: 12, fontSize: 13, lineHeight: 18, color: colors.danger },
});
