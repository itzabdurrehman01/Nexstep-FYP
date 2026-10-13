/**
 * mobile/src/screens/SettingsScreen.tsx
 * App settings: password change, notifications, account deletion, logout.
 */
import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert, Switch } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { apiClient } from '../../api/client';
import { fetchProfile, updateProfile } from '../../api/careers';
import { Spacing, FontSize, FontWeight } from '../../utils/theme';
import { Card } from '../../components/Card';
import { ThemePreference, useTheme } from '../../context/ThemeContext';
import { passwordProblem } from '../../auth/accountRules';

type SettingItem =
  | { label: string; type: 'info'; value: string | undefined }
  | { label: string; type: 'action' | 'danger'; onPress: () => void }
  | { label: string; type: 'toggle'; value: boolean; onToggle: (value: boolean) => void };

type SettingsSection = {
  title: string;
  items: SettingItem[];
};

export function SettingsScreen() {
  const { user, logout } = useAuth();
  const { dark, colors: c, preference, setPreference } = useTheme();

  const [section,      setSection]      = useState<'main'|'password'>('main');
  const [currentPw,    setCurrentPw]    = useState('');
  const [newPw,        setNewPw]        = useState('');
  const [confirmPw,    setConfirmPw]    = useState('');
  const [notifOn,      setNotifOn]      = useState(true);

  useEffect(() => {
    fetchProfile().then((p) => {
      if (p?.preferences?.pushNotif != null) setNotifOn(Boolean(p.preferences.pushNotif));
    }).catch(() => {});
  }, []);
  const [saving,       setSaving]       = useState(false);
  const [pwError,      setPwError]      = useState('');
  const [pwSuccess,    setPwSuccess]    = useState(false);

  const handleChangePassword = async () => {
    if (!currentPw || !newPw || !confirmPw) { setPwError('All fields are required'); return; }
    if (newPw !== confirmPw)   { setPwError('New passwords do not match'); return; }
    const problem = passwordProblem(newPw);
    if (problem) { setPwError(problem); return; }
    setPwError(''); setSaving(true);
    try {
      await apiClient.put('/api/auth/password', { currentPassword: currentPw, newPassword: newPw, confirmPassword: confirmPw });
      setPwSuccess(true); setCurrentPw(''); setNewPw(''); setConfirmPw('');
      Alert.alert('Success', 'Password changed successfully.');
      setSection('main');
    } catch (err: any) {
      setPwError(err?.response?.data?.error || 'Password change failed.');
    } finally { setSaving(false); }
  };

  const handleDeleteAccount = () => {
    Alert.alert('Delete Account', 'This will permanently delete your account and all data. This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try {
          await apiClient.delete('/api/auth/account', { data: { password: currentPw } });
          await logout();
        } catch (err: any) {
          Alert.alert('Error', err?.response?.data?.error || 'Could not delete account. Ensure you enter your current password first.');
        }
      }},
    ]);
  };

  const SECTIONS: SettingsSection[] = [
    { title: 'Account', items: [
      { label: 'Email', value: user?.email, type: 'info' },
      { label: 'Role',  value: user?.role,  type: 'info' },
    ]},
    { title: 'Security', items: [
      { label: 'Change Password', type: 'action', onPress: () => setSection('password') },
    ]},
    { title: 'Notifications', items: [
      { label: 'Push Notifications', type: 'toggle', value: notifOn, onToggle: (v: boolean) => { setNotifOn(v); fetchProfile().then((p) => updateProfile({ preferences: { ...(p?.preferences || {}), pushNotif: v } })).catch(() => {}); } },
    ]},
    { title: 'Danger Zone', items: [
      { label: 'Sign Out', type: 'danger', onPress: () => Alert.alert('Sign Out', 'Are you sure?', [{ text:'Cancel', style:'cancel' }, { text:'Sign Out', style:'destructive', onPress: logout }]) },
      { label: 'Delete Account', type: 'danger', onPress: handleDeleteAccount },
    ]},
  ];

  if (section === 'password') return (
    <ScrollView style={{ backgroundColor: c.bg }} contentContainerStyle={styles.scroll}>
      <TouchableOpacity onPress={() => setSection('main')} style={{ marginBottom: Spacing['2xl'] }}>
        <Text style={{ color: c.primary, fontSize: FontSize.base }}>← Back</Text>
      </TouchableOpacity>
      <Text style={[styles.pageTitle, { color: c.text }]}>Change Password</Text>
      <Card dark={dark} style={{ gap: Spacing.sm }}>
        <Input label="Current Password" value={currentPw} onChangeText={setCurrentPw} secureToggle dark={dark} />
        <Input label="New Password"     value={newPw}     onChangeText={setNewPw}     secureToggle dark={dark} />
        <Input label="Confirm New Password" value={confirmPw} onChangeText={setConfirmPw} secureToggle dark={dark} />
        {pwError && <Text style={[styles.errorText, { color: c.danger }]}>{pwError}</Text>}
        <Button label="Save New Password" onPress={handleChangePassword} loading={saving} />
      </Card>
    </ScrollView>
  );

  return (
    <ScrollView style={{ backgroundColor: c.bg }} contentContainerStyle={styles.scroll}>
      <Text style={[styles.pageTitle, { color: c.text }]}>Settings</Text>
      {SECTIONS.map(sec => (
        <View key={sec.title} style={styles.section}>
          <Text style={[styles.sectionTitle, { color: c.muted }]}>{sec.title.toUpperCase()}</Text>
          <Card dark={dark} style={{ padding: 0, overflow: 'hidden' }}>
            {sec.items.map((item, i) => (
              <View key={item.label} style={[styles.settingRow, i > 0 && { borderTopWidth: 1, borderTopColor: c.border }]}>
                <Text style={[styles.settingLabel, { color: item.type === 'danger' ? c.danger : c.text }]}>{item.label}</Text>
                {item.type === 'info'   && <Text style={[styles.settingValue, { color: c.muted }]}>{item.value}</Text>}
                {item.type === 'action' && <TouchableOpacity onPress={item.onPress}><Text style={{ color: c.primary, fontSize: FontSize.sm }}>Change →</Text></TouchableOpacity>}
                {item.type === 'toggle' && <Switch value={item.value} onValueChange={item.onToggle} trackColor={{ true: c.primary }} />}
                {item.type === 'danger' && <TouchableOpacity onPress={item.onPress}><Text style={{ color: c.danger, fontSize: FontSize.sm }}>›</Text></TouchableOpacity>}
              </View>
            ))}
          </Card>
        </View>
      ))}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: c.muted }]}>APPEARANCE</Text>
        <Card dark={dark} style={styles.appearanceCard}>
          <Text style={[styles.settingLabel, { color: c.text }]}>Theme</Text>
          <Text style={[styles.appearanceCopy, { color: c.muted }]}>Choose how NexStep looks on this device.</Text>
          <View style={styles.themeChoices}>
            {(['system', 'light', 'dark'] as ThemePreference[]).map((choice) => {
              const selected = preference === choice;
              return (
                <TouchableOpacity
                  key={choice}
                  onPress={() => setPreference(choice)}
                  style={[styles.themeChoice, { backgroundColor: selected ? c.primary : c.surface2, borderColor: selected ? c.primary : c.border }]}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                >
                  <Text style={[styles.themeChoiceText, { color: selected ? c.onPrimary : c.text }]}>
                    {choice === 'system' ? 'System' : choice === 'light' ? 'Light' : 'Dark'}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </Card>
      </View>
      <Text style={[styles.footer, { color: c.muted }]}>NexStep AI v1.0 · Career & Academic Navigator</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll:       { padding: Spacing['2xl'], paddingBottom: 80 },
  pageTitle:    { fontSize: FontSize['2xl'], fontWeight: FontWeight.extrabold, marginBottom: Spacing['2xl'] },
  section:      { marginBottom: Spacing['2xl'] },
  sectionTitle: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, marginBottom: Spacing.sm, letterSpacing: 0.5 },
  settingRow:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: Spacing.xl },
  settingLabel: { fontSize: FontSize.base, fontWeight: FontWeight.medium },
  settingValue: { fontSize: FontSize.sm },
  errorText:    { fontSize: FontSize.sm },
  appearanceCard: { padding: Spacing.xl },
  appearanceCopy: { fontSize: FontSize.sm, marginTop: Spacing.xs, lineHeight: 19 },
  themeChoices: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.lg },
  themeChoice: { flex: 1, minHeight: 42, alignItems: 'center', justifyContent: 'center', borderRadius: 10, borderWidth: 1 },
  themeChoiceText: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold },
  footer:       { textAlign: 'center', fontSize: FontSize.xs, marginTop: Spacing['2xl'] },
});
