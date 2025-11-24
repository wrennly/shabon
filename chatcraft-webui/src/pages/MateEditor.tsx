// src/pages/MateEditor.tsx

import React, { useState, useEffect } from 'react';
import apiClient from '../api';
import {
  Box,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Typography,
  CircularProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  FormControlLabel,
  Switch,
  Alert,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';

interface SchemaAttribute {
  key: string;
  display_name: string;
  type: 'text' | 'select';
  display_order: number;
  options?: Array<{
    value: string;
    display_name: string;
  }>;
}

interface MateEditorProps {
  schema: SchemaAttribute[];
  characterId: string | null;
  onBackToList: () => void;
}

function MateEditor({ schema, characterId, onBackToList }: MateEditorProps) {
  // Form state
  const [formState, setFormState] = useState<Record<string, any>>({});
  const [isPublic, setIsPublic] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [basicSettings, setBasicSettings] = useState<SchemaAttribute[]>([]);
  const [advancedSettings, setAdvancedSettings] = useState<SchemaAttribute[]>([]);
  const [successDialogOpen, setSuccessDialogOpen] = useState(false);
  const [updatedMateName, setUpdatedCharacterName] = useState('');
  
  // Mate ID related
  const [mateId, setMateId] = useState('');
  const [originalMateId, setOriginalMateId] = useState('');
  const [mateIdError, setMateIdError] = useState('');
  const [mateIdChecking, setMateIdChecking] = useState(false);

  // Load AI details
  useEffect(() => {
    if (!characterId) {
      setErrorMessage('編集するAIが見つかりません');
      setIsLoading(false);
      return;
    }
    
    setIsLoading(true);
    setErrorMessage('');

    apiClient.get(`/mates/${characterId}/details`)
      .then(response => {
        const details = response.data;
        const loadedState: Record<string, any> = {};
        
        details.settings.forEach((setting: any) => {
          loadedState[setting.key] = setting.value;
        });
        
        loadedState.mate_name = details.mate_name;
        setFormState(loadedState);
        setIsPublic(details.is_public);
        
        // mate_idを設定
        if (details.mate_id) {
          setMateId(details.mate_id);
          setOriginalMateId(details.mate_id);
        }
        
        setIsLoading(false);
      })
      .catch(err => {
        console.error('AI設定の読み込みに失敗…', err);
        setErrorMessage(`AI設定の読み込みに失敗... ${err.response?.data?.detail || err.message}`);
        setIsLoading(false);
      });

  }, [characterId]);

  // mate_id重複チェック（変更された場合のみ）
  useEffect(() => {
    // 元のmate_idと同じ、または空の場合はチェック不要
    if (!mateId || mateId === originalMateId || mateId.length < 3) {
      setMateIdError('');
      return;
    }

    const timer = setTimeout(() => {
      setMateIdChecking(true);
      apiClient.get(`/mates/check-mate-id/${mateId}`)
        .then(response => {
          if (!response.data.available) {
            setMateIdError(response.data.reason || 'このIDは使用できません');
          } else {
            setMateIdError('');
          }
          setMateIdChecking(false);
        })
        .catch(() => {
          setMateIdError('IDチェックに失敗しました');
          setMateIdChecking(false);
        });
    }, 500);

    return () => clearTimeout(timer);
  }, [mateId, originalMateId]);

  // スキーマを基本設定と詳細設定に分割
  useEffect(() => {
    if (schema && schema.length > 0) {
      const sortedAttributes = [...schema].sort(
        (a, b) => a.display_order - b.display_order
      );
      const basic = sortedAttributes.filter(attr => attr.display_order < 5);
      const advanced = sortedAttributes.filter(attr => attr.display_order >= 5);
      setBasicSettings(basic);
      setAdvancedSettings(advanced);
    }
  }, [schema]);

  const handleInputChange = (key: string, value: any) => {
    setFormState(prevState => ({
      ...prevState, 
      [key]: value,
    }));
  };

  const handlePublicSwitchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setIsPublic(event.target.checked);
  };
  
  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault(); 
    
    // mate_idエラーがあれば送信しない
    if (mateIdError) {
      setErrorMessage('メイトIDを修正してください');
      return;
    }
    
    setIsSubmitting(true);
    setSubmitMessage('');
    setErrorMessage('');

    const characterName = formState.mate_name || '名無しのAI';
    const settingsPayload = [];
    
    for (const key in formState) {
      if (key !== 'mate_name' && formState[key]) {
        settingsPayload.push({
          key: key,
          value: formState[key]
        });
      }
    }
    
    const characterUpdateRequest = {
      mate_name: characterName,
      mate_id: mateId,  // mate_idを追加
      settings: settingsPayload,
      is_public: isPublic
    };

    apiClient.put(`/mates/${characterId}`, characterUpdateRequest)
      .then(response => {
        const updatedChar = response.data;
        setUpdatedCharacterName(updatedChar.mate_name);
        setSuccessDialogOpen(true);
        setIsSubmitting(false);
      })
      .catch(err => {
        setErrorMessage(`魂の更新に失敗... ${err.response?.data?.detail || err.message}`);
        setIsSubmitting(false);
      });
  };

  // ダイアログを閉じる
  const handleCloseDialog = () => {
    setSuccessDialogOpen(false);
    setSubmitMessage('');
  };
  
  const renderAttribute = (attr: SchemaAttribute) => {
    if (attr.type === 'select') {
      return (
        <FormControl key={attr.key} fullWidth margin="normal">
          <InputLabel>{attr.display_name}</InputLabel>
          <Select
            value={formState[attr.key] || ''}
            label={attr.display_name}
            onChange={(e) => handleInputChange(attr.key, e.target.value)}
          >
            <MenuItem value="">
              <em>--- (未設定) ---</em>
            </MenuItem>
            {attr.options?.map((opt) => (
              <MenuItem key={opt.value} value={opt.value}>
                {opt.display_name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      );
    }
    
    if (attr.type === 'text') {
      return (
        <FormControl key={attr.key} fullWidth margin="normal">
          <TextField
            label={attr.display_name}
            variant="outlined"
            value={formState[attr.key] || ''}
            onChange={(e) => handleInputChange(attr.key, e.target.value)}
          />
        </FormControl>
      );
    }
    
    return null;
  };

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
        <Typography sx={{ ml: 2 }}>AIの魂を読み込み中…</Typography>
      </Box>
    );
  }

  return (
    <Box 
      component="form" 
      onSubmit={handleSubmit}
      sx={{ mt: 2 }}
    >
      {/* ヘッダー：戻るボタンとタイトル */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
        <IconButton onClick={onBackToList} sx={{ mr: 1 }}>
          <ArrowBackRoundedIcon />
        </IconButton>
        <Typography variant="h6" gutterBottom sx={{ mb: 0 }}>
          マイメイト
        </Typography>
      </Box>
      
      {/* メイトID入力欄 */}
      <FormControl fullWidth margin="normal">
        <TextField
          label="メイトID"
          variant="outlined"
          size="small"
          value={mateId}
          onChange={(e) => setMateId(e.target.value.toLowerCase())}
          error={!!mateIdError}
          helperText={
            mateIdChecking ? '確認中...' : 
            mateIdError || '3-20文字の英数字、ハイフン、アンダースコア'
          }
          sx={{ 
            mb: 1,
            '& .MuiInputBase-input': {
              fontSize: '0.875rem'
            },
            '& .MuiFormHelperText-root': {
              fontSize: '0.75rem'
            }
          }}
        />
      </FormControl>
      
      {/* メイト名入力欄 */}
      <FormControl fullWidth margin="normal">
        <TextField
          label="メイトのなまえ"
          variant="outlined"
          value={formState.mate_name || ''}
          onChange={(e) => handleInputChange('mate_name', e.target.value)}
          required
        />
      </FormControl>

      {/* 基本設定 */}
      <Typography variant="subtitle1" sx={{ mt: 2, fontWeight: 'bold' }}>
        詳細設定（任意）
      </Typography>
      {basicSettings.map(attr => renderAttribute(attr))}

      {/* 詳細設定 */}
      {advancedSettings.length > 0 && (
        <Accordion sx={{ mt: 2, mb: 1 }}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography>詳細設定 (オプション)</Typography>
          </AccordionSummary>
          <AccordionDetails>
            {advancedSettings.map(attr => renderAttribute(attr))}
          </AccordionDetails>
        </Accordion>
      )}
      
      {/* 公開/非公開スイッチ */}
      <FormControlLabel
        control={
          <Switch 
            checked={isPublic}
            onChange={handlePublicSwitchChange}
            color="primary" 
          />
        }
        label="AIを「検索」タブで公開する"
        sx={{ mt: 1, mb: 1, display: 'block' }}
      />

      {/* 更新ボタン */}
      <Box sx={{ mt: 2, position: 'relative' }}>
        <Button
          type="submit"
          variant="contained"
          color="primary"
          fullWidth
          disabled={isSubmitting || isLoading}
          size="large"
        >
          この内容で更新！
        </Button>
        {isSubmitting && (
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

      {/* メッセージ表示 */}
      {submitMessage && (
        <Alert severity="success" sx={{ mt: 2 }}>
          {submitMessage}
        </Alert>
      )}
      {errorMessage && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {errorMessage}
        </Alert>
      )}

      {/* 成功ダイアログ */}
      <Dialog
        open={successDialogOpen}
        onClose={handleCloseDialog}
      >
        <DialogTitle>✨ メイトを更新しました！</DialogTitle>
        <DialogContent>
          <DialogContentText>
            「{updatedMateName}」の設定を更新しました。
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} color="primary" variant="contained">
            OK
          </Button>
        </DialogActions>
      </Dialog>

    </Box>
  );
}

export default MateEditor;
