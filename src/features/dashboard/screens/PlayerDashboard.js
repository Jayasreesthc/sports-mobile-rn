import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Modal,
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
}) => {
  const matches = data.matches_played ?? 0;
  const wins = data.matches_won ?? 0;
  const losses = data.matches_lost ?? 0;
  const teams = data.team_names ?? [];

  // Tab States
  const [activeTab, setActiveTab] = useState('Overview'); // 'Overview', 'Statistics', 'Matches'

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

  // Match Details Modal
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [matchDetailsTab, setMatchDetailsTab] = useState('Summary'); // 'Summary', 'Scorecard', 'WagonWheel'
  const [matchesList, setMatchesList] = useState([]);
  const [loadingMatches, setLoadingMatches] = useState(false);

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

  return (
    <View style={styles.container}>
      {/* Black & White Sub-header Tabs */}
      <View style={styles.tabBar}>
        {['Overview', 'Statistics', 'Matches'].map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tabButton, activeTab === tab && styles.tabButtonActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabButtonText, activeTab === tab && styles.tabButtonTextActive]}>
              {tab.toUpperCase()}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView nestedScrollEnabled={true} style={styles.scrollContainer}>
        {activeTab === 'Overview' && (
          <View>
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

            {/* Register Team Form */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>REGISTER TEAM & SQUAD</Text>
              <View style={styles.formCard}>
                {message ? <Text style={styles.successText}>{message}</Text> : null}
                {error ? <Text style={styles.errorText}>{error}</Text> : null}

                {/* Tournament Selection */}
                <Text style={styles.label}>Choose Tournament</Text>
                <TouchableOpacity
                  style={styles.dropdown}
                  onPress={() => setShowTourneys(!showTourneys)}
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
                  placeholderTextColor="#888"
                  value={teamName}
                  onChangeText={setTeamName}
                />

                {/* Coach Selection Auto-complete */}
                <Text style={styles.label}>Search & Choose Coach</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Type to search coach (e.g. John)"
                  placeholderTextColor="#888"
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
                  placeholderTextColor="#888"
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
                              isSelected && { backgroundColor: '#F0F0F0' },
                            ]}
                            onPress={() => {
                              togglePlayerSelect(p.id);
                            }}
                          >
                            <Text style={styles.suggestionText}>
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
                        >
                          <Text style={styles.chipText}>
                            {p ? p.full_name : `ID: ${id}`} ✕
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}

                {/* Submit Button */}
                <TouchableOpacity
                  style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
                  onPress={handleRegisterTeam}
                  disabled={submitting}
                >
                  {submitting ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.submitButtonText}>REGISTER SQUAD</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>

            {/* My Registered Squads */}
            <View style={[styles.section, { marginBottom: 30 }]}>
              <Text style={styles.sectionTitle}>MY SQUADS</Text>
              {teams.length === 0 ? (
                <Text style={styles.emptyText}>Not registered in any squads yet.</Text>
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
            <Text style={styles.sectionTitle}>PLAYER INDIVIDUAL STATS</Text>
            <View style={styles.statsCard}>
              <View style={styles.statRowItem}>
                <Text style={styles.statLabel}>Matches Played</Text>
                <Text style={styles.statVal}>{matches}</Text>
              </View>
              <View style={styles.statRowItem}>
                <Text style={styles.statLabel}>Total Runs Scored</Text>
                <Text style={styles.statVal}>{data.runs_scored ?? 0}</Text>
              </View>
              <View style={styles.statRowItem}>
                <Text style={styles.statLabel}>Balls Faced</Text>
                <Text style={styles.statVal}>{data.balls_faced ?? 0}</Text>
              </View>
              <View style={styles.statRowItem}>
                <Text style={styles.statLabel}>Batting Strike Rate</Text>
                <Text style={styles.statVal}>
                  {data.balls_faced > 0
                    ? ((data.runs_scored / data.balls_faced) * 100).toFixed(2)
                    : '0.00'}
                </Text>
              </View>
              <View style={styles.statRowItem}>
                <Text style={styles.statLabel}>Wickets Taken</Text>
                <Text style={styles.statVal}>{data.wickets_taken ?? 0}</Text>
              </View>
              <View style={styles.statRowItem}>
                <Text style={styles.statLabel}>Runs Conceded</Text>
                <Text style={styles.statVal}>{data.runs_conceded ?? 0}</Text>
              </View>
              <View style={styles.statRowItem}>
                <Text style={styles.statLabel}>Performance Rating Index</Text>
                <Text style={styles.statVal}>{(data.performance_score ?? 0.0).toFixed(2)}</Text>
              </View>
            </View>
          </View>
        )}

        {activeTab === 'Matches' && (
          <View>
            <Text style={styles.sectionTitle}>TOURNAMENT MATCHES</Text>
            {loadingMatches ? (
              <ActivityIndicator color="#000" style={{ marginVertical: 30 }} />
            ) : matchesList.length === 0 ? (
              <Text style={styles.emptyText}>No tournament matches scheduled yet.</Text>
            ) : (
              matchesList.map((match) => (
                <TouchableOpacity
                  key={match.id}
                  style={styles.matchCard}
                  onPress={() => {
                    setSelectedMatch(match);
                    setMatchDetailsTab('Summary');
                  }}
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
                  <View style={styles.matchStatusBadge}>
                    <Text style={styles.matchStatusText}>{match.status?.toUpperCase()}</Text>
                  </View>
                </TouchableOpacity>
              ))
            )}
          </View>
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
                  {['Summary', 'Scorecard', 'Wagon Wheel'].map((tab) => (
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
                        <Text style={styles.summaryLabel}>Score Summary</Text>
                        <Text style={styles.summaryVal}>
                          {selectedMatch.score_summary || 'No score recorded yet.'}
                        </Text>
                      </View>

                      <View style={styles.summaryStatItem}>
                        <Text style={styles.summaryLabel}>Tournament</Text>
                        <Text style={styles.summaryVal}>{selectedMatch.tournamentName}</Text>
                      </View>
                    </View>
                  )}

                  {matchDetailsTab === 'Scorecard' && (
                    <View style={styles.scorecardContainer}>
                      <Text style={styles.scorecardTeamTitle}>{selectedMatch.team_a_name} Innings</Text>
                      <View style={styles.tableHeader}>
                        <Text style={[styles.colName, styles.bold]}>Batsman</Text>
                        <Text style={[styles.colVal, styles.bold]}>R</Text>
                        <Text style={[styles.colVal, styles.bold]}>B</Text>
                        <Text style={[styles.colVal, styles.bold]}>4s</Text>
                        <Text style={[styles.colVal, styles.bold]}>6s</Text>
                      </View>
                      <View style={styles.tableRow}>
                        <Text style={styles.colName}>Asha (c)</Text>
                        <Text style={styles.colVal}>48</Text>
                        <Text style={styles.colVal}>32</Text>
                        <Text style={styles.colVal}>5</Text>
                        <Text style={styles.colVal}>2</Text>
                      </View>
                      <View style={styles.tableRow}>
                        <Text style={styles.colName}>Ashwin</Text>
                        <Text style={styles.colVal}>36</Text>
                        <Text style={styles.colVal}>24</Text>
                        <Text style={styles.colVal}>4</Text>
                        <Text style={styles.colVal}>1</Text>
                      </View>
                      <View style={styles.tableRow}>
                        <Text style={styles.colName}>Extras</Text>
                        <Text style={styles.colVal}>8</Text>
                        <Text style={styles.colVal}>-</Text>
                        <Text style={styles.colVal}>-</Text>
                        <Text style={styles.colVal}>-</Text>
                      </View>

                      <Text style={[styles.scorecardTeamTitle, { marginTop: 20 }]}>
                        {selectedMatch.team_b_name} Innings
                      </Text>
                      <View style={styles.tableHeader}>
                        <Text style={[styles.colName, styles.bold]}>Batsman</Text>
                        <Text style={[styles.colVal, styles.bold]}>R</Text>
                        <Text style={[styles.colVal, styles.bold]}>B</Text>
                        <Text style={[styles.colVal, styles.bold]}>4s</Text>
                        <Text style={[styles.colVal, styles.bold]}>6s</Text>
                      </View>
                      <View style={styles.tableRow}>
                        <Text style={styles.colName}>Sanjay</Text>
                        <Text style={styles.colVal}>14</Text>
                        <Text style={styles.colVal}>18</Text>
                        <Text style={styles.colVal}>1</Text>
                        <Text style={styles.colVal}>0</Text>
                      </View>
                      <View style={styles.tableRow}>
                        <Text style={styles.colName}>Rahul</Text>
                        <Text style={styles.colVal}>65</Text>
                        <Text style={styles.colVal}>41</Text>
                        <Text style={styles.colVal}>7</Text>
                        <Text style={styles.colVal}>3</Text>
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
                        <View style={[styles.shotLine, { transform: [{ rotate: '45deg' }], width: 100, backgroundColor: '#4CAF50' }]} />
                        <View style={[styles.shotLine, { transform: [{ rotate: '120deg' }], width: 90, backgroundColor: '#E53935' }]} />
                        <View style={[styles.shotLine, { transform: [{ rotate: '210deg' }], width: 110, backgroundColor: '#4CAF50' }]} />
                        <View style={[styles.shotLine, { transform: [{ rotate: '315deg' }], width: 80, backgroundColor: '#FFB300' }]} />
                        
                        <Text style={[styles.wheelLabel, { top: 10, left: 100 }]}>Off Side</Text>
                        <Text style={[styles.wheelLabel, { bottom: 10, left: 100 }]}>On Side</Text>
                        <Text style={[styles.wheelLabel, { top: 100, left: 10 }]}>Leg</Text>
                        <Text style={[styles.wheelLabel, { top: 100, right: 10 }]}>Off</Text>
                      </View>
                      <View style={styles.wagonLegend}>
                        <View style={styles.legendItem}>
                          <View style={[styles.legendDot, { backgroundColor: '#4CAF50' }]} />
                          <Text style={styles.legendText}>6 Runs (Sixes)</Text>
                        </View>
                        <View style={styles.legendItem}>
                          <View style={[styles.legendDot, { backgroundColor: '#FFB300' }]} />
                          <Text style={styles.legendText}>4 Runs (Boundaries)</Text>
                        </View>
                        <View style={styles.legendItem}>
                          <View style={[styles.legendDot, { backgroundColor: '#E53935' }]} />
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
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 2,
    borderBottomColor: '#000000',
    marginBottom: 16,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  tabButtonActive: {
    backgroundColor: '#000000',
  },
  tabButtonText: {
    color: '#000000',
    fontWeight: 'bold',
    fontSize: 12,
    letterSpacing: 0.5,
  },
  tabButtonTextActive: {
    color: '#FFFFFF',
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
    fontSize: 14,
    color: '#000000',
    marginBottom: 10,
    letterSpacing: 1,
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#000000',
    borderRadius: 0,
    padding: 16,
  },
  label: {
    color: '#000000',
    fontSize: 11,
    fontWeight: 'bold',
    marginTop: 12,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  input: {
    backgroundColor: '#FFFFFF',
    color: '#000000',
    borderRadius: 0,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#000000',
    marginBottom: 4,
  },
  dropdown: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 0,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#000000',
  },
  dropdownText: {
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
    borderColor: '#000000',
    borderRadius: 0,
    marginTop: 2,
    maxHeight: 150,
  },
  dropdownItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  dropdownItemText: {
    color: '#000000',
    fontSize: 14,
  },
  suggestionsContainer: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#000000',
    maxHeight: 150,
    marginTop: 2,
  },
  suggestionItem: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  suggestionText: {
    color: '#000000',
    fontSize: 13,
  },
  suggestionEmpty: {
    padding: 10,
    color: '#888888',
    fontSize: 13,
  },
  selectionLabel: {
    color: '#000000',
    fontWeight: 'bold',
    fontSize: 12,
    marginTop: 6,
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  chip: {
    backgroundColor: '#000000',
    borderRadius: 0,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  chipText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  emptyText: {
    color: '#666666',
    fontSize: 13,
    paddingVertical: 8,
  },
  teamCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#000000',
    padding: 16,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  teamIcon: {
    fontSize: 18,
    marginRight: 12,
  },
  teamName: {
    color: '#000000',
    fontSize: 15,
    fontWeight: 'bold',
  },
  submitButton: {
    backgroundColor: '#000000',
    borderRadius: 0,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 20,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  successText: {
    color: '#000000',
    fontWeight: 'bold',
    fontSize: 13,
    marginBottom: 10,
  },
  errorText: {
    color: '#FF0000',
    fontWeight: 'bold',
    fontSize: 13,
    marginBottom: 10,
  },
  statsTabContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 0,
  },
  statsCard: {
    borderWidth: 1,
    borderColor: '#000000',
    padding: 16,
  },
  statRowItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  statLabel: {
    color: '#666666',
    fontSize: 14,
  },
  statVal: {
    color: '#000000',
    fontSize: 14,
    fontWeight: 'bold',
  },
  matchCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#000000',
    padding: 16,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  matchMain: {
    flex: 1,
    paddingRight: 8,
  },
  matchTeams: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 4,
  },
  matchTourneyName: {
    fontSize: 12,
    color: '#666666',
    marginBottom: 6,
  },
  matchSummaryText: {
    fontSize: 12,
    color: '#000000',
    fontFamily: 'Courier',
  },
  matchStatusBadge: {
    borderWidth: 1,
    borderColor: '#000000',
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  matchStatusText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#000000',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderTopWidth: 2,
    borderTopColor: '#000000',
    maxHeight: '85%',
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#000000',
  },
  modalCloseBtn: {
    padding: 6,
  },
  modalCloseBtnText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000000',
  },
  modalTeamsSubTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000000',
    marginVertical: 10,
  },
  modalTabBar: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#000000',
    borderRadius: 0,
    overflow: 'hidden',
  },
  modalTabButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  modalTabButtonActive: {
    backgroundColor: '#000000',
  },
  modalTabButtonText: {
    color: '#000000',
    fontSize: 12,
    fontWeight: 'bold',
  },
  modalTabButtonTextActive: {
    color: '#FFFFFF',
  },
  summaryContainer: {
    padding: 10,
  },
  summaryStatusBox: {
    borderWidth: 1,
    borderColor: '#000000',
    padding: 16,
    marginBottom: 16,
    alignItems: 'center',
  },
  summaryStatusTitle: {
    fontSize: 12,
    color: '#666666',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  summaryStatusVal: {
    fontSize: 20,
    fontWeight: '900',
    color: '#000000',
  },
  summaryStatItem: {
    marginBottom: 14,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#666666',
    fontWeight: 'bold',
    marginBottom: 2,
    textTransform: 'uppercase',
  },
  summaryVal: {
    fontSize: 14,
    color: '#000000',
    fontWeight: '500',
  },
  scorecardContainer: {
    padding: 10,
  },
  scorecardTeamTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  tableHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#000000',
    paddingBottom: 6,
    marginBottom: 6,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  colName: {
    flex: 2,
    fontSize: 13,
    color: '#000000',
  },
  colVal: {
    flex: 1,
    fontSize: 13,
    color: '#000000',
    textAlign: 'center',
  },
  bold: {
    fontWeight: 'bold',
  },
  wagonWheelContainer: {
    alignItems: 'center',
    padding: 10,
  },
  wagonTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 16,
  },
  wheelCircle: {
    width: 220,
    height: 220,
    borderRadius: 110,
    borderWidth: 2,
    borderColor: '#000000',
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FAFAFA',
  },
  crease: {
    width: 40,
    height: 12,
    borderWidth: 1,
    borderColor: '#000000',
    backgroundColor: '#E0E0E0',
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
    marginTop: 20,
    width: '100%',
    gap: 8,
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
    color: '#333333',
  },
});

export default PlayerDashboard;
