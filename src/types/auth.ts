export type AuthProvider = 'password' | 'microsoft';

export type AppRole = 'employee' | 'hr' | 'superadmin';

export type ClinicAccessScope = 'assigned' | 'regional' | 'all-clinics';

export type AuthenticatedUser = {
  id: string;
  name: string;
  email: string;
  role: AppRole;
  jobTitle: string;
  homeClinicId?: string;
  assignedClinicIds: string[];
  accessScope: ClinicAccessScope;
};

export type SessionPayload = {
  accessToken: string;
  refreshToken?: string;
  provider: AuthProvider;
  user: AuthenticatedUser;
};