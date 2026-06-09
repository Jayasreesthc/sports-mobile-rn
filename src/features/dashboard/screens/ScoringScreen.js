import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  TextInput,
  ActivityIndicator,
} from 'react-native';

const ScoringScreen = ({ match, tournaments, apiClient, onBack }) => {
  const matchId = match.id;

  const hostTeam = match.team_a_name || match.team_a?.name || 'Team A';
  const visitorTeam = match.team_b_name || match.team_b?.name || 'Team B';
  const totalMaxOvers = match?.tournament?.overs || 2;

  // Pre-match Setup Steps: 'players' -> 'toss' -> 'openers' -> 'scoring'
  const [setupStep, setSetupStep] = useState('players');

  // Squad selection states
  const [teamASquad, setTeamASquad] = useState(() => {
    if (match?.team_a?.players && match.team_a.players.length > 0) {
      return match.team_a.players.map(p => p.player?.full_name || p.player?.email || 'Unknown').filter(Boolean);
    }
    return ['Asha', 'Ashwin', 'Sanjay', 'Rahul', 'Virat'];
  });
  const [teamBSquad, setTeamBSquad] = useState(() => {
    if (match?.team_b?.players && match.team_b.players.length > 0) {
      return match.team_b.players.map(p => p.player?.full_name || p.player?.email || 'Unknown').filter(Boolean);
    }
    return ['Kumar', 'Bumrah', 'Jadeja', 'Shami', 'Dhoni'];
  });
  const [newPlayerName, setNewPlayerName] = useState('');
  const [targetTeamAdd, setTargetTeamAdd] = useState('A'); // 'A' or 'B'

  // Toss states
  const [tossWinner, setTossWinner] = useState(hostTeam);
  const [tossDecision, setTossDecision] = useState('bat'); // 'bat' or 'bowl'

  // Opening states
  const [striker, setStriker] = useState('');
  const [nonStriker, setNonStriker] = useState('');
  const [bowler, setBowler] = useState('');

  // Live Scoreboard states (started after setup)
  const [runs, setRuns] = useState(0);
  const [wickets, setWickets] = useState(0);
  const [overs, setOvers] = useState(0);
  const [balls, setBalls] = useState(0);
  const [currentOver, setCurrentOver] = useState([]);
  const [historyStack, setHistoryStack] = useState([]);

  // 2-Innings tracking
  const [inningsNum, setInningsNum] = useState(1);
  const [runs1Score, setRuns1Score] = useState(0);
  const [wickets1Score, setWickets1Score] = useState(0);
  const [overs1Score, setOvers1Score] = useState(0.0);

  // Active batting and bowling teams
  const battingTeam = tossDecision === 'bat'
    ? (tossWinner === hostTeam ? hostTeam : visitorTeam)
    : (tossWinner === hostTeam ? visitorTeam : hostTeam);
  const bowlingTeam = battingTeam === hostTeam ? visitorTeam : hostTeam;

  const activeBattingTeam = inningsNum === 1 ? battingTeam : bowlingTeam;
  const activeBowlingTeam = inningsNum === 1 ? bowlingTeam : battingTeam;

  const currentBattingSquad = activeBattingTeam === hostTeam ? teamASquad : teamBSquad;
  const currentBowlingSquad = activeBowlingTeam === hostTeam ? teamASquad : teamBSquad;

  // Modals
  const [batsmanModalVisible, setBatsmanModalVisible] = useState(false);
  const [bowlerModalVisible, setBowlerModalVisible] = useState(false);
  const [isWicketSelectorOpen, setIsWicketSelectorOpen] = useState(false);
  const [dismissalType, setDismissalType] = useState('Bowled');
  const [selectedFielder, setSelectedFielder] = useState('');

  // Wagon Wheel
  const [wagonWheelVisible, setWagonWheelVisible] = useState(false);
  const [pendingRunValue, setPendingRunValue] = useState(0);
  const [touchPos, setTouchPos] = useState({ x: 100, y: 100 });
  const [touchAngle, setTouchAngle] = useState(0);
  const [touchRegion, setTouchRegion] = useState('Mid Off');
  const [isTouched, setIsTouched] = useState(false);

  const [extraModalVisible, setExtraModalVisible] = useState(false);
  const [pendingExtraType, setPendingExtraType] = useState(null);
  const [playerStats, setPlayerStats] = useState({});

  // Scorer Dashboard features state
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(true);
  const [fallOfWickets, setFallOfWickets] = useState([]);
  const [partnershipRuns, setPartnershipRuns] = useState(0);
  const [partnershipBalls, setPartnershipBalls] = useState(0);

  const [overSummaryModalVisible, setOverSummaryModalVisible] = useState(false);
  const [lastOverSummary, setLastOverSummary] = useState(null);

  // Match timer loop
  useEffect(() => {
    let timer = null;
    if (setupStep === 'scoring' && isTimerRunning) {
      timer = setInterval(() => {
        setElapsedSeconds(prev => prev + 1);
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [setupStep, isTimerRunning]);

  const formatTimer = (sec) => {
    const hrs = Math.floor(sec / 3600);
    const mins = Math.floor((sec % 3600) / 60);
    const secs = sec % 60;
    return `${hrs > 0 ? hrs + ':' : ''}${mins < 10 ? '0' + mins : mins}:${secs < 10 ? '0' + secs : secs}`;
  };

  const getEstimatedEndTime = () => {
    const remOvers = totalMaxOvers - (overs + balls / 6);
    const remMins = Math.ceil(remOvers * 4); // 4 mins per over average
    const date = new Date();
    date.setMinutes(date.getMinutes() + remMins);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Initialize openers on step change
  useEffect(() => {
    if (setupStep === 'openers') {
      const batRoster = tossDecision === 'bat'
        ? (tossWinner === hostTeam ? teamASquad : teamBSquad)
        : (tossWinner === hostTeam ? teamBSquad : teamASquad);
      const bowlRoster = batRoster === teamASquad ? teamBSquad : teamASquad;

      setStriker(batRoster[0] || 'Player A');
      setNonStriker(batRoster[1] || 'Player B');
      setBowler(bowlRoster[0] || 'Bowler X');
    }
  }, [setupStep]);

  const handleAddPlayer = () => {
    if (!newPlayerName.trim()) return;
    if (targetTeamAdd === 'A') {
      setTeamASquad([...teamASquad, newPlayerName.trim()]);
    } else {
      setTeamBSquad([...teamBSquad, newPlayerName.trim()]);
    }
    setNewPlayerName('');
  };

  const pushStateToHistory = () => {
    setHistoryStack((prev) => {
      const newState = {
        runs,
        wickets,
        overs,
        balls,
        currentOver: [...currentOver],
        striker,
        nonStriker,
        bowler,
        inningsNum,
        runs1Score,
        wickets1Score,
        overs1Score,
        playerStats: JSON.parse(JSON.stringify(playerStats)),
        fallOfWickets: [...fallOfWickets],
        partnershipRuns,
        partnershipBalls,
      };
      return [...prev, newState].slice(-15);
    });
  };

  const getPerformancesForState = (stateStats) => {
    return Object.keys(stateStats || {}).map(name => {
      const pId = getPlayerIdByName(name);
      const stats = stateStats[name];
      if (!pId) return null;
      return {
        player_id: pId,
        runs_scored: stats.runs ?? 0,
        balls_faced: stats.balls ?? 0,
        wickets_taken: stats.wickets ?? 0,
        runs_conceded: stats.runsConceded ?? 0
      };
    }).filter(Boolean);
  };

  const saveLiveStatsToLocal = (stats) => {
    if (typeof window !== 'undefined' && window.localStorage && matchId) {
      try {
        window.localStorage.setItem(`live_player_stats_${matchId}`, JSON.stringify(stats));
      } catch (e) {
        console.error('Error saving live player stats:', e);
      }
    }
  };

  const handleUndo = async () => {
    if (historyStack.length === 0) return;
    const lastState = historyStack[historyStack.length - 1];

    setRuns(lastState.runs);
    setWickets(lastState.wickets);
    setOvers(lastState.overs);
    setBalls(lastState.balls);
    setCurrentOver(lastState.currentOver);
    setStriker(lastState.striker);
    setNonStriker(lastState.nonStriker);
    setBowler(lastState.bowler);
    setInningsNum(lastState.inningsNum);
    setRuns1Score(lastState.runs1Score);
    setWickets1Score(lastState.wickets1Score);
    setOvers1Score(lastState.overs1Score);
    setPlayerStats(lastState.playerStats || {});
    saveLiveStatsToLocal(lastState.playerStats || {});
    setFallOfWickets(lastState.fallOfWickets || []);
    setPartnershipRuns(lastState.partnershipRuns || 0);
    setPartnershipBalls(lastState.partnershipBalls || 0);

    setHistoryStack((prev) => prev.slice(0, -1));

    const battingTeamLabel = lastState.inningsNum === 1 ? 'team_a' : 'team_b';
    const formattedOvers = parseFloat(`${lastState.overs}.${lastState.balls}`);
    const livePerfs = getPerformancesForState(lastState.playerStats);
    await apiClient.updateLiveScore(matchId, battingTeamLabel, lastState.runs, lastState.wickets, formattedOvers, livePerfs);
  };

  const handleRevertToState = async (index) => {
    const targetState = historyStack[index];
    if (!targetState) return;

    setRuns(targetState.runs);
    setWickets(targetState.wickets);
    setOvers(targetState.overs);
    setBalls(targetState.balls);
    setCurrentOver(targetState.currentOver);
    setStriker(targetState.striker);
    setNonStriker(targetState.nonStriker);
    setBowler(targetState.bowler);
    setInningsNum(targetState.inningsNum);
    setRuns1Score(targetState.runs1Score);
    setWickets1Score(targetState.wickets1Score);
    setOvers1Score(targetState.overs1Score);
    setPlayerStats(targetState.playerStats || {});
    saveLiveStatsToLocal(targetState.playerStats || {});
    setFallOfWickets(targetState.fallOfWickets || []);
    setPartnershipRuns(targetState.partnershipRuns || 0);
    setPartnershipBalls(targetState.partnershipBalls || 0);

    // Trim stack down to everything before index
    setHistoryStack((prev) => prev.slice(0, index));

    const battingTeamLabel = targetState.inningsNum === 1 ? 'team_a' : 'team_b';
    const formattedOvers = parseFloat(`${targetState.overs}.${targetState.balls}`);
    const livePerfs = getPerformancesForState(targetState.playerStats);
    await apiClient.updateLiveScore(matchId, battingTeamLabel, targetState.runs, targetState.wickets, formattedOvers, livePerfs);
    alert('Reverted to selected delivery state.');
  };

  const persistLiveScore = useCallback(
    async (newRuns, newWickets, newOvers, newBalls, currentInnings = inningsNum, livePerfs = []) => {
      if (!matchId) return;
      const battingTeamLabel = currentInnings === 1 ? 'team_a' : 'team_b';
      const formattedOvers = parseFloat(`${newOvers}.${newBalls}`);
      await apiClient.updateLiveScore(matchId, battingTeamLabel, newRuns, newWickets, formattedOvers, livePerfs);
    },
    [matchId, inningsNum]
  );

  const checkInningsStatus = (newRuns, newWickets, finalOvers, finalBalls) => {
    if (inningsNum === 1) {
      if (newWickets === 10 || (finalOvers === totalMaxOvers && finalBalls === 0)) {
        console.log('--- 1st Innings finished! Starting 2nd Innings ---');
        setRuns1Score(newRuns);
        setWickets1Score(newWickets);
        setOvers1Score(parseFloat(`${finalOvers}.${finalBalls}`));
        setInningsNum(2);

        // Reset state for 2nd innings
        setRuns(0);
        setWickets(0);
        setOvers(0);
        setBalls(0);
        setCurrentOver([]);
        setPartnershipRuns(0);
        setPartnershipBalls(0);

        // Get openers for chasing team
        const chasingRoster = battingTeam === hostTeam ? teamBSquad : teamASquad;
        const defendingRoster = chasingRoster === teamASquad ? teamBSquad : teamASquad;

        setStriker(chasingRoster[0] || 'Chaser A');
        setNonStriker(chasingRoster[1] || 'Chaser B');
        setBowler(defendingRoster[0] || 'Bowler X');

        alert(`Innings 1 Finished at ${newRuns}/${newWickets}. Target: ${newRuns + 1}. Starting Innings 2!`);
      }
    } else {
      const target = runs1Score + 1;
      const ballsLeft = totalMaxOvers * 6 - (finalOvers * 6 + finalBalls);

      if (newRuns >= target || newWickets === 10 || ballsLeft <= 0) {
        handleSaveAndFinish(newRuns, newWickets, finalOvers, finalBalls);
      }
    }
  };

  const processBallEvent = (value, type = 'run', region = 'Unknown', angle = 0) => {
    pushStateToHistory();

    let newRuns = runs;
    let newWickets = wickets;
    let isLegalDelivery = true;
    let isWicket = false;

    if (type === 'run') {
      newRuns += value;
      setPartnershipRuns(prev => prev + value);
    } else if (type === 'wicket') {
      newWickets += 1;
      isWicket = true;
    } else if (type === 'wide') {
      newRuns += 1 + value;
      isLegalDelivery = false;
      setPartnershipRuns(prev => prev + 1 + value);
    } else if (type === 'noball') {
      newRuns += 1 + value;
      isLegalDelivery = false;
      setPartnershipRuns(prev => prev + 1 + value);
    } else if (type === 'bye' || type === 'legbye') {
      newRuns += value;
      setPartnershipRuns(prev => prev + value);
    }

    setRuns(newRuns);
    setWickets(newWickets);

    if (isLegalDelivery) {
      setPartnershipBalls(prev => prev + 1);
    }

    // Update playerStats state
    const nextStats = { ...playerStats };
    
    if (striker) {
      if (!nextStats[striker]) {
        nextStats[striker] = { runs: 0, balls: 0, fours: 0, sixes: 0, ballsConceded: 0, runsConceded: 0, wickets: 0 };
      }
      const st = { ...nextStats[striker] };
      if (isLegalDelivery) {
        st.balls += 1;
      }
      if (type === 'run') {
        st.runs += value;
        if (value === 4) st.fours += 1;
        if (value === 6) st.sixes += 1;
      }
      nextStats[striker] = st;
    }

    if (nonStriker && !nextStats[nonStriker]) {
      nextStats[nonStriker] = { runs: 0, balls: 0, fours: 0, sixes: 0, ballsConceded: 0, runsConceded: 0, wickets: 0 };
    }

    if (bowler) {
      if (!nextStats[bowler]) {
        nextStats[bowler] = { runs: 0, balls: 0, fours: 0, sixes: 0, ballsConceded: 0, runsConceded: 0, wickets: 0 };
      }
      const bw = { ...nextStats[bowler] };
      if (isLegalDelivery) {
        bw.ballsConceded += 1;
      }
      if (type === 'run') {
        bw.runsConceded += value;
      } else if (type === 'wide' || type === 'noball') {
        bw.runsConceded += (1 + value);
      }
      if (isWicket && dismissalType !== 'Run Out') {
        bw.wickets += 1;
      }
      nextStats[bowler] = bw;
    }

    setPlayerStats(nextStats);
    saveLiveStatsToLocal(nextStats);

    let finalOvers = overs;
    let finalBalls = balls;
    let ballMarker = isWicket ? 'W' : type === 'wide' ? 'WD' : type === 'noball' ? 'NB' : String(value);

    if (isLegalDelivery) {
      finalBalls += 1;
      const updatedOver = [...currentOver, ballMarker];
      if (finalBalls === 6) {
        finalOvers += 1;
        finalBalls = 0;
        
        // Sum up over score
        let overRuns = 0;
        let overWickets = 0;
        updatedOver.forEach(b => {
          if (b === 'W') overWickets += 1;
          else if (b === 'WD' || b === 'NB') overRuns += 1;
          else {
            const r = parseInt(b);
            if (!isNaN(r)) overRuns += r;
          }
        });

        // Trigger over completed popup summary
        setLastOverSummary({
          overNum: finalOvers,
          runsConceded: overRuns,
          wicketsTaken: overWickets,
          bowlerName: bowler,
          deliveries: updatedOver,
        });
        setOverSummaryModalVisible(true);
        setCurrentOver([]);
      } else {
        setCurrentOver(updatedOver);
      }
      setOvers(finalOvers);
      setBalls(finalBalls);
    } else {
      setCurrentOver((prev) => [...prev, ballMarker]);
    }

    const livePerfs = getPerformancesForState(nextStats);
    persistLiveScore(newRuns, newWickets, finalOvers, finalBalls, inningsNum, livePerfs);

    // Rotate strike on odd runs
    const runsRotates = value === 1 || value === 3;
    const overEnds = isLegalDelivery && finalBalls === 0;

    if (runsRotates !== overEnds) {
      const temp = striker;
      setStriker(nonStriker);
      setNonStriker(temp);
    }

    if (isWicket) {
      // Capture Fall of wicket details
      const wicketLog = {
        wicketNum: newWickets,
        batsmanName: striker,
        score: `${newRuns}/${newWickets}`,
        overs: `${finalOvers}.${finalBalls}`,
      };
      setFallOfWickets(prev => [...prev, wicketLog]);
      setIsWicketSelectorOpen(true);
    } else {
      if (finalBalls !== 0) { // If over ended, we check status after over summary confirmation
        checkInningsStatus(newRuns, newWickets, finalOvers, finalBalls);
      }
    }
  };

  const confirmWicketDismissal = () => {
    setIsWicketSelectorOpen(false);
    setSelectedFielder('');
    setDismissalType('Bowled');

    // Reset current active partnership runs & balls
    setPartnershipRuns(0);
    setPartnershipBalls(0);

    if (wickets < 10) {
      setBatsmanModalVisible(true);
    }
    checkInningsStatus(runs, wickets, overs, balls);
  };

  const handleConfirmOverSummary = () => {
    setOverSummaryModalVisible(false);
    setBowlerModalVisible(true);
  };

  const handleScore = (value, type = 'run') => {
    if (type === 'run' && value > 0) {
      setPendingRunValue(value);
      setWagonWheelVisible(true);
    } else if (type === 'run' && value === 0) {
      processBallEvent(0, 'run', 'Pitch', 0);
    } else if (type === 'wicket') {
      processBallEvent(0, 'wicket', 'Unknown', 0);
    } else if (type === 'wide' || type === 'noball') {
      setPendingExtraType(type);
      setExtraModalVisible(true);
    } else {
      processBallEvent(value, type, 'Unknown', 0);
    }
  };

  const getPlayerIdByName = (name) => {
    if (match?.team_a?.players) {
      const found = match.team_a.players.find(p => (p.player?.full_name || p.player?.email) === name);
      if (found) return found.player_id || found.player?.id;
    }
    if (match?.team_b?.players) {
      const found = match.team_b.players.find(p => (p.player?.full_name || p.player?.email) === name);
      if (found) return found.player_id || found.player?.id;
    }
    return null;
  };

  const handleSaveAndFinish = async (finalRuns = runs, finalWickets = wickets, finalOvers = overs, finalBalls = balls) => {
    let outcomeText = '';
    let winnerId = match.team_a_id;

    const target = runs1Score + 1;
    if (finalRuns >= target) {
      outcomeText = `${visitorTeam} won by ${10 - finalWickets} wickets.`;
      winnerId = match.team_b_id;
    } else {
      outcomeText = `${hostTeam} won by ${runs1Score - finalRuns} runs.`;
      winnerId = match.team_a_id;
    }

    const performances = Object.keys(playerStats).map(name => {
      const pId = getPlayerIdByName(name);
      const stats = playerStats[name];
      if (!pId) return null;
      return {
        player_id: pId,
        runs_scored: stats.runs ?? 0,
        balls_faced: stats.balls ?? 0,
        wickets_taken: stats.wickets ?? 0,
        runs_conceded: stats.runsConceded ?? 0
      };
    }).filter(Boolean);

    await apiClient.completeMatch(matchId, winnerId, performances);
    alert(`Match Completed! ${outcomeText}`);
    onBack();
  };

  // STEP 1: Apply Squad Players
  if (setupStep === 'players') {
    return (
      <ScrollView style={styles.container}>
        <Text style={styles.wizardTitle}>Match Setup Wizard (1/3)</Text>
        <Text style={styles.sectionTitle}>Apply Squad Players</Text>

        <View style={styles.formCard}>
          <Text style={styles.label}>Select Target Team to Add Player</Text>
          <View style={styles.toggleRow}>
            <TouchableOpacity
              style={[styles.toggleBtn, targetTeamAdd === 'A' && styles.toggleBtnActive]}
              onPress={() => setTargetTeamAdd('A')}
            >
              <Text style={[styles.toggleText, targetTeamAdd === 'A' && styles.toggleTextActive]}>{hostTeam}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toggleBtn, targetTeamAdd === 'B' && styles.toggleBtnActive]}
              onPress={() => setTargetTeamAdd('B')}
            >
              <Text style={[styles.toggleText, targetTeamAdd === 'B' && styles.toggleTextActive]}>{visitorTeam}</Text>
            </TouchableOpacity>
          </View>

          <TextInput
            style={styles.input}
            placeholder="Type player name"
            placeholderTextColor="#666"
            value={newPlayerName}
            onChangeText={setNewPlayerName}
          />
          <TouchableOpacity style={styles.primaryActionBtn} onPress={handleAddPlayer}>
            <Text style={styles.primaryActionBtnText}>Add to Roster</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.rosterCard}>
          <Text style={styles.subLabel}>{hostTeam} Squad ({teamASquad.length})</Text>
          <Text style={styles.rosterText}>{teamASquad.join(', ')}</Text>
        </View>

        <View style={styles.rosterCard}>
          <Text style={styles.subLabel}>{visitorTeam} Squad ({teamBSquad.length})</Text>
          <Text style={styles.rosterText}>{teamBSquad.join(', ')}</Text>
        </View>

        <TouchableOpacity style={styles.nextBtn} onPress={() => setSetupStep('toss')}>
          <Text style={styles.nextBtnText}>Next: Toss Decision →</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  // STEP 2: Toss Details
  if (setupStep === 'toss') {
    return (
      <ScrollView style={styles.container}>
        <Text style={styles.wizardTitle}>Match Setup Wizard (2/3)</Text>
        <Text style={styles.sectionTitle}>Toss Time Options</Text>

        <View style={styles.formCard}>
          <Text style={styles.label}>Who won the Toss?</Text>
          <View style={styles.toggleRow}>
            <TouchableOpacity
              style={[styles.toggleBtn, tossWinner === hostTeam && styles.toggleBtnActive]}
              onPress={() => setTossWinner(hostTeam)}
            >
              <Text style={[styles.toggleText, tossWinner === hostTeam && styles.toggleTextActive]}>{hostTeam}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toggleBtn, tossWinner === visitorTeam && styles.toggleBtnActive]}
              onPress={() => setTossWinner(visitorTeam)}
            >
              <Text style={[styles.toggleText, tossWinner === visitorTeam && styles.toggleTextActive]}>{visitorTeam}</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.label}>Winner Decision</Text>
          <View style={styles.toggleRow}>
            <TouchableOpacity
              style={[styles.toggleBtn, tossDecision === 'bat' && styles.toggleBtnActive]}
              onPress={() => setTossDecision('bat')}
            >
              <Text style={[styles.toggleText, tossDecision === 'bat' && styles.toggleTextActive]}>BAT FIRST</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toggleBtn, tossDecision === 'bowl' && styles.toggleBtnActive]}
              onPress={() => setTossDecision('bowl')}
            >
              <Text style={[styles.toggleText, tossDecision === 'bowl' && styles.toggleTextActive]}>BOWL FIRST</Text>
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity style={styles.nextBtn} onPress={() => setSetupStep('openers')}>
          <Text style={styles.nextBtnText}>NEXT: OPENING PLAYERS →</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  // STEP 3: Opening Batsmen & Bowler
  if (setupStep === 'openers') {
    const batRoster = tossDecision === 'bat'
      ? (tossWinner === hostTeam ? teamASquad : teamBSquad)
      : (tossWinner === hostTeam ? teamBSquad : teamASquad);
    const bowlRoster = batRoster === teamASquad ? teamBSquad : teamASquad;

    return (
      <ScrollView style={styles.container}>
        <Text style={styles.wizardTitle}>Match Setup Wizard (3/3)</Text>
        <Text style={styles.sectionTitle}>Select Opening Squad Matchups</Text>

        <View style={styles.formCard}>
          <Text style={styles.label}>Opening Batsman (Striker)</Text>
          <ScrollView horizontal style={{ paddingVertical: 6 }}>
            {batRoster.map((name) => (
              <TouchableOpacity
                key={name}
                style={[styles.optionChip, striker === name && styles.optionChipActive]}
                onPress={() => setStriker(name)}
              >
                <Text style={[styles.chipText, striker === name && styles.chipTextActive]}>{name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <Text style={styles.label}>Opening Batsman (Non-Striker)</Text>
          <ScrollView horizontal style={{ paddingVertical: 6 }}>
            {batRoster.map((name) => (
              <TouchableOpacity
                key={name}
                style={[styles.optionChip, nonStriker === name && styles.optionChipActive]}
                onPress={() => setNonStriker(name)}
              >
                <Text style={[styles.chipText, nonStriker === name && styles.chipTextActive]}>{name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <Text style={styles.label}>Opening Bowler</Text>
          <ScrollView horizontal style={{ paddingVertical: 6 }}>
            {bowlRoster.map((name) => (
              <TouchableOpacity
                key={name}
                style={[styles.optionChip, bowler === name && styles.optionChipActive]}
                onPress={() => setBowler(name)}
              >
                <Text style={[styles.chipText, bowler === name && styles.chipTextActive]}>{name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <TouchableOpacity
          style={styles.nextBtn}
          onPress={() => {
            if (striker === nonStriker) {
              alert('Striker and Non-Striker must be different players.');
              return;
            }
            setSetupStep('scoring');
          }}
        >
          <Text style={styles.nextBtnText}>⚡ START LIVE SCORING NOW</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  const getBatsmanStats = (name) => {
    if (!name) return '0 (0) | 4s: 0 | 6s: 0 | SR: 0.0';
    const stats = playerStats[name] || { runs: 0, balls: 0, fours: 0, sixes: 0 };
    const sr = stats.balls > 0 ? ((stats.runs / stats.balls) * 100).toFixed(1) : '0.0';
    return `${stats.runs} (${stats.balls}) | 4s: ${stats.fours} | 6s: ${stats.sixes} | SR: ${sr}`;
  };

  const getBowlerStats = (name) => {
    if (!name) return '0.0 ov | 0 R | 0 W | Econ: 0.00';
    const stats = playerStats[name] || { ballsConceded: 0, runsConceded: 0, wickets: 0 };
    const ov = Math.floor(stats.ballsConceded / 6);
    const bl = stats.ballsConceded % 6;
    const oversConceded = `${ov}.${bl}`;
    const econ = stats.ballsConceded > 0 ? ((stats.runsConceded / (stats.ballsConceded / 6))).toFixed(2) : '0.00';
    return `${oversConceded} ov | ${stats.runsConceded} R | ${stats.wickets} W | Econ: ${econ}`;
  };

  // STEP 4: Live scoring view
  return (
    <ScrollView style={styles.container}>
      {/* Header bar */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>← LEAVE</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>LIVE SCORING SCREEN</Text>
        {historyStack.length > 0 ? (
          <TouchableOpacity style={styles.undoBtn} onPress={handleUndo}>
            <Text style={styles.undoText}>↩ UNDO</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 60 }} />
        )}
      </View>

      {/* Match Timer Component */}
      <View style={styles.timerCard}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View>
            <Text style={styles.timerTitle}>MATCH ELAPSED TIME</Text>
            <Text style={styles.timerValue}>{formatTimer(elapsedSeconds)}</Text>
          </View>
          <TouchableOpacity
            style={styles.timerCtrlBtn}
            onPress={() => setIsTimerRunning(!isTimerRunning)}
          >
            <Text style={styles.timerCtrlText}>{isTimerRunning ? '⏸ PAUSE' : '▶ RESUME'}</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.timerEstText}>ESTIMATED END TIME: {getEstimatedEndTime()}</Text>
      </View>

      {/* Scoreboard display */}
      <View style={styles.scoreboard}>
        <Text style={styles.bigScore}>
          {runs} / {wickets}
        </Text>
        <Text style={styles.oversText}>
          OVERS: {overs}.{balls} <Text style={styles.oversLimit}>/ {totalMaxOvers}</Text>
        </Text>
        {inningsNum === 2 && (
          <Text style={styles.chaseTargetText}>
            TARGET: {runs1Score + 1} (Need {runs1Score + 1 - runs} runs off {totalMaxOvers * 6 - (overs * 6 + balls)} balls)
          </Text>
        )}
      </View>

      {/* Active partnership tracker widget */}
      <View style={styles.partnershipCard}>
        <Text style={styles.partnerHeading}>ACTIVE PARTNERSHIP</Text>
        <Text style={styles.partnerValue}>
          {partnershipRuns} Runs <Text style={{ color: '#888', fontWeight: 'normal' }}>off {partnershipBalls} balls</Text>
        </Text>
        <Text style={styles.partnerContribText}>
          Contributors: {striker} ({getBatsmanStats(striker).split(' ')[0]}*) & {nonStriker} ({getBatsmanStats(nonStriker).split(' ')[0]})
        </Text>
      </View>

      {/* Active batsmen / Bowler Info */}
      <View style={styles.partnershipsCard}>
        <View style={styles.partnerRow}>
          <Text style={styles.partnerRole}>🏏 Batting Team:</Text>
          <Text style={styles.partnerName}>{activeBattingTeam}</Text>
        </View>
        <View style={styles.partnerRowContainer}>
          <View style={styles.partnerMainRow}>
            <Text style={styles.partnerRole}>🏏 Striker:</Text>
            <TouchableOpacity onPress={() => setBatsmanModalVisible(true)}>
              <Text style={[styles.partnerName, { textDecorationLine: 'underline', color: '#D4AF37' }]}>{striker} *</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.playerStatsSub}>{getBatsmanStats(striker)}</Text>
        </View>

        <View style={styles.partnerRowContainer}>
          <View style={styles.partnerMainRow}>
            <Text style={styles.partnerRole}>🏏 Non-Striker:</Text>
            <Text style={styles.partnerName}>{nonStriker}</Text>
          </View>
          <Text style={styles.playerStatsSub}>{getBatsmanStats(nonStriker)}</Text>
        </View>

        <View style={styles.partnerRowContainer}>
          <View style={styles.partnerMainRow}>
            <Text style={styles.partnerRole}>🥎 Bowler:</Text>
            <TouchableOpacity onPress={() => setBowlerModalVisible(true)}>
              <Text style={[styles.partnerName, { textDecorationLine: 'underline', color: '#D4AF37' }]}>{bowler}</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.playerStatsSub}>{getBowlerStats(bowler)}</Text>
        </View>
      </View>

      {/* Current Over deliveries */}
      <View style={styles.thisOverCard}>
        <Text style={styles.thisOverTitle}>THIS OVER DELIVERIES:</Text>
        <View style={styles.ballsContainer}>
          {currentOver.map((b, i) => (
            <View key={i} style={styles.ballCircle}>
              <Text style={styles.ballLabel}>{b}</Text>
            </View>
          ))}
          {currentOver.length === 0 && <Text style={{ color: '#888' }}>Waiting for first delivery...</Text>}
        </View>
      </View>

      {/* Scorecard Editor / Delivery log list */}
      <View style={styles.thisOverCard}>
        <Text style={styles.thisOverTitle}>DELIVERY LOG / HISTORIC STATES (TAP TO REVERT):</Text>
        {historyStack.length === 0 ? (
          <Text style={{ color: '#888', fontStyle: 'italic', marginTop: 6 }}>No deliveries recorded yet in this session.</Text>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
            {historyStack.map((state, idx) => (
              <TouchableOpacity
                key={idx}
                style={styles.deliveryLogChip}
                onPress={() => handleRevertToState(idx)}
              >
                <Text style={styles.deliveryLogText}>
                  {state.overs}.{state.balls} • {state.runs}/{state.wickets}
                </Text>
                <Text style={styles.deliveryLogUndoText}>REVERT ↩</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </View>

      {/* Fall of Wickets Log */}
      <View style={styles.thisOverCard}>
        <Text style={styles.thisOverTitle}>FALL OF WICKETS LOG:</Text>
        {fallOfWickets.length === 0 ? (
          <Text style={{ color: '#888', fontStyle: 'italic', marginTop: 4 }}>No wickets fallen yet.</Text>
        ) : (
          fallOfWickets.map((fow) => (
            <View key={fow.wicketNum} style={styles.fowRow}>
              <Text style={styles.fowLabel}>Wkt {fow.wicketNum}:</Text>
              <Text style={styles.fowText}>{fow.batsmanName} ({fow.score}) at {fow.overs} ov</Text>
            </View>
          ))
        )}
      </View>

      {/* Scoring Buttons Grid */}
      <View style={styles.scoringControls}>
        <View style={styles.gridRow}>
          <TouchableOpacity style={styles.scoringBtn} onPress={() => handleScore(0)}>
            <Text style={styles.scoringBtnText}>0 (Dot)</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.scoringBtn} onPress={() => handleScore(1)}>
            <Text style={styles.scoringBtnText}>1 Run</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.scoringBtn} onPress={() => handleScore(2)}>
            <Text style={styles.scoringBtnText}>2 Runs</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.gridRow}>
          <TouchableOpacity style={styles.scoringBtn} onPress={() => handleScore(4)}>
            <Text style={styles.scoringBtnText}>4 (Four)</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.scoringBtn} onPress={() => handleScore(6)}>
            <Text style={styles.scoringBtnText}>6 (Six)</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.scoringBtn, { backgroundColor: '#C62828' }]} onPress={() => handleScore(0, 'wicket')}>
            <Text style={{ color: '#FFFFFF', fontWeight: 'bold' }}>OUT WICKET</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.gridRow}>
          <TouchableOpacity style={styles.scoringBtn} onPress={() => handleScore(0, 'wide')}>
            <Text style={styles.scoringBtnText}>Wide (+1)</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.scoringBtn} onPress={() => handleScore(0, 'noball')}>
            <Text style={styles.scoringBtnText}>No Ball (+1)</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* MODAL: Wagon Wheel */}
      <Modal visible={wagonWheelVisible} transparent={true} animationType="fade">
        <View style={styles.modalBg}>
          <View style={styles.wagonWheelCard}>
            <Text style={styles.modalHeading}>WAGON WHEEL SHOT SELECTOR</Text>
            <Text style={styles.modalSubheading}>Touch direction on the field to place the run value: {pendingRunValue}</Text>

            <TouchableOpacity
              style={styles.wagonField}
              activeOpacity={0.8}
              onPress={(e) => {
                const nativeEv = e.nativeEvent || {};
                let locationX = nativeEv.locationX !== undefined ? nativeEv.locationX : nativeEv.offsetX;
                let locationY = nativeEv.locationY !== undefined ? nativeEv.locationY : nativeEv.offsetY;

                if (locationX === undefined || isNaN(locationX)) locationX = 90;
                if (locationY === undefined || isNaN(locationY)) locationY = 90;

                const angle = Math.round((Math.atan2(locationY - 90, locationX - 90) * 180) / Math.PI);
                const normalizedAngle = isNaN(angle) ? 0 : (angle + 360) % 360;
                setTouchAngle(normalizedAngle);
                setIsTouched(true);
                setTouchPos({ x: locationX, y: locationY });

                let region = 'Mid Off';
                if (normalizedAngle >= 337 || normalizedAngle < 22) region = 'Mid Off';
                else if (normalizedAngle >= 22 && normalizedAngle < 67) region = 'Cover';
                else if (normalizedAngle >= 67 && normalizedAngle < 112) region = 'Point';
                else if (normalizedAngle >= 112 && normalizedAngle < 157) region = 'Third Man';
                else if (normalizedAngle >= 157 && normalizedAngle < 202) region = 'Fine Leg';
                else if (normalizedAngle >= 202 && normalizedAngle < 247) region = 'Square Leg';
                else if (normalizedAngle >= 247 && normalizedAngle < 292) region = 'Mid Wicket';
                else region = 'Mid On';

                setTouchRegion(region);
              }}
            >
              <View style={styles.fieldCircle}>
                <View style={styles.pitchRect} />
                {isTouched && (
                  <View style={[styles.touchMarker, { left: touchPos.x - 6, top: touchPos.y - 6 }]} />
                )}
              </View>
            </TouchableOpacity>

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={styles.confirmBtn}
                onPress={() => {
                  setWagonWheelVisible(false);
                  setIsTouched(false);
                  processBallEvent(pendingRunValue, 'run', touchRegion, touchAngle);
                }}
              >
                <Text style={styles.confirmBtnText}>CONFIRM SHOT</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => {
                  setWagonWheelVisible(false);
                  setIsTouched(false);
                  processBallEvent(pendingRunValue, 'run', 'Pitch', 0);
                }}
              >
                <Text style={styles.cancelBtnText}>SKIP WHEEL</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL: Extras Selection */}
      <Modal visible={extraModalVisible} transparent={true} animationType="slide">
        <View style={styles.modalBg}>
          <View style={styles.extraSelectCard}>
            <Text style={styles.modalHeading}>EXTRAS - RUNS COMPONENT</Text>
            <View style={styles.runsBtnRow}>
              {[0, 1, 2, 3, 4, 6].map((r) => (
                <TouchableOpacity
                  key={r}
                  style={styles.runsOptionBtn}
                  onPress={() => {
                    setExtraModalVisible(false);
                    processBallEvent(r, pendingExtraType, 'Unknown', 0);
                  }}
                >
                  <Text style={styles.runsOptionText}>+{r}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL: Dismissal Selector */}
      <Modal visible={isWicketSelectorOpen} transparent={true} animationType="slide">
        <View style={styles.modalBg}>
          <View style={styles.dismissalCard}>
            <Text style={styles.modalHeading}>WICKET DISMISSAL DETAILS</Text>
            <View style={styles.dismissalSelectorRow}>
              {['Bowled', 'Caught', 'LBW', 'Run Out', 'Stumped'].map((t) => (
                <TouchableOpacity
                  key={t}
                  style={[styles.dismissalTypeBtn, dismissalType === t && styles.dismissalTypeBtnActive]}
                  onPress={() => setDismissalType(t)}
                >
                  <Text style={[styles.dismissalTypeText, dismissalType === t && styles.dismissalTypeTextActive]}>
                    {t}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <TextInput
              style={styles.input}
              placeholder="Fielder Name (Optional)"
              placeholderTextColor="#666"
              value={selectedFielder}
              onChangeText={setSelectedFielder}
            />
            <TouchableOpacity style={styles.confirmBtn} onPress={confirmWicketDismissal}>
              <Text style={styles.confirmBtnText}>CONFIRM WICKET OUT</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MODAL: Over Completed Summary Popup */}
      <Modal visible={overSummaryModalVisible} transparent={true} animationType="fade">
        <View style={styles.modalBg}>
          <View style={styles.wagonWheelCard}>
            <Text style={styles.modalHeading}>OVER COMPLETED! 🥎</Text>
            {lastOverSummary && (
              <View style={{ alignItems: 'center', marginVertical: 10 }}>
                <Text style={styles.overSummarySubText}>Over Number: {lastOverSummary.overNum}</Text>
                <Text style={styles.overSummaryBigVal}>
                  {lastOverSummary.runsConceded} Runs • {lastOverSummary.wicketsTaken} Wkts
                </Text>
                <Text style={styles.overSummarySubText}>Bowler: {lastOverSummary.bowlerName}</Text>
                <View style={[styles.ballsContainer, { marginTop: 12, justifyContent: 'center' }]}>
                  {lastOverSummary.deliveries.map((b, i) => (
                    <View key={i} style={[styles.ballCircle, { width: 24, height: 24, borderRadius: 12 }]}>
                      <Text style={[styles.ballLabel, { fontSize: 9 }]}>{b}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
            <TouchableOpacity style={[styles.confirmBtn, { marginTop: 14 }]} onPress={handleConfirmOverSummary}>
              <Text style={styles.confirmBtnText}>PROCEED TO NEXT OVER</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MODAL: Choose Batsman */}
      <Modal visible={batsmanModalVisible} transparent={true} animationType="slide">
        <View style={styles.modalBg}>
          <View style={styles.playerPickCard}>
            <Text style={styles.modalHeading}>SELECT NEXT BATSMAN</Text>
            <ScrollView style={{ maxHeight: 200, marginVertical: 10 }}>
              {currentBattingSquad.map((name) => (
                <TouchableOpacity
                  key={name}
                  style={styles.playerSelectRow}
                  onPress={() => {
                    setStriker(name);
                    setBatsmanModalVisible(false);
                  }}
                >
                  <Text style={styles.playerSelectRowText}>🏏 {name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* MODAL: Choose Bowler */}
      <Modal visible={bowlerModalVisible} transparent={true} animationType="slide">
        <View style={styles.modalBg}>
          <View style={styles.playerPickCard}>
            <Text style={styles.modalHeading}>SELECT NEXT BOWLER</Text>
            <ScrollView style={{ maxHeight: 200, marginVertical: 10 }}>
              {currentBowlingSquad.map((name) => (
                <TouchableOpacity
                  key={name}
                  style={styles.playerSelectRow}
                  onPress={() => {
                    setBowler(name);
                    setBowlerModalVisible(false);
                  }}
                >
                  <Text style={styles.playerSelectRowText}>🥎 {name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
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
    padding: 16,
  },
  wizardTitle: {
    fontSize: 11,
    fontWeight: '900',
    color: '#888888',
    marginBottom: 6,
    letterSpacing: 1,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#D4AF37',
    marginBottom: 16,
    letterSpacing: 0.5,
  },
  formCard: {
    backgroundColor: '#1F1F1F',
    borderWidth: 1,
    borderColor: '#2D2D2D',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  label: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#888888',
    marginTop: 8,
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  subLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#D4AF37',
    marginBottom: 6,
  },
  toggleRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  toggleBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#3D3D3D',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: '#2A2A2A',
  },
  toggleBtnActive: {
    borderColor: '#D4AF37',
    backgroundColor: '#D4AF37',
  },
  toggleText: {
    color: '#888888',
    fontSize: 12,
    fontWeight: 'bold',
  },
  toggleTextActive: {
    color: '#141414',
  },
  input: {
    backgroundColor: '#2A2A2A',
    color: '#F5F5F5',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#3D3D3D',
    marginBottom: 16,
  },
  primaryActionBtn: {
    backgroundColor: '#D4AF37',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  primaryActionBtnText: {
    color: '#141414',
    fontWeight: '900',
    fontSize: 12,
  },
  rosterCard: {
    backgroundColor: '#1F1F1F',
    borderWidth: 1,
    borderColor: '#2D2D2D',
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
  },
  rosterText: {
    color: '#F5F5F5',
    fontSize: 13,
    lineHeight: 18,
  },
  nextBtn: {
    backgroundColor: '#D4AF37',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 40,
  },
  nextBtnText: {
    color: '#141414',
    fontWeight: '900',
    fontSize: 14,
  },
  optionChip: {
    backgroundColor: '#2A2A2A',
    borderWidth: 1,
    borderColor: '#3D3D3D',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 14,
    marginRight: 8,
  },
  optionChipActive: {
    borderColor: '#D4AF37',
    backgroundColor: '#D4AF37',
  },
  chipText: {
    color: '#888888',
    fontSize: 12,
  },
  chipTextActive: {
    color: '#141414',
    fontWeight: 'bold',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2D2D2D',
    marginBottom: 16,
  },
  backButton: {
    backgroundColor: '#2A2A2A',
    borderWidth: 1,
    borderColor: '#3D3D3D',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  backButtonText: {
    color: '#F5F5F5',
    fontWeight: 'bold',
    fontSize: 11,
  },
  headerTitle: {
    fontWeight: '900',
    fontSize: 14,
    color: '#D4AF37',
    letterSpacing: 0.5,
  },
  undoBtn: {
    backgroundColor: '#2A2A2A',
    borderWidth: 1,
    borderColor: '#C62828',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  undoText: {
    color: '#E57373',
    fontWeight: 'bold',
    fontSize: 11,
  },
  scoreboard: {
    backgroundColor: '#1F1F1F',
    borderWidth: 1,
    borderColor: '#2D2D2D',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
  },
  bigScore: {
    fontSize: 52,
    fontWeight: '900',
    color: '#D4AF37',
  },
  oversText: {
    fontSize: 15,
    color: '#F5F5F5',
    fontWeight: 'bold',
    marginTop: 6,
  },
  oversLimit: {
    color: '#888888',
    fontWeight: 'normal',
  },
  chaseTargetText: {
    color: '#FFCC00',
    fontSize: 13,
    fontWeight: 'bold',
    marginTop: 8,
    textAlign: 'center',
  },
  partnershipsCard: {
    backgroundColor: '#1F1F1F',
    borderWidth: 1,
    borderColor: '#2D2D2D',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  partnerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#2D2D2D',
  },
  partnerRole: {
    fontSize: 13,
    color: '#888888',
    fontWeight: 'bold',
  },
  partnerName: {
    fontSize: 13,
    color: '#F5F5F5',
    fontWeight: 'bold',
  },
  thisOverCard: {
    backgroundColor: '#1F1F1F',
    borderWidth: 1,
    borderColor: '#2D2D2D',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  thisOverTitle: {
    fontSize: 10,
    fontWeight: '900',
    color: '#888888',
    marginBottom: 10,
    letterSpacing: 1,
  },
  ballsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  ballCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#D4AF37',
  },
  ballLabel: {
    color: '#141414',
    fontSize: 11,
    fontWeight: 'bold',
  },
  scoringControls: {
    marginBottom: 40,
    gap: 10,
  },
  gridRow: {
    flexDirection: 'row',
    gap: 10,
  },
  scoringBtn: {
    flex: 1,
    backgroundColor: '#1F1F1F',
    borderWidth: 1,
    borderColor: '#2D2D2D',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
  },
  scoringBtnText: {
    color: '#F5F5F5',
    fontWeight: 'bold',
    fontSize: 14,
  },
  modalBg: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  wagonWheelCard: {
    backgroundColor: '#1F1F1F',
    borderWidth: 1,
    borderColor: '#2D2D2D',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 320,
    alignItems: 'center',
  },
  modalHeading: {
    fontSize: 15,
    fontWeight: '900',
    color: '#D4AF37',
    marginBottom: 8,
    textAlign: 'center',
  },
  modalSubheading: {
    fontSize: 12,
    color: '#888888',
    marginBottom: 20,
    textAlign: 'center',
  },
  wagonField: {
    width: 180,
    height: 180,
    borderRadius: 90,
    borderWidth: 2,
    borderColor: '#3D3D3D',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#2A2A2A',
    position: 'relative',
    marginBottom: 16,
  },
  fieldCircle: {
    position: 'relative',
    width: '100%',
    height: '100%',
  },
  pitchRect: {
    width: 30,
    height: 10,
    borderWidth: 1,
    borderColor: '#3D3D3D',
    backgroundColor: '#1F1F1F',
    position: 'absolute',
    left: 73,
    top: 83,
  },
  touchMarker: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#D4AF37',
    position: 'absolute',
  },
  modalBtnRow: {
    width: '100%',
    gap: 10,
  },
  confirmBtn: {
    backgroundColor: '#D4AF37',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    width: '100%',
  },
  confirmBtnText: {
    color: '#141414',
    fontWeight: '900',
    fontSize: 13,
  },
  cancelBtn: {
    backgroundColor: '#2A2A2A',
    borderWidth: 1,
    borderColor: '#3D3D3D',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    width: '100%',
  },
  cancelBtnText: {
    color: '#F5F5F5',
    fontWeight: 'bold',
    fontSize: 13,
  },
  extraSelectCard: {
    backgroundColor: '#1F1F1F',
    borderWidth: 1,
    borderColor: '#2D2D2D',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 320,
  },
  runsBtnRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginVertical: 16,
    justifyContent: 'center',
  },
  runsOptionBtn: {
    width: 45,
    height: 45,
    backgroundColor: '#2A2A2A',
    borderWidth: 1,
    borderColor: '#3D3D3D',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  runsOptionText: {
    color: '#D4AF37',
    fontWeight: 'bold',
    fontSize: 15,
  },
  dismissalCard: {
    backgroundColor: '#1F1F1F',
    borderWidth: 1,
    borderColor: '#2D2D2D',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 320,
  },
  dismissalSelectorRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  dismissalTypeBtn: {
    backgroundColor: '#2A2A2A',
    borderWidth: 1,
    borderColor: '#3D3D3D',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  dismissalTypeBtnActive: {
    borderColor: '#D4AF37',
    backgroundColor: '#D4AF37',
  },
  dismissalTypeText: {
    color: '#888888',
    fontSize: 12,
  },
  dismissalTypeTextActive: {
    color: '#141414',
    fontWeight: 'bold',
  },
  playerPickCard: {
    backgroundColor: '#1F1F1F',
    borderWidth: 1,
    borderColor: '#2D2D2D',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 320,
  },
  playerSelectRow: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#2D2D2D',
  },
  playerSelectRowText: {
    color: '#F5F5F5',
    fontSize: 14,
    fontWeight: '500',
  },
  partnerRowContainer: {
    borderBottomWidth: 1,
    borderColor: '#2D2D2D',
    paddingVertical: 10,
  },
  partnerMainRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  playerStatsSub: {
    fontSize: 12,
    color: '#888888',
    marginTop: 4,
  },
  // Scorer Dash Premium Widget Styles
  timerCard: {
    backgroundColor: '#1F1F1F',
    borderWidth: 1,
    borderColor: '#2D2D2D',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  timerTitle: {
    color: '#888',
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  timerValue: {
    color: '#D4AF37',
    fontSize: 22,
    fontWeight: '900',
    marginTop: 4,
  },
  timerCtrlBtn: {
    backgroundColor: '#2A2A2A',
    borderColor: '#3D3D3D',
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  timerCtrlText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: 'bold',
  },
  timerEstText: {
    color: '#888',
    fontSize: 11,
    marginTop: 8,
    fontStyle: 'italic',
  },
  partnershipCard: {
    backgroundColor: '#1F1F1F',
    borderWidth: 1,
    borderColor: '#2D2D2D',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  partnerHeading: {
    color: '#888',
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 1.5,
    marginBottom: 6,
  },
  partnerValue: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '900',
  },
  partnerContribText: {
    color: '#D4AF37',
    fontSize: 11,
    fontWeight: 'bold',
    marginTop: 6,
  },
  fowRow: {
    flexDirection: 'row',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#2A2A2A',
  },
  fowLabel: {
    color: '#D4AF37',
    fontWeight: 'bold',
    width: 50,
    fontSize: 12,
  },
  fowText: {
    color: '#FFF',
    fontSize: 12,
  },
  deliveryLogChip: {
    backgroundColor: '#2A2A2A',
    borderWidth: 1,
    borderColor: '#3D3D3D',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 10,
    alignItems: 'center',
  },
  deliveryLogText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  deliveryLogUndoText: {
    color: '#E57373',
    fontSize: 9,
    fontWeight: '900',
    marginTop: 4,
    letterSpacing: 0.5,
  },
  overSummarySubText: {
    color: '#888',
    fontSize: 11,
    fontWeight: 'bold',
  },
  overSummaryBigVal: {
    color: '#D4AF37',
    fontSize: 22,
    fontWeight: '900',
    marginVertical: 6,
  },
});

export default ScoringScreen;
