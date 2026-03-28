/**
 * Discord Webhook Logger
 * デバッグ用にログをDiscordに送信する
 */

const DISCORD_WEBHOOK_URL = 'https://discord.com/api/webhooks/1451815084467949622/0BJE0hrp4p7CntPHr-Oz_L3taIaqBz_5jeKEFeaWoCRB6FlQsX7rkVaL8YLXCNYosRXN';

/**
 * Discordにログメッセージを送信
 */
export const logToDiscord = async (message: string, data?: any) => {
  // Development BuildでもProduction Buildでも送信する（デバッグ用）
  // 必要に応じてここで制御可能
  
  // 通常のコンソールログも出力
  console.log(`[Discord] ${message}`, data);
  
  try {
    const timestamp = new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' });
    let content = `**[${timestamp}]** ${message}`;
    
    if (data) {
      const dataStr = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
      // Discordの文字数制限（2000文字）を考慮
      if (dataStr.length > 1500) {
        content += '\n```\n' + dataStr.substring(0, 1500) + '...\n```';
      } else {
        content += '\n```\n' + dataStr + '\n```';
      }
    }

    const response = await fetch(DISCORD_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        content: content,
        username: 'Shabon Debug',
      }),
    });
    
    if (!response.ok) {
      // 429 (Rate Limit) は無視（ログが多すぎるだけなので問題なし）
      if (response.status !== 429) {
        console.warn('[Discord] Webhook failed:', response.status, response.statusText);
      }
    }
  } catch (error) {
    // Discord送信失敗は無視（アプリの動作には影響しない）
    // console.error を使わないことで、ユーザーに表示されない
  }
};

/**
 * Discordにエラーログを送信
 */
export const logErrorToDiscord = async (message: string, error: any) => {
  try {
    const errorInfo = {
      message: error?.message || 'Unknown error',
      code: error?.code,
      name: error?.name,
      stack: error?.stack?.substring(0, 500), // スタックトレースは最初の500文字のみ
    };
    
    await logToDiscord(`🔴 **ERROR:** ${message}`, errorInfo);
  } catch (e) {
    // Discord送信失敗は無視
  }
};

/**
 * Discordに成功ログを送信
 */
export const logSuccessToDiscord = async (message: string, data?: any) => {
  try {
    await logToDiscord(`✅ **SUCCESS:** ${message}`, data);
  } catch (e) {
    // Discord送信失敗は無視
  }
};

