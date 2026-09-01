import 'react-native-gesture-handler';
import React from 'react';
import { View, Pressable, StatusBar, StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { NavigationContainer, DarkTheme, DefaultTheme } from '@react-navigation/native';
import { createBottomTabNavigator, type BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useFonts } from 'expo-font';

import { fontAssets } from './app/lib/theme/tokens';
import { useTheme } from './app/lib/theme/useTheme';
import { useSettingsStore } from './app/lib/storage/settingsStore';
import { AppText } from './app/components/ui/Text';
import { IconHosts, IconSession, IconSettings } from './app/components/ui/icons';
import { WelcomeScreen } from './app/screens/Welcome';
import { HostsScreen } from './app/screens/Hosts';
import { SessionScreen } from './app/screens/Session';
import { SettingsScreen } from './app/screens/Settings';
import type { TabParamList } from './app/navigation/TabParamList';

const Tab = createBottomTabNavigator<TabParamList>();

function CustomTabBar({ state, navigation }: BottomTabBarProps) {
  const theme = useTheme();
  const c = theme.colors;
  const insets = useSafeAreaInsets();
  const items: { key: keyof TabParamList; label: string; Icon: typeof IconHosts }[] = [
    { key: 'Hosts', label: 'HOSTS', Icon: IconHosts },
    { key: 'Session', label: 'SESSION', Icon: IconSession },
    { key: 'Settings', label: 'SETTINGS', Icon: IconSettings },
  ];
  return (
    <View style={[styles.tabBar, { borderTopColor: c.fg, backgroundColor: c.bg, paddingBottom: insets.bottom || 10 }]}>
      {items.map((item, i) => {
        const focused = state.routes[state.index].name === item.key;
        const color = focused ? c.acc : c.dim2;
        return (
          <Pressable
            key={item.key}
            onPress={() => navigation.navigate(item.key)}
            style={[styles.tabItem, { borderBottomColor: focused ? c.acc : 'transparent' }]}
          >
            <item.Icon color={color} size={20} />
            <AppText weight="semiBold" mono size={10} color={color} letterSpacing={1.2}>{item.label}</AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{ headerShown: false }}
      tabBar={(props) => (props.state.routes[props.state.index].name === 'Session' ? null : <CustomTabBar {...props} />)}
    >
      <Tab.Screen name="Hosts" component={HostsScreen} />
      <Tab.Screen name="Session" component={SessionScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
}

function Root() {
  const theme = useTheme();
  const welcomed = useSettingsStore((s) => s.welcomed);
  const navTheme = theme.isDark
    ? { ...DarkTheme, colors: { ...DarkTheme.colors, background: theme.colors.bg } }
    : { ...DefaultTheme, colors: { ...DefaultTheme.colors, background: theme.colors.bg } };

  return (
    <NavigationContainer theme={navTheme}>
      <StatusBar barStyle={theme.isDark ? 'light-content' : 'dark-content'} backgroundColor={theme.colors.bg} />
      {welcomed ? <MainTabs /> : <WelcomeScreen />}
    </NavigationContainer>
  );
}

export default function App() {
  const [fontsLoaded] = useFonts(fontAssets);
  if (!fontsLoaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <BottomSheetModalProvider>
          <Root />
        </BottomSheetModalProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  tabBar: { flexDirection: 'row', borderTopWidth: 2, paddingTop: 4 },
  tabItem: { flex: 1, alignItems: 'center', gap: 6, paddingVertical: 10, borderBottomWidth: 3 },
});
