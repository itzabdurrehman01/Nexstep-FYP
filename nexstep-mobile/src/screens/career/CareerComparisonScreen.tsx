import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { Colors, FontSize, FontWeight, Radius, Spacing } from '../../utils/theme';
import { Card } from '../../components/Card';

const CAREERS_LIST = [
  { id: 'se', title: 'Software Engineer', entrySalary: 'PKR 100,000/mo', growthRate: '+25% High', workLife: '7 / 10', education: 'BS CS / SE', topSkills: 'Coding, Problem Solving, System Design' },
  { id: 'ds', title: 'Data Scientist / AI Specialist', entrySalary: 'PKR 120,000/mo', growthRate: '+32% Ultra High', workLife: '8 / 10', education: 'BS CS / Math / AI', topSkills: 'Python, Machine Learning, SQL, Statistics' },
  { id: 'doctor', title: 'Medical Doctor (MBBS)', entrySalary: 'PKR 75,000/mo (House Job)', growthRate: 'Stable / High Demand', workLife: '4 / 10 (Demanding)', education: 'MBBS + FCPS / USMLE', topSkills: 'Clinical Diagnosis, Patient Care, Biology' },
  { id: 'ca', title: 'Chartered Accountant (CA)', entrySalary: 'PKR 90,000/mo (Articles)', growthRate: '+20% High', workLife: '5 / 10 (Busy Season)', education: 'ICAP CA Qualification', topSkills: 'Financial Audit, Tax Law, IFRS Rules' },
];

interface Props {
  embedded?: boolean;
}

