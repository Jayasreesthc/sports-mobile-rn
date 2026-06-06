import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const StatCard = ({ label, value }) => {
  return (
    <View style={styles.card}>
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#1F2833',
    borderRadius: 8,
    padding: 16,
    margin: 4,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  value: {
    fontWeight: '900',
    fontSize: 22,
    color: '#66FCF1',
    marginBottom: 4,
  },
  label: {
    color: '#9E9E9E',
    fontSize: 10,
    textAlign: 'center',
  },
});

export default StatCard;
