import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { get, post, setAuthToken, getAuthToken } from '@/lib/api/client';
import { LoadingScreen } from '@/components/shared/loading-screen';
import type { User, LoginRequest, LoginResponse, SignupRequest } from '@/types';

// Auth Context
interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (data: LoginRequest) => Promise<void>;
  signup: (data: SignupRequest) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Auth Provider
export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [isInitialized, setIsInitialized] = useState(false);

  // Fetch current user
  const { data: user, isLoading, refetch } = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: () => get<User>('/api/auth/me'),
    enabled: !!getAuthToken(),
    retry: false,
    staleTime: 1000 * 60 * 5,
  });

  // Initialize auth state
  useEffect(() => {
    const token = getAuthToken();
    if (!token) {
      setIsInitialized(true);
    } else {
      refetch().finally(() => setIsInitialized(true));
    }
  }, [refetch]);

  // Login mutation
  const loginMutation = useMutation({
    mutationFn: (data: LoginRequest) => post<LoginResponse>('/api/auth/login', data),
    onSuccess: (response) => {
      setAuthToken(response.access_token);
      queryClient.setQueryData(['auth', 'me'], response.user);
      toast.success('Welcome back!', {
        description: `Logged in as ${response.user.full_name}`,
      });
    },
    onError: (error: Error) => {
      toast.error('Login failed', {
        description: 'Invalid email or password',
      });
      throw error;
    },
  });

  // Signup mutation
  const signupMutation = useMutation({
    mutationFn: (data: SignupRequest) => post<LoginResponse>('/api/auth/signup', data),
    onSuccess: (response) => {
      setAuthToken(response.access_token);
      queryClient.setQueryData(['auth', 'me'], response.user);
      toast.success('Account created!', {
        description: 'Welcome to AI Receptionist',
      });
    },
    onError: (error: Error) => {
      toast.error('Signup failed', {
        description: 'Could not create account',
      });
      throw error;
    },
  });

  // Logout
  const logout = () => {
    setAuthToken(null);
    queryClient.clear();
    toast.info('Logged out', {
      description: 'See you next time!',
    });
  };

  const value: AuthContextType = {
    user: user || null,
    isLoading: !isInitialized || isLoading,
    isAuthenticated: !!user,
    login: async (data) => {
      await loginMutation.mutateAsync(data);
    },
    signup: async (data) => {
      await signupMutation.mutateAsync(data);
    },
    logout,
    refreshUser: async () => {
      await refetch();
    },
  };

  if (!isInitialized) {
    return <LoadingScreen />;
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// useAuth hook
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Auth Guard component
export function AuthGuard() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Redirect to onboarding if no business
  if (!user?.business_id && location.pathname !== '/onboarding') {
    return <Navigate to="/onboarding" replace />;
  }

  return <Outlet />;
}
