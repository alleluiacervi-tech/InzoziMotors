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
  Linking,
} from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import Screen from '../components/Screen';
import BackHeader from '../components/BackHeader';
import { colors, radius, shadows, fonts, typography } from '../theme';
import BrandMark from '../components/BrandMark';
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
  const { user, t, brandLogo } = useApp();
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

  // ── Cost, only when there is a cost ───────────────────────────────────────
  //
  // This block used to open `const fobUsd = item.typicalFobUsd || 15000`, then
  // run the full RRA duty calculation on that number and present the result as
  // a landed total, a 50% deposit and a final balance. For a catalogue in which
  // no vehicle had a price, every figure on this screen was arithmetic
  // performed on a made-up $15,000 — and the more detailed the breakdown, the
  // more convincing the invention looked.
  //
  // A price now exists only when an admin has entered one against the model,
  // from a real exporter quotation. When there is none, `quote` is null and the
  // screen says so instead of computing.
  const fobUsd = Number(item.typicalFobUsd) > 0 ? Number(item.typicalFobUsd) : null;
  const freightUsd = Number(item.typicalFreightUsd) > 0 ? Number(item.typicalFreightUsd) : null;

  const quote = fobUsd && freightUsd ? (() => {
    const insuranceUsd = Math.round(fobUsd * 0.015);
    const clearingUsd = 650; // Port handling, radar, clearing agent & registration
    const vehicleValueRwf = fobUsd * RWF_RATE;
    const freightRwf = freightUsd * RWF_RATE;
    const insuranceRwf = insuranceUsd * RWF_RATE;
    const clearingRwf = clearingUsd * RWF_RATE;
    // Brand new: zero years old, so no depreciation band applies.
    const duty = item.engineCc ? calcRwandaDuty(vehicleValueRwf, item.engineCc, 0) : null;
    const totalDutiesRwf = duty ? duty.totalDuties : 0;
    const grandTotalRwf = vehicleValueRwf + freightRwf + insuranceRwf + totalDutiesRwf + clearingRwf;
    return {
      fobUsd, freightUsd, insuranceUsd, clearingUsd,
      vehicleValueRwf, freightRwf, insuranceRwf, clearingRwf,
      totalDutiesRwf,
      dutyKnown: Boolean(duty),
      grandTotalRwf,
      grandTotalUsd: Math.round(grandTotalRwf / RWF_RATE),
      initialDepositRwf: Math.floor(grandTotalRwf / 2),
      finalBalanceRwf: grandTotalRwf - Math.floor(grandTotalRwf / 2),
    };
  })() : null;

  // No stock-photo fallback. A photograph of a different car is worse than no
  // photograph: it is a claim about what the buyer is getting. BrandMark draws
  // the marque instead, the same way an unlogo'd brand is drawn everywhere else.
  const uploaded = Array.isArray(item.images) ? item.images.filter(Boolean) : [];
  const images = uploaded.length ? uploaded : (item.renderUrl ? [item.renderUrl] : []);

  const handleRequestQuote = async () => {
    if (!user) {
      Alert.alert(
        'Sign In Required',
        'Please sign in or create an account to request an import quotation.',
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
        year: new Date().getFullYear(), // brand new: the current model year
        specification: {
          catalog_id: item.id,
          trim: item.trim,
          engine_cc: item.engineCc,
          fuel_type: (item.fuelTypes || [])[0] || null,
          transmission: item.transmission,
          drive_side: item.driveSide,
          typical_fob_usd: fobUsd,
          typical_freight_usd: freightUsd,
          estimated_landed_rwf: quote ? quote.grandTotalRwf : null,
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
            {images.length > 0 ? (
              images.map((img, idx) => (
                <View key={idx} style={styles.slide}>
                  <ExpoImage
                    source={{ uri: transformCloudinaryUrl(img, { width: 900 }) }}
                    style={styles.slideImage}
                    contentFit="cover"
                    priority="high"
                  />
                </View>
              ))
            ) : (
              /* Deliberately blank of vehicle imagery. Filling this with a stock
                 photograph of some other car is what made the old catalogue show
                 a Hilux for an Atto 3. */
              <View style={[styles.slide, styles.slideFallback]}>
                <BrandMark name={item.make} logoUrl={brandLogo(item.make)} size={72} />
                <Text style={styles.slideFallbackTitle}>{item.make} {item.model}</Text>
                <Text style={styles.slideFallbackText}>
                  Photographs of the exact unit come with your quotation
                </Text>
              </View>
            )}
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

          {/* Photo credit -- present only on an approved Commons photograph
              (see the photo review queue). CC BY / BY-SA require naming the
              photographer, the licence, and a link back to the source; this is
              that disclosure, not decoration. An operator's own upload or a
              resolved render carries no author, so this renders nothing then. */}
          {item.imageCreditAuthor ? (
            <Pressable
              onPress={() => item.imageCreditSourceUrl && Linking.openURL(item.imageCreditSourceUrl)}
              style={styles.photoCreditRow}
              accessibilityRole="link"
              accessibilityLabel={`Photo by ${item.imageCreditAuthor}, ${item.imageCreditLicense || 'licensed'}`}
            >
              <Text style={styles.photoCreditText} numberOfLines={1}>
                Photo: {item.imageCreditAuthor} · {item.imageCreditLicense || 'Wikimedia Commons'}
              </Text>
            </Pressable>
          ) : null}
        </View>

        {/* Title & Overview Card */}
        <View style={styles.sectionCard}>
          <View style={styles.rowBetween}>
            <View style={{ flex: 1 }}>
              <Text style={styles.carTitle}>
                {item.make} {item.model}
              </Text>
              {item.trim ? <Text style={styles.carTrim}>{item.trim}</Text> : null}
            </View>
            <View style={styles.transitPill}>
              <Ionicons name="boat-outline" size={14} color={colors.infoText} />
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
              <Text style={[styles.specBoxVal, !item.engineCc && styles.specBoxValUnknown]}>
                {item.engineCc ? `${item.engineCc} cc` : 'By trim'}
              </Text>
            </View>
            <View style={styles.specBox}>
              <Text style={styles.specBoxLabel}>Fuel</Text>
              <Text style={styles.specBoxVal}>
                {(item.fuelTypes || []).join(' · ') || '—'}
              </Text>
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
              <Text style={styles.specBoxLabel}>Condition</Text>
              <Text style={styles.specBoxVal}>Brand new · 0 km</Text>
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
              <Text style={styles.sectionTitle}>
                {quote ? 'Landed cost estimate' : 'Pricing'}
              </Text>
              <Text style={styles.costSub}>
                {quote
                  ? 'Estimate, delivered and cleared in Kigali'
                  : 'Quoted per order — ask and we will come back to you'}
              </Text>
            </View>
          </View>

          {quote ? (
            <View style={styles.costTable}>
              <View style={styles.costRow}>
                <Text style={styles.costLabel}>1. Vehicle price (FOB)</Text>
                <Text style={styles.costVal}>{formatRWF(quote.vehicleValueRwf)}</Text>
              </View>
              <Text style={styles.costNote}>Source market vehicle cost (${quote.fobUsd.toLocaleString()} USD)</Text>

              <View style={styles.costRow}>
                <Text style={styles.costLabel}>2. Ocean & overland freight</Text>
                <Text style={styles.costVal}>{formatRWF(quote.freightRwf)}</Text>
              </View>
              <Text style={styles.costNote}>Container transport to Kigali Dry Port (${quote.freightUsd.toLocaleString()} USD)</Text>

              <View style={styles.costRow}>
                <Text style={styles.costLabel}>3. Marine transit insurance</Text>
                <Text style={styles.costVal}>{formatRWF(quote.insuranceRwf)}</Text>
              </View>

              {/* Duty needs the engine size. Without it the line would be a
                  guess dressed as a tariff calculation, so it says what is
                  missing instead of printing a number. */}
              <View style={styles.costRow}>
                <Text style={styles.costLabel}>4. RRA customs duties & taxes</Text>
                <Text style={[styles.costVal, !quote.dutyKnown && styles.costValUnknown]}>
                  {quote.dutyKnown ? formatRWF(quote.totalDutiesRwf) : 'Not yet known'}
                </Text>
              </View>
              <Text style={styles.costNote}>
                {quote.dutyKnown
                  ? 'Official RRA tariff: 25% customs, excise by engine size, 18% VAT, 5% WHT, 1.5% infrastructure'
                  : 'Depends on the engine size of the trim you choose — confirmed with your quotation.'}
              </Text>

              <View style={styles.costRow}>
                <Text style={styles.costLabel}>5. Port clearance & registration</Text>
                <Text style={styles.costVal}>{formatRWF(quote.clearingRwf)}</Text>
              </View>
              <Text style={styles.costNote}>RADEX, clearing agents, plate inspection & RRA yellow card</Text>

              <View style={styles.totalDivider} />

              <View style={styles.costRowTotal}>
                <View>
                  <Text style={styles.totalLabel}>
                    {quote.dutyKnown ? 'Estimated landed price' : 'Estimated, before duty'}
                  </Text>
                  <Text style={styles.totalUsd}>~${quote.grandTotalUsd.toLocaleString('en-US')} USD</Text>
                </View>
                <Text style={styles.totalVal}>{formatRWF(quote.grandTotalRwf)}</Text>
              </View>
            </View>
          ) : (
            /* No price, and no invented one. The catalogue this replaced filled
               the gap with $15,000 and ran the duty maths on it, which turned a
               blank into a figure a buyer could plan around. */
            <View style={styles.noQuoteBox}>
              <Text style={styles.noQuoteTitle}>We quote this model per order</Text>
              <Text style={styles.noQuoteBody}>
                What a brand-new {item.make} {item.model} costs landed in Kigali depends on
                the trim, the exporter and the shipping week. Rather than show you a
                number we would have to take back, we price your exact specification
                and send it to you.
              </Text>
              <View style={styles.noQuoteList}>
                {[
                  'Exact trim, colour and options you choose',
                  'FOB price from the exporter, freight and insurance',
                  'RRA duty, clearance and yellow-card registration',
                ].map((line) => (
                  <View key={line} style={styles.noQuoteItem}>
                    <Ionicons name="checkmark-circle-outline" size={15} color={colors.green} />
                    <Text style={styles.noQuoteItemText}>{line}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </View>

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
                <Text style={styles.stepTitle}>Deposit to the exporter (50%)</Text>
                <Text style={styles.stepDesc}>
                  {quote
                    ? `You pay ${formatRWF(quote.initialDepositRwf)} directly to the exporter and upload the bank transfer proof, which we check before sourcing begins.`
                    : 'You pay half directly to the exporter and upload the bank transfer proof, which we check before sourcing begins.'}
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
                <Text style={styles.stepTitle}>Kigali arrival & final payment (50%)</Text>
                <Text style={styles.stepDesc}>
                  {quote
                    ? `Inspect the vehicle in Kigali, then settle the remaining ${formatRWF(quote.finalBalanceRwf)} with the exporter and take the yellow card.`
                    : 'Inspect the vehicle in Kigali, then settle the balance with the exporter and take the yellow card.'}
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
          <Text style={styles.bottomPriceLabel}>
            {quote ? 'Est. landed in Kigali' : 'Brand new · 0 km'}
          </Text>
          <Text style={styles.bottomPriceRwf}>
            {quote ? formatRWF(quote.grandTotalRwf) : 'Price on request'}
          </Text>
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
                No payment is required to submit this request — Sawa reviews it and sends a formal quotation first.
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
  specBoxValUnknown: { color: colors.textMuted },

  slideFallback: { alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: colors.surfaceAlt, paddingHorizontal: 32 },
  slideFallbackTitle: { ...typography.h4, color: colors.textPrimary },
  slideFallbackText: { ...typography.caption, color: colors.textMuted, textAlign: 'center' },
  photoCreditRow: {
    position: 'absolute',
    right: 12,
    bottom: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(20,17,15,0.55)',
    maxWidth: '70%',
  },
  photoCreditText: { fontFamily: fonts.medium, fontSize: 10.5, color: '#FFFFFF' },

  costValUnknown: { color: colors.textMuted, fontFamily: fonts.medium },
  noQuoteBox: {
    padding: 16,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.borderSoft,
  },
  noQuoteTitle: { ...typography.bodyStrong, color: colors.textPrimary },
  noQuoteBody: { ...typography.body, color: colors.textSecondary, marginTop: 6, lineHeight: 21 },
  noQuoteList: { marginTop: 14, gap: 8 },
  noQuoteItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  noQuoteItemText: { ...typography.caption, color: colors.textSecondary, flex: 1, lineHeight: 18 },

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
    backgroundColor: colors.surface,
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
    backgroundColor: colors.blueTint,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.pill,
  },
  transitPillText: {
    fontFamily: fonts.bold,
    fontSize: 12,
    color: colors.infoText,
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
    backgroundColor: colors.primaryTint,
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
    backgroundColor: colors.greenTint,
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
