import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput, Pressable,
  KeyboardAvoidingView, Platform, Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Screen from '../components/Screen';
import BackHeader from '../components/BackHeader';
import { useApp } from '../context/AppContext';
import { colors, radius } from '../theme';
import { formatPrice } from '../data/cars';

const QUICK_REPLIES = [
  "Is this still available?",
  "Can we arrange a viewing?",
  "What's the best price?",
  "Can you share the inspection report?",
  "Where is the car located?",
];

function PinnedCarCard({ car, onViewListing }) {
  const price = car.type === 'auction' ? car.currentBid : car.price;
  return (
    <View style={styles.pinnedCard}>
      <View style={styles.pinnedLabel}>
        <Ionicons name="pin" size={10} color={colors.primary} />
        <Text style={styles.pinnedLabelText}>Pinned listing</Text>
      </View>
      <View style={styles.pinnedContent}>
        {car.image ? (
          <Image source={{ uri: car.image }} style={styles.pinnedThumb} resizeMode="cover" />
        ) : null}
        <View style={{ flex: 1 }}>
          <Text style={styles.pinnedTitle} numberOfLines={1}>{car.title}</Text>
          <Text style={styles.pinnedPrice}>{formatPrice(price)}</Text>
          {car.inspected && (
            <View style={styles.pinnedBadge}>
              <Ionicons name="shield-checkmark" size={10} color={colors.green} />
              <Text style={styles.pinnedBadgeText}>150-pt Inspected</Text>
            </View>
          )}
        </View>
        <Pressable style={styles.viewListingBtn} onPress={onViewListing}>
          <Text style={styles.viewListingText}>View</Text>
          <Ionicons name="chevron-forward" size={11} color={colors.primary} />
        </Pressable>
      </View>
    </View>
  );
}

