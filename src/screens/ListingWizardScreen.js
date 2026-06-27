import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, Pressable, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Screen from '../components/Screen';
import BackHeader from '../components/BackHeader';
import Button from '../components/Button';
import { colors, radius } from '../theme';
import { useApp } from '../context/AppContext';

const STEPS = ['Details', 'Photos', 'Pricing'];

export default function ListingWizardScreen({ navigation }) {
  const { addListing } = useApp();
  const [step, setStep] = useState(0);
  const next = () => {
    if (step < 2) {
      setStep(step + 1);
    } else {
      addListing({
        id: 's' + Date.now(),
        title: '2020 Honda Accord EX-L',
        reserve: 21000,
        currentBid: 0,
        bids: 0,
        timeLeft: '48h left',
        status: 'live',
        image: 'https://images.unsplash.com/photo-1619767886558-efdc259cde1a?w=400&q=80',
      });
      Alert.alert('Listing Published!', 'Your 48-hour auction is now live.', [
        { text: 'View Dashboard', onPress: () => navigation.navigate('SellerDashboard') },
      ]);
    }
  };
  const back = () => (step > 0 ? setStep(step - 1) : navigation.goBack());

  return (
    <Screen background={colors.bg}>
      <BackHeader title={`List your car · ${STEPS[step]}`} onBack={back} />

      {/* Progress */}
      <View style={styles.progress}>
        {STEPS.map((s, i) => (
          <View key={s} style={styles.progressItem}>
            <View style={[styles.dot, i <= step && styles.dotOn]}>
              {i < step ? (
                <Ionicons name="checkmark" size={14} color="#fff" />
              ) : (
                <Text style={[styles.dotNum, { color: i <= step ? '#fff' : colors.textMuted }]}>{i + 1}</Text>
              )}
            </View>
            {i < STEPS.length - 1 ? <View style={[styles.line, i < step && styles.lineOn]} /> : null}
          </View>
        ))}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 20, paddingTop: 8 }}>
        {step === 0 && <DetailsStep />}
        {step === 1 && <PhotosStep />}
        {step === 2 && <PricingStep />}
      </ScrollView>

      <View style={styles.footer}>
        <Button title={step < 2 ? 'Continue' : 'Launch 48-Hour Auction'} onPress={next} />
      </View>
    </Screen>
  );
}

function Field({ label, value, placeholder }) {
  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={styles.label}>{label}</Text>
      <TextInput style={styles.input} defaultValue={value} placeholder={placeholder} placeholderTextColor={colors.textMuted} />
    </View>
  );
}

