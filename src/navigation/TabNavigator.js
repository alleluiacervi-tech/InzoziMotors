import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius } from '../theme';
import { useApp } from '../context/AppContext';

import HomeScreen from '../screens/HomeScreen';
import SearchScreen from '../screens/SearchScreen';
import MessagesScreen from '../screens/MessagesScreen';
import ProfileScreen from '../screens/ProfileScreen';

const Tab = createBottomTabNavigator();

const ICONS = {
  Home: 'home',
  Search: 'search',
  Messages: 'chatbubble-ellipses',
  Profile: 'person',
};

function TabBar({ state, descriptors, navigation }) {
  const insets = useSafeAreaInsets();
  const { conversations, notifications, comparisonCars } = useApp();

  const messagesBadge = conversations.reduce((sum, c) => sum + (c.unread || 0), 0);
  const notifBadge = notifications.filter((n) => !n.read).length;

  return (
    <View>
      {/* Compare floater — appears above tab bar when cars are queued */}
      {comparisonCars.length > 0 && (
        <Pressable
          style={styles.compareFloat}
          onPress={() => navigation.getParent()?.navigate('Comparison')}
        >
          <Ionicons name="git-compare-outline" size={14} color="#fff" />
          <Text style={styles.compareFloatText}>
            Compare {comparisonCars.length} car{comparisonCars.length > 1 ? 's' : ''}
          </Text>
          <View style={styles.compareFloatDot}>
            <Text style={styles.compareFloatCount}>{comparisonCars.length}</Text>
          </View>
          <Ionicons name="chevron-forward" size={14} color="rgba(255,255,255,0.8)" />
        </Pressable>
      )}
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 10), height: 56 + Math.max(insets.bottom, 10) }]}>
      {state.routes.map((route, index) => {
        const focused = state.index === index;
        const onPress = () => {
          const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
        };

        const color = focused ? colors.primary : colors.textMuted;

        // Badge count for this tab
        const badge = route.name === 'Messages' ? messagesBadge
          : route.name === 'Profile' ? notifBadge
          : 0;

        return (
          <Pressable key={route.key} style={styles.item} onPress={onPress}>
            <View style={styles.iconWrap}>
              <Ionicons
                name={focused ? ICONS[route.name] : `${ICONS[route.name]}-outline`}
                size={22}
                color={color}
              />
              {badge > 0 && (
                <View style={[styles.badge, badge > 9 && styles.badgeWide]}>
                  <Text style={styles.badgeText}>{badge > 99 ? '99+' : badge}</Text>
                </View>
              )}
            </View>
            <Text style={[styles.label, { color, fontWeight: focused ? '700' : '600' }]}>
              {route.name}
            </Text>
          </Pressable>
        );
      })}
    </View>
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
      <Tab.Screen name="Messages" component={MessagesScreen} />
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
    paddingTop: 8,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  item: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 3 },
  iconWrap: { position: 'relative' },
  label: { fontSize: 11, fontWeight: '600' },
  badge: {
    position: 'absolute', top: -5, right: -8,
    minWidth: 17, height: 17, borderRadius: 9,
    backgroundColor: colors.statusRejected,
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 1.5, borderColor: colors.surface,
  },
  badgeWide: { right: -12 },
  badgeText: { fontSize: 9, fontWeight: '800', color: '#fff' },
  compareFloat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    marginHorizontal: 20,
    marginBottom: 8,
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: 30,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  compareFloatText: { flex: 1, color: '#fff', fontSize: 14, fontWeight: '700' },
  compareFloatDot: {
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center', justifyContent: 'center',
  },
  compareFloatCount: { color: '#fff', fontSize: 12, fontWeight: '800' },
});
