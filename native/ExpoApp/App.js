import * as React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import * as Notifications from 'expo-notifications';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { MaterialIcons } from '@expo/vector-icons';

import { AuthProvider, useAuth } from './context/AuthContext';
import { LocaleProvider, useLocale } from './context/LocaleContext';
import { routeFromNotification } from './services/notifications';
import { colors } from './theme';
import Loading from './components/ui/Loading';

const navigationRef = createNavigationContainerRef();

import PublishScreen from './screens/PublishScreen';
import FindScreen from './screens/FindScreen';
import TripsScreen from './screens/TripsScreen';
import ProfileScreen from './screens/ProfileScreen';
import CompleteProfileScreen from './screens/CompleteProfileScreen';
import UserProfileScreen from './screens/UserProfileScreen';
import RequestsScreen from './screens/RequestsScreen';
import LoginScreen from './screens/LoginScreen';
import SignupScreen from './screens/SignupScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const TAB_ICONS = {
  Find: 'search',
  Publish: 'add-circle-outline',
  Requests: 'hail',
  Trips: 'event-note',
  Profile: 'person',
};

const TAB_LABEL_KEYS = {
  Find: 'tabs.find',
  Publish: 'tabs.publish',
  Requests: 'tabs.requests',
  Trips: 'tabs.trips',
  Profile: 'tabs.profile',
};

function MainTabs() {
  const insets = useSafeAreaInsets();
  const { t } = useLocale();
  const tabBarHeight = 52 + insets.bottom;

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textFaint,
        tabBarSafeAreaInsets: { bottom: insets.bottom },
        tabBarStyle: {
          height: tabBarHeight,
          paddingTop: 6,
          paddingBottom: insets.bottom,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          backgroundColor: colors.surface,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.05,
          shadowRadius: 8,
          elevation: 8,
        },
        tabBarItemStyle: { paddingTop: 2 },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '700', marginBottom: Platform.OS === 'ios' ? 0 : 4 },
        tabBarLabel: t(TAB_LABEL_KEYS[route.name]),
        tabBarIcon: ({ color, size, focused }) => (
          <View style={focused ? tabStyles.iconActive : tabStyles.iconWrap}>
            <MaterialIcons name={TAB_ICONS[route.name]} size={focused ? size + 2 : size} color={color} />
          </View>
        ),
      })}
    >
      <Tab.Screen name="Find" component={FindScreen} />
      <Tab.Screen name="Publish" component={PublishScreen} />
      <Tab.Screen name="Requests" component={RequestsScreen} />
      <Tab.Screen name="Trips" component={TripsScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Signup" component={SignupScreen} />
      <Stack.Screen name="CompleteProfile" component={CompleteProfileScreen} />
    </Stack.Navigator>
  );
}

function AppStack() {
  const { t } = useLocale();
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.text,
        headerTitleStyle: { fontWeight: '700' },
      }}
    >
      <Stack.Screen name="Main" component={MainTabs} options={{ headerShown: false }} />
      <Stack.Screen
        name="CompleteProfile"
        component={CompleteProfileScreen}
        options={{ title: t('completeProfile.editTitle') }}
      />
      <Stack.Screen name="UserProfile" component={UserProfileScreen} options={{ headerShown: false }} />
    </Stack.Navigator>
  );
}

function RootNavigator() {
  const { user, loading } = useAuth();
  const { t } = useLocale();

  // Navigate when the user taps a push notification (foreground/background and
  // cold start). The registration itself happens in AuthContext on sign-in.
  React.useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      routeFromNotification(navigationRef, response.notification.request.content.data);
    });
    Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response) {
        routeFromNotification(navigationRef, response.notification.request.content.data);
      }
    });
    return () => sub.remove();
  }, []);

  if (loading) return <Loading text={t('common.loading')} />;
  return (
    <NavigationContainer ref={navigationRef}>
      {user ? <AppStack /> : <AuthStack />}
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <LocaleProvider>
        <AuthProvider>
          <RootNavigator />
        </AuthProvider>
      </LocaleProvider>
    </SafeAreaProvider>
  );
}

const tabStyles = StyleSheet.create({
  iconWrap: { padding: 4 },
  iconActive: {
    padding: 4,
    backgroundColor: colors.primaryLight,
    borderRadius: 12,
  },
});
