// src/pages/MyMateListScreen.tsx

import React, { useState, useEffect } from 'react';
import apiClient from '../api';
import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  CircularProgress,
  Alert,
  IconButton,
  ListItemIcon,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button
} from '@mui/material';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import TagFacesRoundedIcon from '@mui/icons-material/TagFacesRounded';
import DeleteIcon from '@mui/icons-material/Delete';

interface Mate {
  id: string;
  mate_name: string;
  [key: string]: any;
}

interface MyMateListScreenProps {
  onMateEdit: (id: string) => void;
  onBackToTabs: () => void;
}

function MyMateListScreen({ onMateEdit, onBackToTabs }: MyMateListScreenProps) {
  const [mates, setMates] = useState<Mate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<any>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingMate, setDeletingMate] = useState<Mate | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Load user's created mates
  const loadCharacters = () => {
    setLoading(true);
    apiClient.get('/mates/?filter=created_only')
      .then(response => {
        setMates(response.data);
        setLoading(false);
      })
      .catch(err => {
        setError(err);
        setLoading(false);
      });
  };

  useEffect(() => {
    loadCharacters();
  }, []);

  // Open deletion dialog
  const handleDeleteClick = (mate: Mate, event: React.MouseEvent) => {
    event.stopPropagation();
    setDeletingMate(mate);
    setDeleteDialogOpen(true);
  };

  // Close deletion dialog
  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false);
    setDeletingMate(null);
  };

  // Delete mate
  const handleDeleteConfirm = async () => {
    if (!deletingMate) return;
    
    setIsDeleting(true);
    try {
      await apiClient.delete(`/mates/${deletingMate.id}`);
      setDeleteDialogOpen(false);
      setDeletingMate(null);
      // Reload list
      loadCharacters();
    } catch (err: any) {
      console.error('削除エラー:', err);
      alert('メイトの削除に失敗しました');
    } finally {
      setIsDeleting(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
        <Typography variant="h6" sx={{ ml: 2 }}>
          作成したメイトを読み込み中...
        </Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mt: 2 }}>
        メイト一覧が読めません。APIが動いているか確認してください。
      </Alert>
    );
  }

  return (
    <Box sx={{ mt: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <IconButton onClick={onBackToTabs}> 
          <ArrowBackRoundedIcon />
        </IconButton>
        <Typography variant="h6" sx={{ ml: 1 }}>
          マイメイト
        </Typography>
      </Box>

      {mates.length === 0 && (
        <Typography sx={{ mt: 2 }}>
          あれ？まだメイトが1人も作られてないみたい。
          [作成] タブで、新しい魂をつくってみよう！
        </Typography>
      )}

      <List>
        {mates.map((mate) => (
          <ListItem 
            key={mate.id} 
            disablePadding
            secondaryAction={
              <IconButton 
                edge="end" 
                aria-label="delete"
                onClick={(e) => handleDeleteClick(mate, e)}
              >
                <DeleteIcon />
              </IconButton>
            }
          >
            <ListItemButton onClick={() => onMateEdit(mate.id)}>
              <ListItemIcon>
                <TagFacesRoundedIcon />
              </ListItemIcon>
              <ListItemText 
                primary={mate.mate_name} 
              />
            </ListItemButton>
          </ListItem>
        ))}
      </List>

      {/* Deletion confirmation dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={handleDeleteCancel}
      >
        <DialogTitle>メイトを削除しますか?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            「{deletingMate?.mate_name}」を削除すると、このメイトとの会話履歴もすべて削除されます。
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

export default MyMateListScreen;
