import { useCallback, useState } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';

export default function Profile() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [isDeveloper, setIsDeveloper] = useState(false);
  const [taughtCount, setTaughtCount] = useState(0);
  const [learnedCount, setLearnedCount] = useState(0);
  const router = useRouter();

  const load = useCallback(async () => {
    const { data: userData } = await supabase.auth.getUser();
    const uid = userData.user?.id;
    if (!uid) return;

    const { data: profile } = await supabase.from('users').select('*').eq('id', uid).single();
    if (profile) {
      setName(profile.name);
      setEmail(profile.email);
      setIsDeveloper(profile.is_developer);
    }

    const { count: taught } = await supabase
      .from('skills')
      .select('*', { count: 'exact', head: true })
      .eq('teacher_id', uid);
    setTaughtCount(taught ?? 0);

    const { count: learned } = await supabase
      .from('enrollments')
      .select('*', { count: 'exact', head: true })
      .eq('learner_id', uid)
      .not('completed_at', 'is', null);
    setLearnedCount(learned ?? 0);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.replace('/(auth)/login');
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 20 }}>
      <Text style={styles.name}>{name}</Text>
      <Text style={styles.email}>{email}</Text>
      {isDeveloper && <View style={styles.badge}><Text style={styles.badgeText}>Developer</Text></View>}

      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{taughtCount}</Text>
          <Text style={styles.statLabel}>Skills Taught</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{learnedCount}</Text>
          <Text style={styles.statLabel}>Skills Completed</Text>
        </View>
      </View>

      {isDeveloper && (
        <Pressable style={styles.adminButton} onPress={() => router.push('/admin/approvals')}>
          <Text style={styles.adminButtonText}>Open Approval Queue →</Text>
        </Pressable>
      )}

      <Pressable style={styles.signOutButton} onPress={handleSignOut}>
        <Text style={styles.signOutText}>Sign out</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111827' },
  name: { color: '#fff', fontSize: 24, fontWeight: '800' },
  email: { color: '#9CA3AF', marginTop: 4 },
  badge: { backgroundColor: '#6366F1', alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, marginTop: 10 },
  badgeText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  statsRow: { flexDirection: 'row', gap: 12, marginTop: 24 },
  statCard: { flex: 1, backgroundColor: '#1F2937', borderRadius: 12, padding: 16, alignItems: 'center' },
  statNumber: { color: '#fff', fontSize: 28, fontWeight: '800' },
  statLabel: { color: '#9CA3AF', fontSize: 12, marginTop: 4 },
  adminButton: { backgroundColor: '#374151', padding: 16, borderRadius: 10, marginTop: 28, alignItems: 'center' },
  adminButtonText: { color: '#fff', fontWeight: '700' },
  signOutButton: { padding: 16, borderRadius: 10, marginTop: 12, alignItems: 'center' },
  signOutText: { color: '#EF4444', fontWeight: '700' },
});
