import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Compass, CheckCircle2, ArrowRight, BookOpen, GraduationCap, Award, Calculator } from 'lucide-react-native';
import { useTheme } from '../../context/ThemeContext';
import { Colors, FontSize, FontWeight, Radius, Spacing } from '../../utils/theme';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { fetchProfile } from '../../api/careers';
import { normalizeStream } from '../../config/access';

function groupFromStream(stream?: string | null) {
  const s = normalizeStream(stream).toLowerCase();
  if (!s) return null;
  if (s.includes('medical') || s.includes('bio')) return FSC_GROUPS[0];
  if (s.includes('engineer')) return FSC_GROUPS[1];
  if (s.includes('ics') || s.includes('computer')) return FSC_GROUPS[2];
  if (s.includes('icom') || s.includes('commerce')) return FSC_GROUPS[3];
  if (s.includes('fa') || s.includes('human') || s.includes('art')) return FSC_GROUPS[4];
  if (s.includes('a-level') || s.includes('alevel') || s.includes('ibcc')) return FSC_GROUPS[5];
  return null;
}

const FSC_GROUPS = [
  { id: 'pre_med', title: 'F.Sc Pre-Medical', keySubjects: 'Physics, Chemistry, Biology', unis: 'MBBS, BDS, Pharm-D, Biotechnology, Nursing', careers: 'Doctor, Surgeon, Pharmacist, Geneticist' },
  { id: 'pre_eng', title: 'F.Sc Pre-Engineering', keySubjects: 'Physics, Chemistry, Mathematics', unis: 'BS Electrical, Mechanical, Civil, Mechatronics, CS', careers: 'Engineer, Architect, Product Designer' },
  { id: 'ics', title: 'ICS (Computer Science)', keySubjects: 'Physics/Stats, Computer Science, Math', unis: 'BS Software Engineering, Computer Science, AI, Data Science', careers: 'Software Developer, AI Engineer, Cyber Analyst' },
  { id: 'icom', title: 'I.Com (Commerce)', keySubjects: 'Accounting, Economics, Commerce, Math', unis: 'BBA, BS Accounting & Finance, CA, ACCA', careers: 'Chartered Accountant, Financial Analyst, Auditor' },
  { id: 'fa', title: 'FA / Humanities', keySubjects: 'Civics, Fine Arts, Psychology, Economics', unis: 'LLB (Law), International Relations, Media Studies, English', careers: 'Advocate, Journalist, Diplomat, Graphic Designer' },
  { id: 'alevels', title: 'A-Levels / IBCC Equivalence', keySubjects: 'Custom 3 Major Subjects (Math/Physics/Bio/Chem)', unis: 'Pakistani & Foreign University Admissions', careers: 'Global Professional Pathways' },
];

const A_LEVEL_GRADES: Record<string, number> = {
  'A*': 90,
  'A': 85,
  'B': 75,
  'C': 65,
  'D': 55,
  'E': 45
};

