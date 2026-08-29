import React, { useState } from 'react';
import {
  Modal, View, Image, FlatList, Pressable, Text, StyleSheet, useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { fonts } from '../theme';
import { PHOTO } from '../utils/photo';
import Photo from './Photo';

// Full-screen photo viewer — opens on the tapped photo, swipe left/right
// through the set, tap ✕ (or the backdrop) to close.
export default function PhotoViewer({ visible, images = [], initialIndex = 0, onClose }) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [idx, setIdx] = useState(initialIndex);

  React.useEffect(() => {
    if (visible) setIdx(initialIndex);
  }, [visible, initialIndex]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <StatusBar style="light" />
      <View style={styles.backdrop}>
        <FlatList
          key={`viewer-${initialIndex}`}
          data={images}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          keyExtractor={(_, i) => String(i)}
          initialScrollIndex={initialIndex}
          getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
          onMomentumScrollEnd={(e) => setIdx(Math.round(e.nativeEvent.contentOffset.x / width))}
          renderItem={({ item }) => (
            <Pressable style={{ width, height }} onPress={onClose}>
              <Photo
                uri={item}
                width={PHOTO.ZOOM}
                style={{ width, height: height * 0.82, marginTop: height * 0.09 }}
                resizeMode="contain"
                // Swiping back through a gallery must not re-fetch what was
                // just shown, which is exactly what RN's Image did.
                transition={120}
              />
            </Pressable>
          )}
        />

        <Pressable
          style={({ pressed }) => [styles.closeBtn, { top: insets.top + 12 }, pressed && styles.closeBtnPressed]}
          onPress={onClose}
          hitSlop={12} accessibilityRole="button" accessibilityLabel="Close"
        >
          <Ionicons name="close" size={22} color="#fff" />
        </Pressable>

        {images.length > 1 && (
          <View style={[styles.counter, { bottom: insets.bottom + 24 }]}>
            <Text style={styles.counterText}>{idx + 1} / {images.length}</Text>
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.96)' },
  closeBtn: {
    position: 'absolute', right: 16,
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center', justifyContent: 'center',
  },
  closeBtnPressed: { opacity: 0.72, transform: [{ scale: 0.94 }] },
  counter: {
    position: 'absolute', alignSelf: 'center',
    backgroundColor: 'rgba(255,255,255,0.14)',
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 999,
  },
  counterText: { color: '#fff', fontSize: 13, fontFamily: fonts.bold },
});
