import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput, Pressable,
  KeyboardAvoidingView, Platform, Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Screen from '../components/Screen';
import BackHeader from '../components/BackHeader';
import { useApp } from '../context/AppContext';
import { showToast, showConfirm, showActionSheet } from '../components/Feedback';
import { colors, radius, fonts } from '../theme';
import { formatPrice } from '../data/cars';
import Photo from '../components/Photo';
import { PHOTO } from '../utils/photo';

const REPORT_REASONS = [
  { label: 'Scam or fraud', icon: 'warning-outline' },
  { label: 'Harassment or abuse', icon: 'sad-outline' },
  { label: 'Spam', icon: 'megaphone-outline' },
  { label: 'Something else', icon: 'chatbox-ellipses-outline' },
];

const QUICK_REPLIES = [
  "Is this still available?",
  "Can we arrange a viewing?",
  "What's the best price?",
  "Can you share the inspection report?",
  "Where is the car located?",
];

function PinnedCarCard({ car, onViewListing, t }) {
  const price = car.type === 'auction' ? car.currentBid : car.price;
  return (
    <View style={styles.pinnedCard}>
      <View style={styles.pinnedLabel}>
        <Ionicons name="pin" size={10} color={colors.textMuted} />
        <Text style={styles.pinnedLabelText}>{t('messages.pinnedListing')}</Text>
      </View>
      <View style={styles.pinnedContent}>
        {car.image ? (
          <Photo uri={car.image} width={PHOTO.THUMB} style={styles.pinnedThumb} resizeMode="contain" />
        ) : null}
        <View style={{ flex: 1 }}>
          <Text style={styles.pinnedTitle} numberOfLines={1}>{car.title}</Text>
          <Text style={styles.pinnedPrice}>{formatPrice(price)}</Text>
          {car.inspected && (
            <View style={styles.pinnedBadge}>
              <Ionicons name="shield-checkmark" size={10} color={colors.green} />
              <Text style={styles.pinnedBadgeText}>{t('common.verified')}</Text>
            </View>
          )}
        </View>
        <Pressable style={styles.viewListingBtn} onPress={onViewListing}>
          <Text style={styles.viewListingText}>{t('common.view')}</Text>
          <Ionicons name="chevron-forward" size={11} color={colors.primary} />
        </Pressable>
      </View>
    </View>
  );
}

