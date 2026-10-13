import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Modal, FlatList, Alert } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Users, ThumbsUp, MessageSquare, Plus, Search, X } from 'lucide-react-native';
import { useTheme } from '../../context/ThemeContext';
import { Colors, FontSize, FontWeight, Radius, Spacing } from '../../utils/theme';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { apiClient } from '../../api/client';

const PlusIcon: any = Plus;
const ThumbsUpIcon: any = ThumbsUp;
const MessageSquareIcon: any = MessageSquare;
const XIcon: any = X;

interface Post {
  id: string;
  author: string;
  role: string;
  title: string;
  category: string;
  content: string;
  likes: number;
  comments: number;
  time: string;
}

export function CommunityScreen() {
  const { dark, colors: c } = useTheme();
  const [posts, setPosts] = useState<Post[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [category, setCategory] = useState('All');
  const [query, setQuery] = useState('');
  const CATEGORIES = ['All', 'ECAT & Entry Tests', 'Grade 8 & Matric', 'Scholarships', 'Transnational / O-A Levels', 'University Life', 'Career Guidance'];
  const SAMPLE: Post[] = [
    { id: 's1', author: 'Usama Farooq', role: 'FSc Pre-Eng', title: 'Is 82% in FSc enough for CS in COMSATS Islamabad?', category: 'ECAT & Entry Tests', content: 'I scored 82% in FSc Pre-Engineering and 78 in NTS-NAT.', likes: 18, comments: 6, time: '2 hours ago' },
    { id: 's2', author: 'Fatima Noor', role: 'Grade 10', title: 'Pre-Medical vs ICS: which has better scope?', category: 'Grade 8 & Matric', content: 'I scored 94% in 9th. Should I stay Pre-Medical or shift to ICS?', likes: 34, comments: 12, time: '5 hours ago' },
  ];

  const loadPosts = useCallback(async () => {
    try {
      const { data } = await apiClient.get('/api/forum/posts', { params: { limit: 50, ...(category !== 'All' ? { category } : {}) } });
      const rows = (data.data || []).map((p: any) => ({
        id: p.id, author: p.author_name || 'NexStep member', role: 'Community member', title: p.title,
        category: p.category || 'General', content: p.body, likes: Number(p.vote_count || 0),
        comments: Number(p.reply_count || 0), time: new Date(p.created_at).toLocaleDateString(),
      }));
      setPosts(rows.length ? rows : SAMPLE);
    } catch { setPosts(SAMPLE); }
  }, [category]);

  useEffect(() => { void loadPosts(); }, [loadPosts]);

  const handleLike = async (id: string) => {
    try {
      const { data } = await apiClient.post(`/api/forum/posts/${id}/vote`, { value: 1 });
      setPosts(prev => prev.map(p => p.id === id ? { ...p, likes: Number(data.voteCount || 0) } : p));
    } catch (error: any) { Alert.alert('Vote', error?.response?.data?.error || 'Sign in to vote.'); }
  };

  const handleCreatePost = async () => {
    if (!newTitle.trim() || !newContent.trim()) {
      Alert.alert('Incomplete Post', 'Please fill in both title and discussion details.');
      return;
    }
    try {
      await apiClient.post('/api/forum/posts', { title: newTitle.trim(), body: newContent.trim(), category: category === 'All' ? 'Career Guidance' : category });
      setNewTitle(''); setNewContent(''); setIsModalOpen(false);
      await loadPosts();
    } catch (error: any) { Alert.alert('Publish failed', error?.response?.data?.error || 'Could not publish this discussion.'); }
  };

  return (
    <View style={[styles.container, { backgroundColor: c.bg }]}>
      <FlatList
        data={posts.filter((p) => !query || `${p.title} ${p.content} ${p.category}`.toLowerCase().includes(query.toLowerCase()))}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          <Animated.View entering={FadeInDown.duration(350)} style={styles.header}>
            <View style={styles.headerRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.eyebrow}>STUDENT & ALUMNI FORUM</Text>
                <Text style={[styles.title, { color: c.text }]}>Community Hub</Text>
              </View>
              <TouchableOpacity onPress={() => setIsModalOpen(true)} style={[styles.createBtn, { backgroundColor: Colors.primary }]}>
                <PlusIcon size={20} color="#06110d" />
              </TouchableOpacity>
            </View>
            <TextInput value={query} onChangeText={setQuery} placeholder="Search conversations..." placeholderTextColor={c.muted} style={{ borderWidth: 1, borderColor: c.border, borderRadius: 12, padding: 10, color: c.text, marginTop: 8 }} />
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
              {CATEGORIES.map((cat) => (
                <TouchableOpacity key={cat} onPress={() => setCategory(cat)} style={{ paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, backgroundColor: category === cat ? Colors.primary : c.surface2 }}>
                  <Text style={{ color: category === cat ? '#06110d' : c.text, fontSize: FontSize.xs, fontWeight: FontWeight.bold }}>{cat}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </Animated.View>
        }
        renderItem={({ item }) => (
          <Card dark={dark} elevated style={styles.card}>
            <View style={styles.authorRow}>
              <View style={[styles.avatar, { backgroundColor: Colors.primary + '25' }]}>
                <Text style={{ color: Colors.primary, fontWeight: FontWeight.extrabold }}>{item.author[0]}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.authorName, { color: c.text }]}>{item.author}</Text>
                <Text style={[styles.authorRole, { color: c.muted }]}>{item.role} · {item.time}</Text>
              </View>
              <Text style={styles.catTag}>{item.category}</Text>
            </View>

            <Text style={[styles.postTitle, { color: c.text }]}>{item.title}</Text>
            <Text style={[styles.postContent, { color: c.muted }]}>{item.content}</Text>

            <View style={styles.footerRow}>
              <TouchableOpacity onPress={() => handleLike(item.id)} style={styles.actionBtn}>
                <ThumbsUpIcon size={16} color={Colors.primary} />
                <Text style={[styles.actionText, { color: c.text }]}>{item.likes} Upvotes</Text>
              </TouchableOpacity>
              <View style={styles.actionBtn}>
                <MessageSquareIcon size={16} color={c.muted} />
                <Text style={[styles.actionText, { color: c.muted }]}>{item.comments} Replies</Text>
              </View>
            </View>
          </Card>
        )}
      />

      <Modal visible={isModalOpen} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: c.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: c.text }]}>Start a New Discussion</Text>
              <TouchableOpacity onPress={() => setIsModalOpen(false)}>
                <XIcon size={20} color={c.text} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.label, { color: c.text }]}>Discussion Question Title</Text>
            <TextInput value={newTitle} onChangeText={setNewTitle} placeholder="Ask a question or share advice..." placeholderTextColor={c.muted} style={[styles.input, { backgroundColor: c.surface2, color: c.text, borderColor: c.border }]} />

            <Text style={[styles.label, { color: c.text, marginTop: Spacing.sm }]}>Post Details</Text>
            <TextInput value={newContent} onChangeText={setNewContent} multiline numberOfLines={4} placeholder="Add background information..." placeholderTextColor={c.muted} style={[styles.input, styles.textarea, { backgroundColor: c.surface2, color: c.text, borderColor: c.border }]} />

            <Button title="Publish Post" onPress={handleCreatePost} style={{ marginTop: Spacing.md }} />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: Spacing['2xl'], paddingBottom: 60, gap: Spacing.md },
  header: { marginBottom: Spacing.sm },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  eyebrow: { color: Colors.primary, fontSize: FontSize.xs, letterSpacing: 1.2, fontWeight: FontWeight.extrabold },
  title: { fontSize: FontSize['3xl'], fontWeight: FontWeight.extrabold },
  createBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  card: { padding: Spacing.xl, borderRadius: Radius['2xl'], gap: Spacing.sm, marginBottom: Spacing.sm },
  authorRow: { flexDirection: 'row', gap: Spacing.sm, alignItems: 'center' },
  avatar: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  authorName: { fontSize: FontSize.sm, fontWeight: FontWeight.bold },
  authorRole: { fontSize: FontSize.xs },
  catTag: { backgroundColor: Colors.primary + '20', fontSize: FontSize.xs, paddingHorizontal: Spacing.sm, paddingVertical: 2, borderRadius: Radius.md, color: Colors.primary },
  postTitle: { fontSize: FontSize.base, fontWeight: FontWeight.bold },
  postContent: { fontSize: FontSize.sm, lineHeight: 20 },
  footerRow: { flexDirection: 'row', gap: Spacing.lg, paddingTop: Spacing.xs, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)' },
  actionBtn: { flexDirection: 'row', gap: 4, alignItems: 'center' },
  actionText: { fontSize: FontSize.xs, fontWeight: FontWeight.bold },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: Radius['2xl'], borderTopRightRadius: Radius['2xl'], padding: Spacing['2xl'], gap: Spacing.sm },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.xs },
  modalTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.extrabold },
  label: { fontSize: FontSize.xs, fontWeight: FontWeight.bold },
  input: { borderWidth: 1, borderRadius: Radius.lg, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, fontSize: FontSize.sm },
  textarea: { minHeight: 90, textAlignVertical: 'top' },
});
