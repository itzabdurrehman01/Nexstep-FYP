import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Alert, ActivityIndicator, RefreshControl, TextInput } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Calendar, Bell, Clock, CheckCircle2, AlertTriangle } from 'lucide-react-native';
import { useTheme } from '../../context/ThemeContext';
import { Colors, FontSize, FontWeight, Radius, Spacing } from '../../utils/theme';
import { Card } from '../../components/Card';
import { createAlert, deleteAlert, fetchAlertsAndNotifications, fetchProfile, markAllNotificationsRead, updateAlert, updateProfile } from '../../api/careers';
import { fetchMentorSessions } from '../../api/features';

const UPCOMING_DEADLINES = [
  { id: '1', title: 'FAST-NUCES Fall 2026 Admissions Closing', category: 'University Admissions', date: 'August 28, 2026', daysLeft: '13 Days Left', urgency: 'high' },
  { id: '2', title: 'Ehsaas Undergraduate Scholarship Application', category: 'Scholarship', date: 'October 30, 2026', daysLeft: '76 Days Left', urgency: 'normal' },
  { id: '3', title: 'NUST NET-4 Entry Test Registration', category: 'Entrance Test', date: 'September 15, 2026', daysLeft: '31 Days Left', urgency: 'normal' },
];

export function CalendarNotifScreen() {
  const { dark, colors: c } = useTheme();
  const [admissionAlerts, setAdmissionAlerts] = useState(true);
  const [scholarshipAlerts, setScholarshipAlerts] = useState(true);
  const [examReminders, setExamReminders] = useState(true);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTitle, setNewTitle] = useState('');
  const [creating, setCreating] = useState(false);
  const [alertType, setAlertType] = useState('deadline');
  const [sessions, setSessions] = useState<any[]>([]);
  const load = async () => {
    setLoading(true);
    try {
      const result = await fetchAlertsAndNotifications();
      setAlerts(result.alerts);
      setNotifications(result.notifications);
      const [profile, mySessions] = await Promise.all([fetchProfile().catch(() => null), fetchMentorSessions().catch(() => [])]);
      setSessions(mySessions);
      if (profile?.preferences) {
        setAdmissionAlerts(profile.preferences.pushNotif !== false);
        setScholarshipAlerts(profile.preferences.scholarshipAlerts !== false);
        setExamReminders(profile.preferences.examReminders !== false);
      }
    } catch (error: any) {
      Alert.alert('Could not load alerts', error?.response?.data?.error ?? 'Please try again.');
    } finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, []);
  const complete = async (item: any) => {
    await updateAlert(item.id, { ...item, status: 'done' });
    await load();
  };
  const remove = async (id: string) => { await deleteAlert(id); await load(); };

  return (
    <ScrollView style={[styles.container, { backgroundColor: c.bg }]} contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={() => void load()} tintColor={Colors.primary} />}>
      <Animated.View entering={FadeInDown.duration(350)} style={styles.header}>
        <Text style={styles.eyebrow}>ACADEMIC TRACKER & NOTIFICATIONS</Text>
        <Text style={[styles.title, { color: c.text }]}>Calendar & Alerts</Text>
        <Text style={[styles.subtitle, { color: c.muted }]}>
          Reminders pop up here on your phone and are also emailed to your Gmail when they are due.
        </Text>
      </Animated.View>

      <Card dark={dark} elevated style={styles.card}>
        <Text style={[styles.cardTitle, { color: c.text }]}>Create a reminder</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          {['deadline', 'exam', 'admission', 'scholarship', 'session', 'custom', 'other'].map((t) => (
            <TouchableOpacity key={t} onPress={() => setAlertType(t)} style={{ paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, backgroundColor: alertType === t ? Colors.primary : c.surface2 }}>
              <Text style={{ color: alertType === t ? '#06110d' : c.text, fontSize: FontSize.xs, fontWeight: FontWeight.bold }}>{t}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <TextInput
          value={newTitle}
          onChangeText={setNewTitle}
          placeholder="e.g. NUST NET registration"
          placeholderTextColor={c.muted}
          style={{ borderWidth: 1, borderColor: c.border, borderRadius: Radius.md, padding: Spacing.md, color: c.text }}
        />
        <TouchableOpacity
          disabled={!newTitle.trim() || creating}
          onPress={async () => {
            setCreating(true);
            try {
              const when = new Date(Date.now() + 24 * 3600 * 1000);
              when.setMinutes(0, 0, 0);
              await createAlert({ type: alertType, title: newTitle.trim(), alertAt: when.toISOString(), remindBeforeMinutes: 60, repeat: 'none' });
              setNewTitle('');
              Alert.alert('Reminder saved', 'You will get an in-app alert and an email to your Gmail one hour before.');
              await load();
            } catch (error: any) {
              Alert.alert('Could not save reminder', error?.response?.data?.error || 'Please try again.');
            } finally { setCreating(false); }
          }}
          style={{ backgroundColor: Colors.primary, height: 44, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center', opacity: !newTitle.trim() || creating ? 0.5 : 1 }}
        >
          <Text style={{ color: '#fff', fontWeight: FontWeight.bold }}>Save reminder (email + alert)</Text>
        </TouchableOpacity>
      </Card>

      {/* Deadlines list */}
      {sessions.length > 0 && (
        <Card dark={dark} elevated style={styles.card}>
          <Text style={[styles.cardTitle, { color: c.text }]}>Mentor sessions</Text>
          {sessions.map((s) => (
            <Text key={s.id} style={{ color: c.muted }}>{s.topic || s.kind} · {s.status} · {s.scheduledAt ? new Date(s.scheduledAt).toLocaleString() : ''}</Text>
          ))}
        </Card>
      )}
      <Card dark={dark} elevated style={styles.card}>
        <Text style={[styles.cardTitle, { color: c.text }]}>Upcoming Deadlines</Text>
        {loading && alerts.length === 0 && <ActivityIndicator color={Colors.primary} />}
        {!loading && alerts.length === 0 && <Text style={{ color: c.muted }}>No personal alerts yet. Create them on NexStep web and they will appear here instantly.</Text>}
        {alerts.map((item) => (
          <View key={item.id} style={[styles.deadlineRow, { backgroundColor: c.surface2 }]}> 
            <View style={{ flex: 1 }}>
              <Text style={[styles.dTitle, { color: c.text }]}>{item.title}</Text>
              <Text style={[styles.dCat, { color: c.muted }]}>{item.type} · {new Date(item.alertAt).toLocaleString()}</Text>
              <View style={{ flexDirection: 'row', gap: 14, marginTop: 6 }}>
                {item.status !== 'done' && <TouchableOpacity onPress={() => void complete(item)}><Text style={{ color: Colors.primary, fontWeight: '700' }}>Mark done</Text></TouchableOpacity>}
                <TouchableOpacity onPress={() => void remove(item.id)}><Text style={{ color: Colors.danger, fontWeight: '700' }}>Delete</Text></TouchableOpacity>
              </View>
            </View>
            <View style={[styles.daysBadge, { backgroundColor: item.status === 'done' ? c.border : Colors.primary + '20' }]}> 
              <Text style={{ color: item.status === 'done' ? c.muted : Colors.primary, fontSize: FontSize.xs, fontWeight: FontWeight.extrabold }}>{item.status}</Text>
            </View>
          </View>
        ))}
      </Card>

      <Card dark={dark} elevated style={styles.card}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={[styles.cardTitle, { color: c.text }]}>Notifications ({notifications.filter((n) => !n.isRead && !n.is_read).length} unread)</Text>
          <TouchableOpacity onPress={async () => { await markAllNotificationsRead(); await load(); }}><Text style={{ color: Colors.primary }}>Mark all read</Text></TouchableOpacity>
        </View>
        {notifications.slice(0, 10).map((item) => <View key={item.id} style={[styles.deadlineRow, { backgroundColor: c.surface2 }]}><View style={{ flex: 1 }}><Text style={[styles.dTitle, { color: c.text }]}>{item.title}</Text><Text style={[styles.dCat, { color: c.muted }]}>{item.body ?? item.message}</Text></View></View>)}
      </Card>

      {/* Notification Preferences */}
      <Card dark={dark} elevated style={styles.card}>
        <Text style={[styles.cardTitle, { color: c.text }]}>Push Notification Settings</Text>

        <View style={styles.switchRow}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.switchLabel, { color: c.text }]}>University Admission Reminders</Text>
            <Text style={[styles.switchDesc, { color: c.muted }]}>Alerts 3 days before cutoff</Text>
          </View>
          <Switch value={admissionAlerts} onValueChange={async (v) => { setAdmissionAlerts(v); const p = await fetchProfile().catch(() => ({})); await updateProfile({ preferences: { ...(p?.preferences || {}), pushNotif: v } }); }} trackColor={{ false: c.border, true: Colors.primary }} />
        </View>

        <View style={styles.switchRow}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.switchLabel, { color: c.text }]}>Scholarship Deadline Alerts</Text>
            <Text style={[styles.switchDesc, { color: c.muted }]}>Closing date notifications</Text>
          </View>
          <Switch value={scholarshipAlerts} onValueChange={setScholarshipAlerts} trackColor={{ false: c.border, true: Colors.primary }} />
        </View>

        <View style={styles.switchRow}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.switchLabel, { color: c.text }]}>Exam & ECAT Test Dates</Text>
            <Text style={[styles.switchDesc, { color: c.muted }]}>Roll number & center alerts</Text>
          </View>
          <Switch value={examReminders} onValueChange={setExamReminders} trackColor={{ false: c.border, true: Colors.primary }} />
        </View>
      </Card>
    </ScrollView>
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
  cardTitle: { fontSize: FontSize.base, fontWeight: FontWeight.bold, marginBottom: Spacing.xs },
  deadlineRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.md, borderRadius: Radius.lg, marginBottom: 4 },
  dTitle: { fontSize: FontSize.sm, fontWeight: FontWeight.bold },
  dCat: { fontSize: FontSize.xs, marginTop: 2 },
  daysBadge: { paddingHorizontal: Spacing.sm, paddingVertical: 4, borderRadius: Radius.md },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: Spacing.xs },
  switchLabel: { fontSize: FontSize.sm, fontWeight: FontWeight.bold },
  switchDesc: { fontSize: FontSize.xs },
});