export default function ChatScreen({ navigation, route }) {
  // No fallback id: 'c1' was a demo fixture, and aiming report/send calls at
  // it produced 400s from a working server — a broken safety feature. With no
  // conversation and no car there is simply nothing to act on yet.
  const convId = route.params?.convId || null;
  const car = route.params?.car || null;
  const {
    getMessages, sendMessage, loadConversationMessages, getOrCreateConversation,
    sendTyping, typingConvId, setActiveConversation, conversations,
    blockUser, reportConversation, getConversationMeta, t,
  } = useApp();
  const [activeConvId, setActiveConvId] = useState(route.params?.convId);
  // A push tap or deep link carries only convId — resolve the display name
  // from the conversation list rather than a hardcoded demo dealer.
  const conversation = conversations.find((c) => c.id === (activeConvId || convId));
  const name = route.params?.name || conversation?.name || t('common.chat');
  const messages = getMessages(activeConvId || convId);
  const [text, setText] = useState('');
  const scrollRef = useRef(null);
  const [showQuickReplies, setShowQuickReplies] = useState(true);
  const typingTimer = useRef(null);
  const otherIsTyping = typingConvId && typingConvId === activeConvId;

  // Emit typing while the buyer writes; stop after a short pause
  const handleTextChange = (v) => {
    setText(v);
    if (!activeConvId) return;
    sendTyping(activeConvId, true);
    if (typingTimer.current) clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => sendTyping(activeConvId, false), 1500);
  };
  useEffect(() => () => { if (typingTimer.current) clearTimeout(typingTimer.current); }, []);

  useEffect(() => {
    if (!activeConvId && car) {
      getOrCreateConversation(car.id).then((id) => {
        setActiveConvId(id);
      });
    }
  }, [activeConvId, car, getOrCreateConversation]);

  useEffect(() => {
    if (activeConvId && loadConversationMessages) {
      // Tell the context which thread is on screen: its incoming messages
      // stop bumping the unread badge, and the socket re-joins this room
      // after a reconnect.
      setActiveConversation(activeConvId);
      loadConversationMessages(activeConvId);
      // Delivery is realtime via the user room now — the poll is only a
      // safety net for a dead socket, so it can be slow.
      const timer = setInterval(() => loadConversationMessages(activeConvId), 30000);
      return () => {
        clearInterval(timer);
        setActiveConversation(null);
      };
    }
  }, [activeConvId, loadConversationMessages, setActiveConversation]);

  useEffect(() => {
    if (scrollRef.current) {
      setTimeout(() => scrollRef.current?.scrollToEnd?.({ animated: true }), 100);
    }
  }, [messages.length]);

  const send = async (msg) => {
    const toSend = msg || text.trim();
    if (!toSend) return;
    const sendId = activeConvId || convId;
    if (!sendId) {
      showToast("This chat isn't ready yet. Open it from the listing or your messages.", 'error');
      return;
    }
    try {
      const newId = await sendMessage(sendId, toSend, car?.id);
      if (sendId.startsWith('new_') && newId) {
        setActiveConvId(newId);
      }
      setText('');
      setShowQuickReplies(false);
      // Otherwise the other side keeps seeing "typing…" for another 1.5s
      // after the message has already landed.
      if (typingTimer.current) clearTimeout(typingTimer.current);
      sendTyping(sendId, false);
    } catch (err) {
      // The optimistic bubble has already been rolled back by sendMessage —
      // without this the message just vanished with no explanation. Keep the
      // draft in the input so the user can retry.
      showToast("Message didn't send. Check your connection and try again.", 'error');
      if (!msg) setText(toSend);
    }
  };

  const handleQuickReply = (reply) => {
    send(reply);
  };

  // Report / block — the safety actions Apple requires on any UGC surface.
  const handleSafetyMenu = async () => {
    const choice = await showActionSheet({
      title: name,
      options: [
        { label: 'Report this conversation', icon: 'flag-outline' },
        { label: `Block ${name}`, icon: 'hand-left-outline' },
      ],
    });

    if (choice === 0) {
      const targetId = activeConvId || convId;
      if (!targetId || String(targetId).startsWith('new_')) {
        // Nothing exists server-side yet — there is no content to report.
        showToast('Send or receive a message first, then you can report the conversation.', 'info');
        return;
      }
      const reasonIdx = await showActionSheet({
        title: 'What’s wrong?',
        message: 'Our team reviews every report. The other person is not told.',
        options: REPORT_REASONS,
      });
      if (reasonIdx === -1) return;
      try {
        await reportConversation(targetId, REPORT_REASONS[reasonIdx].label);
        showToast('Thanks — our team will take a look.', 'success');
      } catch (err) {
        showToast(err?.message || "The report didn't send. Check your connection and try again.", 'error');
      }
    }

    if (choice === 1) {
      // The other party's id normally comes from the conversations list, but a
      // chat opened from a push renders before that list loads. Resolve it from
      // the server on demand — Block has to work on the first attempt.
      let otherId = conversation?.otherId;
      if (!otherId && getConversationMeta) {
        const meta = await getConversationMeta(activeConvId || convId);
        otherId = meta?.otherId;
      }
      if (!otherId) {
        showToast("Couldn't reach the server to identify this user. Check your connection and try again.", 'error');
        return;
      }
      const ok = await showConfirm({
        title: `Block ${name}?`,
        message: 'They won’t be able to message you, and this conversation disappears from your list. You can unblock later from support.',
        confirmLabel: 'Block',
        destructive: true,
      });
      if (!ok) return;
      try {
        await blockUser(otherId);
        showToast(`${name} is blocked.`, 'success');
        navigation.goBack();
      } catch (err) {
        showToast(err?.message || "Couldn't block right now. Try again.", 'error');
      }
    }
  };

  return (
    <Screen background={colors.bg}>
      <BackHeader
        title={name}
        onBack={() => navigation.goBack()}
        right={
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            {car ? (
              <Pressable
                style={styles.headerBtn}
                onPress={() => navigation.navigate('VehicleDetail', { car })} accessibilityRole="button" accessibilityLabel={t('messages.viewCar')}
              >
                <Ionicons name="car-outline" size={18} color={colors.textSecondary} />
              </Pressable>
            ) : null}
            <Pressable
              style={styles.headerBtn}
              onPress={handleSafetyMenu}
              accessibilityRole="button"
              accessibilityLabel="Report or block"
            >
              <Ionicons name="ellipsis-horizontal" size={18} color={colors.textSecondary} />
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
              t={t}
              onViewListing={() => navigation.navigate('VehicleDetail', { car })}
            />
          )}

          <Text style={styles.daySep}>{t('common.today')}</Text>

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

          {/* Typing indicator — realtime via socket */}
          {otherIsTyping && (
            <View style={[styles.bubbleRow, styles.bubbleRowThem]}>
              <View style={styles.senderAvatar}>
                <Text style={styles.senderInitial}>{name[0]}</Text>
              </View>
              <View style={[styles.bubble, styles.bubbleThem]}>
                <Text style={[styles.bubbleText, { color: colors.textMuted }]}>{t('common.loading')}</Text>
              </View>
            </View>
          )}
        </ScrollView>

        {/* Input bar */}
        <View style={styles.inputBar}>
          <TextInput
            style={styles.input}
            placeholder={t('messages.typeMessage')}
            placeholderTextColor={colors.textMuted}
            value={text}
            onChangeText={handleTextChange}
            onSubmitEditing={() => send()}
            returnKeyType="send"
            onFocus={() => setShowQuickReplies(true)}
          />
          <Pressable
            style={[styles.send, !text.trim() && styles.sendDisabled]}
            onPress={() => send()}
            disabled={!text.trim()} accessibilityRole="button" accessibilityLabel={t('messages.send')}
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
    width: 44, height: 44, borderRadius: radius.md,
    backgroundColor: colors.greenTint,
    alignItems: 'center', justifyContent: 'center',
  },
  pinnedCard: {
    backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.xl,
    padding: 12, marginBottom: 4,
  },
  pinnedLabel: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 8 },
  pinnedLabelText: { fontSize: 11, fontFamily: fonts.bold, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.4 },
  pinnedContent: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  pinnedThumb: { width: 56, height: 42, borderRadius: radius.md, backgroundColor: colors.border },
  pinnedTitle: { fontSize: 13, fontFamily: fonts.bold, color: colors.textPrimary },
  pinnedPrice: { fontVariant: ['tabular-nums'], fontSize: 14, fontFamily: fonts.extraBold, color: colors.primary, marginTop: 2 },
  pinnedBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 4 },
  pinnedBadgeText: { fontSize: 10, fontFamily: fonts.bold, color: colors.greenText },
  viewListingBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 2,
    backgroundColor: colors.greenTint,
    minHeight: 44, paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.lg,
  },
  viewListingText: { fontSize: 12, fontFamily: fonts.bold, color: colors.primary },
  daySep: { textAlign: 'center', fontSize: 12, color: colors.textMuted, marginVertical: 4 },
  bubbleRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  bubbleRowMe: { justifyContent: 'flex-end' },
  bubbleRowThem: { justifyContent: 'flex-start' },
  senderAvatar: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: colors.navyMid,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  senderInitial: { color: '#fff', fontFamily: fonts.extraBold, fontSize: 11 },
  bubble: { maxWidth: '76%', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 18 },
  bubbleMe: { backgroundColor: colors.primary, borderBottomRightRadius: 4 },
  bubbleThem: {
    backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.borderSoft,
    borderBottomLeftRadius: 4,
  },
  bubbleText: { fontSize: 14, lineHeight: 20 },
  bubbleTime: { fontSize: 11, marginTop: 4 },
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
    minHeight: 44, paddingHorizontal: 12, paddingVertical: 9,
    borderRadius: radius.pill, flexShrink: 0,
  },
  quickChipArrange: { backgroundColor: colors.primary, borderColor: colors.primary },
  quickChipText: { fontSize: 12, fontFamily: fonts.semiBold, color: colors.textSecondary, whiteSpace: 'nowrap' },
  inputBar: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 16, paddingTop: 10, paddingBottom: 28,
    borderTopWidth: 1, borderTopColor: colors.borderSoft,
    backgroundColor: colors.surface,
  },
  input: {
    flex: 1, height: 44, backgroundColor: colors.surfaceAlt,
    borderRadius: 22, paddingHorizontal: 16, fontSize: 15, color: colors.textPrimary,
  },
  send: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  sendDisabled: { opacity: 0.5 },
});
