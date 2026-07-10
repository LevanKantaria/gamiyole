import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, ScrollView, SafeAreaView } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { db, auth } from '../firebase';
import { ref, get } from 'firebase/database';
import { archiveOldRidesWithCount, getRideStats, getArchivedRideStats } from '../utils/databaseCleanup';

const AdminScreen = ({ navigation }) => {
  const [rideStats, setRideStats] = useState({ todayRides: 0, yesterdayRides: 0, totalRides: 0 });
  const [archivedStats, setArchivedStats] = useState({ totalArchived: 0, monthlyStats: {} });
  const [archiving, setArchiving] = useState(false);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    React.useCallback(() => {
      fetchStats();
    }, [])
  );

  const fetchStats = async () => {
    setLoading(true);
    try {
      const [rideStatsData, archivedStatsData] = await Promise.all([
        getRideStats(),
        getArchivedRideStats()
      ]);
      
      setRideStats(rideStatsData);
      setArchivedStats(archivedStatsData);
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleArchive = async () => {
    Alert.alert(
      'Archive Old Rides',
      'This will move all rides from yesterday and earlier to the archive folder. They will be preserved but removed from active listings.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Archive',
          style: 'default',
          onPress: async () => {
            setArchiving(true);
            try {
              const archivedCount = await archiveOldRidesWithCount();
              Alert.alert(
                'Archive Complete',
                `Successfully archived ${archivedCount} old rides. They are now preserved in the archive folder.`,
                [{ text: 'OK' }]
              );
              // Refresh stats
              await fetchStats();
            } catch (error) {
              console.error('Archive error:', error);
              Alert.alert('Error', 'Failed to archive old rides. Please try again.');
            } finally {
              setArchiving(false);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4361ee" />
        <Text style={styles.loadingText}>Loading system stats...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <MaterialIcons name="admin-panel-settings" size={24} color="#4361ee" />
          <Text style={styles.headerTitle}>System Management</Text>
        </View>

        <View style={styles.card}>
          {/* Active Rides Stats */}
          <Text style={styles.sectionTitle}>Active Rides</Text>
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <MaterialIcons name="today" size={20} color="#10b981" />
              <Text style={styles.statLabel}>Today</Text>
              <Text style={styles.statValue}>{rideStats.todayRides}</Text>
            </View>
            <View style={styles.statItem}>
              <MaterialIcons name="yesterday" size={20} color="#f59e0b" />
              <Text style={styles.statLabel}>Yesterday</Text>
              <Text style={styles.statValue}>{rideStats.yesterdayRides}</Text>
            </View>
            <View style={styles.statItem}>
              <MaterialIcons name="storage" size={20} color="#6b7280" />
              <Text style={styles.statLabel}>Total Active</Text>
              <Text style={styles.statValue}>{rideStats.totalRides}</Text>
            </View>
          </View>
          
          {/* Archived Rides Stats */}
          <Text style={styles.sectionTitle}>Archived Rides</Text>
          <View style={styles.archivedStatsContainer}>
            <View style={styles.archivedStatItem}>
              <MaterialIcons name="archive" size={20} color="#8b5cf6" />
              <Text style={styles.statLabel}>Total Archived</Text>
              <Text style={styles.statValue}>{archivedStats.totalArchived}</Text>
            </View>
          </View>
          
          {/* Monthly Archive Breakdown */}
          {Object.keys(archivedStats.monthlyStats).length > 0 && (
            <View style={styles.monthlyStatsContainer}>
              <Text style={styles.monthlyStatsTitle}>Monthly Archive</Text>
              {Object.entries(archivedStats.monthlyStats)
                .sort(([a], [b]) => b.localeCompare(a)) // Sort by date descending
                .slice(0, 6) // Show last 6 months
                .map(([month, count]) => (
                  <View key={month} style={styles.monthlyStatItem}>
                    <Text style={styles.monthlyStatMonth}>{month}</Text>
                    <Text style={styles.monthlyStatCount}>{count} rides</Text>
                  </View>
                ))}
            </View>
          )}
          
          <TouchableOpacity 
            style={[styles.archiveButton, archiving && styles.archiveButtonDisabled]} 
            onPress={handleArchive}
            disabled={archiving}
          >
            {archiving ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <MaterialIcons name="archive" size={20} color="#ffffff" />
            )}
            <Text style={styles.archiveButtonText}>
              {archiving ? 'Archiving...' : 'Archive Old Rides'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>System Information</Text>
          <Text style={styles.infoText}>
            • Archive function moves old rides to preserve data
          </Text>
          <Text style={styles.infoText}>
            • Only rides from yesterday and earlier are archived
          </Text>
          <Text style={styles.infoText}>
            • Archived rides are preserved but not shown to users
          </Text>
          <Text style={styles.infoText}>
            • This helps maintain app performance and reduce costs
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingVertical: 20,
    paddingHorizontal: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#4361ee',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    paddingHorizontal: 10,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#22223b',
    marginLeft: 10,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 15,
    color: '#4361ee',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  statItem: {
    alignItems: 'center',
    width: '30%',
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 5,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#22223b',
  },
  archivedStatsContainer: {
    marginBottom: 20,
  },
  archivedStatItem: {
    alignItems: 'center',
  },
  monthlyStatsContainer: {
    marginBottom: 20,
  },
  monthlyStatsTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
    color: '#4361ee',
  },
  monthlyStatItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  monthlyStatMonth: {
    fontSize: 14,
    fontWeight: '500',
    color: '#22223b',
  },
  monthlyStatCount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4361ee',
  },
  archiveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4361ee',
    borderRadius: 10,
    paddingVertical: 15,
    paddingHorizontal: 30,
    elevation: 2,
  },
  archiveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  archiveButtonDisabled: {
    backgroundColor: '#a5b4fc',
    opacity: 0.7,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 15,
    color: '#22223b',
  },
  infoText: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 8,
    lineHeight: 20,
  },
});

export default AdminScreen; 