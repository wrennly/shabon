"""
Prompt generation utilities for ChatCraft AI mates.
Generates system prompts based on attribute settings and base_prompt.
"""
import re
from typing import Optional, Dict, Any, List
from datetime import datetime

def normalize_base_prompt(raw_prompt: Optional[str]) -> str:
    """
    Normalize user's base_prompt by removing redundant "あなたは" expressions.
    
    Args:
        raw_prompt: User's raw input prompt
    
    Returns:
        Normalized prompt text suitable for AI processing
    """
    if not raw_prompt:
        return ""
    
    # Remove redundant "あなたは" at the beginning of sentences
    normalized = raw_prompt.strip()
    
    # Pattern: Remove "あなたは" at the start of the text
    normalized = re.sub(r'^あなたは', '', normalized)
    
    # Pattern: Remove "あなたは" at the start of each line
    normalized = re.sub(r'\n\s*あなたは', '\n', normalized)
    
    # Pattern: Remove "あなたは" after sentence endings (。)
    normalized = re.sub(r'。\s*あなたは', '。\n', normalized)
    
    # Clean up extra whitespace and newlines
    normalized = re.sub(r'\n{3,}', '\n\n', normalized)
    normalized = re.sub(r'^\s+', '', normalized, flags=re.MULTILINE)
    normalized = normalized.strip()
    
    return normalized


def generate_profile_text(settings: List[Dict[str, Any]], attributes_data: List[Dict[str, Any]]) -> str:
    """
    Generate attractive profile text from mate settings.
    Converts structured settings into a natural, flowing narrative.
    
    Args:
        settings: List of mate settings (from mate_settings table)
        attributes_data: List of attribute definitions (from m_attributes table)
    
    Returns:
        Natural profile text suitable for display
    """
    # Create attribute lookup map
    attr_map = {attr['attribute_key']: attr for attr in attributes_data}
    
    # Extract key information
    profile_data = {}
    for setting in settings:
        attr_key = setting.get('attribute_key')
        if attr_key and attr_key in attr_map:
            attr = attr_map[attr_key]
            attr_type = attr.get('attribute_type', '')
            
            if attr_type == 'select':
                value = setting.get('option_value', '')
            else:
                value = setting.get('custom_value', '')
            
            if value:
                profile_data[attr_key] = value
    
    # Build natural profile text
    sentences = []
    
    # First person pronoun + gender + age
    first_person = profile_data.get('first_person', 'わたし')
    gender = profile_data.get('gender', '')
    age = profile_data.get('age_range', '')
    
    intro_parts = [first_person]
    if age:
        intro_parts.append(f"{age}の")
    if gender:
        intro_parts.append(f"{gender}")
    
    if len(intro_parts) > 1:
        sentences.append(''.join(intro_parts) + "です。")
    
    # Occupation
    occupation = profile_data.get('occupation', '')
    if occupation:
        sentences.append(f"{occupation}をしています。")
    
    # Hobbies
    hobbies = profile_data.get('hobbies', '')
    if hobbies:
        sentences.append(f"{hobbies}が大好きです。")
    
    # Specialty
    specialty = profile_data.get('specialty', '')
    if specialty:
        sentences.append(f"{specialty}が得意です。")
    
    # Relationship
    relationship = profile_data.get('relationship', '')
    if relationship:
        sentences.append(f"あなたの{relationship}として、いつでも力になりたいと思っています。")
    
    # Tone style
    tone = profile_data.get('tone_style', '')
    if tone:
        if tone == 'です・ます調':
            tone_desc = "丁寧な言葉遣いで話します"
        elif tone == 'タメ口':
            tone_desc = "フランクに話します"
        elif tone == 'カジュアル敬語':
            tone_desc = "親しみやすい敬語で話します"
        else:
            tone_desc = f"{tone}で話します"
        sentences.append(f"{tone_desc}。")
    
    # Catchphrase
    catchphrase = profile_data.get('catchphrase', '')
    if catchphrase:
        sentences.append(f"「{catchphrase}」が口癖です。")
    
    # Dialogue stance
    stance = profile_data.get('dialogue_stance', '')
    if stance:
        sentences.append(f"{stance}ので、安心してくださいね。")
    
    return ''.join(sentences)


def build_attribute_prompt(settings: List[Dict[str, Any]], attributes_data: List[Dict[str, Any]]) -> str:
    """
    Build attribute-based prompt from mate settings.
    
    Simple and clear design:
    - For text/textarea: "{display_name}は「{custom_value}」です。"
    - For select: "{display_name}は、{prompt_snippet}です。"
    
    Args:
        settings: List of mate settings (from mate_settings table)
        attributes_data: List of attribute definitions (from m_attributes table)
    
    Returns:
        Generated prompt text based on attribute templates and snippets
    """
    # Create attribute lookup map
    attr_map = {attr['attribute_key']: attr for attr in attributes_data}
    
    # Sort settings by prompt_order
    sorted_settings = []
    for setting in settings:
        attr_key = setting.get('attribute_key')
        if attr_key and attr_key in attr_map:
            attr = attr_map[attr_key]
            sorted_settings.append({
                'setting': setting,
                'attribute': attr,
                'order': attr.get('prompt_order', 999)
            })
    
    sorted_settings.sort(key=lambda x: x['order'])
    
    # Generate prompt lines
    prompt_lines = []
    for item in sorted_settings:
        setting = item['setting']
        attr = item['attribute']
        attr_type = attr.get('attribute_type', '')
        display_name = attr.get('display_name', '')
        
        # For select: "{display_name}は、{prompt_snippet}です。"
        if attr_type == 'select':
            snippet = setting.get('prompt_snippet', '')
            if snippet and display_name:
                line = f"{display_name}は、{snippet}です。"
            else:
                continue
        # For text/textarea: "{display_name}は「{custom_value}」です。"
        elif attr_type in ('text', 'textarea'):
            value = setting.get('custom_value', '')
            if value and display_name:
                line = f"{display_name}は「{value}」です。"
            else:
                continue
        else:
            continue
        
        prompt_lines.append(line)
    
    return '\n'.join(prompt_lines)


