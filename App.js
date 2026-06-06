import React, { useState } from 'react';
import { SafeAreaView, StyleSheet, StatusBar } from 'react-native';
import ApiClient from './src/core/network/api_client';
import AuthScreen from './src/features/dashboard/screens/AuthScreen';
import DashboardScreen from './src/features/dashboard/screens/DashboardScreen';

const apiClient = new ApiClient();

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);

  const handleLoginSuccess = (userProfile) => {
    setCurrentUser(userProfile);
  };

  const handleLogout = () => {
    apiClient.setToken('');
    setCurrentUser(null);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      {currentUser ? (
        <DashboardScreen
          apiClient={apiClient}
          user={currentUser}
          onLogout={handleLogout}
        />
      ) : (
        <AuthScreen
          apiClient={apiClient}
          onLoginSuccess={handleLoginSuccess}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
});
