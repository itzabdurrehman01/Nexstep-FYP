import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Shield, Users, Server, Database, Activity } from 'lucide-react-native';
import { useTheme } from '../../context/ThemeContext';
import { Colors, FontSize, FontWeight, Radius, Spacing } from '../../utils/theme';
import { Card } from '../../components/Card';

export function AdminScreen() {
  const { dark, colors: c } = useTheme();

  return (
    <ScrollView style={[styles.container, { backgroundColor: c.bg }]} contentContainerStyle={styles.content}>
      <Animated.View entering={FadeInDown.duration(350)} style={styles.header}>
        <Text style={styles.eyebrow}>SYSTEM CONTROL & METRICS</Text>
        <Text style={[styles.title, { color: c.text }]}>Admin Panel</Text>
        <Text style={[styles.subtitle, { color: c.muted }]}>
          Platform metrics, user role administration, audit logs, and AI service health.
        </Text>
      </Animated.View>

      <View style={styles.grid2}>
        <Card dark={dark} elevated style={{ flex: 1, padding: Spacing.lg }}>
          <Text style={[styles.statNum, { color: Colors.primary }]}>12,480</Text>
          <Text style={[styles.statLabel, { color: c.muted }]}>Registered Students</Text>
        </Card>
        <Card dark={dark} elevated style={{ flex: 1, padding: Spacing.lg }}>
          <Text style={[styles.statNum, { color: Colors.accent }]}>99.9%</Text>
          <Text style={[styles.statLabel, { color: c.muted }]}>API Uptime</Text>
        </Card>
      </View>

      <Card dark={dark} elevated style={styles.card}>
        <Text style={[styles.cardTitle, { color: c.text }]}>System Health & Microservices</Text>
        {[
          { name: 'Auth & JWT Service', status: 'Healthy', ping: '12ms' },
          { name: 'AI Resume Engine', status: 'Healthy', ping: '45ms' },
          { name: 'PostgreSQL Database', status: 'Healthy', ping: '8ms' },
          { name: 'Voice Assistant Speech API', status: 'Healthy', ping: '62ms' },
        ].map((sys, i) => (
          <View key={i} style={[styles.sysRow, { backgroundColor: c.surface2 }]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.sysName, { color: c.text }]}>{sys.name}</Text>
              <Text style={[styles.sysPing, { color: c.muted }]}>Response: {sys.ping}</Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: Colors.success + '20' }]}>
              <Text style={{ color: Colors.success, fontSize: FontSize.xs, fontWeight: FontWeight.extrabold }}>{sys.status}</Text>
            </View>
          </View>
        ))}
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
  grid2: { flexDirection: 'row', gap: Spacing.md },
  statNum: { fontSize: FontSize['2xl'], fontWeight: FontWeight.extrabold },
  statLabel: { fontSize: FontSize.xs, fontWeight: FontWeight.bold },
  card: { padding: Spacing.xl, borderRadius: Radius['2xl'], gap: Spacing.sm },
  cardTitle: { fontSize: FontSize.base, fontWeight: FontWeight.bold, marginBottom: Spacing.xs },
  sysRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.md, borderRadius: Radius.lg, marginBottom: 4 },
  sysName: { fontSize: FontSize.sm, fontWeight: FontWeight.bold },
  sysPing: { fontSize: FontSize.xs },
  statusBadge: { paddingHorizontal: Spacing.sm, paddingVertical: 3, borderRadius: Radius.md },
});
