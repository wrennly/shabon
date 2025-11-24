// src/LoginScreen.tsx

import React, { useState } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import apiClient, { authService } from '../api';
import {
  Box,
  Button,
  TextField,
  Container,
  Typography,
  CircularProgress,
  Alert,
  Paper,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Checkbox,
  FormControlLabel
} from '@mui/material';

interface User {
  username: string;
  [key: string]: any;
}

interface LoginScreenProps {
  onLoginSuccess: (user: User) => void;
}

interface GoogleUser {
  id: number;
  username: string;
  display_name: string;
  profile: string;
  is_new_user: boolean;
}

function LoginScreen({ onLoginSuccess }: LoginScreenProps) {
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openTermsDialog, setOpenTermsDialog] = useState(false);
  const [googleUser, setGoogleUser] = useState<GoogleUser | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  const handleRegister = () => {
    if (!username.trim()) return;
    
    setLoading(true);
    setError(null);

    apiClient.post('/register', { username: username })
      .then(response => {
        setLoading(false);
        onLoginSuccess(response.data);
      })
      .catch(err => {
        setLoading(false);
        setError(err.response?.data?.detail || '登録に失敗しました');
      });
  };

  const handleLogin = () => {
    if (!username.trim()) return;
    
    setLoading(true);
    setError(null);

    apiClient.post('/login', { username: username })
      .then(response => {
        setLoading(false);
        onLoginSuccess(response.data);
      })
      .catch(err => {
        setLoading(false);
        setError(err.response?.data?.detail || 'ログインに失敗しました');
      });
  };

  const handleGoogleSuccess = (credentialResponse: any) => {
    setLoading(true);
    setError(null);

    authService.loginWithGoogle(credentialResponse.credential)
      .then((response: any) => {
        setLoading(false);
        
        console.log('Google ログインレスポンス:', response);
        console.log('is_new_user:', response.is_new_user);
        
        // New users: show terms and display name dialog
        if (response.is_new_user === true) {
          setGoogleUser(response);
          setDisplayName(response.display_name || '');
          setOpenTermsDialog(true);
          setAgreedToTerms(false);
        } else {
          // Existing users: proceed with login
          onLoginSuccess(response);
        }
      })
      .catch(err => {
        setLoading(false);
        console.error('Google ログインエラー:', err);
        setError(err.response?.data?.detail || 'Google ログインに失敗しました');
      });
  };

  const handleGoogleError = () => {
    setError('Google ログインに失敗しました');
  };

  const handleTermsClose = () => {
    setOpenTermsDialog(false);
    setGoogleUser(null);
  };

  const handleTermsAgree = () => {
    if (!agreedToTerms) {
      setError('利用規約に同意してください');
      return;
    }

    if (!displayName.trim()) {
      setError('表示名を入力してください');
      return;
    }

    setLoading(true);
    setError(null);

    if (googleUser) {
      // Save to localStorage first (for Authorization header)
      authService.login(googleUser.username);
      
      apiClient.put('/users/me', { display_name: displayName })
        .then(() => {
          setLoading(false);
          setOpenTermsDialog(false);
          const updatedUser = {
            ...googleUser,
            display_name: displayName
          };
          onLoginSuccess(updatedUser);
        })
        .catch(err => {
          setLoading(false);
          // On failure, remove from localStorage
          authService.logout();
          setError(err.response?.data?.detail || 'プロフィール更新に失敗しました');
        });
    }
  };

  return (
    <Container maxWidth="xs" sx={{ mt: 8 }}>
      <Paper sx={{ padding: 4, textAlign: 'center' }}>
        <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <img
            src="/images/logo_chatcraft_app.png"
            alt="ChatCraft Logo"
            style={{
              height: '27px',
              marginRight: '6px',
            }}
          />
          <Typography
            variant="h5"
            sx={{
              color: '#333',
              fontWeight: 'bold',
            }}
          >
            ChatCraft
          </Typography>
        </Box>
        <Typography variant="body2" color="textSecondary" gutterBottom sx={{ mt: 1 }}>
          プロトタイプはIDのみでOK！
        </Typography>
        
        <Box component="form" sx={{ mt: 3 }}>
          <TextField
            label="ユーザーID（半角英字）"
            variant="outlined"
            fullWidth
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            disabled={loading}
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: '12px',
              }
            }}
          />

          {error && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {error}
            </Alert>
          )}

          {loading && (
            <Box sx={{ display: 'flex', justifyContent: 'center', my: 2 }}>
              <CircularProgress />
            </Box>
          )}

          <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
            <Button
              variant="outlined"
              color="primary"
              fullWidth
              onClick={handleLogin}
              disabled={loading}
              sx={{
                borderRadius: '12px',
                textTransform: 'none',
                fontWeight: 'bold'
              }}
            >
              ログイン
            </Button>
            <Button
              variant="contained"
              color="primary"
              fullWidth
              onClick={handleRegister}
              disabled={loading}
              sx={{
                borderRadius: '12px',
                textTransform: 'none',
                fontWeight: 'bold'
              }}
            >
              新しく登録
            </Button>
          </Box>

          <Divider sx={{ my: 3 }}>または</Divider>

          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={handleGoogleError}
            />
          </Box>
        </Box>
      </Paper>

      {/* Terms and display name dialog */}
      <Dialog
        open={openTermsDialog}
        onClose={handleTermsClose}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          利用規約に同意してください
        </DialogTitle>
        <DialogContent>
          <Box sx={{ my: 2, maxHeight: 300, overflowY: 'auto', p: 2, bgcolor: '#f5f5f5', borderRadius: 1 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
              ChatCraft 利用規約
            </Typography>
            <Typography variant="body2" sx={{ lineHeight: 1.8, mb: 2 }}>
              本サービスを利用することにより、ユーザーは以下の条項に同意するものとします。
            </Typography>
            
            <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
              1. サービスの利用
            </Typography>
            <Typography variant="body2" sx={{ lineHeight: 1.8, mb: 2 }}>
              本サービスは、ユーザーが AI チャットボットと会話し、カスタマイズされたキャラクター（メイト）を作成・管理するためのプラットフォームです。
            </Typography>

            <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
              2. ユーザー行動
            </Typography>
            <Typography variant="body2" sx={{ lineHeight: 1.8, mb: 2 }}>
              ユーザーは、違法または有害なコンテンツを作成・共有しないことを同意します。また、他のユーザーの権利を侵害しないことを約束します。
            </Typography>

            <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
              3. データとプライバシー
            </Typography>
            <Typography variant="body2" sx={{ lineHeight: 1.8, mb: 2 }}>
              ユーザーのプロフィール情報と会話履歴は、本サービスの改善と分析のために使用される場合があります。個人情報は厳格に保護されます。
            </Typography>

            <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
              4. 免責事項
            </Typography>
            <Typography variant="body2" sx={{ lineHeight: 1.8, mb: 2 }}>
              本サービスは「現状のまま」提供されます。ユーザーの使用から生じるいかなる損害について、当社は責任を負いません。
            </Typography>

            <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
              5. サービス利用の中止
            </Typography>
            <Typography variant="body2" sx={{ lineHeight: 1.8 }}>
              当社は、規約違反のユーザーに対してサービス利用を中止する権利を有します。
            </Typography>
          </Box>

          {/* Display name input */}
          <Box sx={{ mt: 3 }}>
            <TextField
              label="表示名"
              variant="outlined"
              fullWidth
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="プロフィールに表示されます"
              disabled={loading}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: '8px',
                }
              }}
            />
          </Box>

          {/* Terms agreement checkbox */}
          <Box sx={{ mt: 2 }}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={agreedToTerms}
                  onChange={(e) => setAgreedToTerms(e.target.checked)}
                  disabled={loading}
                />
              }
              label="利用規約に同意します"
            />
          </Box>

          {error && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {error}
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleTermsClose} disabled={loading}>
            キャンセル
          </Button>
          <Button
            onClick={handleTermsAgree}
            variant="contained"
            disabled={loading || !agreedToTerms || !displayName.trim()}
          >
            {loading ? '処理中...' : '同意して続ける'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}

export default LoginScreen;
