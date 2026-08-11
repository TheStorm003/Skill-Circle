import { useCallback, useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet, Alert, Linking, TextInput } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { supabase } from '../../lib/supabase';

type PendingReport = {
  id: string;
  day_number: number;
  content_richtext: string;
  attachment_url: string | null;
  skills: { title: string; users: { name: string } } | null;
};

export default function Approvals() {
  const [pending, setPending] = useState<PendingReport[]>([]);
  const [notes, setNotes] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from('daily_reports')
      .select('id, day_number, content_richtext, attachment_url, skills(title, users:teacher_id(name))')
      .eq('status', 'pending_review')
      .order('submitted_at', { ascending: true });
    if (!error && data) setPending(data as any);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function decide(id: string, decision: 'approved' | 'rejected') {
    const { data: userData } = await supabase.auth.getUser();
    const { error } = await supabase
      .from('daily_reports')
      .update({
        status: decision,
        reviewed_by: userData.user?.id,
        reviewer_notes: notes[id] ?? null,
      })
      .eq('id', id);

    if (error) {
      Alert.alert('Error', error.message);
      return;
    }
    load();
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 20 }}>
      <Text style={styles.heading}>Pending Reports ({pending.length})</Text>

      {pending.length === 0 && <Text style={styles.empty}>Nothing waiting for review. 🎉</Text>}

      {pending.map((r) => (
        <View key={r.id} style={styles.card}>
          <Text style={styles.cardTitle}>{r.skills?.title} — Day {r.day_number}</Text>
          <Text style={styles.cardTeacher}>by {r.skills?.users?.name}</Text>
          <Text style={styles.cardContent}>{r.content_richtext}</Text>

          {r.attachment_url && (
            <Pressable onPress={() => Linking.openURL(r.attachment_url!)}>
              <Text style={styles.attachmentLink}>📎 View attachment</Text>
            </Pressable>
          )}

          <TextInput
            style={styles.notesInput}
            placeholder="Optional note to the teacher (e.g. reason for rejection)"
            placeholderTextColor="#6B7280"
            value={notes[r.id] ?? ''}
            onChangeText={(t) => setNotes((prev) => ({ ...prev, [r.id]: t }))}
          />

          <View style={styles.actionRow}>
            <Pressable style={styles.approveButton} onPress={() => decide(r.id, 'approved')}>
              <Text style={styles.actionText}>Approve</Text>
            </Pressable>
            <Pressable style={styles.rejectButton} onPress={() => decide(r.id, 'rejected')}>
              <Text style={styles.actionText}>Reject</Text>
            </Pressable>
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111827' },
  heading: { color: '#fff', fontSize: 20, fontWeight: '700', marginBottom: 16 },
  empty: { color: '#9CA3AF' },
  card: { backgroundColor: '#1F2937', borderRadius: 12, padding: 16, marginBottom: 16 },
  cardTitle: { color: '#fff', fontWeight: '700', fontSize: 16 },
  cardTeacher: { color: '#9CA3AF', fontSize: 12, marginBottom: 10 },
  cardContent: { color: '#D1D5DB', lineHeight: 20 },
  attachmentLink: { color: '#60A5FA', marginTop: 10 },
  notesInput: { backgroundColor: '#111827', color: '#fff', padding: 10, borderRadius: 8, marginTop: 12 },
  actionRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  approveButton: { flex: 1, backgroundColor: '#059669', padding: 12, borderRadius: 8, alignItems: 'center' },
  rejectButton: { flex: 1, backgroundColor: '#DC2626', padding: 12, borderRadius: 8, alignItems: 'center' },
  actionText: { color: '#fff', fontWeight: '700' },
});
