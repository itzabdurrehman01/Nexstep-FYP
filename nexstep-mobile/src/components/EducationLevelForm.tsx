import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Text, TextInput, TouchableOpacity, View, StyleSheet } from 'react-native';
import { LEVELS, LEVEL_BY_ID, streamsForLevel, normalizeStream, type EducationLevel } from '../config/access';
import { saveEducation, updateProfile, fetchProfile } from '../api/careers';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { Colors, FontSize, FontWeight, Radius, Spacing } from '../utils/theme';

const NEXT: Record<string, EducationLevel | null> = {
  class8: 'class9', class9: 'class10', class10: 'class11', class11: 'class12',
  class12: 'university', dae: 'university', university: null,
};

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

interface Props {
  initialLevel?: string | null;
  initialStream?: string | null;
  initialInstitution?: string | null;
  submitLabel?: string;
  onSaved: (level: string, extras?: { stream?: string; institution?: string }) => void;
}

export function EducationLevelForm({ initialLevel, initialStream, initialInstitution, submitLabel, onSaved }: Props) {
  const { colors: c } = useTheme();
  const { language } = useLanguage();
  const isUr = language === 'ur';
  const [level, setLevel] = useState(initialLevel || '');
  const [stream, setStream] = useState(normalizeStream(initialStream) || initialStream || '');
  const [institution, setInstitution] = useState(initialInstitution || '');
  const [matricPct, setMatricPct] = useState('');
  const [fscPct, setFscPct] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!level && initialLevel) setLevel(initialLevel);
    if (!stream && initialStream) setStream(normalizeStream(initialStream) || initialStream);
    if (!institution && initialInstitution) setInstitution(initialInstitution);
  }, [initialLevel, initialStream, initialInstitution]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchProfile().then((p) => {
      if (!p) return;
      if (!level && p.education?.level) setLevel(p.education.level);
      const savedStream = normalizeStream(p.preferredStream || p.education?.stream || '');
      if (!stream && savedStream) setStream(savedStream);
      if (!institution && (p.institution || p.education?.institution)) setInstitution(p.institution || p.education?.institution || '');
      if (!matricPct && p.marks?.matricPct) setMatricPct(String(p.marks.matricPct));
      if (!fscPct && p.marks?.fscPct) setFscPct(String(p.marks.fscPct));
    }).catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const info = LEVEL_BY_ID[level];
  const streams = streamsForLevel(level);
  const needsMatric = Boolean(level);
  const needsFsc = ['class11', 'class12', 'university'].includes(level);
  const canSave = Boolean(level && (!streams.length || stream) && institution.trim() && (!needsMatric || Number(matricPct) > 0) && (!needsFsc || Number(fscPct) > 0));

  const pickLevel = (id: string) => {
    setLevel(id);
    if (!LEVEL_BY_ID[id]?.streams.includes(normalizeStream(stream) || stream)) setStream('');
    setError('');
  };

  const save = async () => {
    if (!canSave) return;
    setBusy(true);
    setError('');
    try {
      await saveEducation({
        level,
        stream: normalizeStream(stream) || stream || null,
        institution: institution.trim() || null,
        startedAt: todayIso(),
        promotionDate: null,
        marks: { matricPct: Number(matricPct) || 0, fscPct: Number(fscPct) || 0 },
      });
      await updateProfile({
        preferredStream: normalizeStream(stream) || stream || undefined,
        institution: institution.trim() || undefined,
        gradeLevel: info?.label || level,
      }).catch(() => {});
      Alert.alert(
        isUr ? 'ڈیٹا محفوظ ہو گیا' : 'Data updated and saved',
        isUr ? 'آپ کی جماعت، گروپ اور ادارہ محفوظ ہو گئے ہیں۔' : 'Your class, stream and institute have been saved. They will stay selected when you come back.',
        [{ text: isUr ? 'آگے بڑھیں' : 'Continue', onPress: () => onSaved(level, { stream: stream || undefined, institution: institution.trim() || undefined }) }],
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : (isUr ? 'محفوظ نہیں ہو سکا۔' : 'Could not save.');
      setError(message);
      Alert.alert(isUr ? 'محفوظ نہیں ہوا' : 'Could not save', message);
    } finally {
      setBusy(false);
    }
  };

  const next = level ? NEXT[level] : null;
  const nextLabel = next ? (isUr ? LEVEL_BY_ID[next]?.labelUr : LEVEL_BY_ID[next]?.label) : '';

  const tiles = useMemo(() => LEVELS, []);

  return (
    <View style={styles.wrap}>
      <Text style={[styles.legend, { color: c.text }]}>{isUr ? 'آپ کس جماعت میں ہیں؟' : 'Which class are you in?'}</Text>
      <View style={styles.grid}>
        {tiles.map((item) => {
          const active = level === item.id;
          return (
            <TouchableOpacity
              key={item.id}
              onPress={() => pickLevel(item.id)}
              style={[styles.tile, { borderColor: active ? Colors.primary : c.border, backgroundColor: active ? Colors.primary + '14' : c.surface }]}
            >
              <Text style={[styles.tileTitle, { color: c.text }]}>{isUr ? item.labelUr : item.label}</Text>
              <Text style={[styles.tileSub, { color: c.muted }]}>{item.sub}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {level && streams.length > 0 && (
        <View style={{ gap: Spacing.sm }}>
          <Text style={[styles.legend, { color: c.text }]}>{isUr ? 'آپ کا گروپ' : 'Your group / stream'}</Text>
          <View style={styles.chipRow}>
            {streams.map((item) => {
              const active = (normalizeStream(stream) || stream) === item;
              return (
                <TouchableOpacity
                  key={item}
                  onPress={() => setStream(item)}
                  style={[styles.chip, { backgroundColor: active ? Colors.primary : c.surface2, borderColor: active ? Colors.primary : c.border }]}
                >
                  <Text style={[styles.chipText, { color: active ? '#ffffff' : c.text }]}>{item}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      )}

      {level ? (
        <View style={{ gap: Spacing.sm }}>
          <Text style={[styles.legend, { color: c.text }]}>{isUr ? 'اسکول / کالج / یونیورسٹی' : 'School / college / university'}</Text>
          <TextInput
            value={institution}
            onChangeText={setInstitution}
            placeholder={isUr ? 'ادارے کا نام' : 'e.g. Government College Lahore'}
            placeholderTextColor={c.muted}
            style={[styles.input, { color: c.text, borderColor: c.border, backgroundColor: c.surface }]}
          />
        </View>
      ) : null}

      {level ? (
        <View style={{ gap: Spacing.sm }}>
          <Text style={[styles.legend, { color: c.text }]}>{isUr ? 'بنیادی نمبر / فیصد' : 'Your latest marks / %'}</Text>
          <TextInput
            value={matricPct}
            onChangeText={setMatricPct}
            keyboardType="numeric"
            placeholder={['class8', 'class9'].includes(level) ? (isUr ? 'آخری امتحان %' : 'Last exam %') : (isUr ? 'میٹرک %' : 'Matric / O-Level %')}
            placeholderTextColor={c.muted}
            style={[styles.input, { color: c.text, borderColor: c.border, backgroundColor: c.surface }]}
          />
          {needsFsc ? (
            <TextInput
              value={fscPct}
              onChangeText={setFscPct}
              keyboardType="numeric"
              placeholder={isUr ? 'ایف ایس سی / انٹر %' : 'FSc / Inter %'}
              placeholderTextColor={c.muted}
              style={[styles.input, { color: c.text, borderColor: c.border, backgroundColor: c.surface }]}
            />
          ) : null}
        </View>
      ) : null}

      {level && next && nextLabel ? (
        <Text style={[styles.hint, { color: c.muted }]}>
          {isUr ? `اگلی جماعت: ${nextLabel}` : `You will move to ${nextLabel} after this class.`}
        </Text>
      ) : null}

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <TouchableOpacity
        onPress={save}
        disabled={!canSave || busy}
        style={[styles.save, { opacity: !canSave || busy ? 0.5 : 1 }]}
      >
        {busy ? <ActivityIndicator color="#fff" /> : (
          <Text style={styles.saveText}>{submitLabel || (isUr ? 'آگے بڑھیں' : 'Continue')}</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: Spacing.lg },
  legend: { fontSize: FontSize.sm, fontWeight: FontWeight.bold },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  tile: { width: '48%', minHeight: 78, borderWidth: 1, borderRadius: Radius.lg, padding: Spacing.md, gap: 4 },
  tileTitle: { fontSize: FontSize.sm, fontWeight: FontWeight.bold },
  tileSub: { fontSize: FontSize.xs },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs },
  chip: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: Radius.md, borderWidth: 1 },
  chipText: { fontSize: FontSize.xs, fontWeight: FontWeight.bold },
  hint: { fontSize: FontSize.sm },
  error: { color: Colors.danger, fontSize: FontSize.sm },
  save: { height: 48, borderRadius: Radius.lg, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  saveText: { color: '#fff', fontWeight: FontWeight.bold, fontSize: FontSize.sm },
  input: { height: 46, borderWidth: 1, borderRadius: Radius.md, paddingHorizontal: Spacing.md, fontSize: FontSize.sm },
});
