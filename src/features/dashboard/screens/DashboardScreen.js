import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Easing, Modal, ScrollView, RefreshControl } from 'react-native';
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
  const [seenNotificationIds, setSeenNotificationIds] = useState(() => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const stored = window.localStorage.getItem(`seenNotifications_${user.email}`);
        return new Set(stored ? JSON.parse(stored) : []);
      }
    } catch (e) {
      console.error(e);
    }
    return new Set();
  });

  const unreadCount = notifications.filter(n => !seenNotificationIds.has(n.id)).length;

  const [selectedTournamentIdForModal, setSelectedTournamentIdForModal] = useState(null);
  const [selectedNotificationDetail, setSelectedNotificationDetail] = useState(null);

  const handleNotificationClick = (log) => {
    // Show notification details fully
    setSelectedNotificationDetail(log);

    if (tournaments.length > 0) {
      let tourneyId = null;
      // Extract tournament ID if present
      const idMatch = (log.body + " " + log.subject).match(/(?:tournament\s*id\s*:?\s*|tournament\s*)(\d+)/i);
      if (idMatch) {
        tourneyId = parseInt(idMatch[1], 10);
      }

      let matchedTournament = null;
      if (tourneyId) {
        matchedTournament = tournaments.find(t => t.id === tourneyId);
      }

      if (!matchedTournament) {
        matchedTournament = tournaments.find(t => 
          (log.subject && log.subject.toLowerCase().includes(t.name.toLowerCase())) ||
          (log.body && log.body.toLowerCase().includes(t.name.toLowerCase()))
        );
      }

      if (matchedTournament) {
        if (user.role === 'player') {
          setActiveTab('Tournaments');
          setSelectedTournamentIdForModal(matchedTournament.id);
        } else if (user.role === 'sponsor') {
          setActiveTab('Sponsorships');
        } else if (user.role === 'coach') {
          setActiveTab('Matches');
        }
      }
    }
  };

  const [activeTab, setActiveTab] = useState('');

  useEffect(() => {
    if (user.role === 'player') {
      setActiveTab('Overview');
    } else if (user.role === 'coach') {
      setActiveTab('Trainees');
    } else if (user.role === 'sponsor') {
      setActiveTab('Sponsorships');
    }
  }, [user.role]);

  // Pulse animation for Skeleton loaders
  const pulseAnim = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    let pulse;
    if (loading) {
      pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 0.8,
            duration: 800,
            easing: Easing.ease,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 0.3,
            duration: 800,
            easing: Easing.ease,
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();
    }
    return () => {
      if (pulse) pulse.stop();
    };
  }, [loading]);

  const [refreshing, setRefreshing] = useState(false);

  const fetchDashboard = async (showSkeleton = true) => {
    if (showSkeleton) setLoading(true);
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

  // Modern Skeleton Loader components matching the layout of each specific dashboard role
  const renderSkeleton = () => {
    const role = user.role;
    if (role === 'player') {
      return (
        <View style={styles.skeletonContainer}>
          {/* Stats row: 3 columns */}
          <View style={styles.skeletonStatsRow}>
            <Animated.View style={[styles.skeletonStat, { opacity: pulseAnim }]} />
            <Animated.View style={[styles.skeletonStat, { opacity: pulseAnim }]} />
            <Animated.View style={[styles.skeletonStat, { opacity: pulseAnim }]} />
          </View>
          {/* Register Team Form skeleton */}
          <Animated.View style={[styles.skeletonTitleLine, { opacity: pulseAnim }]} />
          <Animated.View style={[styles.skeletonFormBlock, { opacity: pulseAnim }]} />
          {/* My Squads list skeleton */}
          <Animated.View style={[styles.skeletonTitleLine, { opacity: pulseAnim, marginTop: 24 }]} />
          <Animated.View style={[styles.skeletonListCard, { opacity: pulseAnim }]} />
          <Animated.View style={[styles.skeletonListCard, { opacity: pulseAnim }]} />
        </View>
      );
    } else if (role === 'coach') {
      return (
        <View style={styles.skeletonContainer}>
          {/* 1 full-width stat card */}
          <Animated.View style={[styles.skeletonStatFull, { opacity: pulseAnim }]} />
          {/* Trainee Leaderboard title */}
          <Animated.View style={[styles.skeletonTitleLine, { opacity: pulseAnim }]} />
          {/* List items */}
          <Animated.View style={[styles.skeletonLeaderboardCard, { opacity: pulseAnim }]} />
          <Animated.View style={[styles.skeletonLeaderboardCard, { opacity: pulseAnim }]} />
          <Animated.View style={[styles.skeletonLeaderboardCard, { opacity: pulseAnim }]} />
        </View>
      );
    } else if (role === 'sponsor') {
      return (
        <View style={styles.skeletonContainer}>
          {/* 1 full-width stat card */}
          <Animated.View style={[styles.skeletonStatFull, { opacity: pulseAnim }]} />
          {/* Sponsor a tournament form skeleton */}
          <Animated.View style={[styles.skeletonTitleLine, { opacity: pulseAnim }]} />
          <Animated.View style={[styles.skeletonFormBlockShort, { opacity: pulseAnim }]} />
          {/* History title and cards */}
          <Animated.View style={[styles.skeletonTitleLine, { opacity: pulseAnim, marginTop: 24 }]} />
          <Animated.View style={[styles.skeletonListCard, { opacity: pulseAnim }]} />
        </View>
      );
    } else if (role === 'scorer') {
      return (
        <View style={styles.skeletonContainer}>
          {/* 1 center-aligned stat card */}
          <Animated.View style={[styles.skeletonStatFull, { opacity: pulseAnim }]} />
          {/* Apply form */}
          <Animated.View style={[styles.skeletonTitleLine, { opacity: pulseAnim }]} />
          <Animated.View style={[styles.skeletonFormBlock, { opacity: pulseAnim }]} />
          {/* Assigned matches list */}
          <Animated.View style={[styles.skeletonTitleLine, { opacity: pulseAnim, marginTop: 24 }]} />
          <Animated.View style={[styles.skeletonListCard, { opacity: pulseAnim }]} />
        </View>
      );
    }

    // Default fallback skeleton
    return (
      <View style={styles.skeletonContainer}>
        <Animated.View style={[styles.skeletonCard, { opacity: pulseAnim }]} />
      </View>
    );
  };


  // Custom Logout Icon Component
  const LogoutIcon = ({ color }) => (
    <View style={styles.logoutIconContainer}>
      <View style={[styles.logoutDoor, { borderColor: color }]} />
      <View style={[styles.logoutArrowLine, { backgroundColor: color }]} />
      <View style={[styles.logoutArrowHead, { borderTopColor: color, borderRightColor: color }]} />
    </View>
  );

  // Custom Bell Icon Component
  const BellIcon = ({ color, count }) => (
    <View style={styles.bellIconContainer}>
      <View style={[styles.bellLoop, { borderColor: color }]} />
      <View style={[styles.bellBody, { backgroundColor: color }]} />
      <View style={[styles.bellLip, { backgroundColor: color }]} />
      <View style={[styles.bellClapper, { backgroundColor: color }]} />
      {count > 0 && (
        <View style={styles.bellBadge}>
          <Text style={styles.bellBadgeText}>{count}</Text>
        </View>
      )}
    </View>
  );

  // Custom Tab Icon Components
  const HomeIcon = ({ color }) => (
    <View style={styles.tabIconHomeContainer}>
      <View style={[styles.tabIconHomeRoof, { borderBottomColor: color }]} />
      <View style={[styles.tabIconHomeBody, { borderColor: color }]} />
    </View>
  );

  const ChartIcon = ({ color }) => (
    <View style={styles.tabIconChartContainer}>
      <View style={[styles.tabIconChartBar, { height: 8, backgroundColor: color }]} />
      <View style={[styles.tabIconChartBar, { height: 15, backgroundColor: color }]} />
      <View style={[styles.tabIconChartBar, { height: 11, backgroundColor: color }]} />
    </View>
  );

  const CalendarIcon = ({ color }) => (
    <View style={[styles.tabIconCalendarContainer, { borderColor: color }]}>
      <View style={[styles.tabIconCalendarHeader, { backgroundColor: color }]} />
      <View style={styles.tabIconCalendarGrid}>
        <View style={[styles.tabIconCalendarDot, { backgroundColor: color }]} />
        <View style={[styles.tabIconCalendarDot, { backgroundColor: color }]} />
      </View>
    </View>
  );

  const UsersIcon = ({ color }) => (
    <View style={styles.tabIconUsersContainer}>
      <View style={[styles.tabIconUsersHead, { borderColor: color }]} />
      <View style={[styles.tabIconUsersBody, { borderColor: color }]} />
    </View>
  );

  const MoneyIcon = ({ color }) => (
    <View style={[styles.tabIconMoneyContainer, { borderColor: color }]}>
      <Text style={[styles.tabIconMoneyText, { color }]}>₹</Text>
    </View>
  );

  const TrophyIcon = ({ color }) => (
    <View style={{ alignItems: 'center', justifyContent: 'center', width: 20, height: 20 }}>
      <View style={{ width: 16, height: 10, borderWidth: 1.5, borderColor: color, borderTopWidth: 0, borderBottomLeftRadius: 8, borderBottomRightRadius: 8 }} />
      <View style={{ width: 18, height: 1.5, backgroundColor: color, position: 'absolute', top: 0 }} />
      <View style={{ width: 4, height: 6, backgroundColor: color }} />
      <View style={{ width: 10, height: 2, backgroundColor: color }} />
    </View>
  );

  const renderTabIcon = (tab, isActive) => {
    const color = isActive ? '#D4AF37' : '#888888';
    switch (tab) {
      case 'Overview':
        return <HomeIcon color={color} />;
      case 'Statistics':
        return <ChartIcon color={color} />;
      case 'Matches':
        return <CalendarIcon color={color} />;
      case 'Trainees':
        return <UsersIcon color={color} />;
      case 'Sponsorships':
        return <MoneyIcon color={color} />;
      case 'Tournaments':
        return <TrophyIcon color={color} />;
      case 'Teams':
        return <UsersIcon color={color} />;
      case 'Sessions':
        return <CalendarIcon color={color} />;
      case 'Squads':
        return <UsersIcon color={color} />;
      default:
        return null;
    }
  };

  const getTabsForRole = (role) => {
    if (role === 'player') return ['Overview', 'Statistics', 'Matches', 'Tournaments', 'Teams'];
    if (role === 'coach') return ['Trainees', 'Matches', 'Sessions', 'Squads'];
    if (role === 'sponsor') return ['Sponsorships', 'Matches'];
    return [];
  };

  return (
    <View style={styles.container}>
      {/* Custom Header */}
      <View style={styles.header}>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.notifyButton}
            onPress={() => {
              setShowNotifications(true);
              const allIds = notifications.map(n => n.id);
              setSeenNotificationIds(new Set(allIds));
              try {
                if (typeof window !== 'undefined' && window.localStorage) {
                  window.localStorage.setItem(`seenNotifications_${user.email}`, JSON.stringify(allIds));
                }
              } catch (e) {
                console.error(e);
              }
            }}
          >
            <BellIcon color="#F5F5F5" count={unreadCount} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.logoutButton} onPress={onLogout} activeOpacity={0.7}>
            <LogoutIcon color="#F5F5F5" />
          </TouchableOpacity>
        </View>
      </View>


      {/* Main Content */}
      <ScrollView
        style={styles.contentScroll}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => {
              setRefreshing(true);
              await fetchDashboard(false);
              setRefreshing(false);
            }}
            tintColor="#D4AF37"
            colors={["#D4AF37"]}
          />
        }
      >
        {/* Dynamic Dashboard Content */}
        {loading ? (
          renderSkeleton()
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
                activeTab={activeTab}
                selectedTournamentIdForModal={selectedTournamentIdForModal}
                setSelectedTournamentIdForModal={setSelectedTournamentIdForModal}
              />
            )}
            {user.role === 'coach' && (
              <CoachDashboard
                data={data}
                notifications={notifications}
                tournaments={tournaments}
                apiClient={apiClient}
                activeTab={activeTab}
              />
            )}
            {user.role === 'sponsor' && (
              <SponsorDashboard
                data={data}
                user={user}
                notifications={notifications}
                tournaments={tournaments}
                apiClient={apiClient}
                onRefresh={fetchDashboard}
                activeTab={activeTab}
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
        ) : null}
      </ScrollView>

      {/* Fixed Bottom Navigation Bar */}
      {!loading && ['player', 'coach', 'sponsor'].includes(user.role) && (
        <View style={styles.bottomTabBar}>
          {getTabsForRole(user.role).map((tab) => {
            const isActive = activeTab === tab;
            return (
              <TouchableOpacity
                key={tab}
                activeOpacity={0.85}
                style={styles.bottomTabButton}
                onPress={() => setActiveTab(tab)}
              >
                {renderTabIcon(tab, isActive)}
                <Text style={[styles.bottomTabLabel, isActive && styles.bottomTabLabelActive]}>
                  {tab}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

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
              <Text style={styles.modalTitle}>Notifications 📬</Text>
              <TouchableOpacity style={styles.closeButton} onPress={() => setShowNotifications(false)}>
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalScroll}>
              {notifications.length === 0 ? (
                <Text style={styles.emptyNotifications}>No notification alerts received.</Text>
              ) : (
                notifications.map((log) => (
                  <TouchableOpacity
                    key={log.id}
                    style={styles.notificationCard}
                    activeOpacity={0.75}
                    onPress={() => handleNotificationClick(log)}
                  >
                    <Text style={styles.noteSubject}>{log.subject}</Text>
                    <Text style={styles.noteBody}>{log.body}</Text>
                    <Text style={styles.noteTime}>{new Date(log.sent_at).toLocaleTimeString()}</Text>
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Notification Details Modal */}
      <Modal
        visible={selectedNotificationDetail !== null}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setSelectedNotificationDetail(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '60%', padding: 24 }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Notification Alert</Text>
              <TouchableOpacity style={styles.closeButton} onPress={() => setSelectedNotificationDetail(null)}>
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>
            {selectedNotificationDetail && (
              <ScrollView style={{ marginVertical: 10 }}>
                <Text style={[styles.noteSubject, { fontSize: 16, marginBottom: 10, color: '#D4AF37' }]}>
                  {selectedNotificationDetail.subject}
                </Text>
                <Text style={[styles.noteBody, { fontSize: 14, lineHeight: 20, color: '#F5F5F5' }]}>
                  {selectedNotificationDetail.body}
                </Text>
                <Text style={[styles.noteTime, { marginTop: 14, fontSize: 11, color: '#888' }]}>
                  Received: {new Date(selectedNotificationDetail.sent_at).toLocaleString()}
                </Text>
                
                <TouchableOpacity
                  style={{
                    marginTop: 24,
                    paddingVertical: 12,
                    backgroundColor: '#D4AF37',
                    borderRadius: 8,
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                  onPress={() => {
                    setSelectedNotificationDetail(null);
                    setShowNotifications(false);
                  }}
                >
                  <Text style={{ color: '#141414', fontFamily: 'Poppins-Bold', fontWeight: 'bold', fontSize: 12 }}>
                    OK, GO TO DASHBOARD
                  </Text>
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#141414',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingTop: 42,
    paddingBottom: 10,
    paddingHorizontal: 16,
    backgroundColor: '#1F1F1F',
    borderBottomWidth: 1,
    borderBottomColor: '#2D2D2D',
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoText: {
    fontFamily: 'Poppins-Black',
    color: '#D4AF37',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 2,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  notifyButton: {
    paddingVertical: 6,
    paddingHorizontal: 8,
    marginRight: 16,
  },
  logoutButton: {
    padding: 6,
    borderRadius: 20,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutIconContainer: {
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  logoutDoor: {
    width: 12,
    height: 16,
    borderWidth: 1.5,
    borderRightWidth: 0,
    borderTopLeftRadius: 2,
    borderBottomLeftRadius: 2,
    position: 'absolute',
    left: 2,
  },
  logoutArrowLine: {
    width: 10,
    height: 1.5,
    position: 'absolute',
    right: 3,
  },
  logoutArrowHead: {
    width: 5,
    height: 5,
    borderTopWidth: 1.5,
    borderRightWidth: 1.5,
    transform: [{ rotate: '45deg' }],
    position: 'absolute',
    right: 3,
  },
  contentScroll: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 80, // Add bottom padding to prevent bottom tab overlap
  },
  welcomeCard: {
    backgroundColor: '#1F1F1F',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#2D2D2D',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  welcomeMain: {
    flex: 1,
    marginRight: 12,
  },
  welcomeTitle: {
    fontFamily: 'Poppins-Bold',
    fontWeight: '900',
    fontSize: 20,
    color: '#F5F5F5',
    marginBottom: 4,
  },
  welcomeRole: {
    fontFamily: 'Poppins-Medium',
    color: '#888888',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
  },
  welcomeBadge: {
    backgroundColor: '#D4AF37',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  welcomeBadgeText: {
    fontFamily: 'Poppins-Bold',
    color: '#141414',
    fontSize: 11,
    fontWeight: '900',
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
    fontFamily: 'Poppins-Regular',
    color: '#888888',
    textAlign: 'center',
    fontSize: 14,
    lineHeight: 22,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1F1F1F',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
    padding: 24,
    borderTopWidth: 1,
    borderTopColor: '#2D2D2D',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2D2D2D',
    marginBottom: 20,
  },
  modalTitle: {
    fontFamily: 'Poppins-Bold',
    fontSize: 20,
    fontWeight: '900',
    color: '#F5F5F5',
    letterSpacing: 1,
  },
  closeButton: {
    padding: 4,
  },
  closeButtonText: {
    fontFamily: 'Poppins-Bold',
    fontSize: 18,
    color: '#F5F5F5',
    fontWeight: 'bold',
  },
  modalScroll: {
    marginBottom: 20,
  },
  emptyNotifications: {
    fontFamily: 'Poppins-Regular',
    color: '#888888',
    textAlign: 'center',
    fontSize: 14,
    paddingVertical: 40,
  },
  notificationCard: {
    borderBottomWidth: 1,
    borderBottomColor: '#2D2D2D',
    paddingVertical: 16,
  },
  noteSubject: {
    fontFamily: 'Poppins-Bold',
    fontWeight: 'bold',
    fontSize: 15,
    color: '#D4AF37',
    marginBottom: 6,
  },
  noteBody: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    color: '#F5F5F5',
    lineHeight: 20,
  },
  noteTime: {
    fontFamily: 'Poppins-Regular',
    fontSize: 11,
    color: '#888888',
    marginTop: 8,
  },
  // Skeleton Loading styles
  skeletonContainer: {
    flex: 1,
  },
  skeletonCard: {
    height: 100,
    backgroundColor: '#2A2A2A',
    borderRadius: 16,
    marginBottom: 24,
  },
  skeletonStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 24,
  },
  skeletonStat: {
    flex: 1,
    height: 80,
    backgroundColor: '#2A2A2A',
    borderRadius: 12,
  },
  skeletonStatFull: {
    height: 90,
    backgroundColor: '#2A2A2A',
    borderRadius: 16,
    marginBottom: 24,
  },
  skeletonTitleLine: {
    height: 18,
    width: '45%',
    backgroundColor: '#2A2A2A',
    borderRadius: 4,
    marginBottom: 16,
  },
  skeletonFormBlock: {
    height: 340,
    backgroundColor: '#1F1F1F',
    borderWidth: 1,
    borderColor: '#2D2D2D',
    borderRadius: 16,
    marginBottom: 24,
  },
  skeletonFormBlockShort: {
    height: 220,
    backgroundColor: '#1F1F1F',
    borderWidth: 1,
    borderColor: '#2D2D2D',
    borderRadius: 16,
    marginBottom: 24,
  },
  skeletonListCard: {
    height: 56,
    backgroundColor: '#1F1F1F',
    borderWidth: 1,
    borderColor: '#2D2D2D',
    borderRadius: 16,
    marginBottom: 12,
  },
  skeletonLeaderboardCard: {
    height: 72,
    backgroundColor: '#1F1F1F',
    borderWidth: 1,
    borderColor: '#2D2D2D',
    borderRadius: 16,
    marginBottom: 12,
  },
  // Custom Bell Icon Styles
  bellIconContainer: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  bellLoop: {
    width: 6,
    height: 4,
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
    borderWidth: 1.5,
    marginBottom: -1,
  },
  bellBody: {
    width: 14,
    height: 10,
    borderTopLeftRadius: 5,
    borderTopRightRadius: 5,
  },
  bellLip: {
    width: 18,
    height: 2,
    borderRadius: 1,
    marginVertical: 0.5,
  },
  bellClapper: {
    width: 4,
    height: 3,
    borderBottomLeftRadius: 2,
    borderBottomRightRadius: 2,
  },
  bellBadge: {
    position: 'absolute',
    top: -4,
    right: -6,
    backgroundColor: '#FF3B30',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: '#1F1F1F',
  },
  bellBadgeText: {
    fontFamily: 'Poppins-Black',
    color: '#F5F5F5',
    fontSize: 9,
    fontWeight: '900',
  },
  // Fixed Bottom Navigation Bar Styles
  bottomTabBar: {
    flexDirection: 'row',
    backgroundColor: '#1F1F1F',
    borderTopWidth: 1,
    borderTopColor: '#2D2D2D',
    paddingBottom: 25, // For safe area on iOS
    paddingTop: 10,
    justifyContent: 'space-around',
    alignItems: 'center',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  bottomTabButton: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  bottomTabLabel: {
    fontFamily: 'Poppins-Medium',
    fontSize: 10,
    color: '#888888',
    marginTop: 4,
    fontWeight: '600',
  },
  bottomTabLabelActive: {
    fontFamily: 'Poppins-Bold',
    color: '#D4AF37',
    fontWeight: '800',
  },
  // Custom Tab Icon Styles
  tabIconHomeContainer: {
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  tabIconHomeRoof: {
    width: 0,
    height: 0,
    borderLeftWidth: 10,
    borderRightWidth: 10,
    borderBottomWidth: 8,
    borderStyle: 'solid',
    backgroundColor: 'transparent',
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
  tabIconHomeBody: {
    width: 16,
    height: 10,
    borderWidth: 1.5,
    borderTopWidth: 0,
    borderBottomLeftRadius: 2,
    borderBottomRightRadius: 2,
  },
  tabIconChartContainer: {
    width: 20,
    height: 20,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 3,
  },
  tabIconChartBar: {
    width: 4,
    borderRadius: 1,
  },
  tabIconCalendarContainer: {
    width: 20,
    height: 20,
    borderWidth: 1.5,
    borderRadius: 3,
    padding: 2,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  tabIconCalendarHeader: {
    width: '100%',
    height: 2,
    position: 'absolute',
    top: 2,
  },
  tabIconCalendarGrid: {
    flexDirection: 'row',
    gap: 2,
    marginBottom: 1,
  },
  tabIconCalendarDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
  },
  tabIconUsersContainer: {
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabIconUsersHead: {
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1.5,
    marginBottom: 1,
  },
  tabIconUsersBody: {
    width: 16,
    height: 6,
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
    borderWidth: 1.5,
    borderBottomWidth: 0,
  },
  tabIconMoneyContainer: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabIconMoneyText: {
    fontFamily: 'Poppins-Black',
    fontSize: 12,
    fontWeight: '900',
    marginTop: -1,
  },
});

export default DashboardScreen;
