import React from 'react';
import { View, Text, StyleSheet, FlatList, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Screen from '../components/Screen';
import BackHeader from '../components/BackHeader';
import { useApp } from '../context/AppContext';
import { colors, fonts } from '../theme';

export default function MessagesScreen({ navigation }) {
  const { conversations } = useApp();
  const canGoBack = navigation.canGoBack && navigation.canGoBack();

  return (
    <Screen background={colors.surface}>
      <BackHeader title="Messages" onBack={canGoBack ? () => navigation.goBack() : null} />
      <FlatList
        data={conversations}
        keyExtractor={(c) => c.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 4 }}
        renderItem={({ item }) => (
          <Pressable style={styles.row} onPress={() => navigation.navigate('Chat', { name: item.name, convId: item.id })}>
            <View style={styles.avatarWrap}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{item.avatar}</Text>
              </View>
              {item.online ? <View style={styles.online} /> : null}
            </View>
            <View style={{ flex: 1 }}>
              <View style={styles.topRow}>
                <Text style={styles.name}>{item.name}</Text>
                <Text style={styles.time}>{item.time}</Text>
              </View>
              <Text style={[styles.last, item.unread > 0 && styles.lastUnread]} numberOfLines={1}>
                {item.last}
              </Text>
            </View>
            {item.unread > 0 ? (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{item.unread}</Text>
              </View>
            ) : null}
          </Pressable>
        )}
        ItemSeparatorComponent={() => <View style={styles.sep} />}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="chatbubbles-outline" size={56} color={colors.border} />
            <Text style={styles.emptyTitle}>No messages yet</Text>
            <Text style={styles.emptySub}>Message a seller from any car page</Text>
          </View>
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14 },
  avatarWrap: { position: 'relative' },
  avatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: colors.navyMid, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontSize: 18, fontFamily: fonts.extraBold },
  online: { position: 'absolute', bottom: 2, right: 2, width: 13, height: 13, borderRadius: 7, backgroundColor: colors.green, borderWidth: 2, borderColor: '#fff' },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  name: { fontSize: 15, fontFamily: fonts.bold, color: colors.textPrimary },
  time: { fontSize: 12, color: colors.textMuted },
  last: { fontSize: 13, color: colors.textSecondary, marginTop: 3 },
  lastUnread: { color: colors.textPrimary, fontFamily: fonts.semiBold },
  badge: { minWidth: 22, height: 22, borderRadius: 11, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  badgeText: { color: '#fff', fontSize: 12, fontFamily: fonts.extraBold },
  sep: { height: 1, backgroundColor: colors.borderSoft, marginLeft: 66 },
  emptyState: { alignItems: 'center', gap: 12, paddingTop: 80, paddingHorizontal: 32 },
  emptyTitle: { fontSize: 18, fontFamily: fonts.bold, color: colors.textPrimary },
  emptySub: { fontSize: 14, color: colors.textMuted, textAlign: 'center' },
});
