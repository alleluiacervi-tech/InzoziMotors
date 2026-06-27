import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, Pressable, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Screen from '../components/Screen';
import BackHeader from '../components/BackHeader';
import { useApp } from '../context/AppContext';
import { colors, radius } from '../theme';

export default function ChatScreen({ navigation, route }) {
  const name = route.params?.name || 'Bay Auto Group';
  const convId = route.params?.convId || 'c1';
  const { getMessages, sendMessage } = useApp();
  const messages = getMessages(convId);
  const [text, setText] = useState('');
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      setTimeout(() => scrollRef.current?.scrollToEnd?.({ animated: true }), 100);
    }
  }, [messages.length]);

  const send = () => {
    if (!text.trim()) return;
    sendMessage(convId, text.trim());
    setText('');
  };

  return (
    <Screen background={colors.bg}>
      <BackHeader
        title={name}
        onBack={() => navigation.goBack()}
        right={
          <Pressable style={styles.callBtn}>
            <Ionicons name="call-outline" size={20} color={colors.primary} />
          </Pressable>
        }
      />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          ref={scrollRef}
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 20, gap: 10 }}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.daySep}>Today</Text>
          {messages.map((m) => (
            <View key={m.id} style={[styles.bubbleRow, m.me ? styles.bubbleRowMe : styles.bubbleRowThem]}>
              <View style={[styles.bubble, m.me ? styles.bubbleMe : styles.bubbleThem]}>
                <Text style={[styles.bubbleText, { color: m.me ? '#fff' : colors.textPrimary }]}>{m.text}</Text>
                <Text style={[styles.bubbleTime, { color: m.me ? 'rgba(255,255,255,0.7)' : colors.textMuted }]}>{m.time}</Text>
              </View>
            </View>
          ))}
        </ScrollView>

        <View style={styles.inputBar}>
          <Pressable style={styles.attach}>
            <Ionicons name="add" size={24} color={colors.slate600} />
          </Pressable>
          <TextInput
            style={styles.input}
            placeholder="Message..."
            placeholderTextColor={colors.textMuted}
            value={text}
            onChangeText={setText}
            onSubmitEditing={send}
            returnKeyType="send"
          />
          <Pressable style={[styles.send, !text.trim() && styles.sendDisabled]} onPress={send} disabled={!text.trim()}>
            <Ionicons name="arrow-up" size={20} color="#fff" />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  callBtn: { width: 42, height: 42, borderRadius: radius.md, backgroundColor: colors.blueTint, alignItems: 'center', justifyContent: 'center' },
  daySep: { textAlign: 'center', fontSize: 12, color: colors.textMuted, marginBottom: 4 },
  bubbleRow: { flexDirection: 'row' },
  bubbleRowMe: { justifyContent: 'flex-end' },
  bubbleRowThem: { justifyContent: 'flex-start' },
  bubble: { maxWidth: '78%', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 18 },
  bubbleMe: { backgroundColor: colors.primary, borderBottomRightRadius: 4 },
  bubbleThem: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderSoft, borderBottomLeftRadius: 4 },
  bubbleText: { fontSize: 14, lineHeight: 20 },
  bubbleTime: { fontSize: 10, marginTop: 4 },
  inputBar: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingTop: 10, paddingBottom: 28, borderTopWidth: 1, borderTopColor: colors.borderSoft, backgroundColor: colors.surface },
  attach: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
  input: { flex: 1, height: 44, backgroundColor: colors.surfaceAlt, borderRadius: 22, paddingHorizontal: 16, fontSize: 15, color: colors.textPrimary },
  send: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  sendDisabled: { opacity: 0.5 },
});
