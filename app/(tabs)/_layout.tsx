import { Tabs } from 'expo-router';

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ headerStyle: { backgroundColor: '#111827' }, headerTintColor: '#fff', tabBarStyle: { backgroundColor: '#111827' }, tabBarActiveTintColor: '#6366F1', tabBarInactiveTintColor: '#6B7280' }}>
      <Tabs.Screen name="index" options={{ title: 'Skills' }} />
      <Tabs.Screen name="add-skill" options={{ title: 'Add Skill' }} />
      <Tabs.Screen name="my-reports" options={{ title: 'My Reports' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
    </Tabs>
  );
}
