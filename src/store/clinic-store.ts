import { create } from 'zustand';

import { CLINIC_DIRECTORY } from '../constants/clinics';
import type { Clinic, ClinicDraft, GeofenceConfiguration } from '../types/clinic';

type ClinicState = {
  clinics: Clinic[];
  createClinic: (draft: ClinicDraft) => void;
  updateClinic: (clinicId: string, patch: Partial<Omit<Clinic, 'id' | 'geofence'>>) => void;
  updateClinicGeofence: (clinicId: string, geofence: Partial<GeofenceConfiguration>) => void;
  toggleClinicActive: (clinicId: string) => void;
};

const generateClinicId = (code: string) => `clinic-${code.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now()}`;

export const useClinicStore = create<ClinicState>((set) => ({
  clinics: CLINIC_DIRECTORY,
  createClinic: (draft) =>
    set((state) => ({
      clinics: [
        ...state.clinics,
        {
          ...draft,
          id: generateClinicId(draft.code),
        },
      ],
    })),
  updateClinic: (clinicId, patch) =>
    set((state) => ({
      clinics: state.clinics.map((clinic) => (clinic.id === clinicId ? { ...clinic, ...patch } : clinic)),
    })),
  updateClinicGeofence: (clinicId, geofence) =>
    set((state) => ({
      clinics: state.clinics.map((clinic) =>
        clinic.id === clinicId
          ? {
              ...clinic,
              geofence: {
                ...clinic.geofence,
                ...geofence,
              },
            }
          : clinic,
      ),
    })),
  toggleClinicActive: (clinicId) =>
    set((state) => ({
      clinics: state.clinics.map((clinic) =>
        clinic.id === clinicId
          ? {
              ...clinic,
              isActive: !clinic.isActive,
            }
          : clinic,
      ),
    })),
}));