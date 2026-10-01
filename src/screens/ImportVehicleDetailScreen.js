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
        <BackHeader title={t('importCatalog.title')} onBack={() => navigation.goBack()} />
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{t('importCatalog.unavailable')}</Text>
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
  // Which kind of picture this is, said plainly under it: an official photo of
  // the model, or a studio image of the current model. Neither is the buyer's
  // actual unit, and the quotation is where that unit's photos arrive.
  const imageKind = uploaded.length ? 'official' : item.renderUrl ? 'studio' : null;

  const handleRequestQuote = async () => {
    if (!user) {
      Alert.alert(
        t('importCatalog.signInTitle'),
        t('importCatalog.signInBody'),
        [
          { text: t('common.cancel'), style: 'cancel' },
          { text: t('importCatalog.signIn'), onPress: () => navigation.navigate('SignIn') },
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
      showToast(t('importCatalog.submitted'), 'success');
      navigation.navigate('ImportOrderDetail', { id: created.id });
    } catch (err) {
      Alert.alert(t('importCatalog.requestFailedTitle'), err.message || t('importCatalog.requestFailedBody'));
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
                  {/* Contained on white: official cut-outs and studio images are
                      shot on white, and cropping would cut the car's ends off. */}
                  <ExpoImage
                    source={{ uri: transformCloudinaryUrl(img, { width: 1200 }) }}
                    style={styles.slideImage}
                    contentFit="contain"
                    priority="high"
                    transition={150}
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
                  {t('importCatalog.photosWithQuote')}
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
              {flag} {t('importCatalog.directImportFrom', { country: item.originCountry })}
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
        {imageKind ? (
          <Text style={styles.imageKindNote}>
            {imageKind === 'studio' ? t('importCatalog.studioNote') : t('importCatalog.officialNote')}
          </Text>
        ) : null}

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
              <Text style={styles.transitPillText}>{t('importCatalog.transitDays', { days: item.estimatedTransitDays || 35 })}</Text>
            </View>
          </View>

          <View style={styles.routeRow}>
            <Ionicons name="navigate-outline" size={15} color={colors.textMuted} />
            <Text style={styles.routeText}>
              {t('importCatalog.route', { port: item.originPort })}
            </Text>
          </View>

          {item.description ? (
            <Text style={styles.description}>{item.description}</Text>
          ) : null}
        </View>

        {/* Technical Specs */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>{t('importCatalog.specsTitle')}</Text>
          <View style={styles.specGrid}>
            <View style={styles.specBox}>
              <Text style={styles.specBoxLabel}>{t('importCatalog.displacement')}</Text>
              <Text style={[styles.specBoxVal, !item.engineCc && styles.specBoxValUnknown]}>
                {item.engineCc ? `${item.engineCc} cc` : t('importCatalog.byTrim')}
              </Text>
            </View>
            <View style={styles.specBox}>
              <Text style={styles.specBoxLabel}>{t('importCatalog.fuel')}</Text>
              <Text style={styles.specBoxVal}>
                {(item.fuelTypes || []).join(' · ') || '—'}
              </Text>
            </View>
            <View style={styles.specBox}>
              <Text style={styles.specBoxLabel}>{t('importCatalog.transmission')}</Text>
              <Text style={styles.specBoxVal}>{item.transmission}</Text>
            </View>
            <View style={styles.specBox}>
              <Text style={styles.specBoxLabel}>{t('importCatalog.driveSide')}</Text>
              <Text style={styles.specBoxVal}>{item.driveSide || t('importCatalog.lhdRwanda')}</Text>
            </View>
            <View style={styles.specBox}>
              <Text style={styles.specBoxLabel}>{t('importCatalog.bodyClass')}</Text>
              <Text style={styles.specBoxVal}>{item.bodyType}</Text>
            </View>
            <View style={styles.specBox}>
              <Text style={styles.specBoxLabel}>{t('importCatalog.condition')}</Text>
              <Text style={styles.specBoxVal}>{t('importCatalog.brandNew')}</Text>
            </View>
          </View>

          {item.highlights && item.highlights.length > 0 && (
            <View style={styles.highlightsContainer}>
              <Text style={styles.highlightsTitle}>{t('importCatalog.keyEquipment')}</Text>
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
                {quote ? t('importCatalog.costEstimateTitle') : t('importCatalog.pricingTitle')}
              </Text>
              <Text style={styles.costSub}>
                {quote ? t('importCatalog.costEstimateSub') : t('importCatalog.quotedPerOrderSub')}
              </Text>
            </View>
          </View>

          {quote ? (
            <View style={styles.costTable}>
              <View style={styles.costRow}>
                <Text style={styles.costLabel}>{t('importCatalog.cost1')}</Text>
                <Text style={styles.costVal}>{formatRWF(quote.vehicleValueRwf)}</Text>
              </View>
              <Text style={styles.costNote}>{t('importCatalog.cost1Note', { usd: quote.fobUsd.toLocaleString('en-US') })}</Text>

              <View style={styles.costRow}>
                <Text style={styles.costLabel}>{t('importCatalog.cost2')}</Text>
                <Text style={styles.costVal}>{formatRWF(quote.freightRwf)}</Text>
              </View>
              <Text style={styles.costNote}>{t('importCatalog.cost2Note', { usd: quote.freightUsd.toLocaleString('en-US') })}</Text>

              <View style={styles.costRow}>
                <Text style={styles.costLabel}>{t('importCatalog.cost3')}</Text>
                <Text style={styles.costVal}>{formatRWF(quote.insuranceRwf)}</Text>
              </View>

              {/* Duty needs the engine size. Without it the line would be a
                  guess dressed as a tariff calculation, so it says what is
                  missing instead of printing a number. */}
              <View style={styles.costRow}>
                <Text style={styles.costLabel}>{t('importCatalog.cost4')}</Text>
                <Text style={[styles.costVal, !quote.dutyKnown && styles.costValUnknown]}>
                  {quote.dutyKnown ? formatRWF(quote.totalDutiesRwf) : t('importCatalog.dutyUnknown')}
                </Text>
              </View>
              <Text style={styles.costNote}>
                {quote.dutyKnown ? t('importCatalog.dutyNoteKnown') : t('importCatalog.dutyNoteUnknown')}
              </Text>

              <View style={styles.costRow}>
                <Text style={styles.costLabel}>{t('importCatalog.cost5')}</Text>
                <Text style={styles.costVal}>{formatRWF(quote.clearingRwf)}</Text>
              </View>
              <Text style={styles.costNote}>{t('importCatalog.cost5Note')}</Text>

              <View style={styles.totalDivider} />

              <View style={styles.costRowTotal}>
                <View>
                  <Text style={styles.totalLabel}>
                    {quote.dutyKnown ? t('importCatalog.totalEstimated') : t('importCatalog.totalBeforeDuty')}
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
              <Text style={styles.noQuoteTitle}>{t('importCatalog.noQuoteTitle')}</Text>
              <Text style={styles.noQuoteBody}>
                {t('importCatalog.noQuoteBody', { make: item.make, model: item.model })}
              </Text>
              <View style={styles.noQuoteList}>
                {[
                  t('importCatalog.noQuote1'),
                  t('importCatalog.noQuote2'),
                  t('importCatalog.noQuote3'),
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

        {/* The steps of an import order. Same eight, in the same words, as the
            website's import page — the previous four-step copy here promised an
            overseas inspection with video and GPS container tracking that the
            order flow does not provide. */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>{t('importCatalog.stepsTitle')}</Text>
          <View style={styles.steps}>
            {['request', 'quote', 'agreement', 'deposit', 'shipping', 'inspection', 'balance', 'handover'].map((key, index, all) => (
              <React.Fragment key={key}>
                <View style={styles.stepItem}>
                  <View style={styles.stepNumber}>
                    <Text style={styles.stepNumText}>{index + 1}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.stepTitle}>{t(`importCatalog.step_${key}_t`)}</Text>
                    <Text style={styles.stepDesc}>{t(`importCatalog.step_${key}_b`)}</Text>
                  </View>
                </View>
                {index < all.length - 1 ? <View style={styles.stepLine} /> : null}
              </React.Fragment>
            ))}
          </View>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Bottom Sticky CTA Bar */}
      <View style={styles.bottomBar}>
        <View style={styles.bottomPriceCol}>
          <Text style={styles.bottomPriceLabel}>
            {quote ? t('importCatalog.estLanded') : t('importCatalog.brandNew')}
          </Text>
          <Text style={styles.bottomPriceRwf}>
            {quote ? formatRWF(quote.grandTotalRwf) : t('importCatalog.priceOnRequest')}
          </Text>
        </View>

        <Pressable
          style={styles.quoteBtn}
          onPress={() => setModalVisible(true)}
          accessibilityRole="button"
        >
          <Text style={styles.quoteBtnText}>{t('importCatalog.requestQuote')}</Text>
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
              <Text style={styles.modalTitle}>{t('importCatalog.modalTitle')}</Text>
              <Pressable onPress={() => setModalVisible(false)} hitSlop={10}>
                <Ionicons name="close" size={22} color={colors.textSecondary} />
              </Pressable>
            </View>

            <Text style={styles.modalCar}>
              {item.make} {item.model} ({item.originCountry})
            </Text>
            <Text style={styles.modalSub}>
              {t('importCatalog.modalSub', { port: item.originPort })}
            </Text>

            <Text style={styles.inputLabel}>{t('importCatalog.notesLabel')}</Text>
            <TextInput
              style={styles.modalInput}
              placeholder={t('importCatalog.notesPlaceholder')}
              placeholderTextColor={colors.textMuted}
              multiline
              numberOfLines={4}
              value={customerNotes}
              onChangeText={setCustomerNotes}
            />

            <View style={styles.modalEscrowNote}>
              <Ionicons name="shield-checkmark" size={16} color={colors.greenText} />
              <Text style={styles.modalEscrowText}>
                {t('importCatalog.noPayment')}
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
                <Text style={styles.modalSubmitBtnText}>{t('importCatalog.submit')}</Text>
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
    backgroundColor: '#FFFFFF',
  },
  imageKindNote: {
    ...typography.caption,
    color: colors.textMuted,
    paddingHorizontal: 16,
    paddingTop: 8,
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
