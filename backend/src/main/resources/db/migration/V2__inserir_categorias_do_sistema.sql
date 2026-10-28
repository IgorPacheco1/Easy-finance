-- =============================================================================
-- V2: categorias do sistema (dados, não schema).
--
-- Lista definida em docs/architecture/domain-model.md (baseada na POF 2017-2018 do IBGE).
-- sistema = true: o usuário não pode editar nem apagar estas categorias.
-- id e criado_em ficam com os valores padrão da tabela (gen_random_uuid() e now()).
--
-- Para mudar esta lista no futuro: crie uma migration nova (V3, V4...), nunca edite esta.
-- =============================================================================

INSERT INTO categoria (nome, tipo, sistema) VALUES
    -- Despesas
    ('Moradia',               'DESPESA', TRUE),
    ('Contas da casa',        'DESPESA', TRUE),
    ('Mercado',               'DESPESA', TRUE),
    ('Alimentação fora',      'DESPESA', TRUE),
    ('Transporte',            'DESPESA', TRUE),
    ('Saúde',                 'DESPESA', TRUE),
    ('Educação',              'DESPESA', TRUE),
    ('Vestuário',             'DESPESA', TRUE),
    ('Cuidados pessoais',     'DESPESA', TRUE),
    ('Lazer',                 'DESPESA', TRUE),
    ('Assinaturas',           'DESPESA', TRUE),
    ('Dívidas e empréstimos', 'DESPESA', TRUE),
    ('Impostos e taxas',      'DESPESA', TRUE),
    ('Outras despesas',       'DESPESA', TRUE),

    -- Receitas
    ('Salário',               'RECEITA', TRUE),
    ('Renda extra',           'RECEITA', TRUE),
    ('Benefícios',            'RECEITA', TRUE),
    ('Rendimentos',           'RECEITA', TRUE),
    ('Outras receitas',       'RECEITA', TRUE);
