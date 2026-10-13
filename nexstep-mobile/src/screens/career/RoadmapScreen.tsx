/**
 * mobile/src/screens/RoadmapScreen.tsx
 * Career Roadmap — shows milestones and tasks, allows toggling task completion.
 * Pure React Native.
 */
import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  ActivityIndicator, RefreshControl, Alert,
} from 'react-native';
import { fetchCareerMatches, fetchRoadmap } from '../../api/careers';
import { generateRoadmap, resetRoadmap, saveRoadmap } from '../../api/features';
import { Card } from '../../components/Card';
import { Colors, Spacing, FontSize, FontWeight, Radius } from '../../utils/theme';
import { useTheme } from '../../context/ThemeContext';

interface Task      { id: string; task_key?: string; text: string; done: boolean }
interface Milestone { id: string; position?: number; title: string; period: string; status: string; tasks: Task[] }
interface Roadmap   { selectedCareerId: string; milestones: Milestone[] }

const STATUS_COLOR: Record<string, string> = {
  completed: Colors.success,
  current:   Colors.primary,
  upcoming:  '#94a3b8',
};
const STATUS_ICON: Record<string, string> = {
  completed: '✅',
  current:   '▶️',
  upcoming:  '⏳',
};

export function RoadmapScreen() {
  const { dark, colors: c } = useTheme();

  const [roadmap,    setRoadmap]    = useState<Roadmap | null>(null);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving,     setSaving]     = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      const data = await fetchRoadmap();
      setRoadmap(data);
    } catch { /* no roadmap yet */ }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const toggleTask = async (milestoneIdx: number, taskIdx: number) => {
    if (!roadmap) return;
    const key = `${milestoneIdx}-${taskIdx}`;
    setSaving(key);

    // Optimistic update
    const next = JSON.parse(JSON.stringify(roadmap)) as Roadmap;
    next.milestones[milestoneIdx].tasks[taskIdx].done = !next.milestones[milestoneIdx].tasks[taskIdx].done;
    setRoadmap(next);

    try {
      await saveRoadmap(next);
    } catch {
      // Revert on failure
      setRoadmap(roadmap);
      Alert.alert('Sync Error', 'Could not save task. Please check your connection.');
    } finally {
      setSaving(null);
    }
  };

  const totalTasks = roadmap?.milestones.flatMap(m => m.tasks).length ?? 0;
  const doneTasks  = roadmap?.milestones.flatMap(m => m.tasks).filter(t => t.done).length ?? 0;
  const pct        = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

  if (loading) {
    return <View style={[styles.center, { backgroundColor: c.bg }]}><ActivityIndicator color={Colors.primary} size="large" /></View>;
  }

  const buildRoadmap = async () => {
    try {
      const matches = await fetchCareerMatches('balanced');
      const career = matches.matches?.[0];
      if (!career) { Alert.alert('Roadmap', 'Take the interest quiz or open Career AI first.'); return; }
      const generated = await generateRoadmap({ careerId: career.id, careerTitle: career.title }).catch(() => null);
      if (generated) { setRoadmap(generated); return; }
      const starter = {
        selectedCareerId: career.id,
        milestones: [
          { id: 'm1', title: 'Foundation', period: 'Now', status: 'current', tasks: [{ id: 't1', text: `Read about ${career.title}`, done: false }, { id: 't2', text: 'Add missing skills in Skill Gap', done: false }] },
          { id: 'm2', title: 'Prepare', period: 'Next', status: 'upcoming', tasks: [{ id: 't3', text: 'Take a related course', done: false }] },
        ],
      };
      await saveRoadmap(starter);
      setRoadmap(starter as any);
    } catch { Alert.alert('Roadmap', 'Could not generate a roadmap.'); }
  };

  if (!roadmap) {
    return (
      <View style={[styles.center, { backgroundColor: c.bg, padding: Spacing['3xl'] }]}>
        <Text style={{ fontSize: 48, marginBottom: Spacing.xl }}>🗺️</Text>
        <Text style={[styles.emptyTitle, { color: c.text }]}>No Roadmap Yet</Text>
        <Text style={[styles.emptyText, { color: c.muted }]}>
          Generate a plan from your top Career AI match, the same way the website does.
        </Text>
        <TouchableOpacity onPress={buildRoadmap} style={{ marginTop: 16, backgroundColor: Colors.primary, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12 }}>
          <Text style={{ color: '#06110d', fontWeight: FontWeight.bold }}>Generate from Career AI</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView
      style={{ backgroundColor: c.bg }}
      contentContainerStyle={styles.scroll}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} tintColor={Colors.primary} />}
    >
      {/* Header */}
      <Text style={[styles.pageTitle, { color: c.text }]}>Career Roadmap</Text>
      <TouchableOpacity onPress={async () => { await resetRoadmap(); setRoadmap(null); }} style={{ alignSelf: 'flex-start', marginBottom: 8 }}>
        <Text style={{ color: Colors.danger, fontWeight: FontWeight.bold }}>Reset roadmap</Text>
      </TouchableOpacity>

      {/* Progress summary */}
      <Card dark={dark} elevated style={styles.progressCard}>
        <View style={styles.progressHeader}>
          <Text style={[styles.progressLabel, { color: c.text }]}>Overall Progress</Text>
          <Text style={[styles.progressPct, { color: Colors.primary }]}>{pct}%</Text>
        </View>
        <View style={[styles.progressBar, { backgroundColor: c.border }]}>
          <View style={[styles.progressFill, { width: `${pct}%` as any }]} />
        </View>
        <Text style={[styles.progressDetail, { color: c.muted }]}>
          {doneTasks} of {totalTasks} tasks completed
        </Text>
      </Card>

      {/* Milestones */}
      {roadmap.milestones.map((milestone, mIdx) => (
        <View key={milestone.id ?? mIdx} style={styles.milestoneWrapper}>
          {/* Timeline connector */}
          {mIdx < roadmap.milestones.length - 1 && (
            <View style={[styles.connector, { backgroundColor: milestone.status === 'completed' ? Colors.success : c.border }]} />
          )}

          <Card dark={dark} style={[styles.milestoneCard, { borderLeftColor: STATUS_COLOR[milestone.status] ?? c.border, borderLeftWidth: 4 }]}>
            {/* Milestone header */}
            <View style={styles.milestoneHeader}>
              <View style={[styles.statusDot, { backgroundColor: STATUS_COLOR[milestone.status] ?? c.border }]}>
                <Text style={styles.statusIcon}>{STATUS_ICON[milestone.status] ?? '⏳'}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.milestoneTitle, { color: c.text }]}>{milestone.title}</Text>
                <Text style={[styles.milestonePeriod, { color: c.muted }]}>{milestone.period}</Text>
              </View>
              <View style={[styles.milestoneBadge, { backgroundColor: STATUS_COLOR[milestone.status] + '20', borderColor: STATUS_COLOR[milestone.status] }]}>
                <Text style={[styles.milestoneBadgeText, { color: STATUS_COLOR[milestone.status] }]}>
                  {milestone.status.charAt(0).toUpperCase() + milestone.status.slice(1)}
                </Text>
              </View>
            </View>

            {/* Tasks */}
            {milestone.tasks.map((task, tIdx) => {
              const key = `${mIdx}-${tIdx}`;
              const isSaving = saving === key;
              return (
                <TouchableOpacity
                  key={task.id ?? tIdx}
                  onPress={() => toggleTask(mIdx, tIdx)}
                  style={[styles.taskRow, { borderTopColor: c.border }]}
                  activeOpacity={0.7}
                  disabled={!!saving}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: task.done }}
                  accessibilityLabel={task.text}
                >
                  <View style={[
                    styles.checkbox,
                    { borderColor: task.done ? Colors.success : c.border,
                      backgroundColor: task.done ? Colors.success : 'transparent' }
                  ]}>
                    {(isSaving)
                      ? <ActivityIndicator size="small" color="#fff" />
                      : task.done ? <Text style={styles.checkmark}>✓</Text> : null
                    }
                  </View>
                  <Text style={[styles.taskText, { color: task.done ? c.muted : c.text, textDecorationLine: task.done ? 'line-through' : 'none' }]}>
                    {task.text}
                  </Text>
                </TouchableOpacity>
              );
            })}

            {/* Milestone completion */}
            <View style={[styles.milestoneFooter, { borderTopColor: c.border }]}>
              <Text style={[styles.milestoneFooterText, { color: c.muted }]}>
                {milestone.tasks.filter(t => t.done).length} / {milestone.tasks.length} tasks done
              </Text>
            </View>
          </Card>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center:              { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll:              { padding: Spacing['2xl'], paddingBottom: 100 },
  pageTitle:           { fontSize: FontSize['2xl'], fontWeight: FontWeight.extrabold, marginBottom: Spacing['2xl'] },
  emptyTitle:          { fontSize: FontSize.xl, fontWeight: FontWeight.bold, marginBottom: Spacing.md, textAlign: 'center' },
  emptyText:           { fontSize: FontSize.base, textAlign: 'center', lineHeight: 22 },
  progressCard:        { marginBottom: Spacing['2xl'] },
  progressHeader:      { flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.md },
  progressLabel:       { fontSize: FontSize.base, fontWeight: FontWeight.semibold },
  progressPct:         { fontSize: FontSize.xl, fontWeight: FontWeight.extrabold },
  progressBar:         { height: 8, borderRadius: Radius.full, overflow: 'hidden', marginBottom: Spacing.sm },
  progressFill:        { height: 8, borderRadius: Radius.full, backgroundColor: Colors.primary },
  progressDetail:      { fontSize: FontSize.sm },
  milestoneWrapper:    { position: 'relative', marginBottom: Spacing.xl },
  connector:           { position: 'absolute', left: 22, top: '100%', width: 2, height: Spacing.xl, zIndex: 0 },
  milestoneCard:       { borderRadius: Radius.lg, overflow: 'hidden' },
  milestoneHeader:     { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md, marginBottom: Spacing.lg },
  statusDot:           { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  statusIcon:          { fontSize: 16 },
  milestoneTitle:      { fontSize: FontSize.base, fontWeight: FontWeight.bold, marginBottom: 2 },
  milestonePeriod:     { fontSize: FontSize.xs },
  milestoneBadge:      { paddingHorizontal: Spacing.sm, paddingVertical: 2, borderRadius: Radius.full, borderWidth: 1, alignSelf: 'flex-start' },
  milestoneBadgeText:  { fontSize: FontSize.xs, fontWeight: FontWeight.semibold },
  taskRow:             { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: Spacing.md, borderTopWidth: 1, gap: Spacing.md },
  checkbox:            { width: 22, height: 22, borderRadius: 6, borderWidth: 2, alignItems: 'center', justifyContent: 'center', marginTop: 1, flexShrink: 0 },
  checkmark:           { color: '#fff', fontSize: 13, fontWeight: FontWeight.bold },
  taskText:            { flex: 1, fontSize: FontSize.sm, lineHeight: 20 },
  milestoneFooter:     { borderTopWidth: 1, paddingTop: Spacing.md, marginTop: Spacing.sm },
  milestoneFooterText: { fontSize: FontSize.xs },
});
