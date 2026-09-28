import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, RefreshControl, useWindowDimensions } from 'react-native';
import Screen from '../components/Screen';
import BackHeader from '../components/BackHeader';
import FeaturedCard from '../components/FeaturedCard';
import { EmptyState, ErrorState } from '../components/StateViews';
import { colors, fonts } from '../theme';
import { useApp } from '../context/AppContext';
import { cars as carsApi } from '../api/cars';
import useReducedMotion from '../hooks/useReducedMotion';

// "See all" from the home rail: every current placement, in the same order the
// server gave the rail, as one vertical list. Same card, same labels.
//
// "Couldn't reach Sawa" and "nothing is placed today" are different answers,
// and this screen used to give the first for both.
export default function FeaturedScreen({ navigation }) {
  const { t } = useApp();
  const reducedMotion = useReducedMotion();
  const { width } = useWindowDimensions();
  const [rows, setRows] = useState(null);
  const [failed, setFailed] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const alive = useRef(true);

  const load = useCallback(async () => {
    try {
      const data = await carsApi.getFeatured(12);
      if (!alive.current) return;
      setRows(Array.isArray(data) ? data : []);
      setFailed(false);
    } catch {
      // Keep whatever is already on screen; only an empty screen shows the error.
      if (alive.current) setFailed(true);
    }
  }, []);

  useEffect(() => {
    alive.current = true;
    load();
    return () => { alive.current = false; };
  }, [load]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    if (alive.current) setRefreshing(false);
  }, [load]);

  const retry = () => { setFailed(false); load(); };

  let body;
  if (rows === null && failed) {
    body = (
      <ErrorState
        title={t('home.offlineTitle')}
        sub={t('home.offlineSub')}
        actionLabel={t('common.retry')}
        onAction={retry}
      />
    );
  } else if (rows === null) {
    body = <ActivityIndicator style={{ marginTop: 40 }} color={colors.textMuted} />;
  } else {
    body = (
      <FlatList
        data={rows}
        keyExtractor={(item) => item.placement_id || item.id}
        contentContainerStyle={[styles.list, !rows.length && styles.listEmpty]}
        ItemSeparatorComponent={() => <View style={{ height: 14 }} />}
        ListHeaderComponent={rows.length ? <Text style={styles.sub}>{t('home.featuredAllSub')}</Text> : null}
        ListEmptyComponent={(
          <EmptyState
            icon="car-outline"
            title={t('home.featuredAllEmpty')}
            actionLabel={t('home.browseAll')}
            onAction={() => navigation.navigate('SearchResults')}
          />
        )}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.textMuted} />}
        renderItem={({ item }) => (
          <FeaturedCard
            slide={item}
            width={width - 40}
            height={210}
            reducedMotion={reducedMotion}
            t={t}
            onPress={() => navigation.navigate('VehicleDetail', { carId: item.id })}
          />
        )}
      />
    );
  }

  return (
    <Screen background={colors.bg}>
      <BackHeader title={t('home.featuredTitle')} onBack={() => navigation.goBack()} />
      {body}
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { paddingHorizontal: 20, paddingBottom: 40 },
  listEmpty: { flexGrow: 1 },
  sub: {
    fontSize: 13, fontFamily: fonts.regular, color: colors.textMuted,
    marginTop: 16, marginBottom: 16, lineHeight: 19,
  },
});