export default function ChatScreen({ navigation, route }) {
  const name = route.params?.name || 'Bay Auto Group';
  const convId = route.params?.convId || 'c1';
  const car = route.params?.car || null;
  const { getMessages, sendMessage } = useApp();
  const messages = getMessages(convId);
  const [text, setText] = useState('');
  const scrollRef = useRef(null);
  const [showQuickReplies, setShowQuickReplies] = useState(true);

  useEffect(() => {
    if (scrollRef.current) {
      setTimeout(() => scrollRef.current?.scrollToEnd?.({ animated: true }), 100);
    }
  }, [messages.length]);

  const send = (msg) => {
    const toSend = msg || text.trim();
    if (!toSend) return;
    sendMessage(convId, toSend);
    setText('');
    setShowQuickReplies(false);
  };

  const handleQuickReply = (reply) => {
    send(reply);
  };

  const handleArrangeViewing = () => {
    send("I'd like to arrange a viewing. What times work for you this week?");
  };

  return (
    <Screen background={colors.bg}>
      <BackHeader
        title={name}
        onBack={() => navigation.goBack()}
        right={
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {car && (
              <Pressable
                style={styles.headerBtn}
                onPress={() => navigation.navigate('VehicleDetail', { car })}
              >
                <Ionicons name="car-outline" size={18} color={colors.primary} />
              </Pressable>
            )}
            <Pressable style={styles.headerBtn}>
              <Ionicons name="call-outline" size={18} color={colors.primary} />
            </Pressable>
          </View>
        }
      />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          ref={scrollRef}
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 16, gap: 10 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Pinned car card */}
          {car && (
            <PinnedCarCard
              car={car}
              onViewListing={() => navigation.navigate('VehicleDetail', { car })}
            />
          )}

          <Text style={styles.daySep}>Today</Text>

          {messages.map((m) => (
            <View key={m.id} style={[styles.bubbleRow, m.me ? styles.bubbleRowMe : styles.bubbleRowThem]}>
              {!m.me && (
                <View style={styles.senderAvatar}>
                  <Text style={styles.senderInitial}>{name[0]}</Text>
                </View>
              )}
              <View style={[styles.bubble, m.me ? styles.bubbleMe : styles.bubbleThem]}>
                <Text style={[styles.bubbleText, { color: m.me ? '#fff' : colors.textPrimary }]}>
                  {m.text}
                </Text>
                <Text style={[styles.bubbleTime, { color: m.me ? 'rgba(255,255,255,0.65)' : colors.textMuted }]}>
                  {m.time}
                </Text>
              </View>
            </View>
          ))}
        </ScrollView>

        {/* Quick replies */}
        {showQuickReplies && messages.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.quickRepliesScroll}
            contentContainerStyle={styles.quickRepliesContent}
          >
            <Pressable style={[styles.quickChip, styles.quickChipArrange]} onPress={handleArrangeViewing}>
              <Ionicons name="calendar-outline" size={13} color="#fff" />
              <Text style={[styles.quickChipText, { color: '#fff' }]}>Arrange Viewing</Text>
            </Pressable>
            {QUICK_REPLIES.map((reply) => (
              <Pressable key={reply} style={styles.quickChip} onPress={() => handleQuickReply(reply)}>
                <Text style={styles.quickChipText}>{reply}</Text>
              </Pressable>
            ))}
          </ScrollView>
        )}

        {/* Input bar */}
        <View style={styles.inputBar}>
          <Pressable style={styles.attach}>
            <Ionicons name="add" size={24} color={colors.slate600} />
          </Pressable>
          <TextInput
            style={styles.input}
            placeholder="Message…"
            placeholderTextColor={colors.textMuted}
            value={text}
            onChangeText={setText}
            onSubmitEditing={() => send()}
            returnKeyType="send"
            onFocus={() => setShowQuickReplies(true)}
          />
          <Pressable
            style={[styles.send, !text.trim() && styles.sendDisabled]}
            onPress={() => send()}
            disabled={!text.trim()}
          >
            <Ionicons name="arrow-up" size={20} color="#fff" />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerBtn: {
    width: 38, height: 38, borderRadius: radius.md,
    backgroundColor: colors.greenTint,
    alignItems: 'center', justifyContent: 'center',
  },
  pinnedCard: {
    backgroundColor: colors.surface,
    borderWidth: 1.5, borderColor: colors.primary + '44',
    borderRadius: radius.xl,
    padding: 12, marginBottom: 4,
  },
  pinnedLabel: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 8 },
  pinnedLabelText: { fontSize: 10, fontWeight: '700', color: colors.primary, textTransform: 'uppercase', letterSpacing: 0.4 },
  pinnedContent: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  pinnedThumb: { width: 56, height: 42, borderRadius: radius.md, backgroundColor: colors.border },
  pinnedTitle: { fontSize: 13, fontWeight: '700', color: colors.textPrimary },
  pinnedPrice: { fontSize: 14, fontWeight: '800', color: colors.primary, marginTop: 2 },
  pinnedBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 4 },
  pinnedBadgeText: { fontSize: 9, fontWeight: '700', color: colors.green },
  viewListingBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 2,
    backgroundColor: colors.greenTint,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.lg,
  },
  viewListingText: { fontSize: 12, fontWeight: '700', color: colors.primary },
  daySep: { textAlign: 'center', fontSize: 12, color: colors.textMuted, marginVertical: 4 },
  bubbleRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  bubbleRowMe: { justifyContent: 'flex-end' },
  bubbleRowThem: { justifyContent: 'flex-start' },
  senderAvatar: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: colors.navyMid,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  senderInitial: { color: '#fff', fontWeight: '800', fontSize: 11 },
  bubble: { maxWidth: '76%', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 18 },
  bubbleMe: { backgroundColor: colors.primary, borderBottomRightRadius: 4 },
  bubbleThem: {
    backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.borderSoft,
    borderBottomLeftRadius: 4,
  },
  bubbleText: { fontSize: 14, lineHeight: 20 },
  bubbleTime: { fontSize: 10, marginTop: 4 },
  quickRepliesScroll: {
    borderTopWidth: 1, borderTopColor: colors.borderSoft,
    backgroundColor: colors.surface,
    maxHeight: 52,
  },
  quickRepliesContent: {
    paddingHorizontal: 12, paddingVertical: 10, gap: 8, alignItems: 'center',
  },
  quickChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1, borderColor: colors.border,
    paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: radius.pill, flexShrink: 0,
  },
  quickChipArrange: { backgroundColor: colors.primary, borderColor: colors.primary },
  quickChipText: { fontSize: 12, fontWeight: '600', color: colors.textSecondary, whiteSpace: 'nowrap' },
  inputBar: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 16, paddingTop: 10, paddingBottom: 28,
    borderTopWidth: 1, borderTopColor: colors.borderSoft,
    backgroundColor: colors.surface,
  },
  attach: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
  input: {
    flex: 1, height: 44, backgroundColor: colors.surfaceAlt,
    borderRadius: 22, paddingHorizontal: 16, fontSize: 15, color: colors.textPrimary,
  },
  send: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  sendDisabled: { opacity: 0.5 },
});
