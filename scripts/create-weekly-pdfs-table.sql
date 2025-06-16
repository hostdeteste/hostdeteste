-- Criar tabela weekly_pdfs se não existir
CREATE TABLE IF NOT EXISTS public.weekly_pdfs (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    url TEXT NOT NULL,
    uploadDate TIMESTAMP WITH TIME ZONE NOT NULL,
    week TEXT NOT NULL,
    year INTEGER NOT NULL,
    file_path TEXT NOT NULL,
    original_size BIGINT,
    compressed_size BIGINT,
    compression_ratio DECIMAL(5,3),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_weekly_pdfs_upload_date ON public.weekly_pdfs(uploadDate DESC);
CREATE INDEX IF NOT EXISTS idx_weekly_pdfs_year ON public.weekly_pdfs(year);
CREATE INDEX IF NOT EXISTS idx_weekly_pdfs_created_at ON public.weekly_pdfs(created_at DESC);

-- Habilitar RLS (Row Level Security)
ALTER TABLE public.weekly_pdfs ENABLE ROW LEVEL SECURITY;

-- Política para permitir todas as operações (ajuste conforme necessário)
DROP POLICY IF EXISTS "Enable all operations for weekly_pdfs" ON public.weekly_pdfs;
CREATE POLICY "Enable all operations for weekly_pdfs" ON public.weekly_pdfs
    FOR ALL USING (true);

-- Verificar se a tabela foi criada corretamente
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'weekly_pdfs' 
ORDER BY ordinal_position;
