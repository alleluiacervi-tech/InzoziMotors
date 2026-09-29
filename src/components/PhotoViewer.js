import React, { useCallback, useMemo, useState } from 'react';
import { Modal, View, Pressable, Text, StyleSheet, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Gesture, GestureDetector, GestureHandlerRootView, FlatList } from 'react-native-gesture-handler';
import Animated, {
  interpolate, runOnJS, useAnimatedStyle, useSharedValue, withTiming, Extrapolation,
} from 'react-native-reanimated';
import { Image as ExpoImage } from 'expo-image';
import { fonts } from '../theme';
import { PHOTO, photoUrl } from '../utils/photo';
import { useApp } from '../context/AppContext';
import Photo from './Photo';

// ─────────────────────────────────────────────────────────────────────────────
// The full-screen photo viewer, in two modes.
//
//   pager  one photo at a time: swipe sideways through the set, pinch or
//          double-tap to zoom (and drag around while zoomed), swipe down to
//          close. The counter says where you are.
//   grid   every photo on one vertical page — scroll up and down to see them
//          all, tap one to open it in the pager. A listing can carry dozens of
//          angles, and swiping through them one by one to find "the interior"
//          was the only way to see them before.
//
// Gestures are gesture-handler + reanimated, both already in the native build,
// so this ships over the air.
// ─────────────────────────────────────────────────────────────────────────────

const MAX_SCALE = 4;
const DOUBLE_TAP_SCALE = 2.5;
const DISMISS_DISTANCE = 120;

function clamp(value, min, max) {
  'worklet';
  return Math.min(Math.max(value, min), max);
}

function ZoomablePhoto({ uri, width, height, dragY, onZoomChange, onDismiss }) {
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const savedTx = useSharedValue(0);
  const savedTy = useSharedValue(0);
  const [zoomed, setZoomed] = useState(false);

  const reportZoom = useCallback((value) => {
    setZoomed(value);
    onZoomChange?.(value);
  }, [onZoomChange]);

  const gesture = useMemo(() => {
    const bounds = (s) => {
      'worklet';
      return { x: (width * (s - 1)) / 2, y: (height * (s - 1)) / 2 };
    };
    const reset = () => {
      'worklet';
      scale.value = withTiming(1);
      savedScale.value = 1;
      tx.value = withTiming(0);
      ty.value = withTiming(0);
      savedTx.value = 0;
      savedTy.value = 0;
      runOnJS(reportZoom)(false);
    };

    const pinch = Gesture.Pinch()
      .onUpdate((e) => {
        scale.value = clamp(savedScale.value * e.scale, 1, MAX_SCALE);
      })
      .onEnd(() => {
        if (scale.value < 1.05) {
          reset();
        } else {
          savedScale.value = scale.value;
          const b = bounds(scale.value);
          tx.value = withTiming(clamp(tx.value, -b.x, b.x));
          ty.value = withTiming(clamp(ty.value, -b.y, b.y));
          savedTx.value = clamp(tx.value, -b.x, b.x);
          savedTy.value = clamp(ty.value, -b.y, b.y);
          runOnJS(reportZoom)(true);
        }
      });

    const doubleTap = Gesture.Tap()
      .numberOfTaps(2)
      .onEnd((e) => {
        if (scale.value > 1.01) {
          reset();
          return;
        }
        // Zoom toward the point that was tapped.
        const b = bounds(DOUBLE_TAP_SCALE);
        const x = clamp((width / 2 - e.x) * (DOUBLE_TAP_SCALE - 1), -b.x, b.x);
        const y = clamp((height / 2 - e.y) * (DOUBLE_TAP_SCALE - 1), -b.y, b.y);
        scale.value = withTiming(DOUBLE_TAP_SCALE);
        savedScale.value = DOUBLE_TAP_SCALE;
        tx.value = withTiming(x);
        ty.value = withTiming(y);
        savedTx.value = x;
        savedTy.value = y;
        runOnJS(reportZoom)(true);
      });

    // Zoomed: one finger moves the photo around.
    const pan = Gesture.Pan()
      .enabled(zoomed)
      .averageTouches(true)
      .onUpdate((e) => {
        const b = bounds(scale.value);
        tx.value = clamp(savedTx.value + e.translationX, -b.x, b.x);
        ty.value = clamp(savedTy.value + e.translationY, -b.y, b.y);
      })
      .onEnd(() => {
        savedTx.value = tx.value;
        savedTy.value = ty.value;
      });

    // Not zoomed: a vertical drag closes; a sideways one fails this gesture at
    // once so the list underneath pages to the next photo.
    const dismiss = Gesture.Pan()
      .enabled(!zoomed)
      .activeOffsetY([-14, 14])
      .failOffsetX([-14, 14])
      .onUpdate((e) => {
        dragY.value = e.translationY;
      })
      .onEnd((e) => {
        if (Math.abs(e.translationY) > DISMISS_DISTANCE || Math.abs(e.velocityY) > 900) {
          runOnJS(onDismiss)();
        } else {
          dragY.value = withTiming(0);
        }
      });

    return Gesture.Simultaneous(pinch, Gesture.Exclusive(doubleTap, zoomed ? pan : dismiss));
  }, [zoomed, width, height, dragY, onDismiss, reportZoom, scale, savedScale, tx, ty, savedTx, savedTy]);

  const style = useAnimatedStyle(() => ({
    transform: [
      { translateX: tx.value },
      { translateY: ty.value + dragY.value },
      { scale: scale.value },
    ],
  }));

  return (
    <GestureDetector gesture={gesture}>
      <View style={{ width, height: '100%', justifyContent: 'center' }} collapsable={false}>
        <Animated.View style={[{ width, height }, style]}>
          <Photo
            uri={uri}
            width={PHOTO.ZOOM}
            style={{ width, height }}
            resizeMode="contain"
            transition={120}
          />
        </Animated.View>
      </View>
    </GestureDetector>
  );
}

