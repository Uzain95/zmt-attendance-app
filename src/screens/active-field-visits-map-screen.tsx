import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useEffect, useMemo } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Surface, Text, useTheme } from 'react-native-paper';

import { AppMenuHeader } from '../components/navigation/app-menu-header';
import { OpenStreetMapView } from '../components/maps/openstreetmap-view';
import { CLINIC_DIRECTORY } from '../constants/clinics';
import { ensureMockFieldVisitSimulation } from '../services/realtime/field-visit-realtime';
import { useAttendanceStore } from '../store/attendance-store';

const formatMinutes = (minutes?: number) => {
  if (!minutes) {
    return '0 mins';
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (hours === 0) {
    return `${remainingMinutes} mins`;
  }

  return `${hours}h ${remainingMinutes}m`;
};

export const ActiveFieldVisitsMapScreen = () => {
  const theme = useTheme();
  const liveFieldVisitSnapshots = useAttendanceStore((state) => state.liveFieldVisitSnapshots);

  useEffect(() => {
    const stopSimulation = ensureMockFieldVisitSimulation();
    return stopSimulation;
  }, []);

  const initialRegion = useMemo(() => {
    const latitudes = CLINIC_DIRECTORY.map((clinic) => clinic.geofence.latitude);
    const longitudes = CLINIC_DIRECTORY.map((clinic) => clinic.geofence.longitude);

    return {
      latitude: latitudes.reduce((sum, value) => sum + value, 0) / latitudes.length,
      latitudeDelta: 6.5,
      longitude: longitudes.reduce((sum, value) => sum + value, 0) / longitudes.length,
      longitudeDelta: 6.5,
    };
  }, []);

  const mapMarkers = useMemo(
    () => [
      ...CLINIC_DIRECTORY.map((clinic) => ({
        id: clinic.id,
        latitude: clinic.geofence.latitude,
        longitude: clinic.geofence.longitude,
        title: clinic.name,
        description: `${clinic.region} · ${clinic.city}`,
        color: theme.colors.primary,
        glyph: 'C',
      })),
      ...liveFieldVisitSnapshots.map((traveler) => ({
        id: traveler.employeeId,
        latitude: traveler.currentLocation.latitude,
        longitude: traveler.currentLocation.longitude,
        title: traveler.employeeName,
        description:
          traveler.status === 'auditing'
            ? `Auditing ${traveler.currentClinicName}`
            : `En route to ${traveler.destinationClinicName}`,
        color: traveler.status === 'auditing' ? theme.colors.secondary : theme.colors.tertiary,
        glyph: traveler.status === 'auditing' ? 'A' : 'R',
      })),
    ],
    [liveFieldVisitSnapshots, theme.colors.primary, theme.colors.secondary, theme.colors.tertiary],
  );

  const mapPolylines = useMemo(
    () =>
      liveFieldVisitSnapshots
        .filter((traveler) => traveler.routeTrail.length > 1)
        .map((traveler) => ({
          id: `${traveler.employeeId}-trail`,
          coordinates: traveler.routeTrail.map((point) => ({ latitude: point.latitude, longitude: point.longitude })),
          dashed: traveler.status !== 'auditing',
          color: traveler.status === 'auditing' ? theme.colors.secondary : theme.colors.tertiary,
        })),
    [liveFieldVisitSnapshots, theme.colors.secondary, theme.colors.tertiary],
  );

  return (
    <ScrollView style={{ backgroundColor: theme.colors.background }} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <AppMenuHeader
        eyebrow="Active Field Visits Map"
        title="Live travel and audit map"
        subtitle="HR and Superadmin can monitor active travelers, clinic destinations, and ongoing audit durations in real time."
      />

      <Surface style={[styles.mapCard, { backgroundColor: theme.colors.surface }]} elevation={1}>
        <OpenStreetMapView
          initialRegion={initialRegion}
          markers={mapMarkers}
          polylines={mapPolylines}
          style={styles.map}
        />
      </Surface>

      <Surface style={[styles.card, { backgroundColor: theme.colors.surface }]} elevation={1}>
        <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>Active travelers</Text>
        <Text style={[styles.sectionCopy, { color: theme.colors.onSurfaceVariant }]}>The map consumes the mocked real-time field visit stream. Continuous background updates from the employee app publish into the same store shape.</Text>

        <View style={styles.listWrap}>
          {liveFieldVisitSnapshots.map((traveler) => (
            <View key={traveler.employeeId} style={[styles.rowCard, { backgroundColor: theme.colors.surfaceVariant }]}>
              <View style={styles.rowHeader}>
                <View style={styles.rowCopy}>
                  <Text style={[styles.rowTitle, { color: theme.colors.onSurface }]}>{traveler.employeeName}</Text>
                  <Text style={[styles.rowMeta, { color: theme.colors.onSurfaceVariant }]}>{traveler.employeeRole}</Text>
                </View>
                <Text style={[styles.rowBadge, { color: traveler.status === 'auditing' ? theme.colors.secondary : theme.colors.primary }]}>
                  {traveler.status === 'auditing' ? 'Auditing' : 'En route'}
                </Text>
              </View>

              <Text style={[styles.rowNote, { color: theme.colors.onSurface }]}>Destination: {traveler.destinationClinicName}</Text>
              <Text style={[styles.rowMeta, { color: theme.colors.onSurfaceVariant }]}>
                {traveler.status === 'auditing'
                  ? `Currently auditing ${traveler.currentClinicName} for ${formatMinutes(traveler.activeAuditSession?.durationMinutes)}`
                  : `En route to ${traveler.destinationClinicName}`}
              </Text>
              <Text style={[styles.rowMeta, { color: theme.colors.onSurfaceVariant }]}>Realtime path: {traveler.realtimePath}</Text>
            </View>
          ))}
        </View>
      </Surface>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  content: {
    gap: 18,
    padding: 18,
    paddingBottom: 32,
  },
  mapCard: {
    borderRadius: 24,
    overflow: 'hidden',
  },
  map: {
    height: 360,
    width: '100%',
  },
  card: {
    borderRadius: 24,
    padding: 18,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
  },
  sectionCopy: {
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 22,
    marginTop: 6,
  },
  listWrap: {
    gap: 12,
    marginTop: 18,
  },
  rowCard: {
    borderRadius: 22,
    gap: 8,
    padding: 16,
  },
  rowHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
  },
  rowCopy: {
    flex: 1,
  },
  rowTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  rowMeta: {
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 18,
    marginTop: 2,
  },
  rowNote: {
    fontSize: 13,
    fontWeight: '600',
  },
  rowBadge: {
    fontSize: 13,
    fontWeight: '700',
  },
});