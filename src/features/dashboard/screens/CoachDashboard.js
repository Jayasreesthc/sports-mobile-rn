import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  ScrollView,
  Animated,
  Easing,
  TextInput,
} from 'react-native';
import StatCard from '../widgets/StatCard';

const CoachDashboard = ({
  data,
  notifications = [],
  tournaments = [],
  apiClient,
  activeTab: parentActiveTab,
}) => {
  const teamsCount = data.teams_trained_count ?? 0;
  const initialPlayers = data.players ?? [];

  // Local state for trainees to support ratings/comments dynamically
  const [traineesList, setTraineesList] = useState([]);

  useEffect(() => {
    if (initialPlayers.length > 0) {
      const enhanced = initialPlayers.map((p, idx) => {
        const battingStyles = ['Right-hand bat', 'Left-hand bat', 'Right-hand bat'];
        const bowlingStyles = ['Right-arm offbreak', 'Left-arm medium', 'Right-arm fast', 'Legbreak'];
        const availabilities = ['Available', 'Available', 'Away', 'Injured'];
        return {
          ...p,
          id: p.id || `p-${idx}`,
          batting_style: p.batting_style || battingStyles[idx % battingStyles.length],
          bowling_style: p.bowling_style || bowlingStyles[idx % bowlingStyles.length],
          availability: p.availability || availabilities[idx % availabilities.length],
          reviews: p.reviews || [
            { rating: 4, comment: 'Shows good consistency in net sessions.', date: '2026-06-02' }
          ],
        };
      });
      setTraineesList(enhanced);
    }
  }, [data]);

  // Active Tab
  const [localTab, setLocalTab] = useState('Trainees'); // 'Trainees', 'Matches', 'Sessions', 'Squads'
  const activeTab = parentActiveTab || localTab;
  const setActiveTab = setLocalTab;

  const slideAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const prevTabRef = useRef(activeTab);

  useEffect(() => {
    const tabs = ['Trainees', 'Matches', 'Sessions', 'Squads'];
    const prevIndex = tabs.indexOf(prevTabRef.current);
    const currIndex = tabs.indexOf(activeTab);
    prevTabRef.current = activeTab;

    if (prevIndex !== -1 && currIndex !== -1 && prevIndex !== currIndex) {
      const slideStart = currIndex > prevIndex ? 100 : -100;
      slideAnim.setValue(slideStart);
      fadeAnim.setValue(0.3);

      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 250,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 250,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      slideAnim.setValue(0);
      fadeAnim.setValue(1);
    }
  }, [activeTab]);

  // Tournament Matches List States
  const [matchesList, setMatchesList] = useState([]);
  const [loadingMatches, setLoadingMatches] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [matchDetailsTab, setMatchDetailsTab] = useState('Summary'); // 'Summary', 'Scorecard', 'Feedback'
  const [matchFeedbackText, setMatchFeedbackText] = useState('');
  const [feedbackPlayerId, setFeedbackPlayerId] = useState('');
  const [matchFeedbackList, setMatchFeedbackList] = useState({}); // keyed by matchId

  // Trainee Profile bottom sheet
  const [selectedTrainee, setSelectedTrainee] = useState(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');

  // Practice Sessions scheduler
  const [sessionsList, setSessionsList] = useState([
    { id: 1, date: '2026-06-10', time: '08:00 AM', ground: 'Central Ground', focus: 'Nets Practice - Batting against spin' },
    { id: 2, date: '2026-06-13', time: '04:30 PM', ground: 'St. Marys Oval', focus: 'Bowling target practice & fielding drills' },
  ]);
  const [showSessionModal, setShowSessionModal] = useState(false);
  const [sessionDate, setSessionDate] = useState('');
  const [sessionTime, setSessionTime] = useState('');
  const [sessionGround, setSessionGround] = useState('');
  const [sessionFocus, setSessionFocus] = useState('');

  // Squad Builder state
  const [squadsList, setSquadsList] = useState([
    { id: 1, teamName: 'Under-19 Stars', tournamentName: 'State Championship', playersCount: 4, players: ['Asha', 'Ashwin', 'Sanjay', 'Rahul'] }
  ]);
  const [showSquadModal, setShowSquadModal] = useState(false);
  const [squadTeamName, setSquadTeamName] = useState('');
  const [squadTourneyId, setSquadTourneyId] = useState('');
  const [showSquadTourneyDropdown, setShowSquadTourneyDropdown] = useState(false);
  const [selectedSquadPlayers, setSelectedSquadPlayers] = useState([]);

  // Pulse animation for active matches
  const badgePulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(badgePulse, {
          toValue: 1.12,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(badgePulse, {
          toValue: 1,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    pulseLoop.start();
    return () => pulseLoop.stop();
  }, []);

  const fetchMatches = async () => {
    setLoadingMatches(true);
    try {
      const allMatches = [];
      for (const t of tournaments) {
        const url = `${apiClient.constructor.baseUrl}/tournaments/${t.id}/matches`;
        const res = await apiClient.request(url);
        if (Array.isArray(res)) {
          allMatches.push(...res.map(m => ({ ...m, tournamentName: t.name })));
        }
      }
      setMatchesList(allMatches);
    } catch (e) {
      console.log('Error fetching tournament matches:', e);
    } finally {
      setLoadingMatches(false);
    }
  };

  const handleSelectMatch = async (matchItem) => {
    setSelectedMatch(matchItem);
    setMatchDetailsTab('Summary');
    try {
      const fullMatch = await apiClient.request(`${apiClient.constructor.baseUrl}/matches/${matchItem.id}`);
      if (fullMatch && !fullMatch.detail) {
        setSelectedMatch(fullMatch);
      }
    } catch (e) {
      console.log('Error fetching match details:', e);
    }
  };

  useEffect(() => {
    if (activeTab === 'Matches') {
      fetchMatches();
    }
  }, [activeTab, tournaments]);

  const handleAddReview = () => {
    if (!selectedTrainee) return;
    if (!reviewComment.trim()) {
      alert('Please enter a feedback comment.');
      return;
    }
    const newReview = {
      rating: reviewRating,
      comment: reviewComment.trim(),
      date: new Date().toISOString().split('T')[0]
    };

    setTraineesList(prev => prev.map(p => {
      if (p.id === selectedTrainee.id || p.full_name === selectedTrainee.full_name) {
        const updatedReviews = [newReview, ...p.reviews];
        const updated = {
          ...p,
          reviews: updatedReviews
        };
        setSelectedTrainee(updated); // update active modal state
        return updated;
      }
      return p;
    }));
    setReviewComment('');
    alert('Performance feedback submitted!');
  };

  const handleScheduleSession = () => {
    if (!sessionDate || !sessionTime || !sessionGround || !sessionFocus) {
      alert('Please fill all fields to schedule a session.');
      return;
    }
    const newSession = {
      id: Date.now(),
      date: sessionDate,
      time: sessionTime,
      ground: sessionGround,
      focus: sessionFocus,
    };
    setSessionsList([newSession, ...sessionsList]);
    setSessionDate('');
    setSessionTime('');
    setSessionGround('');
    setSessionFocus('');
    setShowSessionModal(false);
    alert('Practice session scheduled successfully!');
  };

  const handleToggleSquadPlayer = (name) => {
    setSelectedSquadPlayers(prev => {
      if (prev.includes(name)) {
        return prev.filter(p => p !== name);
      } else {
        return [...prev, name];
      }
    });
  };

  const handleSaveSquad = () => {
    if (!squadTeamName || !squadTourneyId) {
      alert('Please provide a team name and select a tournament.');
      return;
    }
    if (selectedSquadPlayers.length === 0) {
      alert('Please select at least 1 player for the squad.');
      return;
    }
    const tourney = tournaments.find(t => t.id.toString() === squadTourneyId);
    const newSquad = {
      id: Date.now(),
      teamName: squadTeamName,
      tournamentName: tourney ? tourney.name : 'Unknown Tournament',
      playersCount: selectedSquadPlayers.length,
      players: selectedSquadPlayers,
    };
    setSquadsList([newSquad, ...squadsList]);
    setSquadTeamName('');
    setSquadTourneyId('');
    setSelectedSquadPlayers([]);
    setShowSquadModal(false);
    alert('Squad compiled successfully!');
  };

  const handleAddMatchFeedback = () => {
    if (!selectedMatch) return;
    if (!feedbackPlayerId || !matchFeedbackText.trim()) {
      alert('Please select a player and enter your feedback comment.');
      return;
    }
    const player = traineesList.find(p => p.id === feedbackPlayerId || p.full_name === feedbackPlayerId);
    const newFeedback = {
      id: Date.now(),
      playerName: player ? player.full_name : 'Trainee',
      comment: matchFeedbackText.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    const key = selectedMatch.id;
    const currentFeedback = matchFeedbackList[key] || [];
    setMatchFeedbackList({
      ...matchFeedbackList,
      [key]: [newFeedback, ...currentFeedback]
    });
    setMatchFeedbackText('');
    setFeedbackPlayerId('');
    alert('Match feedback saved!');
  };

  const getAvailabilityColor = (status) => {
    switch (status) {
      case 'Available': return '#4CD964';
      case 'Away': return '#FFCC00';
      case 'Injured': return '#FF3B30';
      default: return '#888';
    }
  };

  const renderPlayerItem = ({ item }) => (
    <TouchableOpacity
      activeOpacity={0.9}
      style={styles.playerCard}
      onPress={() => setSelectedTrainee(item)}
    >
      <View style={styles.playerInfo}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={[styles.statusDot, { backgroundColor: getAvailabilityColor(item.availability) }]} />
          <Text style={styles.playerName}>{item.full_name}</Text>
        </View>
        <Text style={styles.playerSubText}>
          {item.batting_style} | {item.bowling_style}
        </Text>
        <Text style={styles.playerStats}>
          Runs: {item.runs_scored}  |  Wickets: {item.wickets_taken}  |  Balls: {item.balls_faced}
        </Text>
      </View>
      <View style={styles.indexBox}>
        <Text style={styles.indexLabel}>INDEX RATING</Text>
        <Text style={styles.indexValue}>{(item.performance_score ?? 0.0).toFixed(2)}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={{ flex: 1, backgroundColor: '#141414' }}>
      {/* Dashboard Sub-Tabs */}
      {!parentActiveTab && (
        <View style={styles.tabBar}>
          {['Trainees', 'Matches', 'Sessions', 'Squads'].map((tab) => (
            <TouchableOpacity
              key={tab}
              activeOpacity={0.8}
              style={[styles.tabButton, activeTab === tab && styles.tabButtonActive]}
              onPress={() => setActiveTab(tab)}
            >
              <Text style={[styles.tabButtonText, activeTab === tab && styles.tabButtonTextActive]}>
                {tab.toUpperCase()}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <Animated.View style={{ flex: 1, opacity: fadeAnim, transform: [{ translateX: slideAnim }] }}>

      {activeTab === 'Trainees' && (
        <FlatList
          data={traineesList}
          keyExtractor={(item, index) => index.toString()}
          ListHeaderComponent={
            <View style={{ paddingHorizontal: 16, paddingTop: 16 }}>
              <View style={styles.statContainer}>
                <StatCard label="Teams Trained / Coached" value={teamsCount.toString()} />
              </View>
              <Text style={styles.sectionTitle}>TRAINEE LEADERBOARD</Text>
            </View>
          }
          renderItem={renderPlayerItem}
          ListEmptyComponent={
            <View style={styles.emptyStateContainer}>
              <Text style={styles.emptyStateEmoji}>🏆</Text>
              <Text style={styles.emptyText}>No trainee player statistics available yet.</Text>
            </View>
          }
          contentContainerStyle={styles.listContainer}
        />
      )}

      {activeTab === 'Matches' && (
        <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
          <Text style={[styles.sectionTitle, { marginTop: 16 }]}>TOURNAMENT MATCHES</Text>
          {loadingMatches ? (
            <ActivityIndicator color="#D4AF37" style={{ marginVertical: 30 }} />
          ) : matchesList.length === 0 ? (
            <View style={styles.emptyStateContainer}>
              <Text style={styles.emptyStateEmoji}>📅</Text>
              <Text style={styles.emptyText}>No tournament matches scheduled yet.</Text>
            </View>
          ) : (
            matchesList.map((match) => (
              <TouchableOpacity
                key={match.id}
                style={styles.matchCard}
                activeOpacity={0.9}
                onPress={() => handleSelectMatch(match)}
              >
                <View style={styles.matchMain}>
                  <Text style={styles.matchTeams}>
                    {match.team_a_name} vs {match.team_b_name}
                  </Text>
                  <Text style={styles.matchTourneyName}>{match.tournamentName}</Text>
                  <Text style={styles.matchSummaryText}>
                    {match.score_summary || 'Live Scoreboard Pending'}
                  </Text>
                </View>
                
                <Animated.View
                  style={[
                    styles.matchStatusBadge,
                    match.status === 'live' && {
                      borderColor: '#FF3B30',
                      transform: [{ scale: badgePulse }]
                    }
                  ]}
                >
                  <Text
                    style={[
                      styles.matchStatusText,
                      match.status === 'live' && { color: '#FF3B30', fontWeight: '900' }
                    ]}
                  >
                    {match.status?.toUpperCase()}
                  </Text>
                </Animated.View>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      )}

      {activeTab === 'Sessions' && (
        <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
          <View style={styles.headerButtonRow}>
            <Text style={[styles.sectionTitle, { marginTop: 16, marginBottom: 0 }]}>PRACTICE DRILLS & SESSIONS</Text>
            <TouchableOpacity
              style={styles.addDrillButton}
              activeOpacity={0.8}
              onPress={() => setShowSessionModal(true)}
            >
              <Text style={styles.addDrillButtonText}>+ SCHEDULE</Text>
            </TouchableOpacity>
          </View>

          {sessionsList.map((session) => (
            <View key={session.id} style={styles.sessionCard}>
              <View style={styles.sessionHeader}>
                <Text style={styles.sessionDate}>{session.date} | {session.time}</Text>
                <View style={styles.sessionBadge}>
                  <Text style={styles.sessionBadgeText}>PRACTICE</Text>
                </View>
              </View>
              <Text style={styles.sessionGround}>📍 {session.ground}</Text>
              <Text style={styles.sessionFocus}>🎯 Focus: {session.focus}</Text>
            </View>
          ))}
        </ScrollView>
      )}

      {activeTab === 'Squads' && (
        <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
          <View style={styles.headerButtonRow}>
            <Text style={[styles.sectionTitle, { marginTop: 16, marginBottom: 0 }]}>ACTIVE SQUADS</Text>
            <TouchableOpacity
              style={styles.addDrillButton}
              activeOpacity={0.8}
              onPress={() => setShowSquadModal(true)}
            >
              <Text style={styles.addDrillButtonText}>+ BUILD SQUAD</Text>
            </TouchableOpacity>
          </View>

          {squadsList.map((squad) => (
            <View key={squad.id} style={styles.squadCard}>
              <View style={styles.squadHeader}>
                <Text style={styles.squadTeamName}>{squad.teamName}</Text>
                <Text style={styles.squadTourney}>{squad.tournamentName}</Text>
              </View>
              <Text style={styles.squadSubText}>Compiled Roster ({squad.playersCount} players):</Text>
              <Text style={styles.squadPlayersList}>{squad.players.join(', ')}</Text>
            </View>
          ))}
        </ScrollView>
      )}

      {/* Trainee Profile Bottom Sheet Modal */}
      <Modal
        visible={selectedTrainee !== null}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setSelectedTrainee(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selectedTrainee && (
              <View style={{ flex: 1 }}>
                <View style={styles.modalHeader}>
                  <View>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <View style={[styles.statusDot, { backgroundColor: getAvailabilityColor(selectedTrainee.availability), width: 10, height: 10 }]} />
                      <Text style={styles.modalTitle}>{selectedTrainee.full_name}</Text>
                    </View>
                    <Text style={styles.modalSub}>{selectedTrainee.availability}</Text>
                  </View>
                  <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setSelectedTrainee(null)}>
                    <Text style={styles.modalCloseBtnText}>✕</Text>
                  </TouchableOpacity>
                </View>

                <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 20 }}>
                  {/* Style Specs */}
                  <View style={styles.specsRow}>
                    <View style={styles.specBox}>
                      <Text style={styles.specLabel}>BATTING STYLE</Text>
                      <Text style={styles.specValue}>{selectedTrainee.batting_style}</Text>
                    </View>
                    <View style={styles.specBox}>
                      <Text style={styles.specLabel}>BOWLING STYLE</Text>
                      <Text style={styles.specValue}>{selectedTrainee.bowling_style}</Text>
                    </View>
                  </View>

                  {/* Career Stats Grid */}
                  <Text style={styles.innerSectionTitle}>CAREER STATISTICS</Text>
                  <View style={styles.statsGrid}>
                    <View style={styles.statsGridCol}>
                      <Text style={styles.gridStatVal}>{selectedTrainee.runs_scored ?? 0}</Text>
                      <Text style={styles.gridStatLabel}>Runs</Text>
                    </View>
                    <View style={styles.statsGridCol}>
                      <Text style={styles.gridStatVal}>{selectedTrainee.wickets_taken ?? 0}</Text>
                      <Text style={styles.gridStatLabel}>Wickets</Text>
                    </View>
                    <View style={styles.statsGridCol}>
                      <Text style={styles.gridStatVal}>{selectedTrainee.balls_faced ?? 0}</Text>
                      <Text style={styles.gridStatLabel}>Balls Faced</Text>
                    </View>
                    <View style={styles.statsGridCol}>
                      <Text style={styles.gridStatVal}>{(selectedTrainee.performance_score ?? 0.0).toFixed(2)}</Text>
                      <Text style={styles.gridStatLabel}>Performance</Text>
                    </View>
                  </View>

                  {/* Rating / Review Entry */}
                  <Text style={styles.innerSectionTitle}>ADD PERFORMANCE REVIEW</Text>
                  <View style={styles.reviewForm}>
                    <Text style={styles.inputLabel}>Rating</Text>
                    <View style={styles.starRow}>
                      {[1, 2, 3, 4, 5].map((star) => (
                        <TouchableOpacity key={star} onPress={() => setReviewRating(star)}>
                          <Text style={{ fontSize: 24, color: star <= reviewRating ? '#D4AF37' : '#444', marginRight: 8 }}>
                            ★
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                    <Text style={styles.inputLabel}>Review Notes</Text>
                    <TextInput
                      style={styles.textInput}
                      placeholder="Enter focus points or feedback notes..."
                      placeholderTextColor="#555"
                      value={reviewComment}
                      onChangeText={setReviewComment}
                      multiline
                    />
                    <TouchableOpacity style={styles.submitReviewBtn} onPress={handleAddReview}>
                      <Text style={styles.submitReviewBtnText}>SAVE REVIEW</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Feedback History logs */}
                  <Text style={styles.innerSectionTitle}>FEEDBACK HISTORY</Text>
                  {selectedTrainee.reviews && selectedTrainee.reviews.map((r, i) => (
                    <View key={i} style={styles.reviewLogCard}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                        <Text style={styles.reviewLogRating}>{'★'.repeat(r.rating)}</Text>
                        <Text style={styles.reviewLogDate}>{r.date}</Text>
                      </View>
                      <Text style={styles.reviewLogComment}>{r.comment}</Text>
                    </View>
                  ))}
                </ScrollView>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* Practice Session Scheduler Modal */}
      <Modal
        visible={showSessionModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowSessionModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Schedule Practice Drill</Text>
              <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setShowSessionModal(false)}>
                <Text style={styles.modalCloseBtnText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={{ flex: 1, marginTop: 12 }}>
              <Text style={styles.inputLabel}>Date</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. 2026-06-15"
                placeholderTextColor="#555"
                value={sessionDate}
                onChangeText={setSessionDate}
              />
              <Text style={styles.inputLabel}>Time</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. 09:00 AM"
                placeholderTextColor="#555"
                value={sessionTime}
                onChangeText={setSessionTime}
              />
              <Text style={styles.inputLabel}>Ground / Venue</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. St. Marys Ground"
                placeholderTextColor="#555"
                value={sessionGround}
                onChangeText={setSessionGround}
              />
              <Text style={styles.inputLabel}>Focus / Remarks</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. Bowling speed variations and pitch accuracy"
                placeholderTextColor="#555"
                value={sessionFocus}
                onChangeText={setSessionFocus}
                multiline
              />
              <TouchableOpacity style={styles.submitReviewBtn} onPress={handleScheduleSession}>
                <Text style={styles.submitReviewBtnText}>CONFIRM PRACTICE SESSION</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Squad Builder Modal */}
      <Modal
        visible={showSquadModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowSquadModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Build Matches Squad</Text>
              <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setShowSquadModal(false)}>
                <Text style={styles.modalCloseBtnText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={{ flex: 1, marginTop: 12 }}>
              <Text style={styles.inputLabel}>Team Name</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. Warriors XI"
                placeholderTextColor="#555"
                value={squadTeamName}
                onChangeText={setSquadTeamName}
              />

              <Text style={styles.inputLabel}>Select Tournament</Text>
              <TouchableOpacity
                style={styles.dropdown}
                activeOpacity={0.8}
                onPress={() => setShowSquadTourneyDropdown(!showSquadTourneyDropdown)}
              >
                <Text style={{ color: '#FFF' }}>
                  {squadTourneyId ? tournaments.find(t => t.id.toString() === squadTourneyId)?.name : 'Choose Tournament'}
                </Text>
                <Text style={{ color: '#D4AF37' }}>▼</Text>
              </TouchableOpacity>

              {showSquadTourneyDropdown && (
                <View style={styles.dropdownMenu}>
                  {tournaments.map((t) => (
                    <TouchableOpacity
                      key={t.id}
                      style={styles.dropdownItem}
                      onPress={() => {
                        setSquadTourneyId(t.id.toString());
                        setShowSquadTourneyDropdown(false);
                      }}
                    >
                      <Text style={{ color: '#FFF' }}>{t.name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              <Text style={[styles.inputLabel, { marginTop: 16 }]}>
                Pick Players (Selected: {selectedSquadPlayers.length})
              </Text>
              {traineesList.map((player) => {
                const isSelected = selectedSquadPlayers.includes(player.full_name);
                return (
                  <TouchableOpacity
                    key={player.id}
                    style={[styles.playerSelectCheckRow, isSelected && styles.playerSelectCheckRowActive]}
                    onPress={() => handleToggleSquadPlayer(player.full_name)}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <View style={[styles.statusDot, { backgroundColor: getAvailabilityColor(player.availability) }]} />
                      <Text style={{ color: '#FFF', fontWeight: 'bold' }}>{player.full_name}</Text>
                    </View>
                    <View style={[styles.checkbox, isSelected && styles.checkboxActive]}>
                      {isSelected && <Text style={{ color: '#141414', fontSize: 10, fontWeight: 'bold' }}>✓</Text>}
                    </View>
                  </TouchableOpacity>
                );
              })}

              <TouchableOpacity style={[styles.submitReviewBtn, { marginTop: 20 }]} onPress={handleSaveSquad}>
                <Text style={styles.submitReviewBtnText}>SAVE COMPILED SQUAD</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Match Details Modal (Summary, Scorecard, Feedback) */}
      <Modal
        visible={selectedMatch !== null}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setSelectedMatch(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Match Analytics</Text>
              <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setSelectedMatch(null)}>
                <Text style={styles.modalCloseBtnText}>✕</Text>
              </TouchableOpacity>
            </View>

            {selectedMatch && (
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTeamsSubTitle}>
                  {selectedMatch.team_a_name} vs {selectedMatch.team_b_name}
                </Text>

                {/* Modal Sub-Tabs */}
                <View style={styles.modalTabBar}>
                  {['Summary', 'Scorecard', 'Feedback'].map((tab) => (
                    <TouchableOpacity
                      key={tab}
                      style={[
                        styles.modalTabButton,
                        matchDetailsTab === tab && styles.modalTabButtonActive,
                      ]}
                      onPress={() => setMatchDetailsTab(tab)}
                    >
                      <Text
                        style={[
                          styles.modalTabButtonText,
                          matchDetailsTab === tab && styles.modalTabButtonTextActive,
                        ]}
                      >
                        {tab}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <ScrollView style={{ flex: 1, marginTop: 12 }} nestedScrollEnabled={true}>
                  {matchDetailsTab === 'Summary' && (
                    <View style={styles.summaryContainer}>
                      <View style={styles.summaryStatusBox}>
                        <Text style={styles.summaryStatusTitle}>Match Status</Text>
                        <Text style={styles.summaryStatusVal}>
                          {selectedMatch.status?.toUpperCase() || 'UPCOMING'}
                        </Text>
                      </View>
                      
                      <View style={styles.summaryStatItem}>
                        <Text style={styles.summaryLabel}>Score Board</Text>
                        <View style={{ marginTop: 8 }}>
                          <Text style={styles.summaryVal}>
                            🏏 {selectedMatch.team_a_name || selectedMatch.team_a?.name || 'Team A'}: {selectedMatch.team_a_runs ?? 0} / {selectedMatch.team_a_wickets ?? 0} ({selectedMatch.team_a_overs ?? 0.0} ov)
                          </Text>
                          <Text style={styles.summaryVal}>
                            🏏 {selectedMatch.team_b_name || selectedMatch.team_b?.name || 'Team B'}: {selectedMatch.team_b_runs ?? 0} / {selectedMatch.team_b_wickets ?? 0} ({selectedMatch.team_b_overs ?? 0.0} ov)
                          </Text>
                        </View>
                      </View>

                      {selectedMatch.winner && (
                        <View style={styles.summaryStatItem}>
                          <Text style={styles.summaryLabel}>Winner</Text>
                          <Text style={[styles.summaryVal, { fontWeight: 'bold', color: '#D4AF37' }]}>
                            🏆 {selectedMatch.winner.name || selectedMatch.winner_name || 'Won'}
                          </Text>
                        </View>
                      )}

                      <View style={styles.summaryStatItem}>
                        <Text style={styles.summaryLabel}>Tournament</Text>
                        <Text style={styles.summaryVal}>{selectedMatch.tournamentName || selectedMatch.tournament?.name}</Text>
                      </View>
                    </View>
                  )}

                  {matchDetailsTab === 'Scorecard' && (
                    <View style={styles.scorecardContainer}>
                      <Text style={styles.scorecardTeamTitle}>{selectedMatch.team_a?.name || selectedMatch.team_a_name || 'Team A'} Roster</Text>
                      <View style={{ marginBottom: 16, paddingLeft: 4 }}>
                        {(selectedMatch.team_a?.players || []).map((p, idx) => {
                          const pId = p.player_id || p.player?.id;
                          const perf = (selectedMatch.performances || []).find(pf => String(pf.player_id) === String(pId));
                          
                          const hasStats = true;
                          const runs = perf?.runs_scored ?? p.runs_scored ?? p.performance?.runs_scored ?? 0;
                          const balls = perf?.balls_faced ?? p.balls_faced ?? p.performance?.balls_faced ?? 0;
                          const wickets = perf?.wickets_taken ?? p.wickets_taken ?? p.performance?.wickets_taken ?? 0;
                          const conceded = perf?.runs_conceded ?? p.runs_conceded ?? p.performance?.runs_conceded ?? 0;
                          return (
                            <View key={idx} style={{ marginVertical: 6 }}>
                              <Text style={{ fontSize: 14, color: '#F5F5F5' }}>
                                👤 {p.player?.full_name || p.player?.email || 'Unknown Player'}
                              </Text>
                              {hasStats && (
                                <Text style={{ fontSize: 11, color: '#D4AF37', marginLeft: 20, marginTop: 2 }}>
                                  Batting: {runs} runs ({balls}b) • Bowling: {wickets} wkt ({conceded}r)
                                </Text>
                              )}
                            </View>
                          );
                        })}
                        {(!selectedMatch.team_a?.players || selectedMatch.team_a.players.length === 0) && (
                          <Text style={{ fontSize: 13, color: '#888', fontStyle: 'italic' }}>No registered players.</Text>
                        )}
                      </View>

                      <Text style={styles.scorecardTeamTitle}>{selectedMatch.team_b?.name || selectedMatch.team_b_name || 'Team B'} Roster</Text>
                      <View style={{ paddingLeft: 4 }}>
                        {(selectedMatch.team_b?.players || []).map((p, idx) => {
                          const pId = p.player_id || p.player?.id;
                          const perf = (selectedMatch.performances || []).find(pf => String(pf.player_id) === String(pId));
                          
                          const hasStats = true;
                          const runs = perf?.runs_scored ?? p.runs_scored ?? p.performance?.runs_scored ?? 0;
                          const balls = perf?.balls_faced ?? p.balls_faced ?? p.performance?.balls_faced ?? 0;
                          const wickets = perf?.wickets_taken ?? p.wickets_taken ?? p.performance?.wickets_taken ?? 0;
                          const conceded = perf?.runs_conceded ?? p.runs_conceded ?? p.performance?.runs_conceded ?? 0;
                          return (
                            <View key={idx} style={{ marginVertical: 6 }}>
                              <Text style={{ fontSize: 14, color: '#F5F5F5' }}>
                                👤 {p.player?.full_name || p.player?.email || 'Unknown Player'}
                              </Text>
                              {hasStats && (
                                <Text style={{ fontSize: 11, color: '#D4AF37', marginLeft: 20, marginTop: 2 }}>
                                  Batting: {runs} runs ({balls}b) • Bowling: {wickets} wkt ({conceded}r)
                                </Text>
                              )}
                            </View>
                          );
                        })}
                        {(!selectedMatch.team_b?.players || selectedMatch.team_b.players.length === 0) && (
                          <Text style={{ fontSize: 13, color: '#888', fontStyle: 'italic' }}>No registered players.</Text>
                        )}
                      </View>
                    </View>
                  )}

                  {matchDetailsTab === 'Feedback' && (
                    <View style={styles.scorecardContainer}>
                      <Text style={styles.scorecardTeamTitle}>Add Tactical Match Review</Text>
                      
                      <Text style={styles.inputLabel}>Select Player</Text>
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginVertical: 8 }}>
                        {traineesList.map((player) => (
                          <TouchableOpacity
                            key={player.id}
                            style={[
                              styles.smallOptionChip,
                              feedbackPlayerId === player.id && styles.smallOptionChipActive
                            ]}
                            onPress={() => setFeedbackPlayerId(player.id)}
                          >
                            <Text style={[styles.smallChipText, feedbackPlayerId === player.id && styles.smallChipTextActive]}>
                              {player.full_name}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>

                      <TextInput
                        style={styles.textInput}
                        placeholder="Type tactical feedback for this match..."
                        placeholderTextColor="#555"
                        value={matchFeedbackText}
                        onChangeText={setMatchFeedbackText}
                        multiline
                      />

                      <TouchableOpacity style={[styles.submitReviewBtn, { marginVertical: 8 }]} onPress={handleAddMatchFeedback}>
                        <Text style={styles.submitReviewBtnText}>SAVE MATCH REVIEW</Text>
                      </TouchableOpacity>

                      <Text style={[styles.scorecardTeamTitle, { marginTop: 20 }]}>Coach Feedback History</Text>
                      {(!matchFeedbackList[selectedMatch.id] || matchFeedbackList[selectedMatch.id].length === 0) && (
                        <Text style={{ fontSize: 13, color: '#888', fontStyle: 'italic' }}>No tactical feedback logged for this match.</Text>
                      )}
                      {(matchFeedbackList[selectedMatch.id] || []).map((feed) => (
                        <View key={feed.id} style={styles.feedbackLogCard}>
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                            <Text style={styles.feedbackLogPlayer}>👤 {feed.playerName}</Text>
                            <Text style={styles.feedbackLogTime}>{feed.timestamp}</Text>
                          </View>
                          <Text style={styles.feedbackLogText}>{feed.comment}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </ScrollView>
              </View>
            )}
          </View>
        </View>
      </Modal>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#141414',
    paddingHorizontal: 16,
  },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderColor: '#2D2D2D',
    backgroundColor: '#1F1F1F',
    borderRadius: 8,
    margin: 12,
    padding: 4,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 6,
  },
  tabButtonActive: {
    backgroundColor: '#2A2A2A',
    borderWidth: 1,
    borderColor: '#3D3D3D',
  },
  tabButtonText: {
    fontWeight: 'bold',
    fontSize: 10,
    color: '#888888',
    letterSpacing: 0.5,
  },
  tabButtonTextActive: {
    color: '#D4AF37',
  },
  listContainer: {
    paddingBottom: 24,
  },
  statContainer: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontWeight: '900',
    fontSize: 13,
    color: '#D4AF37',
    marginBottom: 12,
    letterSpacing: 1.5,
  },
  playerCard: {
    backgroundColor: '#1F1F1F',
    borderWidth: 1,
    borderColor: '#2D2D2D',
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    marginHorizontal: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  playerInfo: {
    flex: 1,
    paddingRight: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  playerName: {
    color: '#F5F5F5',
    fontSize: 15,
    fontWeight: 'bold',
  },
  playerSubText: {
    color: '#888888',
    fontSize: 12,
    marginTop: 2,
    marginBottom: 4,
  },
  playerStats: {
    color: '#D4AF37',
    fontSize: 11,
    fontWeight: '500',
  },
  indexBox: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 70,
    borderLeftWidth: 1,
    borderLeftColor: '#2D2D2D',
    paddingLeft: 8,
  },
  indexLabel: {
    color: '#888888',
    fontSize: 8,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  indexValue: {
    color: '#D4AF37',
    fontWeight: '900',
    fontSize: 16,
    marginTop: 2,
  },
  emptyText: {
    color: '#888888',
    fontSize: 13,
    paddingVertical: 16,
  },
  matchCard: {
    backgroundColor: '#1F1F1F',
    borderWidth: 1,
    borderColor: '#2D2D2D',
    borderRadius: 16,
    padding: 18,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  matchMain: {
    flex: 1,
    paddingRight: 8,
  },
  matchTeams: {
    color: '#F5F5F5',
    fontSize: 16,
    fontWeight: 'bold',
  },
  matchTourneyName: {
    fontSize: 11,
    color: '#888888',
    marginVertical: 6,
  },
  matchSummaryText: {
    fontSize: 12,
    color: '#D4AF37',
    fontWeight: '600',
  },
  matchStatusBadge: {
    borderWidth: 1,
    borderColor: '#D4AF37',
    borderRadius: 8,
    paddingVertical: 4,
    paddingHorizontal: 10,
    backgroundColor: 'rgba(212, 175, 55, 0.05)',
  },
  matchStatusText: {
    color: '#D4AF37',
    fontSize: 10,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1F1F1F',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '80%',
    borderTopWidth: 1,
    borderTopColor: '#2D2D2D',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderColor: '#2D2D2D',
    paddingBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#F5F5F5',
  },
  modalSub: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
    fontWeight: 'bold',
  },
  modalCloseBtn: {
    padding: 4,
  },
  modalCloseBtnText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#F5F5F5',
  },
  modalTeamsSubTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#D4AF37',
    marginVertical: 14,
  },
  modalTabBar: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#3D3D3D',
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 8,
  },
  modalTabButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: '#1F1F1F',
  },
  modalTabButtonActive: {
    backgroundColor: '#2A2A2A',
  },
  modalTabButtonText: {
    fontSize: 12,
    color: '#888888',
    fontWeight: 'bold',
  },
  modalTabButtonTextActive: {
    color: '#D4AF37',
  },
  summaryContainer: {
    paddingVertical: 10,
  },
  summaryStatusBox: {
    borderWidth: 1,
    borderColor: '#2D2D2D',
    backgroundColor: '#2A2A2A',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginBottom: 20,
  },
  summaryStatusTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#888888',
  },
  summaryStatusVal: {
    fontSize: 22,
    fontWeight: '900',
    color: '#D4AF37',
    marginTop: 4,
  },
  summaryStatItem: {
    marginBottom: 16,
  },
  summaryLabel: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#888888',
  },
  summaryVal: {
    fontSize: 15,
    color: '#F5F5F5',
    marginTop: 4,
    fontWeight: '600',
  },
  scorecardContainer: {
    paddingVertical: 10,
  },
  scorecardTeamTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#D4AF37',
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  emptyStateContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
  },
  emptyStateEmoji: {
    fontSize: 32,
    marginBottom: 10,
  },
  // Coach features styles
  headerButtonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 12,
  },
  addDrillButton: {
    backgroundColor: '#D4AF37',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  addDrillButtonText: {
    color: '#141414',
    fontSize: 11,
    fontWeight: '900',
  },
  sessionCard: {
    backgroundColor: '#1F1F1F',
    borderWidth: 1,
    borderColor: '#2D2D2D',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  sessionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sessionDate: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  sessionBadge: {
    backgroundColor: '#2A2A2A',
    borderColor: '#3D3D3D',
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  sessionBadgeText: {
    color: '#D4AF37',
    fontSize: 9,
    fontWeight: 'bold',
  },
  sessionGround: {
    color: '#888888',
    fontSize: 12,
    marginBottom: 4,
  },
  sessionFocus: {
    color: '#D4AF37',
    fontSize: 13,
    fontWeight: '600',
  },
  squadCard: {
    backgroundColor: '#1F1F1F',
    borderWidth: 1,
    borderColor: '#2D2D2D',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  squadHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#2D2D2D',
    paddingBottom: 8,
  },
  squadTeamName: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: 'bold',
  },
  squadTourney: {
    color: '#D4AF37',
    fontSize: 12,
    fontWeight: 'bold',
  },
  squadSubText: {
    color: '#888888',
    fontSize: 11,
    marginBottom: 4,
  },
  squadPlayersList: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '500',
  },
  specsRow: {
    flexDirection: 'row',
    gap: 12,
    marginVertical: 14,
  },
  specBox: {
    flex: 1,
    backgroundColor: '#2A2A2A',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#3D3D3D',
  },
  specLabel: {
    color: '#888',
    fontSize: 8,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  specValue: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 13,
    marginTop: 4,
    textAlign: 'center',
  },
  innerSectionTitle: {
    fontSize: 12,
    fontWeight: '900',
    color: '#D4AF37',
    marginTop: 16,
    marginBottom: 10,
    letterSpacing: 1,
  },
  statsGrid: {
    flexDirection: 'row',
    backgroundColor: '#2A2A2A',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#3D3D3D',
  },
  statsGridCol: {
    flex: 1,
    alignItems: 'center',
  },
  gridStatVal: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  gridStatLabel: {
    color: '#888',
    fontSize: 10,
    marginTop: 2,
  },
  reviewForm: {
    backgroundColor: '#2A2A2A',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#3D3D3D',
  },
  inputLabel: {
    color: '#888',
    fontSize: 11,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  starRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  textInput: {
    backgroundColor: '#1F1F1F',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#3D3D3D',
    color: '#FFF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    minHeight: 60,
    textAlignVertical: 'top',
    marginBottom: 12,
  },
  submitReviewBtn: {
    backgroundColor: '#D4AF37',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  submitReviewBtnText: {
    color: '#141414',
    fontWeight: '900',
    fontSize: 11,
  },
  reviewLogCard: {
    backgroundColor: '#2A2A2A',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#2D2D2D',
  },
  reviewLogRating: {
    color: '#D4AF37',
    fontSize: 12,
  },
  reviewLogDate: {
    color: '#888',
    fontSize: 11,
  },
  reviewLogComment: {
    color: '#FFF',
    fontSize: 13,
    marginTop: 4,
  },
  dropdown: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1F1F1F',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#3D3D3D',
  },
  dropdownMenu: {
    backgroundColor: '#2A2A2A',
    borderWidth: 1,
    borderColor: '#3D3D3D',
    borderRadius: 8,
    marginTop: 4,
    maxHeight: 120,
    overflow: 'hidden',
  },
  dropdownItem: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  playerSelectCheckRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1F1F1F',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#3D3D3D',
  },
  playerSelectCheckRowActive: {
    borderColor: '#D4AF37',
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: '#D4AF37',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxActive: {
    backgroundColor: '#D4AF37',
  },
  smallOptionChip: {
    backgroundColor: '#2A2A2A',
    borderColor: '#3D3D3D',
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  smallOptionChipActive: {
    backgroundColor: '#D4AF37',
    borderColor: '#D4AF37',
  },
  smallChipText: {
    color: '#888',
    fontSize: 11,
    fontWeight: 'bold',
  },
  smallChipTextActive: {
    color: '#141414',
  },
  feedbackLogCard: {
    backgroundColor: '#2A2A2A',
    borderRadius: 8,
    padding: 10,
    marginVertical: 4,
    borderWidth: 1,
    borderColor: '#3D3D3D',
  },
  feedbackLogPlayer: {
    color: '#D4AF37',
    fontWeight: 'bold',
    fontSize: 12,
  },
  feedbackLogTime: {
    color: '#888',
    fontSize: 10,
  },
  feedbackLogText: {
    color: '#FFF',
    fontSize: 13,
    marginTop: 2,
  },
});

export default CoachDashboard;