export default function PhotoViewer({ visible, images = [], initialIndex = 0, initialMode = 'pager', title, onClose }) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { t } = useApp();
  const [mode, setMode] = useState(initialMode);
  const [idx, setIdx] = useState(initialIndex);
  // Bumped whenever the pager should reopen at `idx` (from the grid).
  const [pagerKey, setPagerKey] = useState(0);
  const [zoomed, setZoomed] = useState(false);
  const dragY = useSharedValue(0);
  const photoHeight = height * 0.78;

  React.useEffect(() => {
    if (!visible) return;
    setIdx(initialIndex);
    setMode(initialMode);
    setZoomed(false);
    setPagerKey((k) => k + 1);
    dragY.value = 0;
  }, [visible, initialIndex, initialMode, dragY]);

  React.useEffect(() => {
    if (!visible || !Array.isArray(images) || images.length === 0) return;
    const urls = images
      .map((img) => photoUrl(img, PHOTO.ZOOM))
      .filter((u) => typeof u === 'string' && (u.startsWith('http://') || u.startsWith('https://')));
    if (urls.length > 0) ExpoImage.prefetch(urls, 'memory-disk').catch(() => {});
  }, [visible, images]);

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: interpolate(Math.abs(dragY.value), [0, 320], [1, 0.25], Extrapolation.CLAMP),
  }));

  const openInPager = (index) => {
    setIdx(index);
    setMode('pager');
    setZoomed(false);
    setPagerKey((k) => k + 1);
  };

  // Grid rows: one wide photo, then two side by side, repeating — the rhythm
  // listing sites use, so the overview reads as a page rather than a wall.
  const rows = useMemo(() => {
    const out = [];
    let i = 0;
    while (i < images.length) {
      out.push([i]);
      i += 1;
      if (i < images.length) {
        out.push(i + 1 < images.length ? [i, i + 1] : [i]);
        i += i + 1 < images.length ? 2 : 1;
      }
    }
    return out;
  }, [images.length]);

  const gutter = 4;
  const wideH = Math.round(width * 0.66);
  const halfW = (width - gutter) / 2;
  const halfH = Math.round(halfW * 0.78);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <StatusBar style="light" />
      <GestureHandlerRootView style={styles.root}>
        <Animated.View style={[StyleSheet.absoluteFill, styles.backdrop, backdropStyle]} />

        {mode === 'pager' ? (
          <>
            <FlatList
              key={`pager-${pagerKey}`}
              data={images}
              horizontal
              pagingEnabled
              scrollEnabled={!zoomed}
              showsHorizontalScrollIndicator={false}
              keyExtractor={(_, i) => String(i)}
              initialScrollIndex={Math.min(idx, Math.max(images.length - 1, 0))}
              getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
              onMomentumScrollEnd={(e) => setIdx(Math.round(e.nativeEvent.contentOffset.x / width))}
              renderItem={({ item }) => (
                <ZoomablePhoto
                  uri={item}
                  width={width}
                  height={photoHeight}
                  dragY={dragY}
                  onZoomChange={setZoomed}
                  onDismiss={onClose}
                />
              )}
            />

            <View style={[styles.topBar, { top: insets.top + 8 }]} pointerEvents="box-none">
              {images.length > 1 ? (
                <Pressable
                  style={({ pressed }) => [styles.pill, pressed && styles.pressed]}
                  onPress={() => setMode('grid')}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel={t('browse.allPhotosCount', { count: images.length })}
                >
                  <Ionicons name="grid-outline" size={15} color="#fff" />
                  <Text style={styles.pillText}>{t('browse.allPhotos')}</Text>
                </Pressable>
              ) : <View />}
              <Pressable
                style={({ pressed }) => [styles.closeBtn, pressed && styles.pressed]}
                onPress={onClose}
                hitSlop={12}
                accessibilityRole="button"
                accessibilityLabel={t('browse.closePhotos')}
              >
                <Ionicons name="close" size={22} color="#fff" />
              </Pressable>
            </View>

            {images.length > 1 && (
              <View style={[styles.counter, { bottom: insets.bottom + 24 }]} pointerEvents="none">
                <Text style={styles.counterText}>{idx + 1} / {images.length}</Text>
              </View>
            )}
          </>
        ) : (
          <View style={styles.gridWrap}>
            <View style={[styles.gridHeader, { paddingTop: insets.top + 8 }]}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.gridTitle} numberOfLines={1}>{t('browse.allPhotosCount', { count: images.length })}</Text>
                {title ? <Text style={styles.gridSub} numberOfLines={1}>{title}</Text> : null}
              </View>
              <Pressable
                style={({ pressed }) => [styles.closeBtn, pressed && styles.pressed]}
                onPress={onClose}
                hitSlop={12}
                accessibilityRole="button"
                accessibilityLabel={t('browse.closePhotos')}
              >
                <Ionicons name="close" size={22} color="#fff" />
              </Pressable>
            </View>
            <FlatList
              data={rows}
              keyExtractor={(row) => row.join('-')}
              contentContainerStyle={{ gap: gutter, paddingBottom: insets.bottom + 24 }}
              initialNumToRender={6}
              windowSize={7}
              renderItem={({ item: row }) => (
                <View style={{ flexDirection: 'row', gap: gutter }}>
                  {row.map((i) => (
                    <Pressable
                      key={i}
                      onPress={() => openInPager(i)}
                      accessibilityRole="imagebutton"
                      accessibilityLabel={t('browse.photoOf', { index: i + 1, count: images.length })}
                    >
                      <Photo
                        uri={images[i]}
                        width={row.length === 1 ? PHOTO.WIDE : PHOTO.CARD}
                        style={row.length === 1 ? { width, height: wideH } : { width: halfW, height: halfH }}
                        resizeMode="cover"
                        transition={120}
                      />
                    </Pressable>
                  ))}
                </View>
              )}
            />
          </View>
        )}
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  backdrop: { backgroundColor: 'rgba(0,0,0,0.97)' },
  topBar: {
    position: 'absolute', left: 16, right: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  pill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    height: 40, paddingHorizontal: 14, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  pillText: { color: '#fff', fontSize: 13, fontFamily: fonts.bold },
  closeBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center', justifyContent: 'center',
  },
  pressed: { opacity: 0.72, transform: [{ scale: 0.96 }] },
  counter: {
    position: 'absolute', alignSelf: 'center',
    backgroundColor: 'rgba(255,255,255,0.14)',
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 999,
  },
  counterText: { color: '#fff', fontSize: 13, fontFamily: fonts.bold, fontVariant: ['tabular-nums'] },
  gridWrap: { flex: 1, backgroundColor: '#000' },
  gridHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingBottom: 12,
  },
  gridTitle: { color: '#fff', fontSize: 17, fontFamily: fonts.extraBold },
  gridSub: { color: 'rgba(255,255,255,0.6)', fontSize: 12.5, fontFamily: fonts.medium, marginTop: 2 },
});
