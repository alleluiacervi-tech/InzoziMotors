import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Screen from '../components/Screen';
import BackHeader from '../components/BackHeader';
import Button from '../components/Button';
import { colors, radius, shadows, fonts } from '../theme';
import { showToast, showConfirm } from '../components/Feedback';
import { INSPECTION_CATEGORIES } from '../data/inspectionData';
import { useApp } from '../context/AppContext';

const RESULT_OPTIONS = [
  { value: 'pass', label: 'Pass', icon: 'checkmark', color: colors.green, bg: colors.greenTint },
  { value: 'flag', label: 'Flag', icon: 'alert', color: colors.amber, bg: colors.amberTint },
  { value: 'fail', label: 'Fail', icon: 'close', color: colors.statusRejected, bg: colors.statusRejectedBg },
];

function calcCategoryScore(category, results) {
  const total = category.items.length;
  if (total === 0) return 0;
  let earned = 0;
  category.items.forEach((item) => {
    const r = results[item.id];
    if (r === 'pass') earned += 1;
    else if (r === 'flag') earned += 0.5;
  });
  return Math.round((earned / total) * category.maxPts);
}

function calcTotalScore(results) {
  return INSPECTION_CATEGORIES.reduce(
    (sum, cat) => sum + calcCategoryScore(cat, results),
    0,
  );
}

function categoryCompletionCount(category, results) {
  return category.items.filter((item) => results[item.id]).length;
}

