/**
 * mobile/src/screens/JobsScreen.tsx
 * Jobs & Internships portal — pure React Native.
 */
import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  ActivityIndicator, RefreshControl,
  TextInput, Alert, Modal, ScrollView,
} from 'react-native';
import { fetchJobs } from '../../api/careers';
import { addBookmark, createApplication, fetchApplications, fetchBookmarks, removeBookmark } from '../../api/features';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { Colors, Spacing, FontSize, FontWeight, Radius } from '../../utils/theme';
import { useTheme } from '../../context/ThemeContext';

interface Job {
  id: string; title: string; company: string; location?: string;
  type?: string; salaryRange?: string; skills?: string[];
  description?: string; postedDate?: string; deadline?: string;
}

export function JobsScreen() {
  const { dark, colors: c } = useTheme();

  const [jobs,       setJobs]       = useState<Job[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search,     setSearch]     = useState('');
  const [selected,   setSelected]   = useState<Job | null>(null);
  const [applying,   setApplying]   = useState(false);
  const [applied, setApplied] = useState<Set<string>>(new Set());
  const [saved, setSaved] = useState<Set<string>>(new Set());
  const [typeFilter, setTypeFilter] = useState('All');

  const loadJobs = useCallback(async () => {
    try {
      const [data, apps, marks] = await Promise.all([fetchJobs(), fetchApplications().catch(() => []), fetchBookmarks().catch(() => [])]);
      setJobs(data);
      setApplied(new Set(apps.filter((a: any) => /job/i.test(String(a.type))).map((a: any) => String(a.targetId || a.title))));
      setSaved(new Set(marks.filter((b: any) => /job/i.test(String(b.type))).map((b: any) => String(b.id || b.itemId))));
    } catch { /* handled */ }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { loadJobs(); }, [loadJobs]);

  const types = ['All', ...Array.from(new Set(jobs.map((j) => j.type).filter(Boolean))) as string[]];
  const filtered = jobs.filter(j =>
    (typeFilter === 'All' || j.type === typeFilter) &&
    (!search ||
    j.title.toLowerCase().includes(search.toLowerCase()) ||
    j.company.toLowerCase().includes(search.toLowerCase()) ||
    j.location?.toLowerCase().includes(search.toLowerCase()))
  );

  const applyForJob = async (job: Job) => {
    setApplying(true);
    try {
      await createApplication({
        type: 'Job / Internship',
        title: job.title,
        targetId: job.id,
        targetName: job.company,
        officialUrl: (job as any).officialUrl || (job as any).applyUrl,
        notes: `Applied via mobile app for ${job.type ?? 'Full-time'} position.`,
      });
      setApplied((s) => new Set([...s, job.id, job.title]));
      setSelected(null);
      Alert.alert('Application Submitted', `Your application for ${job.title} at ${job.company} has been recorded.`);
    } catch (err: any) {
      const msg = err?.response?.data?.error ?? 'Could not submit application. Please try again.';
      Alert.alert('Error', msg);
    } finally {
      setApplying(false);
    }
  };

  if (loading) {
    return <View style={[styles.center, { backgroundColor: c.bg }]}><ActivityIndicator color={Colors.primary} size="large" /></View>;
  }

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      {/* Search bar */}
      <View style={[styles.searchBar, { backgroundColor: c.surface, borderColor: c.border }]}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search jobs, companies, locations..."
          placeholderTextColor={c.muted}
          style={[styles.searchInput, { color: c.text }]}
          accessibilityLabel="Search jobs"
          clearButtonMode="while-editing"
        />
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: Spacing['2xl'], marginBottom: 8 }}>
        {types.map((t) => (
          <TouchableOpacity key={t} onPress={() => setTypeFilter(t)} style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: typeFilter === t ? Colors.primary : c.surface2 }}>
            <Text style={{ color: typeFilter === t ? '#06110d' : c.text, fontWeight: FontWeight.bold, fontSize: FontSize.xs }}>{t}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <Text style={[styles.countText, { color: c.muted }]}>
        {filtered.length} {filtered.length === 1 ? 'position' : 'positions'} found
      </Text>

      <FlatList
        data={filtered}
        keyExtractor={(item, i) => item.id ?? String(i)}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadJobs(); }} tintColor={Colors.primary} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={{ fontSize: 48, textAlign: 'center', marginBottom: Spacing.lg }}>💼</Text>
            <Text style={[styles.emptyText, { color: c.muted }]}>No positions found. Try a different search.</Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity onPress={() => setSelected(item)} activeOpacity={0.85} accessibilityRole="button" accessibilityLabel={`${item.title} at ${item.company}`}>
            <Card dark={dark} style={styles.jobCard}>
              <View style={styles.jobHeader}>
                <View style={[styles.companyLogo, { backgroundColor: Colors.primary + '20' }]}>
                  <Text style={{ fontSize: 18 }}>🏢</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.jobTitle, { color: c.text }]}>{item.title}</Text>
                  <Text style={[styles.companyName, { color: c.muted }]}>{item.company}</Text>
                </View>
                {item.type && (
                  <View style={[styles.typeBadge, { backgroundColor: Colors.info + '20', borderColor: Colors.info }]}>
                    <Text style={[styles.typeText, { color: Colors.info }]}>{item.type}</Text>
                  </View>
                )}
              </View>
              <View style={styles.jobMeta}>
                {item.location && <Text style={[styles.metaText, { color: c.muted }]}>📍 {item.location}</Text>}
                {item.salaryRange && <Text style={[styles.metaText, { color: Colors.primary }]}>💰 {item.salaryRange}</Text>}
              </View>
              <TouchableOpacity onPress={async () => {
                try {
                  if (saved.has(item.id)) { await removeBookmark(item.id); setSaved((s) => { const n = new Set(s); n.delete(item.id); return n; }); }
                  else { await addBookmark({ id: item.id, type: 'job', title: item.title, provider: item.company }); setSaved((s) => new Set([...s, item.id])); }
                } catch { Alert.alert('Bookmark', 'Sign in to save jobs.'); }
              }}>
                <Text style={{ color: Colors.primary, fontWeight: FontWeight.bold }}>{saved.has(item.id) ? 'Saved' : 'Save job'}</Text>
              </TouchableOpacity>
              {item.skills && item.skills.length > 0 && (
                <View style={styles.skillsRow}>
                  {item.skills.slice(0, 3).map(sk => (
                    <View key={sk} style={[styles.skillTag, { backgroundColor: c.surface2, borderColor: c.border }]}>
                      <Text style={[styles.skillText, { color: c.muted }]}>{sk}</Text>
                    </View>
                  ))}
                </View>
              )}
            </Card>
          </TouchableOpacity>
        )}
      />

      {/* Job Detail Modal */}
      <Modal visible={!!selected} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setSelected(null)}>
        {selected && (
          <View style={[styles.modalContainer, { backgroundColor: c.bg }]}>
            <View style={[styles.modalHandle, { backgroundColor: c.border }]} />
            <ScrollView contentContainerStyle={styles.modalScroll}>
              <View style={styles.modalHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.modalTitle, { color: c.text }]}>{selected.title}</Text>
                  <Text style={[styles.modalCompany, { color: c.muted }]}>{selected.company}</Text>
                </View>
                <TouchableOpacity onPress={() => setSelected(null)} accessibilityLabel="Close">
                  <Text style={[{ fontSize: FontSize.xl, color: c.muted }]}>✕</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.detailBadges}>
                {selected.type     && <View style={[styles.typeBadge, { backgroundColor: Colors.info + '20', borderColor: Colors.info }]}><Text style={[styles.typeText, { color: Colors.info }]}>{selected.type}</Text></View>}
                {selected.location && <Text style={[styles.metaText, { color: c.muted }]}>📍 {selected.location}</Text>}
              </View>
              {selected.salaryRange && (
                <View style={[styles.salaryBlock, { backgroundColor: Colors.primary + '10', borderColor: Colors.primary }]}>
                  <Text style={[styles.salaryText, { color: Colors.primary }]}>💰 {selected.salaryRange}</Text>
                </View>
              )}
              {selected.description && (
                <>
                  <Text style={[styles.sectionHead, { color: c.text }]}>Description</Text>
                  <Text style={[styles.bodyText, { color: c.muted }]}>{selected.description}</Text>
                </>
              )}
              {selected.skills && selected.skills.length > 0 && (
                <>
                  <Text style={[styles.sectionHead, { color: c.text }]}>Required Skills</Text>
                  <View style={styles.skillsRow}>
                    {selected.skills.map(sk => (
                      <View key={sk} style={[styles.skillTag, { backgroundColor: c.surface2, borderColor: c.border }]}>
                        <Text style={[styles.skillText, { color: c.muted }]}>{sk}</Text>
                      </View>
                    ))}
                  </View>
                </>
              )}
              {selected.deadline && <Text style={[styles.deadlineText, { color: Colors.danger }]}>⏰ Deadline: {selected.deadline}</Text>}

              <Button label={applied.has(selected.id) || applied.has(selected.title) ? 'Already applied' : 'Apply Now'} onPress={() => applyForJob(selected)} loading={applying} disabled={applied.has(selected.id) || applied.has(selected.title)} style={{ marginTop: Spacing['2xl'] }} />
              <Button label="Close" onPress={() => setSelected(null)} variant="ghost" style={{ marginTop: Spacing.md }} />
            </ScrollView>
          </View>
        )}
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  center:         { flex: 1, alignItems: 'center', justifyContent: 'center' },
  searchBar:      { flexDirection: 'row', alignItems: 'center', margin: Spacing['2xl'], marginBottom: Spacing.sm, padding: Spacing.lg, borderRadius: Radius.md, borderWidth: 1 },
  searchIcon:     { fontSize: FontSize.lg, marginRight: Spacing.sm },
  searchInput:    { flex: 1, fontSize: FontSize.base },
  countText:      { marginHorizontal: Spacing['2xl'], marginBottom: Spacing.md, fontSize: FontSize.sm },
  list:           { paddingHorizontal: Spacing['2xl'], gap: Spacing.lg, paddingBottom: 100 },
  empty:          { alignItems: 'center', paddingTop: Spacing['5xl'] },
  emptyText:      { fontSize: FontSize.base, textAlign: 'center' },
  jobCard:        { gap: Spacing.md },
  jobHeader:      { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md },
  companyLogo:    { width: 44, height: 44, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
  jobTitle:       { fontSize: FontSize.base, fontWeight: FontWeight.bold, marginBottom: 2 },
  companyName:    { fontSize: FontSize.sm },
  typeBadge:      { paddingHorizontal: Spacing.sm, paddingVertical: 2, borderRadius: Radius.full, borderWidth: 1 },
  typeText:       { fontSize: FontSize.xs, fontWeight: FontWeight.semibold },
  jobMeta:        { flexDirection: 'row', gap: Spacing.lg },
  metaText:       { fontSize: FontSize.sm },
  skillsRow:      { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs },
  skillTag:       { paddingHorizontal: Spacing.sm, paddingVertical: 2, borderRadius: Radius.sm, borderWidth: 1 },
  skillText:      { fontSize: FontSize.xs },
  modalContainer: { flex: 1, paddingTop: Spacing.xl },
  modalHandle:    { width: 40, height: 4, borderRadius: Radius.full, alignSelf: 'center', marginBottom: Spacing.lg },
  modalScroll:    { padding: Spacing['2xl'], paddingBottom: 60 },
  modalHeader:    { flexDirection: 'row', alignItems: 'flex-start', marginBottom: Spacing.xl },
  modalTitle:     { fontSize: FontSize.xl, fontWeight: FontWeight.extrabold },
  modalCompany:   { fontSize: FontSize.base, marginTop: 2 },
  detailBadges:   { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.lg },
  salaryBlock:    { padding: Spacing.lg, borderRadius: Radius.md, borderWidth: 1, marginBottom: Spacing.xl },
  salaryText:     { fontSize: FontSize.lg, fontWeight: FontWeight.bold },
  sectionHead:    { fontSize: FontSize.base, fontWeight: FontWeight.bold, marginBottom: Spacing.sm, marginTop: Spacing.xl },
  bodyText:       { fontSize: FontSize.base, lineHeight: 22 },
  deadlineText:   { fontSize: FontSize.sm, marginTop: Spacing.xl, fontWeight: FontWeight.semibold },
});
