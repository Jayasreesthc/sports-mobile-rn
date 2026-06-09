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

const SponsorDashboard = ({
  data,
  user = {},
  notifications = [],
  tournaments = [],
  apiClient,
  onRefresh,
  activeTab: parentActiveTab,
}) => {
  const total = data.total_sponsored ?? 0.0;
  const initialSponsorships = data.sponsorships ?? [];

  // Pledges state
  const [pledgesList, setPledgesList] = useState([]);
  const [filterStatus, setFilterStatus] = useState('ALL'); // 'ALL', 'PENDING', 'APPROVED', 'ACTIVE'

  useEffect(() => {
    if (initialSponsorships.length > 0) {
      const enhanced = initialSponsorships.map((item, idx) => {
        const statuses = ['active', 'approved', 'under review', 'pledged'];
        const currentStatus = item.status || statuses[idx % statuses.length];
        
        // Mocking some audience metrics based on amount
        const amountNum = item.amount ?? 500;
        return {
          ...item,
          status: currentStatus,
          date: item.date || `2026-06-0${idx + 1}`,
          impressions: Math.floor(amountNum * 15.5),
          clicks: Math.floor(amountNum * 0.62),
          teamsCount: 8 + (idx % 3) * 2,
          matchesPlayed: 14 + (idx % 2) * 5,
          viewers: Math.floor(amountNum * 1.8),
        };
      });
      setPledgesList(enhanced);
    } else {
      // Create some initial simulation entries if empty
      const demo = [
        {
          id: 101,
          tournament_name: 'Summer Cricket Bash',
          tournament_status: 'ongoing',
          status: 'active',
          amount: 2500,
          date: '2026-06-01',
          impressions: 38750,
          clicks: 1550,
          teamsCount: 10,
          matchesPlayed: 18,
          viewers: 4500,
        },
        {
          id: 102,
          tournament_name: 'District T20 Cup',
          tournament_status: 'upcoming',
          status: 'approved',
          amount: 1500,
          date: '2026-06-04',
          impressions: 23250,
          clicks: 930,
          teamsCount: 8,
          matchesPlayed: 0,
          viewers: 2700,
        }
      ];
      setPledgesList(demo);
    }
  }, [data]);

  // Active Tab
  const [localTab, setLocalTab] = useState('Sponsorships'); // 'Sponsorships', 'Matches'
  const activeTab = parentActiveTab || localTab;
  const setActiveTab = setLocalTab;

  const slideAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const prevTabRef = useRef(activeTab);

  useEffect(() => {
    const tabs = ['Sponsorships', 'Matches'];
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

  // Form States
  const [selectedTourneyId, setSelectedTourneyId] = useState('');
  const [amount, setAmount] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [showTourneys, setShowTourneys] = useState(false);

  // Tournament Matches List States
  const [matchesList, setMatchesList] = useState([]);
  const [loadingMatches, setLoadingMatches] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [matchDetailsTab, setMatchDetailsTab] = useState('Summary'); // 'Summary', 'Scorecard'
  const [loadingScorecard, setLoadingScorecard] = useState(false);

  // Spring animations
  const btnScale = useRef(new Animated.Value(1)).current;
  const badgePulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(badgePulse, {
          toValue: 1.12,
          duration: 950,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(badgePulse, {
          toValue: 1,
          duration: 950,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    pulseLoop.start();
    return () => pulseLoop.stop();
  }, []);

  const handlePressIn = () => {
    Animated.spring(btnScale, {
      toValue: 0.95,
      tension: 160,
      friction: 7,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(btnScale, {
      toValue: 1,
      tension: 160,
      friction: 7,
      useNativeDriver: true,
    }).start();
  };

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
    fetchMatches();
  }, [tournaments]);

  const handlePledge = async () => {
    if (!selectedTourneyId || !amount) {
      setError('Please choose a tournament and enter amount.');
      return;
    }

    setSubmitting(true);
    setError('');
    setMessage('');
    try {
      const tourneyIdInt = parseInt(selectedTourneyId);
      const amountFloat = parseFloat(amount);
      const res = await apiClient.sponsorTournament(tourneyIdInt, amountFloat);

      if (res && res.id) {
        setMessage(`Pledge of ₹${amount} submitted for approval!`);
        
        // Append local simulated entry so UI updates immediately
        const targetTourney = tournaments.find(t => t.id === tourneyIdInt);
        const newLocalPledge = {
          id: res.id,
          tournament_name: targetTourney ? targetTourney.name : 'Sponsored Tournament',
          tournament_status: 'upcoming',
          status: 'pledged',
          amount: amountFloat,
          date: new Date().toISOString().split('T')[0],
          impressions: Math.floor(amountFloat * 15.5),
          clicks: Math.floor(amountFloat * 0.62),
          teamsCount: 8,
          matchesPlayed: 0,
          viewers: Math.floor(amountFloat * 1.8),
        };
        setPledgesList([newLocalPledge, ...pledgesList]);
        setAmount('');
        setSelectedTourneyId('');
        if (onRefresh) onRefresh();
      } else {
        setError(res?.detail || 'Failed to submit pledge.');
      }
    } catch (e) {
      setError('Could not connect to backend server.');
    } finally {
      setSubmitting(false);
    }
  };

  const getSelectedTourneyLabel = () => {
    const tourney = tournaments.find((t) => t.id.toString() === selectedTourneyId);
    return tourney ? tourney.name : 'Select Tournament';
  };



  // Budget calculations
  const totalBudget = 50000;
  const pledgedTotal = pledgesList.filter(p => ['pledged', 'under review', 'pending'].includes(p.status?.toLowerCase())).reduce((sum, item) => sum + (item.amount ?? 0), 0);
  const approvedTotal = pledgesList.filter(p => p.status?.toLowerCase() === 'approved').reduce((sum, item) => sum + (item.amount ?? 0), 0);
  const spentTotal = pledgesList.filter(p => p.status?.toLowerCase() === 'active').reduce((sum, item) => sum + (item.amount ?? 0), 0);
  const remainingBudget = totalBudget - pledgedTotal - approvedTotal - spentTotal;

  // Get active or approved sponsored tournaments
  const getSponsoredTourneys = () => {
    const sponsoredNames = pledgesList
      .filter(p => ['active', 'approved'].includes(p.status?.toLowerCase()))
      .map(p => p.tournament_name);
    return tournaments.filter(t => sponsoredNames.includes(t.name));
  };

  // Calculate standings from match results for a tournament
  const getStandingsForTournament = (tournament) => {
    if (!tournament || !tournament.teams) return [];
    
    const stats = tournament.teams.map(team => ({
      id: team.id,
      name: team.name,
      played: 0,
      won: 0,
      lost: 0,
      points: 0,
      status: team.status,
    }));
    
    // Filter completed matches for this tournament
    const completedMatches = matchesList.filter(m => 
      m.tournament_id === tournament.id && m.status?.toLowerCase() === 'completed'
    );
    
    completedMatches.forEach(m => {
      const teamA = stats.find(s => s.id === m.team_a_id);
      const teamB = stats.find(s => s.id === m.team_b_id);
      
      if (teamA && teamB) {
        teamA.played += 1;
        teamB.played += 1;
        
        if (m.winner_id === m.team_a_id) {
          teamA.won += 1;
          teamA.points += 2;
          teamB.lost += 1;
        } else if (m.winner_id === m.team_b_id) {
          teamB.won += 1;
          teamB.points += 2;
          teamA.lost += 1;
        }
      }
    });
    
    return stats.sort((a, b) => b.points - a.points || b.won - a.won);
  };

  // Fetch top players (MVPs) in the sponsored tournaments
  const getTopMvps = () => {
    const sponsored = getSponsoredTourneys();
    const allPlayers = [];
    
    sponsored.forEach(t => {
      t.teams.forEach(team => {
        team.players.forEach(p => {
          allPlayers.push({
            id: p.player_id,
            name: p.player?.full_name || 'Unknown Player',
            teamName: team.name,
            runs: p.runs_scored ?? 0,
            wickets: p.wickets_taken ?? 0,
            performance: p.performance_score ?? 0.0,
          });
        });
      });
    });
    
    return allPlayers.sort((a, b) => b.performance - a.performance).slice(0, 5);
  };

  // Filtered pledges list
  const getFilteredPledges = () => {
    if (filterStatus === 'ALL') return pledgesList;
    if (filterStatus === 'PENDING') return pledgesList.filter(p => ['pledged', 'under review', 'pending'].includes(p.status?.toLowerCase()));
    return pledgesList.filter(p => p.status?.toLowerCase() === filterStatus.toLowerCase());
  };

  const renderStatusTracker = (status) => {
    const steps = ['pledged', 'under review', 'approved', 'active'];
    let currentIdx = steps.indexOf(status?.toLowerCase());
    if (currentIdx === -1) {
      if (status?.toLowerCase() === 'pending') currentIdx = 0;
      else currentIdx = 1;
    }

    return (
      <View style={styles.trackerContainer}>
        {steps.map((step, idx) => {
          const isCompleted = idx <= currentIdx;
          const isLast = idx === steps.length - 1;
          return (
            <React.Fragment key={step}>
              <View style={styles.trackerStep}>
                <View style={[styles.stepDot, isCompleted && styles.stepDotActive]}>
                  {isCompleted && <Text style={styles.stepDotCheck}>✓</Text>}
                </View>
                <Text style={[styles.stepLabel, isCompleted && styles.stepLabelActive]}>
                  {step.replace('_', ' ').toUpperCase()}
                </Text>
              </View>
              {!isLast && <View style={[styles.stepLine, idx < currentIdx && styles.stepLineActive]} />}
            </React.Fragment>
          );
        })}
      </View>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#141414' }}>
      {/* Dashboard Sub-Tabs */}
      {!parentActiveTab && (
        <View style={styles.tabBar}>
          {['Sponsorships', 'Matches'].map((tab) => (
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

      <ScrollView style={styles.container} nestedScrollEnabled={true} contentContainerStyle={{ paddingBottom: 40 }}>
        {activeTab === 'Sponsorships' && (
          <View>


            {/* Budget overview breakdown replaced with Sponsor Profile & Events count */}
            <View style={styles.budgetCard}>
              <Text style={styles.budgetCardTitle}>SPONSOR PROFILE DETAILS</Text>
              
              <View style={[styles.budgetGrid, { paddingVertical: 10 }]}>
                <View style={[styles.budgetCol, { flex: 1.5, alignItems: 'flex-start' }]}>
                  <Text style={[styles.budgetVal, { color: '#FFF', fontSize: 18, fontFamily: 'Poppins-Bold' }]}>
                    {user.full_name || user.email?.split('@')[0] || 'Sponsor'}
                  </Text>
                  <Text style={styles.budgetLabel}>Sponsor Name</Text>
                </View>
                <View style={[styles.budgetCol, { flex: 1, alignItems: 'flex-end' }]}>
                  <Text style={[styles.budgetVal, { color: '#D4AF37', fontSize: 22, fontFamily: 'Poppins-Bold' }]}>
                    {pledgesList.length}
                  </Text>
                  <Text style={styles.budgetLabel}>Events Sponsored</Text>
                </View>
              </View>
            </View>

            {/* Sponsored Standings and MVPs */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>SPONSORED TOURNAMENTS STANDINGS</Text>
              {getSponsoredTourneys().length === 0 ? (
                <View style={styles.emptyStateContainer}>
                  <Text style={styles.emptyStateEmoji}>🏆</Text>
                  <Text style={styles.emptyText}>No active sponsored tournaments yet. Sponsor a tournament below to view live standings.</Text>
                </View>
              ) : (
                getSponsoredTourneys().map(t => {
                  const standings = getStandingsForTournament(t);
                  return (
                    <View key={t.id} style={styles.standingsCard}>
                      <Text style={styles.standingsTourneyTitle}>{t.name.toUpperCase()}</Text>
                      
                      {/* Table Header */}
                      <View style={styles.tableHeaderRow}>
                        <Text style={styles.tableHeaderTeamCol}>TEAM</Text>
                        <Text style={styles.tableHeaderCol}>P</Text>
                        <Text style={styles.tableHeaderCol}>W</Text>
                        <Text style={styles.tableHeaderCol}>L</Text>
                        <Text style={styles.tableHeaderCol}>PTS</Text>
                      </View>
                      
                      {/* Table Rows */}
                      {standings.map(team => (
                        <View key={team.id} style={styles.tableRow}>
                          <Text style={styles.teamNameCol} numberOfLines={1}>{team.name}</Text>
                          <Text style={styles.statsCol}>{team.played}</Text>
                          <Text style={styles.statsCol}>{team.won}</Text>
                          <Text style={styles.statsCol}>{team.lost}</Text>
                          <Text style={styles.pointsCol}>{team.points}</Text>
                        </View>
                      ))}
                    </View>
                  );
                })
              )}
            </View>

            {getSponsoredTourneys().length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>TOP SPONSORED SQUAD PLAYERS (MVP)</Text>
                <View style={styles.leaderboardCard}>
                  {getTopMvps().length === 0 ? (
                    <Text style={styles.emptyText}>No player stats available yet.</Text>
                  ) : (
                    getTopMvps().map((mvp, idx) => (
                      <View key={idx} style={styles.leaderRow}>
                        <Text style={styles.leaderRank}>{idx + 1}</Text>
                        <View style={styles.leaderMeta}>
                          <Text style={styles.leaderTourneyName}>{mvp.name}</Text>
                          <Text style={styles.leaderReach}>
                            {mvp.teamName} • {mvp.runs} runs • {mvp.wickets} wkts
                          </Text>
                        </View>
                        <Text style={styles.leaderIdx}>{mvp.performance.toFixed(0)} PTS</Text>
                      </View>
                    ))
                  )}
                </View>
              </View>
            )}

            {/* Sponsor a tournament form */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>SPONSOR A TOURNAMENT</Text>
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

                {/* Tournament Selection */}
                <Text style={styles.label}>Select Tournament</Text>
                <TouchableOpacity
                  style={styles.dropdown}
                  activeOpacity={0.8}
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

                {/* Pledge Amount */}
                <Text style={styles.label}>Pledge Amount (₹)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. 1500"
                  placeholderTextColor="#666"
                  keyboardType="numeric"
                  value={amount}
                  onChangeText={setAmount}
                />

                {/* Submit Button */}
                <Animated.View style={{ transform: [{ scale: btnScale }] }}>
                  <TouchableOpacity
                    style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
                    onPress={handlePledge}
                    onPressIn={handlePressIn}
                    onPressOut={handlePressOut}
                    disabled={submitting}
                    activeOpacity={0.9}
                  >
                    {submitting ? (
                      <ActivityIndicator color="#141414" />
                    ) : (
                      <Text style={styles.submitButtonText}>SUBMIT SPONSORSHIP PLEDGE</Text>
                    )}
                  </TouchableOpacity>
                </Animated.View>
              </View>
            </View>

            {/* Audience Leaderboard widget */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>AUDIENCE REACH LEADERBOARD</Text>
              <View style={styles.leaderboardCard}>
                <View style={styles.leaderRow}>
                  <Text style={styles.leaderRank}>1</Text>
                  <View style={styles.leaderMeta}>
                    <Text style={styles.leaderTourneyName}>State Championship Series</Text>
                    <Text style={styles.leaderReach}>14.8K Viewers avg • 12 Teams</Text>
                  </View>
                </View>
                <View style={styles.leaderRow}>
                  <Text style={styles.leaderRank}>2</Text>
                  <View style={styles.leaderMeta}>
                    <Text style={styles.leaderTourneyName}>Premier T20 Cup</Text>
                    <Text style={styles.leaderReach}>9.4K Viewers avg • 10 Teams</Text>
                  </View>
                </View>
                <View style={styles.leaderRow}>
                  <Text style={styles.leaderRank}>3</Text>
                  <View style={styles.leaderMeta}>
                    <Text style={styles.leaderTourneyName}>District Knockout Trophy</Text>
                    <Text style={styles.leaderReach}>6.1K Viewers avg • 8 Teams</Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Contribution History with Filter pills */}
            <View style={styles.section}>
              <View style={styles.historyHeader}>
                <Text style={styles.sectionTitle}>PLEDGES & OUTCOMES HISTORY</Text>
              </View>
              
              {/* Filter pills */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterBar}>
                {['ALL', 'PENDING', 'APPROVED', 'ACTIVE'].map(pill => (
                  <TouchableOpacity
                    key={pill}
                    style={[styles.filterPill, filterStatus === pill && styles.filterPillActive]}
                    onPress={() => setFilterStatus(pill)}
                  >
                    <Text style={[styles.filterPillText, filterStatus === pill && styles.filterPillTextActive]}>
                      {pill}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {getFilteredPledges().length === 0 ? (
                <View style={styles.emptyStateContainer}>
                  <Text style={styles.emptyStateEmoji}>💼</Text>
                  <Text style={styles.emptyText}>No matching sponsorship contributions found.</Text>
                </View>
              ) : (
                getFilteredPledges().map((item, index) => (
                  <View key={index} style={styles.pledgeCard}>
                    <View style={styles.pledgeHeaderRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.tournamentName}>{item.tournament_name}</Text>
                        <Text style={styles.tournamentStatus}>Tournament Status: {item.tournament_status}</Text>
                      </View>
                      <Text style={styles.pledgeAmount}>₹{item.amount}</Text>
                    </View>

                    {/* Stepper Status tracker */}
                    <Text style={styles.pledgeSectionLabel}>SPONSORSHIP PIPELINE PROGRESS</Text>
                    {renderStatusTracker(item.status)}

                    {/* Impact stats details */}
                    <Text style={styles.pledgeSectionLabel}>ESTIMATED BRAND IMPACT & REACH</Text>
                    <View style={styles.impactGrid}>
                      <View style={styles.impactBox}>
                        <Text style={styles.impactVal}>{item.teamsCount} Teams</Text>
                        <Text style={styles.impactLabel}>Exposure</Text>
                      </View>
                      <View style={styles.impactBox}>
                        <Text style={styles.impactVal}>{item.matchesPlayed} Matches</Text>
                        <Text style={styles.impactLabel}>Played</Text>
                      </View>
                      <View style={styles.impactBox}>
                        <Text style={styles.impactVal}>{item.viewers.toLocaleString()}</Text>
                        <Text style={styles.impactLabel}>Audience Reach</Text>
                      </View>
                    </View>
                  </View>
                ))
              )}
            </View>
          </View>
        )}

        {activeTab === 'Matches' && (
          <View>
            <Text style={styles.sectionTitle}>TOURNAMENT MATCHES</Text>
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
          </View>
        )}
      </ScrollView>

      {/* Match Details Modal (Summary, Scorecard) */}
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
                  {['Summary', 'Scorecard'].map((tab) => (
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
    fontSize: 12,
    color: '#888888',
    letterSpacing: 0.5,
  },
  tabButtonTextActive: {
    color: '#D4AF37',
  },
  section: {
    marginTop: 20,
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
  pledgeCard: {
    backgroundColor: '#1F1F1F',
    borderWidth: 1,
    borderColor: '#2D2D2D',
    borderRadius: 16,
    padding: 20,
    marginBottom: 14,
  },
  pledgeHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottomWidth: 1,
    borderBottomColor: '#2D2D2D',
    paddingBottom: 12,
  },
  tournamentName: {
    color: '#F5F5F5',
    fontSize: 16,
    fontWeight: 'bold',
  },
  tournamentStatus: {
    color: '#888888',
    fontSize: 11,
    marginTop: 2,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  pledgeAmount: {
    color: '#D4AF37',
    fontWeight: '900',
    fontSize: 20,
  },
  pledgeSectionLabel: {
    color: '#888',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1,
    marginTop: 16,
    marginBottom: 10,
  },
  formCard: {
    backgroundColor: '#1F1F1F',
    borderWidth: 1,
    borderColor: '#2D2D2D',
    borderRadius: 16,
    padding: 20,
    marginBottom: 10,
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
  // ROI / Budget Premium Card Styles

  budgetCard: {
    backgroundColor: '#1F1F1F',
    borderWidth: 1,
    borderColor: '#2D2D2D',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  budgetCardTitle: {
    color: '#888',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.5,
    marginBottom: 14,
  },
  progressBarWrapper: {
    height: 10,
    backgroundColor: '#333',
    borderRadius: 5,
    flexDirection: 'row',
    overflow: 'hidden',
    marginBottom: 16,
  },
  progressBarSec: {
    height: '100%',
  },
  budgetGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  budgetCol: {
    flex: 1,
    alignItems: 'center',
  },
  budgetVal: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  budgetLabel: {
    color: '#888',
    fontSize: 8,
    fontWeight: 'bold',
    marginTop: 4,
  },
  leaderboardCard: {
    backgroundColor: '#1F1F1F',
    borderWidth: 1,
    borderColor: '#2D2D2D',
    borderRadius: 16,
    padding: 16,
  },
  leaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#2D2D2D',
  },
  leaderRank: {
    color: '#D4AF37',
    fontWeight: '900',
    fontSize: 16,
    width: 24,
  },
  leaderMeta: {
    flex: 1,
  },
  leaderTourneyName: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: 'bold',
  },
  leaderReach: {
    color: '#888',
    fontSize: 11,
    marginTop: 2,
  },
  leaderIdx: {
    color: '#D4AF37',
    fontSize: 11,
    fontWeight: '900',
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  filterBar: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  filterPill: {
    backgroundColor: '#2A2A2A',
    borderColor: '#3D3D3D',
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 6,
    marginRight: 8,
  },
  filterPillActive: {
    backgroundColor: '#D4AF37',
    borderColor: '#D4AF37',
  },
  filterPillText: {
    color: '#888',
    fontSize: 11,
    fontWeight: 'bold',
  },
  filterPillTextActive: {
    color: '#141414',
  },
  // Tracker Pipeline Styles
  trackerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 10,
    justifyContent: 'space-between',
  },
  trackerStep: {
    alignItems: 'center',
    zIndex: 2,
    flex: 1,
  },
  stepDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#2A2A2A',
    borderWidth: 1.5,
    borderColor: '#3D3D3D',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDotActive: {
    backgroundColor: '#D4AF37',
    borderColor: '#D4AF37',
  },
  stepDotCheck: {
    color: '#141414',
    fontSize: 9,
    fontWeight: 'bold',
  },
  stepLabel: {
    color: '#888',
    fontSize: 8,
    fontWeight: 'bold',
    marginTop: 6,
    textAlign: 'center',
  },
  stepLabelActive: {
    color: '#D4AF37',
  },
  stepLine: {
    flex: 1,
    height: 2,
    backgroundColor: '#333',
    marginHorizontal: -12,
    marginTop: -14,
    zIndex: 1,
  },
  stepLineActive: {
    backgroundColor: '#D4AF37',
  },
  // Impact Stats Grid Styles
  impactGrid: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  impactBox: {
    flex: 1,
    backgroundColor: '#2A2A2A',
    borderRadius: 8,
    padding: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#3D3D3D',
  },
  impactVal: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  impactLabel: {
    color: '#888',
    fontSize: 8,
    marginTop: 2,
  },
  standingsCard: {
    backgroundColor: '#1F1F1F',
    borderWidth: 1,
    borderColor: '#2D2D2D',
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
  },
  standingsTourneyTitle: {
    color: '#D4AF37',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1,
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#2D2D2D',
    paddingBottom: 8,
  },
  tableHeaderRow: {
    flexDirection: 'row',
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
    marginBottom: 8,
  },
  tableHeaderTeamCol: {
    flex: 3,
    color: '#888888',
    fontSize: 10,
    fontWeight: 'bold',
  },
  tableHeaderCol: {
    flex: 1,
    color: '#888888',
    fontSize: 10,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#252525',
    alignItems: 'center',
  },
  teamNameCol: {
    flex: 3,
    color: '#F5F5F5',
    fontSize: 13,
    fontWeight: 'bold',
  },
  statsCol: {
    flex: 1,
    color: '#888888',
    fontSize: 13,
    textAlign: 'center',
  },
  pointsCol: {
    flex: 1,
    color: '#D4AF37',
    fontSize: 13,
    fontWeight: '900',
    textAlign: 'center',
  },
});

export default SponsorDashboard;
