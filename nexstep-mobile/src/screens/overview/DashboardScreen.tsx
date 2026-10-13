/**
 * mobile/src/screens/DashboardScreen.tsx
 * Home dashboard — shows readiness score, quick stats, and shortcuts.
 * Pure React Native — no WebView.
 */
import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, RefreshControl,
  TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { fetchCareerMatches, fetchProfile, fetchRoadmap } from '../../api/careers';
import { fetchInterviews } from '../../api/features';
import { Card } from '../../components/Card';
import { Colors, Spacing, FontSize, FontWeight, Radius } from '../../utils/theme';
import { labelOf, toolsForLevel } from '../../config/navigation';
import { useLanguage } from '../../context/LanguageContext';
import { useTheme } from '../../context/ThemeContext';

interface Props { onNavigate: (route: string) => void }

export function DashboardScreen({ onNavigate }: Props) {
  const { user } = useAuth();
  const { dark, colors: c } = useTheme();
  const { language } = useLanguage();

  const [profile,     setProfile]     = useState<any>(null);
  const [loading,     setLoading]     = useState(true);
  const [refreshing,  setRefreshing]  = useState(false);
  const [topMatch, setTopMatch] = useState<any>(null);
  const [roadmapPct, setRoadmapPct] = useState(0);
  const [interviews, setInterviews] = useState<any[]>([]);

  const loadData = useCallback(async () => {
    try {
      const [p, matches, roadmap, iv] = await Promise.all([
        fetchProfile(),
        fetchCareerMatches('balanced').catch(() => null),
        fetchRoadmap().catch(() => null),
        fetchInterviews().catch(() => []),
      ]);
      setProfile(p);
      setTopMatch(matches?.matches?.[0] || null);
      const tasks = roadmap?.milestones?.flatMap((m: any) => m.tasks || []) || [];
      setRoadmapPct(tasks.length ? Math.round((tasks.filter((t: any) => t.done).length / tasks.length) * 100) : 0);
      setInterviews(iv);
    } catch { /* use null profile */ }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // Deterministic readiness score from profile completeness
  const readiness = (() => {
    if (!profile) return 0;
    let score = 0;
    if (profile.preferredStream)    score += 20;
    if (profile.topRiasecCluster)   score += 20;
    if (profile.marks?.matricPct)   score += 15;
    if (profile.marks?.fscPct)      score += 15;
    if (profile.skills?.length > 0) score += 20;
    if (profile.targetCareer)       score += 10;
    const careerScore = topMatch?.matchScore || 0;
    return Math.min(100, Math.round(careerScore * 0.4 + Math.min(100, score) * 0.3 + roadmapPct * 0.3));
  })();

  const firstName = user?.firstName ?? 'Student';
  const level = profile?.education?.level || null;
  const quickActions = toolsForLevel(level);

  const greeting = new Date().getHours() < 12 ? 'Good morning' : new Date().getHours() < 17 ? 'Good afternoon' : 'Good evening';

  if (loading) {
    return <View style={[styles.center, { backgroundColor: c.bg }]}><ActivityIndicator color={Colors.primary} size="large" /></View>;
  }

  return (
    <ScrollView
      style={{ backgroundColor: c.bg }}
      contentContainerStyle={styles.scroll}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} tintColor={Colors.primary} />}
    >
      {/* Header greeting */}
      <View style={styles.headerRow}>
        <View>
          <Text style={[styles.greeting, { color: c.muted }]}>{language === 'ur' ? 'خوش آمدید' : greeting},</Text>
          <Text style={[styles.name, { color: c.text }]}>{firstName} 👋</Text>
        </View>
        <View style={[styles.roleBadge, { backgroundColor: c.surface2, borderColor: c.border }]}>
          <Text style={[styles.roleText, { color: Colors.primary }]}>{user?.role ?? 'STUDENT'}</Text>
        </View>
      </View>

      {/* Career Readiness Ring Card */}
      <Card style={styles.ringCard} dark={dark} elevated>
        <View style={styles.ringRow}>
          {/* SVG ring replaced with a simple circular progress using border */}
          <View style={styles.ringWrapper}>
            <View style={[styles.ringOuter, { borderColor: c.border }]}>
              <View style={[styles.ringInner, {
                borderColor: readiness >= 70 ? Colors.primary : readiness >= 40 ? Colors.warning : Colors.danger,
                // Simple arc approximation using border partial rendering
                borderTopColor:   Colors.primary,
                borderRightColor: readiness > 25  ? Colors.primary : c.border,
                borderBottomColor: readiness > 50 ? Colors.primary : c.border,
                borderLeftColor:  readiness > 75  ? Colors.primary : c.border,
              }]} />
            </View>
            <View style={styles.ringCenter}>
              <Text style={[styles.ringPct, { color: c.text }]}>{readiness}%</Text>
              <Text style={[styles.ringLabel, { color: c.muted }]}>Ready</Text>
            </View>
          </View>
          <View style={styles.ringInfo}>
            <Text style={[styles.ringTitle, { color: c.text }]}>Career Readiness</Text>
            <Text style={[styles.ringSubtitle, { color: c.muted }]}>
              {readiness >= 80 ? 'Excellent profile — ready to apply!'
                : readiness >= 50 ? 'Good progress — keep building skills'
                : 'Complete your profile to improve score'}
            </Text>
            <View style={[styles.progressBar, { backgroundColor: c.border }]}>
              <View style={[styles.progressFill, { width: `${readiness}%` as any, backgroundColor: Colors.primary }]} />
            </View>
          </View>
        </View>
      </Card>

      {topMatch && (
        <Card dark={dark} style={{ marginBottom: Spacing.lg }}>
          <Text style={{ color: c.muted, fontSize: FontSize.xs }}>Top Career Match</Text>
          <Text style={{ color: c.text, fontWeight: FontWeight.extrabold, fontSize: FontSize.lg }}>{topMatch.title}</Text>
          <Text style={{ color: Colors.primary }}>{topMatch.matchScore}% match · Roadmap {roadmapPct}%</Text>
          <TouchableOpacity onPress={() => onNavigate('career')}><Text style={{ color: Colors.primary, marginTop: 6 }}>Open Career AI</Text></TouchableOpacity>
        </Card>
      )}
      {interviews.length > 0 && (
        <Card dark={dark} style={{ marginBottom: Spacing.lg }}>
          <Text style={{ color: c.text, fontWeight: FontWeight.bold }}>Recent interviews</Text>
          {interviews.slice(0, 3).map((iv) => (
            <Text key={iv.id} style={{ color: c.muted }}>{iv.category || 'Interview'} · {iv.score ?? iv.overallScore ?? ''}{iv.created_at ? ` · ${new Date(iv.created_at).toLocaleDateString()}` : ''}</Text>
          ))}
        </Card>
      )}

      {/* Stats row */}
      <View style={styles.statsRow}>
        {[
          { label: 'Stream',   value: profile?.preferredStream ? profile.preferredStream.split(' ').slice(0,2).join(' ') : '—' },
          { label: 'RIASEC',   value: profile?.topRiasecCluster ? profile.topRiasecCluster.split(' ')[0] : '—' },
          { label: 'Skills',   value: String(profile?.skills?.length ?? 0) },
          { label: 'Matric',   value: profile?.marks?.matricPct ? `${profile.marks.matricPct}%` : '—' },
        ].map(s => (
          <Card key={s.label} style={styles.statCard} dark={dark}>
            <Text style={[styles.statValue, { color: Colors.primary }]}>{s.value}</Text>
            <Text style={[styles.statLabel, { color: c.muted }]}>{s.label}</Text>
          </Card>
        ))}
      </View>

      {/* Quick Actions */}
      <Text style={[styles.sectionTitle, { color: c.text }]}>Quick Actions</Text>
      <View style={styles.actionsGrid}>
        {quickActions.map(a => (
          <TouchableOpacity
            key={a.id}
            style={[styles.actionCard, { backgroundColor: c.surface, borderColor: c.border }]}
            onPress={() => onNavigate(a.id)}
            activeOpacity={0.75}
            accessibilityRole="button"
            accessibilityLabel={labelOf(a, language)}
          >
            <Text style={[styles.actionLabel, { color: c.text }]}>{labelOf(a, language)}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Tip card */}
      <Card style={[styles.tipCard, { borderLeftColor: Colors.primary }]} dark={dark}>
        <Text style={[styles.tipTitle, { color: Colors.primary }]}>💡 Daily Tip</Text>
        <Text style={[styles.tipText, { color: c.muted }]}>
          {readiness < 40
            ? 'Complete the RIASEC quiz to unlock personalised career recommendations.'
            : readiness < 70
            ? 'Add your skills in Profile to improve your career match accuracy.'
            : 'Practice a mock interview today to boost your confidence.'}
        </Text>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center:        { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll:        { padding: Spacing['2xl'], paddingBottom: 100 },
  headerRow:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing['2xl'] },
  greeting:      { fontSize: FontSize.sm },
  name:          { fontSize: FontSize['2xl'], fontWeight: FontWeight.extrabold },
  roleBadge:     { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.xs, borderRadius: Radius.full, borderWidth: 1 },
  roleText:      { fontSize: FontSize.xs, fontWeight: FontWeight.bold },
  ringCard:      { marginBottom: Spacing['2xl'] },
  ringRow:       { flexDirection: 'row', alignItems: 'center', gap: Spacing['2xl'] },
  ringWrapper:   { position: 'relative', width: 90, height: 90, alignItems: 'center', justifyContent: 'center' },
  ringOuter:     { position: 'absolute', width: 90, height: 90, borderRadius: 45, borderWidth: 8, borderColor: '#e2e8f0' },
  ringInner:     { width: 90, height: 90, borderRadius: 45, borderWidth: 8 },
  ringCenter:    { position: 'absolute', alignItems: 'center' },
  ringPct:       { fontSize: FontSize.xl, fontWeight: FontWeight.extrabold },
  ringLabel:     { fontSize: FontSize.xs },
  ringInfo:      { flex: 1 },
  ringTitle:     { fontSize: FontSize.lg, fontWeight: FontWeight.bold, marginBottom: Spacing.xs },
  ringSubtitle:  { fontSize: FontSize.sm, marginBottom: Spacing.md, lineHeight: 18 },
  progressBar:   { height: 6, borderRadius: Radius.full, overflow: 'hidden' },
  progressFill:  { height: 6, borderRadius: Radius.full },
  statsRow:      { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing['2xl'] },
  statCard:      { flex: 1, alignItems: 'center', padding: Spacing.md },
  statValue:     { fontSize: FontSize.base, fontWeight: FontWeight.bold },
  statLabel:     { fontSize: FontSize.xs, marginTop: 2 },
  sectionTitle:  { fontSize: FontSize.lg, fontWeight: FontWeight.bold, marginBottom: Spacing.lg },
  actionsGrid:   { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing['2xl'] },
  actionCard:    { width: '30.5%', alignItems: 'center', padding: Spacing.lg, borderRadius: Radius.md, borderWidth: 1 },
  actionIcon:    { fontSize: 26, marginBottom: Spacing.xs },
  actionLabel:   { fontSize: FontSize.xs, fontWeight: FontWeight.semibold, textAlign: 'center' },
  tipCard:       { borderLeftWidth: 3, paddingLeft: Spacing.lg },
  tipTitle:      { fontSize: FontSize.sm, fontWeight: FontWeight.bold, marginBottom: Spacing.xs },
  tipText:       { fontSize: FontSize.sm, lineHeight: 20 },
});
