import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import * as Speech from 'expo-speech';
import { Mic, Volume2, Sparkles } from 'lucide-react-native';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { Colors, FontSize, FontWeight, Radius, Spacing } from '../../utils/theme';
import { Card } from '../../components/Card';
import { fetchProfile } from '../../api/careers';
import { sendChat } from '../../api/features';

const MicIcon: any = Mic;
const Volume2Icon: any = Volume2;
const SparklesIcon: any = Sparkles;

const SAMPLE = [
  'What is the merit cutoff for NUST CS?',
  'List top need-based scholarships in Punjab',
  'Suggest careers for Science Computer group',
  'How to prepare for ECAT entrance test?',
];

export function VoiceAssistantScreen() {
  const { dark, colors: c } = useTheme();
  const { language } = useLanguage();
  const [spoken, setSpoken] = useState('');
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const ask = async (text: string) => {
    const message = text.trim();
    if (!message) return;
    setSpoken(message);
    setLoading(true);
    try {
      const profile = await fetchProfile().catch(() => null);
      const data = await sendChat({ message, profile, language: language === 'ur' ? 'ur' : 'en' });
      const reply = data.reply || data.response || 'Please check official prospectuses for the latest details.';
      setAiResponse(reply);
      Speech.stop();
      Speech.speak(reply, { language: language === 'ur' ? 'ur-PK' : 'en-US', rate: 0.95 });
    } catch {
      const fallback = 'The counselor is busy. Try again in a moment, or type your question.';
      setAiResponse(fallback);
      Speech.speak(fallback, { language: 'en-US' });
    } finally { setLoading(false); }
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: c.bg }]} contentContainerStyle={styles.content}>
      <Animated.View entering={FadeInDown.duration(350)} style={styles.header}>
        <Text style={styles.eyebrow}>VOICE ASSISTANT</Text>
        <Text style={[styles.title, { color: c.text }]}>Voice Career Assistant</Text>
        <Text style={[styles.subtitle, { color: c.muted }]}>
          Type or tap a prompt. The same counselor as the website answers, then speaks the reply in English or Urdu.
        </Text>
      </Animated.View>

      <Card dark={dark} elevated style={styles.voiceCard}>
        <View style={[styles.micBtn, { backgroundColor: Colors.primary }]}>
          <MicIcon size={36} color="#06110d" />
        </View>
        <TextInput
          value={spoken}
          onChangeText={setSpoken}
          placeholder={language === 'ur' ? 'اپنا سوال لکھیں…' : 'Type what you would say…'}
          placeholderTextColor={c.muted}
          style={[styles.input, { color: c.text, borderColor: c.border }]}
        />
        <TouchableOpacity onPress={() => ask(spoken)} disabled={loading} style={[styles.askBtn, { backgroundColor: Colors.primary }]}>
          {loading ? <ActivityIndicator color="#06110d" /> : <Text style={styles.askText}>Ask and listen</Text>}
        </TouchableOpacity>
      </Card>

      {aiResponse && (
        <Card dark={dark} elevated style={styles.card}>
          <View style={styles.respHeader}>
            <Volume2Icon size={20} color={Colors.primary} />
            <Text style={[styles.respTitle, { color: c.text }]}>AI Voice Response</Text>
          </View>
          <Text style={[styles.respText, { color: c.text }]}>{aiResponse}</Text>
        </Card>
      )}

      <Card dark={dark} elevated style={styles.card}>
        <Text style={[styles.cardTitle, { color: c.text }]}>Sample voice commands</Text>
        {SAMPLE.map((cmd) => (
          <TouchableOpacity key={cmd} onPress={() => ask(cmd)} style={[styles.cmdRow, { backgroundColor: c.surface2 }]}>
            <SparklesIcon size={16} color={Colors.primary} />
            <Text style={[styles.cmdText, { color: c.text }]}>{cmd}</Text>
          </TouchableOpacity>
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
  voiceCard: { padding: Spacing['3xl'], borderRadius: Radius['2xl'], alignItems: 'center', gap: Spacing.md },
  micBtn: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center' },
  input: { width: '100%', borderWidth: 1, borderRadius: Radius.md, padding: Spacing.md },
  askBtn: { height: 44, paddingHorizontal: 20, borderRadius: Radius.lg, justifyContent: 'center' },
  askText: { color: '#06110d', fontWeight: FontWeight.extrabold },
  card: { padding: Spacing.xl, borderRadius: Radius['2xl'], gap: Spacing.sm },
  cardTitle: { fontSize: FontSize.base, fontWeight: FontWeight.bold },
  respHeader: { flexDirection: 'row', gap: Spacing.sm, alignItems: 'center' },
  respTitle: { fontSize: FontSize.base, fontWeight: FontWeight.bold },
  respText: { fontSize: FontSize.sm, lineHeight: 22 },
  cmdRow: { flexDirection: 'row', gap: Spacing.sm, alignItems: 'center', padding: Spacing.md, borderRadius: Radius.lg, marginTop: 4 },
  cmdText: { fontSize: FontSize.xs, fontWeight: FontWeight.medium, flex: 1 },
});
