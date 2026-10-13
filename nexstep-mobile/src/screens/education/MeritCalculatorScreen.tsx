import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { Colors, FontSize, FontWeight, Radius, Spacing } from '../../utils/theme';
import { Card } from '../../components/Card';
import { apiClient } from '../../api/client';
import { fetchProfile } from '../../api/careers';

const FALLBACK_PROGRAMS = ['Computer Science', 'Software Engineering', 'Electrical Engineering', 'MBBS', 'BBA'];

export function MeritCalculatorScreen() {
  const { dark, colors: c } = useTheme();
  const [fscPct, setFscPct] = useState('');
  const [testScore, setTestScore] = useState('');
  const [program, setProgram] = useState('Computer Science');
  const [year, setYear] = useState('2024-25');
  const [cutoffs, setCutoffs] = useState<any[]>([]);
  const [results, setResults] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    apiClient.get('/api/merit-cutoffs').then(({ data }) => setCutoffs(Array.isArray(data?.data) ? data.data : [])).catch(() => {});
    fetchProfile().then((profile) => {
      if (profile?.marks?.fscPct) setFscPct(String(profile.marks.fscPct));
      if (profile?.marks?.entryTestScore) setTestScore(String(profile.marks.entryTestScore));
      if (profile?.targetCareer) setProgram(profile.targetCareer);
    }).catch(() => {});
  }, []);

  const programs = useMemo(() => {
    const names = [...new Set(cutoffs.filter((row) => row.academic_year === year).map((row) => row.program_name))].sort();
    return names.length ? names : FALLBACK_PROGRAMS;
  }, [cutoffs, year]);
  const years = useMemo(() => {
    const list = [...new Set(cutoffs.map((row) => row.academic_year))].sort().reverse();
    return list.length ? list : ['2024-25', '2023-24'];
  }, [cutoffs]);

  useEffect(() => {
    if (!programs.length) return;
    if (programs.includes(program)) return;
    const saved = String(program).trim().toLowerCase();
    const hit = programs.find((item) => item.toLowerCase() === saved || saved.includes(item.toLowerCase()) || item.toLowerCase().includes(saved));
    if (hit) setProgram(hit);
  }, [programs]); // eslint-disable-line react-hooks/exhaustive-deps

  const calculate = async () => {
    if (!fscPct || !testScore) { setError('Enter both your FSc percentage and entry-test score.'); return; }
    setLoading(true);
    setError('');
    try {
      const { data } = await apiClient.post('/api/merit-cutoffs/calculator', {
        fscPct: Number(fscPct), entryTestScore: Number(testScore), programKeyword: program, year,
      });
      setResults(data);
    } catch (err: any) {
      setError(err?.response?.data?.error || 'The calculator could not run.');
    } finally { setLoading(false); }
  };

  const aggregate = fscPct && testScore ? ((Number(fscPct) * 0.5) + (Number(testScore) * 0.5)).toFixed(1) : '';

  return (
    <ScrollView style={{ backgroundColor: c.bg }} contentContainerStyle={styles.content}>
      <Text style={styles.eyebrow}>ADMISSION MERIT</Text>
      <Text style={[styles.title, { color: c.text }]}>Will I get in?</Text>
      <Text style={{ color: c.muted }}>Compare your aggregate with past university merit cut-offs.</Text>

      <Text style={[styles.label, { color: c.text }]}>FSc / Intermediate %</Text>
      <TextInput value={fscPct} onChangeText={setFscPct} keyboardType="decimal-pad" placeholder="e.g. 85.5" placeholderTextColor={c.muted} style={[styles.input, { color: c.text, borderColor: c.border, backgroundColor: c.surface2 }]} />
      <Text style={[styles.label, { color: c.text }]}>Entry test score %</Text>
      <TextInput value={testScore} onChangeText={setTestScore} keyboardType="decimal-pad" placeholder="e.g. 78" placeholderTextColor={c.muted} style={[styles.input, { color: c.text, borderColor: c.border, backgroundColor: c.surface2 }]} />

      <Text style={[styles.label, { color: c.text }]}>Year</Text>
      <View style={styles.chips}>
        {years.map((item) => (
          <TouchableOpacity key={item} onPress={() => setYear(item)} style={[styles.chip, { backgroundColor: year === item ? Colors.primary : c.surface2 }]}>
            <Text style={{ color: year === item ? '#06110d' : c.text, fontWeight: FontWeight.bold, fontSize: FontSize.xs }}>{item}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <Text style={[styles.label, { color: c.text }]}>Programme</Text>
      <View style={styles.chips}>
        {programs.slice(0, 12).map((item) => (
          <TouchableOpacity key={item} onPress={() => setProgram(item)} style={[styles.chip, { backgroundColor: program === item ? Colors.primary : c.surface2 }]}>
            <Text style={{ color: program === item ? '#06110d' : c.text, fontSize: FontSize.xs, fontWeight: FontWeight.bold }}>{item}</Text>
          </TouchableOpacity>
        ))}
      </View>
      {!!aggregate && <Text style={{ color: c.text }}>Your aggregate (50/50): {aggregate}%</Text>}
      {!!error && <Text style={{ color: Colors.danger }}>{error}</Text>}
      <TouchableOpacity onPress={calculate} disabled={loading} style={[styles.button, { backgroundColor: Colors.primary }]}>
        {loading ? <ActivityIndicator color="#06110d" /> : <Text style={styles.buttonText}>Calculate my chances</Text>}
      </TouchableOpacity>

      {results?.results?.map((row: any, index: number) => (
        <Card key={`${row.universityName}-${index}`} dark={dark} style={styles.card}>
          <Text style={[styles.cardTitle, { color: c.text }]}>{row.universityName}</Text>
          <Text style={{ color: c.muted, fontSize: FontSize.xs }}>{row.programName}</Text>
          <Text style={{ color: Colors.primary, fontWeight: FontWeight.bold, marginTop: 6 }}>{String(row.chance || 'Result').split('_').join(' ')}</Text>
          <Text style={{ color: c.text, fontSize: FontSize.sm }}>Your score {row.yourAggregate}% · Cutoff {row.meritCutoff}% · Gap {row.gap}%</Text>
        </Card>
      ))}
      {results && !results.results?.length && <Text style={{ color: c.muted }}>{results.message || 'No cut-offs matched that programme.'}</Text>}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing['2xl'], paddingBottom: 80, gap: Spacing.xs },
  eyebrow: { color: Colors.primary, fontSize: FontSize.xs, letterSpacing: 1.2, fontWeight: FontWeight.extrabold },
  title: { fontSize: FontSize['3xl'], fontWeight: FontWeight.extrabold },
  label: { marginTop: Spacing.sm, fontWeight: FontWeight.bold, fontSize: FontSize.sm },
  input: { borderWidth: 1, borderRadius: Radius.lg, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, fontSize: FontSize.base },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs },
  chip: { paddingHorizontal: Spacing.md, paddingVertical: 8, borderRadius: Radius.lg },
  button: { marginTop: Spacing.md, borderRadius: Radius.xl, padding: Spacing.md, alignItems: 'center' },
  buttonText: { color: '#06110d', fontWeight: FontWeight.bold },
  card: { padding: Spacing.lg, marginTop: Spacing.sm },
  cardTitle: { fontWeight: FontWeight.bold, fontSize: FontSize.base },
});
