import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, Pressable, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Screen from '../components/Screen';
import BackHeader from '../components/BackHeader';
import KoreaCarCard from '../components/KoreaCarCard';
import { ErrorState, EmptyState } from '../components/StateViews';
import useKoreaCars from '../hooks/useKoreaCars';
import useKoreaAvailable from '../hooks/useKoreaAvailable';
import { colors, radius, fonts } from '../theme';
import { useApp } from '../context/AppContext';

// Every used car for sale in South Korea.
//
// The list is the server's: search, make, sort and paging are queries, so the
// phone holds only the cars on screen however many the catalogue has. The first
// frame shows a spinner rather than a guess; there is no bundled copy to show.

const SORTS = ['newest', 'price_asc', 'price_desc', 'mileage_asc', 'year_desc'];

export default function KoreaCarsScreen({ navigation, route }) {
  const { t } = useApp();
  const [q, setQ] = useState(route?.params?.q || '');
  const [make, setMake] = useState(route?.params?.make || '');
  const [sort, setSort] = useState('newest');
  const facets = useKoreaAvailable();
  const { items, state, moreState, hasMore, available, reload, loadMore } = useKoreaCars({ q, make, sort });

  const open = useCallback((car) => navigation.navigate('KoreaCarDetail', { id: car.id, car }), [navigation]);
  const renderItem = useCallback(({ item }) => <KoreaCarCard car={item} onPress={() => open(item)} />, [open]);

  const header = (
    <View>
      <Text style={styles.lede}>{t('korea.lede')}</Text>
      <View style={styles.searchWrap}>
        <Ionicons name="search" size={18} color={colors.textSecondary} />
        <TextInput
          style={styles.searchInput}
          value={q}
          onChangeText={setQ}
          placeholder={t('korea.searchPlaceholder')}
          placeholderTextColor={colors.textMuted}
          autoCorrect={false}
          returnKeyType="search"
          accessibilityLabel={t('korea.searchLabel')}
        />
        {q.length > 0 ? (
          <Pressable onPress={() => setQ('')} hitSlop={10} accessibilityLabel={t('korea.clearSearch')}>
            <Ionicons name="close-circle" size={18} color={colors.textMuted} />
          </Pressable>
        ) : null}
      </View>

      <FlatList
        horizontal
        data={['', ...facets.makes.slice(0, 16).map((m) => m.make)]}
        keyExtractor={(m) => m || '__all'}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chips}
        renderItem={({ item }) => {
          const on = item === make;
          return (
            <Pressable style={[styles.chip, on && styles.chipOn]} onPress={() => setMake(item)} accessibilityRole="button" accessibilityState={{ selected: on }}>
              <Text style={[styles.chipText, on && styles.chipTextOn]}>{item || t('korea.allMakes')}</Text>
            </Pressable>
          );
        }}
      />
      <FlatList
        horizontal
        data={SORTS}
        keyExtractor={(s) => s}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chips}
        renderItem={({ item }) => {
          const on = item === sort;
          return (
            <Pressable style={[styles.sortChip, on && styles.chipOn]} onPress={() => setSort(item)} accessibilityRole="button" accessibilityState={{ selected: on }}>
              <Text style={[styles.chipText, on && styles.chipTextOn]}>{t(`korea.sort_${item}`)}</Text>
            </Pressable>
          );
        }}
      />
    </View>
  );

  let body;
  if (!available) {
    body = <EmptyState title={t('korea.unavailableTitle')} sub={t('korea.unavailableBody')} actionLabel={t('korea.unavailableCta')} onAction={() => navigation.navigate('ImportOrderDetail', { isNewCustom: true })} />;
  } else {
    body = (
      <FlatList
        data={items}
        keyExtractor={(c) => c.id}
        renderItem={renderItem}
        ListHeaderComponent={header}
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
        onEndReached={loadMore}
        onEndReachedThreshold={0.6}
        initialNumToRender={8}
        windowSize={7}
        removeClippedSubviews
        /* The error sits INSIDE the list so the search box and chips stay: a failed
           search is fixed by changing it, not only by retrying it. */
        ListEmptyComponent={state === 'loading'
          ? <ActivityIndicator style={styles.spinner} color={colors.primary} />
          : state === 'error'
            ? <ErrorState title={t('korea.loadError')} actionLabel={t('korea.retry')} onAction={reload} />
            : <Text style={styles.empty}>{t('korea.empty')}</Text>}
        ListFooterComponent={
          <View style={styles.footer}>
            {moreState === 'loading' ? <ActivityIndicator color={colors.primary} /> : null}
            {moreState === 'error' ? (
              <Pressable onPress={loadMore} accessibilityRole="button"><Text style={styles.retry}>{t('korea.loadMoreError')}</Text></Pressable>
            ) : null}
            {!hasMore && items.length > 0 && state === 'idle' ? <Text style={styles.end}>{t('korea.end')}</Text> : null}
            <Text style={styles.disclaimer}>{t('korea.disclaimer')}</Text>
          </View>
        }
      />
    );
  }

  return (
    <Screen>
      <BackHeader title={t('korea.title')} onBack={() => navigation.goBack()} />
      {body}
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { padding: 16, paddingBottom: 40 },
  lede: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 20, color: colors.textSecondary, marginBottom: 12 },
  searchWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, paddingHorizontal: 12, height: 46,
  },
  searchInput: { flex: 1, fontFamily: fonts.regular, fontSize: 15, color: colors.textPrimary },
  chips: { gap: 8, paddingVertical: 10 },
  chip: { paddingHorizontal: 14, height: 36, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, justifyContent: 'center' },
  sortChip: { paddingHorizontal: 12, height: 32, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.borderSoft, backgroundColor: colors.surface, justifyContent: 'center' },
  chipOn: { backgroundColor: colors.textPrimary, borderColor: colors.textPrimary },
  chipText: { fontFamily: fonts.bold, fontSize: 13, color: colors.textSecondary },
  chipTextOn: { color: colors.surface },
  spinner: { marginTop: 40 },
  empty: { fontFamily: fonts.regular, fontSize: 14, color: colors.textSecondary, textAlign: 'center', marginTop: 32 },
  footer: { alignItems: 'center', paddingTop: 8, gap: 10 },
  end: { fontFamily: fonts.regular, fontSize: 12.5, color: colors.textMuted },
  retry: { fontFamily: fonts.bold, fontSize: 13, color: colors.primary },
  disclaimer: { fontFamily: fonts.regular, fontSize: 12, lineHeight: 17, color: colors.textMuted, textAlign: 'center', marginTop: 8 },
});
