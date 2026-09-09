import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Button, Chip, Surface, Text, TextInput, useTheme } from 'react-native-paper';

import { AppMenuHeader } from '../components/navigation/app-menu-header';
import { OpenStreetMapView } from '../components/maps/openstreetmap-view';
import { useClinicStore } from '../store/clinic-store';
import type { ClinicRegion } from '../types/clinic';

const EMPTY_FORM = {
  code: '',
  name: '',
  region: 'Lagos Mainland' as ClinicRegion,
  city: 'Lagos',
  address: '',
  managerName: '',
  staffCount: '18',
  latitude: '6.5244',
  longitude: '3.3792',
  radiusMeters: '120',
};

const DEFAULT_DELTA = {
  latitudeDelta: 0.08,
  longitudeDelta: 0.08,
};

export const SuperadminClinicManagementScreen = () => {
  const theme = useTheme();
  const router = useRouter();
  const clinics = useClinicStore((state) => state.clinics);
  const createClinic = useClinicStore((state) => state.createClinic);
  const updateClinic = useClinicStore((state) => state.updateClinic);
  const updateClinicGeofence = useClinicStore((state) => state.updateClinicGeofence);
  const toggleClinicActive = useClinicStore((state) => state.toggleClinicActive);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClinicId, setSelectedClinicId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const selectedClinic = clinics.find((clinic) => clinic.id === selectedClinicId);

  useEffect(() => {
    if (!selectedClinic) {
      setForm(EMPTY_FORM);
      return;
    }

    setForm({
      code: selectedClinic.code,
      name: selectedClinic.name,
      region: selectedClinic.region,
      city: selectedClinic.city,
      address: selectedClinic.address,
      managerName: selectedClinic.managerName,
      staffCount: `${selectedClinic.staffCount}`,
      latitude: `${selectedClinic.geofence.latitude}`,
      longitude: `${selectedClinic.geofence.longitude}`,
      radiusMeters: `${selectedClinic.geofence.radiusMeters}`,
    });
  }, [selectedClinic]);

  const filteredClinics = useMemo(
    () =>
      clinics.filter((clinic) =>
        `${clinic.name} ${clinic.code} ${clinic.region} ${clinic.city}`.toLowerCase().includes(searchQuery.trim().toLowerCase()),
      ),
    [clinics, searchQuery],
  );

  const activeClinicCount = clinics.filter((clinic) => clinic.isActive).length;

  const mapRegion = useMemo(
    () => ({
      latitude: Number(form.latitude) || 6.5244,
      longitude: Number(form.longitude) || 3.3792,
      ...DEFAULT_DELTA,
    }),
    [form.latitude, form.longitude],
  );

  const mapCircles = useMemo(
    () => [
      {
        latitude: Number(form.latitude) || 6.5244,
        longitude: Number(form.longitude) || 3.3792,
        radius: Number(form.radiusMeters) || 120,
      },
    ],
    [form.latitude, form.longitude, form.radiusMeters],
  );

  const mapMarkers = useMemo(
    () => [
      {
        id: selectedClinicId ?? 'new-clinic',
        latitude: Number(form.latitude) || 6.5244,
        longitude: Number(form.longitude) || 3.3792,
        title: selectedClinic?.name ?? 'Clinic location',
        description: 'Drag this marker to place the clinic',
        draggable: true,
        glyph: 'C',
      },
    ],
    [form.latitude, form.longitude, selectedClinic?.name, selectedClinicId],
  );

  const updateFormField = (field: keyof typeof EMPTY_FORM, value: string) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const applyCoordinates = (latitude: number, longitude: number) => {
    setForm((current) => ({
      ...current,
      latitude: latitude.toFixed(6),
      longitude: longitude.toFixed(6),
    }));
  };

  const handleMapPress = ({ latitude, longitude }: { latitude: number; longitude: number }) => {
    applyCoordinates(latitude, longitude);
  };

  const resetForm = () => {
    setSelectedClinicId(null);
    setForm(EMPTY_FORM);
  };

  const handleSubmit = () => {
    const geofence = {
      latitude: Number(form.latitude),
      longitude: Number(form.longitude),
      radiusMeters: Number(form.radiusMeters),
      notifyOnEnter: true,
      notifyOnExit: true,
    };

    if (selectedClinicId) {
      updateClinic(selectedClinicId, {
        code: form.code.trim(),
        name: form.name.trim(),
        region: form.region,
        city: form.city.trim(),
        address: form.address.trim(),
        managerName: form.managerName.trim(),
        staffCount: Number(form.staffCount),
      });
      updateClinicGeofence(selectedClinicId, geofence);
      resetForm();
      return;
    }

    createClinic({
      code: form.code.trim(),
      name: form.name.trim(),
      region: form.region,
      city: form.city.trim(),
      address: form.address.trim(),
      managerName: form.managerName.trim(),
      staffCount: Number(form.staffCount),
      isActive: true,
      geofence,
    });
    resetForm();
  };

  return (
    <ScrollView style={{ backgroundColor: theme.colors.background }} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <AppMenuHeader
        eyebrow="Superadmin Clinic Management"
        title="Enterprise clinic directory"
        subtitle="Create, activate, and maintain all clinic locations from one administration workspace."
      />

      <View style={styles.summaryRow}>
        <Surface style={[styles.summaryCard, { backgroundColor: theme.colors.primaryContainer }]} elevation={0}>
          <Text style={[styles.summaryLabel, { color: theme.colors.onSurfaceVariant }]}>Total clinics</Text>
          <Text style={[styles.summaryValue, { color: theme.colors.onSurface }]}>{clinics.length}</Text>
        </Surface>
        <Surface style={[styles.summaryCard, { backgroundColor: theme.colors.secondaryContainer }]} elevation={0}>
          <Text style={[styles.summaryLabel, { color: theme.colors.onSurfaceVariant }]}>Active locations</Text>
          <Text style={[styles.summaryValue, { color: theme.colors.onSurface }]}>{activeClinicCount}</Text>
        </Surface>
      </View>

      <Surface style={[styles.card, { backgroundColor: theme.colors.surface }]} elevation={1}>
        <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>{selectedClinicId ? 'Update clinic' : 'Create clinic'}</Text>
        <Text style={[styles.sectionCopy, { color: theme.colors.onSurfaceVariant }]}>Superadmin can onboard new clinics and update key operational metadata without leaving the mobile workspace.</Text>

        <View style={styles.formRow}>
          <TextInput label="Clinic code" mode="outlined" value={form.code} onChangeText={(value) => updateFormField('code', value)} style={styles.input} />
          <TextInput label="Region" mode="outlined" value={form.region} onChangeText={(value) => updateFormField('region', value)} style={styles.input} />
        </View>

        <TextInput label="Clinic name" mode="outlined" value={form.name} onChangeText={(value) => updateFormField('name', value)} style={styles.inputSpacing} />
        <TextInput label="City" mode="outlined" value={form.city} onChangeText={(value) => updateFormField('city', value)} style={styles.inputSpacing} />
        <TextInput label="Address" mode="outlined" value={form.address} onChangeText={(value) => updateFormField('address', value)} style={styles.inputSpacing} />
        <TextInput label="Clinic manager" mode="outlined" value={form.managerName} onChangeText={(value) => updateFormField('managerName', value)} style={styles.inputSpacing} />

        <View style={styles.formRow}>
          <TextInput label="Staff count" mode="outlined" value={form.staffCount} onChangeText={(value) => updateFormField('staffCount', value)} style={styles.input} />
          <TextInput label="Radius (m)" mode="outlined" value={form.radiusMeters} onChangeText={(value) => updateFormField('radiusMeters', value)} style={styles.input} />
        </View>

        <View style={styles.formRow}>
          <TextInput label="Latitude" mode="outlined" value={form.latitude} onChangeText={(value) => updateFormField('latitude', value)} style={styles.input} />
          <TextInput label="Longitude" mode="outlined" value={form.longitude} onChangeText={(value) => updateFormField('longitude', value)} style={styles.input} />
        </View>

        <Surface style={[styles.mapCard, { backgroundColor: theme.colors.surfaceVariant }]} elevation={0}>
          <View style={styles.mapHeaderRow}>
            <View style={styles.mapCopy}>
              <Text style={[styles.mapTitle, { color: theme.colors.onSurface }]}>Clinic map placement</Text>
              <Text style={[styles.rowMeta, { color: theme.colors.onSurfaceVariant }]}>Marker drag ya map tap se latitude aur longitude yahin update honge.</Text>
            </View>
            <Button mode="text" onPress={() => router.push('/superadmin-geofence-control')}>Full editor</Button>
          </View>

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
        </Surface>

        <View style={styles.buttonRow}>
          <Button mode="contained" onPress={handleSubmit}>{selectedClinicId ? 'Save updates' : 'Create clinic'}</Button>
          <Button mode="outlined" onPress={resetForm}>Clear</Button>
        </View>
      </Surface>

      <Surface style={[styles.card, { backgroundColor: theme.colors.surface }]} elevation={1}>
        <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>Clinic list</Text>
        <TextInput label="Search clinics" mode="outlined" value={searchQuery} onChangeText={setSearchQuery} style={styles.inputSpacing} />

        <View style={styles.listWrap}>
          {filteredClinics.map((clinic) => (
            <View key={clinic.id} style={[styles.rowCard, { backgroundColor: theme.colors.surfaceVariant }]}>
              <View style={styles.rowHeader}>
                <View style={styles.rowCopy}>
                  <Text style={[styles.rowTitle, { color: theme.colors.onSurface }]}>{clinic.name}</Text>
                  <Text style={[styles.rowMeta, { color: theme.colors.onSurfaceVariant }]}>{clinic.code} · {clinic.region} · {clinic.city}</Text>
                </View>
                <Chip compact>{clinic.isActive ? 'Active' : 'Inactive'}</Chip>
              </View>

              <Text style={[styles.rowMeta, { color: theme.colors.onSurfaceVariant }]}>{clinic.address}</Text>
              <Text style={[styles.rowMeta, { color: theme.colors.onSurfaceVariant }]}>Manager: {clinic.managerName} · Staff: {clinic.staffCount}</Text>

              <View style={styles.buttonRow}>
                <Button mode="contained-tonal" onPress={() => setSelectedClinicId(clinic.id)}>Edit</Button>
                <Button mode="outlined" onPress={() => toggleClinicActive(clinic.id)}>{clinic.isActive ? 'Deactivate' : 'Activate'}</Button>
              </View>
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
  summaryRow: {
    flexDirection: 'row',
    gap: 12,
  },
  summaryCard: {
    borderRadius: 22,
    flex: 1,
    padding: 16,
  },
  summaryLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  summaryValue: {
    fontSize: 28,
    fontWeight: '700',
    marginTop: 6,
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
  formRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 14,
  },
  input: {
    flex: 1,
  },
  inputSpacing: {
    marginTop: 14,
  },
  mapCard: {
    borderRadius: 22,
    gap: 12,
    marginTop: 16,
    padding: 14,
  },
  mapHeaderRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
  },
  mapCopy: {
    flex: 1,
    gap: 4,
  },
  mapTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  mapSurface: {
    borderRadius: 18,
    overflow: 'hidden',
  },
  map: {
    height: 220,
    width: '100%',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
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
  },
});