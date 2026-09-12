import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Dimensions,
  TextInput,
  Modal,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import Screen from '../components/Screen';
import BackHeader from '../components/BackHeader';
import EscrowGuaranteeCard from '../components/EscrowGuaranteeCard';
import { colors, radius, shadows, fonts } from '../theme';
import { RWF_RATE, formatRWF, calcRwandaDuty } from '../data/marketData';
import { transformCloudinaryUrl } from '../utils/photo';
import { useApp } from '../context/AppContext';
import importsApi from '../api/imports';
import { showToast } from '../components/Feedback';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const COUNTRY_FLAGS = {
  'South Korea': '🇰🇷',
  'China': '🇨🇳',
  'United Arab Emirates': '🇦🇪',
  'Japan': '🇯🇵',
};

export default function ImportVehicleDetailScreen({ navigation, route }) {
  const { user, t } = useApp();
  const item = route.params?.item;

  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [modalVisible, setModalVisible] = useState(false);
  const [customerNotes, setCustomerNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!item) {
    return (
      <Screen background={colors.bg}>
        <BackHeader title="Import Vehicle" onBack={() => navigation.goBack()} />
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Vehicle information not available.</Text>
        </View>
      </Screen>
    );
  }

  const flag = COUNTRY_FLAGS[item.originCountry] || '🌐';

  // Cost calculation
  const fobUsd = item.typicalFobUsd || 15000;
  const freightUsd = item.typicalFreightUsd || 2800;
  const insuranceUsd = Math.round(fobUsd * 0.015);
  const clearingUsd = 650; // Port handling, radar, clearing agent & registration

  const vehicleValueRwf = fobUsd * RWF_RATE;
  const freightRwf = freightUsd * RWF_RATE;
  const insuranceRwf = insuranceUsd * RWF_RATE;
  const clearingRwf = clearingUsd * RWF_RATE;

  const ageYears = Math.max(0, new Date().getFullYear() - (item.yearEnd || 2022));
  const duty = calcRwandaDuty(vehicleValueRwf, item.engineCc || 2000, ageYears);
  const totalDutiesRwf = duty ? duty.totalDuties : 0;

  const grandTotalRwf = vehicleValueRwf + freightRwf + insuranceRwf + totalDutiesRwf + clearingRwf;
  const grandTotalUsd = Math.round(grandTotalRwf / RWF_RATE);

  const initialDepositRwf = Math.floor(grandTotalRwf / 2);
  const finalBalanceRwf = grandTotalRwf - initialDepositRwf;

  const images = item.images && item.images.length > 0
    ? item.images
    : ['https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=800&q=80'];

  const handleRequestQuote = async () => {
    if (!user) {
      Alert.alert(
        'Sign In Required',
        'Please sign in or create an account to request an official import quotation with escrow protection.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Sign In', onPress: () => navigation.navigate('SignIn') },
        ]
      );
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        origin_country: item.originCountry,
        make: item.make,
        model: item.model,
        year: item.yearEnd || new Date().getFullYear(),
        specification: {
          catalog_id: item.id,
          trim: item.trim,
          engine_cc: item.engineCc,
          fuel_type: item.fuelType,
          transmission: item.transmission,
          drive_side: item.driveSide,
          typical_fob_usd: fobUsd,
          typical_freight_usd: freightUsd,
          estimated_landed_rwf: grandTotalRwf,
          origin_port: item.originPort,
        },
        customer_notes: customerNotes.trim() || `Interested in importing ${item.make} ${item.model} (${item.trim || ''}).`,
      };

      const created = await importsApi.create(payload);
      setModalVisible(false);
      showToast('Import request submitted successfully!', 'success');
      navigation.navigate('ImportOrderDetail', { id: created.id });
    } catch (err) {
      Alert.alert('Request Failed', err.message || 'Could not submit import enquiry. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Screen background={colors.bg}>
      <BackHeader title={`${item.make} ${item.model}`} onBack={() => navigation.goBack()} />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* Gallery */}
        <View style={styles.galleryContainer}>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={(e) => {
              const slide = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
              setActiveImageIndex(slide);
            }}
            scrollEventThrottle={16}
          >
            {images.map((img, idx) => (
              <View key={idx} style={styles.slide}>
                <ExpoImage
                  source={{ uri: transformCloudinaryUrl(img, { width: 900 }) }}
                  style={styles.slideImage}
                  contentFit="cover"
                  priority="high"
                />
              </View>
            ))}
          </ScrollView>

          {/* Dots */}
          {images.length > 1 && (
            <View style={styles.dotsContainer}>
              {images.map((_, idx) => (
                <View
                  key={idx}
                  style={[styles.dot, activeImageIndex === idx && styles.dotActive]}
                />
              ))}
            </View>
          )}

          {/* Origin Badge */}
          <View style={styles.originFloatingBadge}>
            <Text style={styles.originFloatingText}>
              {flag} Direct Import from {item.originCountry}
            </Text>
          </View>
        </View>

        {/* Title & Overview Card */}
        <View style={styles.sectionCard}>
          <View style={styles.rowBetween}>
            <View style={{ flex: 1 }}>
              <Text style={styles.carTitle}>
                {item.yearStart && item.yearEnd ? `${item.yearStart}–${item.yearEnd} ` : ''}{item.make} {item.model}
              </Text>
              {item.trim ? <Text style={styles.carTrim}>{item.trim}</Text> : null}
            </View>
            <View style={styles.transitPill}>
              <Ionicons name="boat-outline" size={14} color="#1D4ED8" />
              <Text style={styles.transitPillText}>~{item.estimatedTransitDays || 35} Days</Text>
            </View>
          </View>

          <View style={styles.routeRow}>
            <Ionicons name="navigate-outline" size={15} color={colors.textMuted} />
            <Text style={styles.routeText}>
              {item.originPort} → Mombasa / Dar es Salaam → Kigali Dry Port
            </Text>
          </View>

          {item.description ? (
            <Text style={styles.description}>{item.description}</Text>
          ) : null}
        </View>

        {/* Technical Specs */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Vehicle Specifications</Text>
          <View style={styles.specGrid}>
            <View style={styles.specBox}>
              <Text style={styles.specBoxLabel}>Displacement</Text>
              <Text style={styles.specBoxVal}>{item.engineCc ? `${item.engineCc} cc` : 'EV'}</Text>
            </View>
            <View style={styles.specBox}>
              <Text style={styles.specBoxLabel}>Fuel Type</Text>
              <Text style={styles.specBoxVal}>{item.fuelType}</Text>
            </View>
            <View style={styles.specBox}>
              <Text style={styles.specBoxLabel}>Transmission</Text>
              <Text style={styles.specBoxVal}>{item.transmission}</Text>
            </View>
            <View style={styles.specBox}>
              <Text style={styles.specBoxLabel}>Drive Side</Text>
              <Text style={styles.specBoxVal}>{item.driveSide || 'LHD (Rwanda)'}</Text>
            </View>
            <View style={styles.specBox}>
              <Text style={styles.specBoxLabel}>Body Class</Text>
              <Text style={styles.specBoxVal}>{item.bodyType}</Text>
            </View>
            <View style={styles.specBox}>
              <Text style={styles.specBoxLabel}>Year Band</Text>
              <Text style={styles.specBoxVal}>{item.yearStart}–{item.yearEnd}</Text>
            </View>
          </View>

          {item.highlights && item.highlights.length > 0 && (
            <View style={styles.highlightsContainer}>
              <Text style={styles.highlightsTitle}>Key Equipment & Options</Text>
              <View style={styles.highlightTags}>
                {item.highlights.map((h, i) => (
                  <View key={i} style={styles.highlightTag}>
                    <Ionicons name="checkmark" size={13} color={colors.primary} />
                    <Text style={styles.highlightTagText}>{h}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </View>

        {/* Itemized Landed Cost Breakdown */}
        <View style={styles.sectionCard}>
          <View style={styles.costHeader}>
            <View style={styles.costIconBox}>
              <Ionicons name="calculator-outline" size={20} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.sectionTitle}>Transparent Landed Cost</Text>
              <Text style={styles.costSub}>All-inclusive estimate delivered to Kigali</Text>
            </View>
          </View>

          <View style={styles.costTable}>
            <View style={styles.costRow}>
              <Text style={styles.costLabel}>1. Vehicle Purchase Price (FOB)</Text>
              <Text style={styles.costVal}>{formatRWF(vehicleValueRwf)}</Text>
            </View>
            <Text style={styles.costNote}>Source market vehicle cost (${fobUsd.toLocaleString()} USD)</Text>

            <View style={styles.costRow}>
              <Text style={styles.costLabel}>2. Ocean & Overland Freight</Text>
              <Text style={styles.costVal}>{formatRWF(freightRwf)}</Text>
            </View>
            <Text style={styles.costNote}>Container transport to Kigali Dry Port (${freightUsd.toLocaleString()} USD)</Text>

            <View style={styles.costRow}>
              <Text style={styles.costLabel}>3. Marine Transit Insurance</Text>
              <Text style={styles.costVal}>{formatRWF(insuranceRwf)}</Text>
            </View>

            <View style={styles.costRow}>
              <Text style={styles.costLabel}>4. RRA Customs Duties & Taxes</Text>
              <Text style={styles.costVal}>{formatRWF(totalDutiesRwf)}</Text>
            </View>
            <Text style={styles.costNote}>
              Official RRA Tariff: 25% Customs, {duty?.exciseRatePct || 10}% Excise, 18% VAT, 5% WHT, 1.5% Infra
            </Text>

            <View style={styles.costRow}>
              <Text style={styles.costLabel}>5. Port Clearance & Registration</Text>
              <Text style={styles.costVal}>{formatRWF(clearingRwf)}</Text>
            </View>
            <Text style={styles.costNote}>RADEX, clearing agents, plate inspection & RRA Yellow Card</Text>

            <View style={styles.totalDivider} />

            <View style={styles.costRowTotal}>
              <View>
                <Text style={styles.totalLabel}>Total Landed Price</Text>
                <Text style={styles.totalUsd}>~${grandTotalUsd.toLocaleString('en-US')} USD</Text>
              </View>
              <Text style={styles.totalVal}>{formatRWF(grandTotalRwf)}</Text>
            </View>
          </View>
        </View>

        {/* Bank Escrow Guarantee Card */}
        <EscrowGuaranteeCard />

        {/* 4-Step Sourcing Stepper */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>How Your Import Works</Text>
          <View style={styles.steps}>
            <View style={styles.stepItem}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumText}>1</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.stepTitle}>Verified Quotation & Sourcing Agreement</Text>
                <Text style={styles.stepDesc}>
                  Our sourcing desk locks in exact vehicle specs, VIN/chassis, and issues your formal contract.
                </Text>
              </View>
            </View>

            <View style={styles.stepLine} />

            <View style={styles.stepItem}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumText}>2</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.stepTitle}>Bank Escrow Deposit (50%)</Text>
                <Text style={styles.stepDesc}>
                  Deposit {formatRWF(initialDepositRwf)} into the partner bank escrow account. Funds are safeguarded by law.
                </Text>
              </View>
            </View>

            <View style={styles.stepLine} />

            <View style={styles.stepItem}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumText}>3</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.stepTitle}>Overseas Inspection & GPS Container Tracking</Text>
                <Text style={styles.stepDesc}>
                  Pre-shipment 150-point inspection in Incheon/Dubai/Shanghai with HD videos, followed by live vessel tracking.
                </Text>
              </View>
            </View>

            <View style={styles.stepLine} />

            <View style={styles.stepItem}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumText}>4</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.stepTitle}>Kigali Inspection & Final Handover (50%)</Text>
                <Text style={styles.stepDesc}>
                  Inspect and test drive in Kigali. Once approved, the remaining {formatRWF(finalBalanceRwf)} is settled and yellow card handed over.
                </Text>
              </View>
            </View>
          </View>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Bottom Sticky CTA Bar */}
      <View style={styles.bottomBar}>
        <View style={styles.bottomPriceCol}>
          <Text style={styles.bottomPriceLabel}>Est. Landed in Kigali</Text>
          <Text style={styles.bottomPriceRwf}>{formatRWF(grandTotalRwf)}</Text>
        </View>

        <Pressable
          style={styles.quoteBtn}
          onPress={() => setModalVisible(true)}
          accessibilityRole="button"
        >
          <Text style={styles.quoteBtnText}>Request Import Quote</Text>
          <Ionicons name="arrow-forward" size={16} color="#fff" />
        </Pressable>
      </View>

      {/* Enquiry Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Request Import Sourcing Quote</Text>
              <Pressable onPress={() => setModalVisible(false)} hitSlop={10}>
                <Ionicons name="close" size={22} color={colors.textSecondary} />
              </Pressable>
            </View>

            <Text style={styles.modalCar}>
              {item.make} {item.model} ({item.originCountry})
            </Text>
            <Text style={styles.modalSub}>
              Our procurement desk will verify active overseas stock in {item.originPort} and send you a formal quotation with locked landed pricing.
            </Text>

            <Text style={styles.inputLabel}>Your Preferences / Color / Notes</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. Prefer Black or Pearl White, leather seats, 2022+ model year..."
              placeholderTextColor={colors.textMuted}
              multiline
              numberOfLines={4}
              value={customerNotes}
              onChangeText={setCustomerNotes}
            />

            <View style={styles.modalEscrowNote}>
              <Ionicons name="shield-checkmark" size={16} color={colors.greenText} />
              <Text style={styles.modalEscrowText}>
                Protected by Bank of Kigali / I&M Bank Escrow Guarantee. No payment is required today.
              </Text>
            </View>

            <Pressable
              style={[styles.modalSubmitBtn, submitting && styles.btnDisabled]}
              onPress={handleRequestQuote}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.modalSubmitBtnText}>Submit Sourcing Request</Text>
              )}
            </Pressable>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingBottom: 40,
  },
  errorContainer: {
    padding: 30,
    alignItems: 'center',
  },
  errorText: {
    fontFamily: fonts.bold,
    fontSize: 16,
    color: colors.textPrimary,
  },
  galleryContainer: {
    width: SCREEN_WIDTH,
    height: 270,
    backgroundColor: colors.surfaceAlt,
    position: 'relative',
  },
  slide: {
    width: SCREEN_WIDTH,
    height: 270,
  },
  slideImage: {
    width: '100%',
    height: '100%',
  },
  dotsContainer: {
    position: 'absolute',
    bottom: 12,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
  dotActive: {
    width: 18,
    backgroundColor: '#FFFFFF',
  },
  originFloatingBadge: {
    position: 'absolute',
    top: 14,
    left: 14,
    backgroundColor: 'rgba(23, 18, 15, 0.88)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.pill,
  },
  originFloatingText: {
    fontFamily: fonts.bold,
    fontSize: 12,
    color: '#FFFFFF',
  },
  sectionCard: {
    backgroundColor: colors.surface,
    marginHorizontal: 16,
    marginTop: 14,
    borderRadius: radius.xl,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    ...shadows.card,
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  carTitle: {
    fontFamily: fonts.extraBold,
    fontSize: 22,
    color: colors.textPrimary,
  },
  carTrim: {
    fontFamily: fonts.medium,
    fontSize: 14,
    color: colors.textMuted,
    marginTop: 2,
  },
  transitPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.pill,
  },
  transitPillText: {
    fontFamily: fonts.bold,
    fontSize: 12,
    color: '#1D4ED8',
  },
  routeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.borderSoft,
  },
  routeText: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: colors.textSecondary,
  },
  description: {
    fontFamily: fonts.regular,
    fontSize: 13.5,
    lineHeight: 20,
    color: colors.textSecondary,
    marginTop: 10,
  },
  sectionTitle: {
    fontFamily: fonts.extraBold,
    fontSize: 17,
    color: colors.textPrimary,
  },
  specGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 12,
  },
  specBox: {
    width: (SCREEN_WIDTH - 32 - 36 - 10) / 2,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    padding: 10,
    borderWidth: 1,
    borderColor: colors.borderSoft,
  },
  specBoxLabel: {
    fontFamily: fonts.medium,
    fontSize: 11,
    color: colors.textMuted,
  },
  specBoxVal: {
    fontFamily: fonts.bold,
    fontSize: 13,
    color: colors.textPrimary,
    marginTop: 2,
  },
  highlightsContainer: {
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: colors.borderSoft,
  },
  highlightsTitle: {
    fontFamily: fonts.bold,
    fontSize: 13,
    color: colors.textPrimary,
  },
  highlightTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  highlightTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#FFF1F2',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: radius.pill,
  },
  highlightTagText: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: colors.textPrimary,
  },
  costHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  costIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primaryTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  costSub: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 1,
  },
  costTable: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.lg,
    padding: 14,
  },
  costRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
  },
  costLabel: {
    fontFamily: fonts.bold,
    fontSize: 13,
    color: colors.textPrimary,
  },
  costVal: {
    fontFamily: fonts.bold,
    fontSize: 13,
    color: colors.textPrimary,
  },
  costNote: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  totalDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 14,
  },
  costRowTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    fontFamily: fonts.extraBold,
    fontSize: 15,
    color: colors.textPrimary,
  },
  totalUsd: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  totalVal: {
    fontFamily: fonts.extraBold,
    fontSize: 20,
    color: colors.primary,
  },
  steps: {
    marginTop: 14,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  stepLine: {
    width: 2,
    height: 20,
    backgroundColor: colors.borderSoft,
    marginLeft: 15,
    marginVertical: 4,
  },
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primaryTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumText: {
    fontFamily: fonts.extraBold,
    fontSize: 13,
    color: colors.primary,
  },
  stepTitle: {
    fontFamily: fonts.bold,
    fontSize: 13.5,
    color: colors.textPrimary,
  },
  stepDesc: {
    fontFamily: fonts.regular,
    fontSize: 12,
    lineHeight: 17,
    color: colors.textMuted,
    marginTop: 2,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.surface,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 28,
    borderTopWidth: 1,
    borderTopColor: colors.borderSoft,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...shadows.sheet,
  },
  bottomPriceCol: {
    flex: 1,
  },
  bottomPriceLabel: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: colors.textMuted,
  },
  bottomPriceRwf: {
    fontFamily: fonts.extraBold,
    fontSize: 18,
    color: colors.primary,
  },
  quoteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    paddingHorizontal: 18,
    paddingVertical: 13,
    borderRadius: radius.pill,
  },
  quoteBtnText: {
    fontFamily: fonts.bold,
    fontSize: 14,
    color: '#FFFFFF',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xxl,
    borderTopRightRadius: radius.xxl,
    padding: 24,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalTitle: {
    fontFamily: fonts.extraBold,
    fontSize: 18,
    color: colors.textPrimary,
  },
  modalCar: {
    fontFamily: fonts.bold,
    fontSize: 15,
    color: colors.primary,
    marginTop: 10,
  },
  modalSub: {
    fontFamily: fonts.regular,
    fontSize: 12.5,
    lineHeight: 18,
    color: colors.textSecondary,
    marginTop: 4,
  },
  inputLabel: {
    fontFamily: fonts.bold,
    fontSize: 12,
    color: colors.textPrimary,
    marginTop: 16,
    marginBottom: 6,
  },
  modalInput: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    padding: 12,
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    height: 80,
    textAlignVertical: 'top',
  },
  modalEscrowNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F0FDF4',
    padding: 10,
    borderRadius: radius.md,
    marginTop: 14,
  },
  modalEscrowText: {
    flex: 1,
    fontFamily: fonts.medium,
    fontSize: 11,
    color: colors.greenText,
  },
  modalSubmitBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 18,
  },
  modalSubmitBtnText: {
    fontFamily: fonts.bold,
    fontSize: 14,
    color: '#FFFFFF',
  },
  btnDisabled: {
    opacity: 0.6,
  },
});
