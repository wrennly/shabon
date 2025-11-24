"""
Simplify prompt_template for text/textarea attributes.
Set to just '{value}' since custom text doesn't need additional formatting.
"""
from sqlmodel import Session, select
from database import engine
from models import MAttributes

def simplify_text_templates():
    """Set prompt_template to '{value}' for text/textarea attributes"""
    
    with Session(engine) as session:
        # Get all text/textarea attributes
        text_attrs = session.exec(
            select(MAttributes).where(
                MAttributes.attribute_type.in_(['text', 'textarea'])
            )
        ).all()
        
        print(f"Found {len(text_attrs)} text/textarea attributes")
        print("-" * 60)
        
        updated_count = 0
        for attr in text_attrs:
            old_template = attr.prompt_template
            
            # Set to simple {value}
            attr.prompt_template = '{value}'
            session.add(attr)
            updated_count += 1
            
            print(f"Attribute: {attr.attribute_key} ({attr.attribute_type})")
            print(f"  Old template: {old_template}")
            print(f"  New template: {attr.prompt_template}")
            print()
        
        session.commit()
        print(f"✅ Updated {updated_count} attributes")

if __name__ == "__main__":
    simplify_text_templates()
