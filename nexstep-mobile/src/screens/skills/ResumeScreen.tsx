import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { FileText, Sparkles, CheckCircle2, Download, Eye, Award } from 'lucide-react-native';
import { useTheme } from '../../context/ThemeContext';
import { Colors, FontSize, FontWeight, Radius, Spacing } from '../../utils/theme';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';

export function ResumeScreen() {
  const { dark, colors: c } = useTheme();
  const [fullName, setFullName] = useState('Abdur Rehman');
  const [email, setEmail] = useState('abdur@example.com');
  const [phone, setPhone] = useState('+92 300 1234567');
  const [summary, setSummary] = useState('Dedicated Software Engineering student passionate about full-stack web and mobile development, React Native, and AI tools.');
  const [skills, setSkills] = useState('React, React Native, Node.js, Python, PostgreSQL, Git, TypeScript');
  const [atsScore, setAtsScore] = useState<number | null>(85);

  const handleAnalyzeATS = () => {
    Alert.alert('AI ATS Analysis Complete', `Your resume score is ${atsScore}%!\n\nStrengths:\n• Clear contact details & layout\n• Strong tech stack keyword density\n\nSuggestions:\n• Add metrics/quantifiable outcomes to experience.`);
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: c.bg }]} contentContainerStyle={styles.content}>
      <Animated.View entering={FadeInDown.duration(350)} style={styles.header}>
        <Text style={styles.eyebrow}>AI RESUME ENGINE</Text>
        <Text style={[styles.title, { color: c.text }]}>AI Resume Builder</Text>
        <Text style={[styles.subtitle, { color: c.muted }]}>
          Build an ATS-optimized professional resume tailored for Pakistani and global tech employers.
        </Text>
      </Animated.View>

      {/* ATS Score Card */}
      <Card dark={dark} elevated style={styles.card}>
        <View style={styles.scoreRow}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.cardTitle, { color: c.text }]}>Resume ATS Match Score</Text>
            <Text style={[styles.scoreDesc, { color: c.muted }]}>Optimized for Automated Resume Screeners</Text>
          </View>
          <View style={[styles.scoreBadge, { backgroundColor: Colors.primary + '25' }]}>
            <Text style={[styles.scoreText, { color: Colors.primary }]}>{atsScore}%</Text>
          </View>
        </View>

        <Button title="Analyze Resume with AI" onPress={handleAnalyzeATS} variant="secondary" />
      </Card>

      {/* Personal Info Editor */}
      <Card dark={dark} elevated style={styles.card}>
        <Text style={[styles.cardTitle, { color: c.text }]}>1. Personal Information</Text>

        <Text style={[styles.label, { color: c.text }]}>Full Name</Text>
        <TextInput value={fullName} onChangeText={setFullName} style={[styles.input, { backgroundColor: c.surface2, color: c.text, borderColor: c.border }]} />

        <View style={styles.grid2}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.label, { color: c.text }]}>Email Address</Text>
            <TextInput value={email} onChangeText={setEmail} style={[styles.input, { backgroundColor: c.surface2, color: c.text, borderColor: c.border }]} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.label, { color: c.text }]}>Phone</Text>
            <TextInput value={phone} onChangeText={setPhone} style={[styles.input, { backgroundColor: c.surface2, color: c.text, borderColor: c.border }]} />
          </View>
        </View>
      </Card>

      {/* Professional Summary */}
      <Card dark={dark} elevated style={styles.card}>
        <Text style={[styles.cardTitle, { color: c.text }]}>2. Professional Summary</Text>
        <TextInput
          value={summary}
          onChangeText={setSummary}
          multiline
          numberOfLines={4}
          style={[styles.input, styles.textarea, { backgroundColor: c.surface2, color: c.text, borderColor: c.border }]}
        />
      </Card>

      {/* Core Skills */}
      <Card dark={dark} elevated style={styles.card}>
        <Text style={[styles.cardTitle, { color: c.text }]}>3. Technical & Core Skills</Text>
        <TextInput
          value={skills}
          onChangeText={setSkills}
          multiline
          numberOfLines={3}
          style={[styles.input, styles.textarea, { backgroundColor: c.surface2, color: c.text, borderColor: c.border }]}
        />
      </Card>

      <Button
        title="Export Professional PDF Resume"
        onPress={() => Alert.alert('Export Resume', 'PDF generation initiated. File will download shortly.')}
      />
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
  card: { padding: Spacing.xl, borderRadius: Radius['2xl'], gap: Spacing.xs },
  cardTitle: { fontSize: FontSize.base, fontWeight: FontWeight.bold },
  scoreRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.xs },
  scoreDesc: { fontSize: FontSize.xs },
  scoreBadge: { width: 50, height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center' },
  scoreText: { fontSize: FontSize.base, fontWeight: FontWeight.extrabold },
  grid2: { flexDirection: 'row', gap: Spacing.md },
  label: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, marginTop: Spacing.xs },
  input: { borderWidth: 1, borderRadius: Radius.lg, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, fontSize: FontSize.sm, marginTop: 4 },
  textarea: { minHeight: 80, textAlignVertical: 'top' },
});
