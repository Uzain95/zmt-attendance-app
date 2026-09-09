import { createContext, useContext } from 'react';

type AppNavigationContextValue = {
  closeMenu: () => void;
  openMenu: () => void;
};

const noop = () => undefined;

const AppNavigationContext = createContext<AppNavigationContextValue>({
  closeMenu: noop,
  openMenu: noop,
});

export const AppNavigationProvider = AppNavigationContext.Provider;

export const useAppNavigationMenu = () => useContext(AppNavigationContext);