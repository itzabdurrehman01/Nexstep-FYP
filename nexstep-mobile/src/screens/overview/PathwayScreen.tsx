import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { Colors, FontSize, FontWeight, Radius, Spacing } from '../../utils/theme';
import { Card } from '../../components/Card';
import { apiClient } from '../../api/client';
import { fetchProfile } from '../../api/careers';
import { LEVELS } from '../../config/access';
import { labelOf, toolsForLevel } from '../../config/navigation';
import { useLanguage } from '../../context/LanguageContext';

const GUIDES: Record<string, { title: string; summary: string; focus: string[]; options: { title: string; leadsTo: string }[] }> = {
  class8: {
    title: 'Class 8 — choosing your Matric group',
    summary: 'Next year you start Matric. The group you choose decides which Intermediate groups, and later which degrees, stay open.',
    focus: ['Build strong basics in Mathematics, English and Science.', 'Take the interest quiz before you choose a group.', 'Ask which Matric groups your school actually offers.'],
    options: [
      { title: 'Science (Biology)', leadsTo: 'Keeps medical and engineering open after Matric.' },
      { title: 'Science (Computer Science)', leadsTo: 'Pre-Engineering or ICS, then computing and engineering degrees.' },
      { title: 'Humanities / Arts', leadsTo: 'FA or ICom, then social sciences, business, law and media.' },
    ],
  },
  class9: {
    title: 'Class 9 — Matric Part I',
    summary: 'Your Class 9 board result counts towards the final Matric result, and many universities use Matric marks in admission merit.',
    focus: ['Treat the Part I board exam seriously.', 'Start comparing Intermediate groups with your interests and marks.', 'Practise with past papers from your own board.'],
    options: [
      { title: 'FSc Pre-Medical', leadsTo: 'MBBS, BDS, Pharm-D, nursing and biological sciences.' },
      { title: 'FSc Pre-Engineering / ICS', leadsTo: 'Engineering and computer science degrees.' },
      { title: 'ICom or FA', leadsTo: 'Business, accounting, social sciences, media and law.' },
    ],
  },
  class10: {
    title: 'Class 10 — Matric Part II',
    summary: 'After the result you apply to a college, a polytechnic for DAE, or continue to A-Levels.',
    focus: ['Decide your Intermediate group before results, so college applications are ready.', 'Government colleges usually admit on Matric merit.', 'Medical later requires Pre-Medical; engineering normally requires Pre-Engineering.'],
    options: [
      { title: 'Intermediate', leadsTo: 'FSc, ICS, ICom or FA at a college.' },
      { title: 'DAE', leadsTo: 'A 3-year technical diploma, then work or a technology degree.' },
      { title: 'A-Levels', leadsTo: 'The same local options after IBCC equivalence, plus study abroad.' },
    ],
  },
  class11: {
    title: 'Class 11 — Intermediate Part I',
    summary: 'Intermediate is two years. Its result, with Matric and an entry test, decides most university admissions.',
    focus: ['Keep the 1st-year result strong — it is part of the Intermediate total.', 'Shortlist degrees and the entry tests they need.', 'Look at scholarships that open during Intermediate.'],
    options: [
      { title: 'Medical and dental', leadsTo: 'MBBS and BDS through MDCAT. Needs Pre-Medical.' },
      { title: 'Engineering', leadsTo: 'ECAT, NUST NET and university tests. Needs Pre-Engineering.' },
      { title: 'Computing', leadsTo: 'BS Computer Science and related degrees from ICS or Pre-Engineering.' },
    ],
  },
  class12: {
    title: 'Class 12 — Intermediate Part II',
    summary: 'Board exams, entry tests and university applications overlap. Plan the year before registration closes.',
    focus: ['Register for entry tests on time.', 'Keep a shortlist of ambitious, realistic and safe universities.', 'Apply for need-based scholarships with your admission forms.'],
    options: [
      { title: 'University admission', leadsTo: 'Merit usually mixes Matric, Intermediate and an entry test.' },
      { title: 'Skills route', leadsTo: 'Short IT and trade courses alongside or instead of a degree.' },
      { title: 'Study abroad', leadsTo: 'Most countries also ask for an English test such as IELTS.' },
    ],
  },
  dae: {
    title: 'DAE — Diploma of Associate Engineer',
    summary: 'A 3-year technical diploma after Matric, examined by a provincial board of technical education.',
    focus: ['Keep a record of practical work.', 'Look for an apprenticeship in the final year.', 'Check whether a later degree is NTC- or PEC-accredited.'],
    options: [
      { title: 'Associate engineer jobs', leadsTo: 'Technician and sub-engineer roles in industry and construction.' },
      { title: 'B.Tech / BSc technology', leadsTo: 'A 4-year technology degree after DAE.' },
      { title: 'Engineering seats', leadsTo: 'Some universities reserve degree seats for DAE holders.' },
    ],
  },
  university: {
    title: 'University — undergraduate degree',
    summary: 'These years are for skills, an internship and a first job or further study.',
    focus: ['Confirm the programme is HEC-recognised.', 'Complete at least one internship and keep a portfolio.', 'Prepare a resume and practise interviews before the final semester.'],
    options: [
      { title: 'Jobs', leadsTo: 'Graduate roles in the private sector, or government exams such as CSS.' },
      { title: 'MS / MPhil', leadsTo: 'A 16-year degree plus the university’s graduate test.' },
      { title: 'Skills', leadsTo: 'Free programmes such as DigiSkills.pk alongside the degree.' },
    ],
  },
};

