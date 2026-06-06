import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import StatCard from '../widgets/StatCard';

const SponsorDashboard = ({
  data,
  notifications = [],
  tournaments = [],
  apiClient,
  onRefresh,
}) => {
  const total = data.total_sponsored ?? 0.0;
  const history = data.sponsorships ?? [];

  // Form States
  const [selectedTourneyId, setSelectedTourneyId] = useState('');
  const [amount, setAmount] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [showTourneys, setShowTourneys] = useState(false);

  const handlePledge = async () => {
    if (!selectedTourneyId || !amount) {
      setError('Please choose a tournament and enter amount.');
      return;
    }

    setSubmitting(true);
    setError('');
    setMessage('');
    try {
      const res = await apiClient.sponsorTournament(
        parseInt(selectedTourneyId),
        parseFloat(amount)
      );

      if (res && res.id) {
        setMessage(`Pledge of $${amount} submitted for approval!`);
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

  return (
    <ScrollView style={styles.container} nestedScrollEnabled={true}>
      <View style={styles.statContainer}>
        <StatCard label="Total Sponsorship Pledges" value={`$${total}`} />
      </View>

      {/* Sponsorship Pledge Form */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>SPONSOR A TOURNAMENT</Text>
        <View style={styles.formCard}>
          {message ? <Text style={styles.successText}>{message}</Text> : null}
          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          {/* Tournament Selection */}
          <Text style={styles.label}>Select Tournament</Text>
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

          {/* Pledge Amount */}
          <Text style={styles.label}>Pledge Amount ($)</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. 1500"
            placeholderTextColor="#888"
            keyboardType="numeric"
            value={amount}
            onChangeText={setAmount}
          />

          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
            onPress={handlePledge}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.submitButtonText}>SUBMIT PLEDGE</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Contribution History */}
      <View style={[styles.section, { marginBottom: 40 }]}>
        <Text style={styles.sectionTitle}>PLEDGES & OUTCOMES HISTORY</Text>
        {history.length === 0 ? (
          <Text style={styles.emptyText}>No sponsorship contributions registered.</Text>
        ) : (
          history.map((item, index) => (
            <View key={index} style={styles.pledgeCard}>
              <View style={styles.pledgeInfo}>
                <Text style={styles.tournamentName}>{item.tournament_name}</Text>
                <Text style={styles.tournamentStatus}>Tournament: {item.tournament_status}</Text>
                <Text style={styles.sponsorshipStatus}>Sponsorship: {item.status || 'pending'}</Text>
              </View>
              <Text style={styles.pledgeAmount}>${item.amount}</Text>
            </View>
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
  statContainer: {
    marginBottom: 16,
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
  pledgeCard: {
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
  pledgeInfo: {
    flex: 1,
    paddingRight: 8,
  },
  tournamentName: {
    color: '#000000',
    fontSize: 15,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  tournamentStatus: {
    color: '#666666',
    fontSize: 12,
  },
  sponsorshipStatus: {
    color: '#888888',
    fontSize: 11,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  pledgeAmount: {
    color: '#000000',
    fontWeight: '900',
    fontSize: 16,
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
});

export default SponsorDashboard;
