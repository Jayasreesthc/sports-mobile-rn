import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Modal,
  Animated,
  Easing,
} from 'react-native';
import StatCard from '../widgets/StatCard';

const PlayerDashboard = ({
  data,
  notifications = [],
  tournaments = [],
  coaches = [],
  players = [],
  apiClient,
  onRefresh,
  activeTab: parentActiveTab,
  selectedTournamentIdForModal,
  setSelectedTournamentIdForModal,
}) => {
  const matches = data.matches_played ?? 0;
  const wins = data.matches_won ?? 0;
  const losses = data.matches_lost ?? 0;
  const teams = data.team_names ?? [];

  // Tab States
  const [localTab, setLocalTab] = useState('Overview'); // 'Overview', 'Statistics', 'Matches'
  const activeTab = parentActiveTab || localTab;
  const setActiveTab = setLocalTab;

  useEffect(() => {
    if (selectedTournamentIdForModal && tournaments.length > 0) {
      const tourney = tournaments.find(t => t.id === selectedTournamentIdForModal);
      if (tourney) {
        setSelectedTournamentDetails(tourney);
        if (setSelectedTournamentIdForModal) {
          setSelectedTournamentIdForModal(null);
        }
      }
    }
  }, [selectedTournamentIdForModal, tournaments]);

  const slideAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const prevTabRef = useRef(activeTab);

  useEffect(() => {
    const tabs = ['Overview', 'Statistics', 'Matches', 'Tournaments'];
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

  // Team Registration Form States
  const [selectedTourneyId, setSelectedTourneyId] = useState('');
  const [teamName, setTeamName] = useState('');
  const [coachSearch, setCoachSearch] = useState('');
  const [selectedCoachId, setSelectedCoachId] = useState('');
  const [playerSearch, setPlayerSearch] = useState('');
  const [selectedPlayerIds, setSelectedPlayerIds] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const [showTourneys, setShowTourneys] = useState(false);
  const [showRegisterForm, setShowRegisterForm] = useState(false);

  // Player availability toggle
  const [isAvailable, setIsAvailable] = useState(true);
  const availScale = useRef(new Animated.Value(1)).current;
  const toggleAvailability = () => {
    Animated.sequence([
      Animated.timing(availScale, { toValue: 0.9, duration: 80, useNativeDriver: true }),
      Animated.timing(availScale, { toValue: 1, duration: 80, useNativeDriver: true }),
    ]).start();
    setIsAvailable(v => !v);
  };

  // Tournament Details Modal
  const [selectedTournamentDetails, setSelectedTournamentDetails] = useState(null);

  // Match Details Modal
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [matchDetailsTab, setMatchDetailsTab] = useState('Summary'); // 'Summary', 'Scorecard', 'WagonWheel'
  const [matchesList, setMatchesList] = useState([]);
  const [loadingMatches, setLoadingMatches] = useState(false);
  const [loadingScorecard, setLoadingScorecard] = useState(false);

  // Animated scaling for spring tap effects
  const squadBtnScale = useRef(new Animated.Value(1)).current;
  // Animated value for oscillating badge
  const badgePulse = useRef(new Animated.Value(1)).current;

  // Stagger values for match list
  const listFade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Oscillating badge infinite pulse loop
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(badgePulse, {
          toValue: 1.15,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(badgePulse, {
          toValue: 1,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    pulseLoop.start();
    return () => pulseLoop.stop();
  }, []);

  const tabFade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    tabFade.setValue(0);
    Animated.timing(tabFade, {
      toValue: 1,
      duration: 250,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start();
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'Matches') {
      listFade.setValue(0);
      Animated.timing(listFade, {
        toValue: 1,
        duration: 400,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }).start();
    }
  }, [activeTab]);

  const handleSquadPressIn = () => {
    Animated.spring(squadBtnScale, {
      toValue: 0.95,
      tension: 160,
      friction: 7,
      useNativeDriver: true,
    }).start();
  };

  const handleSquadPressOut = () => {
    Animated.spring(squadBtnScale, {
      toValue: 1,
      tension: 160,
      friction: 7,
      useNativeDriver: true,
    }).start();
  };

  // Filter lists based on search queries
  const filteredCoaches = coachSearch
    ? coaches.filter((c) => c.full_name.toLowerCase().includes(coachSearch.toLowerCase()))
    : coaches;

  const filteredPlayers = playerSearch
    ? players.filter((p) => p.full_name.toLowerCase().includes(playerSearch.toLowerCase()))
    : players;

  // Fetch all matches for player's tournaments
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
        setSelectedMatch({ ...fullMatch, tournamentName: matchItem.tournamentName });
      }
    } catch (e) {
      console.log('Error fetching match details:', e);
    }
  };

  const refreshMatchScorecard = async () => {
    if (!selectedMatch) return;
    setLoadingScorecard(true);
    try {
      const fullMatch = await apiClient.request(`${apiClient.constructor.baseUrl}/matches/${selectedMatch.id}`);
      if (fullMatch && !fullMatch.detail) {
        setSelectedMatch(prev => ({ ...fullMatch, tournamentName: prev?.tournamentName }));
      }
    } catch (e) {
      console.log('Error refreshing scorecard:', e);
    } finally {
      setLoadingScorecard(false);
    }
  };

  const handleMatchDetailsTabChange = (tab) => {
    setMatchDetailsTab(tab);
    if (tab === 'Scorecard') {
      refreshMatchScorecard();
    }
  };

  useEffect(() => {
    if (activeTab === 'Matches') {
      fetchMatches();
    }
  }, [activeTab, tournaments]);

  const togglePlayerSelect = (playerId) => {
    if (selectedPlayerIds.includes(playerId)) {
      setSelectedPlayerIds(selectedPlayerIds.filter((id) => id !== playerId));
    } else {
      setSelectedPlayerIds([...selectedPlayerIds, playerId]);
    }
  };

  const handleRegisterTeam = async () => {
    if (!selectedTourneyId || !teamName || !selectedCoachId || selectedPlayerIds.length === 0) {
      setError('Please choose a tournament, name, coach, and select players.');
      return;
    }

    setSubmitting(true);
    setError('');
    setMessage('');
    try {
      const res = await apiClient.registerTeam(
        parseInt(selectedTourneyId),
        teamName,
        parseInt(selectedCoachId),
        selectedPlayerIds.map((id) => parseInt(id))
      );

      if (res && res.id) {
        setMessage(`Team "${teamName}" registered successfully (pending approval)!`);
        setTeamName('');
        setSelectedTourneyId('');
        setCoachSearch('');
        setSelectedCoachId('');
        setPlayerSearch('');
        setSelectedPlayerIds([]);
        if (onRefresh) onRefresh();
      } else {
        setError(res?.detail || 'Failed to register team.');
      }
    } catch (e) {
      setError(e?.message || 'Failed to connect to backend server.');
    } finally {
      setSubmitting(false);
    }
  };

  const getSelectedTourneyLabel = () => {
    const tourney = tournaments.find((t) => t.id.toString() === selectedTourneyId);
    return tourney ? tourney.name : 'Select Tournament';
  };

  const getCoachNameById = (id) => {
    const coach = coaches.find((c) => c.id === id);
    return coach ? coach.full_name : 'No coach assigned';
  };

  // Countdown timer for tournament registration deadlines
  const getCountdown = (dateStr) => {
    if (!dateStr) return null;
    const diff = new Date(dateStr) - new Date();
    if (diff <= 0) return 'Closed';
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    if (days > 0) return `${days}d ${hours}h left`;
    return `${hours}h left`;
  };

  // Win probability based on runs scored
  const getWinProbability = (match) => {
    const runsA = match.team_a_runs ?? 0;
    const runsB = match.team_b_runs ?? 0;
    const total = runsA + runsB;
    if (total === 0) return 50;
    return Math.round((runsA / total) * 100);
  };

  return (
    <View style={styles.container}>
      {/* Sub-header Tabs */}
      {!parentActiveTab && (
        <View style={styles.tabBar}>
          {['Overview', 'Statistics', 'Matches', 'Tournaments'].map((tab) => (
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
        <ScrollView nestedScrollEnabled={true} style={styles.scrollContainer}>
          {activeTab === 'Overview' && (
          <View>
            {/* Player Profile Card */}
            <View style={[styles.formCard, { marginBottom: 4, marginTop: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: '#2A2A2A', borderWidth: 2, borderColor: '#D4AF37', alignItems: 'center', justifyContent: 'center', marginRight: 14 }}>
                  <Text style={{ fontSize: 26 }}>🏏</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: '#F5F5F5', fontWeight: 'bold', fontSize: 16 }}>{data.full_name || data.email?.split('@')[0] || 'Player'}</Text>
                  <Text style={{ color: '#888', fontSize: 12, marginTop: 2 }}>Cricket Player</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                    <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: isAvailable ? '#81C784' : '#E57373', marginRight: 6 }} />
                    <Text style={{ color: isAvailable ? '#81C784' : '#E57373', fontSize: 11, fontWeight: '600' }}>
                      {isAvailable ? 'Available' : 'Unavailable'}
                    </Text>
                  </View>
                </View>
              </View>
              <Animated.View style={{ transform: [{ scale: availScale }] }}>
                <TouchableOpacity
                  onPress={toggleAvailability}
                  style={[{ paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8, borderWidth: 1, borderColor: isAvailable ? '#81C784' : '#E57373', backgroundColor: isAvailable ? 'rgba(129,199,132,0.08)' : 'rgba(229,115,115,0.08)' }]}
                >
                  <Text style={{ color: isAvailable ? '#81C784' : '#E57373', fontSize: 11, fontWeight: 'bold' }}>
                    {isAvailable ? 'Set Busy' : 'Set Free'}
                  </Text>
                </TouchableOpacity>
              </Animated.View>
            </View>

            {/* Stats row */}
            <View style={styles.statsRow}>
              <View style={styles.statCol}>
                <StatCard label="Played" value={matches.toString()} />
              </View>
              <View style={styles.statCol}>
                <StatCard label="Wins" value={wins.toString()} />
              </View>
              <View style={styles.statCol}>
                <StatCard label="Losses" value={losses.toString()} />
              </View>
            </View>

            {/* Next Match Static Card */}
            <View style={[styles.section, { marginTop: 10 }]}>
              <Text style={styles.sectionTitle}>Up Next</Text>
              <View style={[styles.formCard, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: '#F5F5F5', fontSize: 16, fontWeight: 'bold' }}>Mumbai Indians vs CSK</Text>
                  <Text style={{ color: '#888', fontSize: 12, marginVertical: 4 }}>IPL 2026 - Group Stage</Text>
                  <Text style={{ color: '#D4AF37', fontSize: 12, fontWeight: '600' }}>Tomorrow, 19:30 PM</Text>
                </View>
                <View style={{ borderWidth: 1, borderColor: '#D4AF37', borderRadius: 8, paddingVertical: 4, paddingHorizontal: 10, backgroundColor: 'rgba(212, 175, 55, 0.05)' }}>
                  <Text style={{ color: '#D4AF37', fontSize: 10, fontWeight: 'bold' }}>UPCOMING</Text>
                </View>
              </View>
            </View>

            {/* Recent Form */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Recent Form</Text>
              <View style={[styles.formCard, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', paddingVertical: 20 }]}>
                {['W', 'W', 'L', 'W', 'D'].map((res, i) => (
                  <View key={i} style={{
                    width: 40, height: 40, borderRadius: 20, 
                    backgroundColor: res === 'W' ? '#1E2C1E' : res === 'L' ? '#3C1F1F' : '#2A2A2A',
                    borderWidth: 1, 
                    borderColor: res === 'W' ? '#2E7D32' : res === 'L' ? '#C62828' : '#888',
                    alignItems: 'center', justifyContent: 'center'
                  }}>
                    <Text style={{ 
                      color: res === 'W' ? '#81C784' : res === 'L' ? '#E57373' : '#888', 
                      fontWeight: 'bold', fontSize: 16 
                    }}>{res}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Quick Actions / Highlights */}
            <View style={[styles.section, { marginBottom: 30 }]}>
              <Text style={styles.sectionTitle}>Player Highlights</Text>
              <View style={styles.teamCard}>
                <Text style={styles.teamIcon}>🌟</Text>
                <Text style={styles.teamName}>Man of the Match - Last Game</Text>
              </View>
              <View style={styles.teamCard}>
                <Text style={styles.teamIcon}>🎯</Text>
                <Text style={styles.teamName}>Top Run Scorer - IPL 2026</Text>
              </View>
            </View>
          </View>
        )}

        {activeTab === 'Tournaments' && (
          <View>
            {/* Upcoming Tournaments & Registration */}
            <View style={[styles.section, { marginBottom: 30 }]}>
              <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12}}>
                <Text style={[styles.sectionTitle, {marginBottom: 0}]}>Upcoming Tournaments</Text>
                {!showRegisterForm && (
                  <TouchableOpacity 
                    style={[styles.submitButton, {marginTop: 0, paddingVertical: 6, paddingHorizontal: 12, backgroundColor: '#2A2A2A', borderWidth: 1, borderColor: '#D4AF37'}]} 
                    onPress={() => setShowRegisterForm(true)}
                  >
                    <Text style={[styles.submitButtonText, {fontSize: 11, color: '#D4AF37'}]}>+ Register Team</Text>
                  </TouchableOpacity>
                )}
              </View>

              {showRegisterForm && (
              <View style={[styles.formCard, {marginBottom: 20}]}>
                {message ? (
                  <View style={styles.successBox}>
                    <Text style={styles.successText}>✓ {message}</Text>
                  </View>
                ) : null}
                {error ? (
                  <View style={styles.errorBox}>
                    <Text style={styles.errorText}>⚠ {error}</Text>
                  </View>
                ) : null}

                {/* Tournament Selection */}
                <Text style={styles.label}>Choose Tournament</Text>
                <TouchableOpacity
                  style={styles.dropdown}
                  onPress={() => setShowTourneys(!showTourneys)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.dropdownText}>{getSelectedTourneyLabel()}</Text>
                  <Text style={styles.dropdownArrow}>{showTourneys ? '▲' : '▼'}</Text>
                </TouchableOpacity>
                {showTourneys && (
                  <View style={styles.dropdownMenu}>
                    {tournaments
                      .filter((t) => t.is_approved)
                      .map((t) => (
                        <TouchableOpacity
                          key={t.id}
                          style={styles.dropdownItem}
                          onPress={() => {
                            setSelectedTourneyId(t.id.toString());
                            setShowTourneys(false);
                          }}
                        >
                          <Text style={styles.dropdownItemText}>{t.name}</Text>
                        </TouchableOpacity>
                      ))}
                  </View>
                )}

                {/* Team Name */}
                <Text style={styles.label}>Team Name</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Chennai Super Kings"
                  placeholderTextColor="#666"
                  value={teamName}
                  onChangeText={setTeamName}
                />

                {/* Coach Selection Auto-complete */}
                <Text style={styles.label}>Search & Choose Coach</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Type to search coach (e.g. John)"
                  placeholderTextColor="#666"
                  value={coachSearch}
                  onChangeText={(val) => {
                    setCoachSearch(val);
                    if (selectedCoachId) setSelectedCoachId('');
                  }}
                />
                {coachSearch.length > 0 && !selectedCoachId && (
                  <View style={styles.suggestionsContainer}>
                    {filteredCoaches.length === 0 ? (
                      <Text style={styles.suggestionEmpty}>No matching coaches</Text>
                    ) : (
                      filteredCoaches.map((c) => (
                        <TouchableOpacity
                          key={c.id}
                          style={styles.suggestionItem}
                          onPress={() => {
                            setSelectedCoachId(c.id.toString());
                            setCoachSearch(c.full_name);
                          }}
                        >
                          <Text style={styles.suggestionText}>{c.full_name} ({c.email})</Text>
                        </TouchableOpacity>
                      ))
                    )}
                  </View>
                )}
                {selectedCoachId ? (
                  <Text style={styles.selectionLabel}>✓ Selected Coach: {coachSearch}</Text>
                ) : null}

                {/* Player Selection Auto-complete */}
                <Text style={styles.label}>Search & Choose Players</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Type to search player name (e.g. Ashwin)"
                  placeholderTextColor="#666"
                  value={playerSearch}
                  onChangeText={setPlayerSearch}
                />
                {playerSearch.length > 0 && (
                  <View style={styles.suggestionsContainer}>
                    {filteredPlayers.length === 0 ? (
                      <Text style={styles.suggestionEmpty}>No matching players</Text>
                    ) : (
                      filteredPlayers.map((p) => {
                        const isSelected = selectedPlayerIds.includes(p.id);
                        return (
                          <TouchableOpacity
                            key={p.id}
                            style={[
                              styles.suggestionItem,
                              isSelected && { backgroundColor: '#333333' },
                            ]}
                            onPress={() => {
                              togglePlayerSelect(p.id);
                            }}
                          >
                            <Text style={[styles.suggestionText, isSelected && { color: '#D4AF37', fontWeight: 'bold' }]}>
                              {isSelected ? '✓ ' : '+ '}
                              {p.full_name} ({p.email})
                            </Text>
                          </TouchableOpacity>
                        );
                      })
                    )}
                  </View>
                )}

                {/* Selected Squad List */}
                <Text style={styles.label}>Current Squad Selection</Text>
                {selectedPlayerIds.length === 0 ? (
                  <Text style={styles.emptyText}>No players selected. Use search box above.</Text>
                ) : (
                  <View style={styles.chipsContainer}>
                    {selectedPlayerIds.map((id) => {
                      const p = players.find((pl) => pl.id === id);
                      return (
                        <TouchableOpacity
                          key={id}
                          style={styles.chip}
                          onPress={() => togglePlayerSelect(id)}
                          activeOpacity={0.7}
                        >
                          <Text style={styles.chipText}>
                            {p ? p.full_name : `ID: ${id}`} ✕
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}

                {/* Submit Button with Spring Tap */}
                <Animated.View style={{ transform: [{ scale: squadBtnScale }] }}>
                  <TouchableOpacity
                    style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
                    onPress={handleRegisterTeam}
                    onPressIn={handleSquadPressIn}
                    onPressOut={handleSquadPressOut}
                    disabled={submitting}
                    activeOpacity={0.9}
                  >
                    {submitting ? (
                      <ActivityIndicator color="#141414" />
                    ) : (
                      <Text style={styles.submitButtonText}>Register Squad</Text>
                    )}
                  </TouchableOpacity>
                </Animated.View>
                <TouchableOpacity style={[styles.submitButton, {marginTop: 10, backgroundColor: '#333333'}]} onPress={() => setShowRegisterForm(false)}>
                   <Text style={[styles.submitButtonText, {color: '#888888'}]}>Cancel</Text>
                </TouchableOpacity>
              </View>
              )}

              {/* Tournament List */}
              {tournaments.length === 0 ? (
                <View style={styles.emptyStateContainer}>
                  <Text style={styles.emptyStateEmoji}>🏆</Text>
                  <Text style={styles.emptyText}>No upcoming tournaments.</Text>
                </View>
              ) : (
                tournaments.filter(t => t.is_approved).map((t) => {
                  const countdown = getCountdown(t.registration_end_date);
                  return (
                  <TouchableOpacity key={t.id} style={[styles.teamCard, { flexDirection: 'column', alignItems: 'flex-start', gap: 6 }]} onPress={() => setSelectedTournamentDetails(t)}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', width: '100%', justifyContent: 'space-between' }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                        <Text style={styles.teamIcon}>🏆</Text>
                        <Text style={[styles.teamName, { flex: 1 }]}>{t.name}</Text>
                      </View>
                      {countdown && (
                        <View style={{ backgroundColor: countdown === 'Closed' ? '#3C1F1F' : 'rgba(212,175,55,0.1)', borderRadius: 6, paddingVertical: 3, paddingHorizontal: 8, borderWidth: 1, borderColor: countdown === 'Closed' ? '#C62828' : '#D4AF37' }}>
                          <Text style={{ color: countdown === 'Closed' ? '#E57373' : '#D4AF37', fontSize: 10, fontWeight: 'bold' }}>⏱ {countdown}</Text>
                        </View>
                      )}
                    </View>
                    {t.city && <Text style={{ color: '#888', fontSize: 11, paddingLeft: 32 }}>📍 {t.city}{t.ground_name ? ` · ${t.ground_name}` : ''}</Text>}
                    {t.fee > 0 && <Text style={{ color: '#D4AF37', fontSize: 11, paddingLeft: 32 }}>Entry: ₹{t.fee}</Text>}
                  </TouchableOpacity>
                  );
                })
              )}
            </View>
          </View>
        )}

        {activeTab === 'Teams' && (
          <View>
            {/* My Registered Squads */}
            <View style={[styles.section, { marginBottom: 30, marginTop: 16 }]}>
              <Text style={styles.sectionTitle}>My Squads</Text>
              {teams.length === 0 ? (
                <View style={styles.emptyStateContainer}>
                  <Text style={styles.emptyStateEmoji}>🏏</Text>
                  <Text style={styles.emptyText}>Not registered in any squads yet.</Text>
                </View>
              ) : (
                teams.map((t, index) => (
                  <View key={index} style={styles.teamCard}>
                    <Text style={styles.teamIcon}>🏏</Text>
                    <Text style={styles.teamName}>{t}</Text>
                  </View>
                ))
              )}
            </View>
          </View>
        )}

        {activeTab === 'Statistics' && (
          <View style={styles.statsTabContainer}>
            <Text style={styles.sectionTitle}>Player Individual Stats</Text>
            <View style={styles.statsCard}>
              {[
                { label: 'Matches Played', val: matches },
                { label: 'Total Runs Scored', val: data.runs_scored ?? 0 },
                { label: 'Balls Faced', val: data.balls_faced ?? 0 },
                {
                  label: 'Batting Strike Rate',
                  val: data.balls_faced > 0
                    ? ((data.runs_scored / data.balls_faced) * 100).toFixed(2)
                    : '0.00'
                },
                { label: 'Wickets Taken', val: data.wickets_taken ?? 0 },
                { label: 'Runs Conceded', val: data.runs_conceded ?? 0 },
              ].map((item, index) => (
                <View key={index} style={styles.statRowItem}>
                  <Text style={styles.statLabel}>{item.label}</Text>
                  <Text style={styles.statVal}>{item.val}</Text>
                </View>
              ))}
              
              {/* Highlight Performance Rating */}
              <View style={[styles.statRowItem, styles.premiumRatingItem]}>
                <Text style={[styles.statLabel, { color: '#141414', fontWeight: '900' }]}>Performance Rating Index</Text>
                <Text style={[styles.statVal, { color: '#141414', fontWeight: '900', fontSize: 18 }]}>
                  {(data.performance_score ?? 0.0).toFixed(2)}
                </Text>
              </View>
            </View>
          </View>
        )}

        {activeTab === 'Matches' && (
          <Animated.View style={{ opacity: listFade }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={styles.sectionTitle}>Tournament Matches</Text>
              {matchesList.filter(m => m.status === 'live').length > 0 && (
                <View style={{ backgroundColor: '#FF3B30', borderRadius: 12, paddingHorizontal: 8, paddingVertical: 3, marginBottom: 12 }}>
                  <Text style={{ color: '#fff', fontSize: 10, fontWeight: 'bold' }}>🔴 {matchesList.filter(m => m.status === 'live').length} LIVE</Text>
                </View>
              )}
            </View>
            {loadingMatches ? (
              <ActivityIndicator color="#D4AF37" style={{ marginVertical: 30 }} />
            ) : matchesList.length === 0 ? (
              <View style={styles.emptyStateContainer}>
                <Text style={styles.emptyStateEmoji}>📅</Text>
                <Text style={styles.emptyText}>No tournament matches scheduled yet.</Text>
              </View>
            ) : (
              matchesList.map((match) => {
                const probA = getWinProbability(match);
                const probB = 100 - probA;
                const isLive = match.status === 'live';
                const hasScores = (match.team_a_runs ?? 0) + (match.team_b_runs ?? 0) > 0;
                return (
                <TouchableOpacity
                  key={match.id}
                  style={styles.matchCard}
                  activeOpacity={0.95}
                  onPress={() => handleSelectMatch(match)}
                >
                  <View style={styles.matchMain}>
                    <Text style={styles.matchTeams}>
                      {match.team_a_name} vs {match.team_b_name}
                    </Text>
                    <Text style={styles.matchTourneyName}>{match.tournamentName}</Text>
                    <Text style={styles.matchSummaryText}>
                      {match.score_summary || 'Scoreboard Pending'}
                    </Text>

                    {/* Win Probability Bar */}
                    {hasScores && (
                      <View style={{ marginTop: 10 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                          <Text style={{ color: '#81C784', fontSize: 10, fontWeight: 'bold' }}>{match.team_a_name?.split(' ')[0]} {probA}%</Text>
                          <Text style={{ color: '#E57373', fontSize: 10, fontWeight: 'bold' }}>{probB}% {match.team_b_name?.split(' ')[0]}</Text>
                        </View>
                        <View style={{ height: 5, borderRadius: 4, backgroundColor: '#2A2A2A', overflow: 'hidden', flexDirection: 'row' }}>
                          <View style={{ width: `${probA}%`, backgroundColor: '#81C784', borderRadius: 4 }} />
                          <View style={{ width: `${probB}%`, backgroundColor: '#E57373', borderRadius: 4 }} />
                        </View>
                      </View>
                    )}
                  </View>

                  {/* Oscillating Live Status Badge */}
                  <Animated.View
                    style={[
                      styles.matchStatusBadge,
                      isLive && {
                        borderColor: '#FF3B30',
                        transform: [{ scale: badgePulse }]
                      }
                    ]}
                  >
                    <Text
                      style={[
                        styles.matchStatusText,
                        isLive && { color: '#FF3B30', fontWeight: '900' }
                      ]}
                    >
                      {match.status?.toUpperCase()}
                    </Text>
                  </Animated.View>
                </TouchableOpacity>
                );
              })
            )}
          </Animated.View>
        )}
      </ScrollView>

      {/* Match Details Modal (Summary, Scorecard, Wagon Wheel) */}
      <Modal
        visible={selectedMatch !== null}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setSelectedMatch(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Drag Handle */}
            <View style={styles.modalDragHandle} />
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderLeft}>
                <View style={styles.modalIconBadge}>
                  <Text style={{ fontSize: 18 }}>📊</Text>
                </View>
                <View>
                  <Text style={styles.modalTitle}>Match Analytics</Text>
                  {selectedMatch && (
                    <Text style={styles.modalSubtitle}>{selectedMatch.team_a_name} vs {selectedMatch.team_b_name}</Text>
                  )}
                </View>
              </View>
              <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setSelectedMatch(null)}>
                <Text style={styles.modalCloseBtnText}>✕</Text>
              </TouchableOpacity>
            </View>

            {selectedMatch && (
              <View style={{ flex: 1 }}>

                {/* Modal Sub-Tabs */}
                <View style={styles.modalTabBar}>
                  {['Summary', 'Scorecard', 'Wagon Wheel'].map((tab) => (
                    <TouchableOpacity
                      key={tab}
                      style={[
                        styles.modalTabButton,
                        matchDetailsTab === tab && styles.modalTabButtonActive,
                      ]}
                      onPress={() => handleMatchDetailsTabChange(tab)}
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

                <ScrollView style={{ flex: 1, marginTop: 12 }}>
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
                      {/* Refresh button */}
                      <TouchableOpacity
                        onPress={refreshMatchScorecard}
                        style={{ alignSelf: 'flex-end', marginBottom: 10, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: '#D4AF37', borderRadius: 8, flexDirection: 'row', alignItems: 'center' }}
                      >
                        {loadingScorecard
                          ? <ActivityIndicator size="small" color="#1A1A1A" />
                          : <Text style={{ color: '#1A1A1A', fontWeight: 'bold', fontSize: 12 }}>⟳ Refresh Scorecard</Text>
                        }
                      </TouchableOpacity>

                      <Text style={styles.scorecardTeamTitle}>{selectedMatch.team_a?.name || selectedMatch.team_a_name || 'Team A'} Roster</Text>
                      <View style={{ marginBottom: 16, paddingLeft: 4 }}>
                        {(selectedMatch.team_a?.players || []).map((p, idx) => {
                          const pId = p.player_id || p.player?.id;
                          const perf = (selectedMatch.performances || []).find(pf => String(pf.player_id) === String(pId));
                          const pName = p.player?.full_name || p.player?.email;

                          const runs = perf?.runs_scored ?? p.runs_scored ?? p.performance?.runs_scored ?? 0;
                          const balls = perf?.balls_faced ?? p.balls_faced ?? p.performance?.balls_faced ?? 0;
                          const wickets = perf?.wickets_taken ?? p.wickets_taken ?? p.performance?.wickets_taken ?? 0;
                          const conceded = perf?.runs_conceded ?? p.runs_conceded ?? p.performance?.runs_conceded ?? 0;
                          return (
                            <View key={idx} style={{ marginVertical: 6, backgroundColor: '#1E1E1E', borderRadius: 8, padding: 10 }}>
                              <Text style={{ fontSize: 14, color: '#F5F5F5', fontWeight: '600' }}>
                                👤 {pName || 'Unknown Player'}
                              </Text>
                              <View style={{ flexDirection: 'row', marginTop: 4, gap: 16 }}>
                                <Text style={{ fontSize: 12, color: '#D4AF37' }}>🏏 {runs} runs ({balls}b)</Text>
                                <Text style={{ fontSize: 12, color: '#81C784' }}>⚾ {wickets} wkt ({conceded}r)</Text>
                              </View>
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
                          const pName = p.player?.full_name || p.player?.email;

                          const runs = perf?.runs_scored ?? p.runs_scored ?? p.performance?.runs_scored ?? 0;
                          const balls = perf?.balls_faced ?? p.balls_faced ?? p.performance?.balls_faced ?? 0;
                          const wickets = perf?.wickets_taken ?? p.wickets_taken ?? p.performance?.wickets_taken ?? 0;
                          const conceded = perf?.runs_conceded ?? p.runs_conceded ?? p.performance?.runs_conceded ?? 0;
                          return (
                            <View key={idx} style={{ marginVertical: 6, backgroundColor: '#1E1E1E', borderRadius: 8, padding: 10 }}>
                              <Text style={{ fontSize: 14, color: '#F5F5F5', fontWeight: '600' }}>
                                👤 {pName || 'Unknown Player'}
                              </Text>
                              <View style={{ flexDirection: 'row', marginTop: 4, gap: 16 }}>
                                <Text style={{ fontSize: 12, color: '#D4AF37' }}>🏏 {runs} runs ({balls}b)</Text>
                                <Text style={{ fontSize: 12, color: '#81C784' }}>⚾ {wickets} wkt ({conceded}r)</Text>
                              </View>
                            </View>
                          );
                        })}
                        {(!selectedMatch.team_b?.players || selectedMatch.team_b.players.length === 0) && (
                          <Text style={{ fontSize: 13, color: '#888', fontStyle: 'italic' }}>No registered players.</Text>
                        )}
                      </View>
                    </View>
                  )}

                  {matchDetailsTab === 'Wagon Wheel' && (
                    <View style={styles.wagonWheelContainer}>
                      <Text style={styles.wagonTitle}>Shot Placement distribution</Text>
                      {/* Graphical Wagon Wheel simulation using native views */}
                      <View style={styles.wheelCircle}>
                        {/* Crease / Central pitch */}
                        <View style={styles.crease} />
                        {/* Boundaries shots */}
                        <View style={[styles.shotLine, { transform: [{ rotate: '45deg' }], width: 100, backgroundColor: '#D4AF37' }]} />
                        <View style={[styles.shotLine, { transform: [{ rotate: '120deg' }], width: 90, backgroundColor: '#888888' }]} />
                        <View style={[styles.shotLine, { transform: [{ rotate: '210deg' }], width: 110, backgroundColor: '#D4AF37' }]} />
                        <View style={[styles.shotLine, { transform: [{ rotate: '315deg' }], width: 80, backgroundColor: '#555555' }]} />
                        
                        <Text style={[styles.wheelLabel, { top: 12, left: 100 }]}>Off Side</Text>
                        <Text style={[styles.wheelLabel, { bottom: 12, left: 100 }]}>On Side</Text>
                        <Text style={[styles.wheelLabel, { top: 100, left: 12 }]}>Leg</Text>
                        <Text style={[styles.wheelLabel, { top: 100, right: 12 }]}>Off</Text>
                      </View>
                      <View style={styles.wagonLegend}>
                        <View style={styles.legendItem}>
                          <View style={[styles.legendDot, { backgroundColor: '#D4AF37' }]} />
                          <Text style={styles.legendText}>Boundaries / Sixes</Text>
                        </View>
                        <View style={styles.legendItem}>
                          <View style={[styles.legendDot, { backgroundColor: '#888888' }]} />
                          <Text style={styles.legendText}>Singles / Doubles</Text>
                        </View>
                      </View>
                    </View>
                  )}
                </ScrollView>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* Tournament Details Modal */}
      <Modal
        visible={selectedTournamentDetails !== null}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setSelectedTournamentDetails(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Drag Handle */}
            <View style={styles.modalDragHandle} />
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderLeft}>
                <View style={styles.modalIconBadge}>
                  <Text style={{ fontSize: 18 }}>🏆</Text>
                </View>
                <View>
                  <Text style={styles.modalTitle}>Tournament Details</Text>
                  {selectedTournamentDetails && (
                    <Text style={styles.modalSubtitle}>{selectedTournamentDetails.status?.replace('_', ' ') || 'Approved'}</Text>
                  )}
                </View>
              </View>
              <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setSelectedTournamentDetails(null)}>
                <Text style={styles.modalCloseBtnText}>✕</Text>
              </TouchableOpacity>
            </View>
            {selectedTournamentDetails && (
              <ScrollView style={{ flex: 1, marginTop: 12 }}>
                <View style={styles.summaryContainer}>
                  <View style={styles.summaryStatItem}>
                    <Text style={styles.summaryLabel}>Name</Text>
                    <Text style={styles.summaryVal}>{selectedTournamentDetails.name}</Text>
                  </View>
                  
                  {/* Additional Tournament Details */}
                  <View style={styles.summaryStatItem}>
                    <Text style={styles.summaryLabel}>Registration Fee</Text>
                    <Text style={[styles.summaryVal, { color: '#D4AF37', fontWeight: 'bold' }]}>
                      {selectedTournamentDetails.fee && selectedTournamentDetails.fee > 0 ? `₹${selectedTournamentDetails.fee}` : 'Free'}
                    </Text>
                  </View>

                  {(selectedTournamentDetails.city || selectedTournamentDetails.location) && (
                  <View style={styles.summaryStatItem}>
                    <Text style={styles.summaryLabel}>City / Location</Text>
                    <Text style={styles.summaryVal}>{selectedTournamentDetails.city || selectedTournamentDetails.location}</Text>
                  </View>
                  )}

                  {selectedTournamentDetails.ground_name && (
                  <View style={styles.summaryStatItem}>
                    <Text style={styles.summaryLabel}>Ground Name</Text>
                    <Text style={styles.summaryVal}>{selectedTournamentDetails.ground_name}</Text>
                  </View>
                  )}

                  {selectedTournamentDetails.prize_pools && (
                  <View style={styles.summaryStatItem}>
                    <Text style={styles.summaryLabel}>Prize Pool</Text>
                    <Text style={styles.summaryVal}>{selectedTournamentDetails.prize_pools}</Text>
                  </View>
                  )}

                  {selectedTournamentDetails.start_date && (
                  <View style={styles.summaryStatItem}>
                    <Text style={styles.summaryLabel}>Tournament Dates</Text>
                    <Text style={styles.summaryVal}>
                      {new Date(selectedTournamentDetails.start_date).toLocaleDateString()} 
                      {selectedTournamentDetails.end_date ? ` to ${new Date(selectedTournamentDetails.end_date).toLocaleDateString()}` : ''}
                    </Text>
                  </View>
                  )}

                  {selectedTournamentDetails.registration_end_date && (
                  <View style={styles.summaryStatItem}>
                    <Text style={styles.summaryLabel}>Registration Deadline</Text>
                    <Text style={styles.summaryVal}>{new Date(selectedTournamentDetails.registration_end_date).toLocaleDateString()}</Text>
                  </View>
                  )}

                  <View style={styles.summaryStatItem}>
                    <Text style={styles.summaryLabel}>Match Format</Text>
                    <Text style={styles.summaryVal}>
                      {selectedTournamentDetails.overs || 20} Overs ({selectedTournamentDetails.ball_type || 'Any ball'})
                    </Text>
                  </View>

                  <View style={styles.summaryStatItem}>
                    <Text style={styles.summaryLabel}>Team Limits</Text>
                    <Text style={styles.summaryVal}>
                      Max {selectedTournamentDetails.number_of_entry || 8} teams, {selectedTournamentDetails.team_limits || 15} players per squad
                    </Text>
                  </View>

                  <View style={styles.summaryStatItem}>
                    <Text style={styles.summaryLabel}>Status</Text>
                    <Text style={styles.summaryVal}>{selectedTournamentDetails.status || (selectedTournamentDetails.is_approved ? 'Approved' : 'Pending')}</Text>
                  </View>
                </View>
              </ScrollView>
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
  },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#2D2D2D',
    marginBottom: 20,
    backgroundColor: '#1F1F1F',
    borderRadius: 8,
    overflow: 'hidden',
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
    color: '#888888',
    fontWeight: 'bold',
    fontSize: 12,
    letterSpacing: 0.5,
  },
  tabButtonTextActive: {
    color: '#D4AF37',
  },
  scrollContainer: {
    flex: 1,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    gap: 8,
  },
  statCol: {
    flex: 1,
  },
  section: {
    marginTop: 10,
    marginBottom: 20,
  },
  sectionTitle: {
    fontWeight: '900',
    fontSize: 13,
    color: '#D4AF37',
    marginBottom: 12,
    letterSpacing: 1.5,
  },
  formCard: {
    backgroundColor: '#1F1F1F',
    borderWidth: 1,
    borderColor: '#2D2D2D',
    borderRadius: 16,
    padding: 20,
  },
  label: {
    color: '#888888',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 14,
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: '#2A2A2A',
    color: '#F5F5F5',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#3D3D3D',
    marginBottom: 4,
  },
  dropdown: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#2A2A2A',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#3D3D3D',
  },
  dropdownText: {
    color: '#F5F5F5',
    fontSize: 14,
  },
  dropdownArrow: {
    color: '#D4AF37',
    fontSize: 12,
  },
  dropdownMenu: {
    backgroundColor: '#2A2A2A',
    borderWidth: 1,
    borderColor: '#3D3D3D',
    borderRadius: 8,
    marginTop: 4,
    maxHeight: 150,
    overflow: 'hidden',
  },
  dropdownItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
  },
  dropdownItemText: {
    color: '#F5F5F5',
    fontSize: 14,
  },
  suggestionsContainer: {
    backgroundColor: '#2A2A2A',
    borderWidth: 1,
    borderColor: '#3D3D3D',
    maxHeight: 150,
    marginTop: 4,
    borderRadius: 8,
    overflow: 'hidden',
  },
  suggestionItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
  },
  suggestionText: {
    color: '#F5F5F5',
    fontSize: 13,
  },
  suggestionEmpty: {
    padding: 12,
    color: '#888888',
    fontSize: 13,
  },
  selectionLabel: {
    color: '#D4AF37',
    fontWeight: 'bold',
    fontSize: 12,
    marginTop: 8,
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  chip: {
    backgroundColor: '#2A2A2A',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#3D3D3D',
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  chipText: {
    color: '#D4AF37',
    fontSize: 12,
    fontWeight: 'bold',
  },
  emptyText: {
    color: '#888888',
    fontSize: 13,
    paddingVertical: 8,
  },
  teamCard: {
    backgroundColor: '#1F1F1F',
    borderWidth: 1,
    borderColor: '#2D2D2D',
    padding: 16,
    marginBottom: 10,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  teamIcon: {
    fontSize: 18,
    marginRight: 12,
    color: '#D4AF37',
  },
  teamName: {
    color: '#F5F5F5',
    fontSize: 15,
    fontWeight: 'bold',
  },
  submitButton: {
    backgroundColor: '#D4AF37',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 20,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    color: '#141414',
    fontWeight: '900',
    fontSize: 14,
  },
  successBox: {
    backgroundColor: '#1E2C1E',
    borderWidth: 1,
    borderColor: '#2E7D32',
    borderRadius: 8,
    padding: 12,
    marginBottom: 14,
  },
  successText: {
    color: '#81C784',
    fontWeight: 'bold',
    fontSize: 13,
  },
  errorBox: {
    backgroundColor: '#3C1F1F',
    borderWidth: 1,
    borderColor: '#C62828',
    borderRadius: 8,
    padding: 12,
    marginBottom: 14,
  },
  errorText: {
    color: '#E57373',
    fontWeight: 'bold',
    fontSize: 13,
  },
  statsTabContainer: {
    backgroundColor: '#141414',
  },
  statsCard: {
    backgroundColor: '#1F1F1F',
    borderWidth: 1,
    borderColor: '#2D2D2D',
    borderRadius: 16,
    padding: 20,
  },
  statRowItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#2D2D2D',
  },
  statLabel: {
    color: '#888888',
    fontSize: 14,
    fontWeight: '600',
  },
  statVal: {
    color: '#F5F5F5',
    fontSize: 14,
    fontWeight: 'bold',
  },
  premiumRatingItem: {
    backgroundColor: '#D4AF37',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginTop: 16,
    borderBottomWidth: 0,
  },
  matchCard: {
    backgroundColor: '#1F1F1F',
    borderWidth: 1,
    borderColor: '#2D2D2D',
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  matchMain: {
    flex: 1,
    paddingRight: 12,
  },
  matchTeams: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#F5F5F5',
    marginBottom: 6,
  },
  matchTourneyName: {
    fontSize: 12,
    color: '#888888',
    marginBottom: 8,
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
    fontSize: 11,
    fontWeight: '900',
    color: '#D4AF37',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1A1A1A',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: '#2D2D2D',
    maxHeight: '88%',
    paddingTop: 12,
    paddingHorizontal: 24,
    paddingBottom: 32,
  },
  modalDragHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#3D3D3D',
    alignSelf: 'center',
    marginBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2D2D2D',
    marginBottom: 4,
  },
  modalHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  modalIconBadge: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(212, 175, 55, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#F5F5F5',
    letterSpacing: 0.3,
  },
  modalSubtitle: {
    fontSize: 12,
    color: '#888',
    marginTop: 1,
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#2A2A2A',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#3D3D3D',
  },
  modalCloseBtnText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#888',
    lineHeight: 16,
  },
  modalTeamsSubTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#D4AF37',
    marginVertical: 14,
    textAlign: 'center',
  },
  modalTabBar: {
    flexDirection: 'row',
    backgroundColor: '#252525',
    borderRadius: 12,
    padding: 4,
    marginVertical: 12,
    gap: 4,
  },
  modalTabButton: {
    flex: 1,
    paddingVertical: 9,
    alignItems: 'center',
    borderRadius: 9,
  },
  modalTabButtonActive: {
    backgroundColor: '#D4AF37',
    shadowColor: '#D4AF37',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  modalTabButtonText: {
    color: '#666',
    fontSize: 12,
    fontWeight: 'bold',
  },
  modalTabButtonTextActive: {
    color: '#141414',
  },
  summaryContainer: {
    padding: 6,
  },
  summaryStatusBox: {
    borderWidth: 1,
    borderColor: '#2D2D2D',
    backgroundColor: '#2A2A2A',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    alignItems: 'center',
  },
  summaryStatusTitle: {
    fontSize: 11,
    color: '#888888',
    marginBottom: 6,
    fontWeight: '700',
  },
  summaryStatusVal: {
    fontSize: 22,
    fontWeight: '900',
    color: '#D4AF37',
  },
  summaryStatItem: {
    marginBottom: 18,
  },
  summaryLabel: {
    fontSize: 11,
    color: '#888888',
    fontWeight: 'bold',
    marginBottom: 6,
  },
  summaryVal: {
    fontSize: 15,
    color: '#F5F5F5',
    fontWeight: '600',
  },
  scorecardContainer: {
    padding: 6,
  },
  scorecardTeamTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#D4AF37',
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  wagonWheelContainer: {
    alignItems: 'center',
    padding: 10,
  },
  wagonTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#F5F5F5',
    marginBottom: 20,
  },
  wheelCircle: {
    width: 220,
    height: 220,
    borderRadius: 110,
    borderWidth: 2,
    borderColor: '#3D3D3D',
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#2A2A2A',
  },
  crease: {
    width: 40,
    height: 12,
    borderWidth: 1,
    borderColor: '#3D3D3D',
    backgroundColor: '#1F1F1F',
    position: 'absolute',
  },
  shotLine: {
    height: 2,
    position: 'absolute',
    left: 110,
    transformOrigin: 'left center',
  },
  wheelLabel: {
    position: 'absolute',
    fontSize: 10,
    fontWeight: 'bold',
    color: '#888888',
  },
  wagonLegend: {
    marginTop: 24,
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  legendText: {
    fontSize: 12,
    color: '#888888',
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
});

export default PlayerDashboard;
