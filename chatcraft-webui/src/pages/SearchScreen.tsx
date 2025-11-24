// src/SearchScreen.tsx

import React, { useState, useEffect } from 'react';
import apiClient from '../api';
import { trackSearch, trackMateView } from '../analytics';
import {
  Box,
  Typography,
  CircularProgress,
  Alert,
  Card,
  CardActionArea,
  CardContent,
  TextField,
  InputAdornment
} from '@mui/material';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';

interface Character {
  id: string;
  mate_name: string;
  mate_id?: string;
  profile_preview?: string;
  [key: string]: any;
}

interface SearchScreenProps {
  onMateSelect: (id: string) => void;
}

function SearchScreen({ onMateSelect }: SearchScreenProps) {
  const [publicChars, setPublicChars] = useState<Character[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Load public mates list
  useEffect(() => {
    setLoading(true);
    setError(null);

    apiClient.get('/mates/public')
      .then(response => {
        setPublicChars(response.data);
        setLoading(false);
      })
      .catch(err => {
        console.error('公開メイトリストの取得に失敗…', err);
        setError('みんなのメイトが読み込めませんでした');
        setLoading(false);
      });
  }, []);

  // Search by name or mate_id
  const handleSearch = (term: string) => {
    setSearchTerm(term);
    if (term.trim()) {
      trackSearch(term);
    }
  };

  const renderEmptyMessage = () => {
    if (publicChars.length === 0) {
      return (
        <Alert severity="info" sx={{ mt: 2 }}>
          まだ誰もメイトを「公開」してないみたい…。
          [作成]タブで、キミが「第1号」になろう！
        </Alert>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
        <Typography sx={{ ml: 2 }}>みんなのメイトを探してるよ…</Typography>
      </Box>
    );
  }

  if (error) {
    return <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>;
  }

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Search bar - fixed at top */}
      <Box sx={{ 
        position: 'sticky', 
        top: 0, 
        zIndex: 10, 
        bgcolor: 'background.default',
        pb: 2,
        pt: 2
      }}>
        <TextField
          fullWidth
          variant="outlined"
          placeholder="メイトをさがす..."
          value={searchTerm}
          onChange={(e) => handleSearch(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchRoundedIcon />
              </InputAdornment>
            ),
          }}
        />
      </Box>
      
      {/* Scrollable content area */}
      <Box sx={{ flex: 1, overflow: 'auto' }}>
        {renderEmptyMessage()}

        {/* Mate cards list */}
        {(() => {
          const filteredChars = publicChars.filter((mate) => {
            const term = searchTerm.toLowerCase();
            return (
              mate.mate_name.toLowerCase().includes(term) ||
              mate.mate_id?.toLowerCase().includes(term)
            );
          });

          if (searchTerm && filteredChars.length === 0) {
            return (
              <Alert severity="info" sx={{ mt: 2 }}>
                「{searchTerm}」に一致するメイトは見つかりませんでした
              </Alert>
            );
          }

          return (
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 2, mt: 1 }}>
              {filteredChars.map((mate) => (
                <Box key={mate.id}>
                  <Card sx={{ height: '100%' }}>
                    <CardActionArea 
                      onClick={() => {
                        trackMateView(mate.id, mate.mate_name);
                        onMateSelect(mate.id);
                      }}
                      sx={{ height: '100%' }}
                    >
                      <CardContent sx={{ p: 1.5 }}>
                        <Typography 
                          variant="caption" 
                          color="text.secondary"
                          sx={{ 
                            display: 'block',
                            fontSize: '0.7rem',
                            mb: 0.5
                          }}
                        >
                          ID: {mate.mate_id || '---'}
                        </Typography>
                        
                        <Typography 
                          variant="body2" 
                          component="div"
                          sx={{ 
                            fontWeight: 'bold',
                            mb: 0.5
                          }}
                        >
                          {mate.mate_name}
                        </Typography>
                        
                        {mate.profile_preview && (
                          <Typography 
                            variant="caption" 
                            color="text.secondary"
                            sx={{ 
                              display: 'block',
                              fontSize: '0.75rem',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap'
                            }}
                          >
                            {mate.profile_preview}
                          </Typography>
                        )}
                      </CardContent>
                    </CardActionArea>
                  </Card>
                </Box>
              ))}
            </Box>
          );
        })()}
      </Box>
    </Box>
  );
}

export default SearchScreen;
