import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import * as Location from 'expo-location';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Button, Chip, Surface, Text, TextInput, useTheme } from 'react-native-paper';

import { AppMenuHeader } from '../components/navigation/app-menu-header';
import { OpenStreetMapView } from '../components/maps/openstreetmap-view';
import { MAX_BACKGROUND_GEOFENCE_REGIONS } from '../constants/clinics';
import { useClinicStore } from '../store/clinic-store';
import type { Clinic } from '../types/clinic';

type LocationSuggestion = {
  id: string;
  label: string;
  latitude: number;
  longitude: number;
};

const DEFAULT_DELTA = {
  latitudeDelta: 0.08,
  longitudeDelta: 0.08,
};

const toSuggestionLabel = (item: any) => {
  if (typeof item.display_name === 'string' && item.display_name.length > 0) {
    return item.display_name;
  }

  const address = item.address ?? {};
  return [address.name, address.road, address.suburb, address.city, address.state, address.country]
    .filter(Boolean)
    .join(', ');
};

const searchLocationSuggestions = async (query: string): Promise<LocationSuggestion[]> => {
  const response = await fetch(
    `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=6&countrycodes=ng&q=${encodeURIComponent(query)}`,
    {
      headers: {
        Accept: 'application/json',
        'Accept-Language': 'en-NG,en;q=0.8',
      },
    },
  );

  if (!response.ok) {
    throw new Error(`Location search failed with status ${response.status}`);
  }

  const data = (await response.json()) as any[];

  return data.map((item) => ({
    id: `${item.place_id}`,
    label: toSuggestionLabel(item),
    latitude: Number(item.lat),
    longitude: Number(item.lon),
  }));
};

