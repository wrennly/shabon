# utils/deepseek_client.py
"""
DeepSeek API Client
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DeepSeek v3を使った会話生成
"""

import os
from typing import List, Dict, Optional
from openai import OpenAI
import logging

logger = logging.getLogger(__name__)

class DeepSeekClient:
    """DeepSeek API Client"""
    
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
        
        self.client = OpenAI(
            api_key=self.api_key,
            base_url=base_url
        )
        self.model = "deepseek-chat"
    
    def chat(
        self,
        system_prompt: str,
        history: List[Dict[str, str]],
        user_message: str,
        temperature: float = 0.7,
        max_tokens: int = 2000
    ) -> str:
        """
        Generate chat response
        
        Args:
            system_prompt: System prompt (character settings)
            history: Conversation history [{"role": "user"/"assistant", "content": "..."}]
            user_message: Current user message
            temperature: Sampling temperature (0.0-2.0)
            max_tokens: Maximum tokens to generate
            
        Returns:
            AI response text
        """
        try:
            # Build messages
            messages = [
                {"role": "system", "content": system_prompt}
            ]
            
            # Add history
            messages.extend(history)
            
            # Add current message
            messages.append({"role": "user", "content": user_message})
            
            # Call API
            response = self.client.chat.completions.create(
                model=self.model,
                messages=messages,
                temperature=temperature,
                max_tokens=max_tokens,
                stream=False
            )
            
            # Extract response
            ai_message = response.choices[0].message.content
            
            logger.info(f"DeepSeek response generated (tokens: {response.usage.total_tokens})")
            
            return ai_message
        
        except Exception as e:
            logger.error(f"DeepSeek API error: {str(e)}")
            raise
    
    def generate_summary(
        self,
        conversation: str,
        categories: List[str]
    ) -> str:
        """
        Generate conversation summary for RAG
        
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
        
        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": "あなたは会話を簡潔に要約する専門家です。"},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.3,
                max_tokens=500
            )
            
            summary = response.choices[0].message.content
            logger.info("DeepSeek summary generated")
            
            return summary
        
        except Exception as e:
            logger.error(f"DeepSeek summary generation error: {str(e)}")
            raise

