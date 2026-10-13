import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, Alert, TextInput } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { CheckCircle2, Sparkles, Zap, Award, CreditCard, X } from 'lucide-react-native';
import { useTheme } from '../../context/ThemeContext';
import { Colors, FontSize, FontWeight, Radius, Spacing } from '../../utils/theme';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { apiClient } from '../../api/client';
import { fetchPaymentAccount, submitManualPayment, withdrawManualPayment } from '../../api/features';

const CheckCircle2Icon: any = CheckCircle2;
const XIcon: any = X;

const PAYMENT_METHODS = [
  { id: 'JAZZCASH', name: 'JazzCash Mobile Wallet', icon: '📱', desc: 'Hosted JazzCash checkout' },
  { id: 'EASYPAISA', name: 'Easypaisa Wallet', icon: '📲', desc: 'Hosted Easypaisa checkout' },
  { id: 'CARD', name: 'Credit / Debit Card', icon: '💳', desc: 'Available after card gateway integration' },
  { id: 'BANK_TRANSFER', name: 'Bank Transfer', icon: '🏛️', desc: 'Manual verification by the NexStep team' },
];

const PLANS = [
  { slug: 'free', name: 'Student Free', price: 'PKR 0', period: 'Forever Free', features: ['Grade 8 & Matric Evaluator', 'F.Sc Stream Eligibility Calculator', 'University & Scholarship Directory', 'Basic Resume Builder'], isPopular: false },
  { slug: 'premium', name: 'Student Pro AI', price: 'PKR 999', period: 'per month', features: ['Everything in Free', 'Unlimited AI Mock Interviews', 'Full Skill Gap Action Plan', 'ATS Resume Score Optimizer', 'Priority 1-on-1 Counselor Access'], isPopular: true },
  { slug: 'pro', name: 'Institutional / School', price: 'PKR 1,999', period: 'per month', features: ['Bulk Student Enrollment', 'School Analytics Dashboard', 'Dedicated Career Guidance Expert', 'Custom BISE Board Integration'], isPopular: false },
];

