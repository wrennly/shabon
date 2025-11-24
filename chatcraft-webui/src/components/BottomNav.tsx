// src/components/BottomNav.tsx (NEW FILE!)

import React from 'react'; // (FC を使うなら import React, { FC } from 'react';)
import {
  Paper,
  BottomNavigation,
  BottomNavigationAction,
} from '@mui/material';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import ForumRoundedIcon from '@mui/icons-material/ForumRounded';
import AddReactionRoundedIcon from '@mui/icons-material/AddReactionRounded';
import { BOTTOM_NAV_HEIGHT } from '../constants';

// ---
// TypeScript の「型（かた）」を定義（ていぎ）するよ！ (interface)
// 1. currentTab: 「数字」だよ
// 2. onTabChange: 「(新しい数字) を受（う）け取（と）って、何（なに）も返（かえ）さない関数（かんすう）」だよ
// ---
interface BottomNavProps {
  currentTab: number;
  onTabChange: (newValue: number) => void;
}

// ---
// もらう道具（どうぐ）に「型（かた）」 (BottomNavProps) を指定（してい）するよ！
// (React.FC<BottomNavProps> と書（か）いてもOK！)
// ---
function BottomNav({ currentTab, onTabChange }: BottomNavProps) {
  return (
    <Paper
      sx={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        flexShrink: 0
      }}
      elevation={3}
    >
      <BottomNavigation
        showLabels
        value={currentTab} // ← (型（かた）がついてるから安心（あんしん）！)
        onChange={(event, newValue) => { // (newValue が「number」だと TypeScript が知（し）ってる！)
          onTabChange(newValue);
        }}
        sx={{
          height: BOTTOM_NAV_HEIGHT // ← 「'72px'」を「定数（ていすう）」に！
        }}
      >
        <BottomNavigationAction label="チャット" icon={<ForumRoundedIcon />} />
        <BottomNavigationAction label="検索" icon={<SearchRoundedIcon />} />
        <BottomNavigationAction label="作成" icon={<AddReactionRoundedIcon />} />
      </BottomNavigation>
    </Paper>
  );
}

export default BottomNav;