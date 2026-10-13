import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Modal, FlatList, ActivityIndicator, Linking } from 'react-native';
import { matchesStream, profileStream } from '../../utils/streamMatch';
import { normalizeProvince } from '../../config/access';
import { WebView } from 'react-native-webview';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Building2, Search, X, Layers } from 'lucide-react-native';
import { useTheme } from '../../context/ThemeContext';
import { Colors, FontSize, FontWeight, Radius, Spacing } from '../../utils/theme';
import { Card } from '../../components/Card';
import { fetchProfile, fetchUniversities } from '../../api/careers';
import { addBookmark, fetchBookmarks, removeBookmark } from '../../api/features';
import { buildCityMapHtml, groupUniversitiesByCity, sortCitiesNear } from '../../data/pakistanCities';

const Building2Icon: any = Building2;
const SearchIcon: any = Search;
const XIcon: any = X;
const LayersIcon: any = Layers;

interface University {
  id: string;
  name: string;
  city: string;
  province: string;
  sector: 'Public' | 'Private';
  ranking: string;
  lastMerit: string;
  annualFee: string;
  annualFeePkr: number;
  hecRankTier: string;
  disciplines: string[];
  description: string;
  websiteUrl: string;
}

const FALLBACK_UNIVERSITIES: University[] = [
  { id: '1', name: 'NUST — National University of Sciences & Tech', city: 'Islamabad', province: 'Islamabad', sector: 'Public', ranking: 'HEC Recognized', lastMerit: 'Check prospectus', annualFee: 'Contact university', annualFeePkr: 0, hecRankTier: '', disciplines: ['Computer Science', 'Software Engineering', 'Electrical Engineering'], description: 'Shown only when the university list cannot be loaded.', websiteUrl: 'https://nust.edu.pk' },
  { id: '2', name: 'University of the Punjab', city: 'Lahore', province: 'Punjab', sector: 'Public', ranking: 'HEC Recognized', lastMerit: 'Check prospectus', annualFee: 'Contact university', annualFeePkr: 0, hecRankTier: '', disciplines: ['Law', 'Computer Science', 'Commerce'], description: 'Shown only when the university list cannot be loaded.', websiteUrl: 'https://pu.edu.pk' },
  { id: '3', name: 'University of Karachi', city: 'Karachi', province: 'Sindh', sector: 'Public', ranking: 'HEC Recognized', lastMerit: 'Check prospectus', annualFee: 'Contact university', annualFeePkr: 0, hecRankTier: '', disciplines: ['Pharmacy', 'Computer Science'], description: 'Shown only when the university list cannot be loaded.', websiteUrl: 'https://uok.edu.pk' },
];

function toUniversity(u: any, index: number): University {
  return {
    id: String(u.id ?? index),
    name: String(u.name ?? 'University'),
    city: String(u.city ?? ''),
    province: String(u.province ?? ''),
    sector: /private/i.test(String(u.type ?? u.sector)) ? 'Private' : 'Public',
    ranking: String(u.hecRankTier ?? u.ranking ?? (u.isHecRecognized ? 'HEC Recognized' : 'Ranking not listed')),
    lastMerit: u.lastMeritCutoffPct ? `${u.lastMeritCutoffPct}%` : 'Check prospectus',
    annualFee: Number(u.annualFeePkr) > 0 ? `PKR ${Number(u.annualFeePkr).toLocaleString()}` : 'Contact university',
    annualFeePkr: Number(u.annualFeePkr) || 0,
    hecRankTier: String(u.hecRankTier ?? ''),
    disciplines: Array.isArray(u.programs) ? u.programs : [],
    description: String(u.description ?? ''),
    websiteUrl: String(u.websiteUrl || u.officialWebsite || u.official_website || u.official_url || 'https://www.hec.gov.pk/english/universities/pages/recognised.aspx'),
  };
}

