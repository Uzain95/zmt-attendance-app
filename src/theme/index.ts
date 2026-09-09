import { MD3DarkTheme, MD3LightTheme, type MD3Theme } from 'react-native-paper';

// The refreshed palette replaces the older dark green accents with the lighter teal and blue direction requested for the updated ZMT brand.
export const zmtPalette = {
  teal: '#54B9B2',
  tealDeep: '#379C95',
  tealSoft: '#DDF5F2',
  blue: '#A8C9F4',
  blueSoft: '#DCEBFF',
  blueMist: '#EEF5FF',
  canvas: '#F4FAFB',
  surface: '#FFFFFF',
  surfaceSoft: '#F7FBFC',
  ink: '#17363E',
  inkSoft: '#5F7880',
  line: '#C7DAE1',
  warning: '#F2B56C',
  danger: '#E07A7A',
  darkCanvas: '#0F1F24',
  darkSurface: '#173039',
  darkLine: '#40616A',
};

const sharedTheme = {
  roundness: 8,
};

export const zmtLightTheme: MD3Theme = {
  ...MD3LightTheme,
  ...sharedTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: zmtPalette.tealDeep,
    onPrimary: '#F8FFFF',
    primaryContainer: zmtPalette.tealSoft,
    onPrimaryContainer: zmtPalette.ink,
    secondary: zmtPalette.blue,
    onSecondary: zmtPalette.ink,
    secondaryContainer: zmtPalette.blueSoft,
    onSecondaryContainer: zmtPalette.ink,
    tertiary: zmtPalette.warning,
    onTertiary: zmtPalette.ink,
    tertiaryContainer: '#FFF2DD',
    onTertiaryContainer: zmtPalette.ink,
    background: zmtPalette.canvas,
    surface: zmtPalette.surface,
    surfaceVariant: zmtPalette.surfaceSoft,
    outline: zmtPalette.line,
    outlineVariant: '#DCE8EC',
    onSurface: zmtPalette.ink,
    onSurfaceVariant: zmtPalette.inkSoft,
    error: zmtPalette.danger,
  },
};

export const zmtDarkTheme: MD3Theme = {
  ...MD3DarkTheme,
  ...sharedTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: '#86D9D3',
    onPrimary: '#0E262B',
    primaryContainer: '#1E5A59',
    onPrimaryContainer: '#DDF5F2',
    secondary: '#C1DAFF',
    onSecondary: '#162833',
    secondaryContainer: '#244561',
    onSecondaryContainer: '#E3F0FF',
    tertiary: '#F2C38B',
    onTertiary: '#2D1C0A',
    tertiaryContainer: '#5E4521',
    onTertiaryContainer: '#FFE7C2',
    background: zmtPalette.darkCanvas,
    surface: zmtPalette.darkSurface,
    surfaceVariant: '#1F3942',
    outline: zmtPalette.darkLine,
    outlineVariant: '#294851',
    onSurface: '#EDF6F7',
    onSurfaceVariant: '#B9CFD4',
    error: '#FFB8B8',
  },
};