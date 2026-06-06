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
      };
      return [...prev, newState].slice(-10);
    });
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

    setHistoryStack((prev) => prev.slice(0, -1));

    const battingTeamLabel = lastState.inningsNum === 1 ? 'team_a' : 'team_b';
    const formattedOvers = parseFloat(`${lastState.overs}.${lastState.balls}`);
    await apiClient.updateLiveScore(matchId, battingTeamLabel, lastState.runs, lastState.wickets, formattedOvers);
  };

  const persistLiveScore = useCallback(
    async (newRuns, newWickets, newOvers, newBalls, currentInnings = inningsNum) => {
      if (!matchId) return;
      const battingTeamLabel = currentInnings === 1 ? 'team_a' : 'team_b';
      const formattedOvers = parseFloat(`${newOvers}.${newBalls}`);
      await apiClient.updateLiveScore(matchId, battingTeamLabel, newRuns, newWickets, formattedOvers);
    },
    [matchId, inningsNum]
  );

  const checkInningsStatus = (newRuns, newWickets, finalOvers, finalBalls) => {
    if (inningsNum === 1) {
      if (newWickets === 10 || (finalOvers === totalMaxOvers && finalBalls === 0)) {
        // AUTOMATIC INNINGS 2 TRANSITION: No manual clicks required
        console.log('--- 1st Innings finished! Automatically starting 2nd Innings ---');
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

        // Get openers for chasing team
        const chasingRoster = battingTeam === hostTeam ? teamBSquad : teamASquad;
        const defendingRoster = chasingRoster === teamASquad ? teamBSquad : teamASquad;

        setStriker(chasingRoster[0] || 'Chaser A');
        setNonStriker(chasingRoster[1] || 'Chaser B');
        setBowler(defendingRoster[0] || 'Bowler X');

        alert(`Innings 1 Finished at ${newRuns}/${newWickets}. Chasing Target: ${newRuns + 1}. Starting Innings 2!`);
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
    } else if (type === 'wicket') {
      newWickets += 1;
      isWicket = true;
    } else if (type === 'wide') {
      newRuns += 1 + value;
      isLegalDelivery = false;
    } else if (type === 'noball') {
      newRuns += 1 + value;
      isLegalDelivery = false;
    } else if (type === 'bye' || type === 'legbye') {
      newRuns += value;
    }

    setRuns(newRuns);
    setWickets(newWickets);

    let finalOvers = overs;
    let finalBalls = balls;
    let ballMarker = isWicket ? 'W' : type === 'wide' ? 'WD' : type === 'noball' ? 'NB' : String(value);

    if (isLegalDelivery) {
      finalBalls += 1;
      setCurrentOver((prev) => [...prev, ballMarker]);
      if (finalBalls === 6) {
        finalOvers += 1;
        finalBalls = 0;
        setCurrentOver([]);
        if (finalOvers < totalMaxOvers) {
          setBowlerModalVisible(true); // Choose next bowler for new over
        }
      }
      setOvers(finalOvers);
      setBalls(finalBalls);
    } else {
      setCurrentOver((prev) => [...prev, ballMarker]);
    }

    persistLiveScore(newRuns, newWickets, finalOvers, finalBalls, inningsNum);

    // Rotate strike on odd runs
    const runsRotates = value === 1 || value === 3;
    const overEnds = isLegalDelivery && finalBalls === 0;

    if (runsRotates !== overEnds) {
      const temp = striker;
      setStriker(nonStriker);
      setNonStriker(temp);
    }

    if (isWicket) {
      setIsWicketSelectorOpen(true);
    } else {
      checkInningsStatus(newRuns, newWickets, finalOvers, finalBalls);
    }
  };

  const confirmWicketDismissal = () => {
    setIsWicketSelectorOpen(false);
    setSelectedFielder('');
    setDismissalType('Bowled');

    if (wickets < 10) {
      setBatsmanModalVisible(true);
    }
    checkInningsStatus(runs, wickets, overs, balls);
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

    await apiClient.completeMatch(matchId, winnerId, []);
    alert(`Match Completed! ${outcomeText}`);
    onBack();
  };

  // STEP 1: Apply Squad Players
  if (setupStep === 'players') {
    return (
      <ScrollView style={styles.container}>
        <Text style={styles.wizardTitle}>MATCH SETUP WIZARD (1/3)</Text>
        <Text style={styles.sectionTitle}>APPLY SQUAD PLAYERS</Text>

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
            placeholderTextColor="#888"
            value={newPlayerName}
            onChangeText={setNewPlayerName}
          />
          <TouchableOpacity style={styles.primaryActionBtn} onPress={handleAddPlayer}>
            <Text style={styles.primaryActionBtnText}>ADD TO ROSTER</Text>
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
          <Text style={styles.nextBtnText}>NEXT: TOSS DECISION →</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  // STEP 2: Toss Details
  if (setupStep === 'toss') {
    return (
      <ScrollView style={styles.container}>
        <Text style={styles.wizardTitle}>MATCH SETUP WIZARD (2/3)</Text>
        <Text style={styles.sectionTitle}>TOSS TIME OPTIONS</Text>

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
        <Text style={styles.wizardTitle}>MATCH SETUP WIZARD (3/3)</Text>
        <Text style={styles.sectionTitle}>SELECT OPENING SQUAD MATCHUPS</Text>

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

  // STEP 4: Live scoring view
  return (
    <ScrollView style={styles.container}>
      {/* Header bar */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>← LEAVE</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>LIVE SCORING SCREEN</Text>
        {historyStack.length > 0 && (
          <TouchableOpacity style={styles.undoBtn} onPress={handleUndo}>
            <Text style={styles.undoText}>↩ UNDO</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Scoreboard display */}
      <View style={styles.scoreboard}>
        <Text style={styles.bigScore}>
          {runs} / {wickets}
        </Text>
        <Text style={styles.oversText}>
          OVERS: {overs}.{balls} <Text style={styles.oversLimit}>/ {totalMaxOvers}</Text>
        </Text>
      </View>

      {/* Active batsmen / Bowler Info */}
      <View style={styles.partnershipsCard}>
        <View style={styles.partnerRow}>
          <Text style={styles.partnerRole}>🏏 Batting Team:</Text>
          <Text style={styles.partnerName}>{activeBattingTeam}</Text>
        </View>
        <View style={styles.partnerRow}>
          <Text style={styles.partnerRole}>🏏 Striker:</Text>
          <TouchableOpacity onPress={() => setBatsmanModalVisible(true)}>
            <Text style={styles.partnerName}>{striker} *</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.partnerRow}>
          <Text style={styles.partnerRole}>🏏 Non-Striker:</Text>
          <Text style={styles.partnerName}>{nonStriker}</Text>
        </View>
        <View style={styles.partnerRow}>
          <Text style={styles.partnerRole}>🥎 Bowler:</Text>
          <TouchableOpacity onPress={() => setBowlerModalVisible(true)}>
            <Text style={styles.partnerName}>{bowler}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Current Over deliveries */}
      <View style={styles.thisOverCard}>
        <Text style={styles.thisOverTitle}>THIS OVER:</Text>
        <View style={styles.ballsContainer}>
          {currentOver.map((b, i) => (
            <View key={i} style={styles.ballCircle}>
              <Text style={styles.ballLabel}>{b}</Text>
            </View>
          ))}
          {currentOver.length === 0 && <Text style={{ color: '#888' }}>Waiting for first delivery...</Text>}
        </View>
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
          <TouchableOpacity style={[styles.scoringBtn, { backgroundColor: '#000000' }]} onPress={() => handleScore(0, 'wicket')}>
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
                const { locationX, locationY } = e.nativeEvent;
                const angle = Math.round((Math.atan2(locationY - 90, locationX - 90) * 180) / Math.PI);
                const normalizedAngle = (angle + 360) % 360;
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
              placeholder="Fielder Name"
              placeholderTextColor="#888"
              value={selectedFielder}
              onChangeText={setSelectedFielder}
            />
            <TouchableOpacity style={styles.confirmBtn} onPress={confirmWicketDismissal}>
              <Text style={styles.confirmBtnText}>CONFIRM WICKET OUT</Text>
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
    backgroundColor: '#FFFFFF',
    padding: 16,
  },
  wizardTitle: {
    fontSize: 10,
    fontWeight: '900',
    color: '#666666',
    marginBottom: 4,
    letterSpacing: 1,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#000000',
    marginBottom: 16,
  },
  formCard: {
    borderWidth: 1,
    borderColor: '#000000',
    padding: 16,
    backgroundColor: '#FFFFFF',
    marginBottom: 16,
  },
  label: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#000000',
    textTransform: 'uppercase',
    marginTop: 8,
    marginBottom: 6,
  },
  subLabel: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 4,
  },
  toggleRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  toggleBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#CCCCCC',
    paddingVertical: 10,
    alignItems: 'center',
  },
  toggleBtnActive: {
    borderColor: '#000000',
    backgroundColor: '#000000',
  },
  toggleText: {
    color: '#000000',
    fontSize: 12,
    fontWeight: 'bold',
  },
  toggleTextActive: {
    color: '#FFFFFF',
  },
  input: {
    borderWidth: 1,
    borderColor: '#000000',
    padding: 10,
    color: '#000000',
    fontSize: 13,
    marginBottom: 12,
    backgroundColor: '#FFFFFF',
  },
  primaryActionBtn: {
    backgroundColor: '#000000',
    paddingVertical: 12,
    alignItems: 'center',
  },
  primaryActionBtnText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 12,
  },
  rosterCard: {
    borderWidth: 1,
    borderColor: '#EEEEEE',
    padding: 12,
    backgroundColor: '#FAFAFA',
    marginBottom: 8,
  },
  rosterText: {
    color: '#333333',
    fontSize: 12,
  },
  nextBtn: {
    backgroundColor: '#000000',
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 40,
  },
  nextBtnText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 13,
  },
  optionChip: {
    borderWidth: 1,
    borderColor: '#CCCCCC',
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginRight: 8,
  },
  optionChipActive: {
    borderColor: '#000000',
    backgroundColor: '#000000',
  },
  chipText: {
    color: '#000000',
    fontSize: 12,
  },
  chipTextActive: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#000000',
    marginBottom: 16,
  },
  backButton: {
    backgroundColor: '#000000',
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  backButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 11,
  },
  headerTitle: {
    fontWeight: '900',
    fontSize: 13,
    color: '#000000',
  },
  undoBtn: {
    borderWidth: 1,
    borderColor: '#000000',
    paddingVertical: 5,
    paddingHorizontal: 8,
  },
  undoText: {
    color: '#000000',
    fontWeight: 'bold',
    fontSize: 11,
  },
  scoreboard: {
    borderWidth: 1,
    borderColor: '#000000',
    padding: 20,
    alignItems: 'center',
    backgroundColor: '#FAFAFA',
    marginBottom: 12,
  },
  bigScore: {
    fontSize: 48,
    fontWeight: '900',
    color: '#000000',
  },
  oversText: {
    fontSize: 14,
    color: '#000000',
    fontWeight: 'bold',
    marginTop: 4,
  },
  oversLimit: {
    color: '#888888',
    fontWeight: 'normal',
  },
  partnershipsCard: {
    borderWidth: 1,
    borderColor: '#000000',
    padding: 12,
    marginBottom: 12,
  },
  partnerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  partnerRole: {
    fontSize: 12,
    color: '#666666',
    fontWeight: 'bold',
  },
  partnerName: {
    fontSize: 12,
    color: '#000000',
    fontWeight: 'bold',
  },
  thisOverCard: {
    borderWidth: 1,
    borderColor: '#000000',
    padding: 12,
    marginBottom: 16,
  },
  thisOverTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#666666',
    marginBottom: 6,
  },
  ballsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  ballCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000000',
  },
  ballLabel: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  scoringControls: {
    marginBottom: 40,
    gap: 8,
  },
  gridRow: {
    flexDirection: 'row',
    gap: 8,
  },
  scoringBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#000000',
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  scoringBtnText: {
    color: '#000000',
    fontWeight: 'bold',
    fontSize: 13,
  },
  modalBg: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  wagonWheelCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#000000',
    padding: 20,
    width: '100%',
    maxWidth: 320,
    alignItems: 'center',
  },
  modalHeading: {
    fontSize: 14,
    fontWeight: '900',
    color: '#000000',
    marginBottom: 6,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  modalSubheading: {
    fontSize: 11,
    color: '#666666',
    marginBottom: 16,
    textAlign: 'center',
  },
  wagonField: {
    width: 180,
    height: 180,
    borderRadius: 90,
    borderWidth: 2,
    borderColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FAFAFA',
    position: 'relative',
    marginBottom: 12,
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
    borderColor: '#000000',
    backgroundColor: '#E0E0E0',
    position: 'absolute',
    left: 73,
    top: 83,
  },
  touchMarker: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#000000',
    position: 'absolute',
  },
  modalBtnRow: {
    width: '100%',
    gap: 8,
  },
  confirmBtn: {
    backgroundColor: '#000000',
    paddingVertical: 12,
    alignItems: 'center',
    width: '100%',
  },
  confirmBtnText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 12,
  },
  cancelBtn: {
    borderWidth: 1,
    borderColor: '#000000',
    paddingVertical: 10,
    alignItems: 'center',
    width: '100%',
  },
  cancelBtnText: {
    color: '#000000',
    fontWeight: 'bold',
    fontSize: 12,
  },
  extraSelectCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#000000',
    padding: 20,
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
    borderWidth: 1,
    borderColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  runsOptionText: {
    color: '#000000',
    fontWeight: 'bold',
    fontSize: 14,
  },
  dismissalCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#000000',
    padding: 20,
    width: '100%',
    maxWidth: 320,
  },
  dismissalSelectorRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
  },
  dismissalTypeBtn: {
    borderWidth: 1,
    borderColor: '#CCCCCC',
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  dismissalTypeBtnActive: {
    borderColor: '#000000',
    backgroundColor: '#000000',
  },
  dismissalTypeText: {
    color: '#666666',
    fontSize: 12,
  },
  dismissalTypeTextActive: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  playerPickCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#000000',
    padding: 20,
    width: '100%',
    maxWidth: 320,
  },
  playerSelectRow: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  playerSelectRowText: {
    color: '#000000',
    fontSize: 13,
    fontWeight: '500',
  },
  inningsTransitionCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#000000',
    padding: 20,
    width: '100%',
    maxWidth: 320,
    alignItems: 'center',
  },
});

export default ScoringScreen;
