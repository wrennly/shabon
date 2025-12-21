-- Migration: Change conversation_memory embedding from 8192 to 1024 dimensions
-- Reason: jina-embeddings-v3 supports max 1024 dimensions, not 8192

-- Drop existing data (since dimensions are incompatible)
TRUNCATE TABLE conversation_memory;

-- Alter the embedding column to use 1024 dimensions
ALTER TABLE conversation_memory 
ALTER COLUMN embedding TYPE vector(1024);

-- Add comment
COMMENT ON COLUMN conversation_memory.embedding IS 'Jina AI v3 embeddings (1024 dimensions)';

