import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { EducationLevelForm } from '../../components/EducationLevelForm';
import { useLanguage } from '../../context/LanguageContext';
import { useTheme } from '../../context/ThemeContext';
import { Colors, FontSize, FontWeight, Spacing } from '../../utils/theme';

interface Props {
  onSaved: (level: string) => void;
}

export function RoleSelectScreen({ onSaved }: Props) {
  const { colors: c } = useTheme();
  const { language } = useLanguage();
  const isUr = language === 'ur';

  return (
    <ScrollView style={[styles.container, { backgroundColor: c.bg }]} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>{isUr ? 'خوش آمدید' : 'WELCOME'}</Text>
        <Text style={[styles.title, { color: c.text }]}>{isUr ? 'نیکسٹ اسٹیپ میں خوش آمدید!' : 'Welcome to NexStep'}</Text>
        <Text style={[styles.subtitle, { color: c.muted }]}>
          {isUr
            ? 'اپنی جماعت بتائیں تاکہ ہم صرف وہی دکھائیں جو آپ کے لیے ضروری ہے۔'
            : 'Tell us your class so we only show what matters at your stage.'}
        </Text>
      </View>
      <EducationLevelForm onSaved={onSaved} submitLabel={isUr ? 'آگے بڑھیں' : 'Continue'} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: Spacing['2xl'], paddingBottom: 60, gap: Spacing.xl },
  header: { gap: Spacing.xs },
  eyebrow: { color: Colors.primary, fontSize: FontSize.xs, letterSpacing: 1.2, fontWeight: FontWeight.extrabold },
  title: { fontSize: FontSize['3xl'], fontWeight: FontWeight.extrabold },
  subtitle: { fontSize: FontSize.sm, lineHeight: 20 },
});