export function PathwayScreen({ onNavigate }: { onNavigate?: (route: string) => void }) {
  const { dark, colors: c } = useTheme();
  const { language } = useLanguage();
  const [education, setEducation] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const profile = await fetchProfile();
      setEducation(profile?.education ?? null);
    } catch { setEducation(null); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const saveLevel = async (level: string) => {
    setSaving(true);
    setError('');
    try {
      const { data } = await apiClient.put('/api/education', { level, startedAt: new Date().toISOString().slice(0, 10) });
      setEducation(data?.data ?? { level });
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Could not save your class.');
    } finally { setSaving(false); }
  };

  const guide = education?.level ? GUIDES[education.level] : null;
  const tools = toolsForLevel(education?.level);

  if (loading) return <View style={[styles.center, { backgroundColor: c.bg }]}><ActivityIndicator color={Colors.primary} /></View>;

  return (
    <ScrollView style={{ backgroundColor: c.bg }} contentContainerStyle={styles.content}>
      <Text style={styles.eyebrow}>YOUR CLASS</Text>
      <Text style={[styles.title, { color: c.text }]}>My Pathway</Text>
      <Text style={[styles.summary, { color: c.muted }]}>Guidance matched to your class in the Pakistani education system.</Text>

      <Text style={[styles.label, { color: c.text }]}>Which class are you in?</Text>
      <View style={styles.chips}>
        {LEVELS.map((level) => {
          const on = education?.level === level.id;
          return (
            <TouchableOpacity key={level.id} disabled={saving} onPress={() => saveLevel(level.id)} style={[styles.chip, { backgroundColor: on ? Colors.primary : c.surface2 }]}>
              <Text style={{ color: on ? '#06110d' : c.text, fontWeight: FontWeight.bold, fontSize: FontSize.xs }}>{level.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
      {!!error && <Text style={{ color: Colors.danger }}>{error}</Text>}

      {guide && (
        <Card dark={dark} elevated style={styles.card}>
          <Text style={[styles.cardTitle, { color: c.text }]}>{guide.title}</Text>
          <Text style={[styles.summary, { color: c.muted }]}>{guide.summary}</Text>
          {guide.focus.map((item) => <Text key={item} style={[styles.bullet, { color: c.text }]}>• {item}</Text>)}
          {guide.options.map((option) => (
            <View key={option.title} style={{ marginTop: Spacing.sm }}>
              <Text style={{ color: Colors.primary, fontWeight: FontWeight.bold }}>{option.title}</Text>
              <Text style={{ color: c.muted, fontSize: FontSize.sm }}>{option.leadsTo}</Text>
            </View>
          ))}
        </Card>
      )}

      {tools.length > 0 && (
        <View style={{ gap: Spacing.sm, marginTop: Spacing.md }}>
          <Text style={[styles.label, { color: c.text }]}>{language === 'ur' ? 'آپ کے ٹولز' : 'Tools for your class'}</Text>
          {tools.map((tool) => (
            <TouchableOpacity key={tool.id} onPress={() => onNavigate?.(tool.id)} style={[styles.tool, { backgroundColor: c.surface, borderColor: c.border }]}>
              <Text style={{ color: c.text, fontWeight: FontWeight.bold }}>{labelOf(tool, language)}</Text>
              <Text style={{ color: c.muted, fontSize: FontSize.xs }}>{tool.desc}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: Spacing['2xl'], paddingBottom: 80, gap: Spacing.sm },
  eyebrow: { color: Colors.primary, fontSize: FontSize.xs, letterSpacing: 1.2, fontWeight: FontWeight.extrabold },
  title: { fontSize: FontSize['3xl'], fontWeight: FontWeight.extrabold },
  summary: { fontSize: FontSize.sm, lineHeight: 20 },
  label: { marginTop: Spacing.md, fontWeight: FontWeight.bold },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs },
  chip: { paddingHorizontal: Spacing.md, paddingVertical: 8, borderRadius: Radius.lg },
  card: { padding: Spacing.lg, marginTop: Spacing.md, gap: Spacing.xs },
  cardTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.bold },
  bullet: { fontSize: FontSize.sm, lineHeight: 20 },
  tool: { borderWidth: 1, borderRadius: Radius.lg, padding: Spacing.md, gap: 2 },
});
