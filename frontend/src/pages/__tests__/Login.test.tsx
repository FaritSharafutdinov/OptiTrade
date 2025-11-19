import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import Login from '../Login';
import * as authModule from '../../lib/auth';
import * as authContext from '../../components/AuthContext';

vi.mock('../../lib/auth', () => ({
  signIn: vi.fn(),
  signUp: vi.fn(),
}));

vi.mock('../../components/AuthContext', () => {
  const actual = vi.importActual<typeof authContext>('../../components/AuthContext');
  return {
    ...actual,
    useAuth: () => ({
      loginAsDemo: vi.fn(),
    }),
  };
});

function renderLogin() {
  return render(
    <BrowserRouter>
      <Login />
    </BrowserRouter>
  );
}

describe('Login page', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('validates email and password', async () => {
    renderLogin();

    const [submit] = screen.getAllByRole('button', { name: /войти/i });
    fireEvent.click(submit);

    expect(await screen.findByText(/Email обязателен/i)).toBeInTheDocument();
    expect(await screen.findByText(/Пароль должен содержать минимум 6 символов/i)).toBeInTheDocument();
  });

  it('calls signIn with provided credentials', async () => {
    const signInSpy = vi.spyOn(authModule, 'signIn').mockResolvedValue({} as never);
    renderLogin();

    fireEvent.input(screen.getByPlaceholderText(/your@email/i), {
      target: { value: 'user@example.com' },
    });
    fireEvent.input(screen.getByPlaceholderText(/••••••••/), {
      target: { value: 'password' },
    });

    const [submit] = screen.getAllByRole('button', { name: /войти/i });
    fireEvent.click(submit);

    await waitFor(() =>
      expect(signInSpy).toHaveBeenCalledWith('user@example.com', 'password')
    );
  });
});

