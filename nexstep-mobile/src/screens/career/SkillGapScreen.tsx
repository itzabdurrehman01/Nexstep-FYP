import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Linking, Alert } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useTheme } from '../../context/ThemeContext';
import { Colors, FontSize, FontWeight, Radius, Spacing } from '../../utils/theme';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { fetchCareerMatches } from '../../api/careers';
import { addCareerSkill, fetchCareerGap, fetchProfileSkills, removeCareerSkill, setTargetCareer, takeSkillGapCareer } from '../../api/features';

const LEVELS = ['Beginner', 'Intermediate', 'Advanced'];

export function SkillGapScreen() {
  const { dark, colors: c } = useTheme();
  const [matches, setMatches] = useState<any[]>([]);
  const [careerId, setCareerId] = useState('');
  const [gap, setGap] = useState<any>(null);
  const [skills, setSkills] = useState<any[]>([]);
  const [newSkill, setNewSkill] = useState('');
  const [newLevel, setNewLevel] = useState('Beginner');
  const [loading, setLoading] = useState(true);
  const [gapLoading, setGapLoading] = useState(false);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [limited, setLimited] = useState(false);

  const loadSkills = useCallback(async () => {
    try { setSkills(await fetchProfileSkills()); } catch { setSkills([]); }
  }, []);

  const loadGap = useCallback(async (id: string) => {
    if (!id) return;
    setGapLoading(true);
    try { setGap(await fetchCareerGap(id)); setError(''); }
    catch (e: any) { setGap(null); setError(e?.response?.data?.error || 'Could not load the skill gap.'); }
    finally { setGapLoading(false); }
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const result = await fetchCareerMatches('balanced');
        const rows = result.matches || [];
        setMatches(rows);
        setLimited(Boolean(result.limited));
        const wanted = takeSkillGapCareer();
        const first = rows.find((m: any) => m.id === wanted) || rows[0];
        setCareerId(first?.id || '');
      } catch (e: any) {
        setError(e?.response?.data?.error || 'Could not load careers.');
      } finally { setLoading(false); }
    })();
    void loadSkills();
  }, [loadSkills]);

  useEffect(() => { void loadGap(careerId); }, [careerId, loadGap]);

  const addSkill = async (name: string, level = 'Intermediate') => {
    const n = name.trim();
    if (n.length < 2) return;
    setBusy(n);
    try {
      await addCareerSkill(n, level);
      await loadSkills();
      await loadGap(careerId);
      setNewSkill('');
    } catch (e: any) { setError(e?.response?.data?.error || 'Could not add skill.'); }
    finally { setBusy(''); }
  };

  const removeSkill = async (name: string) => {
    setBusy(name);
    try { await removeCareerSkill(name); await loadSkills(); await loadGap(careerId); }
    catch (e: any) { setError(e?.response?.data?.error || 'Could not remove skill.'); }
    finally { setBusy(''); }
  };

  const setTarget = async () => {
    setBusy('target');
    try { await setTargetCareer(careerId); setGap((g: any) => ({ ...g, isTarget: true })); }
    catch (e: any) { Alert.alert('Target career', e?.response?.data?.error || 'Could not save.'); }
    finally { setBusy(''); }
  };

  if (loading) return <View style={[styles.center, { backgroundColor: c.bg }]}><ActivityIndicator color={Colors.primary} /></View>;

  return (
    <ScrollView style={[styles.container, { backgroundColor: c.bg }]} contentContainerStyle={styles.content}>
      <Animated.View entering={FadeInDown.duration(350)} style={styles.header}>
        <Text style={styles.eyebrow}>SKILL GAP</Text>
        <Text style={[styles.title, { color: c.text }]}>Skill Gap</Text>
        <Text style={[styles.subtitle, { color: c.muted }]}>See which skills a career needs, mark what you already know and plan the rest.</Text>
      </Animated.View>

      {!!error && <Text style={{ color: Colors.danger }}>{error}</Text>}
      {limited && <Text style={[styles.subtitle, { color: c.muted }]}>Free plan: skill gap for your top 3 matches. Upgrade to unlock every career.</Text>}

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
        {matches.map((m) => (
          <TouchableOpacity key={m.id} onPress={() => setCareerId(m.id)} style={[styles.chip, { backgroundColor: careerId === m.id ? Colors.primary : c.surface2 }]}>
            <Text style={[styles.chipText, { color: careerId === m.id ? '#06110d' : c.text }]}>{m.title} · {m.matchScore}%</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {gapLoading && !gap ? <ActivityIndicator color={Colors.primary} /> : gap && (
        <Card dark={dark} elevated style={styles.card}>
          <View style={styles.scoreRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.cardTitle, { color: c.text }]}>Skill readiness</Text>
              <Text style={[styles.scoreDesc, { color: c.muted }]}>How many required skills you already have</Text>
            </View>
            <View style={[styles.scoreCircle, { backgroundColor: Colors.primary + '25' }]}>
              <Text style={[styles.scoreNumber, { color: Colors.primary }]}>{gap.readiness ?? 0}%</Text>
            </View>
          </View>
          <Button title={gap.isTarget ? 'Your target career' : 'Set as my target'} onPress={setTarget} disabled={!!gap.isTarget || busy === 'target'} />

          <Text style={[styles.sectionHeading, { color: Colors.success }]}>You have ({(gap.have || []).length})</Text>
          {(gap.have || []).map((s: string) => (
            <View key={s} style={[styles.skillRow, { backgroundColor: c.surface2 }]}>
              <Text style={[styles.skillName, { color: c.text }]}>{s}</Text>
              <Text style={{ color: Colors.success, fontWeight: FontWeight.bold }}>Have</Text>
            </View>
          ))}
          <Text style={[styles.sectionHeading, { color: Colors.warning }]}>To build ({(gap.missing || []).length})</Text>
          {(gap.missing || []).map((s: string) => (
            <View key={s} style={[styles.skillRow, { backgroundColor: c.surface2 }]}>
              <Text style={[styles.skillName, { color: c.text }]}>{s}</Text>
              <TouchableOpacity onPress={() => addSkill(s)} disabled={!!busy}><Text style={{ color: Colors.primary, fontWeight: FontWeight.bold }}>I have this</Text></TouchableOpacity>
            </View>
          ))}
        </Card>
      )}

      {gap?.learningPlan?.length > 0 && (
        <Card dark={dark} elevated style={styles.card}>
          <Text style={[styles.cardTitle, { color: c.text }]}>Learning plan</Text>
          {gap.learningPlan.map((item: any, i: number) => (
            <View key={item.skill || i} style={{ gap: 6 }}>
              <Text style={[styles.skillName, { color: c.text }]}>{i + 1}. {item.skill}</Text>
              {(item.courses || []).map((course: any) => (
                <TouchableOpacity key={course.id || course.title} onPress={() => course.url && Linking.openURL(course.url)} style={[styles.skillRow, { backgroundColor: c.surface2 }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.skillName, { color: c.text }]}>{course.title}</Text>
                    <Text style={{ color: c.muted, fontSize: FontSize.xs }}>{[course.provider, course.duration, course.pricePkr === 0 ? 'Free' : null].filter(Boolean).join(' · ')}</Text>
                  </View>
                  {!!course.url && <Text style={{ color: Colors.primary }}>Open</Text>}
                </TouchableOpacity>
              ))}
            </View>
          ))}
        </Card>
      )}

      <Card dark={dark} elevated style={styles.card}>
        <Text style={[styles.cardTitle, { color: c.text }]}>My skills</Text>
        <Text style={{ color: c.muted, fontSize: FontSize.xs }}>Saved to your profile and used by Career AI.</Text>
        <TextInput value={newSkill} onChangeText={setNewSkill} placeholder="e.g. Python, Biology" placeholderTextColor={c.muted} style={[styles.input, { color: c.text, borderColor: c.border }]} />
        <View style={styles.chipRow}>
          {LEVELS.map((level) => (
            <TouchableOpacity key={level} onPress={() => setNewLevel(level)} style={[styles.chip, { backgroundColor: newLevel === level ? Colors.primary : c.surface2 }]}>
              <Text style={[styles.chipText, { color: newLevel === level ? '#06110d' : c.text }]}>{level}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <Button title="Add skill" onPress={() => addSkill(newSkill, newLevel)} disabled={newSkill.trim().length < 2} />
        {skills.map((s) => (
          <View key={s.name} style={[styles.skillRow, { backgroundColor: c.surface2 }]}>
            <Text style={[styles.skillName, { color: c.text }]}>{s.name}{s.level ? ` · ${s.level}` : ''}</Text>
            <TouchableOpacity onPress={() => removeSkill(s.name)}><Text style={{ color: Colors.danger }}>Remove</Text></TouchableOpacity>
          </View>
        ))}
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  container: { flex: 1 },
  content: { padding: Spacing['2xl'], paddingBottom: 60, gap: Spacing.lg },
  header: { gap: Spacing.xs },
  eyebrow: { color: Colors.primary, fontSize: FontSize.xs, letterSpacing: 1.2, fontWeight: FontWeight.extrabold },
  title: { fontSize: FontSize['3xl'], fontWeight: FontWeight.extrabold },
  subtitle: { fontSize: FontSize.sm, lineHeight: 20 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs },
  chip: { paddingHorizontal: Spacing.md, paddingVertical: 6, borderRadius: Radius.md },
  chipText: { fontSize: FontSize.xs, fontWeight: FontWeight.bold },
  card: { padding: Spacing.xl, borderRadius: Radius['2xl'], gap: Spacing.sm },
  scoreRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { fontSize: FontSize.base, fontWeight: FontWeight.bold },
  scoreDesc: { fontSize: FontSize.xs },
  scoreCircle: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  scoreNumber: { fontSize: FontSize.lg, fontWeight: FontWeight.extrabold },
  sectionHeading: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, marginTop: Spacing.xs },
  skillRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.md, borderRadius: Radius.lg },
  skillName: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, flex: 1 },
  input: { borderWidth: 1, borderRadius: Radius.md, padding: Spacing.md },
});
