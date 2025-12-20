"""
Discord Logger for Python Backend
"""
import requests
import json
from datetime import datetime
from typing import Any, Optional

DISCORD_WEBHOOK_URL = 'https://discord.com/api/webhooks/1451815084467949622/0BJE0hrp4p7CntPHr-Oz_L3taIaqBz_5jeKEFeaWoCRB6FlQsX7rkVaL8YLXCNYosRXN'

def log_to_discord(message: str, data: Optional[Any] = None) -> None:
    """Send log message to Discord webhook"""
    try:
        timestamp = datetime.now().strftime('%Y/%m/%d %H:%M:%S')
        content = f"**[{timestamp}]** {message}"
        
        if data:
            data_str = json.dumps(data, ensure_ascii=False, indent=2) if not isinstance(data, str) else data
            if len(data_str) > 1500:
                content += '\n```\n' + data_str[:1500] + '...\n```'
            else:
                content += '\n```\n' + data_str + '\n```'
        
        response = requests.post(
            DISCORD_WEBHOOK_URL,
            json={
                'content': content,
                'username': 'Shabon API',
            },
            timeout=5
        )
        
        if not response.ok:
            print(f'Failed to send log to Discord, status: {response.status_code}')
    except Exception as e:
        print(f'Failed to send log to Discord: {e}')


def log_error_to_discord(message: str, error: Exception) -> None:
    """Send error message to Discord webhook"""
    error_data = {
        'error_type': type(error).__name__,
        'error_message': str(error),
    }
    log_to_discord(f"🔴 {message}", error_data)


def log_success_to_discord(message: str, data: Optional[Any] = None) -> None:
    """Send success message to Discord webhook"""
    log_to_discord(f"✅ {message}", data)

