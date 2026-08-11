import { useState } from 'react';
import { View, Text, TextInput, Pressable, Alert, StyleSheet } from 'react-native';
import { supabase } from '../../lib/supabase';

export default function Login() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleLogin() {
    if (!email.trim()) return;
    setLoading(true);

    // Gate: only emails present in the invites table can proceed.
    const { data: invite, error: inviteErr } = await supabase
      .from('invites')
      .select('id, used')
      .eq('email', email.trim().toLowerCase())
      .maybeSingle();

    if (inviteErr || !invite) {
      setLoading(false);
      Alert.alert(
        'Not invited',
        'This email has not been invited to SkillCircle. Ask the developer for an invite.'
      );
      return;
    }

    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: { shouldCreateUser: true },
    });

    setLoading(false);
    if (error) {
      Alert.alert('Error', error.message);
      return;
    }
    setSent(true);
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>SkillCircle</Text>
      <Text style={styles.subtitle}>Invite-only. Enter your invited email.</Text>

      <TextInput
        style={styles.input}
        placeholder="you@example.com"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />

      <Pressable style={styles.button} onPress={handleLogin} disabled={loading}>
        <Text style={styles.buttonText}>{loading ? 'Sending...' : 'Send magic link'}</Text>
      </Pressable>

      {sent && (
        <Text style={styles.sentText}>
          Check your email for a login link.
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24, backgroundColor: '#111827' },
  title: { fontSize: 32, fontWeight: '800', color: '#fff', marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#9CA3AF', marginBottom: 32 },
  input: {
    backgroundColor: '#1F2937',
    color: '#fff',
    padding: 14,
    borderRadius: 10,
    marginBottom: 16,
  },
  button: { backgroundColor: '#6366F1', padding: 16, borderRadius: 10, alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: '700' },
  sentText: { color: '#34D399', marginTop: 16, textAlign: 'center' },
});
