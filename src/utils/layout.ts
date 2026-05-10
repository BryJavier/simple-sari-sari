import { useWindowDimensions } from 'react-native';

export const TABLET_BREAKPOINT_DP = 720;

export function useIsTablet(): boolean {
  const { width } = useWindowDimensions();
  return width >= TABLET_BREAKPOINT_DP;
}
