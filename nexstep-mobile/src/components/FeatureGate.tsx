import React, { useState, useEffect } from 'react';
import { Alert, View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Lock, Sparkles, CheckCircle2, ShieldCheck, ArrowRight, X } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import { Colors, FontSize, FontWeight, Radius, Spacing } from '../utils/theme';
import { Button } from './Button';
import { Card } from './Card';
import { apiClient } from '../api/client';

const LockIcon: any = Lock;
const SparklesIcon: any = Sparkles;
const CheckIcon: any = CheckCircle2;
const ShieldCheckIcon: any = ShieldCheck;
const ArrowRightIcon: any = ArrowRight;
const XIcon: any = X;

interface Props {
  children: React.ReactNode;
  requiredPlan?: 'pro' | 'premium';
  featureName?: string;
  featureDesc?: string;
}

export function FeatureGate({
  children,
  requiredPlan = 'pro',
  featureName = 'Pro Feature',
  featureDesc = 'Unlock full access to this premium career guidance tool.',
}: Props) {
  const { dark, colors: c } = useTheme();
  const [activePlan, setActivePlan] = useState<'free' | 'pro' | 'premium'>('free');
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<'pro' | 'premium'>('pro');

  useEffect(() => {
    // Check subscription plan from backend
    apiClient
      .get('/api/payments/subscription')
      .then(({ data }) => {
        if (data?.data?.plan_slug || data?.data?.planSlug) {
          setActivePlan(data.data.plan_slug || data.data.planSlug);
        }
      })
      .catch(() => {});
  }, []);

  const isUnlocked = activePlan === requiredPlan || activePlan === 'pro' || activePlan === 'premium';

  if (isUnlocked) {
    return <>{children}</>;
  }

  const openSecureCheckout = () => {
    setModalVisible(false);
    Alert.alert(
      'Secure checkout',
      'Open Pricing from the app menu to view available payment methods. Features unlock only after the payment provider confirms your subscription.'
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: c.bg }]}>
      {/* Blurred / Dimmed preview of tool */}
      <View style={styles.previewDimmed}>
        {children}
      </View>

      {/* Lock Overlay */}
      <View style={[styles.overlay, { backgroundColor: dark ? 'rgba(8,11,20,0.92)' : 'rgba(255,255,255,0.94)' }]}>
        <Animated.View entering={FadeInDown.duration(350)} style={styles.lockBox}>
          <View style={[styles.lockIconCircle, { backgroundColor: Colors.primary + '20', borderColor: Colors.primary + '40' }]}>
            <LockIcon size={32} color={Colors.primary} />
          </View>

          <View style={[styles.badge, { backgroundColor: Colors.primary + '15', borderColor: Colors.primary + '30' }]}>
            <SparklesIcon size={13} color={Colors.primary} />
            <Text style={[styles.badgeText, { color: Colors.primary }]}>PRO FEATURE LOCKED</Text>
          </View>

          <Text style={[styles.title, { color: c.text }]}>{featureName}</Text>
          <Text style={[styles.subtitle, { color: c.muted }]}>{featureDesc}</Text>

          {/* Benefits checklist */}
          <View style={[styles.checklist, { backgroundColor: c.surface2, borderColor: c.border }]}>
            {['Unlimited AI evaluations', 'Priority BISE cutoffs', 'PDF career reports', '1-on-1 mentor connect'].map((item, idx) => (
              <View key={idx} style={styles.checkRow}>
                <CheckIcon size={14} color={Colors.primary} />
                <Text style={[styles.checkText, { color: c.text }]}>{item}</Text>
              </View>
            ))}
          </View>

          <Button
            label="View secure upgrade options"
            onPress={() => setModalVisible(true)}
            style={{ width: '100%' }}
          />
        </Animated.View>
      </View>

      {/* Upgrade Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalBg}>
          <View style={[styles.modalContent, { backgroundColor: c.surface, borderColor: c.border }]}>
            <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeBtn}>
              <XIcon size={20} color={c.text} />
            </TouchableOpacity>

            <Text style={[styles.modalTitle, { color: c.text }]}>Choose Your Plan</Text>
            <Text style={[styles.modalSub, { color: c.muted }]}>Choose a plan, then continue through secure checkout in Pricing.</Text>

            <ScrollView style={{ width: '100%', marginVertical: Spacing.md }}>
              <TouchableOpacity
                onPress={() => setSelectedPlan('pro')}
                style={[styles.planCard, { borderColor: selectedPlan === 'pro' ? Colors.primary : c.border, backgroundColor: c.surface2 }]}
              >
                <Text style={[styles.planName, { color: Colors.primary }]}>Pro Student</Text>
                <Text style={[styles.planPrice, { color: c.text }]}>PKR 1,500 <Text style={{ fontSize: 12, color: c.muted }}>/year</Text></Text>
                <Text style={[styles.planDesc, { color: c.muted }]}>Unlocks AI Interview, Transnational IBCC, and 3-Way Comparison.</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setSelectedPlan('premium')}
                style={[styles.planCard, { borderColor: selectedPlan === 'premium' ? Colors.accent : c.border, backgroundColor: c.surface2, marginTop: Spacing.sm }]}
              >
                <Text style={[styles.planName, { color: Colors.accent }]}>Premium Scholar</Text>
                <Text style={[styles.planPrice, { color: c.text }]}>PKR 3,500 <Text style={{ fontSize: 12, color: c.muted }}>/year</Text></Text>
                <Text style={[styles.planDesc, { color: c.muted }]}>Includes 1-on-1 mentor sessions and ATS resume generator.</Text>
              </TouchableOpacity>
            </ScrollView>

            <Button
              label={`View ${selectedPlan === 'pro' ? 'Pro' : 'Premium'} checkout`}
              onPress={openSecureCheckout}
              style={{ width: '100%' }}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, position: 'relative' },
  previewDimmed: { flex: 1, opacity: 0.15 },
  overlay: { ...StyleSheet.absoluteFill, zIndex: 10, alignItems: 'center', justifyContent: 'center', padding: Spacing['2xl'] },
  lockBox: { alignItems: 'center', width: '100%', maxWidth: 360, gap: Spacing.xs },
  lockIconCircle: { width: 64, height: 64, borderRadius: 32, borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.xs },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 4, borderRadius: Radius.full, borderWidth: 1 },
  badgeText: { fontSize: 10, fontWeight: FontWeight.bold, letterSpacing: 1 },
  title: { fontSize: FontSize.xl, fontWeight: FontWeight.extrabold, textAlign: 'center' },
  subtitle: { fontSize: FontSize.xs, textAlign: 'center', lineHeight: 18, marginBottom: Spacing.xs },
  checklist: { width: '100%', padding: Spacing.md, borderRadius: Radius.lg, borderWidth: 1, gap: 6, marginVertical: Spacing.xs },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  checkText: { fontSize: FontSize.xs, fontWeight: FontWeight.semibold },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', padding: Spacing.lg },
  modalContent: { borderRadius: Radius['2xl'], borderWidth: 1, padding: Spacing.xl, alignItems: 'center' },
  closeBtn: { alignSelf: 'flex-end', padding: 4 },
  modalTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.bold },
  modalSub: { fontSize: FontSize.xs, textAlign: 'center' },
  planCard: { padding: Spacing.md, borderRadius: Radius.xl, borderWidth: 1.5, gap: 4 },
  planName: { fontSize: FontSize.sm, fontWeight: FontWeight.extrabold },
  planPrice: { fontSize: FontSize.xl, fontWeight: FontWeight.extrabold },
  planDesc: { fontSize: FontSize.xs, lineHeight: 16 },
});
