// src/App.tsx

import React, { useState, useEffect } from 'react';
import apiClient from './api';
import { authService } from './api';

// MUI
import {
  Container,
  Typography, 
  CircularProgress, 
  Box, 
  Alert,
  ThemeProvider
} from '@mui/material';
import theme from './theme';

import Header from './components/Header';
import BottomNav from './components/BottomNav';
import AppDrawer from './components/AppDrawer';
import { BOTTOM_NAV_HEIGHT } from './constants';

import MateBuilder from './pages/MateBuilder'; 
import MateListScreen from './pages/MateListScreen';
import MyMateListScreen from './pages/MyMateListScreen';
import ChatRoomScreen from './pages/ChatRoomScreen';
import MateEditor from './pages/MateEditor';
import LoginScreen from './pages/LoginScreen';
import SearchScreen from './pages/SearchScreen';
import ProfileScreen from './pages/ProfileScreen';

interface User {
  username: string;
  [key: string]: any;
}

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

function App() {
  // 状態管理
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [schema, setSchema] = useState<SchemaAttribute[] | null>(null);
  const [loadingSchema, setLoadingSchema] = useState(true);
  const [schemaError, setSchemaError] = useState<any>(null);
  const [currentTab, setCurrentTab] = useState(0); 
  const [selectedCharacterId, setSelectedCharacterId] = useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [currentView, setCurrentView] = useState('tabs');
  const [editingCharacterId, setEditingCharacterId] = useState<string | null>(null);
  const [refreshMateList, setRefreshMateList] = useState(0); // List refresh trigger
  
  // ログイン状態とスキーマを初期化
  useEffect(() => {
    const username = authService.getCurrentUser();
    console.log('👤 Current user from localStorage:', username);
    if (username) {
      setCurrentUser({ username: username }); 
      loadSchema(); 
    }
    setAuthLoading(false); 
  }, []);
  
  const handleMenuClick = () => {
    setIsDrawerOpen(true);
  };

  const loadSchema = () => {
    setLoadingSchema(true);
    apiClient.get('/settings/schema')
      .then(response => {
        setSchema(response.data.attributes);
        setLoadingSchema(false);
      })
      .catch(err => {
        setSchemaError(err);
        setLoadingSchema(false);
      });
  };
  
  const handleLoginSuccess = (user: User) => {
    authService.login(user.username); 
    setCurrentUser(user);
    loadSchema();
  };

  const handleLogout = () => {
    authService.logout();
    window.location.reload(); 
  };
  
  // ナビゲーション処理
  const handleNavigateToProfile = () => {
    setCurrentView('profile');
    setIsDrawerOpen(false);
  };

  const handleShowCreatedCharacters = () => {
    setCurrentView('my_characters');
    setIsDrawerOpen(false);
  };

  const handleNavigateToEdit = (id: string) => {
    setEditingCharacterId(id);
    setCurrentView('edit');
  };

  // キャラ選択
  const handleMateSelect = (id: string) => {
    setSelectedCharacterId(id);
    setCurrentView('chat');
  };

  // リスト画面に戻る
  const handleBackToList = () => {
    setSelectedCharacterId(null);
    setEditingCharacterId(null);
    setCurrentView('tabs');
    setCurrentTab(0); // ルームメイト（タブ0）に戻る
    setRefreshMateList(prev => prev + 1); // Trigger list refresh
  };

  const renderSchemaLoader = () => {
    if (loadingSchema) {
      return (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <CircularProgress />
        </Box>
      );
    }
    if (schemaError) {
      return (
        <Alert severity="error" sx={{ mt: 2 }}>
          スキーマの読み込みに失敗しました
        </Alert>
      );
    }
    return null;
  };

  // ローディング中
  if (authLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
        <Typography sx={{ ml: 2 }}>起動中...</Typography>
      </Box>
    );
  }

  // ログインが必要
  if (!currentUser) {
    return (
      <LoginScreen onLoginSuccess={handleLoginSuccess} />
    );
  }

  // メイン画面
  return (
    <ThemeProvider theme={theme}>
      <Box className="App" sx={{
        height: '100vh',
        paddingBottom: currentView === 'tabs' ? BOTTOM_NAV_HEIGHT : '0px',
        display: 'flex',
        boxSizing: 'border-box',
        flexDirection: 'column',
        overflowX: 'hidden'
      }}>
      {/* ドロワーメニュー */}
      <AppDrawer
        open={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onNavigateProfile={handleNavigateToProfile}
        onShowCreated={handleShowCreatedCharacters}
        onLogout={handleLogout}
      />
      {/* チャット画面 */}
      {currentView === 'chat' && (
        <ChatRoomScreen 
          mateId={selectedCharacterId} 
          onBackToList={handleBackToList}
          sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}
        />
      )}
      {/* その他の画面 */}
      {currentView !== 'chat' && (
        <Container maxWidth="sm" sx={{ 
          flexGrow: 1, 
          display: 'flex', 
          flexDirection: 'column', 
          overflowY: 'hidden' 
        }}>
          {/* ヘッダー */}
          {currentView !== 'chat' && (
            <Header onMenuClick={handleMenuClick} />
          )}
          
          {/* プロフィール画面 */}
          {currentView === 'profile' && (
            <Box sx={{ overflowY: 'auto', flexGrow: 1, minHeight: 0 }}>
              <ProfileScreen 
                onBackToTabs={() => setCurrentView('tabs')}
                onLogout={handleLogout}
              />
            </Box>
          )}
          {/* マイキャラ画面 */}
          {currentView === 'my_characters' && (
            <Box sx={{ overflowY: 'auto', flexGrow: 1, minHeight: 0 }}>
              <MyMateListScreen
                onMateEdit={handleNavigateToEdit}
                onBackToTabs={() => setCurrentView('tabs')}
              />
            </Box>
          )}
          {/* キャラ編集画面 */}
          {currentView === 'edit' && (
            <Box sx={{ overflowY: 'auto', flexGrow: 1, minHeight: 0 }}>
              {schema ? (
                <MateEditor 
                  characterId={editingCharacterId}
                  schema={schema}
                  onBackToList={handleBackToList}
                />
              ) : (
                renderSchemaLoader()
              )}
            </Box>
          )}

          {/* タブ画面 */}
          {currentView === 'tabs' && (
            <>
              {/* タブ0: キャラクター一覧 */}
              {currentTab === 0 && (
                <Box sx={{ overflowY: 'auto', flexGrow: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>  
                  <MateListScreen 
                    key={refreshMateList}
                    onMateSelect={handleMateSelect}
                  />
                </Box>
              )}

              {/* タブ1: 検索 */}
              {currentTab === 1 && (
                <Box sx={{ overflowY: 'auto', flexGrow: 1, minHeight: 0 }}>
                  <SearchScreen 
                    onMateSelect={handleMateSelect} 
                  />
                </Box>
              )}

              {/* タブ2: キャラ作成 */}
              {currentTab === 2 && (
                <Box sx={{ overflowY: 'auto', flexGrow: 1, minHeight: 0 }}>
                  {schema ? (
                    <MateBuilder 
                      schema={schema} 
                      onMateSelect={handleMateSelect}
                    />
                  ) : (
                    renderSchemaLoader()
                  )}
                </Box>
              )}
            </>
          )}
        </Container>
      )}
      
      {/* ボトムナビゲーション */}
      {currentView === 'tabs' && (
        <BottomNav 
          currentTab={currentTab}
          onTabChange={(newValue) => {
            setCurrentTab(newValue);
          }}
        />
      )}      
      </Box>
    </ThemeProvider>
  );
}

export default App;
