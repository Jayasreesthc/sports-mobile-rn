import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Modal, ScrollView } from 'react-native';
import PlayerDashboard from './PlayerDashboard';
import CoachDashboard from './CoachDashboard';
import SponsorDashboard from './SponsorDashboard';
import ScorerDashboard from './ScorerDashboard';

const DashboardScreen = ({ apiClient, user, onLogout }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState([]);
  const [tournaments, setTournaments] = useState([]);
  const [coaches, setCoaches] = useState([]);
  const [players, setPlayers] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);

  const fetchDashboard = async () => {
    setLoading(true);
    try {
      const role = user.role;
      let dashData = null;
      if (role === 'player') {
        dashData = await apiClient.getPlayerDashboard();
        const fCoaches = await apiClient.getUsersList('coach');
        setCoaches(Array.isArray(fCoaches) ? fCoaches : []);
        const fPlayers = await apiClient.getUsersList('player');
        setPlayers(Array.isArray(fPlayers) ? fPlayers : []);
      } else if (role === 'coach') {
        dashData = await apiClient.getCoachDashboard();
      } else if (role === 'sponsor') {
        dashData = await apiClient.getSponsorDashboard();
      } else if (role === 'scorer') {
        dashData = await apiClient.getScorerDashboard();
      }
      setData(dashData);

      const fNotes = await apiClient.getNotificationLogs();
      const filteredNotes = Array.isArray(fNotes) ? fNotes.filter(n => n.recipient_email === user.email) : [];
      setNotifications(filteredNotes);
      
      const resTourneys = await apiClient.request(`${apiClient.constructor.baseUrl}/tournaments`);
      setTournaments(Array.isArray(resTourneys) ? resTourneys : []);
    } catch (e) {
      console.error('Error fetching dashboard:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const roleLabel = (user.role || '').toUpperCase();
  const readableRole = (user.role || '').replace('_', ' ').toUpperCase();

  const getMatchesCount = () => {
    if (!data) return 0;
    if (user.role === 'player') return data.matches_played || 0;
    if (user.role === 'coach') return data.matches_played || 0;
    if (user.role === 'sponsor') return data.total_sponsored_tournaments || 0;
    if (user.role === 'scorer') return data.total_scored_matches || 0;
    return 0;
  };

  return (
    <View style={styles.container}>
      {/* Custom Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{roleLabel} PORTAL</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.notifyButton} onPress={() => setShowNotifications(true)}>
            <Text style={styles.notifyButtonText}>🔔 {notifications.length > 0 ? `(${notifications.length})` : ''}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerButton} onPress={fetchDashboard}>
            <Text style={styles.headerButtonText}>↻</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerButton} onPress={onLogout}>
            <Text style={styles.headerButtonText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Main Content */}
      <ScrollView style={styles.contentScroll} contentContainerStyle={styles.contentContainer}>
        {/* Welcome Card */}
        <View style={styles.welcomeCard}>
          <Text style={styles.welcomeTitle}>Welcome back, {user.full_name}!</Text>
          <Text style={styles.welcomeRole}>Role: {readableRole}</Text>
          <Text style={styles.welcomeMatches}>Matches / Tourneys: <Text style={{fontWeight: 'bold'}}>{getMatchesCount()}</Text></Text>
        </View>

        {/* Dynamic Dashboard Content */}
        {loading ? (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color="#000000" />
          </View>
        ) : data && !data.detail ? (
          <View style={styles.dashboardContainer}>
            {user.role === 'player' && (
              <PlayerDashboard
                data={data}
                notifications={notifications}
                tournaments={tournaments}
                coaches={coaches}
                players={players}
                apiClient={apiClient}
                onRefresh={fetchDashboard}
              />
            )}
            {user.role === 'coach' && (
              <CoachDashboard
                data={data}
                notifications={notifications}
              />
            )}
            {user.role === 'sponsor' && (
              <SponsorDashboard
                data={data}
                notifications={notifications}
                tournaments={tournaments}
                apiClient={apiClient}
                onRefresh={fetchDashboard}
              />
            )}
            {user.role === 'scorer' && (
              <ScorerDashboard
                data={data}
                notifications={notifications}
                tournaments={tournaments}
                apiClient={apiClient}
                onRefresh={fetchDashboard}
              />
            )}
          </View>
        ) : (
          <View style={styles.fallbackContainer}>
            <Text style={styles.fallbackText}>
              Admin Dashboards manage approvals via Web Portal in the POC.
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Notifications Modal Overlay */}
      <Modal
        visible={showNotifications}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowNotifications(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Simulated Mailbox 📬</Text>
              <TouchableOpacity style={styles.closeButton} onPress={() => setShowNotifications(false)}>
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalScroll}>
              {notifications.length === 0 ? (
                <Text style={styles.emptyNotifications}>No notification alerts received.</Text>
              ) : (
                notifications.map((log) => (
                  <View key={log.id} style={styles.notificationCard}>
                    <Text style={styles.noteSubject}>{log.subject}</Text>
                    <Text style={styles.noteBody}>{log.body}</Text>
                    <Text style={styles.noteTime}>{new Date(log.sent_at).toLocaleTimeString()}</Text>
                  </View>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 50,
    paddingBottom: 16,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  headerTitle: {
    color: '#000000',
    fontSize: 15,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  notifyButton: {
    paddingVertical: 6,
    paddingHorizontal: 8,
    marginRight: 8,
  },
  notifyButtonText: {
    fontSize: 16,
    color: '#000000',
    fontWeight: 'bold',
  },
  headerButton: {
    marginLeft: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#CCCCCC',
    backgroundColor: '#FFFFFF',
  },
  headerButtonText: {
    color: '#000000',
    fontWeight: '600',
    fontSize: 12,
  },
  contentScroll: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  welcomeCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#EEEEEE',
  },
  welcomeTitle: {
    fontWeight: 'black',
    fontSize: 20,
    color: '#000000',
    marginBottom: 4,
  },
  welcomeRole: {
    color: '#555555',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 2,
  },
  welcomeMatches: {
    color: '#555555',
    fontSize: 13,
  },
  loaderContainer: {
    paddingVertical: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dashboardContainer: {
    flex: 1,
  },
  fallbackContainer: {
    paddingVertical: 40,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  fallbackText: {
    color: '#666666',
    textAlign: 'center',
    fontSize: 14,
    lineHeight: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#DDDDDD',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000000',
  },
  closeButton: {
    padding: 4,
  },
  closeButtonText: {
    fontSize: 18,
    color: '#000000',
    fontWeight: 'bold',
  },
  modalScroll: {
    marginBottom: 20,
  },
  emptyNotifications: {
    color: '#888888',
    textAlign: 'center',
    fontSize: 13,
    paddingVertical: 30,
    italic: true,
  },
  notificationCard: {
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
    paddingVertical: 12,
  },
  noteSubject: {
    fontWeight: 'bold',
    fontSize: 14,
    color: '#000000',
    marginBottom: 4,
  },
  noteBody: {
    fontSize: 13,
    color: '#333333',
    lineHeight: 18,
  },
  noteTime: {
    fontSize: 10,
    color: '#999999',
    marginTop: 6,
    fontFamily: 'Courier',
  },
});

export default DashboardScreen;
