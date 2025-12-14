// Set up environment variables
process.env.EXPO_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';

// Mock expo modules
jest.mock('expo-router', () => ({
  router: {
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  },
  useLocalSearchParams: jest.fn(() => ({})),
  usePathname: jest.fn(() => '/'),
}));

jest.mock('expo-font');
jest.mock('expo-asset');
jest.mock('expo-constants', () => ({
  expoConfig: {
    extra: {
      feedbackFormUrl: 'https://test.com',
    },
  },
}));

// Mock expo winter
global.__ExpoImportMetaRegistry = {
  register: jest.fn(),
  get: jest.fn(),
};

// Mock structuredClone
global.structuredClone = (val) => JSON.parse(JSON.stringify(val));

// Mock native modules
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('@react-navigation/native', () => ({
  useIsFocused: () => true,
  useNavigation: () => ({
    navigate: jest.fn(),
    goBack: jest.fn(),
  }),
}));

// Mock Skia
jest.mock('@shopify/react-native-skia', () => ({
  Canvas: 'Canvas',
  RoundedRect: 'RoundedRect',
  Shader: 'Shader',
  useClock: () => ({ value: 0 }),
  vec: jest.fn(),
  Skia: {
    RuntimeEffect: {
      Make: jest.fn(),
    },
  },
}));

// Mock expo-glass-effect
jest.mock('expo-glass-effect', () => ({
  GlassView: 'GlassView',
  isLiquidGlassAvailable: () => false,
}));

// Mock expo-blur
jest.mock('expo-blur', () => ({
  BlurView: 'BlurView',
}));

// Mock Sentry
jest.mock('@sentry/react-native', () => ({
  init: jest.fn(),
  captureException: jest.fn(),
  captureMessage: jest.fn(),
  setUser: jest.fn(),
  setContext: jest.fn(),
  addBreadcrumb: jest.fn(),
}));

