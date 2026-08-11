import { useCallback, useState } from 'react';
import { View, Text, FlatList, Pressable, StyleSheet, RefreshControl } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';

type Skill = {
  id: string;
  title: string;
  description: string | null;
  duration_days: number;
  status: string;
  teacher_id: string;
  users: { name: string } | null;
};

export default function SkillCatalog() {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from('skills')
      .select('id, title, description, duration_days, status, teacher_id, users:teacher_id(name)')
      .order('created_at', { ascending: false });
    if (!error && data) setSkills(data as any);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={skills}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={{ padding: 16 }}
        ListEmptyComponent={<Text style={styles.empty}>No skills yet. Be the first to add one!</Text>}
        renderItem={({ item }) => (
          <Pressable style={styles.card} onPress={() => router.push(`/skill/${item.id}`)}>
            <Text style={styles.cardTitle}>{item.title}</Text>
            <Text style={styles.cardMeta}>
              Taught by {item.users?.name ?? 'Unknown'} · {item.duration_days} days · {item.status}
            </Text>
            {item.description ? <Text style={styles.cardDesc}>{item.description}</Text> : null}
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111827' },
  empty: { color: '#9CA3AF', textAlign: 'center', marginTop: 40 },
  card: { backgroundColor: '#1F2937', borderRadius: 12, padding: 16, marginBottom: 12 },
  cardTitle: { color: '#fff', fontSize: 18, fontWeight: '700' },
  cardMeta: { color: '#9CA3AF', fontSize: 12, marginTop: 4 },
  cardDesc: { color: '#D1D5DB', fontSize: 14, marginTop: 8 },
});
