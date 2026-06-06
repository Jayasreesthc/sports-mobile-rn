import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
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

  const startScoring = (match) => {
    setActiveMatch(match);
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
        <Text style={styles.sectionTitle}>APPLY FOR TOURNAMENT SCORING DUTY</Text>
        <View style={styles.formCard}>
          {message ? <Text style={styles.successText}>{message}</Text> : null}
          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          {/* Tournament Selection Dropdown */}
          <Text style={styles.label}>Select Tournament</Text>
          <TouchableOpacity
            style={styles.dropdown}
            onPress={() => setShowTourneys(!showTourneys)}
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
            placeholderTextColor="#888"
            value={experience}
            onChangeText={setExperience}
          />

          {/* Contact number */}
          <Text style={styles.label}>Contact Phone Number</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. +1 555-0199"
            placeholderTextColor="#888"
            keyboardType="phone-pad"
            value={contactPhone}
            onChangeText={setContactPhone}
          />

          {/* Brief comments */}
          <Text style={styles.label}>Additional Qualifications / Remarks</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Certified state division scorer"
            placeholderTextColor="#888"
            value={comments}
            onChangeText={setComments}
          />

          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.applyBtn, { marginTop: 16, alignItems: 'center' }, applying && { opacity: 0.5 }]}
            onPress={handleApplyScorer}
            disabled={applying}
          >
            {applying ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.applyBtnText}>SUBMIT APPLICATION FORM</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Assigned Matches scoring duties */}
      <View style={[styles.section, { marginBottom: 40 }]}>
        <Text style={styles.sectionTitle}>MY SCORING MATCHES</Text>
        {assigned.length === 0 ? (
          <Text style={styles.emptyText}>No active matches assigned to score.</Text>
        ) : (
          assigned.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.matchCard}
              onPress={() => startScoring(item)}
            >
              <View style={styles.matchInfo}>
                <Text style={styles.matchTitle}>
                  {item.team_a_name} vs {item.team_b_name}
                </Text>
                <Text style={styles.tournamentName}>{item.tournament_name}</Text>
                <Text style={styles.scoreSummary}>{item.score_summary || 'Not started'}</Text>
              </View>
              <View style={styles.statusBadge}>
                <Text style={styles.statusText}>{item.status?.toUpperCase()}</Text>
              </View>
            </TouchableOpacity>
          ))
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  countContainer: {
    borderWidth: 1,
    borderColor: '#000000',
    padding: 16,
    marginBottom: 16,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  countTitle: {
    fontSize: 12,
    color: '#666666',
    fontWeight: 'bold',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  countValue: {
    fontSize: 28,
    fontWeight: '900',
    color: '#000000',
  },
  section: {
    marginTop: 16,
  },
  sectionTitle: {
    fontWeight: '900',
    fontSize: 14,
    color: '#000000',
    marginBottom: 12,
    letterSpacing: 1,
  },
  emptyText: {
    color: '#666666',
    fontSize: 13,
    paddingVertical: 8,
  },
  tourneyApplyCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#000000',
    borderRadius: 0,
    padding: 14,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tourneyName: {
    color: '#000000',
    fontSize: 14,
    fontWeight: 'bold',
  },
  applyBtn: {
    backgroundColor: '#000000',
    borderRadius: 0,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  applyBtnText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 11,
  },
  matchCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#000000',
    borderRadius: 0,
    padding: 16,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  matchInfo: {
    flex: 1,
    paddingRight: 12,
  },
  matchTitle: {
    color: '#000000',
    fontSize: 15,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  tournamentName: {
    color: '#666666',
    fontSize: 12,
    marginBottom: 6,
  },
  scoreSummary: {
    color: '#000000',
    fontSize: 12,
    fontFamily: 'monospace',
    borderWidth: 1,
    borderColor: '#EEEEEE',
    padding: 6,
    backgroundColor: '#FAFAFA',
  },
  statusBadge: {
    borderWidth: 1,
    borderColor: '#000000',
    borderRadius: 0,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  statusText: {
    color: '#000000',
    fontWeight: 'bold',
    fontSize: 10,
  },
  scoringHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  backButton: {
    backgroundColor: '#000000',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 0,
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  matchHeaderTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#000000',
    flex: 1,
  },
  scoringCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#000000',
    borderRadius: 0,
    padding: 16,
  },
  teamToggleRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  teamToggleBtn: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CCCCCC',
    borderRadius: 0,
    paddingVertical: 10,
    alignItems: 'center',
  },
  teamToggleBtnActive: {
    borderColor: '#000000',
    backgroundColor: '#000000',
  },
  teamToggleText: {
    color: '#000000',
    fontWeight: 'bold',
    fontSize: 13,
  },
  teamToggleTextActive: {
    color: '#FFFFFF',
  },
  scoreDisplay: {
    alignItems: 'center',
    marginVertical: 24,
    borderWidth: 1,
    borderColor: '#000000',
    padding: 20,
    borderRadius: 0,
    backgroundColor: '#FAFAFA',
  },
  scoreRuns: {
    color: '#000000',
    fontSize: 48,
    fontWeight: '900',
  },
  scoreOvers: {
    color: '#666666',
    fontSize: 14,
    marginTop: 6,
  },
  buttonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  scoreBtn: {
    flex: 1,
    minWidth: '22%',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#000000',
    borderRadius: 0,
    paddingVertical: 12,
    alignItems: 'center',
  },
  wicketBtn: {
    backgroundColor: '#000000',
  },
  scoreBtnText: {
    color: '#000000',
    fontSize: 12,
    fontWeight: 'bold',
  },
  syncBtn: {
    backgroundColor: '#000000',
    borderRadius: 0,
    paddingVertical: 12,
    alignItems: 'center',
    marginVertical: 8,
  },
  syncBtnText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 13,
  },
  completeMatchBtn: {
    borderWidth: 1,
    borderColor: '#000000',
    borderRadius: 0,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  completeMatchBtnText: {
    color: '#000000',
    fontWeight: 'bold',
    fontSize: 13,
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
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  winnerOptionRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  winnerBtn: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CCCCCC',
    borderRadius: 0,
    paddingVertical: 10,
    alignItems: 'center',
  },
  winnerBtnActive: {
    borderColor: '#000000',
    backgroundColor: '#000000',
  },
  winnerBtnText: {
    color: '#000000',
    fontWeight: 'bold',
    fontSize: 12,
  },
  winnerBtnTextActive: {
    color: '#FFFFFF',
  },
  submitCompleteBtn: {
    backgroundColor: '#000000',
    borderRadius: 0,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 20,
  },
  submitCompleteBtnText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 13,
  },
  successText: {
    color: '#000000',
    fontWeight: 'bold',
    fontSize: 12,
    marginBottom: 8,
  },
  errorText: {
    color: '#FF0000',
    fontSize: 12,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#000000',
    borderRadius: 0,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#000000',
    marginBottom: 12,
    backgroundColor: '#FFFFFF',
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
    marginBottom: 12,
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
    marginTop: -10,
    marginBottom: 12,
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
});

export default ScorerDashboard;
