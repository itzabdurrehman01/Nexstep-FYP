import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator, Linking } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { BookOpen, Search } from 'lucide-react-native';
import { useTheme } from '../../context/ThemeContext';
import { Colors, FontSize, FontWeight, Radius, Spacing } from '../../utils/theme';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { fetchCourses } from '../../api/careers';
import { createApplication, fetchApplications } from '../../api/features';

const BookOpenIcon: any = BookOpen;
const SearchIcon: any = Search;

interface Course {
  id: string;
  title: string;
  provider: string;
  category: string;
  level: string;
  duration: string;
  rating: number;
  isFree: boolean;
  url?: string;
}

const COURSES_DATA: Course[] = [
  { id: '1', title: 'Full-Stack Web Development Bootcamp', provider: 'Coursera / Meta', category: 'Web Dev', level: 'Beginner to Intermediate', duration: '12 Weeks', rating: 4.8, isFree: true },
  { id: '2', title: 'Python for Data Science & Machine Learning', provider: 'edX / Harvard', category: 'Data Science', level: 'Intermediate', duration: '8 Weeks', rating: 4.9, isFree: true },
  { id: '3', title: 'React Native & Expo Mobile App Engineering', provider: 'Udemy', category: 'Mobile Dev', level: 'Intermediate', duration: '10 Weeks', rating: 4.7, isFree: false },
  { id: '4', title: 'Google Cybersecurity Professional Certificate', provider: 'Coursera / Google', category: 'Cyber Security', level: 'Beginner', duration: '6 Months', rating: 4.8, isFree: true },
  { id: '5', title: 'AWS Certified Cloud Practitioner', provider: 'AWS Training', category: 'Cloud Computing', level: 'Beginner', duration: '4 Weeks', rating: 4.9, isFree: true },
];

export function CoursesScreen() {
  const { dark, colors: c } = useTheme();
  const [search, setSearch] = useState('');
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [enrolled, setEnrolled] = useState<Set<string>>(new Set());
  const [provider, setProvider] = useState('All');

  useEffect(() => {
    fetchApplications().then((apps) => setEnrolled(new Set(apps.filter((a: any) => /course/i.test(String(a.type))).map((a: any) => String(a.targetId || a.title))))).catch(() => {});
    fetchCourses().then((rows) => setCourses(rows.map((course: any, index) => ({
      id: String(course.id ?? index),
      title: String(course.title ?? course.name ?? 'Course'),
      provider: String(course.provider ?? 'Provider not listed'),
      category: String(course.category ?? course.format ?? 'Career Skills'),
      level: String(course.level ?? 'All levels'),
      duration: String(course.duration ?? 'Self-paced'),
      rating: Number(course.rating ?? 0),
      isFree: !Number(course.pricePkr) || /free/i.test(String(course.price ?? '')),
      url: course.officialUrl ?? course.enrollUrl,
    })))).catch(() => setCourses(COURSES_DATA)).finally(() => setLoading(false));
  }, []);

  const providers = ['All', ...Array.from(new Set(courses.map((cr) => cr.provider)))];
  const filtered = courses.filter(cr => (provider === 'All' || cr.provider === provider) && (cr.title.toLowerCase().includes(search.toLowerCase()) || cr.category.toLowerCase().includes(search.toLowerCase())));

  return (
    <ScrollView style={[styles.container, { backgroundColor: c.bg }]} contentContainerStyle={styles.content}>
      <Animated.View entering={FadeInDown.duration(350)} style={styles.header}>
        <Text style={styles.eyebrow}>SKILL ENHANCEMENT CATALOG</Text>
        <Text style={[styles.title, { color: c.text }]}>Skill Development Courses</Text>
        <Text style={[styles.subtitle, { color: c.muted }]}>
          Curated industry-recognized courses from top global platforms to bridge your skill gap.
        </Text>

        <View style={[styles.searchBox, { backgroundColor: c.surface2, borderColor: c.border }]}>
          <SearchIcon size={18} color={c.muted} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search courses or topics..."
            placeholderTextColor={c.muted}
            style={[styles.searchInput, { color: c.text }]}
          />
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
          {providers.slice(0, 8).map((p) => (
            <TouchableOpacity key={p} onPress={() => setProvider(p)} style={{ paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, backgroundColor: provider === p ? Colors.primary : c.surface2 }}>
              <Text style={{ color: provider === p ? '#06110d' : c.text, fontSize: FontSize.xs, fontWeight: FontWeight.bold }}>{p}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </Animated.View>

      {loading && <ActivityIndicator color={Colors.primary} size="large" />}
      {filtered.map((item) => (
        <Card key={item.id} dark={dark} elevated style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={[styles.iconBox, { backgroundColor: Colors.primary + '20' }]}>
              <BookOpenIcon size={22} color={Colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.cardTitle, { color: c.text }]}>{item.title}</Text>
              <Text style={[styles.provider, { color: Colors.primary, fontWeight: FontWeight.bold }]}>{item.provider}</Text>
            </View>
          </View>

          <View style={styles.badgeRow}>
            <Text style={styles.levelBadge}>{item.level}</Text>
            <Text style={[styles.metaBadge, { color: c.text }]}>⏱️ {item.duration}</Text>
            <Text style={styles.ratingBadge}>⭐ {item.rating}</Text>
            {item.isFree && <Text style={styles.freeBadge}>FREE Audit</Text>}
          </View>

          <Button
            title={enrolled.has(item.id) || enrolled.has(item.title) ? 'Enrolled' : 'Enroll / View Course'}
            onPress={async () => {
              try {
                await createApplication({ type: 'Course', title: item.title, targetId: item.id, targetName: item.provider, officialUrl: item.url });
                setEnrolled((s) => new Set([...s, item.id, item.title]));
              } catch { /* still open the link */ }
              if (item.url) Linking.openURL(item.url);
              else Alert.alert('Course link unavailable', 'Please search the provider website for this course.');
            }}
            variant="secondary"
          />
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
  searchBox: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: Radius.xl, paddingHorizontal: Spacing.md, gap: Spacing.sm, marginTop: Spacing.xs },
  searchInput: { flex: 1, paddingVertical: Spacing.sm, fontSize: FontSize.sm },
  card: { padding: Spacing.xl, borderRadius: Radius['2xl'], gap: Spacing.sm },
  cardHeader: { flexDirection: 'row', gap: Spacing.md, alignItems: 'center' },
  iconBox: { width: 44, height: 44, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { fontSize: FontSize.base, fontWeight: FontWeight.bold },
  provider: { fontSize: FontSize.xs, marginTop: 2 },
  badgeRow: { flexDirection: 'row', gap: Spacing.xs, flexWrap: 'wrap', alignItems: 'center' },
  levelBadge: { backgroundColor: Colors.primary + '20', color: Colors.primary, fontSize: FontSize.xs, fontWeight: FontWeight.bold, paddingHorizontal: Spacing.sm, paddingVertical: 2, borderRadius: Radius.md },
  metaBadge: { fontSize: FontSize.xs, fontWeight: FontWeight.bold },
  ratingBadge: { color: Colors.gold, fontSize: FontSize.xs, fontWeight: FontWeight.extrabold },
  freeBadge: { backgroundColor: Colors.success + '20', color: Colors.success, fontSize: FontSize.xs, fontWeight: FontWeight.extrabold, paddingHorizontal: Spacing.sm, paddingVertical: 2, borderRadius: Radius.md },
});
