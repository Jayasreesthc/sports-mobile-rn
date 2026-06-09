import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Modal,
} from 'react-native';
import ScoringScreen from './ScoringScreen';

const ScorerDashboard = ({
  data,
  notifications = [],
  tournaments = [],
  apiClient,
  onRefresh,
}) => {
  const assigned = data.assigned_matches ?? [];
  const totalScoredCount = data.total_scored_matches ?? 0;

  // Scorer States
  const [activeMatch, setActiveMatch] = useState(null);
  const [scoringTeam, setScoringTeam] = useState('team_a'); // 'team_a' or 'team_b'
  const [runs, setRuns] = useState(0);
  const [wickets, setWickets] = useState(0);
  const [overs, setOvers] = useState(0.0);
  const [balls, setBalls] = useState(0); // tracks balls in current over

  // Completed Match Details States
  const [selectedCompletedMatch, setSelectedCompletedMatch] = useState(null);
  const [matchDetailsTab, setMatchDetailsTab] = useState('Summary'); // 'Summary', 'Scorecard'

  // Applications States
  const [applying, setApplying] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const [selectedTourneyId, setSelectedTourneyId] = useState('');
  const [experience, setExperience] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [comments, setComments] = useState('');
  const [showTourneys, setShowTourneys] = useState(false);

  // Complete Match States
  const [showCompleteForm, setShowCompleteForm] = useState(false);
  const [winnerTeamId, setWinnerTeamId] = useState('');
  const [completing, setCompleting] = useState(false);

  const handleApplyScorer = async () => {
    if (!selectedTourneyId) {
      setError('Please choose a tournament.');
      return;
    }
    setApplying(true);
    setError('');
    setMessage('');
    try {
      const res = await apiClient.applyScorer(parseInt(selectedTourneyId));
      if (res && res.id) {
        setMessage('Application submitted successfully!');
        setSelectedTourneyId('');
        setExperience('');
        setContactPhone('');
        setComments('');
        if (onRefresh) onRefresh();
      } else {
        setError(res?.detail || 'Failed to submit application.');
      }
    } catch (e) {
      setError('Failed to connect to backend server.');
    } finally {
      setApplying(false);
    }
  };

  const startScoring = async (match) => {
    if (match.status === 'completed') {
      // Fetch detailed completed match first so we have the rosters & full details!
      try {
        const fullMatch = await apiClient.request(`${apiClient.constructor.baseUrl}/matches/${match.id}`);
        if (fullMatch && !fullMatch.detail) {
          setSelectedCompletedMatch(fullMatch);
        } else {
          setSelectedCompletedMatch(match);
        }
      } catch (e) {
        setSelectedCompletedMatch(match);
      }
      setMatchDetailsTab('Summary');
      return;
    }

    try {
      const fullMatch = await apiClient.request(`${apiClient.constructor.baseUrl}/matches/${match.id}`);
      if (fullMatch && !fullMatch.detail) {
        setActiveMatch(fullMatch);
      } else {
        setActiveMatch(match);
      }
    } catch (e) {
      setActiveMatch(match);
    }
    setRuns(0);
    setWickets(0);
    setOvers(0.0);
    setBalls(0);
  };

  const updateBall = (runsToAdd, isWicket = false, isExtra = false) => {
    setRuns((prev) => prev + runsToAdd);
    if (isWicket) {
      setWickets((prev) => Math.min(10, prev + 1));
    }
    if (!isExtra) {
      setBalls((prev) => {
        const nextBalls = prev + 1;
        if (nextBalls >= 6) {
          setOvers((currOvers) => {
            const completedOvers = Math.floor(currOvers) + 1;
            return completedOvers;
          });
          return 0;
        } else {
          setOvers((currOvers) => {
            const completedOvers = Math.floor(currOvers);
            return parseFloat(`${completedOvers}.${nextBalls}`);
          });
          return nextBalls;
        }
      });
    }
  };

  const handleSyncScore = async () => {
    if (!activeMatch) return;
    try {
      const res = await apiClient.updateLiveScore(
        activeMatch.id,
        scoringTeam,
        runs,
        wickets,
        overs
      );
      if (res && !res.detail) {
        alert('Live scoreboard broadcasted successfully!');
      } else {
        alert(res?.detail || 'Failed to broadcast score.');
      }
    } catch (e) {
      alert('Failed to connect to backend.');
    }
  };

  const handleCompleteMatch = async () => {
    if (!activeMatch || !winnerTeamId) {
      alert('Please select a winning team.');
      return;
    }
    setCompleting(true);
    try {
      // Complete match payload with empty performance metrics for now
      const res = await apiClient.completeMatch(
        activeMatch.id,
        parseInt(winnerTeamId),
        []
      );
      if (res && !res.detail) {
        alert('Match completed successfully!');
        setActiveMatch(null);
        setShowCompleteForm(false);
        if (onRefresh) onRefresh();
      } else {
        alert(res?.detail || 'Failed to complete match.');
      }
    } catch (e) {
      alert('Connection error.');
    } finally {
      setCompleting(false);
    }
  };

  if (activeMatch) {
    return (
      <ScoringScreen
        match={activeMatch}
        tournaments={tournaments}
        apiClient={apiClient}
        onBack={() => {
          setActiveMatch(null);
          if (onRefresh) onRefresh();
        }}
      />
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Total Scored Count Header Widget */}
      <View style={styles.countContainer}>
        <Text style={styles.countTitle}>Matches Scored</Text>
        <Text style={styles.countValue}>{totalScoredCount}</Text>
      </View>

      {/* Scorer applications apply section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Apply for Tournament Scoring Duty</Text>
        <View style={styles.formCard}>
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

          {/* Tournament Selection Dropdown */}
          <Text style={styles.label}>Select Tournament</Text>
          <TouchableOpacity
            style={styles.dropdown}
            onPress={() => setShowTourneys(!showTourneys)}
            activeOpacity={0.8}
          >
            <Text style={styles.dropdownText}>
              {selectedTourneyId
                ? tournaments.find((t) => t.id.toString() === selectedTourneyId)?.name || 'Select Tournament'
                : 'Select Tournament'}
            </Text>
            <Text style={styles.dropdownArrow}>{showTourneys ? '▲' : '▼'}</Text>
          </TouchableOpacity>
          {showTourneys && (
            <View style={styles.dropdownMenu}>
              {tournaments
                .filter((t) => t.is_approved && t.status !== 'completed')
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

          {/* Experience level input */}
          <Text style={styles.label}>Scoring Experience (Years / Bio)</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. 3 years local matches"
            placeholderTextColor="#666"
            value={experience}
            onChangeText={setExperience}
          />

          {/* Contact number */}
          <Text style={styles.label}>Contact Phone Number</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. +1 555-0199"
            placeholderTextColor="#666"
            keyboardType="phone-pad"
            value={contactPhone}
            onChangeText={setContactPhone}
          />

          {/* Brief comments */}
          <Text style={styles.label}>Additional Qualifications / Remarks</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Certified state division scorer"
            placeholderTextColor="#666"
            value={comments}
            onChangeText={setComments}
          />

          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.applyBtn, { marginTop: 16, alignItems: 'center' }, applying && { opacity: 0.5 }]}
            onPress={handleApplyScorer}
            disabled={applying}
            activeOpacity={0.9}
          >
            {applying ? (
              <ActivityIndicator color="#141414" />
            ) : (
              <Text style={styles.applyBtnText}>SUBMIT APPLICATION FORM</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Assigned Matches scoring duties */}
      <View style={[styles.section, { marginBottom: 40 }]}>
        <Text style={styles.sectionTitle}>My Scoring Matches</Text>
        {assigned.length === 0 ? (
          <View style={styles.emptyStateContainer}>
            <Text style={styles.emptyStateEmoji}>🏏</Text>
            <Text style={styles.emptyText}>No active matches assigned to score.</Text>
          </View>
        ) : (
          assigned.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.matchCard}
              activeOpacity={0.9}
              onPress={() => startScoring(item)}
            >
              <View style={styles.matchInfo}>
                <Text style={styles.matchTitle}>
                  {item.team_a_name} vs {item.team_b_name}
                </Text>
                <Text style={styles.tournamentNameText}>{item.tournament_name}</Text>
                <Text style={styles.scoreSummary}>{item.score_summary || 'Not started'}</Text>
              </View>
              <View style={styles.statusBadge}>
                <Text style={styles.statusText}>{item.status?.toUpperCase()}</Text>
              </View>
            </TouchableOpacity>
          ))
        )}
      </View>

      {/* Match Details Modal (Summary, Scorecard) */}
      <Modal
        visible={selectedCompletedMatch !== null}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setSelectedCompletedMatch(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Match Analytics</Text>
              <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setSelectedCompletedMatch(null)}>
                <Text style={styles.modalCloseBtnText}>✕</Text>
              </TouchableOpacity>
            </View>

            {selectedCompletedMatch && (
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTeamsSubTitle}>
                  {selectedCompletedMatch.team_a_name} vs {selectedCompletedMatch.team_b_name}
                </Text>

                {/* Modal Sub-Tabs */}
                <View style={styles.modalTabBar}>
                  {['Summary', 'Scorecard'].map((tab) => (
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
                          {selectedCompletedMatch.status?.toUpperCase() || 'COMPLETED'}
                        </Text>
                      </View>
                      
                      <View style={styles.summaryStatItem}>
                        <Text style={styles.summaryLabel}>Score Board</Text>
                        <View style={{ marginTop: 8 }}>
                          <Text style={styles.summaryVal}>
                            🏏 {selectedCompletedMatch.team_a_name || selectedCompletedMatch.team_a?.name || 'Team A'}: {selectedCompletedMatch.team_a_runs ?? 0} / {selectedCompletedMatch.team_a_wickets ?? 0} ({selectedCompletedMatch.team_a_overs ?? 0.0} ov)
                          </Text>
                          <Text style={styles.summaryVal}>
                            🏏 {selectedCompletedMatch.team_b_name || selectedCompletedMatch.team_b?.name || 'Team B'}: {selectedCompletedMatch.team_b_runs ?? 0} / {selectedCompletedMatch.team_b_wickets ?? 0} ({selectedCompletedMatch.team_b_overs ?? 0.0} ov)
                          </Text>
                        </View>
                      </View>

                      {selectedCompletedMatch.winner && (
                        <View style={styles.summaryStatItem}>
                          <Text style={styles.summaryLabel}>Winner</Text>
                          <Text style={[styles.summaryVal, { fontWeight: 'bold', color: '#D4AF37' }]}>
                            🏆 {selectedCompletedMatch.winner.name || selectedCompletedMatch.winner_name || 'Won'}
                          </Text>
                        </View>
                      )}

                      <View style={styles.summaryStatItem}>
                        <Text style={styles.summaryLabel}>Tournament</Text>
                        <Text style={styles.summaryVal}>{selectedCompletedMatch.tournamentName || selectedCompletedMatch.tournament?.name}</Text>
                      </View>
                    </View>
                  )}

                  {matchDetailsTab === 'Scorecard' && (
                    <View style={styles.scorecardContainer}>
                      <Text style={styles.scorecardTeamTitle}>{selectedCompletedMatch.team_a?.name || selectedCompletedMatch.team_a_name || 'Team A'} Roster</Text>
                      <View style={{ marginBottom: 16, paddingLeft: 4 }}>
                        {(selectedCompletedMatch.team_a?.players || []).map((p, idx) => {
                          const pId = p.player_id || p.player?.id;
                          const perf = (selectedCompletedMatch.performances || []).find(pf => String(pf.player_id) === String(pId));
                          const runs = perf?.runs_scored ?? p.runs_scored ?? p.performance?.runs_scored ?? 0;
                          const balls = perf?.balls_faced ?? p.balls_faced ?? p.performance?.balls_faced ?? 0;
                          const wickets = perf?.wickets_taken ?? p.wickets_taken ?? p.performance?.wickets_taken ?? 0;
                          const conceded = perf?.runs_conceded ?? p.runs_conceded ?? p.performance?.runs_conceded ?? 0;
                          return (
                            <View key={idx} style={{ marginVertical: 6 }}>
                              <Text style={{ fontSize: 14, color: '#F5F5F5' }}>
                                👤 {p.player?.full_name || p.player?.email || 'Unknown Player'}
                              </Text>
                              <Text style={{ fontSize: 11, color: '#D4AF37', marginLeft: 20, marginTop: 2 }}>
                                Batting: {runs} runs ({balls}b) • Bowling: {wickets} wkt ({conceded}r)
                              </Text>
                            </View>
                          );
                        })}
                        {(!selectedCompletedMatch.team_a?.players || selectedCompletedMatch.team_a.players.length === 0) && (
                          <Text style={{ fontSize: 13, color: '#888', fontStyle: 'italic' }}>No registered players.</Text>
                        )}
                      </View>

                      <Text style={styles.scorecardTeamTitle}>{selectedCompletedMatch.team_b?.name || selectedCompletedMatch.team_b_name || 'Team B'} Roster</Text>
                      <View style={{ paddingLeft: 4 }}>
                        {(selectedCompletedMatch.team_b?.players || []).map((p, idx) => {
                          const pId = p.player_id || p.player?.id;
                          const perf = (selectedCompletedMatch.performances || []).find(pf => String(pf.player_id) === String(pId));
                          const runs = perf?.runs_scored ?? p.runs_scored ?? p.performance?.runs_scored ?? 0;
                          const balls = perf?.balls_faced ?? p.balls_faced ?? p.performance?.balls_faced ?? 0;
                          const wickets = perf?.wickets_taken ?? p.wickets_taken ?? p.performance?.wickets_taken ?? 0;
                          const conceded = perf?.runs_conceded ?? p.runs_conceded ?? p.performance?.runs_conceded ?? 0;
                          return (
                            <View key={idx} style={{ marginVertical: 6 }}>
                              <Text style={{ fontSize: 14, color: '#F5F5F5' }}>
                                👤 {p.player?.full_name || p.player?.email || 'Unknown Player'}
                              </Text>
                              <Text style={{ fontSize: 11, color: '#D4AF37', marginLeft: 20, marginTop: 2 }}>
                                Batting: {runs} runs ({balls}b) • Bowling: {wickets} wkt ({conceded}r)
                              </Text>
                            </View>
                          );
                        })}
                        {(!selectedCompletedMatch.team_b?.players || selectedCompletedMatch.team_b.players.length === 0) && (
                          <Text style={{ fontSize: 13, color: '#888', fontStyle: 'italic' }}>No registered players.</Text>
                        )}
                      </View>
                    </View>
                  )}
                </ScrollView>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#141414',
    paddingHorizontal: 16,
  },
  countContainer: {
    backgroundColor: '#1F1F1F',
    borderWidth: 1,
    borderColor: '#2D2D2D',
    borderRadius: 16,
    padding: 20,
    marginTop: 16,
    marginBottom: 20,
    alignItems: 'center',
  },
  countTitle: {
    fontSize: 12,
    color: '#888888',
    fontWeight: 'bold',
    marginBottom: 6,
    letterSpacing: 1,
  },
  countValue: {
    fontSize: 32,
    fontWeight: '900',
    color: '#D4AF37',
  },
  section: {
    marginTop: 16,
  },
  sectionTitle: {
    fontWeight: '900',
    fontSize: 13,
    color: '#D4AF37',
    marginBottom: 12,
    letterSpacing: 1.5,
  },
  emptyText: {
    color: '#888888',
    fontSize: 13,
    paddingVertical: 8,
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
    fontWeight: 'bold',
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
  applyBtn: {
    backgroundColor: '#D4AF37',
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  applyBtnText: {
    color: '#141414',
    fontWeight: '900',
    fontSize: 13,
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
  matchInfo: {
    flex: 1,
    paddingRight: 12,
  },
  matchTitle: {
    color: '#F5F5F5',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  tournamentNameText: {
    color: '#888888',
    fontSize: 12,
    marginBottom: 8,
  },
  scoreSummary: {
    color: '#D4AF37',
    fontSize: 13,
    fontWeight: '600',
    padding: 6,
  },
  statusBadge: {
    borderWidth: 1,
    borderColor: '#D4AF37',
    borderRadius: 8,
    paddingVertical: 4,
    paddingHorizontal: 10,
    backgroundColor: 'rgba(212, 175, 55, 0.05)',
  },
  statusText: {
    color: '#D4AF37',
    fontWeight: 'bold',
    fontSize: 11,
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

export default ScorerDashboard;

