import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Modal, Alert, TextInput, ScrollView } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { X } from 'lucide-react-native';
import { useTheme } from '../../context/ThemeContext';
import { Colors, FontSize, FontWeight, Radius, Spacing } from '../../utils/theme';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { cancelMentorshipRequest, fetchMentorSessions, fetchMyMentors, requestMentorship } from '../../api/features';

const XIcon: any = X;
const KINDS = [
  { id: 'session', label: 'Career session', hint: 'Subject choice, university, or career plan' },
  { id: 'interview', label: 'Interview prep', hint: 'Admission or job interview practice' },
  { id: 'mock_interview', label: 'Mock interview', hint: 'A full practice interview with feedback' },
] as const;
const DURATIONS = [30, 45, 60, 90];
const STATUS: Record<string, string> = {
  requested: 'Waiting for mentor',
  upcoming: 'Confirmed',
  completed: 'Completed',
  declined: 'Declined',
  cancelled: 'Cancelled',
  no_show: 'Missed',
};

function soonIso() {
  const d = new Date(Date.now() + 2 * 60 * 60 * 1000);
  d.setMinutes(0, 0, 0);
  return d.toISOString();
}

export function MentorshipScreen() {
  const { dark, colors: c } = useTheme();
  const [mentors, setMentors] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [selected, setSelected] = useState<any | null>(null);
  const [kind, setKind] = useState<(typeof KINDS)[number]['id']>('session');
  const [topic, setTopic] = useState('');
  const [message, setMessage] = useState('');
  const [minutes, setMinutes] = useState(60);
  const [when, setWhen] = useState(soonIso());
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const [m, s] = await Promise.all([fetchMyMentors(), fetchMentorSessions()]);
      setMentors(m);
      setSessions(s);
    } catch (error: any) {
      Alert.alert('Mentorship', error?.response?.data?.error || 'Could not load mentors.');
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const active = useMemo(() => sessions.filter((s) => ['requested', 'upcoming'].includes(s.status)), [sessions]);
  const past = useMemo(() => sessions.filter((s) => !['requested', 'upcoming'].includes(s.status)), [sessions]);

  const send = async () => {
    if (!selected || !topic.trim()) {
      Alert.alert('Incomplete', 'Write what you want to discuss.');
      return;
    }
    const preferred = new Date(when);
    if (preferred.getTime() < Date.now() + 50 * 60 * 1000) {
      Alert.alert('Pick a later time', 'Choose a time at least one hour from now.');
      return;
    }
    setBusy(true);
    try {
      await requestMentorship({
        mentorId: selected.id,
        kind,
        topic: topic.trim(),
        preferredAt: preferred.toISOString(),
        durationMinutes: minutes,
        message: message.trim(),
      });
      setSelected(null);
      setTopic('');
      setMessage('');
      Alert.alert('Request sent', 'Your mentor will accept or suggest another time.');
      await load();
    } catch (error: any) {
      Alert.alert('Request failed', error?.response?.data?.error || 'Could not send the request.');
    } finally { setBusy(false); }
  };

  const cancel = async (id: string) => {
    try { await cancelMentorshipRequest(id); await load(); }
    catch (error: any) { Alert.alert('Cancel failed', error?.response?.data?.error || 'Could not cancel.'); }
  };

  return (
    <View style={[styles.container, { backgroundColor: c.bg }]}>
      <FlatList
        data={mentors}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          <Animated.View entering={FadeInDown.duration(350)} style={styles.header}>
            <Text style={styles.eyebrow}>MENTORSHIP</Text>
            <Text style={[styles.title, { color: c.text }]}>Mentorship</Text>
            <Text style={[styles.subtitle, { color: c.muted }]}>Request a career session, interview prep, or a mock interview with a mentor.</Text>
            {mentors.length === 0 && <Text style={{ color: c.muted, marginTop: 8 }}>No mentors assigned yet. Ask your admin to add one.</Text>}
            {active.length > 0 && <Text style={[styles.section, { color: c.text }]}>Your sessions</Text>}
            {active.map((s) => (
              <Card key={s.id} dark={dark} style={styles.sessionCard}>
                <Text style={[styles.mentorName, { color: c.text }]}>{s.topic || s.kind}</Text>
                <Text style={{ color: c.muted }}>{STATUS[s.status] || s.status} · {s.scheduledAt ? new Date(s.scheduledAt).toLocaleString() : ''} · {s.durationMinutes || 60} min</Text>
                {s.status === 'requested' && <TouchableOpacity onPress={() => cancel(s.id)}><Text style={{ color: Colors.danger, marginTop: 6 }}>Cancel request</Text></TouchableOpacity>}
              </Card>
            ))}
          </Animated.View>
        }
        renderItem={({ item }) => (
          <Card dark={dark} elevated style={styles.card}>
            <Text style={[styles.mentorName, { color: c.text }]}>{item.name}</Text>
            <Text style={{ color: Colors.primary }}>{item.headline || 'NexStep Mentor'}{item.organization ? ` · ${item.organization}` : ''}</Text>
            {!!item.expertise?.length && <Text style={{ color: c.muted }}>{item.expertise.join(', ')}</Text>}
            <Button title="Request session or interview" onPress={() => setSelected(item)} />
          </Card>
        )}
        ListFooterComponent={past.length ? (
          <View style={{ gap: 8 }}>
            <Text style={[styles.section, { color: c.text }]}>Past sessions</Text>
            {past.map((s) => (
              <Text key={s.id} style={{ color: c.muted }}>{s.topic} · {STATUS[s.status] || s.status}</Text>
            ))}
          </View>
        ) : null}
      />

      <Modal visible={!!selected} animationType="slide" transparent>
        <View style={styles.overlay}>
          <ScrollView style={[styles.sheet, { backgroundColor: c.surface }]} contentContainerStyle={{ gap: Spacing.sm, paddingBottom: 32 }}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: c.text }]}>Request with {selected?.name}</Text>
              <TouchableOpacity onPress={() => setSelected(null)}><XIcon size={20} color={c.text} /></TouchableOpacity>
            </View>
            {KINDS.map((k) => (
              <TouchableOpacity key={k.id} onPress={() => setKind(k.id)} style={[styles.slot, { backgroundColor: kind === k.id ? Colors.primary + '22' : c.surface2 }]}>
                <Text style={[styles.slotText, { color: c.text }]}>{k.label}</Text>
                <Text style={{ color: c.muted, fontSize: FontSize.xs }}>{k.hint}</Text>
              </TouchableOpacity>
            ))}
            <TextInput value={topic} onChangeText={setTopic} placeholder="What do you want to discuss?" placeholderTextColor={c.muted} style={[styles.input, { color: c.text, borderColor: c.border }]} />
            <TextInput value={message} onChangeText={setMessage} placeholder="Message (optional)" placeholderTextColor={c.muted} multiline style={[styles.input, { color: c.text, borderColor: c.border, minHeight: 72 }]} />
            <Text style={{ color: c.muted }}>Preferred time (ISO). Default is two hours from now.</Text>
            <TextInput value={when} onChangeText={setWhen} placeholderTextColor={c.muted} style={[styles.input, { color: c.text, borderColor: c.border }]} />
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {DURATIONS.map((m) => (
                <TouchableOpacity key={m} onPress={() => setMinutes(m)} style={[styles.chip, { backgroundColor: minutes === m ? Colors.primary : c.surface2 }]}>
                  <Text style={{ color: minutes === m ? '#06110d' : c.text, fontWeight: FontWeight.bold }}>{m} min</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Button title="Send request" onPress={send} loading={busy} />
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: Spacing['2xl'], paddingBottom: 60, gap: Spacing.md },
  header: { marginBottom: Spacing.sm, gap: 6 },
  eyebrow: { color: Colors.primary, fontSize: FontSize.xs, letterSpacing: 1.2, fontWeight: FontWeight.extrabold },
  title: { fontSize: FontSize['3xl'], fontWeight: FontWeight.extrabold },
  subtitle: { fontSize: FontSize.sm, lineHeight: 20 },
  section: { fontSize: FontSize.base, fontWeight: FontWeight.bold, marginTop: 12 },
  card: { padding: Spacing.xl, borderRadius: Radius['2xl'], gap: Spacing.sm, marginBottom: Spacing.sm },
  sessionCard: { padding: Spacing.md, borderRadius: Radius.lg, marginTop: 8 },
  mentorName: { fontSize: FontSize.base, fontWeight: FontWeight.bold },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet: { maxHeight: '88%', borderTopLeftRadius: Radius['2xl'], borderTopRightRadius: Radius['2xl'], padding: Spacing['2xl'] },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modalTitle: { fontSize: FontSize.base, fontWeight: FontWeight.extrabold, flex: 1 },
  slot: { padding: Spacing.md, borderRadius: Radius.lg },
  slotText: { fontSize: FontSize.sm, fontWeight: FontWeight.bold },
  input: { borderWidth: 1, borderRadius: Radius.md, padding: Spacing.md },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: Radius.full },
});
