import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';

const ROLES = [
  { label: 'Player', value: 'player' },
  { label: 'Coach', value: 'coach' },
  { label: 'Sponsor', value: 'sponsor' },
  { label: 'Scorer', value: 'scorer' },
];

const AuthScreen = ({ apiClient, onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [role, setRole] = useState('player');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);
  const [showRoleDropdown, setShowRoleDropdown] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    setMessage(null);
    setError(null);

    try {
      if (isLogin) {
        const res = await apiClient.login(email, password);
        if (res && res.access_token) {
          apiClient.setToken(res.access_token);
          const profile = await apiClient.getProfile();
          if (profile && profile.role) {
            onLoginSuccess(profile);
          } else {
            setError('Profile retrieval failed.');
          }
        } else {
          setError(res?.detail || 'Login failed.');
        }
      } else {
        const userData = {
          email,
          password,
          full_name: name,
          role,
        };
        const res = await apiClient.register(userData);
        if (res && res.id) {
          setMessage('Registration request sent! Please await Department Admin approval.');
          setIsLogin(true);
        } else {
          setError(res?.detail || 'Registration failed.');
        }
      }
    } catch (err) {
      setError('Could not connect to the backend server.');
    } finally {
      setLoading(false);
    }
  };

  const getSelectedRoleLabel = () => {
    const selected = ROLES.find(r => r.value === role);
    return selected ? selected.label : 'Select Role';
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.card}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.icon}>🏏</Text>
          <Text style={styles.title}>SPORTS CRICKET</Text>
        </View>
        <Text style={styles.subtitle}>Mobile Integration Scaffold (React Native)</Text>

        {/* Message Banner */}
        {message && (
          <View style={styles.successBox}>
            <Text style={styles.successText}>{message}</Text>
          </View>
        )}

        {/* Error Banner */}
        {error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Input Fields */}
        {!isLogin && (
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Full Name</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter full name"
              placeholderTextColor="#555"
              value={name}
              onChangeText={setName}
            />
          </View>
        )}

        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Email Address</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter email address"
            placeholderTextColor="#555"
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Password</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter password"
            placeholderTextColor="#555"
            secureTextEntry
            autoCapitalize="none"
            value={password}
            onChangeText={setPassword}
          />
        </View>

        {/* Custom Role Picker (only for registration) */}
        {!isLogin && (
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>System Role</Text>
            <TouchableOpacity
              style={styles.dropdownButton}
              onPress={() => setShowRoleDropdown(!showRoleDropdown)}
            >
              <Text style={styles.dropdownButtonText}>{getSelectedRoleLabel()}</Text>
              <Text style={styles.dropdownArrow}>{showRoleDropdown ? '▲' : '▼'}</Text>
            </TouchableOpacity>

            {showRoleDropdown && (
              <View style={styles.dropdownMenu}>
                {ROLES.map((r) => (
                  <TouchableOpacity
                    key={r.value}
                    style={[
                      styles.dropdownItem,
                      role === r.value && styles.dropdownItemActive,
                    ]}
                    onPress={() => {
                      setRole(r.value);
                      setShowRoleDropdown(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.dropdownItemText,
                        role === r.value && styles.dropdownItemTextActive,
                      ]}
                    >
                      {r.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        )}

        {/* Submit Button */}
        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#000" />
          ) : (
            <Text style={styles.buttonText}>{isLogin ? 'LOG IN' : 'REGISTER'}</Text>
          )}
        </TouchableOpacity>

        {/* Toggle Login/Register */}
        <TouchableOpacity
          style={styles.toggleButton}
          onPress={() => {
            setIsLogin(!isLogin);
            setMessage(null);
            setError(null);
          }}
        >
          <Text style={styles.toggleButtonText}>
            {isLogin
              ? 'Need an account? Register instead'
              : 'Already registered? Log in instead'}
          </Text>
        </TouchableOpacity>

      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: '#FFFFFF',
    width: '100%',
    maxWidth: 400,
    borderRadius: 12,
    padding: 24,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  icon: {
    fontSize: 28,
    marginRight: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#000000',
  },
  subtitle: {
    color: '#666666',
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 24,
  },
  successBox: {
    backgroundColor: '#E8F5E9',
    borderWidth: 1,
    borderColor: '#4CAF50',
    borderRadius: 6,
    padding: 10,
    marginBottom: 16,
  },
  successText: {
    color: '#2E7D32',
    fontSize: 12,
    fontWeight: '500',
  },
  errorBox: {
    backgroundColor: '#FFEBEE',
    borderWidth: 1,
    borderColor: '#EF5350',
    borderRadius: 6,
    padding: 10,
    marginBottom: 16,
  },
  errorText: {
    color: '#C62828',
    fontSize: 12,
    fontWeight: '500',
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    color: '#1A1A1A',
    fontSize: 14,
    marginBottom: 6,
    fontWeight: '600',
  },
  input: {
    backgroundColor: '#FFFFFF',
    color: '#000000',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#CCCCCC',
  },
  dropdownButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#CCCCCC',
  },
  dropdownButtonText: {
    color: '#000000',
    fontSize: 14,
  },
  dropdownArrow: {
    color: '#000000',
    fontSize: 12,
  },
  dropdownMenu: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CCCCCC',
    borderRadius: 6,
    marginTop: 4,
    overflow: 'hidden',
  },
  dropdownItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  dropdownItemActive: {
    backgroundColor: '#EEEEEE',
  },
  dropdownItemText: {
    color: '#333333',
    fontSize: 14,
  },
  dropdownItemTextActive: {
    color: '#000000',
    fontWeight: 'bold',
  },
  button: {
    backgroundColor: '#000000',
    borderRadius: 6,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 15,
  },
  toggleButton: {
    alignItems: 'center',
    marginTop: 16,
  },
  toggleButtonText: {
    color: '#000000',
    fontSize: 13,
    textDecorationLine: 'underline',
  },

});

export default AuthScreen;
