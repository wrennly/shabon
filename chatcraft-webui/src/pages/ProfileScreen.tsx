// src/ProfileScreen.tsx

import React, { useState, useEffect } from 'react';
import apiClient from '../api';
import {
  Box,
  Typography,
  CircularProgress,
  Alert,
  TextField,
  Button,
  IconButton,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions
} from '@mui/material';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';

interface ProfileScreenProps {
  onBackToTabs: () => void;
  onLogout?: () => void;
}

function ProfileScreen({ onBackToTabs, onLogout }: ProfileScreenProps) {
  const [username, setUsername] = useState(''); // Username (read-only)
  const [displayName, setDisplayName] = useState(''); // Display name (editable)
  const [profile, setProfile] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Load user profile
  useEffect(() => {
    setLoading(true);
    setError(null);
    setSaveMessage('');

    apiClient.get('/users/me')
      .then(response => {
        setUsername(response.data.username);
        setDisplayName(response.data.display_name || '');
        setProfile(response.data.profile || '');
        setLoading(false);
      })
            .catch(err => {
        console.error('プロフィール読み込み失敗…', err);
        setError('プロフィールの読み込みに失敗しました');
        setLoading(false);
      });
  }, []);

  const handleSave = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    
    setIsSaving(true);
    setSaveMessage('');
    setError(null);

    apiClient.put('/users/me', {
      display_name: displayName,
      profile: profile
    })
      .then(() => {
        setIsSaving(false);
        setSaveMessage('プロフィールを保存したよ！');
      })
      .catch(err => {
        setIsSaving(false);
        setSaveMessage('');
        setError(err.response?.data?.detail || '保存に失敗しました…');
      });
  };

  const handleDeleteClick = () => {
    setOpenDeleteDialog(true);
  };

  const handleDeleteCancel = () => {
    setOpenDeleteDialog(false);
  };

  const handleDeleteConfirm = () => {
    setIsDeleting(true);
    setError(null);

    apiClient.delete('/users/me')
      .then(() => {
        setOpenDeleteDialog(false);
        setIsDeleting(false);
        if (onLogout) {
          onLogout();
        }
      })
      .catch(err => {
        setIsDeleting(false);
        setError(err.response?.data?.detail || err.response?.data?.message || '退会に失敗しました…');
      });
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
        <Typography sx={{ ml: 2 }}>プロフィール読み込み中…</Typography>
      </Box>
    );
  }

  return (
    <Box 
      component="form"
      onSubmit={handleSave}
      sx={{ 
        mt: 2, 
        flexGrow: 1, 
        display: 'flex', 
        flexDirection: 'column' 
      }}
    >
      
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <IconButton onClick={onBackToTabs}> 
          <ArrowBackRoundedIcon />
        </IconButton>
        <Typography variant="h6" sx={{ ml: 1 }}>
          プロフィール
        </Typography>
      </Box>

      {/* Profile form */}
      <Paper sx={{ p: 2, overflowY: 'auto', flexGrow: 1 }}>
        
        {/* Username (read-only) */}
        <TextField
          label="ユーザーID"
          variant="outlined"
          fullWidth
          margin="normal"
          value={username}
          disabled
          helperText="ユーザーIDは変更できません"
        />
        
        {/* Display name (editable) */}
        <TextField
          label="表示名"
          variant="outlined"
          fullWidth
          margin="normal"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="日本語で自由に設定できます"
        />
        
        {/* Profile field */}
        <TextField
          label="プロフィール"
          variant="outlined"
          fullWidth
          multiline
          rows={5}
          margin="normal"
          placeholder="（AIに「わたしは〇〇です」って伝わるよ！）"
          value={profile}
          onChange={(e) => setProfile(e.target.value)}
        />
        
        {/* Save button */}
        <Box sx={{ mt: 2, position: 'relative' }}>
          <Button
            type="submit"
            variant="contained"
            color="primary"
            fullWidth
            disabled={isSaving}
            size="large"
          >
            このプロフィールを保存
          </Button>
          {isSaving && (
            <CircularProgress
              size={24}
              sx={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                marginTop: '-12px',
                marginLeft: '-12px',
              }}
            />
          )}
        </Box>

        {/* Danger zone */}
        <Box sx={{ mt: 3, pt: 2, borderTop: '1px solid #e0e0e0' }}>
          <Typography variant="subtitle2" sx={{ mb: 1, color: '#999' }}>
            危険ゾーン
          </Typography>
          <Button
            variant="outlined"
            color="error"
            fullWidth
            onClick={handleDeleteClick}
            disabled={isDeleting}
            size="large"
          >
            このアカウントを削除（退会）
          </Button>
        </Box>
      </Paper>
      
      {/* Status messages */}
      {error && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {error}
        </Alert>
      )}
      {saveMessage && (
        <Alert severity="success" sx={{ mt: 2 }}>
          {saveMessage}
        </Alert>
      )}

      {/* Deletion confirmation dialog */}
      <Dialog
        open={openDeleteDialog}
        onClose={handleDeleteCancel}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
      >
        <DialogTitle id="alert-dialog-title">
          アカウントを削除しますか？
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="alert-dialog-description">
            このアカウントを削除すると、以下のデータが削除されます：
            <ul>
              <li>あなたのプロフィール情報</li>
              <li>作成したすべてのAIメイト</li>
              <li>チャット履歴</li>
            </ul>
            この操作は取り消すことができません。本当に削除しますか？
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteCancel} disabled={isDeleting}>
            キャンセル
          </Button>
          <Button
            onClick={handleDeleteConfirm}
            autoFocus
            color="error"
            variant="contained"
            disabled={isDeleting}
          >
            {isDeleting ? '削除中...' : '削除する'}
          </Button>
        </DialogActions>
      </Dialog>

    </Box>
  );
}

export default ProfileScreen;
