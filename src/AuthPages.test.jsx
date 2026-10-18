import { afterEach, expect, test, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LoginPage } from './AuthPages';

afterEach(() => {
  vi.unstubAllEnvs();
});

test('shows username and password sign-in without Google when Google is not configured', () => {
  vi.stubEnv('VITE_GOOGLE_CLIENT_ID', '');

  render(<LoginPage onLoginSuccess={() => {}} onForgotPassword={() => {}} />);

  expect(screen.getByLabelText('Username')).toBeDefined();
  expect(screen.getByLabelText('Password')).toBeDefined();
  expect(screen.queryByText(/continue with google/i)).toBeNull();
});
