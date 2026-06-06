import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import StatCard from '../widgets/StatCard';

const CoachDashboard = ({ data }) => {
  const teamsCount = data.teams_trained_count ?? 0;
  const players = data.players ?? [];

  const renderPlayerItem = ({ item }) => (
    <View style={styles.playerCard}>
      <View style={styles.playerInfo}>
        <Text style={styles.playerName}>{item.full_name}</Text>
        <Text style={styles.playerStats}>
          Runs: {item.runs_scored} | Wickets: {item.wickets_taken} | Balls: {item.balls_faced}
        </Text>
      </View>
      <View style={styles.indexBox}>
        <Text style={styles.indexLabel}>Index Rating</Text>
        <Text style={styles.indexValue}>{(item.performance_score ?? 0.0).toFixed(2)}</Text>
      </View>
    </View>
  );

  return (
    <FlatList
      data={players}
      keyExtractor={(item, index) => index.toString()}
      ListHeaderComponent={
        <View>
          <View style={styles.statContainer}>
            <StatCard label="Teams Trained / Coached" value={teamsCount.toString()} />
          </View>
          <Text style={styles.sectionTitle}>TRAINEE LEADERBOARD</Text>
        </View>
      }
      renderItem={renderPlayerItem}
      ListEmptyComponent={
        <Text style={styles.emptyText}>No trainee player statistics available yet.</Text>
      }
      contentContainerStyle={styles.listContainer}
    />
  );
};

const styles = StyleSheet.create({
  listContainer: {
    paddingBottom: 24,
    backgroundColor: '#FFFFFF',
  },
  statContainer: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontWeight: '900',
    fontSize: 14,
    color: '#000000',
    marginBottom: 12,
    letterSpacing: 1,
  },
  playerCard: {
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
  playerInfo: {
    flex: 1,
    paddingRight: 8,
  },
  playerName: {
    color: '#000000',
    fontSize: 15,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  playerStats: {
    color: '#666666',
    fontSize: 12,
  },
  indexBox: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 60,
    borderLeftWidth: 1,
    borderLeftColor: '#EEEEEE',
    paddingLeft: 8,
  },
  indexLabel: {
    color: '#888888',
    fontSize: 8,
    textTransform: 'uppercase',
    fontWeight: 'bold',
  },
  indexValue: {
    color: '#000000',
    fontWeight: '900',
    fontSize: 15,
  },
  emptyText: {
    color: '#666666',
    fontSize: 13,
    paddingVertical: 16,
  },
});

export default CoachDashboard;
