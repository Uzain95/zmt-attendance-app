export const ATTENDANCE_POLICY = {
  officialStartHour: 9,
  officialStartMinute: 0,
  lateGraceMinutes: 5,
  monthlyLateLeaveDivisor: 3,
  punchRules: {
    earlyOutWindowEnd: '16:59',
    halfDayStart: '11:01',
    halfShortStart: '13:01',
    lateStart: '09:16',
    shortLeaveEveningStart: '15:01',
    shortLeaveMorningStart: '10:01',
  },
};

export const PERMISSION_RATIONALE = {
  title: 'Enable clinic-aware attendance',
  body:
    'ZMT uses background location geofences to automatically log check-ins and check-outs when you arrive at or leave your assigned clinics. When a user has access to more clinics than the operating system allows in the background, the app keeps the nearest and assigned clinics active first.',
  geofenceHint:
    'Field Visit mode pauses false automatic check-outs while an employee travels between clinic locations.',
};