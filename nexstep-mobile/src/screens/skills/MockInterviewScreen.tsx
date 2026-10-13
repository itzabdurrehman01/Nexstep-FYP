import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Mic, Send, Sparkles, Award, CheckCircle2, RefreshCw } from 'lucide-react-native';
import { useTheme } from '../../context/ThemeContext';
import { Colors, FontSize, FontWeight, Radius, Spacing } from '../../utils/theme';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { FeatureGate } from '../../components/FeatureGate';
import { evaluateInterview, fetchMockInterviewHistory, fetchProfile } from '../../api/careers';
import { createMockInterview, fetchMyMentors, submitMockInterview } from '../../api/features';

const RefreshCwIcon: any = RefreshCw;
const AwardIcon: any = Award;

const INTERVIEW_QUESTIONS = [
  'Can you explain the difference between state and props in React Native?',
  'How do you optimize SQL database query performance for large tables?',
  'Describe a challenging project you worked on and how you handled technical trade-offs.',
  'What is the event loop in JavaScript and how does asynchronous execution work?',
];

export function MockInterviewScreen() {
  const { dark, colors: c } = useTheme();
  const [qIndex, setQIndex] = useState(0);
  const [userAnswer, setUserAnswer] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [answers, setAnswers] = useState<{ question: string; transcript: string }[]>([]);

  React.useEffect(() => {
    fetchMockInterviewHistory().then(setHistory).catch(() => {});
  }, []);

  const handleSubmitAnswer = async () => {
    if (!userAnswer.trim()) {
      Alert.alert('Empty Answer', 'Please type or record your interview response.');
      return;
    }
    setIsSubmitting(true);
    try {
      const profile = await fetchProfile().catch(() => null);
      const result = await evaluateInterview({
        question: INTERVIEW_QUESTIONS[qIndex],
        answer: userAnswer.trim(),
        category: 'Career and technical interview',
        difficulty: 'Medium',
        profile,
      });
      const nextAnswers = [...answers, { question: INTERVIEW_QUESTIONS[qIndex], transcript: userAnswer.trim() }];
      setAnswers(nextAnswers);
      setFeedback({
        score: `${result.score ?? 0}%`,
        clarityScore: `${result.clarity ?? 0}%`,
        technicalAccuracy: `${result.relevance ?? 0}%`,
        strengths: Array.isArray(result.strengths) ? result.strengths.join(' • ') : result.feedback,
        improvements: Array.isArray(result.weaknesses) ? result.weaknesses.join(' • ') : result.improvedAnswer,
      });
      if (nextAnswers.length >= 2) {
        const mentors = await fetchMyMentors().catch(() => []);
        if (mentors[0]?.id) {
          const saved = await createMockInterview({ mentorId: mentors[0].id, category: 'Career and technical interview', answers: nextAnswers }).catch(() => null);
          if (saved?.id) await submitMockInterview(saved.id).catch(() => {});
          fetchMockInterviewHistory().then(setHistory).catch(() => {});
        }
      }
    } catch (error: any) {
      Alert.alert('Evaluation unavailable', error?.response?.data?.error ?? 'Please check your connection and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNextQuestion = () => {
    setFeedback(null);
    setUserAnswer('');
    setQIndex((prev) => (prev + 1) % INTERVIEW_QUESTIONS.length);
  };

  return (
    <FeatureGate
      requiredPlan="pro"
      featureName="AI Mock Interview Simulator"
      featureDesc="Practice live interviews with real-time AI evaluation, scoring, and custom feedback."
    >
      <ScrollView style={[styles.container, { backgroundColor: c.bg }]} contentContainerStyle={styles.content}>
        <Animated.View entering={FadeInDown.duration(350)} style={styles.header}>
          <Text style={styles.eyebrow}>AI INTERVIEW SIMULATOR</Text>
          <Text style={[styles.title, { color: c.text }]}>Mock Interview AI</Text>
          <Text style={[styles.subtitle, { color: c.muted }]}>
            Practice software, medical, or engineering interview questions with instant AI scoring.
          </Text>
        </Animated.View>

        <Card dark={dark} elevated style={styles.card}>
          <Text style={[styles.qBadge, { color: Colors.primary }]}>QUESTION {qIndex + 1} OF {INTERVIEW_QUESTIONS.length}</Text>
          <Text style={[styles.qText, { color: c.text }]}>{INTERVIEW_QUESTIONS[qIndex]}</Text>

          <Text style={[styles.label, { color: c.text, marginTop: Spacing.sm }]}>Your Answer Response:</Text>
          <TextInput
            value={userAnswer}
            onChangeText={setUserAnswer}
            placeholder="Type your response here..."
            placeholderTextColor={c.muted}
            multiline
            numberOfLines={4}
            style={[styles.input, { backgroundColor: c.surface2, color: c.text, borderColor: c.border }]}
          />

          <View style={styles.btnRow}>
            <Button
              title={isSubmitting ? "Evaluating..." : "Submit Answer"}
              onPress={handleSubmitAnswer}
              disabled={isSubmitting}
              style={{ flex: 1 }}
            />
            <TouchableOpacity onPress={handleNextQuestion} style={[styles.nextBtn, { backgroundColor: c.surface2, borderColor: c.border }]}>
              <RefreshCwIcon size={18} color={c.text} />
            </TouchableOpacity>
          </View>
        </Card>

        {feedback && (
          <Card dark={dark} elevated style={styles.card}>
            <View style={styles.feedbackHeader}>
              <AwardIcon color={Colors.primary} size={24} />
              <Text style={[styles.feedbackTitle, { color: c.text }]}>AI Evaluation Feedback</Text>
            </View>
            <Text style={[styles.scoreText, { color: Colors.primary }]}>Overall Match Score: {feedback.score}</Text>

            <View style={styles.btnRow}>
              <View style={[styles.metricChip, { backgroundColor: c.surface2 }]}>
                <Text style={[styles.label, { color: c.muted }]}>Clarity</Text>
                <Text style={[styles.qText, { color: c.text }]}>{feedback.clarityScore}</Text>
              </View>
              <View style={[styles.metricChip, { backgroundColor: c.surface2 }]}>
                <Text style={[styles.label, { color: c.muted }]}>Technical</Text>
                <Text style={[styles.qText, { color: c.text }]}>{feedback.technicalAccuracy}</Text>
              </View>
            </View>

            <Text style={[styles.label, { color: c.text, marginTop: 4 }]}>Strengths:</Text>
            <Text style={[styles.fbRow, { color: c.muted }]}>{feedback.strengths}</Text>

            <Text style={[styles.label, { color: c.text, marginTop: 4 }]}>Areas for Improvement:</Text>
            <Text style={[styles.fbRow, { color: c.muted }]}>{feedback.improvements}</Text>
            
            <Button title="Next Interview Question" onPress={handleNextQuestion} variant="secondary" />
          </Card>
        )}
        {history.length > 0 && (
          <Card dark={dark} elevated style={styles.card}>
            <Text style={[styles.feedbackTitle, { color: c.text }]}>Saved interviews</Text>
            {history.map((h) => (
              <Text key={h.id} style={{ color: c.muted }}>{h.category || 'Interview'} · {h.status || 'submitted'}</Text>
            ))}
          </Card>
        )}
      </ScrollView>
    </FeatureGate>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: Spacing['2xl'], paddingBottom: 60, gap: Spacing.lg },
  header: { gap: Spacing.xs },
  eyebrow: { color: Colors.primary, fontSize: FontSize.xs, letterSpacing: 1.2, fontWeight: FontWeight.extrabold },
  title: { fontSize: FontSize['3xl'], fontWeight: FontWeight.extrabold },
  subtitle: { fontSize: FontSize.sm, lineHeight: 20 },
  card: { padding: Spacing.xl, borderRadius: Radius['2xl'], gap: Spacing.sm },
  questionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  qBadge: { color: Colors.primary, fontSize: FontSize.xs, fontWeight: FontWeight.extrabold },
  qText: { fontSize: FontSize.base, fontWeight: FontWeight.bold, lineHeight: 24 },
  label: { fontSize: FontSize.xs, fontWeight: FontWeight.bold },
  input: { borderWidth: 1, borderRadius: Radius.lg, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, fontSize: FontSize.sm },
  textarea: { minHeight: 110, textAlignVertical: 'top' },
  btnRow: { flexDirection: 'row', gap: Spacing.sm, alignItems: 'center' },
  nextBtn: { width: 44, height: 44, borderRadius: Radius.lg, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  metricChip: { flex: 1, padding: Spacing.sm, borderRadius: Radius.md, gap: 2, alignItems: 'center' },
  feedbackHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  feedbackTitle: { fontSize: FontSize.base, fontWeight: FontWeight.bold },
  scoreText: { fontSize: FontSize.sm, fontWeight: FontWeight.bold },
  feedbackBox: { padding: Spacing.md, borderRadius: Radius.lg, gap: Spacing.xs },
  fbRow: { fontSize: FontSize.xs, lineHeight: 18 },
});
