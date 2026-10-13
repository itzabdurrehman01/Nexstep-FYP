import { expect, vi } from 'vitest';
import * as matchers from '@testing-library/jest-dom/matchers';

expect.extend(matchers);

vi.mock('@clerk/react', () => ({
  useAuth: () => ({ isLoaded: true, isSignedIn: false, userId: null, getToken: async () => null }),
  useClerk: () => ({ signOut: async () => {}, openSignIn: () => {}, openSignUp: () => {}, openUserProfile: () => {}, user: null }),
  useUser: () => ({ user: null }),
  ClerkProvider: ({ children }) => children,
  useSignIn: () => ({ signIn: null }),
  useSignUp: () => ({ signUp: null }),
}));
