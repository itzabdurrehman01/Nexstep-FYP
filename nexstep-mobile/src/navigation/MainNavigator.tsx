import React, { useState, useMemo, useEffect } from 'react';
import { ActivityIndicator, View, Text, StyleSheet, SafeAreaView, StatusBar, TouchableOpacity, Modal, ScrollView, TextInput } from 'react-native';
import { ArrowLeft, ChevronRight, Crown, Languages, LogOut, Moon, Search, Sun, X } from 'lucide-react-native';
import { TabBar } from '../components/TabBar';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { labelOf, menuGroups, NAV_ITEMS, primaryTabs } from '../config/navigation';
import { Colors, FontSize, FontWeight, Radius, Spacing } from '../utils/theme';
import { fetchProfile } from '../api/careers';
import { getAppRole, isPageAllowed } from '../config/access';
import { RoleSelectScreen } from '../screens/account/RoleSelectScreen';
import { LiveAlertsWatcher } from '../components/LiveAlertsWatcher';

const ArrowLeftIcon: any = ArrowLeft;
const XIcon: any = X;
const SearchIcon: any = Search;
const ChevronIcon: any = ChevronRight;
const SunIcon: any = Sun;
const MoonIcon: any = Moon;
const LanguagesIcon: any = Languages;
const LogOutIcon: any = LogOut;

import {
  AnalyticsScreen, AssessmentScreen, CalendarNotifScreen, CareerAIScreen,
  CareerComparisonScreen, ChatbotScreen, CommunityScreen, CoursesScreen, DashboardScreen,
  DegreeCareerScreen, EntryTestPrepScreen, FscMapperScreen, Grade8MatricScreen, HelpCenterScreen,
  JobsScreen, MentorshipScreen, MentorPortalScreen, MeritCalculatorScreen, MockInterviewScreen,
  OnboardingScreen, PathwayScreen, PricingScreen, ProfileScreen, ResumeScreen, RoadmapScreen,
  ScholarshipsScreen, SettingsScreen, SkillGapScreen, TevtaItScreen, TransnationalScreen,
  UniversitiesScreen, VoiceAssistantScreen,
} from '../screens';

const CrownIcon: any = Crown;

