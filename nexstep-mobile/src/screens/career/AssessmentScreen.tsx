import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ArrowLeft, CheckCircle2, Sparkles } from 'lucide-react-native';
import { fetchQuizResults, fetchRiasecQuestions, saveQuizResult, updateProfile } from '../../api/careers';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { useLanguage } from '../../context/LanguageContext';
import { useTheme } from '../../context/ThemeContext';
import { Colors, FontSize, FontWeight, Radius, Spacing } from '../../utils/theme';

const ArrowLeftIcon: any = ArrowLeft;
const CheckCircle2Icon: any = CheckCircle2;
const SparklesIcon: any = Sparkles;

const TRAITS: Record<string, { en: string; ur: string; stream: string }> = {
  R: { en: 'Realistic - practical and technical', ur: 'عملی اور تکنیکی', stream: 'DAE / Pre-Engineering / Technical training' },
  I: { en: 'Investigative - scientific and analytical', ur: 'تحقیقی اور سائنسی', stream: 'ICS / Pre-Medical / Pre-Engineering' },
  A: { en: 'Artistic - creative and design-led', ur: 'تخلیقی اور ڈیزائن', stream: 'Arts / ICS / Media and Design' },
  S: { en: 'Social - helping and teaching', ur: 'سماجی اور تدریسی', stream: 'Pre-Medical / Arts / Education' },
  E: { en: 'Enterprising - leadership and business', ur: 'قیادت اور کاروبار', stream: 'ICOM / BBA / Business' },
  C: { en: 'Conventional - structured and financial', ur: 'منظم اور مالیاتی', stream: 'ICOM / ICS / Accounting' },
};

interface Props { onDone: () => void; forceStart?: boolean; }

