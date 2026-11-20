-- Ícone e cor de cada categoria (#185, ADR-0031).
--
-- NOT NULL: toda categoria tem os dois, então ninguém (Java, API, app) precisa tratar "sem cor".
-- DEFAULT: as categorias que os usuários já criaram, e qualquer INSERT que não informe os dois,
-- recebem a aparência neutra. Os valores ficam numa lista fechada, validada no Java
-- (AparenciaDaCategoria) e não num CHECK: assim um ícone novo não exige uma migration.
ALTER TABLE categoria
    ADD COLUMN icone VARCHAR(30) NOT NULL DEFAULT 'circle-ellipsis',
    ADD COLUMN cor   VARCHAR(20) NOT NULL DEFAULT 'cinza';

-- Aparência das 19 categorias do sistema (V2), aprovada no planejamento do M6 (#182).
UPDATE categoria AS c
SET icone = a.icone,
    cor   = a.cor
FROM (VALUES
    ('Moradia',               'house',           'coral'),
    ('Contas da casa',        'zap',             'amarelo'),
    ('Mercado',               'shopping-cart',   'verde'),
    ('Alimentação fora',      'utensils',        'laranja'),
    ('Transporte',            'car',             'azul'),
    ('Saúde',                 'heart-pulse',     'rosa'),
    ('Educação',              'graduation-cap',  'anil'),
    ('Vestuário',             'shirt',           'roxo'),
    ('Cuidados pessoais',     'sparkles',        'rosa'),
    ('Lazer',                 'ticket',          'roxo'),
    ('Assinaturas',           'repeat',          'ciano'),
    ('Dívidas e empréstimos', 'landmark',        'coral'),
    ('Impostos e taxas',      'receipt',         'cinza'),
    ('Outras despesas',       'circle-ellipsis', 'cinza'),
    ('Salário',               'wallet',          'menta'),
    ('Renda extra',           'briefcase',       'turquesa'),
    ('Benefícios',            'gift',            'amarelo'),
    ('Rendimentos',           'trending-up',     'verde'),
    ('Outras receitas',       'circle-plus',     'cinza')
) AS a (nome, icone, cor)
WHERE c.sistema = TRUE
  AND c.nome = a.nome;
