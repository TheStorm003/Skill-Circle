import { useCallback, useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet, Alert, Linking } from 'react-native';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { supabase } from '../../lib/supabase';

type Report = {
  id: string;
  day_number: number;
  content_richtext: string;
  attachment_url: string | null;
};

export default function SkillDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [skill, setSkill] = useState<any>(null);
  const [enrollment, setEnrollment] = useState<any>(null);
  const [reports, setReports] = useState<Report[]>([]);
  const [finalTips, setFinalTips] = useState<string | null>(null);
  const [uid, setUid] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data: userData } = await supabase.auth.getUser();
    const me = userData.user?.id ?? null;
    setUid(me);

    const { data: skillData } = await supabase
      .from('skills')
      .select('*, users:teacher_id(name)')
      .eq('id', id)
      .single();
    setSkill(skillData);

    if (me) {
      const { data: enr } = await supabase
        .from('enrollments')
        .select('*')
        .eq('skill_id', id)
        .eq('learner_id', me)
        .maybeSingle();
      setEnrollment(enr);

      if (enr) {
        const { data: rep } = await supabase
          .from('daily_reports')
          .select('id, day_number, content_richtext, attachment_url')
          .eq('skill_id', id)
          .eq('status', 'approved')
          .lte('day_number', enr.current_day || 1)
          .order('day_number', { ascending: true });
        setReports(rep ?? []);

        if (skillData?.duration_days && enr.current_day >= skillData.duration_days) {
          const { data: tips } = await supabase
            .from('skill_final_tips')
            .select('tips_richtext')
            .eq('skill_id', id)
            .eq('status', 'approved')
            .maybeSingle();
          setFinalTips(tips?.tips_richtext ?? null);
        }
      }
    }
  }, [id]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function enroll() {
    if (!uid) return;
    const { error } = await supabase
      .from('enrollments')
      .insert({ skill_id: id, learner_id: uid, current_day: 1 });
    if (error) {
      Alert.alert('Error', error.message);
      return;
    }
    load();
  }

  async function markDayDone() {
    if (!enrollment) return;
    const nextDay = (enrollment.current_day || 1) + 1;
    const completed = skill?.duration_days && nextDay > skill.duration_days;
    const { error } = await supabase
      .from('enrollments')
      .update({ current_day: nextDay, completed_at: completed ? new Date().toISOString() : null })
      .eq('id', enrollment.id);
    if (!error) load();
  }

  if (!skill) return <View style={styles.container} />;

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 20 }}>
      <Text style={styles.title}>{skill.title}</Text>
      <Text style={styles.meta}>By {skill.users?.name} · {skill.duration_days} days · {skill.status}</Text>
      {skill.description ? <Text style={styles.desc}>{skill.description}</Text> : null}

      {!enrollment && (
        <Pressable style={styles.enrollButton} onPress={enroll}>
          <Text style={styles.enrollButtonText}>Enroll in this skill</Text>
        </Pressable>
      )}

      {enrollment && (
        <>
          <Text style={styles.progress}>
            Your progress: Day {enrollment.current_day} of {skill.duration_days}
          </Text>

          {reports.map((r) => (
            <View key={r.id} style={styles.reportCard}>
              <Text style={styles.reportDay}>Day {r.day_number}</Text>
              <Text style={styles.reportContent}>{r.content_richtext}</Text>
              {r.attachment_url && (
                <Pressable onPress={() => Linking.openURL(r.attachment_url!)}>
                  <Text style={styles.attachmentLink}>📎 View attachment</Text>
                </Pressable>
              )}
            </View>
          ))}

          {reports.length > 0 && !finalTips && (
            <Pressable style={styles.enrollButton} onPress={markDayDone}>
              <Text style={styles.enrollButtonText}>Mark today done, continue</Text>
            </Pressable>
          )}

          {finalTips && (
            <View style={styles.tipsCard}>
              <Text style={styles.tipsTitle}>🎓 Shortcut & tips from your teacher</Text>
              <Text style={styles.reportContent}>{finalTips}</Text>
            </View>
          )}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111827' },
  title: { color: '#fff', fontSize: 24, fontWeight: '800' },
  meta: { color: '#9CA3AF', marginTop: 4, marginBottom: 12 },
  desc: { color: '#D1D5DB', marginBottom: 20 },
  enrollButton: { backgroundColor: '#6366F1', padding: 16, borderRadius: 10, alignItems: 'center', marginTop: 16 },
  enrollButtonText: { color: '#fff', fontWeight: '700' },
  progress: { color: '#9CA3AF', marginBottom: 16 },
  reportCard: { backgroundColor: '#1F2937', borderRadius: 12, padding: 16, marginBottom: 12 },
  reportDay: { color: '#6366F1', fontWeight: '700', marginBottom: 6 },
  reportContent: { color: '#D1D5DB', lineHeight: 20 },
  attachmentLink: { color: '#60A5FA', marginTop: 10 },
  tipsCard: { backgroundColor: '#312E81', borderRadius: 12, padding: 16, marginTop: 8 },
  tipsTitle: { color: '#fff', fontWeight: '700', marginBottom: 8 },
});
