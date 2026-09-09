export type ClinicRegion =
  | 'Lagos Mainland'
  | 'Lagos Island'
  | 'Ikeja Corridor'
  | 'Lekki Axis'
  | 'Abuja'
  | 'Karachi'
  | 'Port Harcourt';

export type GeofenceConfiguration = {
  latitude: number;
  longitude: number;
  radiusMeters: number;
  notifyOnEnter: boolean;
  notifyOnExit: boolean;
};

export type Clinic = {
  id: string;
  code: string;
  name: string;
  region: ClinicRegion;
  city: string;
  address: string;
  managerName: string;
  staffCount: number;
  isActive: boolean;
  geofence: GeofenceConfiguration;
};

export type ClinicDraft = Omit<Clinic, 'id'>;