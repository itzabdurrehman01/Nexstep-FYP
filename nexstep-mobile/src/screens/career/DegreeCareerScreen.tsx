import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Briefcase } from 'lucide-react-native';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { Colors, FontSize, FontWeight, Radius, Spacing } from '../../utils/theme';
import { Card } from '../../components/Card';
import { CareerComparisonScreen } from './CareerComparisonScreen';

const BriefcaseIcon: any = Briefcase;

const DEGREE_CAREER_MAP = [
  { degree: 'BS Computer Science', jobs: ['Software Engineer', 'Full-Stack Developer', 'AI/ML Specialist', 'DevOps Architect'], salaryRange: 'PKR 90k - 450k/mo', growth: '+28% High Demand' },
  { degree: 'BS Software Engineering', jobs: ['Quality Assurance Lead', 'Systems Engineer', 'Mobile App Developer', 'Solutions Architect'], salaryRange: 'PKR 85k - 400k/mo', growth: '+25% High Demand' },
  { degree: 'MBBS / Medical', jobs: ['House Officer', 'Medical Specialist', 'Surgeon', 'Clinical Researcher'], salaryRange: 'PKR 70k - 600k/mo', growth: 'Stable / Essential' },
  { degree: 'BBA / MBA', jobs: ['Product Manager', 'Marketing Director', 'HR Business Partner', 'Management Consultant'], salaryRange: 'PKR 65k - 350k/mo', growth: '+18% Moderate' },
  { degree: 'BS Accounting & Finance / CA', jobs: ['Chartered Accountant', 'Financial Controller', 'Internal Auditor', 'Investment Banker'], salaryRange: 'PKR 80k - 500k/mo', growth: '+20% High Demand' },
];

export function DegreeCareerScreen() {
  const { dark, colors: c } = useTheme();
  const { language } = useLanguage();
  const isUr = language === 'ur';
  const [viewMode, setViewMode] = useState<'compare' | 'directory'>('compare');
  const [search, setSearch] = useState('');

  const filtered = DEGREE_CAREER_MAP.filter((item) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return item.degree.toLowerCase().includes(q) || item.jobs.some((job) => job.toLowerCase().includes(q));
  });

  return (
    <ScrollView style={[styles.container, { backgroundColor: c.bg }]} contentContainerStyle={styles.content}>
      <Animated.View entering={FadeInDown.duration(350)} style={styles.header}>
        <Text style={styles.eyebrow}>{isUr ? 'ڈگری سے کیریئر' : 'DEGREE TO CAREER'}</Text>
        <Text style={[styles.title, { color: c.text }]}>{isUr ? 'ڈگری سے کیریئر' : 'Degree to Career'}</Text>
        <Text style={[styles.subtitle, { color: c.muted }]}>
          {isUr ? 'اپنی ڈگری سے جڑے کیریئر کے راستے دریافت کریں۔' : 'See which careers each degree leads to, with typical job titles and growth outlook.'}
        </Text>
        <View style={[styles.toggle, { backgroundColor: c.surface2, borderColor: c.border }]}>
          <TouchableOpacity onPress={() => setViewMode('compare')} style={[styles.toggleBtn, viewMode === 'compare' && { backgroundColor: c.surface }]}>
            <Text style={[styles.toggleText, { color: viewMode === 'compare' ? Colors.primary : c.muted }]}>{isUr ? 'موازنہ' : 'Career Comparison'}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setViewMode('directory')} style={[styles.toggleBtn, viewMode === 'directory' && { backgroundColor: c.surface }]}>
            <Text style={[styles.toggleText, { color: viewMode === 'directory' ? Colors.primary : c.muted }]}>{isUr ? 'ڈائریکٹری' : 'All Careers Directory'}</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>

      {viewMode === 'compare' ? (
        <CareerComparisonScreen embedded />
      ) : (
        <>
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder={isUr ? 'ڈگری یا نوکری تلاش کریں…' : 'Search by degree name or job title...'}
            placeholderTextColor={c.muted}
            style={[styles.search, { backgroundColor: c.surface2, color: c.text, borderColor: c.border }]}
          />
          {filtered.map((item, index) => (
            <Card key={index} dark={dark} elevated style={styles.card}>
              <View style={styles.cardTop}>
                <View style={[styles.iconBox, { backgroundColor: Colors.primary + '20' }]}>
                  <BriefcaseIcon size={22} color={Colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.degreeTitle, { color: c.text }]}>{item.degree}</Text>
                  <Text style={styles.growthBadge}>{item.growth}</Text>
                </View>
              </View>
              <Text style={[styles.label, { color: c.muted }]}>{isUr ? 'کیریئر کے کردار:' : 'Target Career Roles:'}</Text>
              <View style={styles.chipRow}>
                {item.jobs.map((job) => (
                  <View key={job} style={[styles.chip, { backgroundColor: c.surface2 }]}>
                    <Text style={[styles.chipText, { color: c.text }]}>{job}</Text>
                  </View>
                ))}
              </View>
              <View style={styles.salaryRow}>
                <Text style={[styles.salaryLabel, { color: c.muted }]}>{isUr ? 'تنخواہ کی حد:' : 'Starting to Mid Salary Range:'}</Text>
                <Text style={[styles.salaryVal, { color: Colors.primary }]}>{item.salaryRange}</Text>
              </View>
            </Card>
          ))}
        </>
      )}
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
  toggle: { flexDirection: 'row', borderRadius: Radius.lg, borderWidth: 1, padding: 4, marginTop: Spacing.sm },
  toggleBtn: { flex: 1, height: 36, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
  toggleText: { fontSize: FontSize.xs, fontWeight: FontWeight.bold },
  search: { borderWidth: 1, borderRadius: Radius.lg, paddingHorizontal: Spacing.md, height: 44, fontSize: FontSize.sm },
  card: { padding: Spacing.xl, borderRadius: Radius['2xl'], gap: Spacing.sm },
  cardTop: { flexDirection: 'row', gap: Spacing.md, alignItems: 'center' },
  iconBox: { width: 44, height: 44, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
  degreeTitle: { fontSize: FontSize.base, fontWeight: FontWeight.bold },
  growthBadge: { color: Colors.primary, fontSize: FontSize.xs, fontWeight: FontWeight.extrabold },
  label: { fontSize: FontSize.xs, fontWeight: FontWeight.bold },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs },
  chip: { paddingHorizontal: Spacing.sm, paddingVertical: 4, borderRadius: Radius.md },
  chipText: { fontSize: FontSize.xs },
  salaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: Spacing.xs, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)' },
  salaryLabel: { fontSize: FontSize.xs },
  salaryVal: { fontSize: FontSize.sm, fontWeight: FontWeight.extrabold },
});
