import { useState } from 'react';
import { View, Text, TextInput, Pressable, Alert, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';

export default function AddSkill() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [duration, setDuration] = useState('30');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit() {
    if (!title.trim()) {
      Alert.alert('Missing title', 'Give your skill a title.');
      return;
    }
    const days = parseInt(duration, 10);
    if (isNaN(days) || days < 30) {
      Alert.alert('Minimum duration', 'Every skill course must be at least 30 days.');
      return;
    }

    setLoading(true);
    const { data: userData } = await supabase.auth.getUser();
    const uid = userData.user?.id;
    if (!uid) { setLoading(false); return; }

    const { data, error } = await supabase
      .from('skills')
      .insert({
        title: title.trim(),
        description: description.trim() || null,
        teacher_id: uid,
        duration_days: days,
      })
      .select()
      .single();

    setLoading(false);

    if (error) {
      Alert.alert('Error', error.message);
      return;
    }

    Alert.alert(
      'Skill added',
      'Your course has started. Remember: your first day report is due tonight between 6 PM and 12 AM.'
    );
    setTitle('');
    setDescription('');
    setDuration('30');
    router.push(`/skill/${data.id}`);
  }

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Skill title</Text>
      <TextInput style={styles.input} placeholder="e.g. Full-Stack Web Development" value={title} onChangeText={setTitle} placeholderTextColor="#6B7280" />

      <Text style={styles.label}>Description</Text>
      <TextInput
        style={[styles.input, { height: 100, textAlignVertical: 'top' }]}
        placeholder="What will learners get out of this course?"
        value={description}
        onChangeText={setDescription}
        multiline
        placeholderTextColor="#6B7280"
      />

      <Text style={styles.label}>Duration (days, minimum 30)</Text>
      <TextInput style={styles.input} keyboardType="number-pad" value={duration} onChangeText={setDuration} placeholderTextColor="#6B7280" />

      <Pressable style={styles.button} onPress={handleSubmit} disabled={loading}>
        <Text style={styles.buttonText}>{loading ? 'Creating...' : 'Start Teaching This Skill'}</Text>
      </Pressable>

      <Text style={styles.note}>
        By adding a skill you commit to a nightly report (6 PM–12 AM) for the full course length.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111827', padding: 20 },
  label: { color: '#9CA3AF', fontSize: 13, marginBottom: 6, marginTop: 16 },
  input: { backgroundColor: '#1F2937', color: '#fff', padding: 14, borderRadius: 10 },
  button: { backgroundColor: '#6366F1', padding: 16, borderRadius: 10, alignItems: 'center', marginTop: 28 },
  buttonText: { color: '#fff', fontWeight: '700' },
  note: { color: '#6B7280', fontSize: 12, marginTop: 16, textAlign: 'center' },
});