export const SuperadminGeofenceControlScreen = () => {
  const theme = useTheme();
  const clinics = useClinicStore((state) => state.clinics);
  const updateClinicGeofence = useClinicStore((state) => state.updateClinicGeofence);
  const [clinicSearchQuery, setClinicSearchQuery] = useState('');
  const [locationSearchQuery, setLocationSearchQuery] = useState('');
  const [locationSuggestions, setLocationSuggestions] = useState<LocationSuggestion[]>([]);
  const [isSearchingLocations, setIsSearchingLocations] = useState(false);
  const [selectedClinicId, setSelectedClinicId] = useState(clinics[0]?.id ?? '');
  const [latitude, setLatitude] = useState(`${clinics[0]?.geofence.latitude ?? 6.5244}`);
  const [longitude, setLongitude] = useState(`${clinics[0]?.geofence.longitude ?? 3.3792}`);
  const [radius, setRadius] = useState(`${clinics[0]?.geofence.radiusMeters ?? 120}`);
  const [isResolvingCurrentLocation, setIsResolvingCurrentLocation] = useState(false);
  const [locationErrorMessage, setLocationErrorMessage] = useState<string | null>(null);

  const selectedClinic = clinics.find((clinic) => clinic.id === selectedClinicId) ?? clinics[0];

  const filteredClinics = useMemo(
    () =>
      clinics.filter((clinic) =>
        `${clinic.name} ${clinic.code} ${clinic.region} ${clinic.city}`
          .toLowerCase()
          .includes(clinicSearchQuery.trim().toLowerCase()),
      ),
    [clinicSearchQuery, clinics],
  );

  useEffect(() => {
    if (!selectedClinic) {
      return;
    }

    setLatitude(`${selectedClinic.geofence.latitude}`);
    setLongitude(`${selectedClinic.geofence.longitude}`);
    setRadius(`${selectedClinic.geofence.radiusMeters}`);
    setLocationSearchQuery(selectedClinic.address);
  }, [selectedClinic]);

  useEffect(() => {
    if (locationSearchQuery.trim().length < 3) {
      setLocationSuggestions([]);
      return;
    }

    let isCancelled = false;
    setIsSearchingLocations(true);

    const timer = setTimeout(() => {
      void searchLocationSuggestions(locationSearchQuery.trim())
        .then((results) => {
          if (!isCancelled) {
            setLocationSuggestions(results);
          }
        })
        .catch(() => {
          if (!isCancelled) {
            setLocationSuggestions([]);
          }
        })
        .finally(() => {
          if (!isCancelled) {
            setIsSearchingLocations(false);
          }
        });
    }, 320);

    return () => {
      isCancelled = true;
      clearTimeout(timer);
    };
  }, [locationSearchQuery]);

  const mapRegion = useMemo(
    () => ({
      latitude: Number(latitude) || selectedClinic?.geofence.latitude || 6.5244,
      longitude: Number(longitude) || selectedClinic?.geofence.longitude || 3.3792,
      ...DEFAULT_DELTA,
    }),
    [latitude, longitude, selectedClinic?.geofence.latitude, selectedClinic?.geofence.longitude],
  );

  const mapCircles = useMemo(
    () =>
      selectedClinic
        ? [
            {
              latitude: Number(latitude) || selectedClinic.geofence.latitude,
              longitude: Number(longitude) || selectedClinic.geofence.longitude,
              radius: Number(radius) || selectedClinic.geofence.radiusMeters,
            },
          ]
        : [],
    [latitude, longitude, radius, selectedClinic],
  );

  const mapMarkers = useMemo(
    () =>
      selectedClinic
        ? [
            {
              id: selectedClinic.id,
              latitude: Number(latitude) || selectedClinic.geofence.latitude,
              longitude: Number(longitude) || selectedClinic.geofence.longitude,
              title: selectedClinic.name,
              description: 'Drag this marker to update clinic coordinates',
              draggable: true,
              glyph: 'C',
            },
          ]
        : [],
    [latitude, longitude, selectedClinic],
  );

  const applyCoordinates = (nextLatitude: number, nextLongitude: number) => {
    setLatitude(nextLatitude.toFixed(6));
    setLongitude(nextLongitude.toFixed(6));
  };

  const handleMapPress = ({ latitude: nextLatitude, longitude: nextLongitude }: { latitude: number; longitude: number }) => {
    applyCoordinates(nextLatitude, nextLongitude);
  };

  const handleSuggestionSelect = (suggestion: LocationSuggestion) => {
    setLocationSearchQuery(suggestion.label);
    setLocationSuggestions([]);
    setLocationErrorMessage(null);
    applyCoordinates(suggestion.latitude, suggestion.longitude);
  };

  const handleUseCurrentLocation = async () => {
    setIsResolvingCurrentLocation(true);
    setLocationErrorMessage(null);

    try {
      const foregroundPermission = await Location.requestForegroundPermissionsAsync();

      if (foregroundPermission.status !== 'granted') {
        setLocationErrorMessage('Current location permission was not granted on this device.');
        return;
      }

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      applyCoordinates(position.coords.latitude, position.coords.longitude);
      setLocationSearchQuery('Current device location');
      setLocationSuggestions([]);
    } catch {
      setLocationErrorMessage('Unable to resolve current device location right now.');
    } finally {
      setIsResolvingCurrentLocation(false);
    }
  };

  const handleSave = () => {
    if (!selectedClinic) {
      return;
    }

    updateClinicGeofence(selectedClinic.id, {
      latitude: Number(latitude),
      longitude: Number(longitude),
      radiusMeters: Number(radius),
    });
  };

  return (
    <ScrollView style={{ backgroundColor: theme.colors.background }} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <AppMenuHeader
        eyebrow="Superadmin Geofence Control"
        title="Clinic geofence tuning"
        subtitle="Search a place live, drag the clinic marker, or tap anywhere on the map to set latitude and longitude instantly."
      />

      <Surface style={[styles.card, { backgroundColor: theme.colors.surface }]} elevation={1}>
        <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>Registration strategy</Text>
        <Text style={[styles.sectionCopy, { color: theme.colors.onSurfaceVariant }]}>iOS background monitoring is capped at {MAX_BACKGROUND_GEOFENCE_REGIONS} regions, so the app always keeps the home clinic pinned and fills the remaining slots with the nearest accessible clinics.</Text>
      </Surface>

      <Surface style={[styles.card, { backgroundColor: theme.colors.surface }]} elevation={1}>
        <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>Interactive geofence editor</Text>
        <Text style={[styles.sectionCopy, { color: theme.colors.onSurfaceVariant }]}>Select a clinic first, then refine its geofence directly on the map. Search supports live place lookup for faster clinic setup.</Text>

        <TextInput
          label="Search clinics"
          mode="outlined"
          value={clinicSearchQuery}
          onChangeText={setClinicSearchQuery}
          style={styles.inputSpacing}
        />

        <View style={styles.chipWrap}>
          {filteredClinics.map((clinic) => (
            <Chip
              key={clinic.id}
              selected={clinic.id === selectedClinic?.id}
              showSelectedOverlay
              onPress={() => {
                setSelectedClinicId(clinic.id);
              }}
            >
              {clinic.code}
            </Chip>
          ))}
        </View>

        {selectedClinic ? (
          <View style={[styles.rowCard, { backgroundColor: theme.colors.surfaceVariant }]}>
            <Text style={[styles.rowTitle, { color: theme.colors.onSurface }]}>{selectedClinic.name}</Text>
            <Text style={[styles.rowMeta, { color: theme.colors.onSurfaceVariant }]}>
              {selectedClinic.code} · {selectedClinic.region} · {selectedClinic.city}
            </Text>

            <TextInput
              label="Live location search"
              mode="outlined"
              value={locationSearchQuery}
              onChangeText={setLocationSearchQuery}
              right={<TextInput.Icon icon={isSearchingLocations ? 'loading' : 'magnify'} />}
              style={styles.inputSpacing}
            />

            <View style={styles.actionRow}>
              <Button
                icon="crosshairs-gps"
                mode="outlined"
                onPress={() => void handleUseCurrentLocation()}
                loading={isResolvingCurrentLocation}
              >
                Use my location
              </Button>
            </View>

            {locationErrorMessage ? <Text style={[styles.errorText, { color: theme.colors.error }]}>{locationErrorMessage}</Text> : null}

            {locationSuggestions.length > 0 ? (
              <View style={[styles.suggestionWrap, { borderColor: theme.colors.outlineVariant ?? theme.colors.outline }]}>
                {locationSuggestions.map((suggestion) => (
                  <Pressable key={suggestion.id} style={styles.suggestionItem} onPress={() => handleSuggestionSelect(suggestion)}>
                    <MaterialCommunityIcons color={theme.colors.primary} name="map-marker-outline" size={18} />
                    <Text style={[styles.suggestionLabel, { color: theme.colors.onSurface }]}>{suggestion.label}</Text>
                  </Pressable>
                ))}
              </View>
            ) : null}

            <Surface style={styles.mapSurface} elevation={0}>
              <OpenStreetMapView
                circles={mapCircles}
                initialRegion={mapRegion}
                interactive
                markers={mapMarkers}
                onMapPress={handleMapPress}
                onMarkerDragEnd={({ coordinate }) => applyCoordinates(coordinate.latitude, coordinate.longitude)}
                style={styles.map}
              />
            </Surface>

            <Text style={[styles.helperText, { color: theme.colors.onSurfaceVariant }]}>Tip: marker drag, map tap, aur live search tino same lat/long fields update karte hain.</Text>

            <View style={styles.formRow}>
              <TextInput label="Latitude" mode="outlined" value={latitude} onChangeText={setLatitude} style={styles.input} />
              <TextInput label="Longitude" mode="outlined" value={longitude} onChangeText={setLongitude} style={styles.input} />
            </View>

            <TextInput label="Radius (m)" mode="outlined" value={radius} onChangeText={setRadius} style={styles.inputSpacing} />

            <Button mode="contained-tonal" onPress={handleSave} style={styles.buttonSpacing}>
              Save geofence
            </Button>
          </View>
        ) : (
          <Text style={[styles.sectionCopy, { color: theme.colors.onSurfaceVariant }]}>No clinic matched your search.</Text>
        )}
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
  inputSpacing: {
    marginTop: 14,
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 14,
  },
  rowCard: {
    borderRadius: 22,
    gap: 8,
    marginTop: 18,
    padding: 16,
  },
  rowTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  rowMeta: {
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 18,
  },
  suggestionWrap: {
    borderRadius: 18,
    borderWidth: 1,
    marginTop: 10,
    overflow: 'hidden',
  },
  actionRow: {
    flexDirection: 'row',
    marginTop: 12,
  },
  suggestionItem: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  suggestionLabel: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
  },
  mapSurface: {
    borderRadius: 20,
    marginTop: 14,
    overflow: 'hidden',
  },
  map: {
    height: 280,
    width: '100%',
  },
  helperText: {
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 18,
    marginTop: 10,
  },
  errorText: {
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 18,
    marginTop: 10,
  },
  formRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  input: {
    flex: 1,
  },
  buttonSpacing: {
    marginTop: 14,
  },
});
