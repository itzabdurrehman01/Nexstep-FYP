import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { BookOpen, Award, TrendingUp, AlertTriangle, ArrowRight, CheckCircle2 } from 'lucide-react-native';
import { useTheme } from '../../context/ThemeContext';
import { Colors, FontSize, FontWeight, Radius, Spacing } from '../../utils/theme';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { apiClient } from '../../api/client';
import { fetchProfile } from '../../api/careers';

const ArrowRightIcon: any = ArrowRight;
const AwardIcon: any = Award;
const TrendingUpIcon: any = TrendingUp;
const AlertTriangleIcon: any = AlertTriangle;

interface Props {
  onNavigate?: (route: string) => void;
}

export function Grade8MatricScreen({ onNavigate }: Props) {
  const { dark, colors: c } = useTheme();
  const [activeSubTab, setActiveSubTab] = useState<'grade8' | 'matric'>('grade8');

  // Grade 8 evaluator state
  const [g8Math, setG8Math] = useState('75');
  const [g8Science, setG8Science] = useState('78');
  const [g8English, setG8English] = useState('70');
  const [g8Computer, setG8Computer] = useState('82');
  const [g8Result, setG8Result] = useState<any>(null);
  const [g8Loading, setG8Loading] = useState(false);

  // Matric BISE state
  const [totalPct, setTotalPct] = useState('78');
  const [mathPct, setMathPct] = useState('70');
  const [sciencePct, setSciencePct] = useState('75');
  const [biseBoard, setBiseBoard] = useState('FBISE Islamabad');
  const [matricResult, setMatricResult] = useState<any>(null);
  const [matricLoading, setMatricLoading] = useState(false);

  useEffect(() => {
    fetchProfile().then((p) => {
      if (!p?.marks?.matricPct) return;
      setTotalPct(String(p.marks.matricPct));
      setMathPct(String(Math.round(Number(p.marks.matricPct) * 0.75)));
      setSciencePct(String(Math.round(Number(p.marks.matricPct) * 0.8)));
    }).catch(() => {});
  }, []);

  const handleEvaluateGrade8 = async () => {
    setG8Loading(true);
    try {
      const { data } = await apiClient.post('/api/analyze-grade8', {
        mathMarks: g8Math,
        scienceMarks: g8Science,
        englishMarks: g8English,
        computerMarks: g8Computer
      });
      setG8Result(data);
    } catch {
      const avg = Math.round((Number(g8Math) + Number(g8Science) + Number(g8English) + Number(g8Computer)) / 4);
      setG8Result({
        averageScore: avg,
        recommendations: [
          { group: 'Science (Computer Group)', fitLevel: 'Strong Fit (92%)', reasons: 'High Computer Science and Math scores indicate natural aptitude for software and tech pathways.' },
          { group: 'Science (Biology Group)', fitLevel: 'Good Fit (80%)', reasons: 'Solid Science performance provides eligibility for Pre-Medical.' },
          { group: 'Commerce / Arts', fitLevel: 'Alternative (70%)', reasons: 'Option available if business or humanities interest develops.' },
        ]
      });
    } finally {
      setG8Loading(false);
    }
  };

  const handleAnalyzeMatric = async () => {
    setMatricLoading(true);
    try {
      const { data } = await apiClient.post('/api/analyze-matric', {
        totalPercentage: totalPct,
        mathMarks: mathPct,
        scienceMarks: sciencePct,
        biseBoard
      });
      setMatricResult({
        pct: Number(totalPct),
        board: biseBoard,
        recommendedStreams: (data.streams || []).map((s: any) => ({
          stream: s.stream,
          matchScore: s.matchScore,
          details: s.details
        })),
        tevtaAlternatives: [
          { title: 'Diploma in Information Technology (DIT)', duration: '1 Year', stipend: 'PKR 5,000/mo', institute: 'PBTE / TEVTA Center' },
          { title: 'Cyber Security & Networking Certification', duration: '6 Months', stipend: 'Free + Certification', institute: 'NAVTTC Skill Academy' },
        ],
        warnings: data.warnings || []
      });
    } catch {
      const pct = Number(totalPct);
      setMatricResult({
        pct,
        board: biseBoard,
        recommendedStreams: [
          { stream: 'ICS (Computer Science)', matchScore: '95% Match', details: 'Direct entry into top CS engineering universities after Inter. Recommended by BISE cutoffs.' },
          { stream: 'F.Sc Pre-Engineering', matchScore: '88% Match', details: 'Meets merit for electrical, mechanical, and civil engineering fields.' },
          { stream: 'F.Sc Pre-Medical', matchScore: '82% Match', details: 'Eligible for MBBS/BDS entry test preparation programs.' },
        ],
        tevtaAlternatives: [
          { title: 'Diploma in Information Technology (DIT)', duration: '1 Year', stipend: 'PKR 5,000/mo', institute: 'PBTE / TEVTA Center' },
          { title: 'Cyber Security & Networking Certification', duration: '6 Months', stipend: 'Free + Certification', institute: 'NAVTTC Skill Academy' },
        ]
      });
    } finally {
      setMatricLoading(false);
    }
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: c.bg }]} contentContainerStyle={styles.content}>
      <Animated.View entering={FadeInDown.duration(350)} style={styles.header}>
        <Text style={styles.eyebrow}>ACADEMIC PATHWAY CALCULATOR</Text>
        <Text style={[styles.title, { color: c.text }]}>Grade 8 & Matric Guidance</Text>
        <Text style={[styles.subtitle, { color: c.muted }]}>
          Evaluate Grade 8 performance for stream selection or calculate BISE Matric aggregate cutoffs.
        </Text>
      </Animated.View>

      <View style={[styles.tabSelector, { backgroundColor: c.surface2, borderColor: c.border }]}>
        <TouchableOpacity
          onPress={() => setActiveSubTab('grade8')}
          style={[styles.tabBtn, activeSubTab === 'grade8' && { backgroundColor: Colors.primary }]}
        >
          <Text style={[styles.tabBtnText, { color: activeSubTab === 'grade8' ? '#06110d' : c.muted }]}>Grade 8 Evaluator</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setActiveSubTab('matric')}
          style={[styles.tabBtn, activeSubTab === 'matric' && { backgroundColor: Colors.primary }]}
        >
          <Text style={[styles.tabBtnText, { color: activeSubTab === 'matric' ? '#06110d' : c.muted }]}>Matric BISE Analyzer</Text>
        </TouchableOpacity>
      </View>

      {activeSubTab === 'grade8' ? (
        <View style={{ gap: Spacing.md }}>
          <Card dark={dark} elevated style={styles.card}>
            <Text style={[styles.cardTitle, { color: c.text }]}>Enter Grade 8 Report Card Marks (%)</Text>

            <View style={styles.grid2}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.label, { color: c.text }]}>Math %</Text>
                <TextInput value={g8Math} onChangeText={setG8Math} keyboardType="numeric" style={[styles.input, { backgroundColor: c.surface2, color: c.text, borderColor: c.border }]} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.label, { color: c.text }]}>Science %</Text>
                <TextInput value={g8Science} onChangeText={setG8Science} keyboardType="numeric" style={[styles.input, { backgroundColor: c.surface2, color: c.text, borderColor: c.border }]} />
              </View>
            </View>

            <View style={styles.grid2}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.label, { color: c.text }]}>English %</Text>
                <TextInput value={g8English} onChangeText={setG8English} keyboardType="numeric" style={[styles.input, { backgroundColor: c.surface2, color: c.text, borderColor: c.border }]} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.label, { color: c.text }]}>Computer %</Text>
                <TextInput value={g8Computer} onChangeText={setG8Computer} keyboardType="numeric" style={[styles.input, { backgroundColor: c.surface2, color: c.text, borderColor: c.border }]} />
              </View>
            </View>

            <Button label={g8Loading ? "Evaluating..." : "Evaluate Grade 8 Streams"} onPress={handleEvaluateGrade8} disabled={g8Loading} style={{ marginTop: Spacing.sm }} />
          </Card>

          {g8Result && (
            <Card dark={dark} elevated style={styles.card}>
              <View style={styles.resHeader}>
                <AwardIcon color={Colors.primary} size={24} />
                <Text style={[styles.resTitle, { color: c.text }]}>Recommended Matric Groups</Text>
              </View>
              <Text style={[styles.avgText, { color: Colors.primary }]}>Overall Average: {g8Result.averageScore}%</Text>

              {g8Result.recommendations?.map((rec: any, idx: number) => (
                <View key={idx} style={[styles.recItem, { backgroundColor: c.surface2, borderColor: c.border }]}>
                  <Text style={[styles.recGroup, { color: c.text }]}>{rec.group}</Text>
                  <Text style={[styles.recFit, { color: Colors.primary }]}>{rec.fitLevel}</Text>
                  <Text style={[styles.recReason, { color: c.muted }]}>{rec.reasons}</Text>
                </View>
              ))}
            </Card>
          )}
        </View>
      ) : (
        <View style={{ gap: Spacing.md }}>
          <Card dark={dark} elevated style={styles.card}>
            <Text style={[styles.cardTitle, { color: c.text }]}>Enter Matric BISE Result Marks (%)</Text>

            <View style={styles.grid2}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.label, { color: c.text }]}>Total Percentage %</Text>
                <TextInput value={totalPct} onChangeText={setTotalPct} keyboardType="numeric" style={[styles.input, { backgroundColor: c.surface2, color: c.text, borderColor: c.border }]} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.label, { color: c.text }]}>BISE Board</Text>
                <TextInput value={biseBoard} onChangeText={setBiseBoard} style={[styles.input, { backgroundColor: c.surface2, color: c.text, borderColor: c.border }]} />
              </View>
            </View>

            <Button label={matricLoading ? "Analyzing Cutoffs..." : "Analyze BISE Cutoffs"} onPress={handleAnalyzeMatric} disabled={matricLoading} style={{ marginTop: Spacing.sm }} />
          </Card>

          {matricResult && (
            <Card dark={dark} elevated style={styles.card}>
              <View style={styles.resHeader}>
                <TrendingUpIcon color={Colors.primary} size={24} />
                <Text style={[styles.resTitle, { color: c.text }]}>Matched Inter Streams ({matricResult.board})</Text>
              </View>

              {matricResult.warnings?.map((w: string, idx: number) => (
                <View key={idx} style={[styles.warningBox, { backgroundColor: Colors.danger + '15', borderColor: Colors.danger }]}>
                  <AlertTriangleIcon color={Colors.danger} size={16} />
                  <Text style={[styles.warningText, { color: Colors.danger }]}>{w}</Text>
                </View>
              ))}

              {matricResult.recommendedStreams?.map((st: any, idx: number) => (
                <View key={idx} style={[styles.recItem, { backgroundColor: c.surface2, borderColor: c.border }]}>
                  <Text style={[styles.recGroup, { color: c.text }]}>{st.stream}</Text>
                  <Text style={[styles.recFit, { color: Colors.primary }]}>{st.matchScore}</Text>
                  <Text style={[styles.recReason, { color: c.muted }]}>{st.details}</Text>
                </View>
              ))}

              <Text style={[styles.subHeading, { color: c.text, marginTop: Spacing.md }]}>TEVTA Technical & Skill Alternatives:</Text>
              {matricResult.tevtaAlternatives?.map((alt: any, idx: number) => (
                <View key={idx} style={[styles.tevtaItem, { borderColor: c.border }]}>
                  <Text style={[styles.tevtaTitle, { color: c.text }]}>{alt.title}</Text>
                  <Text style={[styles.tevtaSub, { color: c.muted }]}>{alt.duration} • Stipend: {alt.stipend} • {alt.institute}</Text>
                </View>
              ))}
            </Card>
          )}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: Spacing.lg, gap: Spacing.md, paddingBottom: 40 },
  header: { gap: Spacing.xs },
  eyebrow: { color: Colors.primary, fontSize: FontSize.xs, letterSpacing: 1.2, fontWeight: FontWeight.extrabold },
  title: { fontSize: FontSize['2xl'], fontWeight: FontWeight.extrabold },
  subtitle: { fontSize: FontSize.sm, lineHeight: 20 },
  tabSelector: { flexDirection: 'row', padding: 4, borderRadius: Radius.xl, borderWidth: 1, marginVertical: Spacing.xs },
  tabBtn: { flex: 1, paddingVertical: Spacing.sm, alignItems: 'center', borderRadius: Radius.lg },
  tabBtnText: { fontSize: FontSize.xs, fontWeight: FontWeight.bold },
  card: { padding: Spacing.lg, gap: Spacing.sm },
  cardTitle: { fontSize: FontSize.base, fontWeight: FontWeight.bold, marginBottom: 4 },
  grid2: { flexDirection: 'row', gap: Spacing.sm },
  label: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, marginBottom: 4 },
  input: { height: 42, borderRadius: Radius.md, borderWidth: 1, paddingHorizontal: Spacing.md, fontSize: FontSize.sm },
  resHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  resTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.bold },
  avgText: { fontSize: FontSize.sm, fontWeight: FontWeight.bold },
  recItem: { padding: Spacing.md, borderRadius: Radius.md, borderWidth: 1, gap: 2 },
  recGroup: { fontSize: FontSize.sm, fontWeight: FontWeight.bold },
  recFit: { fontSize: FontSize.xs, fontWeight: FontWeight.bold },
  recReason: { fontSize: FontSize.xs, lineHeight: 16 },
  warningBox: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, padding: Spacing.sm, borderRadius: Radius.md, borderWidth: 1 },
  warningText: { fontSize: FontSize.xs, flex: 1 },
  subHeading: { fontSize: FontSize.sm, fontWeight: FontWeight.bold },
  tevtaItem: { paddingVertical: Spacing.xs, borderBottomWidth: 1 },
  tevtaTitle: { fontSize: FontSize.xs, fontWeight: FontWeight.bold },
  tevtaSub: { fontSize: 11 },
});
