import { Tabs } from 'expo-router';
import { CustomTabBar } from '@/components/CustomTabBar';

export default function TabLayout() {
    return (
        <Tabs
            tabBar={(props) => <CustomTabBar {...props} />}
            screenOptions={{
                headerShown: false,
            }}
        >
            <Tabs.Screen
                name="index"
                options={{
                    title: 'Timer',
                }}
            />
            <Tabs.Screen
                name="folders"
                options={{
                    title: 'Folders',
                }}
            />
            <Tabs.Screen
                name="reports"
                options={{
                    title: 'Reports',
                }}
            />
        </Tabs>
    );
}
