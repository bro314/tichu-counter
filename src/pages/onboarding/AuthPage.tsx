import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Alert from '@mui/material/Alert';
import GoogleIcon from '@mui/icons-material/Google';
import { useAuth } from '../../contexts/AuthContext';
import { gradients } from '../../styles/tokens';

interface AuthPageProps {
  onAuthSuccess: () => void;
}

const AuthPage = ({ onAuthSuccess }: AuthPageProps) => {
  const { t } = useTranslation();
  const { signIn, signUp, signInWithGoogle } = useAuth();

  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (isSignUp && password !== confirmPassword) {
      setError(t('auth.errorPasswordMismatch'));
      return;
    }

    if (password.length < 6) {
      setError(t('auth.errorPasswordTooShort'));
      return;
    }

    setLoading(true);
    try {
      if (isSignUp) {
        await signUp(email, password);
      } else {
        await signIn(email, password);
      }
      onAuthSuccess();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t('auth.errorAuthFailed');
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setError(null);
    setLoading(true);
    try {
      await signInWithGoogle();
      onAuthSuccess();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t('auth.errorGoogleFailed');
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100%',
        px: 3,
        maxWidth: 480,
        mx: 'auto',
      }}
    >
      {/* Header */}
      <Typography
        variant="h3"
        sx={{
          mb: 1,
          fontWeight: 800,
          background: gradients.authLogo,
          backgroundClip: 'text',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        }}
      >
        🀄
      </Typography>
      <Typography variant="h5" sx={{ mb: 0.5, fontWeight: 700 }}>
        Tichu Counter
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
        {t('onboarding.welcome')}
      </Typography>

      {/* Error alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 2, width: '100%' }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Google sign-in */}
      <Button
        id="google-sign-in-btn"
        variant="outlined"
        size="large"
        fullWidth
        startIcon={<GoogleIcon />}
        onClick={handleGoogleAuth}
        disabled={loading}
        sx={{
          py: 1.3,
          mb: 2,
          borderColor: 'divider',
          color: 'text.primary',
          '&:hover': {
            borderColor: 'primary.main',
            bgcolor: 'action.hover',
          },
        }}
      >
        {t('auth.googleSignIn')}
      </Button>

      {/* Divider */}
      <Divider sx={{ width: '100%', mb: 2 }}>
        <Typography variant="body2" color="text.secondary">
          {t('auth.orDivider')}
        </Typography>
      </Divider>

      {/* Email/Password form */}
      <Box
        component="form"
        onSubmit={handleEmailAuth}
        sx={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 2 }}
      >
        <TextField
          id="email-input"
          label={t('auth.email')}
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          fullWidth
          autoComplete="email"
        />
        <TextField
          id="password-input"
          label={t('auth.password')}
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          fullWidth
          autoComplete={isSignUp ? 'new-password' : 'current-password'}
        />
        {isSignUp && (
          <TextField
            id="confirm-password-input"
            label={t('auth.confirmPassword')}
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            fullWidth
            autoComplete="new-password"
          />
        )}
        <Button
          id="email-auth-btn"
          type="submit"
          variant="contained"
          size="large"
          fullWidth
          disabled={loading}
          sx={{ py: 1.3 }}
        >
          {isSignUp ? t('auth.signUp') : t('auth.signIn')}
        </Button>
      </Box>

      {/* Toggle sign in / sign up */}
      <Box sx={{ mt: 3, display: 'flex', alignItems: 'center', gap: 0.5 }}>
        <Typography variant="body2" color="text.secondary">
          {isSignUp ? t('auth.hasAccount') : t('auth.noAccount')}
        </Typography>
        <Button
          id="toggle-auth-mode-btn"
          size="small"
          onClick={() => {
            setIsSignUp(!isSignUp);
            setError(null);
          }}
        >
          {isSignUp ? t('auth.signIn') : t('auth.signUp')}
        </Button>
      </Box>
    </Box>
  );
};

export default AuthPage;