export function FscMapperScreen({ onNavigate }: Props) {
  const { dark, colors: c } = useTheme();
  const [selectedStream, setSelectedStream] = useState(FSC_GROUPS[2]); // Default ICS
  const [fscPct, setFscPct] = useState('76');
  const [entryScore, setEntryScore] = useState('145');
  const [calcResult, setCalcResult] = useState<any>(null);

  useEffect(() => {
    fetchProfile().then((p) => {
      if (!p) return;
      const group = groupFromStream(p.preferredStream || p.education?.stream);
      if (group) setSelectedStream(group);
      if (p.marks?.fscPct) setFscPct(String(p.marks.fscPct));
      if (p.marks?.entryTestScore) setEntryScore(String(p.marks.entryTestScore));
    }).catch(() => {});
  }, []);

  // IBCC A-Level Equivalence State
  const [sub1Grade, setSub1Grade] = useState('A*');
  const [sub2Grade, setSub2Grade] = useState('A');
  const [sub3Grade, setSub3Grade] = useState('B');
  const [ibccResult, setIbccResult] = useState<any>(null);

  const handleCalculateMerit = () => {
    const fsc = Number(fscPct);
    const test = Number(entryScore);
    const agg = Math.round((fsc * 0.5) + ((test / 200) * 100 * 0.5));
    setCalcResult({
      aggregatePct: agg,
      eligibleUnis: [
        { name: 'NUST Islamabad', program: 'BS Computer Science', status: agg >= 78 ? 'Safe (78%+ Cutoff)' : 'Borderline' },
        { name: 'FAST-NUCES Lahore', program: 'BS Software Engineering', status: agg >= 74 ? 'Safe (74%+ Cutoff)' : 'Reach' },
        { name: 'COMSATS Islamabad', program: 'BS AI & Data Science', status: agg >= 70 ? 'Safe (70%+ Cutoff)' : 'Reach' },
        { name: 'UET Lahore', program: 'BS Computer Engineering', status: agg >= 72 ? 'Safe (72%+ Cutoff)' : 'Reach' },
      ]
    });
  };

  const handleCalculateIBCC = () => {
    const m1 = A_LEVEL_GRADES[sub1Grade] || 75;
    const m2 = A_LEVEL_GRADES[sub2Grade] || 75;
    const m3 = A_LEVEL_GRADES[sub3Grade] || 75;
    const avgPct = Math.round((m1 + m2 + m3) / 3);
    const totalMarks = Math.round((avgPct / 100) * 1100);

    setIbccResult({
      avgPct,
      totalMarks,
      equivalenceCategory: totalMarks >= 880 ? 'Pre-Engineering / Pre-Medical Safe (80%+ Equivalence)' : 'General Science Safe',
    });
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: c.bg }]} contentContainerStyle={styles.content}>
      <Animated.View entering={FadeInDown.duration(350)} style={styles.header}>
        <Text style={styles.eyebrow}>INTERMEDIATE & HIGHER SECONDARY</Text>
        <Text style={[styles.title, { color: c.text }]}>F.Sc & IBCC Pathway Mapper</Text>
        <Text style={[styles.subtitle, { color: c.muted }]}>
          Explore F.Sc subject combinations, calculate university aggregate cutoffs, and convert Cambridge A-Level grades to official IBCC marks.
        </Text>
      </Animated.View>

      {/* Stream Selector Horizontal Scroll */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.streamRow}>
        {FSC_GROUPS.map((grp) => (
          <TouchableOpacity
            key={grp.id}
            onPress={() => setSelectedStream(grp)}
            style={[
              styles.streamCard,
              {
                backgroundColor: selectedStream.id === grp.id ? Colors.primary : c.surface,
                borderColor: selectedStream.id === grp.id ? Colors.primary : c.border
              }
            ]}
          >
            <Text style={[styles.streamTitle, { color: selectedStream.id === grp.id ? '#06110d' : c.text }]}>
              {grp.title}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Stream Detail Card */}
      <Card dark={dark} elevated style={styles.card}>
        <Text style={[styles.detailHeading, { color: c.text }]}>{selectedStream.title}</Text>
        <View style={styles.detailRow}>
          <Text style={[styles.detailLabel, { color: c.muted }]}>Core Subjects:</Text>
          <Text style={[styles.detailVal, { color: c.text }]}>{selectedStream.keySubjects}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={[styles.detailLabel, { color: c.muted }]}>Eligible Degrees:</Text>
          <Text style={[styles.detailVal, { color: Colors.primary, fontWeight: FontWeight.bold }]}>{selectedStream.unis}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={[styles.detailLabel, { color: c.muted }]}>Top Careers:</Text>
          <Text style={[styles.detailVal, { color: c.text }]}>{selectedStream.careers}</Text>
        </View>
      </Card>

      {/* IBCC Cambridge A-Level Equivalence Calculator */}
      <Card dark={dark} elevated style={styles.card}>
        <View style={styles.ibccHeader}>
          <Text style={[styles.detailHeading, { color: c.text }]}>Cambridge A-Level IBCC Equivalence</Text>
          <Text style={styles.ibccBadge}>Official IBCC Formula</Text>
        </View>

        <Text style={[styles.label, { color: c.muted }]}>Select A-Level Subject Grades:</Text>

        <View style={styles.grid3}>
          {[{ label: 'Subject 1', val: sub1Grade, set: setSub1Grade }, { label: 'Subject 2', val: sub2Grade, set: setSub2Grade }, { label: 'Subject 3', val: sub3Grade, set: setSub3Grade }].map((item, idx) => (
            <View key={idx} style={{ flex: 1 }}>
              <Text style={[styles.label, { color: c.text }]}>{item.label}</Text>
              <View style={styles.chipRow}>
                {['A*', 'A', 'B', 'C'].map((g) => (
                  <TouchableOpacity key={g} onPress={() => item.set(g)} style={[styles.chip, { backgroundColor: item.val === g ? Colors.accent : c.surface2 }]}>
                    <Text style={[styles.chipText, { color: item.val === g ? '#fff' : c.text }]}>{g}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ))}
        </View>

        <Button title="Calculate Certified IBCC Equivalence Marks" onPress={handleCalculateIBCC} variant="secondary" style={{ marginTop: Spacing.xs }} />

        {ibccResult && (
          <View style={[styles.resultBox, { backgroundColor: c.surface2 }]}>
            <View style={styles.resultHeader}>
              <Text style={[styles.resultTitle, { color: c.text }]}>Converted IBCC Marks</Text>
              <Text style={styles.aggBadge}>{ibccResult.totalMarks} / 1100 ({ibccResult.avgPct}%)</Text>
            </View>
            <Text style={[styles.ibccCatText, { color: Colors.primary }]}>{ibccResult.equivalenceCategory}</Text>
          </View>
        )}
      </Card>

      {/* Aggregate Cutoff Calculator */}
      <Card dark={dark} elevated style={styles.card}>
        <Text style={[styles.detailHeading, { color: c.text }]}>University Aggregate Estimator</Text>

        <View style={styles.grid2}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.label, { color: c.text }]}>F.Sc / Inter Marks %</Text>
            <TextInput value={fscPct} onChangeText={setFscPct} keyboardType="numeric" style={[styles.input, { backgroundColor: c.surface2, color: c.text, borderColor: c.border }]} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.label, { color: c.text }]}>ECAT / NET / NTS (out of 200)</Text>
            <TextInput value={entryScore} onChangeText={setEntryScore} keyboardType="numeric" style={[styles.input, { backgroundColor: c.surface2, color: c.text, borderColor: c.border }]} />
          </View>
        </View>

        <Button title="Calculate University Aggregate" onPress={handleCalculateMerit} style={{ marginTop: Spacing.sm }} />

        {calcResult && (
          <View style={styles.resultBox}>
            <View style={styles.resultHeader}>
              <Text style={[styles.resultTitle, { color: c.text }]}>Estimated Merit Aggregate</Text>
              <Text style={styles.aggBadge}>{calcResult.aggregatePct}%</Text>
            </View>
            {calcResult.eligibleUnis.map((u: any, i: number) => (
              <View key={i} style={[styles.uniRow, { backgroundColor: c.surface2 }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.uniName, { color: c.text }]}>{u.name}</Text>
                  <Text style={[styles.uniProg, { color: c.muted }]}>{u.program}</Text>
                </View>
                <Text style={styles.uniStatus}>{u.status}</Text>
              </View>
            ))}
          </View>
        )}
      </Card>
    </ScrollView>
  );
}

