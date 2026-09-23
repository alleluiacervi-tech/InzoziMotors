import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, Pressable, ScrollView, FlatList, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, fonts } from '../theme';

const DOMESTIC_MAKES = [
  { name: 'Hyundai', count: 54437 },
  { name: 'Genesis', count: 14894 },
  { name: 'Kia', count: 56340 },
  { name: 'Chevrolet', count: 9989 },
  { name: 'Renault Korea', count: 7771 },
  { name: 'KG Mobility', count: 10913 },
  { name: 'Others', count: 60 }
];

const IMPORT_MAKES = [
  { name: 'BMW', count: 18205 },
  { name: 'Mercedes-Benz', count: 21394 },
  { name: 'Audi', count: 8421 },
  { name: 'Tesla', count: 3450 },
  { name: 'Porsche', count: 2120 },
  { name: 'Toyota', count: 1850 },
  { name: 'Ford', count: 950 }
];

const YEARS = [2027, 2026, 2025, 2024, 2023, 2022, 2021, 2020];

const VEHICLE_TYPES = [
  { label: 'Micro Car', count: 1250 },
  { label: 'Compact Car', count: 3420 },
  { label: 'Sub-Compact', count: 6890 },
  { label: 'Mid-Size', count: 12430 },
  { label: 'Full-Size', count: 8940 },
  { label: 'Sports Car', count: 1850 },
  { label: 'SUV', count: 24500 },
  { label: 'RV', count: 5430 },
  { label: 'Micro Bus', count: 420 },
  { label: 'Van', count: 980 }
];