export function CareerComparisonScreen({ embedded = false }: Props) {
  const { dark, colors: c } = useTheme();
  const { language } = useLanguage();
  const isUr = language === 'ur';
  const [careerA, setCareerA] = useState(CAREERS_LIST[0]);
  const [careerB, setCareerB] = useState(CAREERS_LIST[1]);
  const [picking, setPicking] = useState<'a' | 'b' | null>(null);

  const pick = (id: string) => {
    const next = CAREERS_LIST.find((item) => item.id === id);
    if (!next) return;
    if (picking === 'a') setCareerA(next);
    if (picking === 'b') setCareerB(next);
    setPicking(null);
  };

  const body = (
    <>
      <View style={styles.selectorRow}>
        <TouchableOpacity style={{ flex: 1 }} onPress={() => setPicking('a')}>
          <Card dark={dark} style={{ padding: Spacing.md }}>
            <Text style={[styles.selectLabel, { color: c.muted }]}>{isUr ? 'کیریئر 1' : 'Career 1'}</Text>
            <Text style={[styles.selectVal, { color: Colors.primary }]}>{careerA.title}</Text>
            <Text style={[styles.tapHint, { color: c.muted }]}>{isUr ? 'تبدیل کریں' : 'Tap to change'}</Text>
          </Card>
        </TouchableOpacity>
        <TouchableOpacity style={{ flex: 1 }} onPress={() => setPicking('b')}>
          <Card dark={dark} style={{ padding: Spacing.md }}>
            <Text style={[styles.selectLabel, { color: c.muted }]}>{isUr ? 'کیریئر 2' : 'Career 2'}</Text>
            <Text style={[styles.selectVal, { color: Colors.accent }]}>{careerB.title}</Text>
            <Text style={[styles.tapHint, { color: c.muted }]}>{isUr ? 'تبدیل کریں' : 'Tap to change'}</Text>
          </Card>
        </TouchableOpacity>
      </View>

      <Card dark={dark} elevated style={styles.card}>
        <Text style={[styles.tableTitle, { color: c.text }]}>{isUr ? 'موازنہ' : 'Comparison Breakdown'}</Text>
        <View style={styles.row}>
          <Text style={[styles.cellHeader, { color: c.muted }]}>{isUr ? 'میٹرک' : 'Metric'}</Text>
          <Text style={[styles.cellVal, { color: Colors.primary }]}>{careerA.title}</Text>
          <Text style={[styles.cellVal, { color: Colors.accent }]}>{careerB.title}</Text>
        </View>
        <View style={[styles.row, { backgroundColor: c.surface2 }]}>
          <Text style={[styles.cellHeader, { color: c.text }]}>Entry Salary</Text>
          <Text style={[styles.cellVal, { color: c.text }]}>{careerA.entrySalary}</Text>
          <Text style={[styles.cellVal, { color: c.text }]}>{careerB.entrySalary}</Text>
        </View>
        <View style={styles.row}>
          <Text style={[styles.cellHeader, { color: c.text }]}>Growth Rate</Text>
          <Text style={[styles.cellVal, { color: c.text }]}>{careerA.growthRate}</Text>
          <Text style={[styles.cellVal, { color: c.text }]}>{careerB.growthRate}</Text>
        </View>
        <View style={[styles.row, { backgroundColor: c.surface2 }]}>
          <Text style={[styles.cellHeader, { color: c.text }]}>Work-Life Balance</Text>
          <Text style={[styles.cellVal, { color: c.text }]}>{careerA.workLife}</Text>
          <Text style={[styles.cellVal, { color: c.text }]}>{careerB.workLife}</Text>
        </View>
        <View style={styles.row}>
          <Text style={[styles.cellHeader, { color: c.text }]}>Education</Text>
          <Text style={[styles.cellVal, { color: c.text }]}>{careerA.education}</Text>
          <Text style={[styles.cellVal, { color: c.text }]}>{careerB.education}</Text>
        </View>
        <View style={[styles.row, { backgroundColor: c.surface2 }]}>
          <Text style={[styles.cellHeader, { color: c.text }]}>Top Skills</Text>
          <Text style={[styles.cellVal, { color: c.text }]}>{careerA.topSkills}</Text>
          <Text style={[styles.cellVal, { color: c.text }]}>{careerB.topSkills}</Text>
        </View>
      </Card>

      <Modal visible={picking !== null} transparent animationType="fade" onRequestClose={() => setPicking(null)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setPicking(null)}>
          <View style={[styles.modalCard, { backgroundColor: c.surface }]}>
            <Text style={[styles.tableTitle, { color: c.text }]}>{isUr ? 'کیریئر منتخب کریں' : 'Choose a career'}</Text>
            {CAREERS_LIST.map((item) => (
              <TouchableOpacity key={item.id} onPress={() => pick(item.id)} style={[styles.pickRow, { backgroundColor: c.surface2 }]}>
                <Text style={[styles.selectVal, { color: c.text }]}>{item.title}</Text>
                <Text style={[styles.tapHint, { color: c.muted }]}>{item.entrySalary}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );

  if (embedded) return <View style={{ gap: Spacing.lg }}>{body}</View>;

  return (
    <ScrollView style={[styles.container, { backgroundColor: c.bg }]} contentContainerStyle={styles.content}>
      <Animated.View entering={FadeInDown.duration(350)} style={styles.header}>
        <Text style={styles.eyebrow}>SIDE-BY-SIDE ANALYTICS</Text>
        <Text style={[styles.title, { color: c.text }]}>{isUr ? 'کیریئر کا موازنہ' : 'Career Comparison Tool'}</Text>
        <Text style={[styles.subtitle, { color: c.muted }]}>
          {isUr ? 'تنخواہ، ترقی اور مہارتوں کا موازنہ کریں۔' : 'Compare salary trends, growth projections, work-life balance, and required skills side by side.'}
        </Text>
      </Animated.View>
      {body}
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
  selectorRow: { flexDirection: 'row', gap: Spacing.md },
  selectLabel: { fontSize: FontSize.xs },
  selectVal: { fontSize: FontSize.sm, fontWeight: FontWeight.extrabold, marginTop: 2 },
  tapHint: { fontSize: FontSize.xs, marginTop: 4 },
  card: { padding: Spacing.xl, borderRadius: Radius['2xl'], gap: Spacing.sm },
  tableTitle: { fontSize: FontSize.base, fontWeight: FontWeight.bold, marginBottom: Spacing.xs },
  row: { flexDirection: 'row', paddingVertical: Spacing.sm, paddingHorizontal: Spacing.sm, borderRadius: Radius.md, alignItems: 'center' },
  cellHeader: { flex: 1, fontSize: FontSize.xs, fontWeight: FontWeight.bold },
  cellVal: { flex: 1, fontSize: FontSize.xs, textAlign: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', padding: Spacing['2xl'] },
  modalCard: { borderRadius: Radius['2xl'], padding: Spacing.xl, gap: Spacing.sm },
  pickRow: { padding: Spacing.md, borderRadius: Radius.lg },
});
