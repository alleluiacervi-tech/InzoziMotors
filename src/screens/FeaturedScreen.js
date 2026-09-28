import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, Dimensions } from 'react-native';
import Screen from '../components/Screen';
import BackHeader from '../components/BackHeader';
import FeaturedCard from '../components/FeaturedCard';
import { colors, fonts } from '../theme';
import { useApp } from '../context/AppContext';
import { cars as carsApi } from '../api/cars';
import useReducedMotion from '../hooks/useReducedMotion';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_W = SCREEN_WIDTH - 40;

// "See all" from the home rail: every current placement, in the same order the
// server gave the rail, as one vertical list. Same card, same labels.
export default function FeaturedScreen({ navigation }) {
  const { t } = useApp();
  const reducedMotion = useReducedMotion();
  const [rows, setRows] = useState(null);

  useEffect(() => {
    let alive = true;
    carsApi.getFeatured(12)
      .then((data) => { if (alive) setRows(Array.isArray(data) ? data : []); })
      .catch(() => { if (alive) setRows([]); });
    return () => { alive = false; };
  }, []);

  return (
    <Screen background={colors.bg}>
      <BackHeader title={t('home.featuredTitle')} onBack={() => navigation.goBack()} />
      {rows === null ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={colors.textMuted} />
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(item) => item.placement_id || item.id}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={{ height: 14 }} />}
          ListHeaderComponent={<Text style={styles.sub}>{t('home.featuredAllSub')}</Text>}
          ListEmptyComponent={<Text style={styles.empty}>{t('home.offlineSub')}</Text>}
          renderItem={({ item }) => (
            <FeaturedCard
              slide={item}
              width={CARD_W}
              height={210}
              reducedMotion={reducedMotion}
              t={t}
              onPress={() => navigation.navigate('VehicleDetail', { carId: item.id })}
            />
          )}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { paddingHorizontal: 20, paddingBottom: 40 },
  sub: {
    fontSize: 13, fontFamily: fonts.regular, color: colors.textMuted,
    marginTop: 16, marginBottom: 16, lineHeight: 19,
  },
  empty: { fontSize: 14, fontFamily: fonts.regular, color: colors.textMuted, textAlign: 'center', marginTop: 24 },
});