export function AssessmentScreen({ onDone, forceStart }: Props) {
  const { dark, colors: c } = useTheme();
  const { language, isRtl } = useLanguage();
  const [questions, setQuestions] = useState<any[]>([]);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<{ code: string; scores: Record<string, number> } | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const rows = await fetchQuizResults().catch(() => []);
        if (!alive) return;
        setAttempt(rows.length);
        const last = rows[0];
        const scores = last?.fullScores && typeof last.fullScores === 'object' && !last.fullScores.result
          ? last.fullScores as Record<string, number>
          : last?.fullScores?.result?.riasecPct;
        if (!forceStart && last?.code && scores) {
          setResult({ code: last.code, scores });
          setLoading(false);
          return;
        }
        const qs = await fetchRiasecQuestions(rows.length);
        if (alive) setQuestions(qs);
      } catch {
        if (alive) setQuestions([]);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [forceStart]);

  const startQuiz = async (nextAttempt = attempt) => {
    setLoading(true);
    setResult(null);
    setIndex(0);
    setAnswers({});
    try {
      const qs = await fetchRiasecQuestions(nextAttempt);
      setQuestions(qs);
    } catch {
      setQuestions([]);
    } finally {
      setLoading(false);
    }
  };

  const question = questions[index];
  const progress = questions.length ? Math.round(((index + 1) / questions.length) * 100) : 0;
  const options = useMemo(() => language === 'ur'
    ? [
      { label: 'بالکل متفق نہیں', value: 1 },
      { label: 'متفق نہیں', value: 2 },
      { label: 'یقین نہیں', value: 3 },
      { label: 'متفق', value: 4 },
      { label: 'بالکل متفق', value: 5 },
    ]
    : [
      { label: 'Strongly disagree', value: 1 },
      { label: 'Disagree', value: 2 },
      { label: 'Not sure', value: 3 },
      { label: 'Agree', value: 4 },
      { label: 'Strongly agree', value: 5 },
    ], [language]);

  const answer = async (value: number) => {
    if (!question) return;
    const next = { ...answers, [question.id]: value };
    setAnswers(next);
    if (index < questions.length - 1) { setIndex(index + 1); return; }
    const scores: Record<string, number> = { R: 0, I: 0, A: 0, S: 0, E: 0, C: 0 };
    questions.forEach((item) => { scores[item.category] = (scores[item.category] || 0) + (next[item.id] || 0); });
    const code = Object.entries(scores).sort((a, b) => b[1] - a[1]).map(([category]) => category).slice(0, 3).join('');
    const primary = code.charAt(0) || 'I';
    setSaving(true);
    try {
      await Promise.all([
        saveQuizResult({ code, topTrait: TRAITS[primary].en, streamRecommendation: TRAITS[primary].stream, fullScores: scores }),
        updateProfile({ topRiasecCluster: `${code} - ${code.split('').map((letter) => TRAITS[letter]?.en.split(' - ')[0] || letter).join(', ')}` }),
      ]);
      setAttempt((n) => n + 1);
    } catch { /* The on-device result remains available even when the network is unavailable. */ }
    finally { setSaving(false); setResult({ code, scores }); }
  };

  if (loading) return <View style={[styles.center, { backgroundColor: c.bg }]}><ActivityIndicator color={Colors.primary} size="large" /></View>;
  if (!questions.length) return <View style={[styles.center, { backgroundColor: c.bg }]}><Text style={{ color: c.muted }}>Assessment is unavailable. Please try again.</Text><Button label="Back" onPress={onDone} style={{ marginTop: Spacing.lg }} /></View>;

  if (result) {
    const primary = result.code.charAt(0) || 'I';
    return <View style={[styles.screen, { backgroundColor: c.bg }]}>
      <Card dark={dark} elevated style={styles.resultCard}>
        <View style={[styles.resultIcon, { backgroundColor: Colors.primary + '20' }]}><CheckCircle2Icon size={30} color={Colors.primary} /></View>
        <Text style={[styles.resultTitle, { color: c.text, textAlign: isRtl ? 'right' : 'center' }]}>{language === 'ur' ? 'تشخیص مکمل ہو گئی' : 'Assessment complete'}</Text>
        <Text style={[styles.resultCode, { color: Colors.primary }]}>{result.code}</Text>
        <Text style={[styles.resultBody, { color: c.muted, textAlign: isRtl ? 'right' : 'center' }]}>{language === 'ur' ? TRAITS[primary].ur : TRAITS[primary].en}</Text>
        
        {/* RIASEC 6-Cluster Bar Graph Visualizer */}
        <View style={styles.chartContainer}>
          {Object.entries(result.scores).map(([k, score]) => {
            const pct = Math.min(100, Math.round(score > 25 ? score : (score / 25) * 100));
            return (
              <View key={k} style={styles.chartRow}>
                <Text style={[styles.chartKey, { color: c.text }]}>{k}</Text>
                <View style={[styles.chartTrack, { backgroundColor: c.border }]}>
                  <View style={[styles.chartFill, { width: `${pct}%`, backgroundColor: k === primary ? Colors.primary : Colors.accent }]} />
                </View>
                <Text style={[styles.chartVal, { color: c.muted }]}>{score}</Text>
              </View>
            );
          })}
        </View>

        <Text style={[styles.resultHint, { color: c.muted, textAlign: isRtl ? 'right' : 'center' }]}>{language === 'ur' ? 'تجویز کردہ راستہ: ' : 'Suggested path: '}{TRAITS[primary].stream}</Text>
        {saving ? <ActivityIndicator color={Colors.primary} /> : (
          <View style={{ width: '100%', gap: Spacing.sm }}>
            <Button label={language === 'ur' ? 'کیریئر نتائج دیکھیں' : 'View career matches'} onPress={onDone} />
            <Button variant="outline" label={language === 'ur' ? 'دلچسپی تبدیل کریں — دوبارہ کوئز' : 'Change interest — retake quiz'} onPress={() => startQuiz(attempt + 1)} />
          </View>
        )}
      </Card>
    </View>;
  }

  return <View style={[styles.screen, { backgroundColor: c.bg }]}>
    <View style={styles.header}><TouchableOpacity onPress={onDone} accessibilityLabel="Back"><ArrowLeftIcon color={c.text} size={22} /></TouchableOpacity><Text style={[styles.headerText, { color: c.text }]}>{language === 'ur' ? 'RIASEC تشخیص' : 'RIASEC assessment'}</Text><SparklesIcon color={Colors.primary} size={21} /></View>
    <View style={[styles.progressTrack, { backgroundColor: c.border }]}><View style={[styles.progressFill, { width: `${progress}%` }]} /></View>
    <Text style={[styles.progressText, { color: c.muted }]}>{language === 'ur' ? `سوال ${index + 1} از ${questions.length}` : `Question ${index + 1} of ${questions.length}`}</Text>
    <Card dark={dark} elevated style={styles.questionCard}>
      <Text style={[styles.questionText, { color: c.text, textAlign: isRtl ? 'right' : 'left' }]}>{language === 'ur' ? question.textUr : question.textEn}</Text>
      <View style={styles.options}>{options.map((option) => <TouchableOpacity key={option.value} onPress={() => answer(option.value)} style={[styles.option, { borderColor: c.border, backgroundColor: c.surface2 }]}><Text style={[styles.optionText, { color: c.text, textAlign: isRtl ? 'right' : 'center' }]}>{option.label}</Text></TouchableOpacity>)}</View>
    </Card>
  </View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, padding: Spacing['2xl'] }, center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing['2xl'] },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.xl }, headerText: { fontSize: FontSize.xl, fontWeight: FontWeight.extrabold },
  progressTrack: { height: 7, borderRadius: Radius.full, overflow: 'hidden' }, progressFill: { height: '100%', backgroundColor: Colors.primary, borderRadius: Radius.full }, progressText: { marginTop: Spacing.sm, fontSize: FontSize.sm },
  questionCard: { marginTop: Spacing['2xl'], gap: Spacing['2xl'] }, questionText: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, lineHeight: 30 }, options: { gap: Spacing.sm }, option: { borderWidth: 1, borderRadius: Radius.md, padding: Spacing.lg }, optionText: { fontSize: FontSize.base, fontWeight: FontWeight.semibold },
  resultCard: { marginTop: 'auto', marginBottom: 'auto', alignItems: 'center', gap: Spacing.md, padding: Spacing['2xl'] }, resultIcon: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' }, resultTitle: { fontSize: FontSize['2xl'], fontWeight: FontWeight.extrabold }, resultCode: { fontSize: 42, fontWeight: FontWeight.extrabold, letterSpacing: 3 }, resultBody: { fontSize: FontSize.base, lineHeight: 23 }, resultHint: { fontSize: FontSize.sm, lineHeight: 20 },
  chartContainer: { width: '100%', gap: 6, marginVertical: Spacing.xs },
  chartRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  chartKey: { width: 16, fontSize: FontSize.xs, fontWeight: FontWeight.bold },
  chartTrack: { flex: 1, height: 8, borderRadius: 4, overflow: 'hidden' },
  chartFill: { height: '100%', borderRadius: 4 },
  chartVal: { width: 20, fontSize: FontSize.xs, textAlign: 'right' },
});
