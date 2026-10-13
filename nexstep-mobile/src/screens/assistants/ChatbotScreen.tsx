import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, FlatList, ActivityIndicator } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Bot, Send, User, Sparkles } from 'lucide-react-native';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { Colors, FontSize, FontWeight, Radius, Spacing } from '../../utils/theme';
import { Card } from '../../components/Card';
import { fetchProfile } from '../../api/careers';
import { fetchAiStatus, fetchConversationMessages, fetchConversations, sendChat } from '../../api/features';

const SendIcon: any = Send;

interface Message {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  timestamp: string;
}

export function ChatbotScreen() {
  const { dark, colors: c } = useTheme();
  const { language } = useLanguage();
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [aiLive, setAiLive] = useState<string>('');
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      sender: 'bot',
      text: language === 'ur'
        ? 'السلام علیکم! میں نیکسٹ سٹیپ AI کیریئر اسسٹنٹ ہوں۔ مجھ سے یونیورسٹی کے داخلوں، ایف ایس سی کے شعبوں، اسکالرشپس، یا IT کے مواقع کے بارے میں کوئی بھی سوال پوچھیں۔'
        : 'Assalamu Alaikum! I am NexStep AI Career Assistant. Ask me anything about university admissions, F.Sc streams, scholarships, or IT careers in Pakistan.',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);

  useEffect(() => {
    fetchAiStatus().then((s) => setAiLive(s?.status === 'offline' ? 'AI counselor is offline right now.' : '')).catch(() => {});
    fetchConversations().then(async (convs) => {
      if (!convs[0]?.id) return;
      setConversationId(convs[0].id);
      const rows = await fetchConversationMessages(convs[0].id);
      if (!rows.length) return;
      setMessages(rows.map((row: any, i: number) => ({
        id: String(row.id ?? i),
        sender: row.role === 'user' || row.sender === 'user' ? 'user' : 'bot',
        text: row.content || row.text || '',
        timestamp: row.created_at ? new Date(row.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '',
      })));
    }).catch(() => {});
  }, []);

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    const userMsgText = input.trim();
    const userMsg: Message = {
      id: String(Date.now()),
      sender: 'user',
      text: userMsgText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const profile = await fetchProfile().catch(() => null);
      const history = [...messages, userMsg].slice(-8).map((m) => ({ role: m.sender === 'user' ? 'user' : 'assistant', content: m.text }));
      const data = await sendChat({
        message: userMsgText,
        language: language === 'ur' ? 'ur' : 'en',
        profile,
        conversationId,
        history,
      });
      if (data.conversationId) setConversationId(data.conversationId);

      const botReply = data.reply || data.response || 'Please consult official prospectuses for details.';
      const botMsg: Message = {
        id: String(Date.now() + 1),
        sender: 'bot',
        text: botReply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages((prev) => [...prev, botMsg]);
    } catch {
      // Fallback in case network or offline mode
      let fallback = language === 'ur' 
        ? 'پاکستان میں سافٹ ویئر انجینئرنگ، ڈیٹا سائنس اور میڈیکل فیلڈز کی ڈیمانڈ بہت زیادہ ہے۔'
        : 'In Pakistan, fields like Software Engineering, Data Science, and Pre-Medical offer high market demand.';
      if (userMsgText.toLowerCase().includes('scholarship') || userMsgText.toLowerCase().includes('fee')) {
        fallback = 'For financial assistance, check out Ehsaas Undergraduate Scholarship (100% tuition + stipend) or PEEF Punjab Endowment Fund.';
      }
      const botMsg: Message = {
        id: String(Date.now() + 1),
        sender: 'bot',
        text: fallback,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages((prev) => [...prev, botMsg]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: c.bg }]}>
      {/* Messages list */}
      <FlatList
        data={messages}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.messageList}
        ListHeaderComponent={
          <Animated.View entering={FadeInDown.duration(350)} style={styles.header}>
            <Text style={styles.eyebrow}>AI CAREER ASSISTANT</Text>
            <Text style={[styles.title, { color: c.text }]}>NexStep Chatbot</Text>
            <View style={[styles.discBox, { backgroundColor: c.surface2 }]}>
              <Text style={[styles.discText, { color: c.muted }]}>
                {aiLive || 'AI advice follows HEC/BISE rules. Check official prospectuses for fees and deadlines.'}
              </Text>
            </View>
          </Animated.View>
        }
        renderItem={({ item }) => (
          <View style={[styles.msgRow, item.sender === 'user' ? styles.userRow : styles.botRow]}>
            <View style={[
              styles.msgBubble,
              {
                backgroundColor: item.sender === 'user' ? Colors.primary : c.surface,
                borderBottomRightRadius: item.sender === 'user' ? 4 : Radius.xl,
                borderBottomLeftRadius: item.sender === 'bot' ? 4 : Radius.xl,
              }
            ]}>
              <Text style={[styles.msgText, { color: item.sender === 'user' ? '#06110d' : c.text }]}>{item.text}</Text>
              <Text style={[styles.msgTime, { color: item.sender === 'user' ? 'rgba(6,17,13,0.6)' : c.muted }]}>{item.timestamp}</Text>
            </View>
          </View>
        )}
      />

      {/* Loading Indicator */}
      {loading && (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="small" color={Colors.primary} />
          <Text style={[styles.loadingText, { color: c.muted }]}>NexStep AI is thinking...</Text>
        </View>
      )}

      {/* Suggested Prompts */}
      <View style={styles.promptBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: Spacing.xs, paddingHorizontal: Spacing.md }}>
          {['Best CS Universities in Pakistan?', 'Ehsaas Scholarship Eligibility', 'F.Sc Pre-Med vs Pre-Eng', 'How to build ATS resume?'].map((p, i) => (
            <TouchableOpacity key={i} onPress={() => setInput(p)} style={[styles.promptChip, { backgroundColor: c.surface2 }]}>
              <Text style={[styles.promptText, { color: c.text }]}>{p}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Input bar */}
      <View style={[styles.inputBar, { backgroundColor: c.surface, borderTopColor: c.border }]}>
        <TextInput
          value={input}
          onChangeText={setInput}
          placeholder="Ask NexStep AI..."
          placeholderTextColor={c.muted}
          style={[styles.input, { backgroundColor: c.surface2, color: c.text }]}
        />
        <TouchableOpacity onPress={handleSend} disabled={loading} style={[styles.sendBtn, { backgroundColor: Colors.primary, opacity: loading ? 0.6 : 1 }]}>
          <SendIcon size={18} color="#06110d" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { gap: Spacing.xs, marginBottom: Spacing.md },
  eyebrow: { color: Colors.primary, fontSize: FontSize.xs, letterSpacing: 1.2, fontWeight: FontWeight.extrabold },
  title: { fontSize: FontSize['2xl'], fontWeight: FontWeight.extrabold },
  discBox: { padding: Spacing.xs, paddingHorizontal: Spacing.md, borderRadius: Radius.md, marginTop: 4 },
  discText: { fontSize: 11, lineHeight: 15 },
  messageList: { padding: Spacing.lg, paddingBottom: 20 },
  msgRow: { marginVertical: 4, flexDirection: 'row' },
  userRow: { justifyContent: 'flex-end' },
  botRow: { justifyContent: 'flex-start' },
  msgBubble: { maxWidth: '80%', padding: Spacing.md, borderRadius: Radius.xl, gap: 4 },
  msgText: { fontSize: FontSize.sm, lineHeight: 20 },
  msgTime: { fontSize: 10, alignSelf: 'flex-end' },
  loadingBox: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, paddingHorizontal: Spacing.lg, marginBottom: 4 },
  loadingText: { fontSize: FontSize.xs },
  promptBar: { paddingVertical: Spacing.xs },
  promptChip: { paddingHorizontal: Spacing.md, paddingVertical: 6, borderRadius: Radius.full },
  promptText: { fontSize: FontSize.xs, fontWeight: FontWeight.semibold },
  inputBar: { flexDirection: 'row', alignItems: 'center', padding: Spacing.md, borderTopWidth: 1, gap: Spacing.sm },
  input: { flex: 1, height: 44, borderRadius: Radius.full, paddingHorizontal: Spacing.lg, fontSize: FontSize.sm },
  sendBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
});
