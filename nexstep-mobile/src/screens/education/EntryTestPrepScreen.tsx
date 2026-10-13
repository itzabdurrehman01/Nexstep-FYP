import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { Colors, FontSize, FontWeight, Radius, Spacing } from '../../utils/theme';
import { Card } from '../../components/Card';
import { apiClient } from '../../api/client';

const TESTS = [
  { id: 'MDCAT', label: 'MDCAT', desc: 'Medical and dental admission', subjects: ['Biology', 'Chemistry', 'Physics', 'English'] },
  { id: 'ECAT', label: 'ECAT', desc: 'Engineering college admission', subjects: ['Mathematics', 'Physics', 'Chemistry'] },
  { id: 'NTS-NAT', label: 'NTS-NAT', desc: 'National aptitude test', subjects: ['Quantitative', 'Verbal', 'Analytical'] },
  { id: 'NET', label: 'NUST NET', desc: 'NUST entry test', subjects: ['Mathematics', 'Physics', 'Computer Science'] },
  { id: 'NUMS', label: 'NUMS', desc: 'National University of Medical Sciences', subjects: ['Biology', 'Chemistry', 'Physics'] },
];

type ViewName = 'home' | 'setup' | 'test' | 'result';

export function EntryTestPrepScreen() {
  const { dark, colors: c } = useTheme();
  const [view, setView] = useState<ViewName>('home');
  const [test, setTest] = useState<typeof TESTS[number] | null>(null);
  const [subject, setSubject] = useState('');
  const [questionCount, setQuestionCount] = useState(10);
  const [session, setSession] = useState<any>(null);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [history, setHistory] = useState<any[]>([]);
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [startedAt, setStartedAt] = useState<number>(0);

  useEffect(() => {
    apiClient.get('/api/mock-test/history').then(({ data }) => setHistory(Array.isArray(data?.data) ? data.data : [])).catch(() => {});
  }, [view]);

  const start = async () => {
    if (!test) return;
    setLoading(true);
    setError('');
    try {
      const { data } = await apiClient.post('/api/mock-test/start', {
        testType: test.id, questionCount, ...(subject ? { subject } : {}),
      });
      setSession(data);
      setStartedAt(Date.now());
      setAnswers({});
      setIndex(0);
      setView('test');
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Could not start this practice test.');
    } finally { setLoading(false); }
  };

  const finish = async () => {
    if (!session) return;
    setLoading(true);
    try {
      const payload = session.questions.map((question: any) => ({ questionId: question.id, chosen: answers[question.id] || null }));
      const { data } = await apiClient.post(`/api/mock-test/${session.sessionId}/finish`, { answers: payload, timeTakenSecs: startedAt ? Math.round((Date.now() - startedAt) / 1000) : undefined });
      setResult(data);
      setView('result');
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Could not score this test.');
    } finally { setLoading(false); }
  };

  if (view === 'setup' && test) {
    return (
      <ScrollView style={{ backgroundColor: c.bg }} contentContainerStyle={styles.content}>
        <TouchableOpacity onPress={() => setView('home')}><Text style={{ color: Colors.primary }}>Back</Text></TouchableOpacity>
        <Text style={[styles.title, { color: c.text }]}>{test.label}</Text>
        <Text style={{ color: c.muted }}>{test.desc}</Text>
        <Text style={[styles.label, { color: c.text }]}>Subject</Text>
        <View style={styles.chips}>
          <TouchableOpacity onPress={() => setSubject('')} style={[styles.chip, { backgroundColor: subject === '' ? Colors.primary : c.surface2 }]}>
            <Text style={{ color: subject === '' ? '#06110d' : c.text, fontWeight: FontWeight.bold, fontSize: FontSize.xs }}>Mixed</Text>
          </TouchableOpacity>
          {test.subjects.map((item) => (
            <TouchableOpacity key={item} onPress={() => setSubject(item)} style={[styles.chip, { backgroundColor: subject === item ? Colors.primary : c.surface2 }]}>
              <Text style={{ color: subject === item ? '#06110d' : c.text, fontWeight: FontWeight.bold, fontSize: FontSize.xs }}>{item}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={[styles.label, { color: c.text }]}>Questions: {questionCount}</Text>
        <View style={styles.chips}>
          {[5, 10, 20].map((count) => (
            <TouchableOpacity key={count} onPress={() => setQuestionCount(count)} style={[styles.chip, { backgroundColor: questionCount === count ? Colors.primary : c.surface2 }]}>
              <Text style={{ color: questionCount === count ? '#06110d' : c.text, fontWeight: FontWeight.bold }}>{count}</Text>
            </TouchableOpacity>
          ))}
        </View>
        {!!error && <Text style={{ color: Colors.danger }}>{error}</Text>}
        <TouchableOpacity onPress={start} disabled={loading} style={[styles.button, { backgroundColor: Colors.primary }]}>
          {loading ? <ActivityIndicator color="#06110d" /> : <Text style={styles.buttonText}>Start practice test</Text>}
        </TouchableOpacity>
      </ScrollView>
    );
  }

  if (view === 'test' && session?.questions?.length) {
    const question = session.questions[index];
    const chosen = answers[question.id];
    return (
      <ScrollView style={{ backgroundColor: c.bg }} contentContainerStyle={styles.content}>
        <Text style={{ color: c.muted }}>{index + 1} / {session.questions.length} · {question.subject}</Text>
        <Text style={[styles.question, { color: c.text }]}>{question.question}</Text>
        {Object.entries(question.options || {}).map(([key, value]) => (
          <TouchableOpacity key={key} onPress={() => setAnswers((prev) => ({ ...prev, [question.id]: key }))} style={[styles.option, { borderColor: chosen === key ? Colors.primary : c.border, backgroundColor: chosen === key ? Colors.primary + '22' : c.surface }]}>
            <Text style={{ color: c.text }}>{key}. {String(value)}</Text>
          </TouchableOpacity>
        ))}
        {!!error && <Text style={{ color: Colors.danger }}>{error}</Text>}
        <View style={styles.row}>
          <TouchableOpacity disabled={index === 0} onPress={() => setIndex(index - 1)} style={[styles.button, { backgroundColor: c.surface2, flex: 1 }]}>
            <Text style={{ color: c.text, fontWeight: FontWeight.bold, textAlign: 'center' }}>Previous</Text>
          </TouchableOpacity>
          {index < session.questions.length - 1 ? (
            <TouchableOpacity onPress={() => setIndex(index + 1)} style={[styles.button, { backgroundColor: Colors.primary, flex: 1 }]}>
              <Text style={styles.buttonText}>Next</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={finish} disabled={loading} style={[styles.button, { backgroundColor: Colors.primary, flex: 1 }]}>
              <Text style={styles.buttonText}>{loading ? 'Scoring…' : 'Finish'}</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    );
  }

  if (view === 'result' && result) {
    return (
      <ScrollView style={{ backgroundColor: c.bg }} contentContainerStyle={styles.content}>
        <Text style={[styles.title, { color: c.text }]}>{result.scorePct}%</Text>
        <Text style={{ color: c.muted }}>{result.message}</Text>
        <Text style={{ color: c.text }}>Correct {result.correct} · Incorrect {result.incorrect} · Skipped {result.skipped}</Text>
        <TouchableOpacity onPress={() => { setView('home'); setSession(null); setResult(null); }} style={[styles.button, { backgroundColor: Colors.primary }]}>
          <Text style={styles.buttonText}>Back to tests</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  return (
    <ScrollView style={{ backgroundColor: c.bg }} contentContainerStyle={styles.content}>
      <Text style={styles.eyebrow}>ENTRY TESTS</Text>
      <Text style={[styles.title, { color: c.text }]}>Practice for Pakistan’s entry tests</Text>
      <Text style={{ color: c.muted }}>Timed practice for MDCAT, ECAT, NTS-NAT, NUST NET and NUMS.</Text>
      {TESTS.map((item) => (
        <TouchableOpacity key={item.id} onPress={() => { setTest(item); setSubject(''); setError(''); setView('setup'); }}>
          <Card dark={dark} elevated style={styles.card}>
            <Text style={[styles.cardTitle, { color: c.text }]}>{item.label}</Text>
            <Text style={{ color: c.muted, fontSize: FontSize.sm }}>{item.desc}</Text>
          </Card>
        </TouchableOpacity>
      ))}
      {history.length > 0 && <Text style={[styles.label, { color: c.text }]}>Recent sessions</Text>}
      {history.slice(0, 5).map((sessionRow) => (
        <Text key={sessionRow.id} style={{ color: c.muted }}>{sessionRow.test_type} · {Math.round(Number(sessionRow.score_pct))}% · {sessionRow.total_questions} questions</Text>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing['2xl'], paddingBottom: 80, gap: Spacing.sm },
  eyebrow: { color: Colors.primary, fontSize: FontSize.xs, letterSpacing: 1.2, fontWeight: FontWeight.extrabold },
  title: { fontSize: FontSize['2xl'], fontWeight: FontWeight.extrabold },
  label: { marginTop: Spacing.sm, fontWeight: FontWeight.bold },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs },
  chip: { paddingHorizontal: Spacing.md, paddingVertical: 8, borderRadius: Radius.lg },
  button: { marginTop: Spacing.md, borderRadius: Radius.xl, padding: Spacing.md, alignItems: 'center' },
  buttonText: { color: '#06110d', fontWeight: FontWeight.bold, textAlign: 'center' },
  card: { padding: Spacing.lg },
  cardTitle: { fontWeight: FontWeight.bold, fontSize: FontSize.base },
  question: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, lineHeight: 26 },
  option: { borderWidth: 1, borderRadius: Radius.lg, padding: Spacing.md },
  row: { flexDirection: 'row', gap: Spacing.sm },
});
