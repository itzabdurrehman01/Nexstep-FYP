/**
 * mobile/src/screens/CareerAIScreen.tsx
 * AI Career Recommendations — shows ranked career cards with match scores
 * and opens a detail sheet explaining WHY each career was recommended.
 * Pure React Native — no WebView.
 */
import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  Modal, ActivityIndicator, RefreshControl,
  FlatList,
} from 'react-native';
import { fetchCareerMatches, fetchCareers, fetchProfile, fetchRecommendations, chatWithAI } from '../../api/careers';
import { compareCareers, setSkillGapCareer, setTargetCareer } from '../../api/features';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { Colors, Spacing, FontSize, FontWeight, Radius } from '../../utils/theme';
import { useTheme } from '../../context/ThemeContext';

interface Career {
  id: string; title: string; demandLevel: string;
  avgSalaryPkrMonth: number; growthDemand: string;
  requiredSkills: string[]; riasecMatch: string[];
  matchScore?: number; why?: string[]; entryTests?: string[]; topUniversities?: any[];
}

function scoreColor(score: number) {
  if (score >= 75) return Colors.success;
  if (score >= 50) return Colors.warning;
  return Colors.danger;
}

function demandBadgeColor(level: string) {
  if (level === 'Very High') return Colors.success;
  if (level === 'High')      return Colors.primary;
  return Colors.warning;
}

/** Simple deterministic match score based on profile vs career */
function computeScore(profile: any, career: Career): number {
  let score = 20; // base
  const userSkills = (profile?.skills ?? []).map((s: any) => (typeof s === 'string' ? s : s.name ?? '').toLowerCase());
  const required   = (career.requiredSkills ?? []).map(s => s.toLowerCase());
  const matched    = required.filter(r => userSkills.some((u: string) => u.includes(r.slice(0,5)) || r.includes(u.slice(0,5))));
  if (required.length) score += Math.round((matched.length / required.length) * 40);
  const riasec = career.riasecMatch ?? [];
  const userCode = (profile?.topRiasecCluster ?? '').charAt(0);
  if (userCode && riasec.includes(userCode)) score += 25;
  if (career.demandLevel === 'Very High') score += 10;
  else if (career.demandLevel === 'High') score += 7;
  return Math.min(100, score);
}

interface Props { onNavigate: (r: string) => void }

