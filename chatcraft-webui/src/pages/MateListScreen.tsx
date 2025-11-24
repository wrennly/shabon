// src/pages/MateListScreen.tsx

import React, { useState, useEffect } from 'react';
import apiClient from '../api';
import { trackMateView } from '../analytics';
import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  CircularProgress,
  Alert,
  ListItemIcon,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
  Tabs,
  Tab
} from '@mui/material';
import TagFacesRoundedIcon from '@mui/icons-material/TagFacesRounded';
import DeleteIcon from '@mui/icons-material/Delete';
import {
  SwipeableList,
  SwipeableListItem,
  SwipeAction,
  TrailingActions,
  Type as ListType
} from 'react-swipeable-list';
import 'react-swipeable-list/dist/styles.css';

interface Mate {
  id: string;
  mate_name: string;
  last_message?: string;
  [key: string]: any;
}

interface MateListScreenProps {
  onMateSelect: (id: string) => void;
}

function MateListScreen({ onMateSelect }: MateListScreenProps) {
  const [mates, setMates] = useState<Mate[]>([]);
  const [myMates, setMyMates] = useState<Mate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<any>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingMate, setDeletingMate] = useState<Mate | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [currentSubTab, setCurrentSubTab] = useState(0); // 0: Recent chats, 1: My mates

  // Load mates with chat history
  const loadCharacters = () => {
    console.log('🔄 Loading chatted mates...');
    setLoading(true);
    apiClient.get('/mates/?filter=chatted_only')
      .then(response => {
        console.log('✅ Mates loaded:', response.data);
        console.log(`   Total: ${response.data.length}`);
        setMates(response.data);
        setLoading(false);
      })
      .catch(err => {
        console.error('❌ Error loading mates:', err);
        setError(err);
        setLoading(false);
      });
  };

  // Load user's created mates
  const loadMyCharacters = () => {
    apiClient.get('/mates/?filter=created_only')
      .then(response => {
        setMyMates(response.data);
      })
      .catch(err => {
        console.error('マイメイトの読み込みエラー:', err);
      });
  };

  useEffect(() => {
    console.log('🎯 MateListScreen mounted/refreshed');
    loadCharacters();
    loadMyCharacters();
  }, []);

  // 削除ダイアログを開く
  const handleDeleteClick = (mate: Mate) => {
    setDeletingMate(mate);
    setDeleteDialogOpen(true);
  };

  // 削除ダイアログを閉じる
  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false);
    setDeletingMate(null);
  };

  // Delete chat history with the selected mate
  const handleDeleteConfirm = async () => {
    if (!deletingMate) return;
    
    setIsDeleting(true);
    try {
      await apiClient.delete(`/chat/history/${deletingMate.id}`);
      setDeleteDialogOpen(false);
      setDeletingMate(null);
      
      // Reload mate list
      const charsResponse = await apiClient.get('/mates/?filter=chatted_only');
      setMates(charsResponse.data);
      loadMyCharacters();
    } catch (err: any) {
      console.error('削除エラー:', err);
      alert('チャット履歴の削除に失敗しました');
    } finally {
      setIsDeleting(false);
    }
  };

  // Swipe action for delete
  const trailingActions = (mate: Mate) => (
    <TrailingActions>
      <SwipeAction
        destructive={true}
        onClick={() => handleDeleteClick(mate)}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            backgroundColor: '#d32f2f',
            color: 'white',
            paddingX: 3,
          }}
        >
          <DeleteIcon sx={{ mr: 1 }} />
          <Typography>削除</Typography>
        </Box>
      </SwipeAction>
    </TrailingActions>
  );

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
        <Typography variant="h6" sx={{ ml: 2 }}>
          チャット一覧を読み込み中...
        </Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mt: 2 }}>
        チャット一覧が読めません。APIが動いているか確認してください。
      </Alert>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      <Box sx={{ mt: 2, px: 2 }}>
        <Typography variant="h6" gutterBottom>
          チャット
        </Typography>

        {/* サブタブ */}
        <Tabs 
          value={currentSubTab} 
          onChange={(e, newValue) => setCurrentSubTab(newValue)}
          sx={{ 
            mb: 2,
            minHeight: 'auto',
            '& .MuiTabs-indicator': {
              display: 'none'
            }
          }}
        >
          <Tab 
            label="ルームメイト" 
            sx={{
              borderRadius: '16px',
              minHeight: 'auto',
              py: 0.375,
              px: 1.25,
              mr: 1,
              fontSize: '0.8125rem',
              textTransform: 'none',
              backgroundColor: currentSubTab === 0 ? 'rgba(25, 118, 210, 0.12)' : 'rgba(0, 0, 0, 0.04)',
              color: currentSubTab === 0 ? 'primary.main' : 'text.secondary',
              border: currentSubTab === 0 ? '1px solid rgba(25, 118, 210, 0.3)' : '1px solid transparent',
              '&:hover': {
                backgroundColor: currentSubTab === 0 ? 'rgba(25, 118, 210, 0.18)' : 'rgba(0, 0, 0, 0.08)',
              }
            }}
          />
          <Tab 
            label="マイメイト" 
            sx={{
              borderRadius: '16px',
              minHeight: 'auto',
              py: 0.375,
              px: 1.25,
              fontSize: '0.8125rem',
              textTransform: 'none',
              backgroundColor: currentSubTab === 1 ? 'rgba(25, 118, 210, 0.12)' : 'rgba(0, 0, 0, 0.04)',
              color: currentSubTab === 1 ? 'primary.main' : 'text.secondary',
              border: currentSubTab === 1 ? '1px solid rgba(25, 118, 210, 0.3)' : '1px solid transparent',
              '&:hover': {
                backgroundColor: currentSubTab === 1 ? 'rgba(25, 118, 210, 0.18)' : 'rgba(0, 0, 0, 0.08)',
              }
            }}
          />
        </Tabs>
      </Box>

      {/* Recent chats tab */}
      {currentSubTab === 0 && (
        <Box sx={{ flex: 1, overflow: 'auto', pl: 2, pr: 0 }}>
          <Box sx={{ pr: 2 }}>
            {mates.length === 0 && (
              <Typography sx={{ mt: 2 }}>
                まだ誰ともおしゃべりしてないみたい。
                [検索] タブで、話す相手を探してみよう！
              </Typography>
            )}

            <SwipeableList type={ListType.IOS}>
            {mates.map((mate) => (
              <SwipeableListItem
                key={mate.id}
                trailingActions={trailingActions(mate)}
              >
                <ListItem disablePadding>
                  <ListItemButton onClick={() => {
                    trackMateView(mate.id, mate.mate_name);
                    onMateSelect(mate.id);
                  }}>
                    <ListItemIcon>
                      <TagFacesRoundedIcon />
                    </ListItemIcon>
                    <ListItemText 
                      primary={mate.mate_name}
                      secondary={
                        mate.last_message
                          ? mate.last_message.length > 40
                            ? mate.last_message.substring(0, 40) + '...'
                            : mate.last_message
                          : 'まだメッセージなし'
                      }
                    />
                  </ListItemButton>
                </ListItem>
              </SwipeableListItem>
            ))}
          </SwipeableList>
          </Box>
        </Box>
      )}

      {/* My mates tab */}
      {currentSubTab === 1 && (
        <Box sx={{ flex: 1, overflow: 'auto', pl: 2, pr: 0 }}>
          <Box sx={{ pr: 2 }}>
            {myMates.length === 0 && (
            <Typography sx={{ mt: 2 }}>
              あれ？まだメイトが1人も作られてないみたい。
              [作成] タブで、新しい魂をつくってみよう！
            </Typography>
          )}

          <SwipeableList type={ListType.IOS}>
            {myMates.map((mate) => (
              <SwipeableListItem
                key={mate.id}
                trailingActions={trailingActions(mate)}
              >
                <ListItem disablePadding>
                  <ListItemButton onClick={() => {
                    trackMateView(mate.id, mate.mate_name);
                    onMateSelect(mate.id);
                  }}>
                    <ListItemIcon>
                      <TagFacesRoundedIcon />
                    </ListItemIcon>
                    <ListItemText 
                      primary={mate.mate_name}
                      secondary={
                        mate.last_message
                          ? mate.last_message.length > 40
                            ? mate.last_message.substring(0, 40) + '...'
                            : mate.last_message
                          : 'まだメッセージなし'
                      }
                    />
                  </ListItemButton>
                </ListItem>
              </SwipeableListItem>
            ))}
          </SwipeableList>
          </Box>
        </Box>
      )}

      {/* Delete confirmation dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={handleDeleteCancel}
      >
        <DialogTitle>チャット履歴を削除しますか?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            「{deletingMate?.mate_name}」との会話履歴をすべて削除します。
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

export default MateListScreen;
