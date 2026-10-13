import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, RefreshControl, Alert } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useTheme } from '../../context/ThemeContext';
import { Colors, FontSize, FontWeight, Radius, Spacing } from '../../utils/theme';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { actOnMentorSession, fetchMentorWorkspace } from '../../api/features';
import { fetchMentorReviewQueue } from '../../api/careers';

export function MentorPortalScreen() {
  const { dark, colors: c } = useTheme();
  const [sessions, setSessions] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [workspace, queue] = await Promise.all([
        fetchMentorWorkspace(),
        fetchMentorReviewQueue().catch(() => []),
      ]);
      setSessions(workspace.sessions);
      setStudents(workspace.students);
      setReviews(queue);
      setError('');
    } catch (err: any) {
      setError(err?.response?.data?.error ?? 'Unable to load mentor data.');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const act = async (id: string, action: 'accept' | 'decline' | 'complete' | 'cancel') => {
    try { await actOnMentorSession(id, action); await load(); }
    catch (err: any) { Alert.alert('Session', err?.response?.data?.error || 'Could not update this session.'); }
  };

  if (loading && sessions.length === 0) return <View style={[styles.center, { backgroundColor: c.bg }]}><ActivityIndicator color={Colors.primary} size="large" /></View>;

  return (
    <ScrollView style={[styles.container, { backgroundColor: c.bg }]} contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={() => void load()} tintColor={Colors.primary} />}>
      <Animated.View entering={FadeInDown.duration(350)} style={styles.header}>
        <Text style={styles.eyebrow}>MENTOR WORKSPACE</Text>
        <Text style={[styles.title, { color: c.text }]}>Mentor Portal</Text>
        <Text style={[styles.subtitle, { color: c.muted }]}>Accept or decline session requests and review mock interviews — same as the website.</Text>
      </Animated.View>

      <View style={styles.grid2}>
        <Card dark={dark} elevated style={{ flex: 1, padding: Spacing.lg }}>
          <Text style={[styles.statNum, { color: Colors.primary }]}>{sessions.filter((s) => ['requested', 'upcoming'].includes(s.status)).length}</Text>
          <Text style={[styles.statLabel, { color: c.muted }]}>Open sessions</Text>
        </Card>
        <Card dark={dark} elevated style={{ flex: 1, padding: Spacing.lg }}>
          <Text style={[styles.statNum, { color: Colors.gold }]}>{students.length}</Text>
          <Text style={[styles.statLabel, { color: c.muted }]}>Students</Text>
        </Card>
      </View>

      <Card dark={dark} elevated style={styles.card}>
        <Text style={[styles.cardTitle, { color: c.text }]}>Student sessions</Text>
        {!!error && <Text style={{ color: Colors.danger }}>{error}</Text>}
        {!error && sessions.length === 0 && <Text style={{ color: c.muted }}>No sessions scheduled.</Text>}
        {sessions.map((s: any) => (
          <View key={s.id} style={[styles.sessRow, { backgroundColor: c.surface2 }]}>
            <Text style={[styles.sStudent, { color: c.text }]}>{s.studentName ?? s.student?.name ?? 'Student'}</Text>
            <Text style={[styles.sTopic, { color: Colors.primary }]}>{s.topic || s.kind} · {s.status}</Text>
            <Text style={[styles.sTime, { color: c.muted }]}>{s.scheduledAt ? new Date(s.scheduledAt).toLocaleString() : ''}</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
              {s.status === 'requested' && <Button title="Accept" onPress={() => act(s.id, 'accept')} />}
              {s.status === 'requested' && <Button title="Decline" variant="secondary" onPress={() => act(s.id, 'decline')} />}
              {s.status === 'upcoming' && <Button title="Complete" onPress={() => act(s.id, 'complete')} />}
              {['requested', 'upcoming'].includes(s.status) && <Button title="Cancel" variant="ghost" onPress={() => act(s.id, 'cancel')} />}
            </View>
          </View>
        ))}
      </Card>

      <Card dark={dark} elevated style={styles.card}>
        <Text style={[styles.cardTitle, { color: c.text }]}>Mock interviews to review</Text>
        {reviews.length === 0 && <Text style={{ color: c.muted }}>No interviews waiting.</Text>}
        {reviews.map((r: any) => (
          <View key={r.id} style={[styles.sessRow, { backgroundColor: c.surface2 }]}>
            <Text style={[styles.sStudent, { color: c.text }]}>{r.studentName || r.student?.name || 'Student'}</Text>
            <Text style={{ color: c.muted }}>{r.category || 'General'} · {r.status || 'submitted'}</Text>
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
  grid2: { flexDirection: 'row', gap: Spacing.md },
  statNum: { fontSize: FontSize['3xl'], fontWeight: FontWeight.extrabold },
  statLabel: { fontSize: FontSize.xs, fontWeight: FontWeight.bold },
  card: { padding: Spacing.xl, borderRadius: Radius['2xl'], gap: Spacing.sm },
  cardTitle: { fontSize: FontSize.base, fontWeight: FontWeight.bold, marginBottom: Spacing.xs },
  sessRow: { padding: Spacing.md, borderRadius: Radius.lg, marginBottom: 4 },
  sStudent: { fontSize: FontSize.sm, fontWeight: FontWeight.bold },
  sTopic: { fontSize: FontSize.xs, marginTop: 2, fontWeight: FontWeight.bold },
  sTime: { fontSize: FontSize.xs, marginTop: 2 },
});
