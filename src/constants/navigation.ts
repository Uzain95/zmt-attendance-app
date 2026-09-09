import type { Href } from 'expo-router';

import type { AppRole } from '../types/auth';

export type AppRouteName =
  | 'dashboard'
  | 'attendance-calendar'
  | 'leave-management'
  | 'profile-settings'
  | 'hr-attendance-overview'
  | 'hr-leave-anomalies'
  | 'active-field-visits-map'
  | 'superadmin-clinic-management'
  | 'superadmin-geofence-control';

export type RoleMenuItem = {
  route: AppRouteName;
  label: string;
  description: string;
  icon: string;
};

export const ROLE_LABELS: Record<AppRole, string> = {
  employee: 'Employee',
  hr: 'HR',
  superadmin: 'Superadmin',
};

export const MENU_BY_ROLE: Record<AppRole, RoleMenuItem[]> = {
  employee: [
    {
      route: 'dashboard',
      label: 'Dashboard',
      description: 'Daily attendance, shift state, and field visits.',
      icon: 'view-dashboard-outline',
    },
    {
      route: 'attendance-calendar',
      label: 'Attendance Calendar',
      description: 'Personal check-in history and monthly view.',
      icon: 'calendar-month-outline',
    },
    {
      route: 'leave-management',
      label: 'Leave Management',
      description: 'Submit and monitor leave requests.',
      icon: 'file-document-edit-outline',
    },
    {
      route: 'profile-settings',
      label: 'Profile & Settings',
      description: 'Permissions, sync health, and account controls.',
      icon: 'cog-outline',
    },
  ],
  hr: [
    {
      route: 'dashboard',
      label: 'My Attendance',
      description: 'Personal check-in, checkout, and field visit controls.',
      icon: 'view-dashboard-outline',
    },
    {
      route: 'attendance-calendar',
      label: 'My Attendance Calendar',
      description: 'Review your own attendance history and monthly timeline.',
      icon: 'calendar-month-outline',
    },
    {
      route: 'leave-management',
      label: 'My Leave',
      description: 'Submit and track your own leave requests.',
      icon: 'file-document-edit-outline',
    },
    {
      route: 'hr-attendance-overview',
      label: 'HR Attendance Overview',
      description: 'Clinic staffing, attendance health, and leave load.',
      icon: 'chart-box-outline',
    },
    {
      route: 'hr-leave-anomalies',
      label: 'Leave & Anomalies',
      description: 'Review attendance exceptions and pending leave.',
      icon: 'clipboard-alert-outline',
    },
    {
      route: 'active-field-visits-map',
      label: 'Active Field Visits Map',
      description: 'Track travelers live and watch audit progress by clinic.',
      icon: 'map-search-outline',
    },
    {
      route: 'profile-settings',
      label: 'Profile & Settings',
      description: 'Access scope, sync health, and account controls.',
      icon: 'cog-outline',
    },
  ],
  superadmin: [
    {
      route: 'active-field-visits-map',
      label: 'Active Field Visits Map',
      description: 'Observe field travelers and ongoing audits across clinics.',
      icon: 'map-search-outline',
    },
    {
      route: 'superadmin-clinic-management',
      label: 'Clinic Management',
      description: 'Create, activate, and maintain 33 clinic locations.',
      icon: 'hospital-building',
    },
    {
      route: 'superadmin-geofence-control',
      label: 'Geofence Control',
      description: 'Tune clinic coordinates and geofence radius.',
      icon: 'map-marker-radius-outline',
    },
    {
      route: 'profile-settings',
      label: 'Profile & Settings',
      description: 'Access scope, sync health, and account controls.',
      icon: 'cog-outline',
    },
  ],
};

export const DEFAULT_ROUTE_BY_ROLE: Record<AppRole, AppRouteName> = {
  employee: 'dashboard',
  hr: 'dashboard',
  superadmin: 'superadmin-clinic-management',
};

export const getMenuItemsForRole = (role: AppRole) => MENU_BY_ROLE[role];

export const getDefaultRouteForRole = (role: AppRole) => DEFAULT_ROUTE_BY_ROLE[role];

export const isRouteAllowedForRole = (role: AppRole, routeName: string) =>
  MENU_BY_ROLE[role].some((item) => item.route === routeName);

export const getAppRoutePath = (routeName: AppRouteName) => (`/(app)/${routeName}` as Href);