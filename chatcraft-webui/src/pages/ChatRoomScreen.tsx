// src/ChatRoomScreen.tsx

import React, { useState, useEffect, useRef } from 'react';
import apiClient from '../api';
import { trackChatMessage } from '../analytics';
import * as Sentry from '@sentry/react';
import ReactMarkdown from 'react-markdown';
import {
  Box,
  TextField,
  Button,
  Paper,
  Typography,
  CircularProgress,
  IconButton,
  Alert,
  SxProps,
  Theme,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Menu,
  MenuItem
} from '@mui/material';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import DeleteIcon from '@mui/icons-material/Delete';

interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

interface ChatHistoryEntry {
  role: 'user' | 'assistant';
  message_text: string;
}

interface ChatRoomScreenProps {
  mateId: string | null;
  onBackToList: () => void;
  sx?: SxProps<Theme>;
}

const messageStyle = (role: string): SxProps<Theme> => ({
  padding: '10px',
  borderRadius: '10px',
  marginBottom: '10px',
  maxWidth: '75%',
  alignSelf: role === 'user' ? 'flex-end' : 'flex-start',
  backgroundColor: role === 'user' ? '#dcf8c6' : '#ffffff',
});

function ChatRoomScreen({ mateId, onBackToList, sx }: ChatRoomScreenProps) {
  const [newMessage, setNewMessage] = useState('');
  const [history, setHistory] = useState<ChatMessage[] | null>(null);
  const [isThinking, setIsThinking] = useState(false);
  const [mateName, setCharacterName] = useState('...');
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [isOwnMate, setIsOwnCharacter] = useState(false); // 自分のメイトかどうか
  const chatHistoryRef = useRef<HTMLDivElement>(null);
  const [lastEnterTime, setLastEnterTime] = useState<number>(0); // 最後にEnterを押した時刻

  // Detect mobile device
  const isMobile = /iPhone|iPad|Android|Mobile/.test(navigator.userAgent);

  // キーボードイベント処理
  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement | HTMLTextAreaElement>) => {
    if (event.key === 'Enter') {
      if (isMobile) {
        // モバイル：Enter で改行（何もしない）
        return;
      } else {
        // PC：Shift + Enter で改行、Enter を2回押したら送信
        if (event.shiftKey) {
          // Shift + Enter なら改行（デフォルト動作）
          setLastEnterTime(0); // リセット
          return;
        } else {
          const now = Date.now();
          const timeSinceLastEnter = now - lastEnterTime;
          
          // 1秒以内に2回目のEnterが押された場合は送信
          if (timeSinceLastEnter < 1000 && lastEnterTime !== 0) {
            event.preventDefault();
            setLastEnterTime(0); // リセット
            
            const form = (event.target as HTMLTextAreaElement).closest('form');
            if (form) {
              const submitEvent = new Event('submit', { bubbles: true, cancelable: true });
              form.dispatchEvent(submitEvent);
            }
          } else {
            // 1回目のEnter or 1秒以上経過している場合は改行
            setLastEnterTime(now);
            // デフォルトの改行動作を許可
          }
        }
      }
    }
  };

  useEffect(() => {
    if (mateId) {
      setHistory(null);
      setHistoryError(null);
      setCharacterName('...');
      setIsOwnCharacter(false);

      // Fetch mate details; if error, fallback to public mate
      apiClient.get(`/mates/${mateId}/details`)
        .then((response) => {
          setIsOwnCharacter(true);
          setCharacterName(response.data.mate_name || '（見つからないメイト）');
          
          return apiClient.get(`/chat/history/${mateId}`);
        })
        .then((historyResponse) => {
          const formattedHistory = historyResponse.data.map((log: ChatHistoryEntry) => ({
            role: log.role === 'user' ? 'user' : 'model',
            text: log.message_text
          }));
          setHistory(formattedHistory || []);
        })
        .catch(() => {
          // 自分のメイトでない場合は公開メイトとして取得
          setIsOwnCharacter(false);
          
          Promise.all([
            apiClient.get(`/mates/public-details/${mateId}`),
            apiClient.get(`/chat/history/${mateId}`)
          ])
            .then(([charResponse, historyResponse]) => {
              setCharacterName(charResponse.data.mate_name || '（見つからないメイト）');
              
              const formattedHistory = historyResponse.data.map((log: ChatHistoryEntry) => ({
                role: log.role === 'user' ? 'user' : 'model',
                text: log.message_text
              }));
              setHistory(formattedHistory || []);
            })
            .catch(err => {
              console.error('エラーになっちゃいました:', err);
              setHistoryError('履歴の読み込みに失敗しました...');
              setCharacterName('（エラー）');
              setHistory([]);
            });
        });
    }
  }, [mateId]);

  // スクロール処理
  useEffect(() => {
    if (chatHistoryRef.current) {
      setTimeout(() => {
        if (chatHistoryRef.current) {
          chatHistoryRef.current.scrollTop = chatHistoryRef.current.scrollHeight;
        }
      }, 100);
    }
  }, [history]);

  const handleSendMessage = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!newMessage.trim() || !history) return;
    
    setIsThinking(true);
    
    // Track chat message for analytics
    if (mateId) {
      trackChatMessage(mateId);
    }
    
    const userMessage: ChatMessage = { role: 'user', text: newMessage };
    const currentFullHistory = [...history, userMessage];
    
    setHistory(currentFullHistory);
    setNewMessage('');

    const chatRequest = {
      mate_id: mateId,
      new_message: newMessage,
      history: history
    };
    
    apiClient.post('/chat/', chatRequest)
      .then(response => {
        const aiReply = response.data.reply_text;
        const aiMessage: ChatMessage = { role: 'model', text: aiReply };
        setHistory([...currentFullHistory, aiMessage]);
        setIsThinking(false);
      })
      .catch(err => {
        // Sentry にエラーを記録
        Sentry.captureException(err, {
          tags: {
            component: 'ChatRoomScreen',
            action: 'send_message'
          }
        });
        
        const errorMessage: ChatMessage = { role: 'model', text: `返事に失敗... (${err.message})` };
        setHistory([...currentFullHistory, errorMessage]);
        setIsThinking(false);
      });
  };

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleDeleteClick = () => {
    handleMenuClose();
    setDeleteDialogOpen(true);
  };

  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false);
  };

  const handleDeleteConfirm = async () => {
    if (!mateId) return;
    
    setIsDeleting(true);
    try {
      await apiClient.delete(`/chat/history/${mateId}`);
      setDeleteDialogOpen(false);
      // リストに戻る
      onBackToList();
    } catch (err: any) {
      console.error('削除エラー:', err);
      Sentry.captureException(err, {
        tags: {
          component: 'ChatRoomScreen',
          action: 'delete_chat_history'
        }
      });
      alert('メイトの削除に失敗しました');
      setIsDeleting(false);
    }
  };

  return (
    <Box sx={{
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      width: '100%',
      height: '100%',
      boxSizing: 'border-box',
      minHeight: 0,
      ...sx
    }}>
      
      {/* ヘッダー */}
      <Paper sx={{ 
        padding: '8px', 
        borderBottom: '1px solid #ddd',
        display: 'flex',
        alignItems: 'center',
        flexShrink: 0,
        borderRadius: 0  // 角丸なし
      }} elevation={1}>
        <IconButton onClick={onBackToList}>
          <ArrowBackRoundedIcon />
        </IconButton>
        <Typography variant="h6" sx={{ ml: 1, flexGrow: 1 }}>
          {mateName}
        </Typography>
        {isOwnMate && (
          <>
            <IconButton onClick={handleMenuClick}>
              <MoreVertIcon />
            </IconButton>
            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={handleMenuClose}
            >
              <MenuItem onClick={handleDeleteClick}>
                <DeleteIcon sx={{ mr: 1 }} />
                チャット履歴を削除
              </MenuItem>
            </Menu>
          </>
        )}
      </Paper>

      {/* 会話履歴表示 */}
      <Box 
        ref={chatHistoryRef}
        sx={{
          flexGrow: 1, 
          overflowY: 'auto',
          padding: 2,
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#ece5dd',
        }}>
        {history === null && !historyError && (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
            <CircularProgress />
            <Typography sx={{ ml: 2 }}>過去の会話を読み込み中...</Typography>
          </Box>
        )}
        {historyError && (
          <Alert severity="error" sx={{ m: 2 }}>
            過去ログが読めません...
          </Alert>
        )}
        {history && history.map((msg, index) => (
          <Paper key={index} sx={messageStyle(msg.role)} elevation={1}>
            <Box sx={{ 
              textAlign: 'left',
              '& p': { margin: '0.5em 0' },
              '& p:first-of-type': { marginTop: 0 },
              '& p:last-of-type': { marginBottom: 0 },
              '& strong': { fontWeight: 'bold' },
              '& em': { fontStyle: 'italic' },
              '& code': { 
                backgroundColor: 'rgba(0,0,0,0.05)', 
                padding: '2px 4px', 
                borderRadius: '3px',
                fontFamily: 'monospace'
              }
            }}>
              {msg.role === 'user' ? (
                // ユーザーメッセージは改行をそのまま表示
                <Typography 
                  variant="body1" 
                  sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
                >
                  {msg.text}
                </Typography>
              ) : (
                // メイトのメッセージはMarkdownレンダリング
                <ReactMarkdown>
                  {msg.text}
                </ReactMarkdown>
              )}
            </Box>
          </Paper>
        ))}

        {isThinking && (
          <Box sx={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center' }}>
            <CircularProgress size={20} sx={{ mr: 1 }} />
            <Typography variant="body1">
              考え中...
            </Typography>
          </Box>
        )}
        
        {history && history.length === 0 && !isThinking && (
          <Typography sx={{ textAlign: 'center', color: '#888' }}>
            {mateName} にメッセージを送ってみよう！
          </Typography>
        )}
      </Box>

      {/* メッセージ入力欄 */}
      <Box 
        component="form" 
        onSubmit={handleSendMessage}
        sx={{
          display: 'flex',
          padding: 1,
          borderTop: '1px solid #ddd',
          backgroundColor: '#f0f0f0',
          flexShrink: 0
        }}
      >
        <TextField
          variant="outlined"
          fullWidth
          placeholder="メッセージを入力..."
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isThinking}
          size="small"
          autoComplete="off"
          multiline
          maxRows={4}
          sx={{
            '& .MuiOutlinedInput-root': {
              borderRadius: '16px',
            }
          }}
        />
        <Button 
          type="submit"
          variant="contained" 
          color="primary"
          sx={{ 
            ml: 1,
            borderRadius: '16px',
            textTransform: 'none',
            fontWeight: 'bold'
          }}
          disabled={isThinking}
        >
          送信
        </Button>
      </Box>

      {/* 削除確認ダイアログ */}
      <Dialog
        open={deleteDialogOpen}
        onClose={handleDeleteCancel}
      >
        <DialogTitle>チャット履歴を削除しますか?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            「{mateName}」との会話履歴をすべて削除します。
            メイト自体は削除されません。
            この操作は取り消せません。
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteCancel} disabled={isDeleting}>
            キャンセル
          </Button>
          <Button 
            onClick={handleDeleteConfirm} 
            color="error" 
            variant="contained"
            disabled={isDeleting}
          >
            {isDeleting ? <CircularProgress size={24} /> : '削除'}
          </Button>
        </DialogActions>
      </Dialog>
      
    </Box>
  );
}

export default ChatRoomScreen;