export function CareerAIScreen({ onNavigate }: Props) {
  const { dark, colors: c } = useTheme();

  const [careers,    setCareers]    = useState<Career[]>([]);
  const [profile,    setProfile]    = useState<any>(null);
  const [sortBy,     setSortBy]     = useState<'balanced' | 'interest' | 'marks'>('balanced');
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selected,   setSelected]   = useState<Career | null>(null);
  const [chatOpen,   setChatOpen]   = useState(false);
  const [chatMsg,    setChatMsg]    = useState('');
  const [chatReply,  setChatReply]  = useState('');
  const [chatLoading,setChatLoading]= useState(false);
  const [picked, setPicked] = useState<string[]>([]);
  const [compare, setCompare] = useState<any[] | null>(null);
  const [targetTitle, setTargetTitle] = useState('');

  const loadData = useCallback(async () => {
    try {
      const prof = await fetchProfile();
      const matches = await fetchCareerMatches(sortBy).catch(() => null);
      if (matches?.matches?.length) {
        setCareers(matches.matches);
      } else {
        const recommendations = prof ? await fetchRecommendations(prof).catch(() => []) : [];
        setCareers(recommendations.length ? recommendations : await fetchCareers());
      }
      setProfile(prof);
      setTargetTitle(prof?.targetCareer || matches?.profile?.targetCareer || '');
    } catch { /* handled */ }
    finally { setLoading(false); setRefreshing(false); }
  }, [sortBy]);

  useEffect(() => { loadData(); }, [loadData]);

  const ranked = careers
    .map(car => ({ ...car, score: car.matchScore || computeScore(profile, car) }))
    .sort((a, b) => b.score - a.score);

  const sendChat = async () => {
    if (!chatMsg.trim()) return;
    setChatLoading(true);
    const question = chatMsg.trim();
    setChatMsg('');
    try {
      const reply = await chatWithAI(question, profile);
      setChatReply(reply);
    } catch {
      setChatReply('AI counselor is unavailable right now. Please try again in a moment.');
    } finally {
      setChatLoading(false);
    }
  };

  if (loading) {
    return <View style={[styles.center, { backgroundColor: c.bg }]}><ActivityIndicator color={Colors.primary} size="large" /></View>;
  }

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: c.border }]}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerTitle, { color: c.text }]}>Career AI</Text>
          <Text style={[styles.headerSub, { color: c.muted }]}>
            {sortBy === 'interest' ? 'Careers from your interest quiz' : sortBy === 'marks' ? 'Careers from your marks and group' : 'Ranked by interest, marks and skills'}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          <TouchableOpacity
            onPress={() => setSelected(ranked[0])}
            style={[styles.chatBtn, { backgroundColor: Colors.accent }]}
          >
            <Text style={styles.chatBtnText}>👨‍👩‍👧 Parent Summary</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setChatOpen(true)}
            style={[styles.chatBtn, { backgroundColor: Colors.primary }]}
          >
            <Text style={styles.chatBtnText}>🤖 Ask AI</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.sortRow}>
        {([
          ['balanced', 'Both'],
          ['interest', 'By interest'],
          ['marks', 'By marks'],
        ] as const).map(([id, label]) => (
          <TouchableOpacity
            key={id}
            onPress={() => { setSortBy(id); setLoading(true); }}
            style={[styles.sortChip, { backgroundColor: sortBy === id ? Colors.primary : c.surface, borderColor: sortBy === id ? Colors.primary : c.border }]}
          >
            <Text style={{ color: sortBy === id ? '#fff' : c.text, fontWeight: FontWeight.semibold, fontSize: FontSize.sm }}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {picked.length >= 2 && (
        <TouchableOpacity
          style={[styles.quizBanner, { backgroundColor: Colors.primaryLight, borderColor: Colors.primary }]}
          onPress={async () => {
            try { setCompare(await compareCareers(picked)); }
            catch { setCompare(null); }
          }}
        >
          <Text style={{ color: Colors.primaryHover, fontWeight: FontWeight.semibold }}>Compare {picked.length} selected careers</Text>
        </TouchableOpacity>
      )}
      {!!targetTitle && <Text style={{ marginHorizontal: Spacing['2xl'], marginTop: Spacing.sm, color: Colors.primary }}>Target career: {targetTitle}</Text>}
      {compare && (
        <View style={{ paddingHorizontal: Spacing['2xl'], gap: 6 }}>
          {compare.map((row: any) => (
            <Text key={row.career?.id || row.id} style={{ color: c.text }}>{row.career?.title || row.title} · {row.score ?? row.matchScore}%</Text>
          ))}
        </View>
      )}
      <TouchableOpacity
        style={[styles.quizBanner, { backgroundColor: Colors.primaryLight, borderColor: Colors.primary }]}
        onPress={() => onNavigate('quiz')}
        accessibilityRole="button"
      >
        <Text style={{ color: Colors.primaryHover, fontWeight: FontWeight.semibold, fontSize: FontSize.sm }}>
          {profile?.topRiasecCluster
            ? `Interest: ${profile.topRiasecCluster}  ·  Retake quiz to change →`
            : 'Take the interest quiz for personalised matches →'}
        </Text>
      </TouchableOpacity>

      <FlatList
        data={ranked}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} tintColor={Colors.primary} />}
        renderItem={({ item, index }) => (
          <TouchableOpacity
            onPress={() => setSelected(item)}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel={`${item.title} — ${item.score}% match`}
          >
            <Card style={styles.careerCard} dark={dark} elevated={index === 0}>
              {/* Top row */}
              <View style={styles.cardTop}>
                <View style={styles.cardMeta}>
                  {index < 3 && (
                    <Text style={styles.rankBadge}>
                      {index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'} Top Match
                    </Text>
                  )}
                  <Text style={[styles.careerTitle, { color: c.text }]}>{item.title}</Text>
                  <View style={styles.demandRow}>
                    <View style={[styles.demandBadge, { backgroundColor: demandBadgeColor(item.demandLevel) + '20', borderColor: demandBadgeColor(item.demandLevel) }]}>
                      <Text style={[styles.demandText, { color: demandBadgeColor(item.demandLevel) }]}>{item.demandLevel} Demand</Text>
                    </View>
                  </View>
                </View>
                {/* Score circle */}
                <View style={[styles.scoreCircle, { borderColor: scoreColor(item.score) }]}>
                  <Text style={[styles.scoreNum, { color: scoreColor(item.score) }]}>{item.score}</Text>
                  <Text style={[styles.scorePct, { color: c.muted }]}>%</Text>
                </View>
              </View>

              {/* Salary */}
              <View style={[styles.salaryRow, { borderTopColor: c.border }]}>
                <Text style={[styles.salaryLabel, { color: c.muted }]}>Entry salary</Text>
                <Text style={[styles.salaryValue, { color: Colors.primary }]}>
                  PKR {(item.avgSalaryPkrMonth / 1000).toFixed(0)}k / mo
                </Text>
              </View>

              {/* Skills preview */}
              <View style={styles.skillsRow}>
                {(item.requiredSkills ?? []).slice(0, 3).map(sk => (
                  <View key={sk} style={[styles.skillTag, { backgroundColor: c.surface2, borderColor: c.border }]}>
                    <Text style={[styles.skillText, { color: c.muted }]}>{sk}</Text>
                  </View>
                ))}
                {(item.requiredSkills?.length ?? 0) > 3 && (
                  <View style={[styles.skillTag, { backgroundColor: c.surface2, borderColor: c.border }]}>
                    <Text style={[styles.skillText, { color: c.muted }]}>+{item.requiredSkills.length - 3} more</Text>
                  </View>
                )}
              </View>

              <TouchableOpacity onPress={() => setPicked((s) => s.includes(item.id) ? s.filter((x) => x !== item.id) : s.length >= 3 ? s : [...s, item.id])}>
                <Text style={[styles.detailHint, { color: picked.includes(item.id) ? Colors.gold : Colors.primary }]}>{picked.includes(item.id) ? 'Selected for compare' : 'Select to compare'}</Text>
              </TouchableOpacity>
              <Text style={[styles.detailHint, { color: Colors.primary }]}>Tap for WHY details →</Text>
            </Card>
          </TouchableOpacity>
        )}
      />

      {/* Career Detail Modal */}
      <Modal visible={!!selected} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setSelected(null)}>
        {selected && (
          <View style={[styles.modalContainer, { backgroundColor: c.bg }]}>
            <View style={[styles.modalHandle, { backgroundColor: c.border }]} />
            <ScrollView contentContainerStyle={styles.modalScroll}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: c.text }]}>{selected.title}</Text>
                <TouchableOpacity onPress={() => setSelected(null)} style={styles.closeBtn} accessibilityLabel="Close">
                  <Text style={[styles.closeBtnText, { color: c.muted }]}>✕</Text>
                </TouchableOpacity>
              </View>

              <View style={[styles.scoreRow, { backgroundColor: Colors.primary + '15', borderColor: Colors.primary }]}>
                <Text style={[styles.scoreRowText, { color: Colors.primary }]}>
                  {(selected as any).score}% Match Score
                </Text>
              </View>

              <Text style={[styles.sectionHead, { color: c.text }]}>Why This Career?</Text>
              <Text style={[styles.bodyText, { color: c.muted }]}>
                {Array.isArray((selected as any).why) && (selected as any).why.length
                  ? (selected as any).why.join('\n• ')
                  : (selected as any).score >= 70
                  ? `${selected.title} aligns strongly with your academic background and interests. Your profile shows good compatibility with the core requirements of this career.`
                  : (selected as any).score >= 45
                  ? `${selected.title} is a potential fit with some development needed. Building the missing skills listed below will significantly improve your readiness.`
                  : `${selected.title} requires significant skill development. Consider completing the RIASEC quiz and updating your profile for a more accurate assessment.`}
              </Text>

              {(selected as any).entryTests?.length ? <>
                <Text style={[styles.sectionHead, { color: c.text }]}>Relevant Entry Tests</Text>
                <Text style={[styles.bodyText, { color: c.muted }]}>{(selected as any).entryTests.join(' • ')}</Text>
              </> : null}

              <Text style={[styles.sectionHead, { color: c.text }]}>Required Skills</Text>
              <View style={styles.skillsGrid}>
                {(selected.requiredSkills ?? []).map(sk => {
                  const userSkills = (profile?.skills ?? []).map((s: any) => (typeof s === 'string' ? s : s.name ?? '').toLowerCase());
                  const hasIt = userSkills.some((u: string) => u.includes(sk.toLowerCase().slice(0, 5)) || sk.toLowerCase().includes(u.slice(0, 5)));
                  return (
                    <View key={sk} style={[styles.skillTag, { backgroundColor: hasIt ? Colors.success + '20' : Colors.danger + '15', borderColor: hasIt ? Colors.success : Colors.danger }]}>
                      <Text style={{ fontSize: FontSize.xs, color: hasIt ? Colors.success : Colors.danger, fontWeight: FontWeight.semibold }}>
                        {hasIt ? '✓ ' : '✗ '}{sk}
                      </Text>
                    </View>
                  );
                })}
              </View>

              <Text style={[styles.sectionHead, { color: c.text }]}>Salary Range</Text>
              <View style={[styles.salaryBlock, { backgroundColor: c.surface2, borderColor: c.border }]}>
                <Text style={[styles.salaryBig, { color: Colors.primary }]}>
                  PKR {(selected.avgSalaryPkrMonth / 1000).toFixed(0)}k – {(selected.avgSalaryPkrMonth * 2 / 1000).toFixed(0)}k / month
                </Text>
                <Text style={[styles.salaryNote, { color: c.muted }]}>Entry to mid-level in Pakistan</Text>
              </View>

              <Text style={[styles.sectionHead, { color: c.text }]}>Demand Outlook</Text>
              <Text style={[styles.bodyText, { color: c.muted }]}>
                {selected.demandLevel} demand — {selected.growthDemand ?? 'Growing field with strong prospects in Pakistan and globally.'}
              </Text>

              {!!(selected as any).factors?.length && (
                <>
                  <Text style={[styles.sectionHead, { color: c.text }]}>Match factors</Text>
                  {(selected as any).factors.map((f: any, i: number) => (
                    <Text key={i} style={[styles.bodyText, { color: c.muted }]}>{f.label || f.name || f.note}: {f.score ?? f.value ?? ''}</Text>
                  ))}
                </>
              )}
              <Button label="Set as my target" onPress={async () => { try { const title = await setTargetCareer(selected.id); setTargetTitle(title || selected.title); } catch { /* ignore */ } }} style={{ marginTop: Spacing['2xl'] }} />
              <Button label="Start Skill Gap Analysis" onPress={() => { setSkillGapCareer(selected.id); setSelected(null); onNavigate('skillGap'); }} style={{ marginTop: Spacing.md }} />
              <Button label="View Career Roadmap" onPress={() => { setSelected(null); onNavigate('roadmap'); }} variant="secondary" style={{ marginTop: Spacing.md }} />
            </ScrollView>
          </View>
        )}
      </Modal>

      {/* AI Chat Modal */}
      <Modal visible={chatOpen} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setChatOpen(false)}>
        <View style={[styles.modalContainer, { backgroundColor: c.bg }]}>
          <View style={[styles.modalHandle, { backgroundColor: c.border }]} />
          <View style={[styles.modalHeader, { borderBottomColor: c.border, borderBottomWidth: 1 }]}>
            <Text style={[styles.modalTitle, { color: c.text }]}>🤖 AI Career Counselor</Text>
            <TouchableOpacity onPress={() => setChatOpen(false)} accessibilityLabel="Close chat">
              <Text style={[styles.closeBtnText, { color: c.muted }]}>✕</Text>
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.chatScroll}>
            <Card dark={dark} style={styles.chatIntroCard}>
              <Text style={[styles.bodyText, { color: c.muted }]}>
                Ask anything about careers, university admissions, scholarships, or skill development in Pakistan.
              </Text>
            </Card>
            {chatReply ? (
              <Card dark={dark} style={[styles.chatReply, { borderLeftColor: Colors.primary }]}>
                <Text style={[styles.bodyText, { color: c.text }]}>{chatReply}</Text>
              </Card>
            ) : null}
            {chatLoading && <ActivityIndicator color={Colors.primary} style={{ marginTop: Spacing.xl }} />}
          </ScrollView>
          <View style={[styles.chatInputRow, { borderTopColor: c.border, backgroundColor: c.bg }]}>
            <View style={{ flex: 1 }}>
              <Input
                value={chatMsg}
                onChangeText={setChatMsg}
                placeholder="Ask a career question..."
                dark={dark}
                onSubmitEditing={sendChat}
                returnKeyType="send"
              />
            </View>
            <Button label="Send" onPress={sendChat} loading={chatLoading} style={styles.sendBtn} />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const Colors2 = { primaryHover: '#047857' } as any;