export function MainNavigator() {
  const { user, logout } = useAuth();
  const role = getAppRole(user?.role);
  const { dark, colors: c, setPreference } = useTheme();
  const { language, setLanguage } = useLanguage();

  const [level, setLevel] = useState<string | null>(null);
  const [levelReady, setLevelReady] = useState(role !== 'STUDENT');
  const [needsLevel, setNeedsLevel] = useState(false);
  const [forceQuiz, setForceQuiz] = useState(false);
  const homeTab = role === 'MENTOR' ? 'mentorPortal' : 'home';
  const [activeTab, setActiveTab] = useState<string>(homeTab);
  const [navHistory, setNavHistory] = useState<string[]>([homeTab]);
  const [isServicesOpen, setIsServicesOpen] = useState(false);
  const [pageQuery, setPageQuery] = useState('');

  useEffect(() => {
    if (role !== 'STUDENT') {
      setLevelReady(true);
      setNeedsLevel(false);
      return undefined;
    }
    let cancelled = false;
    fetchProfile().then((profile) => {
      if (cancelled) return;
      const nextLevel = profile?.education?.level || null;
      setLevel(nextLevel);
      setNeedsLevel(!nextLevel);
    }).catch(() => {
      if (cancelled) return;
      setLevel(null);
      setNeedsLevel(false);
    }).finally(() => {
      if (!cancelled) setLevelReady(true);
    });
    return () => { cancelled = true; };
  }, [role]);

  const visibleTab = isPageAllowed(activeTab, role, level) || activeTab === 'services' ? activeTab : homeTab;

  const pages = useMemo(() => menuGroups(role, level, pageQuery, language), [role, level, pageQuery, language]);
  const mainTabs = useMemo(() => new Set(primaryTabs(role, level).map((tab) => tab.id)), [role, level]);

  const handleNavigate = (route: string) => {
    if (route === 'services' || route === 'more') {
      setIsServicesOpen(true);
      return;
    }
    if (!isPageAllowed(route, role, level)) return;
    setIsServicesOpen(false);
    setPageQuery('');
    setNavHistory(prev => [...prev, route]);
    setActiveTab(route);
  };

  const handleBack = () => {
    if (navHistory.length > 1) {
      const nextHistory = [...navHistory];
      nextHistory.pop();
      const prevRoute = nextHistory[nextHistory.length - 1];
      setNavHistory(nextHistory);
      setActiveTab(isPageAllowed(prevRoute, role, level) ? prevRoute : homeTab);
    } else {
      setActiveTab(homeTab);
    }
  };

  const isMainTab = mainTabs.has(visibleTab);

  if (!levelReady) {
    return (
      <SafeAreaView style={[styles.root, { backgroundColor: c.bg, alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </SafeAreaView>
    );
  }

  if (role === 'STUDENT' && needsLevel) {
    return (
      <SafeAreaView style={[styles.root, { backgroundColor: c.bg }]}>
        <StatusBar barStyle={dark ? 'light-content' : 'dark-content'} backgroundColor={c.bg} />
        <RoleSelectScreen onSaved={(nextLevel) => {
          setLevel(nextLevel);
          setNeedsLevel(false);
          setForceQuiz(true);
          setActiveTab('onboarding');
          setNavHistory(['onboarding']);
        }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: c.bg }]}>
      <StatusBar
        barStyle={dark ? 'light-content' : 'dark-content'}
        backgroundColor={c.bg}
      />
      <LiveAlertsWatcher enabled />

      {/* Top Header Bar for Sub-screens */}
      {!isMainTab && (
        <View style={[styles.headerBar, { backgroundColor: c.surface, borderBottomColor: c.border }]}>
          <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
            <ArrowLeftIcon size={20} color={c.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: c.text }]}>
            {NAV_ITEMS[visibleTab] ? labelOf(NAV_ITEMS[visibleTab], language) : visibleTab}
          </Text>
          <TouchableOpacity onPress={() => setIsServicesOpen(true)} style={styles.menuBtn}>
            <SearchIcon size={20} color={Colors.primary} />
          </TouchableOpacity>
        </View>
      )}

      {/* Main Screen Router */}
      <View style={styles.content}>
        {visibleTab === 'home' && <DashboardScreen onNavigate={handleNavigate} />}
        {visibleTab === 'workspace' && <MentorPortalScreen />}
        {visibleTab === 'career' && <CareerAIScreen onNavigate={handleNavigate} />}
        {visibleTab === 'roadmap' && <RoadmapScreen />}
        {visibleTab === 'jobs' && <JobsScreen />}
        {visibleTab === 'profile' && <ProfileScreen onNavigate={handleNavigate} />}

        {/* All Extended Screens */}
        {visibleTab === 'onboarding' && <OnboardingScreen onDone={() => {
          setForceQuiz(true);
          handleNavigate('quiz');
        }} />}
        {visibleTab === 'grade8Matric' && <Grade8MatricScreen onNavigate={handleNavigate} />}
        {visibleTab === 'fscMapper' && <FscMapperScreen onNavigate={handleNavigate} />}
        {visibleTab === 'universities' && <UniversitiesScreen />}
        {visibleTab === 'scholarships' && <ScholarshipsScreen />}
        {visibleTab === 'tevtaIt' && <TevtaItScreen />}
        {visibleTab === 'transnational' && <TransnationalScreen />}
        {visibleTab === 'degreeCareer' && <DegreeCareerScreen />}
        {visibleTab === 'careerComparison' && <CareerComparisonScreen />}
        {visibleTab === 'quiz' && <AssessmentScreen forceStart={forceQuiz} onDone={() => { setForceQuiz(false); handleNavigate(isPageAllowed('career', role, level) ? 'career' : 'home'); }} />}
        {visibleTab === 'skillGap' && <SkillGapScreen />}
        {visibleTab === 'resume' && <ResumeScreen />}
        {visibleTab === 'courses' && <CoursesScreen />}
        {visibleTab === 'mockInterview' && <MockInterviewScreen />}
        {visibleTab === 'chatbot' && <ChatbotScreen />}
        {visibleTab === 'voiceAssistant' && <VoiceAssistantScreen />}
        {visibleTab === 'community' && <CommunityScreen />}
        {visibleTab === 'mentorship' && <MentorshipScreen />}
        {visibleTab === 'calendarNotif' && <CalendarNotifScreen />}
        {visibleTab === 'analytics' && <AnalyticsScreen />}
        {visibleTab === 'settings' && <SettingsScreen />}
        {visibleTab === 'helpCenter' && <HelpCenterScreen />}
        {visibleTab === 'mentorPortal' && role === 'MENTOR' && <MentorPortalScreen />}
        {visibleTab === 'pricing' && <PricingScreen />}
        {visibleTab === 'pathway' && <PathwayScreen onNavigate={handleNavigate} />}
        {visibleTab === 'meritCalculator' && <MeritCalculatorScreen />}
        {visibleTab === 'entryTestPrep' && <EntryTestPrepScreen />}
      </View>

      {/* Bottom Dock Navigation */}
      <TabBar activeTab={visibleTab} onTabPress={handleNavigate} dark={dark} role={role} level={level} moreOpen={isServicesOpen} />

      {/* All Services Quick Launcher Drawer Modal */}
      <Modal visible={isServicesOpen} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: c.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: c.text }]}>{language === 'ur' ? 'تمام صفحات' : 'All pages'}</Text>
              <TouchableOpacity onPress={() => setIsServicesOpen(false)} style={styles.closeBtn} accessibilityLabel="Close">
                <XIcon size={22} color={c.text} />
              </TouchableOpacity>
            </View>
            <View style={[styles.searchBox, { backgroundColor: c.surface2 }]}>
              <SearchIcon size={16} color={c.muted} />
              <TextInput
                value={pageQuery}
                onChangeText={setPageQuery}
                placeholder={language === 'ur' ? 'صفحہ تلاش کریں…' : 'Search pages…'}
                placeholderTextColor={c.muted}
                style={[styles.searchInput, { color: c.text }]}
              />
            </View>

            <ScrollView contentContainerStyle={styles.drawerScroll}>
              {pages.map((group) => (
                <View key={group.id} style={{ gap: Spacing.xs }}>
                  <Text style={[styles.catHeading, { color: c.muted }]}>{group.title.toUpperCase()}</Text>
                  {group.items.length === 0 ? (
                    <Text style={{ color: c.muted, padding: Spacing.sm }}>{language === 'ur' ? 'کوئی صفحہ نہیں ملا' : 'No pages found'}</Text>
                  ) : group.items.map((item) => {
                    const IconComponent: any = item.icon;
                    const active = visibleTab === item.id;
                    return (
                      <TouchableOpacity
                        key={item.id}
                        onPress={() => handleNavigate(item.id)}
                        style={[styles.pageRow, { backgroundColor: active ? Colors.primary + '18' : 'transparent' }]}
                      >
                        <View style={[styles.iconBox, { backgroundColor: active ? Colors.primary : c.surface2 }]}>
                          <IconComponent size={18} color={active ? '#ffffff' : c.text} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text numberOfLines={1} style={[styles.pageTitle, { color: active ? Colors.primary : c.text }]}>{labelOf(item, language)}</Text>
                          <Text numberOfLines={1} style={[styles.pageDesc, { color: c.muted }]}>{item.desc}</Text>
                        </View>
                        <ChevronIcon size={16} color={c.muted} />
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ))}
            </ScrollView>
            {role === 'STUDENT' && (
              <TouchableOpacity onPress={() => handleNavigate('pricing')} style={[styles.upgradeBtn, { backgroundColor: Colors.primary + '14' }]}>
                <CrownIcon size={16} color={Colors.primary} />
                <Text style={{ color: Colors.primary, fontWeight: FontWeight.semibold }}>{language === 'ur' ? 'اپ گریڈ' : 'Upgrade to Premium'}</Text>
              </TouchableOpacity>
            )}
            <View style={styles.sheetActions}>
              <TouchableOpacity onPress={() => setPreference(dark ? 'light' : 'dark')} style={[styles.sheetBtn, { backgroundColor: c.surface2 }]}>
                {dark ? <SunIcon size={16} color={c.text} /> : <MoonIcon size={16} color={c.text} />}
                <Text style={{ color: c.text, fontWeight: FontWeight.semibold }}>{dark ? (language === 'ur' ? 'روشن' : 'Light') : (language === 'ur' ? 'تاریک' : 'Dark')}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setLanguage(language === 'ur' ? 'en' : 'ur')} style={[styles.sheetBtn, { backgroundColor: c.surface2 }]}>
                <LanguagesIcon size={16} color={c.text} />
                <Text style={{ color: c.text, fontWeight: FontWeight.semibold }}>{language === 'ur' ? 'English' : 'اردو'}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => { setIsServicesOpen(false); logout(); }} style={[styles.sheetBtn, { backgroundColor: '#fef2f2' }]}>
                <LogOutIcon size={16} color={Colors.danger} />
                <Text style={{ color: Colors.danger, fontWeight: FontWeight.semibold }}>{language === 'ur' ? 'سائن آؤٹ' : 'Sign out'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  headerBar: { height: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.md, borderBottomWidth: 1 },
  backBtn: { padding: Spacing.xs },
  menuBtn: { padding: Spacing.xs },
  headerTitle: { fontSize: FontSize.base, fontWeight: FontWeight.bold },
  content: { flex: 1 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: Radius['2xl'], borderTopRightRadius: Radius['2xl'], padding: Spacing['2xl'], maxHeight: '88%', gap: Spacing.md },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modalEyebrow: { color: Colors.primary, fontSize: FontSize.xs, letterSpacing: 1.2, fontWeight: FontWeight.extrabold },
  modalTitle: { fontSize: FontSize.xl, fontWeight: FontWeight.extrabold },
  closeBtn: { padding: Spacing.xs },
  drawerScroll: { gap: Spacing.lg, paddingBottom: Spacing.lg },
  catHeading: { fontSize: FontSize.xs, letterSpacing: 1.1, fontWeight: FontWeight.extrabold, paddingHorizontal: Spacing.xs },
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, borderRadius: Radius.lg, paddingHorizontal: Spacing.md, height: 40 },
  searchInput: { flex: 1, fontSize: FontSize.sm, paddingVertical: 0 },
  pageRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, padding: Spacing.sm, borderRadius: Radius.lg },
  pageTitle: { fontSize: FontSize.sm, fontWeight: FontWeight.bold },
  pageDesc: { fontSize: FontSize.xs },
  iconBox: { width: 36, height: 36, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
  sheetActions: { flexDirection: 'row', gap: Spacing.sm },
  sheetBtn: { flex: 1, height: 44, borderRadius: Radius.lg, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6 },
  upgradeBtn: { height: 44, borderRadius: Radius.lg, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 },
});
