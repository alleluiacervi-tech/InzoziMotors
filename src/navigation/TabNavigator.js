import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius, shadows } from '../theme';

import HomeScreen from '../screens/HomeScreen';
import SearchScreen from '../screens/SearchScreen';
import SavedScreen from '../screens/SavedScreen';
import ProfileScreen from '../screens/ProfileScreen';
import SellScreen from '../screens/SellScreen';

const Tab = createBottomTabNavigator();

const ICONS = {
  Home: 'home',
  Search: 'search',
  Saved: 'heart',
  Profile: 'person',
};

// Custom tab bar so the center "Sell" action can be a raised blue button.
function TabBar({ state, descriptors, navigation }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 14) }]}>
      {state.routes.map((route, index) => {
        const focused = state.index === index;
        const onPress = () => {
          const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
        };

        if (route.name === 'Sell') {
          return (
            <Pressable key={route.key} style={styles.sellItem} onPress={onPress}>
              <View style={[styles.sellBtn, shadows.blueGlow]}>
                <Ionicons name="add" size={26} color="#fff" />
              </View>
              <Text style={[styles.label, { color: colors.primary }]}>Sell</Text>
            </Pressable>
          );
        }

        const color = focused ? colors.primary : colors.textMuted;
        return (
          <Pressable key={route.key} style={styles.item} onPress={onPress}>
            <Ionicons
              name={focused ? ICONS[route.name] : `${ICONS[route.name]}-outline`}
              size={23}
              color={color}
            />
            <Text style={[styles.label, { color, fontWeight: focused ? '700' : '600' }]}>
              {route.name}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export default function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{ headerShown: false }}
      tabBar={(props) => <TabBar {...props} />}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Search" component={SearchScreen} />
      <Tab.Screen name="Sell" component={SellScreen} />
      <Tab.Screen name="Saved" component={SavedScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.borderSoft,
    paddingTop: 10,
    paddingHorizontal: 12,
    alignItems: 'flex-end',
  },
  item: { flex: 1, alignItems: 'center', gap: 4 },
  sellItem: { flex: 1, alignItems: 'center', gap: 4 },
  sellBtn: {
    width: 54,
    height: 54,
    borderRadius: radius.xl,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -22,
  },
  label: { fontSize: 11, fontWeight: '600' },
});
