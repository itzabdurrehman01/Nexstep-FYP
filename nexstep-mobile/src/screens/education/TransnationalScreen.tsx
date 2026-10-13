import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Globe } from 'lucide-react-native';
import { useTheme } from '../../context/ThemeContext';
import { Colors, FontSize, FontWeight, Radius, Spacing } from '../../utils/theme';
import { Card } from '../../components/Card';

const GlobeIcon: any = Globe;

const TNE_PROGRAMS = [
  { id: '1', title: 'University of London International Programmes', localInstitute: 'ROOTS Ivy / TMUC / LGS International', degrees: 'LLB (Hons), BS Computer Science, BS Economics', feeVsOverseas: 'Saves 70% cost vs studying directly in UK', transferOption: 'Optional 2nd/3rd year transfer to UoL campus in London' },
  { id: '2', title: 'NCUK International Foundation & Year One', localInstitute: 'TMUC Pakistan / Roots College', degrees: 'BS Engineering, Business, Computer Science', feeVsOverseas: 'Guaranteed entry to 45+ UK & Australian partner universities', transferOption: '1+2 or 2+1 progression pathway' },
  { id: '3', title: 'Monash College Diploma & Transfer', localInstitute: 'Universal College Lahore (UCL)', degrees: 'Business, IT, Engineering Foundation', feeVsOverseas: 'Saves 60% tuition during Year 1 in Pakistan', transferOption: 'Direct entry into Year 2 at Monash University Australia' },
];

export function TransnationalScreen() {
  const { dark, colors: c } = useTheme();

  return (
    <ScrollView style={[styles.container, { backgroundColor: c.bg }]} contentContainerStyle={styles.content}>
      <Animated.View entering={FadeInDown.duration(350)} style={styles.header}>
        <Text style={styles.eyebrow}>GLOBAL DEGREE PATHWAYS</Text>
        <Text style={[styles.title, { color: c.text }]}>Transnational Education (TNE)</Text>
        <Text style={[styles.subtitle, { color: c.muted }]}>
          Earn UK, Australian, and U.S. university degrees while studying at partner campuses in Pakistan.
        </Text>
      </Animated.View>

      {TNE_PROGRAMS.map((item) => (
        <Card key={item.id} dark={dark} elevated style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={[styles.iconBox, { backgroundColor: Colors.accent + '20' }]}>
              <GlobeIcon size={22} color={Colors.accent} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.cardTitle, { color: c.text }]}>{item.title}</Text>
              <Text style={[styles.localText, { color: Colors.accent, fontWeight: FontWeight.bold }]}>Local Campus: {item.localInstitute}</Text>
            </View>
          </View>

          <View style={styles.infoBox}>
            <Text style={[styles.infoText, { color: c.text }]}>🎓 Degrees Offered: {item.degrees}</Text>
            <Text style={[styles.infoText, { color: Colors.primary, fontWeight: FontWeight.bold }]}>💰 Savings: {item.feeVsOverseas}</Text>
            <Text style={[styles.infoText, { color: c.text }]}>✈️ Overseas Transfer: {item.transferOption}</Text>
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
  eyebrow: { color: Colors.accent, fontSize: FontSize.xs, letterSpacing: 1.2, fontWeight: FontWeight.extrabold },
  title: { fontSize: FontSize['3xl'], fontWeight: FontWeight.extrabold },
  subtitle: { fontSize: FontSize.sm, lineHeight: 20 },
  card: { padding: Spacing.xl, borderRadius: Radius['2xl'], gap: Spacing.sm },
  cardHeader: { flexDirection: 'row', gap: Spacing.md, alignItems: 'center' },
  iconBox: { width: 44, height: 44, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { fontSize: FontSize.base, fontWeight: FontWeight.bold },
  localText: { fontSize: FontSize.xs, marginTop: 2 },
  infoBox: { gap: 6, marginTop: Spacing.xs, paddingTop: Spacing.xs, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)' },
  infoText: { fontSize: FontSize.xs, lineHeight: 18 },
});
