/**
 * mobile/src/screens/ScholarshipsScreen.tsx
 * Real scholarship data from DB with eligibility matching.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Modal, ScrollView, TextInput, ActivityIndicator, RefreshControl, Linking } from 'react-native';
import { matchesStream, profileStream } from '../../utils/streamMatch';
import { normalizeProvince } from '../../config/access';
import { fetchProfile } from '../../api/careers';
import { apiClient } from '../../api/client';
import { addBookmark, fetchBookmarks, removeBookmark } from '../../api/features';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { Spacing, FontSize, FontWeight, Radius } from '../../utils/theme';
import { useTheme } from '../../context/ThemeContext';

interface Scholarship { id:string; name:string; provider:string; province:string; category:string; awardAmountPkr?:number; coverage?:string; applicationUrl:string; eligibilityStatus?:string; qualifyReasons?:string[]; blockReasons?:string[]; description?:string }

export function ScholarshipsScreen() {
  const { dark, colors: c } = useTheme();
  const [scholarships, setScholarships] = useState<Scholarship[]>([]);
  const [profile,    setProfile]    = useState<any>(null);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search,     setSearch]     = useState('');
  const [selected,   setSelected]   = useState<Scholarship | null>(null);
  const [province, setProvince] = useState('All');
  const [category, setCategory] = useState('All');
  const [saved, setSaved] = useState<Set<string>>(new Set());

  const loadData = useCallback(async () => {
    try {
      const [prof] = await Promise.all([fetchProfile()]);
      setProfile(prof);
      if (prof?.province) setProvince(normalizeProvince(prof.province) || prof.province);
      // Try eligibility matching first
      const res = await apiClient.post('/api/scholarships/match', {
        familyMonthlyIncomePkr: prof?.familyMonthlyIncomePkr,
        academicPct: prof?.marks?.fscPct || prof?.marks?.matricPct || prof?.fscPct || prof?.matricPct,
        province: prof?.province,
        gradeLevel: prof?.gradeLevel,
        stream: profileStream(prof),
      });
      setScholarships(res.data?.data || []);
      const marks = await fetchBookmarks().catch(() => []);
      setSaved(new Set(marks.filter((b: any) => /scholar/i.test(String(b.type))).map((b: any) => String(b.id || b.itemId))));
    } catch {
      // Fallback to list
      try {
        const r = await apiClient.get('/api/scholarships?limit=50');
        setScholarships(r.data?.data || []);
      } catch { /* ignore */ }
    } finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const stream = profileStream(profile);
  const provinces = ['All', ...Array.from(new Set(scholarships.map((s) => s.province).filter(Boolean)))];
  const categories = ['All', ...Array.from(new Set(scholarships.map((s) => s.category).filter(Boolean)))];
  const searched = scholarships.filter(s =>
    (province === 'All' || s.province === province) &&
    (category === 'All' || s.category === category) &&
    (!search || (s.name || '').toLowerCase().includes(search.toLowerCase()) || (s.provider || '').toLowerCase().includes(search.toLowerCase()))
  );
  const matched = stream ? searched.filter((s) => matchesStream(`${s.name} ${s.provider} ${s.category} ${s.description}`, stream)) : searched;
  const filtered = matched.length ? matched : searched;

  const statusColor = (status?: string) => status === 'LIKELY_ELIGIBLE' ? c.success : status === 'INCOMPLETE_DATA' ? c.warning : c.danger;
  const statusLabel = (status?: string) => status === 'LIKELY_ELIGIBLE' ? 'Likely Eligible ✓' : status === 'INCOMPLETE_DATA' ? 'Need More Info' : 'May Not Qualify';

  if (loading) return <View style={[styles.center, { backgroundColor: c.bg }]}><ActivityIndicator color={c.primary} size="large" /></View>;

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <View style={[styles.searchBar, { backgroundColor: c.surface, borderColor: c.border }]}>
        <TextInput value={search} onChangeText={setSearch} placeholder="Search scholarships..." placeholderTextColor={c.muted}
          style={[styles.searchInput, { color: c.text }]} clearButtonMode="while-editing" />
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingHorizontal: Spacing['2xl'] }}>
        {provinces.slice(0, 8).map((p) => (
          <TouchableOpacity key={p} onPress={() => setProvince(p)} style={{ paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, backgroundColor: province === p ? c.primary : c.surface2 }}>
            <Text style={{ color: province === p ? c.onPrimary : c.text, fontSize: FontSize.xs, fontWeight: FontWeight.bold }}>{p}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingHorizontal: Spacing['2xl'], marginTop: 6 }}>
        {categories.slice(0, 8).map((cat) => (
          <TouchableOpacity key={cat} onPress={() => setCategory(cat)} style={{ paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, backgroundColor: category === cat ? c.primary : c.surface2 }}>
            <Text style={{ color: category === cat ? c.onPrimary : c.text, fontSize: FontSize.xs, fontWeight: FontWeight.bold }}>{cat}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <FlatList data={filtered} keyExtractor={i => i.id || i.name}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} tintColor={c.primary} />}
        ListEmptyComponent={<Text style={[styles.emptyText, { color: c.muted }]}>No scholarships found.</Text>}
        renderItem={({ item }) => (
          <TouchableOpacity onPress={() => setSelected(item)} activeOpacity={0.85}>
            <Card dark={dark} style={styles.card}>
              <View style={styles.cardTop}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.title, { color: c.text }]}>{item.name}</Text>
                  <Text style={[styles.provider, { color: c.muted }]}>{item.provider}</Text>
                </View>
                {item.eligibilityStatus && (
                  <View style={[styles.statusBadge, { backgroundColor: statusColor(item.eligibilityStatus) + '20', borderColor: statusColor(item.eligibilityStatus) }]}>
                    <Text style={[styles.statusText, { color: statusColor(item.eligibilityStatus) }]}>{statusLabel(item.eligibilityStatus)}</Text>
                  </View>
                )}
              </View>
              <View style={styles.metaRow}>
                {item.province && <Text style={[styles.metaText, { color: c.muted }]}>📍 {item.province}</Text>}
                {item.category && <Text style={[styles.metaText, { color: c.muted }]}>🏷 {item.category}</Text>}
              </View>
              {item.coverage && <Text style={[styles.coverageText, { color: c.primary }]}>💰 {item.coverage}</Text>}
              {(item as any).minMarks || (item as any).minAcademicPct ? <Text style={[styles.metaText, { color: c.muted }]}>Min marks: {(item as any).minMarks || (item as any).minAcademicPct}%</Text> : null}
              <TouchableOpacity onPress={async () => {
                try {
                  if (saved.has(item.id)) { await removeBookmark(item.id); setSaved((s) => { const n = new Set(s); n.delete(item.id); return n; }); }
                  else { await addBookmark({ id: item.id, type: 'scholarship', title: item.name, provider: item.provider, officialUrl: item.applicationUrl }); setSaved((s) => new Set([...s, item.id])); }
                } catch { /* ignore */ }
              }}><Text style={{ color: c.primary, fontWeight: FontWeight.bold }}>{saved.has(item.id) ? 'Saved' : 'Save'}</Text></TouchableOpacity>
            </Card>
          </TouchableOpacity>
        )}
      />
      <Modal visible={!!selected} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setSelected(null)}>
        {selected && (
          <View style={[styles.modal, { backgroundColor: c.bg }]}>
            <View style={[styles.handle, { backgroundColor: c.border }]} />
            <ScrollView contentContainerStyle={styles.modalScroll}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: c.text, flex: 1 }]}>{selected.name}</Text>
                <TouchableOpacity onPress={() => setSelected(null)}><Text style={{ color: c.muted, fontSize: FontSize.xl }}>✕</Text></TouchableOpacity>
              </View>
              <Text style={[styles.provider, { color: c.muted, marginBottom: Spacing.xl }]}>{selected.provider}</Text>
              {selected.eligibilityStatus && (
                <View style={[styles.statusBlock, { backgroundColor: statusColor(selected.eligibilityStatus) + '15', borderColor: statusColor(selected.eligibilityStatus) }]}>
                  <Text style={[styles.statusBlockText, { color: statusColor(selected.eligibilityStatus) }]}>{statusLabel(selected.eligibilityStatus)}</Text>
                </View>
              )}
              {selected.qualifyReasons?.length ? (
                <View style={{ marginBottom: Spacing.xl }}>
                  <Text style={[styles.sectionHead, { color: c.text }]}>Why you may qualify</Text>
                  {selected.qualifyReasons.map((r, i) => <Text key={i} style={[styles.bullet, { color: c.muted }]}>✓ {r}</Text>)}
                </View>
              ) : null}
              {selected.blockReasons?.length ? (
                <View style={{ marginBottom: Spacing.xl }}>
                  <Text style={[styles.sectionHead, { color: c.text }]}>Potential issues</Text>
                  {selected.blockReasons.map((r, i) => <Text key={i} style={[styles.bullet, { color: c.danger }]}>✗ {r}</Text>)}
                </View>
              ) : null}
              {selected.description && <Text style={[{ color: c.muted, fontSize: FontSize.sm, lineHeight: 20, marginBottom: Spacing['2xl'] }]}>{selected.description}</Text>}
              <Button label="Apply on official site →" onPress={() => Linking.openURL(selected.applicationUrl || 'https://www.hec.gov.pk/english/scholarshipsgrants/Pages/default.aspx')} style={{ marginTop: Spacing.lg }} />
              <Button label="Close" onPress={() => setSelected(null)} variant="ghost" style={{ marginTop: Spacing.md }} />
            </ScrollView>
          </View>
        )}
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  center:       { flex: 1, alignItems: 'center', justifyContent: 'center' },
  searchBar:    { margin: Spacing['2xl'], marginBottom: Spacing.sm, padding: Spacing.lg, borderRadius: Radius.md, borderWidth: 1, flexDirection: 'row' },
  searchInput:  { flex: 1, fontSize: FontSize.base },
  list:         { paddingHorizontal: Spacing['2xl'], gap: Spacing.md, paddingBottom: 80 },
  emptyText:    { textAlign: 'center', marginTop: Spacing['4xl'], fontSize: FontSize.base },
  card:         { gap: Spacing.md },
  cardTop:      { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm },
  title:        { fontSize: FontSize.base, fontWeight: FontWeight.bold, marginBottom: 2 },
  provider:     { fontSize: FontSize.sm },
  statusBadge:  { paddingHorizontal: Spacing.sm, paddingVertical: 3, borderRadius: Radius.full, borderWidth: 1 },
  statusText:   { fontSize: FontSize.xs, fontWeight: FontWeight.bold },
  metaRow:      { flexDirection: 'row', gap: Spacing.lg },
  metaText:     { fontSize: FontSize.sm },
  coverageText: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold },
  modal:        { flex: 1, paddingTop: Spacing.xl },
  handle:       { width: 40, height: 4, borderRadius: Radius.full, alignSelf: 'center', marginBottom: Spacing.lg },
  modalScroll:  { padding: Spacing['2xl'], paddingBottom: 60 },
  modalHeader:  { flexDirection: 'row', alignItems: 'flex-start', marginBottom: Spacing.xs },
  modalTitle:   { fontSize: FontSize.xl, fontWeight: FontWeight.extrabold },
  statusBlock:  { padding: Spacing.lg, borderRadius: Radius.md, borderWidth: 1, marginBottom: Spacing.xl, alignItems: 'center' },
  statusBlockText: { fontSize: FontSize.base, fontWeight: FontWeight.bold },
  sectionHead:  { fontSize: FontSize.base, fontWeight: FontWeight.bold, marginBottom: Spacing.sm },
  bullet:       { fontSize: FontSize.sm, marginBottom: Spacing.xs, lineHeight: 20 },
});
