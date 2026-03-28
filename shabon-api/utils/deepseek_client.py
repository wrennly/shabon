# utils/deepseek_client.py
"""
DeepSeek API Client
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DeepSeek v3を使った会話生成（非同期対応 + リトライロジック）
"""

import os
from typing import List, Dict, Optional
from openai import AsyncOpenAI, APIError, APITimeoutError, RateLimitError
import logging
import asyncio

logger = logging.getLogger(__name__)

class DeepSeekClient:
    """DeepSeek API Client (Async)"""
    
    def __init__(self, api_key: Optional[str] = None, base_url: str = "https://api.deepseek.com"):
        """
        Initialize DeepSeek client
        
        Args:
            api_key: DeepSeek API key (defaults to DEEPSEEK_API_KEY env var)
            base_url: API base URL
        """
        self.api_key = api_key or os.getenv("DEEPSEEK_API_KEY")
        if not self.api_key:
            raise ValueError("DEEPSEEK_API_KEY is required")
        
        self.client = AsyncOpenAI(
            api_key=self.api_key,
            base_url=base_url,
            timeout=120.0,  # DeepSeekの推論時間を考慮して120秒に設定
            max_retries=0,  # 自前のリトライロジックを使用
        )
        self.model = "deepseek-chat"
    
    async def _retry_with_backoff(self, func, max_retries=3):
        """
        指数バックオフによるリトライロジック
        
        Args:
            func: 実行する非同期関数
            max_retries: 最大リトライ回数
            
        Returns:
            関数の実行結果
        """
        for attempt in range(max_retries):
            try:
                return await func()
            except (APIError, APITimeoutError) as e:
                # 一時的なエラー（502, 503, タイムアウト）
                if attempt < max_retries - 1:
                    wait_time = 2 ** attempt  # 1秒, 2秒, 4秒...
                    logger.warning(f"DeepSeek API error (attempt {attempt + 1}/{max_retries}): {str(e)}. Retrying in {wait_time}s...")
                    await asyncio.sleep(wait_time)
                else:
                    logger.error(f"DeepSeek API error after {max_retries} attempts: {str(e)}")
                    raise
            except RateLimitError as e:
                # レート制限エラー（429）
                if attempt < max_retries - 1:
                    wait_time = 10 * (attempt + 1)  # 10秒, 20秒, 30秒...
                    logger.warning(f"DeepSeek rate limit (attempt {attempt + 1}/{max_retries}). Retrying in {wait_time}s...")
                    await asyncio.sleep(wait_time)
                else:
                    logger.error(f"DeepSeek rate limit exceeded after {max_retries} attempts")
                    raise
            except Exception as e:
                # その他のエラーは即座に送出
                logger.error(f"DeepSeek unexpected error: {str(e)}")
                raise
    
    async def chat(
        self,
        system_prompt: str,
        history: List[Dict[str, str]],
        user_message: str,
        temperature: float = 1.3,
        max_tokens: int = 2000
    ) -> str:
        """
        Generate chat response (async)
        
        Args:
            system_prompt: System prompt (character settings)
            history: Conversation history [{"role": "user"/"assistant", "content": "..."}]
            user_message: Current user message
            temperature: Sampling temperature (0.0-2.0)
            max_tokens: Maximum tokens to generate
            
        Returns:
            AI response text
        """
        # Build messages
        messages = [
            {"role": "system", "content": system_prompt}
        ]
        
        # Add history
        messages.extend(history)
        
        # Add current message
        messages.append({"role": "user", "content": user_message})
        
        # リトライロジック付きでAPI呼び出し
        async def _call_api():
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=messages,
                temperature=temperature,
                max_tokens=max_tokens,
                stream=False
            )
            return response
        
        response = await self._retry_with_backoff(_call_api)
        
        # Extract response
        ai_message = response.choices[0].message.content
        
        logger.info(f"DeepSeek response generated (tokens: {response.usage.total_tokens})")
        
        return ai_message
    
    async def generate_summary(
        self,
        conversation: str,
        categories: List[str]
    ) -> str:
        """
        Generate conversation summary for RAG (async)
        
        Args:
            conversation: Conversation text to summarize
            categories: Information categories to extract
            
        Returns:
            Summary text
        """
        categories_text = "\n".join([f"- {cat}" for cat in categories])
        
        prompt = f"""以下の会話を10-20文で要約してください。

【抽出すべき情報】
{categories_text}

【会話内容】
{conversation}

【要約】
"""
        
        # リトライロジック付きでAPI呼び出し
        async def _call_api():
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": "あなたは会話を簡潔に要約する専門家です。"},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.3,
                max_tokens=500
            )
            return response
        
        response = await self._retry_with_backoff(_call_api)
        
        summary = response.choices[0].message.content
        logger.info("DeepSeek summary generated")
        
        return summary

