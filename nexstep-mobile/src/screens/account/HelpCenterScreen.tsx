import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { HelpCircle, Search, MessageSquare, PhoneCall, ChevronDown, Send } from 'lucide-react-native';
import { useTheme } from '../../context/ThemeContext';
import { Colors, FontSize, FontWeight, Radius, Spacing } from '../../utils/theme';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';

const ChevronDownIcon: any = ChevronDown;

const FAQS = [
  { q: 'How does NexStep calculate university merit cutoffs?', a: 'NexStep aggregates past 3 years official merit lists published by HEC, BISE boards, NUST, FAST, and UET to estimate current admission cutoff probabilities.' },
  { q: 'Can Grade 8 students use NexStep for stream selection?', a: 'Yes! Our Grade 8 Subject Evaluator analyzes your report card marks to recommend Science (Bio), Science (CS), Commerce, or Arts.' },
  { q: 'Is the AI Resume Builder free for Pakistani students?', a: 'Yes, basic ATS resume creation and downloading is free for all registered student accounts.' },
  { q: 'How do I apply for Ehsaas & PEEF scholarships?', a: 'Visit our Scholarships section, select the desired program, check your family income eligibility, and click "Apply For Scholarship" for direct portal links.' },
];

export function HelpCenterScreen() {
  const { dark, colors: c } = useTheme();
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const [ticketMsg, setTicketMsg] = useState('');

  const handleSubmitTicket = () => {
    if (!ticketMsg.trim()) {
      Alert.alert('Empty Message', 'Please enter your support query details.');
      return;
    }
    Alert.alert('Support Ticket Submitted', 'Thank you! Our academic counseling team will respond to your registered email within 24 hours.');
    setTicketMsg('');
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: c.bg }]} contentContainerStyle={styles.content}>
      <Animated.View entering={FadeInDown.duration(350)} style={styles.header}>
        <Text style={styles.eyebrow}>SUPPORT & FAQS</Text>
        <Text style={[styles.title, { color: c.text }]}>Help Center</Text>
        <Text style={[styles.subtitle, { color: c.muted }]}>
          Find answers to common platform questions or contact our support team.
        </Text>
      </Animated.View>

      {/* Frequently Asked Questions */}
      <Card dark={dark} elevated style={styles.card}>
        <Text style={[styles.cardTitle, { color: c.text }]}>Frequently Asked Questions</Text>

        {FAQS.map((faq, i) => (
          <TouchableOpacity key={i} onPress={() => setExpandedIndex(expandedIndex === i ? null : i)} style={[styles.faqBox, { backgroundColor: c.surface2 }]}>
            <View style={styles.faqRow}>
              <Text style={[styles.faqQ, { color: c.text }]}>{faq.q}</Text>
              <ChevronDownIcon size={18} color={Colors.primary} />
            </View>
            {expandedIndex === i && (
              <Text style={[styles.faqA, { color: c.muted }]}>{faq.a}</Text>
            )}
          </TouchableOpacity>
        ))}
      </Card>

      {/* Submit Support Ticket */}
      <Card dark={dark} elevated style={styles.card}>
        <Text style={[styles.cardTitle, { color: c.text }]}>Submit a Support Ticket</Text>
        <TextInput
          value={ticketMsg}
          onChangeText={setTicketMsg}
          placeholder="Describe your issue or feedback..."
          placeholderTextColor={c.muted}
          multiline
          numberOfLines={4}
          style={[styles.input, styles.textarea, { backgroundColor: c.surface2, color: c.text, borderColor: c.border }]}
        />
        <Button title="Submit Support Request" onPress={handleSubmitTicket} style={{ marginTop: Spacing.xs }} />
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
  cardTitle: { fontSize: FontSize.base, fontWeight: FontWeight.bold },
  faqBox: { padding: Spacing.md, borderRadius: Radius.lg, gap: 4 },
  faqRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  faqQ: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, flex: 1 },
  faqA: { fontSize: FontSize.xs, lineHeight: 18, marginTop: 4 },
  input: { borderWidth: 1, borderRadius: Radius.lg, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, fontSize: FontSize.sm },
  textarea: { minHeight: 90, textAlignVertical: 'top' },
});
