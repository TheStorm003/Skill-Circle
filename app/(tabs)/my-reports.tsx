import { useCallback, useState } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, Alert, StyleSheet } from 'react-native';
import { useFocusEffect } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import { supabase } from '../../lib/supabase';

type MySkill = {
  id: string;
  title: string;
  duration_days: number;
  start_date: string;
};

function dayNumberForToday(startDate: string): number {
  const start = new Date(startDate);
  const today = new Date();
  const diffMs = today.setHours(0, 0, 0, 0) - start.setHours(0, 0, 0, 0);
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  return Math.min(diffDays + 1, 9999);
}

export default function MyReports() {
  const [mySkills, setMySkills] = useState<MySkill[]>([]);
  const [selected, setSelected] = useState<MySkill | null>(null);
  const [content, setContent] = useState('');
  const [attachmentUri, setAttachmentUri] = useState<string | null>(null);
  const [attachmentName, setAttachmentName] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    const { data: userData } = await supabase.auth.getUser();
    const uid = userData.user?.id;
    if (!uid) return;
    const { data } = await supabase
      .from('skills')
      .select('id, title, duration_days, start_date')
      .eq('teacher_id', uid)
      .eq('status', 'in_progress');
    if (data) setMySkills(data);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function pickDocument() {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/*'],
      copyToCacheDirectory: true,
    });
    if (!result.canceled && result.assets?.[0]) {
      setAttachmentUri(result.assets[0].uri);
      setAttachmentName(result.assets[0].name);
    }
  }

  async function submitReport() {
    if (!selected) {
      Alert.alert('Pick a skill', 'Select which course you are submitting a report for.');
      return;
    }
    if (!content.trim()) {
      Alert.alert('Empty report', "Write what you taught today before submitting.");
      return;
    }

    const dayNumber = dayNumberForToday(selected.start_date);
    if (dayNumber > selected.duration_days) {
      Alert.alert('Course finished', 'This course has already reached its final day.');
      return;
    }

    setLoading(true);

    let attachment_url: string | null = null;
    if (attachmentUri) {
      const fileExt = attachmentName?.split('.').pop() || 'dat';
      const path = `${selected.id}/day-${dayNumber}.${fileExt}`;
      const response = await fetch(attachmentUri);
      const blob = await response.blob();
      const { error: uploadErr } = await supabase.storage
        .from('report-attachments')
        .upload(path, blob, { upsert: true });
      if (!uploadErr) {
        const { data: pub } = supabase.storage.from('report-attachments').getPublicUrl(path);
        attachment_url = pub.publicUrl;
      }
    }

    const { error } = await supabase.from('daily_reports').insert({
      skill_id: selected.id,
      day_number: dayNumber,
      content_richtext: content.trim(),
      attachment_url,
      status: 'pending_review',
    });

    setLoading(false);

    if (error) {
      Alert.alert('Error', error.message.includes('duplicate') ? 'You already submitted today\'s report.' : error.message);
      return;
    }

    Alert.alert('Submitted', 'Your report is now pending developer approval.');
    setContent('');
    setAttachmentUri(null);
    setAttachmentName(null);
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 20 }}>
      <Text style={styles.heading}>Submit tonight's report</Text>

      {mySkills.length === 0 && (
        <Text style={styles.empty}>You aren't teaching any active skill yet. Add one from the Add Skill tab.</Text>
      )}

      {mySkills.map((s) => (
        <Pressable
          key={s.id}
          style={[styles.skillPick, selected?.id === s.id && styles.skillPickActive]}
          onPress={() => setSelected(s)}
        >
          <Text style={styles.skillPickText}>{s.title} — Day {dayNumberForToday(s.start_date)}/{s.duration_days}</Text>
        </Pressable>
      ))}

      {selected && (
        <>
          <Text style={styles.label}>What did you teach today?</Text>
          <TextInput
            style={[styles.input, { height: 160, textAlignVertical: 'top' }]}
            multiline
            placeholder="Describe today's lesson in detail..."
            placeholderTextColor="#6B7280"
            value={content}
            onChangeText={setContent}
          />

          <Pressable style={styles.attachButton} onPress={pickDocument}>
            <Text style={styles.attachButtonText}>
              {attachmentName ? `Attached: ${attachmentName}` : 'Attach a document / image (optional)'}
            </Text>
          </Pressable>

          <Pressable style={styles.button} onPress={submitReport} disabled={loading}>
            <Text style={styles.buttonText}>{loading ? 'Submitting...' : 'Submit Day Report'}</Text>
          </Pressable>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111827' },
  heading: { color: '#fff', fontSize: 20, fontWeight: '700', marginBottom: 16 },
  empty: { color: '#9CA3AF' },
  skillPick: { backgroundColor: '#1F2937', padding: 14, borderRadius: 10, marginBottom: 8 },
  skillPickActive: { borderColor: '#6366F1', borderWidth: 2 },
  skillPickText: { color: '#fff' },
  label: { color: '#9CA3AF', fontSize: 13, marginBottom: 6, marginTop: 20 },
  input: { backgroundColor: '#1F2937', color: '#fff', padding: 14, borderRadius: 10 },
  attachButton: { backgroundColor: '#1F2937', padding: 14, borderRadius: 10, marginTop: 12, borderStyle: 'dashed', borderWidth: 1, borderColor: '#4B5563' },
  attachButtonText: { color: '#9CA3AF', textAlign: 'center' },
  button: { backgroundColor: '#6366F1', padding: 16, borderRadius: 10, alignItems: 'center', marginTop: 20 },
  buttonText: { color: '#fff', fontWeight: '700' },
});
