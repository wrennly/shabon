// src/MateBuilder.tsx

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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Checkbox,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

interface SchemaAttribute {
  key: string;
  display_name: string;
  type: 'text' | 'select' | 'textarea';
  display_order: number;
  category?: string; // 新規：カテゴリ
  options?: Array<{
    value: string;
    display_name: string;
  }>;
}

interface MateBuilderProps {
  schema: SchemaAttribute[];
  onMateSelect?: (id: string) => void; // チャット画面への遷移用
}

function MateBuilder({ schema, onMateSelect }: MateBuilderProps) {
  // フォーム状態
  const [formState, setFormState] = useState<Record<string, any>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [basicSettings, setBasicSettings] = useState<SchemaAttribute[]>([]);
  const [advancedSettings, setAdvancedSettings] = useState<SchemaAttribute[]>([]);
  const [categorizedSettings, setCategorizedSettings] = useState<Record<string, SchemaAttribute[]>>({});
  const [successDialogOpen, setSuccessDialogOpen] = useState(false);
  const [createdMateId, setCreatedCharacterId] = useState<string | null>(null);
  const [createdMateName, setCreatedCharacterName] = useState('');
  const [publicAgreementDialogOpen, setPublicAgreementDialogOpen] = useState(false);
  const [pendingPublicState, setPendingPublicState] = useState(false);
  const [publicAgreed, setPublicAgreed] = useState(false);
  
  // mate_id関連
  const [mateId, setMateId] = useState('');
  const [mateIdError, setMateIdError] = useState('');
  const [mateIdChecking, setMateIdChecking] = useState(false);

  // ランダムなmate_idを生成
  const generateRandomMateId = () => {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  // mate_id重複チェック
  useEffect(() => {
    if (!mateId || mateId.length < 3) {
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
    }, 500); // 500ms待ってからチェック

    return () => clearTimeout(timer);
  }, [mateId]);

  // MBTIプリセット設定
  useEffect(() => {
    const mbti = formState.mbti;
    if (mbti === 'ENTJ') {
      setFormState(prevState => ({
        ...prevState,
        tone_style: 'formal',
        stance: 'strict',
        first_person: '私',
        relationship: 'mentor',
      }));
    } else if (mbti === 'INFP') {
      setFormState(prevState => ({
        ...prevState,
        tone_style: 'casual',
        stance: 'kind',
        first_person: '僕',
        relationship: 'friend',
      }));
    }
  }, [formState.mbti]);

  // スキーマを基本設定と詳細設定に分割＋カテゴリでグループ分け
  useEffect(() => {
    if (schema && schema.length > 0) {
      const sortedAttributes = [...schema].sort(
        (a, b) => a.display_order - b.display_order
      );
      const basic = sortedAttributes.filter(attr => attr.display_order < 5);
      const advanced = sortedAttributes.filter(attr => attr.display_order >= 5);
      setBasicSettings(basic);
      setAdvancedSettings(advanced);

      // カテゴリごとにグループ分け
      const grouped: Record<string, SchemaAttribute[]> = {};
      advanced.forEach(attr => {
        const category = attr.category || 'その他';
        if (!grouped[category]) {
          grouped[category] = [];
        }
        grouped[category].push(attr);
      });
      setCategorizedSettings(grouped);
      
      // スキーマ読み込み完了後にmate_idを自動生成
      if (!mateId) {
        setMateId(generateRandomMateId());
      }
    }
  }, [schema]);

  const handleInputChange = (key: string, value: any) => {
    setFormState(prevState => ({
      ...prevState,
      [key]: value,
    }));
  };

  const handlePublicSwitchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const checked = event.target.checked;
    
    if (checked) {
      // 公開にチェック → 同意ダイアログを表示
      setPendingPublicState(true);
      setPublicAgreementDialogOpen(true);
      setPublicAgreed(false);
    } else {
      // 公開を外す場合はそのまま
      setIsPublic(false);
    }
  };

  const handlePublicAgreementClose = () => {
    setPublicAgreementDialogOpen(false);
    setPendingPublicState(false);
    setPublicAgreed(false);
  };

  const handlePublicAgreementConfirm = () => {
    if (!publicAgreed) {
      return;
    }
    setIsPublic(true);
    setPublicAgreementDialogOpen(false);
    setPendingPublicState(false);
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    
    // mate_idエラーがあれば送信しない
    if (mateIdError) {
      setSubmitMessage('メイトIDを修正してください');
      return;
    }
    
    setIsSubmitting(true);
    setSubmitMessage('');

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

    const characterCreateRequest = {
      mate_name: characterName,
      mate_id: mateId,  // mate_idを追加
      settings: settingsPayload,
      is_public: isPublic
    };

    apiClient.post('/mates/', characterCreateRequest)
      .then(response => {
        const newChar = response.data;
        setCreatedCharacterId(newChar.id);
        setCreatedCharacterName(newChar.mate_name);
        setSuccessDialogOpen(true);
        setIsSubmitting(false);
      })
      .catch(err => {
        setSubmitMessage(`メイトづくりに失敗... ${err.response?.data?.detail || err.message}`);
        setIsSubmitting(false);
      });
  };

  // ダイアログを閉じる
  const handleCloseDialog = () => {
    setSuccessDialogOpen(false);
    // フォームをリセット
    setFormState({});
    setMateId(generateRandomMateId());
    setSubmitMessage('');
  };

  // チャット画面に遷移
  const handleGoToChat = () => {
    if (createdMateId && onMateSelect) {
      setSuccessDialogOpen(false);
      onMateSelect(createdMateId);
    }
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

    if (attr.type === 'textarea') {
      return (
        <FormControl key={attr.key} fullWidth margin="normal">
          <TextField
            label={attr.display_name}
            variant="outlined"
            multiline
            rows={4}
            maxRows={8}
            value={formState[attr.key] || ''}
            onChange={(e) => handleInputChange(attr.key, e.target.value)}
          />
        </FormControl>
      );
    }
    return null;
  };

  return (
    <Box 
      component="form"
      onSubmit={handleSubmit}
      sx={{ mt: 2 }}
    >
      <Typography variant="h6" gutterBottom>
        あたらしいメイト
      </Typography>
      
      {/* メイトID入力欄（最初から表示、値は後から自動入力） */}
      <FormControl fullWidth margin="normal">
        <TextField
          label="メイトID"
          variant="outlined"
          size="small"
          value={mateId}
          onChange={(e) => setMateId(e.target.value.toLowerCase())}
          error={!!mateIdError}
          helperText={mateIdError || '3-20文字の英数字、ハイフン、アンダースコア'}
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
          label="メイト名"
          variant="outlined"
          value={formState.mate_name || ''}
          onChange={(e) => handleInputChange('mate_name', e.target.value)}
          required
        />
      </FormControl>

      {/* 基本情報 */}
      <Typography variant="subtitle1" sx={{ mt: 2, fontWeight: 'bold' }}>
        詳細設定（任意）
      </Typography>
      {basicSettings.map(attr => renderAttribute(attr))}

      {/* 詳細設定 - カテゴリ別 */}
      {advancedSettings.length > 0 && (
        <Box sx={{ mt: 2 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1 }}>
            詳細情報（オプション）
          </Typography>
          {Object.entries(categorizedSettings).map(([category, attrs]) => (
            <Accordion key={category} sx={{ mb: 1 }}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography>{category}</Typography>
              </AccordionSummary>
              <AccordionDetails sx={{ display: 'flex', flexDirection: 'column' }}>
                {attrs.map(attr => renderAttribute(attr))}
              </AccordionDetails>
            </Accordion>
          ))}
        </Box>
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
        label="公開する（デフォルトは非公開）"
        sx={{ mt: 1, mb: 1, display: 'block' }}
      />

      {/* 作成ボタン */}
      <Box sx={{ mt: 2, position: 'relative' }}>
        <Button
          type="submit"
          variant="contained"
          color="primary"
          fullWidth
          disabled={isSubmitting}
          size="large"
        >
          このメイトを作成！
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
        <Typography 
          variant="body1" 
          sx={{ mt: 2, background: '#f4f4f4', padding: 2 }}
        >
          {submitMessage}
        </Typography>
      )}

      {/* 公開同意ダイアログ */}
      <Dialog
        open={publicAgreementDialogOpen}
        onClose={handlePublicAgreementClose}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          メイトを公開しますか？
        </DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            このメイトを公開すると、他のユーザーが検索・利用できるようになります。
          </DialogContentText>
          
          <Box sx={{ p: 2, bgcolor: '#fff3cd', borderRadius: 1, mb: 2 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
              ⚠️ 重要なお知らせ
            </Typography>
            <Typography variant="body2" sx={{ lineHeight: 1.8 }}>
              公開したメイトについて：
            </Typography>
            <ul style={{ marginTop: 8, paddingLeft: 20, lineHeight: 1.8 }}>
              <li>
                <Typography variant="body2">
                  他のユーザーがこのメイトを利用・改造することができます
                </Typography>
              </li>
              <li>
                <Typography variant="body2">
                  二次創作されたメイトが他のプラットフォームで共有される可能性があります
                </Typography>
              </li>
              <li>
                <Typography variant="body2">
                  作者クレジットが保持されない場合があります
                </Typography>
              </li>
            </ul>
          </Box>

          <FormControlLabel
            control={
              <Checkbox
                checked={publicAgreed}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPublicAgreed(e.target.checked)}
              />
            }
            label="二次創作を含む、このメイトの利用と改造を許可します"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handlePublicAgreementClose}>
            キャンセル
          </Button>
          <Button
            onClick={handlePublicAgreementConfirm}
            variant="contained"
            disabled={!publicAgreed}
          >
            公開する
          </Button>
        </DialogActions>
      </Dialog>

      {/* 成功ダイアログ */}
      <Dialog
        open={successDialogOpen}
        onClose={handleCloseDialog}
      >
        <DialogTitle>🎉 メイトを作成しました！</DialogTitle>
        <DialogContent>
          <DialogContentText>
            「{createdMateName}」が誕生しました！
            今すぐチャットを始めますか？
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} color="primary">
            閉じる
          </Button>
          <Button 
            onClick={handleGoToChat} 
            color="primary" 
            variant="contained"
            disabled={!onMateSelect}
          >
            メイトとチャットする
          </Button>
        </DialogActions>
      </Dialog>

    </Box>
  );
}

export default MateBuilder;