export default function FilterModal({ visible, type, onClose, onSelect, selectedValue }) {
  const [activeTab, setActiveTab] = useState('domestic'); // for manufacturer modal
  const [minYear, setMinYear] = useState('');
  const [maxYear, setMaxYear] = useState('');
  const [selectedTypes, setSelectedTypes] = useState([]); // for vehicle type checkbox list

  const handleReset = () => {
    setMinYear('');
    setMinYear('');
    setSelectedTypes([]);
  };

  const toggleTypeSelection = (label) => {
    setSelectedTypes(prev => 
      prev.includes(label) ? prev.filter(t => t !== label) : [...prev, label]
    );
  };

  const renderContent = () => {
    if (type === 'make') {
      const listData = activeTab === 'domestic' ? DOMESTIC_MAKES : IMPORT_MAKES;
      return (
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Manufacturer</Text>
            <Pressable onPress={onClose} hitSlop={8} accessibilityRole="button" accessibilityLabel="Close">
              <Ionicons name="close" size={24} color={colors.textPrimary} />
            </Pressable>
          </View>

          {/* Subtabs */}
          <View style={styles.tabBar}>
            <Pressable 
              style={[styles.tab, activeTab === 'domestic' && styles.tabActive]} 
              onPress={() => setActiveTab('domestic')}
            >
              <Text style={[styles.tabText, activeTab === 'domestic' && styles.tabTextActive]}>Domestic</Text>
            </Pressable>
            <Pressable 
              style={[styles.tab, activeTab === 'import' && styles.tabActive]} 
              onPress={() => setActiveTab('import')}
            >
              <Text style={[styles.tabText, activeTab === 'import' && styles.tabTextActive]}>Imports Popular</Text>
            </Pressable>
          </View>

          {/* List */}
          <FlatList
            data={listData}
            keyExtractor={(item) => item.name}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listPadding}
            renderItem={({ item }) => (
              <Pressable 
                style={styles.listItem} 
                onPress={() => {
                  onSelect(item.name);
                  onClose();
                }}
              >
                <Text style={styles.itemName}>{item.name}</Text>
                <Text style={styles.itemCount}>{item.count.toLocaleString()}</Text>
              </Pressable>
            )}
          />

          <View style={styles.buttonFooter}>
            <Pressable style={styles.confirmBtn} onPress={onClose}>
              <Text style={styles.confirmBtnText}>Confirm (0 selected)</Text>
            </Pressable>
          </View>
        </View>
      );
    }

    if (type === 'year') {
      return (
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Model Year</Text>
            <Pressable onPress={handleReset}>
              <Text style={styles.resetLink}>Reset</Text>
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollPadding}>
            {/* Input Range */}
            <View style={styles.yearRangeContainer}>
              <TextInput
                style={styles.yearInput}
                placeholder="Min Year"
                value={minYear}
                keyboardType="numeric"
                onChangeText={setMinYear}
              />
              <Text style={styles.yearRangeDivider}>~</Text>
              <TextInput
                style={styles.yearInput}
                placeholder="Max Year"
                value={maxYear}
                keyboardType="numeric"
                onChangeText={setMaxYear}
              />
            </View>

            {/* Quick Grid Select */}
            <Text style={styles.sectionLabel}>Quick Select Year</Text>
            <View style={styles.yearsGrid}>
              {YEARS.map(y => (
                <Pressable 
                  key={y} 
                  style={[styles.yearGridItem, (minYear === String(y) && maxYear === String(y)) && styles.yearGridItemActive]}
                  onPress={() => {
                    setMinYear(String(y));
                    setMaxYear(String(y));
                  }}
                >
                  <Text style={[styles.yearGridText, (minYear === String(y) && maxYear === String(y)) && styles.yearGridTextActive]}>{y}</Text>
                </Pressable>
              ))}
            </View>

            <Pressable style={styles.addMonthContainer} onPress={() => {}}>
              <Text style={styles.addMonthText}>+ Add Month filter</Text>
            </Pressable>
          </ScrollView>

          <View style={styles.buttonFooter}>
            <Pressable 
              style={[styles.confirmBtn, { backgroundColor: colors.primary }]} 
              onPress={() => {
                const display = minYear && maxYear ? `${minYear}~${maxYear}` : minYear ? `${minYear}~` : maxYear ? `~${maxYear}` : 'All';
                onSelect(display);
                onClose();
              }}
            >
              <Text style={styles.confirmBtnText}>Confirm (218,276 listings)</Text>
            </Pressable>
          </View>
        </View>
      );
    }

    if (type === 'body') {
      return (
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Vehicle Type</Text>
            <Pressable onPress={onClose} hitSlop={8} accessibilityRole="button" accessibilityLabel="Close">
              <Ionicons name="close" size={24} color={colors.textPrimary} />
            </Pressable>
          </View>

          <FlatList
            data={VEHICLE_TYPES}
            keyExtractor={(item) => item.label}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listPadding}
            renderItem={({ item }) => {
              const isSelected = selectedTypes.includes(item.label);
              return (
                <Pressable style={styles.checkboxItem} onPress={() => toggleTypeSelection(item.label)}>
                  <Ionicons 
                    name={isSelected ? 'checkbox' : 'square-outline'} 
                    size={22} 
                    color={isSelected ? colors.primary : colors.textMuted} 
                  />
                  <Text style={styles.checkboxLabel}>{item.label}</Text>
                  <Text style={styles.itemCount}>{item.count.toLocaleString()}</Text>
                </Pressable>
              );
            }}
          />

          <View style={styles.buttonFooter}>
            <Pressable 
              style={[styles.confirmBtn, { backgroundColor: colors.primary }]} 
              onPress={() => {
                onSelect(selectedTypes.length > 0 ? selectedTypes.join(', ') : 'All');
                onClose();
              }}
            >
              <Text style={styles.confirmBtnText}>Confirm ({selectedTypes.length} selected)</Text>
            </Pressable>
          </View>
        </View>
      );
    }

    return null;
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <Pressable style={styles.dismissBackdrop} onPress={onClose} />
        {renderContent()}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  dismissBackdrop: {
    flex: 1,
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    height: '75%',
    paddingBottom: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E8ECEF',
  },
  headerTitle: {
    fontSize: 16,
    fontFamily: fonts.extraBold,
    color: colors.textPrimary,
  },
  resetLink: {
    fontSize: 14,
    color: colors.textMuted,
  },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E8ECEF',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: colors.primary,
  },
  tabText: {
    fontSize: 14,
    color: '#999999',
    fontFamily: fonts.bold,
  },
  tabTextActive: {
    color: colors.primary,
  },
  listPadding: {
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  scrollPadding: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  listItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  itemName: {
    fontSize: 14,
    fontFamily: fonts.bold,
    color: colors.textPrimary,
  },
  itemCount: {
    fontSize: 12,
    color: '#999999',
  },
  buttonFooter: {
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  confirmBtn: {
    height: 48,
    borderRadius: 8,
    backgroundColor: colors.textDisabled,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: fonts.bold,
  },
  yearRangeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  yearInput: {
    flex: 1,
    height: 44,
    borderWidth: 1,
    borderColor: '#E8ECEF',
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 14,
    fontFamily: fonts.medium,
    color: colors.textPrimary,
  },
  yearRangeDivider: {
    fontSize: 18,
    color: '#999999',
    marginHorizontal: 16,
  },
  sectionLabel: {
    fontSize: 14,
    fontFamily: fonts.extraBold,
    color: colors.textPrimary,
    marginBottom: 12,
  },
  yearsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 24,
  },
  yearGridItem: {
    width: '23%',
    height: 38,
    borderRadius: 6,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  yearGridItemActive: {
    backgroundColor: colors.primary,
  },
  yearGridText: {
    fontSize: 12,
    color: colors.textMuted,
    fontFamily: fonts.bold,
  },
  yearGridTextActive: {
    color: '#FFFFFF',
  },
  addMonthContainer: {
    alignItems: 'center',
    marginVertical: 12,
  },
  addMonthText: {
    fontSize: 13,
    color: colors.primary,
    fontFamily: fonts.semiBold,
  },
  checkboxItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  checkboxLabel: {
    fontSize: 14,
    fontFamily: fonts.bold,
    color: colors.textPrimary,
    marginLeft: 12,
    flex: 1,
  },
});
