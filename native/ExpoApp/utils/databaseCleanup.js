import { ref, get, remove, set, query, orderByChild, endAt } from 'firebase/database';
import { db } from '../firebase';

// Get yesterday's date in YYYY-MM-DD format
const getYesterdayDate = () => {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return yesterday.toISOString().slice(0, 10);
};

// Archive old rides (move them to archived_rides folder instead of deleting)
export const archiveOldRides = async () => {
  try {
    const yesterday = getYesterdayDate();
    
    // Query for rides with date <= yesterday
    const ridesRef = ref(db, 'list');
    const oldRidesQuery = query(
      ridesRef,
      orderByChild('date'),
      endAt(yesterday)
    );
    
    const snapshot = await get(oldRidesQuery);
    
    if (snapshot.exists()) {
      const oldRides = snapshot.val();
      const oldRideIds = Object.keys(oldRides);
      
      console.log(`Found ${oldRideIds.length} old rides to archive`);
      
      // Archive each old ride and then remove from active list
      const archivePromises = oldRideIds.map(async (rideId) => {
        const rideData = oldRides[rideId];
        // Add archive timestamp
        rideData.archivedAt = new Date().toISOString();
        rideData.originalId = rideId;
        
        // Save to archived_rides
        await set(ref(db, `archived_rides/${rideId}`), rideData);
        // Remove from active list
        await remove(ref(db, `list/${rideId}`));
      });
      
      await Promise.all(archivePromises);
      console.log(`Successfully archived ${oldRideIds.length} old rides`);
    } else {
      console.log('No old rides found to archive');
    }
  } catch (error) {
    console.error('Error archiving old rides:', error);
  }
};

// Archive old rides and return the count of archived rides
export const archiveOldRidesWithCount = async () => {
  try {
    const yesterday = getYesterdayDate();
    
    const ridesRef = ref(db, 'list');
    const oldRidesQuery = query(
      ridesRef,
      orderByChild('date'),
      endAt(yesterday)
    );
    
    const snapshot = await get(oldRidesQuery);
    
    if (snapshot.exists()) {
      const oldRides = snapshot.val();
      const oldRideIds = Object.keys(oldRides);
      
      // Archive each old ride and then remove from active list
      const archivePromises = oldRideIds.map(async (rideId) => {
        const rideData = oldRides[rideId];
        // Add archive timestamp
        rideData.archivedAt = new Date().toISOString();
        rideData.originalId = rideId;
        
        // Save to archived_rides
        await set(ref(db, `archived_rides/${rideId}`), rideData);
        // Remove from active list
        await remove(ref(db, `list/${rideId}`));
      });
      
      await Promise.all(archivePromises);
      return oldRideIds.length;
    }
    
    return 0;
  } catch (error) {
    console.error('Error archiving old rides:', error);
    return 0;
  }
};

// Get ride statistics (only from active rides)
export const getRideStats = async () => {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const yesterday = getYesterdayDate();
    
    const ridesRef = ref(db, 'list');
    
    // Get today's rides
    const todayQuery = query(
      ridesRef,
      orderByChild('date'),
      endAt(today)
    );
    
    // Get yesterday's rides
    const yesterdayQuery = query(
      ridesRef,
      orderByChild('date'),
      endAt(yesterday)
    );
    
    const [todaySnapshot, yesterdaySnapshot] = await Promise.all([
      get(todayQuery),
      get(yesterdayQuery)
    ]);
    
    const todayRides = todaySnapshot.exists() ? Object.keys(todaySnapshot.val()).length : 0;
    const yesterdayRides = yesterdaySnapshot.exists() ? Object.keys(yesterdaySnapshot.val()).length : 0;
    
    return {
      todayRides,
      yesterdayRides,
      totalRides: todayRides + yesterdayRides
    };
  } catch (error) {
    console.error('Error getting ride stats:', error);
    return { todayRides: 0, yesterdayRides: 0, totalRides: 0 };
  }
};

// Get archived rides statistics
export const getArchivedRideStats = async () => {
  try {
    const archivedRef = ref(db, 'archived_rides');
    const snapshot = await get(archivedRef);
    
    if (snapshot.exists()) {
      const archivedRides = snapshot.val();
      const totalArchived = Object.keys(archivedRides).length;
      
      // Count rides by month
      const monthlyStats = {};
      Object.values(archivedRides).forEach(ride => {
        if (ride.date) {
          const month = ride.date.substring(0, 7); // YYYY-MM
          monthlyStats[month] = (monthlyStats[month] || 0) + 1;
        }
      });
      
      return {
        totalArchived,
        monthlyStats
      };
    }
    
    return { totalArchived: 0, monthlyStats: {} };
  } catch (error) {
    console.error('Error getting archived ride stats:', error);
    return { totalArchived: 0, monthlyStats: {} };
  }
};

// Restore archived rides (for admin purposes)
export const restoreArchivedRides = async (rideIds) => {
  try {
    const restorePromises = rideIds.map(async (rideId) => {
      // Get archived ride
      const archivedRef = ref(db, `archived_rides/${rideId}`);
      const snapshot = await get(archivedRef);
      
      if (snapshot.exists()) {
        const rideData = snapshot.val();
        // Remove archive metadata
        delete rideData.archivedAt;
        delete rideData.originalId;
        
        // Restore to active list
        await set(ref(db, `list/${rideId}`), rideData);
        // Remove from archived
        await remove(ref(db, `archived_rides/${rideId}`));
      }
    });
    
    await Promise.all(restorePromises);
    console.log(`Successfully restored ${rideIds.length} rides`);
  } catch (error) {
    console.error('Error restoring archived rides:', error);
  }
}; 