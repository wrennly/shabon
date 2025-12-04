-- Update prompt_template to remove redundant "あなた" expressions
UPDATE m_attributes SET prompt_template = '話し方は「{value}」です。' WHERE attribute_key = 'tone_style';
UPDATE m_attributes SET prompt_template = '相手に対する姿勢は「{value}」です。' WHERE attribute_key = 'stance';
UPDATE m_attributes SET prompt_template = 'ユーザーとの関係は「{value}」です。' WHERE attribute_key = 'relationship';
UPDATE m_attributes SET prompt_template = '「{value}」という専門分野を持っています。' WHERE attribute_key = 'profession';
UPDATE m_attributes SET prompt_template = '性別は「{value}」です。' WHERE attribute_key = 'gender';
UPDATE m_attributes SET prompt_template = '年代は「{value}」です。' WHERE attribute_key = 'age_range';
UPDATE m_attributes SET prompt_template = '趣味や好きなことは「{value}」です。' WHERE attribute_key = 'hobby';
UPDATE m_attributes SET prompt_template = '口癖や特徴的な言い回しは「{value}」です。会話の中で自然に使ってください。' WHERE attribute_key = 'catchphrase';
UPDATE m_attributes SET prompt_template = '得意なことや特技は「{value}」です。' WHERE attribute_key = 'expertise';
UPDATE m_attributes SET prompt_template = '好きな話題や興味があることは「{value}」です。これらの話題について積極的に会話を広げてください。' WHERE attribute_key = 'favorite_topics';
UPDATE m_attributes SET prompt_template = '性格やキャラクター特性は「{value}」です。この性格を会話に反映させてください。' WHERE attribute_key = 'personality_traits';
UPDATE m_attributes SET prompt_template = '背景設定は「{value}」です。この設定を踏まえて会話してください。' WHERE attribute_key = 'background_story';
UPDATE m_attributes SET prompt_template = '一人称は「{value}」です。' WHERE attribute_key = 'first_person';