const styles = StyleSheet.create({
  center:         { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: Spacing['2xl'], borderBottomWidth: 1 },
  headerTitle:    { fontSize: FontSize.xl, fontWeight: FontWeight.extrabold },
  headerSub:      { fontSize: FontSize.xs, marginTop: 2 },
  chatBtn:        { flexDirection: 'row', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, borderRadius: Radius.full, alignItems: 'center' },
  chatBtnText:    { color: '#fff', fontSize: FontSize.sm, fontWeight: FontWeight.semibold },
  quizBanner:     { margin: Spacing['2xl'], marginBottom: 0, padding: Spacing.lg, borderRadius: Radius.md, borderWidth: 1, borderStyle: 'dashed' },
  sortRow:        { flexDirection: 'row', gap: Spacing.sm, paddingHorizontal: Spacing['2xl'], paddingTop: Spacing.lg },
  sortChip:       { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: Radius.full, borderWidth: 1 },
  list:           { padding: Spacing['2xl'], gap: Spacing.lg, paddingBottom: 100 },
  careerCard:     { gap: Spacing.md },
  cardTop:        { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  cardMeta:       { flex: 1 },
  rankBadge:      { fontSize: FontSize.xs, color: Colors.warning, fontWeight: FontWeight.bold, marginBottom: Spacing.xs },
  careerTitle:    { fontSize: FontSize.lg, fontWeight: FontWeight.bold, marginBottom: Spacing.xs },
  demandRow:      { flexDirection: 'row' },
  demandBadge:    { paddingHorizontal: Spacing.sm, paddingVertical: 2, borderRadius: Radius.full, borderWidth: 1 },
  demandText:     { fontSize: FontSize.xs, fontWeight: FontWeight.semibold },
  scoreCircle:    { width: 56, height: 56, borderRadius: 28, borderWidth: 3, alignItems: 'center', justifyContent: 'center', marginLeft: Spacing.lg },
  scoreNum:       { fontSize: FontSize.lg, fontWeight: FontWeight.extrabold, lineHeight: 20 },
  scorePct:       { fontSize: FontSize.xs },
  salaryRow:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: Spacing.md, borderTopWidth: 1 },
  salaryLabel:    { fontSize: FontSize.sm },
  salaryValue:    { fontSize: FontSize.sm, fontWeight: FontWeight.bold },
  skillsRow:      { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs },
  skillsGrid:     { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs, marginBottom: Spacing.xl },
  skillTag:       { paddingHorizontal: Spacing.sm, paddingVertical: 3, borderRadius: Radius.sm, borderWidth: 1 },
  skillText:      { fontSize: FontSize.xs },
  detailHint:     { fontSize: FontSize.xs, fontWeight: FontWeight.semibold, marginTop: Spacing.xs },
  modalContainer: { flex: 1, paddingTop: Spacing.xl },
  modalHandle:    { width: 40, height: 4, borderRadius: Radius.full, alignSelf: 'center', marginBottom: Spacing.lg },
  modalScroll:    { padding: Spacing['2xl'], paddingBottom: 60 },
  modalHeader:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing['2xl'], paddingBottom: Spacing.lg },
  modalTitle:     { fontSize: FontSize.xl, fontWeight: FontWeight.extrabold, flex: 1 },
  closeBtn:       { padding: Spacing.sm },
  closeBtnText:   { fontSize: FontSize.xl },
  scoreRow:       { padding: Spacing.lg, borderRadius: Radius.md, borderWidth: 1, marginBottom: Spacing['2xl'], alignItems: 'center' },
  scoreRowText:   { fontSize: FontSize.xl, fontWeight: FontWeight.extrabold },
  sectionHead:    { fontSize: FontSize.base, fontWeight: FontWeight.bold, marginBottom: Spacing.sm, marginTop: Spacing.xl },
  bodyText:       { fontSize: FontSize.base, lineHeight: 22 },
  salaryBlock:    { padding: Spacing.lg, borderRadius: Radius.md, borderWidth: 1, alignItems: 'center' },
  salaryBig:      { fontSize: FontSize.xl, fontWeight: FontWeight.bold },
  salaryNote:     { fontSize: FontSize.sm, marginTop: Spacing.xs },
  chatScroll:     { padding: Spacing['2xl'], paddingBottom: 20 },
  chatIntroCard:  { marginBottom: Spacing.xl },
  chatReply:      { borderLeftWidth: 3, paddingLeft: Spacing.lg },
  chatInputRow:   { flexDirection: 'row', alignItems: 'center', padding: Spacing.lg, borderTopWidth: 1, gap: Spacing.sm },
  sendBtn:        { minWidth: 80 },
});