def generate_few_shot_examples(mate_name: str, settings: List[Dict[str, Any]]) -> str:
    """
    Auto-generate few-shot examples based on mate settings.
    
    Args:
        mate_name: Name of the mate
        settings: List of mate settings
    
    Returns:
        Generated few-shot examples in markdown format
    """
    # Extract key characteristics
    tone = None
    relationship = None
    catchphrase = None
    
    for setting in settings:
        key = setting.get('attribute_key')
        value = setting.get('custom_value') or setting.get('option_value', '')
        
        if key == 'tone_style':
            tone = value
        elif key == 'relationship':
            relationship = value
        elif key == 'catchphrase':
            catchphrase = value
    
    # Generate examples based on characteristics
    examples = []
    
    # Example 1: Greeting
    if tone == 'タメ口':
        user_msg = "おはよう！"
        ai_msg = f"おはよー！今日も頑張ろうね{catchphrase if catchphrase else '！'}"
    elif tone == '敬語':
        user_msg = "おはようございます"
        ai_msg = f"おはようございます！本日もよろしくお願いいたします{catchphrase if catchphrase else '。'}"
    else:
        user_msg = "こんにちは"
        ai_msg = f"こんにちは！{catchphrase if catchphrase else ''}"
    
    examples.append(f"User: {user_msg}\nAssistant: {ai_msg}")
    
    # Example 2: Question response
    if relationship == '親友':
        user_msg = "最近どう？"
        ai_msg = f"うーん、まあまあかな！あなたは？{catchphrase if catchphrase else ''}"
    elif relationship == '先生':
        user_msg = "質問があります"
        ai_msg = f"はい、なんでしょうか？{catchphrase if catchphrase else ''}"
    else:
        user_msg = "元気？"
        ai_msg = f"元気だよ！{catchphrase if catchphrase else ''}"
    
    examples.append(f"User: {user_msg}\nAssistant: {ai_msg}")
    
    return '\n\n'.join(examples)


def build_system_prompt(
    mate_name: str,
    base_prompt: Optional[str],
    settings: List[Dict[str, Any]],
    attributes_data: List[Dict[str, Any]],
    user_info: Optional[Dict[str, Any]] = None,
    rag_context: Optional[str] = None,
    current_datetime: Optional[datetime] = None
) -> str:
    """
    Build complete system prompt for AI mate.
    
    Priority:
    1. Attribute-based prompts (by prompt_order)
    2. Normalized base_prompt
    3. Auto-generated few-shot examples
    4. User context
    5. RAG context
    
    Args:
        mate_name: Name of the mate
        base_prompt: User's base prompt (will be normalized)
        settings: List of mate settings
        attributes_data: List of attribute definitions
        user_info: Optional user information
        rag_context: Optional RAG context from conversation memory
        current_datetime: Current datetime for context
    
    Returns:
        Complete system prompt text
    """
    sections = []
    
    # Header
    sections.append(f"# {mate_name}としてのロール")
    sections.append("")
    
    # Base prompt (normalized)
    if base_prompt:
        normalized = normalize_base_prompt(base_prompt)
        if normalized:
            sections.append(normalized)
            sections.append("")
    
    # Attribute-based characteristics
    attr_prompt = build_attribute_prompt(settings, attributes_data)
    if attr_prompt:
        sections.append("## キャラクター設定")
        sections.append(attr_prompt)
        sections.append("")
    
    # Few-shot examples (auto-generated)
    few_shot = generate_few_shot_examples(mate_name, settings)
    if few_shot:
        sections.append("## 会話例")
        sections.append(few_shot)
        sections.append("")
    
    # Current datetime
    if current_datetime:
        dt_str = current_datetime.strftime("%Y年%m月%d日 %H:%M")
        weekday = ["月", "火", "水", "木", "金", "土", "日"][current_datetime.weekday()]
        sections.append("## 現在の日時")
        sections.append(f"{dt_str} ({weekday}曜日)")
        sections.append("")
    
    # User context
    if user_info:
        sections.append("## ユーザー情報")
        if user_info.get('display_name'):
            sections.append(f"名前: {user_info['display_name']}")
            sections.append(f"※会話では「{user_info['display_name']}」と呼んでください")
        if user_info.get('profile'):
            sections.append(f"プロフィール: {user_info['profile']}")
        sections.append("")
    
    # RAG context
    if rag_context:
        sections.append("## 過去の会話の記憶")
        sections.append(rag_context)
        sections.append("")
    
    # Instructions
    sections.append("## 指示")
    sections.append("上記の設定と会話例に基づいて、自然で同じことを繰り返さず、多様性のある会話を行ってください。")
    if user_info and user_info.get('display_name'):
        sections.append(f"ユーザーのことは「{user_info['display_name']}」と呼んでください。")
    sections.append("回答はユーザーに合わせて柔軟な長さで会話してください。")
    
    return '\n'.join(sections)