export function PricingScreen() {
  const { dark, colors: c } = useTheme();
  const [selectedPlan, setSelectedPlan] = useState<any | null>(null);
  const [selectedGateway, setSelectedGateway] = useState('');
  const [plans, setPlans] = useState(PLANS);
  const [providers, setProviders] = useState<any[]>([]);
  const [paymentLoading, setPaymentLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [account, setAccount] = useState<any>(null);
  const [txId, setTxId] = useState('');
  const [senderName, setSenderName] = useState('');
  const [senderAccount, setSenderAccount] = useState('');

  const providersById = useMemo(() => Object.fromEntries(providers.map((provider) => [provider.id, provider])), [providers]);
  const selectedProvider = providersById[selectedGateway];

  useEffect(() => {
    let active = true;
    fetchPaymentAccount().then(setAccount).catch(() => {});
    Promise.all([apiClient.get('/api/payments/plans'), apiClient.get('/api/payments/providers')])
      .then(([plansResponse, providersResponse]) => {
        if (!active) return;
        const apiPlans = Array.isArray(plansResponse.data?.data) ? plansResponse.data.data : [];
        if (apiPlans.length) {
          setPlans(apiPlans.map((plan: any) => ({
            slug: plan.slug,
            name: plan.name,
            price: Number(plan.price_pkr) === 0 ? 'PKR 0' : `PKR ${Number(plan.price_pkr).toLocaleString('en-PK')}`,
            period: plan.billing_period ? `per ${plan.billing_period}` : 'per month',
            features: Array.isArray(plan.features) ? plan.features : [],
            isPopular: plan.slug === 'premium',
          })));
        }
        setProviders(Array.isArray(providersResponse.data?.data) ? providersResponse.data.data : []);
      })
      .catch(() => {
        if (active) setProviders([]);
      })
      .finally(() => {
        if (active) setPaymentLoading(false);
      });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const firstAvailable = PAYMENT_METHODS.find((method) => providersById[method.id]?.enabled);
    if (!providersById[selectedGateway]?.enabled) setSelectedGateway(firstAvailable?.id ?? '');
  }, [providersById, selectedGateway]);

  const handleCheckout = async () => {
    if (!selectedPlan) return;
    if (selectedPlan.price !== 'PKR 0' && !selectedProvider?.enabled) {
      Alert.alert('Payment unavailable', 'This payment method is not configured yet. Please select an available option or contact support.');
      return;
    }

    setIsProcessing(true);
    try {
      if (selectedPlan.price === 'PKR 0') {
        const { data } = await apiClient.post('/api/payments/initiate', { planSlug: selectedPlan.slug, provider: 'BANK_TRANSFER' });
        if (data.status === 'activated') Alert.alert('Plan activated', 'Your free plan is now active.', [{ text: 'OK', onPress: () => setSelectedPlan(null) }]);
        return;
      }
      if (!txId.trim() || !senderName.trim()) {
        Alert.alert('Payment details', 'Enter the transaction ID and the name you paid from — same as the website.');
        return;
      }
      await submitManualPayment({
        planSlug: selectedPlan.slug,
        method: selectedGateway || 'JAZZCASH',
        transactionId: txId.trim(),
        senderName: senderName.trim(),
        senderAccount: senderAccount.trim(),
        paidAt: new Date().toISOString(),
        note: 'Submitted from the NexStep mobile app',
      });
      Alert.alert('Submitted', 'Your payment is waiting for admin approval, just like on the website.');
      setSelectedPlan(null);
      setAccount(await fetchPaymentAccount());
    } catch (error: any) {
      Alert.alert('Checkout could not start', error?.response?.data?.error || 'Please check your connection and try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: c.bg }]} contentContainerStyle={styles.content}>
      <Animated.View entering={FadeInDown.duration(350)} style={styles.header}>
        <Text style={styles.eyebrow}>TRANSPARENT SUBSCRIPTIONS</Text>
        <Text style={[styles.title, { color: c.text }]}>Pricing Plans</Text>
        <Text style={[styles.subtitle, { color: c.muted }]}>
          Choose the right plan to accelerate your career and academic journey. Supports all Pakistani payment gateways.
        </Text>
      </Animated.View>

      {plans.map((plan, i) => (
        <Card key={i} dark={dark} elevated style={[styles.card, plan.isPopular && { borderColor: Colors.primary, borderWidth: 2 }]}>
          {plan.isPopular && (
            <View style={styles.popBadge}>
              <Text style={styles.popText}>MOST POPULAR FOR STUDENTS</Text>
            </View>
          )}

          <Text style={[styles.planName, { color: c.text }]}>{plan.name}</Text>
          <View style={styles.priceRow}>
            <Text style={[styles.priceVal, { color: plan.isPopular ? Colors.primary : c.text }]}>{plan.price}</Text>
            <Text style={[styles.pricePeriod, { color: c.muted }]}> / {plan.period}</Text>
          </View>

          <View style={styles.featureList}>
            {plan.features.map((feat, idx) => (
              <View key={idx} style={styles.featRow}>
                <CheckCircle2Icon size={16} color={Colors.primary} />
                <Text style={[styles.featText, { color: c.text }]}>{feat}</Text>
              </View>
            ))}
          </View>

          <Button
            title={plan.price === 'PKR 0' ? 'Activate Free Plan' : 'Select Secure Checkout'}
            onPress={() => {
              setSelectedPlan(plan);
            }}
            variant={plan.isPopular ? 'primary' : 'secondary'}
          />
        </Card>
      ))}

      {/* Local Payment Gateway Modal */}
      <Modal visible={!!selectedPlan} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: c.surface }]}>
            {selectedPlan && (
              <>
                <View style={styles.modalHeader}>
                  <View>
                    <Text style={styles.eyebrow}>PAKISTANI PAYMENT GATEWAY</Text>
                    <Text style={[styles.modalTitle, { color: c.text }]}>Checkout: {selectedPlan.name}</Text>
                  </View>
                  <TouchableOpacity onPress={() => setSelectedPlan(null)}>
                    <XIcon size={22} color={c.text} />
                  </TouchableOpacity>
                </View>

                <Text style={[styles.subtitle, { color: c.muted }]}>{selectedPlan.price === 'PKR 0' ? 'Activate the free plan for your account.' : `Select an available payment method (${selectedPlan.price}):`}</Text>

                {selectedPlan.price !== 'PKR 0' && PAYMENT_METHODS.map((pm) => {
                  const provider = providersById[pm.id];
                  const isAvailable = Boolean(provider?.enabled);
                  return (
                  <TouchableOpacity
                    key={pm.id}
                    disabled={!isAvailable}
                    onPress={() => isAvailable && setSelectedGateway(pm.id)}
                    style={[
                      styles.gwCard,
                      {
                        backgroundColor: selectedGateway === pm.id && isAvailable ? Colors.primary + '15' : c.surface2,
                        borderColor: selectedGateway === pm.id && isAvailable ? Colors.primary : c.border,
                        opacity: isAvailable ? 1 : 0.55,
                      }
                    ]}
                  >
                    <Text style={{ fontSize: 22 }}>{pm.icon}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.gwTitle, { color: c.text }]}>{pm.name}</Text>
                      <Text style={[styles.gwDesc, { color: c.muted }]}>{isAvailable ? pm.desc : paymentLoading ? 'Checking availability…' : provider?.reason || 'Unavailable'}</Text>
                    </View>
                  </TouchableOpacity>
                  );
                })}

                <TextInput value={txId} onChangeText={setTxId} placeholder="Transaction / JazzCash ID" placeholderTextColor={c.muted} style={{ borderWidth: 1, borderColor: c.border, borderRadius: 10, padding: 10, color: c.text }} />
                <TextInput value={senderName} onChangeText={setSenderName} placeholder="Sender name" placeholderTextColor={c.muted} style={{ borderWidth: 1, borderColor: c.border, borderRadius: 10, padding: 10, color: c.text }} />
                <TextInput value={senderAccount} onChangeText={setSenderAccount} placeholder="Sender account / mobile (optional)" placeholderTextColor={c.muted} style={{ borderWidth: 1, borderColor: c.border, borderRadius: 10, padding: 10, color: c.text }} />
                {account?.methods?.length ? <Text style={[styles.securityNote, { color: c.muted }]}>Pay to the JazzCash / Easypaisa / bank details shown on the website, then submit the same proof here.</Text> : null}
                {account?.history?.filter((h: any) => h.status === 'PROCESSING' || h.status === 'PENDING').map((h: any) => (
                  <Button key={h.id} title={`Withdraw pending ${h.id.slice(0, 6)}`} variant="ghost" onPress={async () => { await withdrawManualPayment(h.id); setAccount(await fetchPaymentAccount()); }} />
                ))}
                <Text style={[styles.securityNote, { color: c.muted }]}>NexStep never asks for your card number, wallet PIN, or CNIC in the app.</Text>
                <Button
                  title={selectedPlan.price === 'PKR 0' ? 'Activate Free Plan' : `Continue with ${PAYMENT_METHODS.find(m => m.id === selectedGateway)?.name || 'an available payment method'}`}
                  onPress={handleCheckout}
                  loading={isProcessing}
                  disabled={selectedPlan.price !== 'PKR 0' && !selectedProvider?.enabled}
                  style={{ marginTop: Spacing.sm }}
                />
              </>
            )}
          </View>
        </View>
      </Modal>
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
  popBadge: { backgroundColor: Colors.primary, paddingHorizontal: Spacing.md, paddingVertical: 4, borderRadius: Radius.full, alignSelf: 'flex-start' },
  popText: { color: '#06110d', fontSize: 10, fontWeight: FontWeight.extrabold },
  planName: { fontSize: FontSize.lg, fontWeight: FontWeight.extrabold },
  priceRow: { flexDirection: 'row', alignItems: 'baseline' },
  priceVal: { fontSize: FontSize['3xl'], fontWeight: FontWeight.extrabold },
  pricePeriod: { fontSize: FontSize.xs },
  featureList: { gap: 6, marginVertical: Spacing.xs },
  featRow: { flexDirection: 'row', gap: Spacing.sm, alignItems: 'center' },
  featText: { fontSize: FontSize.xs, fontWeight: FontWeight.medium },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: Radius['2xl'], borderTopRightRadius: Radius['2xl'], padding: Spacing['2xl'], gap: Spacing.sm },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.xs },
  modalTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.extrabold },
  gwCard: { flexDirection: 'row', gap: Spacing.md, alignItems: 'center', padding: Spacing.md, borderRadius: Radius.lg, borderWidth: 1, marginVertical: 2 },
  gwTitle: { fontSize: FontSize.sm, fontWeight: FontWeight.bold },
  gwDesc: { fontSize: FontSize.xs },
  securityNote: { fontSize: FontSize.xs, lineHeight: 18, marginTop: Spacing.sm },
});
