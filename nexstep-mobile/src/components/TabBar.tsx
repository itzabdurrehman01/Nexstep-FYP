import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import Animated, { FadeInDown, Layout } from 'react-native-reanimated';
import { LayoutGrid } from 'lucide-react-native';
import { getColors, Colors, Spacing, FontSize, FontWeight, Radius } from '../utils/theme';
import { useLanguage } from '../context/LanguageContext';
import { primaryTabs, shortOf } from '../config/navigation';

interface Props {
  activeTab: string;
  onTabPress: (tab: string) => void;
  dark?: boolean;
  role?: string;
  level?: string | null;
  moreOpen?: boolean;
}

export function TabBar({
  activeTab,
  onTabPress,
  dark = false,
  role = 'STUDENT',
  level = null,
  moreOpen = false,
}: Props) {
  const c = getColors(dark);
  const { language } = useLanguage();
  const tabs = primaryTabs(role, level);
  const moreActive = moreOpen || !tabs.some((tab) => tab.id === activeTab);
  const moreLabel = language === 'ur' ? 'مزید' : 'More';

  return (
    <View style={[styles.bar, { backgroundColor: c.surface, borderTopColor: c.border, paddingBottom: Platform.OS === 'ios' ? 20 : Spacing.md }]}>
      {tabs.map((tab) => {
        const active = activeTab === tab.id && !moreOpen;
        const Icon: React.ComponentType<any> = tab.icon as React.ComponentType<any>;
        return (
          <TouchableOpacity
            key={tab.id}
            onPress={() => onTabPress(tab.id)}
            style={styles.tab}
            activeOpacity={0.75}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            accessibilityLabel={shortOf(tab, language)}
          >
            {active && <Animated.View entering={FadeInDown.duration(180)} layout={Layout.springify()} style={[styles.indicator, { backgroundColor: Colors.primary }]} />}
            <Icon size={20} strokeWidth={active ? 2.6 : 1.8} color={active ? Colors.primary : c.muted} />
            <Text numberOfLines={1} style={[styles.label, { color: active ? Colors.primary : c.muted, fontWeight: active ? FontWeight.bold : FontWeight.normal }]}>
              {shortOf(tab, language)}
            </Text>
          </TouchableOpacity>
        );
      })}
      <TouchableOpacity
        onPress={() => onTabPress('more')}
        style={styles.tab}
        activeOpacity={0.75}
        accessibilityRole="tab"
        accessibilityState={{ selected: moreActive }}
        accessibilityLabel={moreLabel}
      >
        {moreActive && <Animated.View entering={FadeInDown.duration(180)} layout={Layout.springify()} style={[styles.indicator, { backgroundColor: Colors.primary }]} />}
        <LayoutGrid size={20} strokeWidth={moreActive ? 2.6 : 1.8} color={moreActive ? Colors.primary : c.muted} />
        <Text numberOfLines={1} style={[styles.label, { color: moreActive ? Colors.primary : c.muted, fontWeight: moreActive ? FontWeight.bold : FontWeight.normal }]}>
          {moreLabel}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', borderTopWidth: 1, paddingTop: Spacing.sm, shadowColor: '#020617', shadowOffset: { width: 0, height: -6 }, shadowRadius: 18, shadowOpacity: 0.08, elevation: 16 },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 3, minHeight: 54, position: 'relative' },
  indicator: { position: 'absolute', top: -Spacing.sm, width: 28, height: 3, borderRadius: Radius.full },
  label: { fontSize: FontSize.xs, maxWidth: 68 },
});