export function UniversitiesScreen() {
  const { dark, colors: c } = useTheme();
  const [search, setSearch] = useState('');
  const [selectedProvince, setSelectedProvince] = useState('All');
  const [selectedSector, setSelectedSector] = useState('All');
  const [selectedUni, setSelectedUni] = useState<University | null>(null);
  const [universities, setUniversities] = useState<University[]>([]);
  const [loading, setLoading] = useState(true);
  const [usingFallback, setUsingFallback] = useState(false);
  const [view, setView] = useState<'list' | 'map'>('list');
  const [studentCity, setStudentCity] = useState('');
  const [studentStream, setStudentStream] = useState('');
  const [mapCity, setMapCity] = useState<string | null>(null);
  const [compareList, setCompareList] = useState<University[]>([]);
  const [showCompare, setShowCompare] = useState(false);
  const [compareWarning, setCompareWarning] = useState('');
  const [hecTier, setHecTier] = useState('All');
  const [maxFee, setMaxFee] = useState(1500000);
  const [saved, setSaved] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchUniversities({ limit: '100' })
      .then((rows) => setUniversities(rows.map(toUniversity)))
      .catch(() => { setUniversities(FALLBACK_UNIVERSITIES); setUsingFallback(true); })
      .finally(() => setLoading(false));
    fetchBookmarks().then((marks) => setSaved(new Set(marks.filter((b: any) => /uni/i.test(String(b.type))).map((b: any) => String(b.id || b.itemId))))).catch(() => {});
    fetchProfile().then((profile) => {
      setStudentCity(String(profile?.city || ''));
      setStudentStream(profileStream(profile));
      if (profile?.province) setSelectedProvince(normalizeProvince(profile.province) || profile.province);
    }).catch(() => {});
  }, []);

  const filteredUnis = universities.filter((u) => {
    const q = search.toLowerCase();
    const matchesSearch = !q || u.name.toLowerCase().includes(q) || u.city.toLowerCase().includes(q) || u.disciplines.some((d) => d.toLowerCase().includes(q));
    const matchesProvince = selectedProvince === 'All' || u.province === selectedProvince;
    const matchesSector = selectedSector === 'All' || u.sector === selectedSector;
    const matchesTier = hecTier === 'All' || u.hecRankTier === hecTier || u.ranking === hecTier;
    const matchesFee = !u.annualFeePkr || u.annualFeePkr <= maxFee;
    return matchesSearch && matchesProvince && matchesSector && matchesTier && matchesFee;
  });
  const streamUnis = studentStream
    ? filteredUnis.filter((u) => matchesStream(`${u.name} ${u.disciplines.join(' ')} ${u.description}`, studentStream))
    : filteredUnis;
  const shownUnis = streamUnis.length ? streamUnis : filteredUnis;

  const cityGroups = useMemo(
    () => sortCitiesNear(groupUniversitiesByCity(filteredUnis), studentCity),
    [filteredUnis, studentCity],
  );
  const activeGroup = cityGroups.find((group) => group.city === mapCity) || cityGroups[0] || null;
  const mapHtml = useMemo(
    () => buildCityMapHtml(cityGroups.map((group) => ({ city: group.city, lat: group.lat, lng: group.lng, count: group.universities.length })), studentCity),
    [cityGroups, studentCity],
  );

  const toggleCompare = (uni: University) => {
    if (compareList.some((item) => item.id === uni.id)) {
      setCompareList(compareList.filter((item) => item.id !== uni.id));
      setCompareWarning('');
      return;
    }
    if (compareList.length >= 3) {
      setCompareWarning('You can compare up to 3 universities.');
      return;
    }
    setCompareWarning('');
    setCompareList([...compareList, uni]);
  };

  return (
    <View style={[styles.container, { backgroundColor: c.bg }]}>
      <FlatList
        data={view === 'list' ? shownUnis : []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.content}
        ListEmptyComponent={view === 'list' && !loading ? <Text style={{ color: c.muted }}>No universities match these filters.</Text> : null}
        ListHeaderComponent={
          <Animated.View entering={FadeInDown.duration(350)} style={styles.header}>
            <Text style={styles.eyebrow}>HIGHER EDUCATION DIRECTORY</Text>
            <Text style={[styles.title, { color: c.text }]}>Pakistani Universities</Text>
            <Text style={[styles.subtitle, { color: c.muted }]}>
              Explore HEC-recognized universities, merit cutoffs, tuition fees, and programmes by city.
            </Text>
            {usingFallback && (
              <View style={[styles.verifiedBanner, { backgroundColor: Colors.warning + '22', borderColor: Colors.warning }]}>
                <Text style={[styles.verifiedText, { color: Colors.warning }]}>Could not load the live list. Showing a short fallback.</Text>
              </View>
            )}
            {loading && <ActivityIndicator color={Colors.primary} />}

            <View style={styles.switchRow}>
              {(['list', 'map'] as const).map((mode) => (
                <TouchableOpacity key={mode} onPress={() => setView(mode)} style={[styles.switchBtn, { backgroundColor: view === mode ? Colors.primary : c.surface2 }]}>
                  <Text style={[styles.chipText, { color: view === mode ? '#06110d' : c.text }]}>{mode === 'list' ? 'List' : 'City map'}</Text>
                </TouchableOpacity>
              ))}
              {compareList.length > 0 && (
                <TouchableOpacity onPress={() => setShowCompare(true)} style={[styles.switchBtn, { backgroundColor: Colors.primary }]}>
                  <Text style={[styles.chipText, { color: '#06110d' }]}>Compare ({compareList.length})</Text>
                </TouchableOpacity>
              )}
            </View>
            {!!compareWarning && <Text style={{ color: Colors.warning, fontSize: FontSize.xs }}>{compareWarning}</Text>}

            <View style={[styles.searchBox, { backgroundColor: c.surface2, borderColor: c.border }]}>
              <SearchIcon size={18} color={c.muted} />
              <TextInput value={search} onChangeText={setSearch} placeholder="Search university, city, or programme..." placeholderTextColor={c.muted} style={[styles.searchInput, { color: c.text }]} />
            </View>

            <Text style={[styles.filterLabel, { color: c.muted }]}>Province</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
              {['All', 'Punjab', 'Sindh', 'Islamabad', 'KPK', 'Balochistan'].map((p) => (
                <TouchableOpacity key={p} onPress={() => setSelectedProvince(p)} style={[styles.chip, { backgroundColor: selectedProvince === p ? Colors.primary : c.surface2 }]}>
                  <Text style={[styles.chipText, { color: selectedProvince === p ? '#06110d' : c.text }]}>{p}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <Text style={[styles.filterLabel, { color: c.muted, marginTop: 4 }]}>Sector</Text>
            <View style={styles.filterRow}>
              {['All', 'Public', 'Private'].map((sec) => (
                <TouchableOpacity key={sec} onPress={() => setSelectedSector(sec)} style={[styles.chip, { backgroundColor: selectedSector === sec ? Colors.primary : c.surface2 }]}>
                  <Text style={[styles.chipText, { color: selectedSector === sec ? '#06110d' : c.text }]}>{sec}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={[styles.filterLabel, { color: c.muted, marginTop: 4 }]}>HEC tier</Text>
            <View style={styles.filterRow}>
              {['All', ...Array.from(new Set(universities.map((u) => u.hecRankTier).filter(Boolean)))].slice(0, 6).map((tier) => (
                <TouchableOpacity key={tier} onPress={() => setHecTier(tier)} style={[styles.chip, { backgroundColor: hecTier === tier ? Colors.primary : c.surface2 }]}>
                  <Text style={[styles.chipText, { color: hecTier === tier ? '#06110d' : c.text }]}>{tier}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={[styles.filterLabel, { color: c.muted, marginTop: 4 }]}>Max annual fee: PKR {maxFee.toLocaleString()}</Text>
            <View style={styles.filterRow}>
              {[500000, 1000000, 1500000, 3000000].map((fee) => (
                <TouchableOpacity key={fee} onPress={() => setMaxFee(fee)} style={[styles.chip, { backgroundColor: maxFee === fee ? Colors.primary : c.surface2 }]}>
                  <Text style={[styles.chipText, { color: maxFee === fee ? '#06110d' : c.text }]}>{(fee / 100000).toFixed(0)} Lakh</Text>
                </TouchableOpacity>
              ))}
            </View>

            {view === 'map' && (
              <View style={{ gap: Spacing.sm, marginTop: Spacing.sm }}>
                {!!studentCity && <Text style={{ color: c.text, fontWeight: FontWeight.bold }}>Near you: {studentCity}</Text>}
                <View style={[styles.mapFrame, { borderColor: c.border }]}>
                  <WebView
                    originWhitelist={['*']}
                    source={{ html: mapHtml }}
                    onMessage={(event) => {
                      try { setMapCity(JSON.parse(event.nativeEvent.data).city); } catch { /* ignore */ }
                    }}
                    style={styles.map}
                  />
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
                  {cityGroups.slice(0, 10).map((group) => (
                    <TouchableOpacity key={group.city} onPress={() => setMapCity(group.city)} style={[styles.chip, { backgroundColor: activeGroup?.city === group.city ? Colors.primary : c.surface2 }]}>
                      <Text style={[styles.chipText, { color: activeGroup?.city === group.city ? '#06110d' : c.text }]}>{group.city} · {group.universities.length}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                {activeGroup && (
                  <View style={{ gap: Spacing.sm }}>
                    <Text style={[styles.sectionTitle, { color: c.text }]}>{activeGroup.city}{activeGroup.province ? `, ${activeGroup.province}` : ''}</Text>
                    {activeGroup.universities.map((uni) => (
                      <TouchableOpacity key={uni.id} onPress={() => setSelectedUni(uni)}>
                        <Card dark={dark} style={styles.card}>
                          <Text style={[styles.uniTitle, { color: c.text }]}>{uni.name}</Text>
                          <Text style={[styles.uniCity, { color: c.muted }]}>{uni.sector} · {uni.lastMerit}</Text>
                          <Text style={[styles.uniCity, { color: c.text }]}>{uni.disciplines.slice(0, 4).join(' · ') || 'See the official site for programmes'}</Text>
                        </Card>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            )}
          </Animated.View>
        }
        renderItem={({ item }) => {
          const selected = compareList.some((uni) => uni.id === item.id);
          return (
            <TouchableOpacity onPress={() => setSelectedUni(item)}>
              <Card dark={dark} elevated style={styles.card}>
                <View style={styles.cardTop}>
                  <View style={[styles.iconBox, { backgroundColor: Colors.primary + '20' }]}>
                    <Building2Icon size={22} color={Colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.uniTitle, { color: c.text }]}>{item.name}</Text>
                    <Text style={[styles.uniCity, { color: c.muted }]}>{item.city}, {item.province} · <Text style={{ color: Colors.primary, fontWeight: FontWeight.bold }}>{item.sector}</Text></Text>
                  </View>
                </View>
                <View style={styles.badgeRow}>
                  <Text style={styles.rankBadge}>{item.ranking}</Text>
                  <Text style={[styles.feeBadge, { color: c.text }]}>Fee: {item.annualFee}/yr</Text>
                  <Text style={styles.meritBadge}>Cutoff: {item.lastMerit}</Text>
                </View>
                <TouchableOpacity onPress={() => toggleCompare(item)} style={[styles.compareBtn, { borderColor: selected ? Colors.primary : c.border, backgroundColor: selected ? Colors.primary + '22' : 'transparent' }]}>
                  <LayersIcon size={14} color={Colors.primary} />
                  <Text style={{ color: Colors.primary, fontSize: FontSize.xs, fontWeight: FontWeight.bold }}>{selected ? 'Selected' : 'Compare'}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={async () => {
                  try {
                    if (saved.has(item.id)) { await removeBookmark(item.id); setSaved((s) => { const n = new Set(s); n.delete(item.id); return n; }); }
                    else { await addBookmark({ id: item.id, type: 'university', title: item.name, officialUrl: item.websiteUrl }); setSaved((s) => new Set([...s, item.id])); }
                  } catch { /* ignore */ }
                }}>
                  <Text style={{ color: Colors.primary, fontSize: FontSize.xs, fontWeight: FontWeight.bold }}>{saved.has(item.id) ? 'Saved' : 'Save'}</Text>
                </TouchableOpacity>
              </Card>
            </TouchableOpacity>
          );
        }}
      />

      <Modal visible={!!selectedUni} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: c.surface }]}>
            {selectedUni && (
              <>
                <View style={styles.modalHeader}>
                  <Text style={[styles.modalTitle, { color: c.text }]}>{selectedUni.name}</Text>
                  <TouchableOpacity onPress={() => setSelectedUni(null)} style={styles.closeBtn}><XIcon size={20} color={c.text} /></TouchableOpacity>
                </View>
                <ScrollView>
                  <Text style={[styles.modalDesc, { color: c.muted }]}>{selectedUni.description}</Text>
                  <Text style={[styles.infoItem, { color: c.text }]}>Location: {selectedUni.city}, {selectedUni.province}</Text>
                  <Text style={[styles.infoItem, { color: c.text }]}>Sector: {selectedUni.sector}</Text>
                  <Text style={[styles.infoItem, { color: c.text }]}>Fee: {selectedUni.annualFee} per year</Text>
                  <Text style={[styles.infoItem, { color: c.text }]}>Merit cutoff: {selectedUni.lastMerit}</Text>
                  <TouchableOpacity onPress={() => Linking.openURL(selectedUni.websiteUrl)} style={[styles.compareBtn, { borderColor: Colors.primary, marginBottom: Spacing.md }]}>
                    <Text style={{ color: Colors.primary, fontSize: FontSize.sm, fontWeight: FontWeight.bold }}>Open official website</Text>
                  </TouchableOpacity>
                  <Text style={[styles.sectionTitle, { color: c.text, marginTop: Spacing.md }]}>Programmes</Text>
                  <View style={styles.chipRow}>
                    {selectedUni.disciplines.map((d) => (
                      <View key={d} style={[styles.chip, { backgroundColor: c.surface2 }]}><Text style={[styles.chipText, { color: c.text }]}>{d}</Text></View>
                    ))}
                  </View>
                </ScrollView>
              </>
            )}
          </View>
        </View>
      </Modal>

      <Modal visible={showCompare} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: c.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: c.text }]}>Compare universities</Text>
              <TouchableOpacity onPress={() => setShowCompare(false)} style={styles.closeBtn}><XIcon size={20} color={c.text} /></TouchableOpacity>
            </View>
            <ScrollView>
              {compareList.map((uni) => (
                <Card key={uni.id} dark={dark} style={styles.card}>
                  <Text style={[styles.uniTitle, { color: c.text }]}>{uni.name}</Text>
                  <Text style={[styles.infoItem, { color: c.text }]}>{uni.city} · {uni.sector}</Text>
                  <Text style={[styles.infoItem, { color: c.text }]}>Fee: {uni.annualFee}</Text>
                  <Text style={[styles.infoItem, { color: c.text }]}>Merit: {uni.lastMerit}</Text>
                  <Text style={[styles.infoItem, { color: c.muted }]}>{uni.disciplines.slice(0, 6).join(', ') || 'Programmes on the official site'}</Text>
                </Card>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: Spacing['2xl'], paddingBottom: 60, gap: Spacing.md },
  header: { gap: Spacing.xs, marginBottom: Spacing.sm },
  eyebrow: { color: Colors.primary, fontSize: FontSize.xs, letterSpacing: 1.2, fontWeight: FontWeight.extrabold },
  title: { fontSize: FontSize['3xl'], fontWeight: FontWeight.extrabold },
  subtitle: { fontSize: FontSize.sm, lineHeight: 20 },
  verifiedBanner: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs, borderRadius: Radius.md, borderWidth: 1, marginTop: 4 },
  verifiedText: { fontSize: FontSize.xs, fontWeight: FontWeight.bold },
  switchRow: { flexDirection: 'row', gap: Spacing.xs, flexWrap: 'wrap', marginTop: Spacing.sm },
  switchBtn: { paddingHorizontal: Spacing.md, paddingVertical: 8, borderRadius: Radius.lg },
  searchBox: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: Radius.xl, paddingHorizontal: Spacing.md, gap: Spacing.sm, marginVertical: Spacing.xs },
  searchInput: { flex: 1, paddingVertical: Spacing.sm, fontSize: FontSize.sm },
  filterLabel: { fontSize: FontSize.xs, fontWeight: FontWeight.bold },
  filterRow: { flexDirection: 'row', gap: Spacing.xs },
  chip: { paddingHorizontal: Spacing.md, paddingVertical: 6, borderRadius: Radius.md },
  chipText: { fontSize: FontSize.xs, fontWeight: FontWeight.bold },
  mapFrame: { height: 320, borderWidth: 1, borderRadius: Radius.xl, overflow: 'hidden' },
  map: { flex: 1, backgroundColor: 'transparent' },
  card: { padding: Spacing.lg, borderRadius: Radius['2xl'], gap: Spacing.sm, marginBottom: Spacing.sm },
  cardTop: { flexDirection: 'row', gap: Spacing.md, alignItems: 'center' },
  iconBox: { width: 44, height: 44, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
  uniTitle: { fontSize: FontSize.base, fontWeight: FontWeight.bold },
  uniCity: { fontSize: FontSize.xs, marginTop: 2 },
  badgeRow: { flexDirection: 'row', gap: Spacing.xs, flexWrap: 'wrap', marginTop: Spacing.xs },
  rankBadge: { backgroundColor: Colors.primary + '20', color: Colors.primary, fontSize: FontSize.xs, fontWeight: FontWeight.extrabold, paddingHorizontal: Spacing.sm, paddingVertical: 2, borderRadius: Radius.md },
  feeBadge: { backgroundColor: Colors.accent + '20', fontSize: FontSize.xs, fontWeight: FontWeight.bold, paddingHorizontal: Spacing.sm, paddingVertical: 2, borderRadius: Radius.md },
  meritBadge: { backgroundColor: Colors.gold + '25', color: Colors.gold, fontSize: FontSize.xs, fontWeight: FontWeight.bold, paddingHorizontal: Spacing.sm, paddingVertical: 2, borderRadius: Radius.md },
  compareBtn: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderRadius: Radius.md, paddingHorizontal: Spacing.sm, paddingVertical: 6 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: Radius['2xl'], borderTopRightRadius: Radius['2xl'], padding: Spacing['2xl'], maxHeight: '85%', gap: Spacing.md },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modalTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.extrabold, flex: 1 },
  closeBtn: { padding: Spacing.xs },
  modalDesc: { fontSize: FontSize.sm, lineHeight: 22, marginBottom: Spacing.sm },
  sectionTitle: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, marginBottom: Spacing.xs },
  infoItem: { fontSize: FontSize.sm, marginVertical: 2 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs },
});
