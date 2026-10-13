import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Wrench } from 'lucide-react-native';
import { useTheme } from '../../context/ThemeContext';
import { Colors, FontSize, FontWeight, Radius, Spacing } from '../../utils/theme';
import { Card } from '../../components/Card';

const WrenchIcon: any = Wrench;

interface DiplomaCourse {
  id: string;
  title: string;
  provider: 'TEVTA Punjab' | 'NAVTTC' | 'STEVDA Sindh' | 'KP-TEVTA';
  duration: string;
  stipend: string;
  level: string;
  targetJobs: string;
  description: string;
}

const TEVTA_DIPLOMAS: DiplomaCourse[] = [
  { id: '1', title: 'Diploma in Information Technology (DIT)', provider: 'TEVTA Punjab', duration: '1 Year (2 Semesters)', stipend: 'PKR 4,000 / month', level: 'Post-Matric / Intermediate', targetJobs: 'IT Support Specialist, Web Developer, Office Automation Specialist', description: 'Comprehensive Govt-certified IT diploma covering web development, database management, computer networking, and office software.' },
  { id: '2', title: 'DAE Electrical Technology', provider: 'TEVTA Punjab', duration: '3 Years', stipend: 'Subsidized Fee + Industrial Placement', level: 'Post-Matric (Science)', targetJobs: 'Assistant Electrical Engineer, Grid Supervisor, Automation Technician', description: 'Associate engineering diploma focusing on electrical power systems, wiring, motors, and industrial control panels.' },
  { id: '3', title: 'Full-Stack Web & Mobile Development', provider: 'NAVTTC', duration: '6 Months', stipend: 'Free + PKR 5,000 Stipend', level: 'Matric / Intermediate', targetJobs: 'Frontend React Developer, Mobile App Developer, Node.js Engineer', description: 'Hands-on practical bootcamp sponsored by NAVTTC Prime Minister Youth Skill Development program.' },
  { id: '4', title: 'Cloud Computing & Cyber Security', provider: 'NAVTTC', duration: '6 Months', stipend: 'Free + Certification Voucher', level: 'ICS / F.Sc / Bachelor', targetJobs: 'Cloud Admin, SOC Analyst, Network Security Engineer', description: 'Advanced IT track focusing on AWS cloud architecture, ethical hacking basics, and network security.' },
  { id: '5', title: 'Solar PV Systems & Renewable Energy', provider: 'KP-TEVTA', duration: '3 Months', stipend: 'PKR 3,500 / month', level: 'Matric', targetJobs: 'Solar Inverter Installer, Renewable Energy Inspector', description: 'Practical technical training in green energy, solar panel installation, inverter configuration, and microgrid maintenance.' },
];

export function TevtaItScreen() {
  const { dark, colors: c } = useTheme();
  const [selectedProv, setSelectedProv] = useState('All');

  const filtered = TEVTA_DIPLOMAS.filter(d => selectedProv === 'All' || d.provider.includes(selectedProv));

  return (
    <ScrollView style={[styles.container, { backgroundColor: c.bg }]} contentContainerStyle={styles.content}>
      <Animated.View entering={FadeInDown.duration(350)} style={styles.header}>
        <Text style={styles.eyebrow}>VOCATIONAL & TECHNICAL SKILLS</Text>
        <Text style={[styles.title, { color: c.text }]}>TEVTA & IT Diplomas</Text>
        <Text style={[styles.subtitle, { color: c.muted }]}>
          Government-recognized technical diplomas, DAE trades, and NAVTTC skill bootcamps with stipends.
        </Text>
      </Animated.View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
        {['All', 'TEVTA Punjab', 'NAVTTC', 'KP-TEVTA'].map((p) => (
          <TouchableOpacity
            key={p}
            onPress={() => setSelectedProv(p)}
            style={[styles.chip, { backgroundColor: selectedProv === p ? Colors.primary : c.surface2 }]}
          >
            <Text style={[styles.chipText, { color: selectedProv === p ? '#06110d' : c.text }]}>{p}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {filtered.map((item) => (
        <Card key={item.id} dark={dark} elevated style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={[styles.iconBox, { backgroundColor: Colors.primary + '20' }]}>
              <WrenchIcon size={22} color={Colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.cardTitle, { color: c.text }]}>{item.title}</Text>
              <Text style={[styles.providerText, { color: Colors.primary, fontWeight: FontWeight.bold }]}>{item.provider}</Text>
            </View>
          </View>

          <Text style={[styles.desc, { color: c.muted }]}>{item.description}</Text>

          <View style={styles.metaBox}>
            <Text style={[styles.metaText, { color: c.text }]}>⏱️ Duration: {item.duration}</Text>
            <Text style={[styles.metaText, { color: Colors.primary, fontWeight: FontWeight.bold }]}>💵 Govt Stipend: {item.stipend}</Text>
            <Text style={[styles.metaText, { color: c.text }]}>🎓 Target Careers: {item.targetJobs}</Text>
            <Text style={[styles.metaText, { color: Colors.accent, fontWeight: FontWeight.bold }]}>✈️ Job Demand: High Gulf & EU Overseas Technical Visa Eligibility</Text>
          </View>
        </Card>
      ))}
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
  chipRow: { flexDirection: 'row', gap: Spacing.xs },
  chip: { paddingHorizontal: Spacing.md, paddingVertical: 6, borderRadius: Radius.md },
  chipText: { fontSize: FontSize.xs, fontWeight: FontWeight.bold },
  card: { padding: Spacing.xl, borderRadius: Radius['2xl'], gap: Spacing.sm },
  cardHeader: { flexDirection: 'row', gap: Spacing.md, alignItems: 'center' },
  iconBox: { width: 44, height: 44, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { fontSize: FontSize.base, fontWeight: FontWeight.bold },
  providerText: { fontSize: FontSize.xs, marginTop: 2 },
  desc: { fontSize: FontSize.sm, lineHeight: 20 },
  metaBox: { gap: 4, marginTop: Spacing.xs, paddingTop: Spacing.xs, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)' },
  metaText: { fontSize: FontSize.xs, fontWeight: FontWeight.medium },
});
