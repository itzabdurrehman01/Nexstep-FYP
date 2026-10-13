import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, RefreshControl } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { BarChart3, TrendingUp, Award, CheckCircle2, Zap } from 'lucide-react-native';
import { useTheme } from '../../context/ThemeContext';
import { Colors, FontSize, FontWeight, Radius, Spacing } from '../../utils/theme';
import { Card } from '../../components/Card';
import { fetchStudentAnalytics } from '../../api/careers';

export function AnalyticsScreen() {
  const { dark, colors: c } = useTheme();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const load = async () => {
    setLoading(true);
    try { setData(await fetchStudentAnalytics()); } finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, []);
  const scores = data?.quizzes?.[0]?.fullScores ?? data?.quizzes?.[0]?.full_scores ?? {};
  const riasec = [
    ['Realistic (R)', 'R', Colors.accent], ['Investigative (I)', 'I', Colors.primary],
    ['Artistic (A)', 'A', Colors.gold], ['Social (S)', 'S', Colors.info],
    ['Enterprising (E)', 'E', Colors.warning], ['Conventional (C)', 'C', c.muted],
  ].map(([label, code, color]) => ({ code: label, pct: Math.max(0, Math.min(100, Number(scores[code] ?? 0))), barColor: color }));
  const completedProfileFields = data ? ['city', 'gradeLevel', 'preferredStream', 'targetCareer', 'topRiasecCluster']
    .filter((key) => Boolean(data.profile?.[key])).length : 0;
  const readiness = Math.min(100, completedProfileFields * 12 + (data?.roadmap ? 20 : 0) + Math.min(20, (data?.applications?.length ?? 0) * 4));

  if (loading && !data) return <View style={[styles.center, { backgroundColor: c.bg }]}><ActivityIndicator color={Colors.primary} size="large" /></View>;

  return (
    <ScrollView style={[styles.container, { backgroundColor: c.bg }]} contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={() => void load()} tintColor={Colors.primary} />}>
      <Animated.View entering={FadeInDown.duration(350)} style={styles.header}>
        <Text style={styles.eyebrow}>PROGRESS & PERFORMANCE REPORT</Text>
        <Text style={[styles.title, { color: c.text }]}>Career Analytics</Text>
        <Text style={[styles.subtitle, { color: c.muted }]}>
          Track your skill growth, RIASEC Holland Code breakdown, and job market readiness index.
        </Text>
      </Animated.View>

      {/* Main Readiness Card */}
      <Card dark={dark} elevated style={styles.card}>
        <View style={styles.readinessHeader}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.cardTitle, { color: c.text }]}>Career Readiness Score</Text>
            <Text style={[styles.cardSub, { color: c.muted }]}>Based on skills, marks, and RIASEC assessment</Text>
          </View>
          <View style={[styles.scoreBadge, { backgroundColor: Colors.primary + '25' }]}>
            <Text style={[styles.scoreVal, { color: Colors.primary }]}>{readiness}%</Text>
          </View>
        </View>
      </Card>

      {/* RIASEC Profile Breakdown */}
      <Card dark={dark} elevated style={styles.card}>
        <Text style={[styles.cardTitle, { color: c.text }]}>RIASEC Holland Code Profile</Text>

        {riasec.map((item, i) => (
          <View key={i} style={styles.riasecRow}>
            <View style={styles.riasecLabelRow}>
              <Text style={[styles.riasecText, { color: c.text }]}>{item.code}</Text>
              <Text style={[styles.riasecPct, { color: item.barColor }]}>{item.pct}%</Text>
            </View>
            <View style={[styles.barBg, { backgroundColor: c.surface2 }]}>
              <View style={[styles.barFill, { width: `${item.pct}%` as any, backgroundColor: item.barColor }]} />
            </View>
          </View>
        ))}
      </Card>

      {/* Application Stats */}
      <View style={styles.grid2}>
        <Card dark={dark} elevated style={{ flex: 1, padding: Spacing.lg, gap: 4 }}>
          <Text style={[styles.statNum, { color: Colors.primary }]}>{data?.interviews?.length ?? 0}</Text>
          <Text style={[styles.statLabel, { color: c.muted }]}>Interview Sessions</Text>
        </Card>
        <Card dark={dark} elevated style={{ flex: 1, padding: Spacing.lg, gap: 4 }}>
          <Text style={[styles.statNum, { color: Colors.accent }]}>{data?.applications?.length ?? 0}</Text>
          <Text style={[styles.statLabel, { color: c.muted }]}>Job Applications</Text>
        </Card>
      </View>
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
  card: { padding: Spacing.xl, borderRadius: Radius['2xl'], gap: Spacing.sm },
  readinessHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { fontSize: FontSize.base, fontWeight: FontWeight.bold },
  cardSub: { fontSize: FontSize.xs, marginTop: 2 },
  scoreBadge: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  scoreVal: { fontSize: FontSize.lg, fontWeight: FontWeight.extrabold },
  riasecRow: { gap: 4, marginVertical: 2 },
  riasecLabelRow: { flexDirection: 'row', justifyContent: 'space-between' },
  riasecText: { fontSize: FontSize.xs, fontWeight: FontWeight.bold },
  riasecPct: { fontSize: FontSize.xs, fontWeight: FontWeight.extrabold },
  barBg: { height: 6, borderRadius: Radius.full, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: Radius.full },
  grid2: { flexDirection: 'row', gap: Spacing.md },
  statNum: { fontSize: FontSize['3xl'], fontWeight: FontWeight.extrabold },
  statLabel: { fontSize: FontSize.xs, fontWeight: FontWeight.bold },
});