function ItemRow({ item, value, onSelect }) {
  return (
    <View style={styles.itemRow}>
      <Text style={styles.itemLabel} numberOfLines={2}>{item.label}</Text>
      <View style={styles.itemOptions}>
        {RESULT_OPTIONS.map((opt) => {
          const active = value === opt.value;
          return (
            <Pressable
              key={opt.value}
              style={[
                styles.optBtn,
                active && { backgroundColor: opt.bg, borderColor: opt.color },
              ]}
              onPress={() => onSelect(opt.value)}
            >
              <Ionicons
                name={opt.icon}
                size={14}
                color={active ? opt.color : colors.textMuted}
              />
              <Text style={[styles.optLabel, active && { color: opt.color }]}>
                {opt.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function CategoryAccordion({ category, results, onResult, expanded, onToggle }) {
  const score = calcCategoryScore(category, results);
  const done = categoryCompletionCount(category, results);
  const total = category.items.length;
  const pct = total > 0 ? score / category.maxPts : 0;

  const flagCount = category.items.filter((i) => results[i.id] === 'flag').length;
  const failCount = category.items.filter((i) => results[i.id] === 'fail').length;

  return (
    <View style={[styles.accordion, expanded && styles.accordionOpen]}>
      <Pressable style={styles.accordionHeader} onPress={onToggle}>
        <View style={[styles.catIcon, { backgroundColor: colors.greenTint }]}>
          <Ionicons name={category.icon} size={18} color={colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.catName}>{category.name}</Text>
          <View style={styles.catMeta}>
            <Text style={styles.catProgress}>{done}/{total} items</Text>
            {flagCount > 0 && (
              <View style={[styles.miniChip, { backgroundColor: colors.amberTint }]}>
                <Text style={[styles.miniChipText, { color: colors.amber }]}>{flagCount} flagged</Text>
              </View>
            )}
            {failCount > 0 && (
              <View style={[styles.miniChip, { backgroundColor: colors.statusRejectedBg }]}>
                <Text style={[styles.miniChipText, { color: colors.statusRejected }]}>{failCount} failed</Text>
              </View>
            )}
          </View>
          <View style={styles.catBar}>
            <View style={[styles.catBarFill, { width: `${pct * 100}%` }]} />
          </View>
        </View>
        <View style={{ alignItems: 'flex-end', gap: 4 }}>
          <Text style={styles.catScore}>{score}<Text style={styles.catMax}>/{category.maxPts}</Text></Text>
          <Ionicons
            name={expanded ? 'chevron-up' : 'chevron-down'}
            size={16}
            color={colors.textMuted}
          />
        </View>
      </Pressable>

      {expanded && (
        <View style={styles.accordionBody}>
          {category.items.map((item, idx) => (
            <View key={item.id}>
              {idx > 0 && <View style={styles.divider} />}
              <ItemRow
                item={item}
                value={results[item.id]}
                onSelect={(val) => onResult(item.id, val)}
              />
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

export default function InspectionFormScreen({ navigation, route }) {
  const inspection = route.params?.inspection || {};
  const { submitInspectionForm } = useApp();

  const [results, setResults] = useState({});
  const [notes, setNotes] = useState('');
  const [expandedId, setExpandedId] = useState('engine');

  const totalScore = calcTotalScore(results);
  const totalAnswered = Object.keys(results).length;
  const totalItems = INSPECTION_CATEGORIES.reduce((s, c) => s + c.items.length, 0);
  const pct = Math.round((totalScore / 150) * 100);

  const handleResult = (itemId, value) => {
    setResults((prev) => ({ ...prev, [itemId]: value }));
  };

  const handleGenerate = () => {
    if (totalAnswered < totalItems) {
      showConfirm({
        title: 'Incomplete form',
        message: `${totalItems - totalAnswered} item(s) still need a result. Fill all items before generating the report.`,
        confirmLabel: 'Continue Anyway',
        cancelLabel: 'Go Back',
      }).then((ok) => { if (ok) proceed(); }
      );
    } else {
      proceed();
    }
  };

  const proceed = () => {
    submitInspectionForm({ inspection, results, notes, score: totalScore });
    navigation.navigate('PhotoUpload', { inspection, score: totalScore, results, notes });
  };

  return (
    <Screen background={colors.bg}>
      <BackHeader
        title="Inspection Form"
        onBack={() => navigation.goBack()}
        right={
          <View style={styles.scorePill}>
            <Text style={styles.scorePillText}>{totalScore}<Text style={{ fontSize: 11, fontFamily: fonts.semiBold }}>/150</Text></Text>
          </View>
        }
      />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
        {/* Car + Inspector info card */}
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Ionicons name="car-outline" size={16} color={colors.primary} />
            <Text style={styles.infoTitle}>
              {inspection.car || '2019 Toyota RAV4'}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="person-outline" size={14} color={colors.textMuted} />
            <Text style={styles.infoMeta}>{inspection.seller || 'Jean Pierre H.'}</Text>
            <View style={styles.infoDot} />
            <Ionicons name="location-outline" size={14} color={colors.textMuted} />
            <Text style={styles.infoMeta}>{inspection.center || 'Nyarutarama'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="time-outline" size={14} color={colors.textMuted} />
            <Text style={styles.infoMeta}>{inspection.time || 'Today · 10:00 AM'}</Text>
          </View>
        </View>

        {/* Progress summary */}
        <View style={styles.progressCard}>
          <View style={styles.progressRow}>
            <Text style={styles.progressLabel}>{totalAnswered} / {totalItems} items checked</Text>
            <Text style={styles.progressPct}>{pct}%</Text>
          </View>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${(totalAnswered / totalItems) * 100}%` }]} />
          </View>
          <View style={styles.legendRow}>
            {RESULT_OPTIONS.map((opt) => {
              const count = Object.values(results).filter((v) => v === opt.value).length;
              return (
                <View key={opt.value} style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: opt.color }]} />
                  <Text style={styles.legendText}>{count} {opt.label}</Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* Accordion sections */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>150-Point Checklist</Text>
          <Text style={styles.sectionSub}>Tap each category to expand</Text>
        </View>

        <View style={styles.accordions}>
          {INSPECTION_CATEGORIES.map((cat) => (
            <CategoryAccordion
              key={cat.id}
              category={cat}
              results={results}
              onResult={handleResult}
              expanded={expandedId === cat.id}
              onToggle={() => setExpandedId(expandedId === cat.id ? null : cat.id)}
            />
          ))}
        </View>

        {/* Mechanic notes */}
        <View style={styles.notesCard}>
          <Text style={styles.notesLabel}>Mechanic Notes</Text>
          <TextInput
            style={styles.notesInput}
            value={notes}
            onChangeText={setNotes}
            placeholder="Add any additional observations, recommendations, or notes for the buyer report…"
            placeholderTextColor={colors.textMuted}
            multiline
            numberOfLines={5}
            textAlignVertical="top"
          />
        </View>
      </ScrollView>

      {/* Sticky CTA */}
      <View style={styles.cta}>
        <Button
          title="Generate Report & Upload Photos"
          icon="document-text-outline"
          onPress={handleGenerate}
        />
        <Text style={styles.ctaSub}>
          Score: {totalScore}/150 · {pct}% · {totalScore >= 132 ? 'Eligible for Sawa Certified badge' : 'Below certified threshold (88%)'}
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  infoCard: {
    margin: 16,
    marginBottom: 8,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    borderRadius: radius.xl,
    padding: 16,
    gap: 8,
    ...shadows.card,
  },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  infoTitle: { fontSize: 15, fontFamily: fonts.extraBold, color: colors.textPrimary, flex: 1 },
  infoMeta: { fontSize: 13, color: colors.textSecondary },
  infoDot: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: colors.border },
  progressCard: {
    marginHorizontal: 16,
    marginBottom: 8,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    borderRadius: radius.xl,
    padding: 16,
    gap: 10,
  },
  progressRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  progressLabel: { fontSize: 13, fontFamily: fonts.semiBold, color: colors.textSecondary },
  progressPct: { fontSize: 20, fontFamily: fonts.extraBold, color: colors.primary },
  progressTrack: { height: 6, borderRadius: 3, backgroundColor: colors.border },
  progressFill: { height: 6, borderRadius: 3, backgroundColor: colors.primary },
  legendRow: { flexDirection: 'row', gap: 16 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 12, color: colors.textSecondary },
  sectionHeader: { paddingHorizontal: 16, marginBottom: 10, marginTop: 8 },
  sectionTitle: { fontSize: 16, fontFamily: fonts.extraBold, color: colors.textPrimary },
  sectionSub: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  accordions: { paddingHorizontal: 16, gap: 8, marginBottom: 8 },
  accordion: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    borderRadius: radius.xl,
    overflow: 'hidden',
    ...shadows.card,
  },
  accordionOpen: { borderColor: colors.border },
  accordionHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  catIcon: { width: 38, height: 38, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  catName: { fontSize: 14, fontFamily: fonts.bold, color: colors.textPrimary },
  catMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 },
  catProgress: { fontSize: 11, color: colors.textMuted },
  miniChip: {
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: radius.pill,
  },
  miniChipText: { fontSize: 11, fontFamily: fonts.bold },
  catBar: { height: 3, borderRadius: 2, backgroundColor: colors.border, marginTop: 6 },
  catBarFill: { height: 3, borderRadius: 2, backgroundColor: colors.primary },
  catScore: { fontSize: 16, fontFamily: fonts.extraBold, color: colors.primary },
  catMax: { fontSize: 11, color: colors.textMuted, fontFamily: fonts.semiBold },
  accordionBody: { borderTopWidth: 1, borderTopColor: colors.borderSoft, paddingHorizontal: 14, paddingBottom: 6 },
  divider: { height: 1, backgroundColor: colors.borderSoft, marginVertical: 0 },
  itemRow: { paddingVertical: 12, gap: 8 },
  itemLabel: { fontSize: 13, color: colors.textSecondary, lineHeight: 18 },
  itemOptions: { flexDirection: 'row', gap: 6 },
  optBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4,
    paddingVertical: 7, borderRadius: radius.md,
    borderWidth: 1.5, borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
  },
  optLabel: { fontSize: 11, fontFamily: fonts.bold, color: colors.textMuted },
  notesCard: {
    marginHorizontal: 16, marginBottom: 8,
    backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.borderSoft,
    borderRadius: radius.xl,
    padding: 16,
  },
  notesLabel: { fontSize: 14, fontFamily: fonts.bold, color: colors.textPrimary, marginBottom: 10 },
  notesInput: {
    borderWidth: 1.5, borderColor: colors.border,
    borderRadius: radius.lg, padding: 12,
    fontSize: 13, color: colors.textPrimary,
    lineHeight: 20, minHeight: 100,
    backgroundColor: colors.surfaceAlt,
  },
  scorePill: {
    backgroundColor: colors.greenTint,
    borderWidth: 1.5, borderColor: colors.border,
    borderRadius: radius.pill,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  scorePillText: { fontSize: 14, fontFamily: fonts.extraBold, color: colors.primary },
  cta: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    padding: 16, paddingBottom: 28,
    backgroundColor: colors.surface,
    borderTopWidth: 1, borderTopColor: colors.borderSoft,
    ...shadows.floating,
  },
  ctaSub: { fontSize: 11, color: colors.textMuted, textAlign: 'center', marginTop: 8 },
});
