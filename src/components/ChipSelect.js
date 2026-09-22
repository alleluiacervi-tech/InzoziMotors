import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TextInput } from 'react-native';
import { colors, radius, fonts } from '../theme';
import Touchable from './Touchable';

// ─────────────────────────────────────────────────────────────────────────────
// A chip picker that does not pretend the list is complete.
//
// The submission form offered ten makes and no way past them, so an owner of a
// Peugeot, a Land Rover, a Suzuki, an Isuzu or a Daihatsu — all ordinary on
// Kigali roads — could not submit their car at all. Not "had a worse
// experience": could not proceed, because the step would not validate without a
// make. Any hardcoded list of real-world things is wrong the day it is written;
// what matters is whether there is a way through it.
//
// `allowOther` adds a chip that reveals a text field. The typed value IS the
// value — it is not stored differently or flagged, because "Peugeot" is not a
// lesser answer than "Toyota". Nothing in the database or the API constrains
// these columns, so this was only ever a limit of the form.
//
// A team member reviews every submission before anything is published, which is
// what catches a typo. That review is the reason free text is safe here.
// ─────────────────────────────────────────────────────────────────────────────

export const OTHER = '__other__';

export default function ChipSelect({
  options,
  selected,
  onSelect,
  allowOther = false,
  otherLabel = 'Other',
  placeholder = 'Type it in',
  autoFocusOther = true,
}) {
  // A value that came from somewhere else — a draft, a prefill — and is not in
  // the list is already an "other" answer, so the field opens showing it rather
  // than appearing to have lost it.
  const isCustom = Boolean(selected) && !options.includes(selected);
  const [othering, setOthering] = useState(isCustom);
  const inputRef = useRef(null);

  useEffect(() => {
    if (isCustom) setOthering(true);
  }, [isCustom]);

  return (
    <View>
      <View style={styles.group}>
        {options.map((opt) => {
          const active = !othering && selected === opt;
          return (
            <Touchable
              key={String(opt)}
              scaleTo={0.94}
              haptic="selection"
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              style={[styles.chip, active && styles.chipActive]}
              onPress={() => { setOthering(false); onSelect(opt); }}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{String(opt)}</Text>
            </Touchable>
          );
        })}

        {allowOther ? (
          <Touchable
            scaleTo={0.94}
            haptic="selection"
            accessibilityRole="button"
            accessibilityState={{ selected: othering }}
            style={[styles.chip, othering && styles.chipActive]}
            onPress={() => {
              // Clearing on the way in matters: leaving the previous chip's
              // value in place would mean tapping "Other" and submitting
              // without typing silently keeps "Toyota".
              if (!othering) onSelect('');
              setOthering(true);
              if (autoFocusOther) setTimeout(() => inputRef.current?.focus(), 50);
            }}
          >
            <Text style={[styles.chipText, othering && styles.chipTextActive]}>{otherLabel}</Text>
          </Touchable>
        ) : null}
      </View>

      {allowOther && othering ? (
        <TextInput
          ref={inputRef}
          style={styles.input}
          value={selected || ''}
          onChangeText={onSelect}
          placeholder={placeholder}
          placeholderTextColor={colors.textMuted}
          autoCapitalize="words"
          autoCorrect={false}
          returnKeyType="done"
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  group: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1.5, borderColor: colors.border,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 13, fontFamily: fonts.semiBold, color: colors.textSecondary },
  chipTextActive: { color: '#fff' },
  input: {
    marginTop: 10,
    backgroundColor: colors.surface,
    borderWidth: 1.5, borderColor: colors.border,
    borderRadius: radius.lg,
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15, fontFamily: fonts.regular, color: colors.text,
  },
});