interface Props {
  onNavigate?: (route: string) => void;
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: Spacing['2xl'], paddingBottom: 60, gap: Spacing.lg },
  header: { gap: Spacing.xs },
  eyebrow: { color: Colors.primary, fontSize: FontSize.xs, letterSpacing: 1.2, fontWeight: FontWeight.extrabold },
  title: { fontSize: FontSize['3xl'], fontWeight: FontWeight.extrabold },
  subtitle: { fontSize: FontSize.sm, lineHeight: 20 },
  streamRow: { gap: Spacing.sm, paddingRight: Spacing.md },
  streamCard: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, borderRadius: Radius.xl, borderWidth: 1 },
  streamTitle: { fontSize: FontSize.xs, fontWeight: FontWeight.extrabold },
  card: { padding: Spacing.xl, borderRadius: Radius['2xl'], gap: Spacing.sm },
  detailHeading: { fontSize: FontSize.lg, fontWeight: FontWeight.extrabold },
  detailRow: { gap: 2 },
  detailLabel: { fontSize: FontSize.xs, fontWeight: FontWeight.bold },
  detailVal: { fontSize: FontSize.sm },
  ibccHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  ibccBadge: { backgroundColor: Colors.accent + '20', color: Colors.accent, fontSize: FontSize.xs, fontWeight: FontWeight.extrabold, paddingHorizontal: Spacing.sm, paddingVertical: 2, borderRadius: Radius.md },
  grid2: { flexDirection: 'row', gap: Spacing.md },
  grid3: { gap: Spacing.sm, marginTop: Spacing.xs },
  label: { fontSize: FontSize.xs, fontWeight: FontWeight.bold },
  input: { borderWidth: 1, borderRadius: Radius.lg, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, fontSize: FontSize.sm, marginTop: 4 },
  chipRow: { flexDirection: 'row', gap: 4, marginTop: 2 },
  chip: { paddingHorizontal: Spacing.sm, paddingVertical: 4, borderRadius: Radius.md },
  chipText: { fontSize: FontSize.xs, fontWeight: FontWeight.bold },
  resultBox: { padding: Spacing.md, borderRadius: Radius.lg, gap: Spacing.xs, marginTop: Spacing.sm },
  resultHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  resultTitle: { fontSize: FontSize.sm, fontWeight: FontWeight.bold },
  aggBadge: { backgroundColor: Colors.primary, color: '#06110d', fontSize: FontSize.xs, fontWeight: FontWeight.extrabold, paddingHorizontal: Spacing.md, paddingVertical: 4, borderRadius: Radius.full },
  ibccCatText: { fontSize: FontSize.xs, fontWeight: FontWeight.bold },
  uniRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.md, borderRadius: Radius.lg },
  uniName: { fontSize: FontSize.sm, fontWeight: FontWeight.bold },
  uniProg: { fontSize: FontSize.xs },
  uniStatus: { fontSize: FontSize.xs, color: Colors.primary, fontWeight: FontWeight.extrabold },
});
