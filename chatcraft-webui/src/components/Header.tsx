// src/components/Header.tsx (新しいロゴ入りのヘッダーだよ！)
import React from 'react';

// App.js で使（つか）ってたMUIの部品（ぶひん）たちをインポートするよ
import {
  AppBar,
  Toolbar,
  IconButton,
  Typography,
  Box
} from '@mui/material';

// App.js で使（つか）ってた「三本線（さんぼんせん）マーク」のアイコン
import MenuRoundedIcon from '@mui/icons-material/MenuRounded';

// ---
// 1. 「賢（かしこ）いレゴ (TypeScript)」のおやくそく！
// ---
// 「この部品（ぶひん） (Header) は、
//   onMenuClick っていう名前（なまえ）の『関数（かんすう）』を
//   必（かなら）ず受（う）け取（と）りますよ！」
// っていう「型（かた）」のルールを決（き）めるんだ。
interface HeaderProps {
  onMenuClick: () => void; // 「三本線マークが押（お）されたよ！」を App.js に伝（つた）えるための関数
}

// ---
// 2. Header コンポーネント本体（ほんたい）
// ---
// (React.FC<HeaderProps> って書（か）くのが「賢（かしこ）いレゴ」のお作法（さほう）だよ)
const Header: React.FC<HeaderProps> = ({ onMenuClick }) => {
  return (
    // App.js では <Box> だったけど、
    // ヘッダーには <AppBar> を使（つか）うのがMUIのお作法（さほう）なんだ (o´∀`o)
    <AppBar
      position="static" // 画面（がめん）の上（うえ）に固定（こてい）
      elevation={0} // 影（かげ）をなくして「シンプル」に
      sx={{
        backgroundColor: '#FFFFFF', // 背景（はいけい）は白
        // App.js にあった marginTop: 2 も引（ひ）き継（つ）ごう！
        marginTop: 2, 
      }}
    >
      {/* Toolbar が、中身（なかみ）をキレイに横（よこ）に並（なら）べてくれるよ */}
      <Toolbar sx={{ paddingLeft: '8px', paddingRight: '8px' }}> {/* 余白（よはく）をちょっと調整（ちょうせい） */}

        {/* 1. 【左側（ひだりがわ）】三本線（さんぼんせん）ボタン (App.js と同（おな）じ！) */}
        <IconButton
          color="inherit" // (親（おや）の色（いろ）を使（つか）う)
          aria-label="menu"
          onClick={onMenuClick} // (App.js から受（う）け取（と）った関数（かんすう）を呼（よ）び出（だ）す)
          sx={{ color: '#333' }} // アイコンの色（いろ）を黒（くろ）っぽく
        >
          <MenuRoundedIcon />
        </IconButton>

        {/* 2. 【真（ま）ん中（なか）】新しいロゴ + アプリ名 */}
        {/*
          App.js の justifyContent: 'space-between' (両（りょう）はじ) を
          flexGrow: 1 (残（のこ）りぜんぶ) に変（か）えて、
          ロゴを左寄（ひだりよ）りに見（み）せるよ！
        */}
        <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <img
            src="/images/logo_chatcraft_app.png" // (public/images/ に置（お）いてね！)
            alt="ChatCraft Logo"
            style={{
              height: '27px', // (高（たか）さ 32px)
              marginRight: '8px', // (文字（もじ）との間（あいだ）)
            }}
          />
          <Typography
            variant="h5"
            sx={{
              color: '#333',
              fontWeight: 'bold',
              //display: { xs: 'none', sm: 'block' }, // スマホでは隠（かく）す (App.js にはなかったけど、あると便利（べんり）！)
            }}
          >
            ChatCraft
          </Typography>
        </Box>

        {/* 3. 【右側（みぎがわ）】スペーサー (App.js と同（おな）じ！) */}
        {/* (これがないと「三本線（さんぼんせん）ボタン」とサイズが合（あ）わなくて、
             ロゴが真（ま）ん中（なか）からズレちゃうんだ) */}
        <Box sx={{ width: 40 }} /> 

      </Toolbar>
    </AppBar>
  );
};

export default Header; // (この部品（ぶひん）を「輸出（ゆしゅつ）」するよ！)