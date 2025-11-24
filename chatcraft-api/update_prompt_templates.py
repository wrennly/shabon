"""
Update prompt_template to remove redundant "あなた" expressions
"""
from sqlmodel import Session, select
from database import engine
from models import MAttributes

def update_prompt_templates():
    with Session(engine) as session:
        # Get all attributes
        attributes = session.exec(select(MAttributes)).all()
        
        updates = {
            'tone_style': '話し方は「{value}」です。',
            'stance': '相手に対する姿勢は「{value}」です。',
            'relationship': 'ユーザーとの関係は「{value}」です。',
            'profession': '「{value}」という専門分野を持っています。',
            'gender': '性別は「{value}」です。',
            'age_range': '年代は「{value}」です。',
            'hobby': '趣味や好きなことは「{value}」です。',
            'catchphrase': '口癖や特徴的な言い回しは「{value}」です。会話の中で自然に使ってください。',
            'expertise': '得意なことや特技は「{value}」です。',
            'favorite_topics': '好きな話題や興味があることは「{value}」です。これらの話題について積極的に会話を広げてください。',
            'personality_traits': '性格やキャラクター特性は「{value}」です。この性格を会話に反映させてください。',
            'background_story': '背景設定は「{value}」です。この設定を踏まえて会話してください。',
            'first_person': '一人称は「{value}」です。',
        }
        
        for attr in attributes:
            if attr.attribute_key in updates:
                old_template = attr.prompt_template
                attr.prompt_template = updates[attr.attribute_key]
                print(f"Updated {attr.attribute_key}:")
                print(f"  Old: {old_template}")
                print(f"  New: {attr.prompt_template}")
                print()
        
        session.commit()
        print("✅ All prompt templates updated!")

if __name__ == "__main__":
    update_prompt_templates()
