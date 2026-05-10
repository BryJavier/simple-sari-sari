import { renderHook } from '@testing-library/react-native';
import * as RN from 'react-native';
import { TABLET_BREAKPOINT_DP, useIsTablet } from '@/utils/layout';

jest.mock('react-native', () => ({
  useWindowDimensions: jest.fn(),
}));

const mockedUseWindowDimensions = RN.useWindowDimensions as jest.MockedFunction<typeof RN.useWindowDimensions>;

describe('useIsTablet', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns false below the breakpoint', () => {
    mockedUseWindowDimensions.mockReturnValue({ width: TABLET_BREAKPOINT_DP - 1, height: 800, scale: 1, fontScale: 1 } as any);
    const { result } = renderHook(() => useIsTablet());
    expect(result.current).toBe(false);
  });

  it('returns true at the breakpoint', () => {
    mockedUseWindowDimensions.mockReturnValue({ width: TABLET_BREAKPOINT_DP, height: 800, scale: 1, fontScale: 1 } as any);
    const { result } = renderHook(() => useIsTablet());
    expect(result.current).toBe(true);
  });

  it('returns true above the breakpoint', () => {
    mockedUseWindowDimensions.mockReturnValue({ width: TABLET_BREAKPOINT_DP + 200, height: 800, scale: 1, fontScale: 1 } as any);
    const { result } = renderHook(() => useIsTablet());
    expect(result.current).toBe(true);
  });
});
