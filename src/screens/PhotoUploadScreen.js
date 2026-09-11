import React, { useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Screen from '../components/Screen';
import BackHeader from '../components/BackHeader';
import Button from '../components/Button';
import StickyFooter from '../components/StickyFooter';
import { showToast } from '../components/Feedback';
import { captureImage } from '../utils/media';
import inspectionsApi from '../api/inspections';
import { colors, fonts, radius, shadows } from '../theme';
import { useApp } from '../context/AppContext';

const MAX_PHOTOS = 40;
const RECOMMENDED_PHOTOS = 10;

export default function PhotoUploadScreen({ navigation, route }) {
  const { t } = useApp();
  const { inspection, score, carId } = route.params || {};
  const [photos, setPhotos] = useState([]);
  const [uploading, setUploading] = useState(false);

  const addPhoto = async () => {
    if (photos.length >= MAX_PHOTOS) return showToast(t('photoUpload.maxPhotosToast', { max: MAX_PHOTOS }), 'info');
    const asset = await captureImage({
      preset: 'listing',
      title: t('photoUpload.photoCaptureTitle', { index: photos.length + 1 }),
      message: t('photoUpload.photoCaptureMsg'),
    });
    if (asset) setPhotos((current) => [...current, asset]);
  };

  const replacePhoto = async (index) => {
    const asset = await captureImage({
      preset: 'listing',
      title: t('photoUpload.replaceCaptureTitle', { index: index + 1 }),
    });
    if (asset) setPhotos((current) => current.map((photo, photoIndex) => photoIndex === index ? asset : photo));
  };

  const removePhoto = (index) => setPhotos((current) => current.filter((_, photoIndex) => photoIndex !== index));

  const upload = async () => {
    if (!photos.length) return showToast(t('photoUpload.atLeastOne'), 'error');
    const targetCarId = carId || inspection?.car_id;
    if (!targetCarId) return showToast(t('photoUpload.linkListingFirst'), 'error');
    setUploading(true);
    try {
      const ordered = photos.map((photo, index) => ({ ...photo, angleKey: `gallery-${String(index + 1).padStart(3, '0')}` }));
      const result = await inspectionsApi.uploadCarPhotos(targetCarId, ordered);
      showToast(t('photoUpload.uploadSuccess', { count: result.uploaded, plural: result.uploaded === 1 ? '' : 's' }), 'success');
      navigation.navigate('Main');
    } catch (err) {
      showToast(err?.message || t('photoUpload.uploadFailed'), 'error');
    } finally { setUploading(false); }
  };

  const tips = [
    t('photoUpload.tip1'),
    t('photoUpload.tip2'),
    t('photoUpload.tip3'),
    t('photoUpload.tip4'),
  ];

  return (
    <Screen background={colors.bg}>
      <BackHeader title={t('photoUpload.title')} onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.carTitle}>{inspection?.car || t('common.vehicleListing')}</Text>
            <Text style={styles.score}>
              {t('photoUpload.inspectionScore')} <Text style={styles.scoreValue}>{score || '—'}/150</Text>
            </Text>
          </View>
          <View style={styles.count}>
            <Text style={styles.countValue}>{photos.length}</Text>
            <Text style={styles.countLabel}>{t('photoUpload.photos')}</Text>
          </View>
        </View>

        <View style={styles.info}>
          <Ionicons name="images-outline" size={22} color={colors.primary} />
          <View style={{ flex: 1 }}>
            <Text style={styles.infoTitle}>{t('photoUpload.flexibleGallery')}</Text>
            <Text style={styles.infoText}>
              {t('photoUpload.flexibleGallerySub', { max: MAX_PHOTOS })}
            </Text>
          </View>
        </View>

        <View style={styles.grid}>
          {photos.map((photo, index) => (
            <View key={`${photo.uri}-${index}`} style={styles.photoCard}>
              <Pressable
                style={styles.photoPress}
                onPress={() => replacePhoto(index)}
                accessibilityRole="button"
                accessibilityLabel={`${t('photoUpload.replace')} ${index + 1}`}
              >
                <Image source={{ uri: photo.uri }} style={styles.photo} />
                <View style={styles.order}>
                  <Text style={styles.orderText}>{index + 1}</Text>
                </View>
                <View style={styles.replace}>
                  <Ionicons name="camera-outline" size={15} color="#fff" />
                  <Text style={styles.replaceText}>{t('photoUpload.replace')}</Text>
                </View>
              </Pressable>
              <Pressable
                style={styles.remove}
                hitSlop={8}
                onPress={() => removePhoto(index)}
                accessibilityRole="button"
                accessibilityLabel={`Remove photo ${index + 1}`}
              >
                <Ionicons name="close" size={17} color="#fff" />
              </Pressable>
            </View>
          ))}

          {photos.length < MAX_PHOTOS && (
            <Pressable
              style={styles.addCard}
              onPress={addPhoto}
              accessibilityRole="button"
              accessibilityLabel={t('photoUpload.addPhoto')}
            >
              <View style={styles.addIcon}>
                <Ionicons name="camera-outline" size={23} color={colors.primary} />
              </View>
              <Text style={styles.addTitle}>{t('photoUpload.addPhoto')}</Text>
              <Text style={styles.addText}>
                {photos.length < RECOMMENDED_PHOTOS
                  ? t('photoUpload.toRecommended', { count: RECOMMENDED_PHOTOS - photos.length })
                  : t('photoUpload.slotsAvailable', { count: MAX_PHOTOS - photos.length })}
              </Text>
            </Pressable>
          )}
        </View>

        <View style={styles.tips}>
          <Text style={styles.tipsTitle}>{t('photoUpload.qualityChecklist')}</Text>
          {tips.map((tip) => (
            <View key={tip} style={styles.tip}>
              <Ionicons name="checkmark-circle" size={16} color={colors.green} />
              <Text style={styles.tipText}>{tip}</Text>
            </View>
          ))}
        </View>
      </ScrollView>

      <StickyFooter style={styles.footer}>
        <Button
          title={
            uploading
              ? t('photoUpload.uploading')
              : t('photoUpload.uploadBtn', { count: photos.length || '', plural: photos.length === 1 ? '' : 's' })
          }
          icon="cloud-upload-outline"
          onPress={upload}
          loading={uploading}
          disabled={!photos.length}
        />
        <Text style={styles.footerText}>{t('photoUpload.footerNotice')}</Text>
      </StickyFooter>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingTop: 8, paddingBottom: 150 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: radius.xl, borderWidth: 1, borderColor: colors.borderSoft, backgroundColor: colors.surface, padding: 16, ...shadows.card },
  carTitle: { fontSize: 16, fontFamily: fonts.extraBold, color: colors.textPrimary },
  score: { marginTop: 4, fontSize: 13, color: colors.textSecondary },
  scoreValue: { fontFamily: fonts.extraBold, color: colors.primary },
  count: { width: 62, height: 62, borderRadius: 31, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.blueTint },
  countValue: { fontSize: 20, fontFamily: fonts.extraBold, color: colors.primary },
  countLabel: { fontSize: 11, color: colors.textMuted },
  info: { flexDirection: 'row', alignItems: 'flex-start', gap: 11, marginTop: 12, borderRadius: radius.xl, backgroundColor: colors.blueTint, padding: 15 },
  infoTitle: { fontSize: 14, fontFamily: fonts.extraBold, color: colors.textPrimary },
  infoText: { marginTop: 4, fontSize: 13, lineHeight: 18, color: colors.textSecondary },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 16 },
  photoCard: { position: 'relative', width: '48.4%', aspectRatio: 1.28, borderRadius: radius.lg },
  photoPress: { flex: 1, borderRadius: radius.lg, overflow: 'hidden', backgroundColor: colors.surfaceAlt },
  photo: { width: '100%', height: '100%' },
  order: { position: 'absolute', top: 8, left: 8, width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.68)' },
  orderText: { fontSize: 11, fontFamily: fonts.extraBold, color: '#fff' },
  replace: { position: 'absolute', left: 0, right: 0, bottom: 0, minHeight: 34, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, backgroundColor: 'rgba(0,0,0,0.68)' },
  replaceText: { fontSize: 11, fontFamily: fonts.bold, color: '#fff' },
  remove: { position: 'absolute', top: -7, right: -7, width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.danger, borderWidth: 2, borderColor: colors.bg },
  addCard: { width: '48.4%', aspectRatio: 1.28, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.primary + '70', borderRadius: radius.lg, backgroundColor: colors.surface, padding: 10 },
  addIcon: { width: 44, height: 44, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.blueTint },
  addTitle: { marginTop: 8, fontSize: 13, fontFamily: fonts.extraBold, color: colors.textPrimary },
  addText: { marginTop: 2, fontSize: 11, color: colors.textMuted },
  tips: { marginTop: 20, borderRadius: radius.xl, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderSoft, padding: 16 },
  tipsTitle: { marginBottom: 10, fontSize: 14, fontFamily: fonts.extraBold, color: colors.textPrimary },
  tip: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 8 },
  tipText: { flex: 1, fontSize: 13, lineHeight: 18, color: colors.textSecondary },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, borderTopWidth: 1, borderTopColor: colors.borderSoft, backgroundColor: colors.surface, padding: 16, ...shadows.floating },
  footerText: { marginTop: 7, fontSize: 11, textAlign: 'center', color: colors.textMuted },
});
