// src/components/AppDrawer.tsx

import React from 'react';
import {
  Drawer,
  Box,
  Typography,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
} from '@mui/material';
import AccountCircleRoundedIcon from '@mui/icons-material/AccountCircleRounded';
import LogoutRoundedIcon from '@mui/icons-material/LogoutRounded';
import TagFacesRoundedIcon from '@mui/icons-material/TagFacesRounded';
import FeedbackRoundedIcon from '@mui/icons-material/FeedbackRounded';

interface AppDrawerProps {
  open: boolean;
  onClose: () => void;
  onNavigateProfile: () => void;
  onShowCreated: () => void;
  onLogout: () => void;
}

function AppDrawer({
  open,
  onClose,
  onNavigateProfile,
  onShowCreated,
  onLogout
}: AppDrawerProps) {
  const feedbackFormUrl = process.env.REACT_APP_FEEDBACK_FORM_URL || 'https://forms.gle/example';
  
  return (
    <Drawer
      anchor="left"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          borderRadius: 0,
        }
      }}
    >
      <Box
        sx={{ width: 250}}
        role="presentation"
        onClick={onClose}
      >
        {/* ヘッダー */}
        <Box 
          sx={{ 
            display: 'flex',
            alignItems: 'center',
            p: 2
          }}
        >
          <img
              src="/images/logo_chatcraft_app.png"
              alt="ChatCraft Logo"
              style={{
                height: '20px', 
                marginRight: '6px', 
              }}
          />
          <Typography variant="h6">
            ChatCraft
          </Typography>
        </Box>

        {/* メニュー */}
        <List>
          <ListItem disablePadding>
            <ListItemButton onClick={onNavigateProfile}>
              <ListItemIcon><AccountCircleRoundedIcon /></ListItemIcon>
              <ListItemText primary="プロフィール" />
            </ListItemButton>
          </ListItem>
          
          <ListItem disablePadding>
            <ListItemButton onClick={onShowCreated}>
              <ListItemIcon><TagFacesRoundedIcon /></ListItemIcon>
              <ListItemText primary="マイメイト" />
            </ListItemButton>
          </ListItem>
          
          <Divider sx={{ my: 1 }} />
          
          <ListItem disablePadding>
            <ListItemButton 
              component="a"
              href={feedbackFormUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={onClose}
            >
              <ListItemIcon><FeedbackRoundedIcon /></ListItemIcon>
              <ListItemText primary="フィードバック" secondary="ご意見をお寄せください" />
            </ListItemButton>
          </ListItem>
          
          <ListItem disablePadding>
            <ListItemButton onClick={onLogout}>
              <ListItemIcon><LogoutRoundedIcon /></ListItemIcon>
              <ListItemText primary="ログアウト" />
            </ListItemButton>
          </ListItem>
        </List>
      </Box>
    </Drawer>
  );
}

export default AppDrawer;