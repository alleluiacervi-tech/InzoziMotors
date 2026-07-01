import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, TextInput, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Screen from '../components/Screen';
import { colors, radius, fonts } from '../theme';
import { useApp } from '../context/AppContext';
import FilterModal from '../components/FilterModal';

export default function SearchScreen({ navigation }) {
  const { cars } = useApp();
  
  // Selection states
  const [make, setMake] = useState('Ford');
  const [model, setModel] = useState('Five Hundred');
  const [detailModel, setDetailModel] = useState('Five Hundred (05~07)');
  const [trim, setTrim] = useState('');
  const [year, setYear] = useState('');
  const [mileage, setMileage] = useState('');
  const [price, setPrice] = useState('');
  
  const [rememberOptions, setRememberOptions] = useState(false);
  const [activeTab, setActiveTab] = useState(''); // quick filter pill state

  // Modals state
  const [modalVisible, setModalVisible] = useState(false);
  const [modalType, setModalType] = useState('make'); // 'make', 'year', 'body'

  const handleReset = () => {
    setMake('');
    setModel('');
    setDetailModel('');
    setTrim('');
    setYear('');
    setMileage('');
    setPrice('');
    setActiveTab('');
  };

  const getMatchingCount = () => {
    let list = cars;
    if (make) list = list.filter(c => c.make.toLowerCase() === make.toLowerCase());
    if (year && year !== 'All') {
      const years = year.split('~');
      const min = parseInt(years[0]) || 0;
      const max = parseInt(years[1]) || 9999;
      list = list.filter(c => c.year >= min && c.year <= max);
    }
    return list.length;
  };

  const handleOpenModal = (type) => {
    setModalType(type);
    setModalVisible(true);
  };

  const handleSelectValue = (value) => {
    if (modalType === 'make') {
      setMake(value);
      setModel('All');
      setDetailModel('All');
    } else if (modalType === 'year') {
      setYear(value);
    } else if (modalType === 'body') {
      setTrim(value); // map vehicle type selection to trim/body
    }
  };

  return (
    <Screen background={colors.bg}>
      {/* 1. Search Header */}
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={8}>
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
        </Pressable>
        <View style={styles.searchBar}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search for vehicles (e.g. QM6)"
            placeholderTextColor={colors.textMuted}
          />
          <Pressable onPress={() => navigation.navigate('SearchResults')}>
            <Ionicons name="search" size={20} color={colors.textPrimary} />
          </Pressable>
        </View>
      </View>

      {/* Main Content */}
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        
        {/* 2. Quick Filter Tabs (3 pills) */}
        <View style={styles.pillsRow}>
          {[
            { id: 'domestic_import', label: 'Domestic · Import' },
            { id: 'ev_eco', label: 'EV · Eco-Friendly' },
            { id: 'truck_special', label: 'Truck · Special · Bus' }
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <Pressable
                key={tab.id}
                style={[styles.pill, isActive && styles.pillActive]}
                onPress={() => setActiveTab(isActive ? '' : tab.id)}
              >
                <Text style={[styles.pillText, isActive && styles.pillTextActive]}>
                  {tab.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* 3. "Remember Options" (조건 기억) Row */}
        <View style={styles.rememberRow}>
          <Text style={styles.rememberLabel}>Remember Options</Text>
          <Switch
            value={rememberOptions}
            onValueChange={setRememberOptions}
            trackColor={{ false: '#CCCCCC', true: colors.primary }}
            thumbColor="#FFFFFF"
          />
        </View>

        {/* 4. Filter List (scrollable) */}
        <View style={styles.filterList}>
          <Pressable style={styles.filterRow} onPress={() => handleOpenModal('make')}>
            <Text style={styles.filterLabel}>Manufacturer</Text>
            <View style={styles.valueRow}>
              <Text style={[styles.filterValue, !make && styles.placeholderText]}>
                {make || 'Select'}
              </Text>
              <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
            </View>
          </Pressable>

          <Pressable style={styles.filterRow} onPress={() => handleOpenModal('make')}>
            <Text style={styles.filterLabel}>Model</Text>
            <View style={styles.valueRow}>
              <Text style={[styles.filterValue, !model && styles.placeholderText]}>
                {model || 'Select'}
              </Text>
              <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
            </View>
          </Pressable>

          <Pressable style={styles.filterRow} onPress={() => handleOpenModal('make')}>
            <Text style={styles.filterLabel}>Detailed Model</Text>
            <View style={styles.valueRow}>
              <Text style={[styles.filterValue, !detailModel && styles.placeholderText]}>
                {detailModel || 'Select'}
              </Text>
              <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
            </View>
          </Pressable>

          <Pressable style={styles.filterRow} onPress={() => handleOpenModal('body')}>
            <Text style={styles.filterLabel}>Vehicle Type / Trim</Text>
            <View style={styles.valueRow}>
              <Text style={[styles.filterValue, !trim && styles.placeholderText]}>
                {trim || 'Select'}
              </Text>
              <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
            </View>
          </Pressable>

          <Pressable style={styles.filterRow} onPress={() => handleOpenModal('year')}>
            <Text style={styles.filterLabel}>Model Year</Text>
            <View style={styles.valueRow}>
              <Text style={[styles.filterValue, !year && styles.placeholderText]}>
                {year || 'Select'}
              </Text>
              <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
            </View>
          </Pressable>

          <Pressable style={styles.filterRow} onPress={() => {}}>
            <Text style={styles.filterLabel}>Mileage</Text>
            <View style={styles.valueRow}>
              <Text style={[styles.filterValue, !mileage && styles.placeholderText]}>
                {mileage || 'Select'}
              </Text>
              <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
            </View>
          </Pressable>

          <Pressable style={styles.filterRow} onPress={() => {}}>
            <Text style={styles.filterLabel}>Price</Text>
            <View style={styles.valueRow}>
              <Text style={[styles.filterValue, !price && styles.placeholderText]}>
                {price || 'Select'}
              </Text>
              <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
            </View>
          </Pressable>
        </View>

        {/* Promotional Link */}
        <Pressable style={styles.promoLink} onPress={() => {}}>
          <Text style={styles.promoLinkText}>
            Check my car's value before buying first &gt;
          </Text>
        </Pressable>
      </ScrollView>

      {/* 5. Bottom Buttons */}
      <View style={styles.buttonFooter}>
        <Pressable style={styles.resetBtn} onPress={handleReset}>
          <Text style={styles.resetBtnText}>Reset</Text>
        </Pressable>
        <Pressable 
          style={[styles.searchBtn, { backgroundColor: colors.primary }]} 
          onPress={() => navigation.navigate('SearchResults', { filters: { make, year } })}
        >
          <Text style={styles.searchBtnText}>
            View Listings ({getMatchingCount()} cars)
          </Text>
        </Pressable>
      </View>

      {/* Custom Filter Modals overlay */}
      <FilterModal
        visible={modalVisible}
        type={modalType}
        onClose={() => setModalVisible(false)}
        onSelect={handleSelectValue}
        selectedValue={modalType === 'make' ? make : modalType === 'year' ? year : trim}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    height: 56,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E8ECEF',
  },
  searchBar: {
    flex: 1,
    height: 38,
    borderRadius: 8,
    backgroundColor: '#F5F5F5',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: colors.textPrimary,
    paddingVertical: 0,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  pillsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
    backgroundColor: '#FFFFFF',
  },
  pill: {
    flex: 1,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  pillActive: {
    backgroundColor: colors.primary,
  },
  pillText: {
    fontSize: 11,
    fontFamily: fonts.bold,
    color: '#666666',
    textAlign: 'center',
  },
  pillTextActive: {
    color: '#FFFFFF',
  },
  rememberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginTop: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E8ECEF',
  },
  rememberLabel: {
    fontSize: 14,
    color: colors.textPrimary,
    fontFamily: fonts.bold,
  },
  filterList: {
    backgroundColor: '#FFFFFF',
    marginTop: 8,
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  filterLabel: {
    fontSize: 14,
    fontFamily: fonts.bold,
    color: colors.textPrimary,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  filterValue: {
    fontSize: 14,
    color: colors.primary,
    fontFamily: fonts.bold,
  },
  placeholderText: {
    color: '#999999',
    fontFamily: fonts.semiBold,
  },
  promoLink: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  promoLinkText: {
    fontSize: 12,
    color: '#666666',
    fontFamily: fonts.semiBold,
  },
  buttonFooter: {
    height: 72,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E8ECEF',
    flexDirection: 'row',
    paddingHorizontal: 16,
    alignItems: 'center',
    gap: 12,
  },
  resetBtn: {
    width: 90,
    height: 48,
    borderRadius: 8,
    backgroundColor: '#F5F5F4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  resetBtnText: {
    fontSize: 14,
    fontFamily: fonts.bold,
    color: '#666666',
  },
  searchBtn: {
    flex: 1,
    height: 48,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: fonts.bold,
  },
});