function DetailsStep() {
  return (
    <View>
      <Text style={styles.stepTitle}>Tell us about your car</Text>
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <View style={{ flex: 1 }}><Field label="Make" value="Honda" /></View>
        <View style={{ flex: 1 }}><Field label="Model" value="Accord" /></View>
      </View>
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <View style={{ flex: 1 }}><Field label="Year" value="2020" /></View>
        <View style={{ flex: 1 }}><Field label="Mileage" value="42,000" /></View>
      </View>
      <Field label="Trim" value="EX-L" />
      <Text style={styles.label}>Condition</Text>
      <View style={styles.conditionRow}>
        {['Excellent', 'Good', 'Fair'].map((c, i) => (
          <View key={c} style={[styles.condition, i === 0 && styles.conditionOn]}>
            <Text style={[styles.conditionText, { color: i === 0 ? '#fff' : colors.slate600 }]}>{c}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function PhotosStep() {
  return (
    <View>
      <Text style={styles.stepTitle}>Add photos</Text>
      <Text style={styles.stepSub}>Listings with 8+ photos sell 3x faster.</Text>
      <View style={styles.photoGrid}>
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <View key={i} style={[styles.photo, i === 0 && styles.photoMain]}>
            {i === 0 ? (
              <>
                <Ionicons name="camera" size={26} color={colors.primary} />
                <Text style={styles.photoLabel}>Add cover</Text>
              </>
            ) : (
              <Ionicons name="add" size={24} color={colors.textMuted} />
            )}
          </View>
        ))}
      </View>
      <View style={styles.tip}>
        <Ionicons name="sparkles" size={18} color={colors.primary} />
        <Text style={styles.tipText}>AI will auto-enhance lighting and suggest the best cover shot.</Text>
      </View>
    </View>
  );
}

function PricingStep() {
  return (
    <View>
      <Text style={styles.stepTitle}>Set your price</Text>
      <View style={styles.sellType}>
        <View style={[styles.sellOption, styles.sellOptionOn]}>
          <Ionicons name="hammer-outline" size={20} color="#fff" />
          <Text style={[styles.sellOptionText, { color: '#fff' }]}>Auction</Text>
        </View>
        <View style={styles.sellOption}>
          <Ionicons name="pricetag-outline" size={20} color={colors.slate600} />
          <Text style={styles.sellOptionText}>Fixed price</Text>
        </View>
      </View>

      <View style={styles.reserveCard}>
        <View style={styles.reserveTop}>
          <Text style={styles.reserveLabel}>Reserve price</Text>
          <Text style={styles.reserveHint}>Min. accepted bid</Text>
        </View>
        <Text style={styles.reserveValue}>$21,000</Text>
        <View style={styles.track}>
          <View style={styles.trackFill} />
          <View style={styles.knob} />
        </View>
        <View style={styles.rangeRow}>
          <Text style={styles.rangeText}>$18,000</Text>
          <Text style={styles.rangeText}>$24,000</Text>
        </View>
      </View>

      <View style={styles.estimate}>
        <Text style={styles.estimateLabel}>Estimated final price</Text>
        <Text style={styles.estimateValue}>$22,400 – $23,800</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  progress: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 40, paddingVertical: 12 },
  progressItem: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  dot: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
  dotOn: { backgroundColor: colors.primary },
  dotNum: { fontSize: 13, fontWeight: '800' },
  line: { flex: 1, height: 3, backgroundColor: colors.border, marginHorizontal: 4, borderRadius: 2 },
  lineOn: { backgroundColor: colors.primary },
  stepTitle: { fontSize: 20, fontWeight: '800', color: colors.textPrimary, marginBottom: 4 },
  stepSub: { fontSize: 14, color: colors.textSecondary, marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', color: colors.slate600, marginBottom: 6 },
  input: { height: 50, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, backgroundColor: colors.surface, paddingHorizontal: 14, fontSize: 15, color: colors.textPrimary },
  conditionRow: { flexDirection: 'row', gap: 10, marginTop: 6 },
  condition: { flex: 1, paddingVertical: 13, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, alignItems: 'center' },
  conditionOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  conditionText: { fontSize: 14, fontWeight: '700' },
  photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 12 },
  photo: { width: '31%', aspectRatio: 1, borderRadius: radius.lg, borderWidth: 1.5, borderColor: colors.border, borderStyle: 'dashed', backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', gap: 6 },
  photoMain: { width: '100%', aspectRatio: 16 / 9, borderColor: colors.primary, backgroundColor: colors.blueTint },
  photoLabel: { fontSize: 13, fontWeight: '700', color: colors.primary },
  tip: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.blueTint, borderRadius: radius.lg, padding: 14, marginTop: 16 },
  tipText: { flex: 1, fontSize: 13, color: colors.slate700, lineHeight: 18 },
  sellType: { flexDirection: 'row', gap: 10, marginVertical: 8 },
  sellOption: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  sellOptionOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  sellOptionText: { fontSize: 14, fontWeight: '700', color: colors.slate600 },
  reserveCard: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderSoft, borderRadius: radius.xl, padding: 16, marginTop: 16 },
  reserveTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  reserveLabel: { fontSize: 14, fontWeight: '700', color: colors.textPrimary },
  reserveHint: { fontSize: 12, color: colors.textSecondary },
  reserveValue: { fontSize: 28, fontWeight: '800', color: colors.textPrimary, marginTop: 8 },
  track: { height: 6, borderRadius: 3, backgroundColor: colors.border, marginTop: 14 },
  trackFill: { position: 'absolute', left: 0, top: 0, height: 6, width: '48%', borderRadius: 3, backgroundColor: colors.primary },
  knob: { position: 'absolute', left: '48%', top: -8, width: 22, height: 22, borderRadius: 11, backgroundColor: '#fff', borderWidth: 3, borderColor: colors.primary, marginLeft: -11 },
  rangeRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  rangeText: { fontSize: 11, color: colors.textMuted },
  estimate: { backgroundColor: colors.greenTint, borderRadius: radius.lg, padding: 16, marginTop: 16, alignItems: 'center' },
  estimateLabel: { fontSize: 13, fontWeight: '600', color: colors.green },
  estimateValue: { fontSize: 20, fontWeight: '800', color: colors.green, marginTop: 4 },
  footer: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 28, borderTopWidth: 1, borderTopColor: colors.borderSoft, backgroundColor: colors.surface },
});
