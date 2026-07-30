// ============================================================
// FICHA DO REGISTRO — motor compartilhado (Contato e Imóvel)
// Layout "Clássico 70/30": detalhes à esquerda, Atividade à direita.
//
// Como funciona: a página (contato.html / imovel.html) define
// a constante ALVO ('contato' ou 'imovel') ANTES de carregar este
// arquivo. Todo o resto — campos, modal de edição, faixa de
// tarefas — é montado por aqui a partir das definições abaixo.
// ============================================================

const ID = new URLSearchParams(location.search).get('id');

let registro = null;      // o contato ou imóvel aberto
let tarefasFicha = [];    // tarefas vinculadas a ele
let relacionados = [];    // imóveis do contato, ou pessoas do imóvel
let listaContatos = [];   // usada nos campos "Proprietário" / "Inquilino"
let sessaoEmail = '';
let calculados = {};      // (lead/caso) números da visão do painel — nunca digitados
let simulacoes = [];      // (lead) simulações de seguro
let listaImoveis = [];    // (lead/caso) imóveis da carteira
let orcamentos = [];      // (caso) orçamentos dos prestadores
let anexos = [];          // (caso) fotos, autorização, nota fiscal
let sinistrosFicha = [];  // (contrato) sinistros de seguro
let andamentosFicha = {}; // (contrato) andamentos por sinistro
let reajustesFicha = [];  // (contrato) histórico de reajustes
let seguradorasFicha = []; // (contrato) seguradoras cadastradas, para o seletor

// ------------------------------------------------------------
// 1) DEFINIÇÃO DOS CAMPOS — fonte única de verdade.
//    O mesmo array desenha a aba "Detalhes" e o formulário de edição.
//    t = tipo: texto, email, tel, doc (CPF/CNPJ), cep, data, datahora,
//              numero, moeda, select, textarea, ref (pessoa), check
//    alta: true  -> o campo é gravado padronizado (ver CAIXA_ALTA em formatos.js)
//    novo: true  -> coluna criada em 07/2026; só aparece se já existir no banco
// ------------------------------------------------------------
const DEFS = {
  contato: {
    tabela: 'contatos',
    rotulo: 'Contatos',
    lista: 'contatos.html',
    fk: 'contato_id',          // coluna da tabela tarefas que amarra ao registro
    rotuloRel: 'Imóveis',      // título do cartão de registros relacionados
    titulo: r => r.nome || '(sem nome)',
    campos: [
      { c: 'nome', r: 'Nome', t: 'texto', largo: true, obrig: true, alta: true },
      { c: 'tipo_principal', r: 'Tipo principal', t: 'select', obrig: true,
        op: ['Proprietário', 'Inquilino', 'Indicador', 'Prestador Serviço', 'Fornecedor', 'Outro'] },
      { c: 'status', r: 'Status', t: 'select', op: ['Ativo', 'Inativo'] },
      { c: 'outros_tipos', r: 'Outros tipos', t: 'texto' },
      { c: 'telefone', r: 'Telefone', t: 'tel' },
      { c: 'email', r: 'E-mail', t: 'email' },
      { c: 'cpf_cnpj', r: 'CPF / CNPJ', t: 'doc' },
      { c: 'aniversario', r: 'Aniversário', t: 'data' },
      { c: 'banco_pix', r: 'Banco / PIX', t: 'texto' },
      // Vocabulário do ASAAS, não traduzir — ver comentário em campos.js
      // (v1.116). Estas opções em português existiam desde antes da 1.115:
      // qualquer pessoa que escolhesse "Telefone" aqui derrubava o espelho
      // da planilha. EVP = chave aleatória.
      { c: 'tipo_chave_pix', r: 'Tipo da chave PIX (Asaas)', t: 'select',
        op: ['', 'CPF', 'PHONE', 'CNPJ', 'EMAIL', 'EVP'] },
      // --- endereço do contato (colunas novas) ---
      { c: 'cep', r: 'CEP', t: 'cep', novo: true },
      { c: 'logradouro', r: 'Endereço (rua / avenida)', t: 'texto', largo: true, alta: true, novo: true },
      { c: 'numero', r: 'Número', t: 'texto', alta: true, novo: true },
      { c: 'complemento', r: 'Complemento', t: 'texto', alta: true, novo: true },
      { c: 'bairro', r: 'Bairro', t: 'texto', alta: true, novo: true },
      { c: 'cidade', r: 'Cidade', t: 'texto', alta: true, novo: true },
      { c: 'estado', r: 'Estado (UF)', t: 'uf', alta: true, novo: true },
      { c: 'data_cadastro', r: 'Data de cadastro', t: 'data' },
      { c: 'observacoes', r: 'Observações', t: 'textarea', largo: true }
    ]
  },
  imovel: {
    tabela: 'imoveis',
    rotulo: 'Imóveis',
    lista: 'imoveis.html',
    fk: 'imovel_id',
    rotuloRel: 'Pessoas',
    titulo: r => r.endereco || '(sem endereço)',
    campos: [
      { c: 'endereco', r: 'Endereço (nome de exibição)', t: 'texto', largo: true, obrig: true, alta: true },
      { c: 'situacao', r: 'Situação', t: 'select', obrig: true,
        op: ['Disponível', 'Alugada', 'Em reforma', 'Vendida', 'Perdida p/ concorrente', 'Encerrada'] },
      { c: 'bairro', r: 'Bairro', t: 'texto', alta: true },
      { c: 'logradouro', r: 'Rua / Avenida', t: 'texto', alta: true },
      { c: 'numero', r: 'Número', t: 'texto', alta: true },
      { c: 'complemento', r: 'Complemento', t: 'texto', alta: true },
      { c: 'cep', r: 'CEP', t: 'cep' },
      { c: 'cidade', r: 'Cidade', t: 'texto', alta: true },
      { c: 'estado', r: 'Estado (UF)', t: 'uf', alta: true },
      { c: 'ponto_referencia', r: 'Ponto de referência', t: 'textarea', largo: true, alta: true },
      { c: 'categoria', r: 'Categoria', t: 'select', op: ['', 'Residencial', 'Comercial', 'Misto'] },
      // Era texto livre — foi assim que nasceram 'Sala Comercial' e
      // 'Salão Comercial' fora do catálogo. Agora é a MESMA lista do
      // catálogo (v1.115), montada da união do que existe gravado.
      { c: 'tipo', r: 'Tipo', t: 'select',
        op: ['', 'Casa', 'Apartamento', 'Kitnet', 'Sobrado', 'Edícula', 'Sala Comercial',
             'Salão Comercial', 'Barracão', 'Terreno', 'Chácara'] },
      { c: 'num_quartos', r: 'Nº de quartos', t: 'numero' },
      { c: 'proprietario_id', r: 'Proprietário', t: 'ref' },
      { c: 'inquilino_id', r: 'Inquilino atual', t: 'ref' },
      { c: 'valor_aluguel', r: 'Valor do aluguel', t: 'moeda' },
      { c: 'taxa_locacao', r: 'Taxa de contrato (%)', t: 'percentual',
        ajuda: 'Percentual do aluguel que a imobiliária recebe na assinatura do '
             + 'contrato. Digite 100 para um aluguel inteiro, 80 para 80% dele. '
             + 'Num aluguel de R$ 1.000, 80% são R$ 800. Não confunda com a taxa '
             + 'de administração, que é mensal e costuma ficar entre 8% e 12%.' },
      { c: 'taxa_adm_percentual', r: 'Taxa adm. (%)', t: 'percentual',
        ajuda: 'Percentual do aluguel. Digite 10 para 10%. '
             + 'Se houver piso, preencha também o mínimo abaixo — o sistema cobra o MAIOR dos dois.' },
      { c: 'taxa_adm_minimo', r: 'Taxa adm. mínima (R$)', t: 'moeda',
        ajuda: 'Piso da taxa percentual. Exemplo: 10% com mínimo de R$ 100 — '
             + 'aluguel de R$ 800 gera R$ 80, então cobra-se R$ 100; '
             + 'aluguel de R$ 1.200 gera R$ 120, e cobra-se R$ 120. '
             + 'Deixe vazio se não houver piso. Só funciona junto com o percentual.' },
      { c: 'taxa_adm_valor', r: 'Taxa adm. (R$ fixo)', t: 'moeda',
        ajuda: 'Use SÓ quando a negociação é um valor fixo, sem percentual. '
             + 'Não preencha junto com o percentual — o sistema recusa, porque não '
             + 'saberia qual dos dois cobrar.' },
      { c: 'canal_captacao', r: 'Canal de captação', t: 'texto' },
      { c: 'indicado_por', r: 'Indicado por', t: 'texto' },
      { c: 'uc_agua', r: 'UC Água (SAEC)', t: 'texto' },
      { c: 'data_captacao', r: 'Data de captação', t: 'data' },
      { c: 'disponivel_desde', r: 'Disponível desde', t: 'data' },
      { c: 'data_locacao', r: 'Data da locação atual', t: 'data' },
      { c: 'observacoes', r: 'Observações', t: 'textarea', largo: true }
    ]
  },
  // ---- LEAD (M2, 07/2026) ---------------------------------------
  // Campos calculados (temperatura, dias sem contato, último/próximo
  // contato) NÃO aparecem aqui: eles vêm da visão leads_painel e são
  // mostrados nos chips do cabeçalho. Não são digitáveis de propósito.
  lead: {
    tabela: 'leads',
    rotulo: 'Leads',
    lista: 'leads.html',
    fk: 'lead_id',
    rotuloRel: 'Imóveis de interesse',
    titulo: r => r.nome || '(sem nome)',
    campos: [
      { c: 'nome', r: 'Nome', t: 'texto', largo: true, obrig: true, alta: true },
      { c: 'tipo_lead', r: 'Tipo de lead', t: 'select', obrig: true, op: ['Inquilino', 'Proprietário'] },
      // Estas opções são só o ponto de partida: ajustarEtapasDaFicha()
      // (v1.118) as troca pelas etapas do funil DAQUELE tipo de lead antes
      // de a janela abrir — inquilino não vê "Captado", proprietário não vê
      // "Em análise". Fica array (e não função) porque campoHtml faz
      // op.map(): mudar a assinatura quebraria os outros 40 campos.
      { c: 'status', r: 'Etapa do funil', t: 'select', obrig: true,
        op: ['Novo', 'Em atendimento', 'Em análise', 'Visita agendada', 'Proposta', 'Convertido', 'Perdido'] },
      { c: 'motivo_perda', r: 'Motivo da perda', t: 'select',
        op: ['', 'Desistiu', 'Alugou com outro', 'Sem retorno', 'Fora do perfil', 'Duplicado', 'Outro'] },
      { c: 'telefone', r: 'Telefone', t: 'tel' },
      { c: 'telefone_2', r: 'Telefone 2', t: 'tel' },
      { c: 'email', r: 'E-mail', t: 'email' },
      { c: 'cpf_cnpj', r: 'CPF / CNPJ', t: 'doc' },
      { c: 'origem', r: 'Origem', t: 'select',
        op: ['WhatsApp', 'Site', 'Facebook', 'OLX', 'Indicação', 'Corretor', 'EEmovel', 'Placa', 'Telefone', 'Balcão', 'Outro'] },
      { c: 'origem_detalhe', r: 'Detalhe da origem', t: 'texto' },
      { c: 'responsavel_email', r: 'Responsável (e-mail)', t: 'email' },
      { c: 'data_entrada', r: 'Primeiro contato', t: 'datahora' },
      // --- captação (lead Proprietário): o imóvel oferecido (v1.114) ---
      // Veio da planilha "Registro de Abordagens": sem o endereço e o link
      // do anúncio, a abordagem vira um nome solto e ninguém lembra qual
      // imóvel estava em jogo. Para Inquilino os dois ficam vazios e pronto.
      { c: 'imovel_endereco', r: 'Imóvel (endereço)', t: 'texto', largo: true },
      { c: 'link_anuncio', r: 'Link do anúncio', t: 'texto', largo: true },
      // --- o que procura ---
      { c: 'tipo_imovel', r: 'Tipo de imóvel', t: 'select',
        op: ['', 'Casa', 'Apartamento', 'Kitnet', 'Sobrado', 'Chácara', 'Comercial', 'Terreno'] },
      { c: 'aluguel_max', r: 'Aluguel até', t: 'moeda' },
      { c: 'quartos_min', r: 'Quartos (mínimo)', t: 'numero' },
      { c: 'vagas_garagem', r: 'Vagas de garagem', t: 'numero' },
      { c: 'bairros_desejados', r: 'Bairros desejados', t: 'texto', largo: true },
      { c: 'aceita_pet', r: 'Precisa aceitar pet', t: 'check', largo: true },
      { c: 'observacoes', r: 'Observações', t: 'textarea', largo: true },
      // --- o que veio do atendimento automático (só leitura na prática) ---
      { c: 'resumo_agente', r: 'Primeira mensagem do cliente', t: 'textarea', largo: true }
    ]
  },
  // ---- CASO (M6 antecipado, 07/2026) ----------------------------
  // Duas linhas do tempo separadas: status = serviço, status_pagamento
  // = dinheiro. "Pago" NÃO é status do serviço, de propósito.
  // valor_aprovado não está aqui: ele vem do orçamento aprovado, nunca
  // é digitado — senão o rastro da aprovação não vale nada.
  // CONTRATO (v1.107) — a ficha lê da view contratos_painel (traz imóvel,
  // inquilino e os dias que faltam, calculados no banco) e a edição grava
  // na tabela contratos, via `gravarEm`.
  contrato: {
    tabela: 'contratos',
    lerDe: 'contratos_painel',
    rotulo: 'Contratos',
    lista: 'contratos.html',
    fk: 'contrato_id',
    rotuloRel: 'Apólices de seguro',
    titulo: r => (r.imovel_endereco || 'Contrato') + (r.codigo ? ' · ' + r.codigo : ''),
    campos: [
      { c: 'codigo', r: 'Código', t: 'texto' },
      { c: 'status', r: 'Status', t: 'select',
        op: ['Ativo', 'Aviso Prévio', 'Seguro Acionado', 'Encerrado'] },
      { c: 'valor_aluguel', r: 'Aluguel', t: 'moeda', obrig: true },
      { c: 'dia_vencimento', r: 'Dia do vencimento', t: 'numero' },
      { c: 'data_inicio', r: 'Início', t: 'data' },
      { c: 'data_fim_prevista', r: 'Fim previsto', t: 'data' },
      { c: 'data_encerramento', r: 'Encerrado em', t: 'data' },
      { c: 'prazo_meses', r: 'Prazo (meses)', t: 'numero' },
      { c: 'carencia_meses', r: 'Carência (meses)', t: 'numero' },
      { c: 'indice_reajuste', r: 'Índice de reajuste', t: 'select',
        op: ['', 'IGPM', 'IPCA', 'INCC', 'IGP-DI', 'INPC', 'Sem reajuste'] },
      { c: 'periodicidade_reajuste_meses', r: 'Reajusta a cada (meses)', t: 'numero' },
      { c: 'proximo_reajuste', r: 'Próximo reajuste', t: 'data' },
      { c: 'ultimo_reajuste', r: 'Último reajuste', t: 'data', somenteLeitura: true },
      { c: 'garantia_tipo', r: 'Garantia', t: 'select',
        op: ['', 'Seguro fiança', 'Fiador', 'Caução', 'Título de capitalização', 'Sem garantia'] },
      { c: 'aviso_previo_em', r: 'Aviso prévio em', t: 'data' },
      { c: 'taxa_contrato_percentual', r: 'Taxa de contrato (%)', t: 'percentual' },
      { c: 'taxa_contrato_valor', r: 'Taxa de contrato (R$)', t: 'moeda' },
      { c: 'observacoes', r: 'Observações', t: 'textarea', largo: true }
    ]
  },

  // SINISTRO (v1.109) — objeto próprio. A ficha lê da view (contrato,
  // imóvel, apólice e os dias de cada prazo já calculados) e grava na
  // tabela. O "relacionado" principal é a linha do tempo.
  sinistro: {
    tabela: 'contrato_sinistros',
    lerDe: 'sinistros_painel',
    rotulo: 'Sinistros',
    lista: 'sinistros.html',
    fk: 'sinistro_id',
    rotuloRel: 'Linha do tempo',
    titulo: r => (r.codigo || 'Sinistro') + ' · ' + (r.tipo || ''),
    campos: [
      { c: 'codigo', r: 'Código', t: 'texto' },
      { c: 'tipo', r: 'Tipo de sinistro', t: 'select', obrig: true,
        op: (typeof TIPOS_SINISTRO !== 'undefined' ? TIPOS_SINISTRO.slice() : ['Outro']) },
      { c: 'status', r: 'Etapa', t: 'select',
        op: ['Aberto', 'Em análise', 'Exigência', 'Deferido', 'Pago', 'Indeferido', 'Cancelado'] },
      { c: 'protocolo', r: 'Protocolo na seguradora', t: 'texto' },
      { c: 'data_fato', r: 'Data do fato', t: 'data' },
      { c: 'prazo_para_abrir', r: 'Prazo para comunicar', t: 'data' },
      { c: 'data_abertura', r: 'Comunicado em', t: 'data' },
      { c: 'prazo_retorno', r: 'Retorno prometido até', t: 'data' },
      { c: 'previsao_pagamento', r: 'Pagamento previsto', t: 'data' },
      { c: 'data_recebimento', r: 'Recebido em', t: 'data' },
      { c: 'valor_pleiteado', r: 'Valor pleiteado', t: 'moeda' },
      { c: 'valor_deferido', r: 'Valor deferido', t: 'moeda' },
      { c: 'valor_recebido', r: 'Valor recebido', t: 'moeda' },
      { c: 'meses_cobertos', r: 'Meses de aluguel cobertos', t: 'numero' },
      { c: 'motivo_indeferimento', r: 'Motivo do indeferimento', t: 'textarea', largo: true },
      { c: 'responsavel_email', r: 'Responsável', t: 'texto' },
      { c: 'observacoes', r: 'Observações', t: 'textarea', largo: true }
    ]
  },

  caso: {
    tabela: 'casos',
    rotulo: 'Casos',
    lista: 'casos.html',
    fk: 'caso_id',
    rotuloRel: 'Orçamentos',
    titulo: r => r.titulo || '(sem título)',
    campos: [
      { c: 'titulo', r: 'Título do chamado', t: 'texto', largo: true, obrig: true },
      { c: 'tipo', r: 'Tipo', t: 'select', obrig: true,
        op: ['Manutenção', 'Financeiro', 'Reclamação', 'Documentação', 'Sinistro', 'Rescisão'] },
      { c: 'subtipo', r: 'Subtipo', t: 'select',
        op: ['', 'Hidráulico', 'Elétrico', 'Estrutural', 'Pintura', 'Marcenaria',
             'Limpeza', 'Jardinagem', 'Chaveiro', 'Outro'] },
      { c: 'descricao', r: 'Descrição', t: 'textarea', largo: true },
      { c: 'imovel_id', r: 'Imóvel', t: 'refimovel' },
      { c: 'solicitante_id', r: 'Quem abriu o chamado', t: 'ref' },
      { c: 'solicitante_papel', r: 'Papel de quem abriu', t: 'select',
        op: ['', 'Proprietário', 'Inquilino', 'Imobiliária', 'Vizinho', 'Outro'] },
      { c: 'prestador_id', r: 'Prestador', t: 'ref' },
      { c: 'responsavel_email', r: 'Responsável interno', t: 'email' },
      { c: 'quem_paga', r: 'Quem paga', t: 'select',
        op: ['Proprietário', 'Inquilino', 'Imobiliária', 'Dividido'] },
      { c: 'prioridade', r: 'Prioridade', t: 'select', op: ['Alta', 'Normal', 'Baixa'] },
      { c: 'origem_chamado', r: 'Origem do chamado', t: 'texto' },
      // --- andamento do serviço ---
      { c: 'status', r: 'Etapa do serviço', t: 'select', obrig: true,
        op: ['Aberto', 'Orçamento', 'Aprovado', 'Em execução', 'Concluído', 'Cancelado'] },
      { c: 'motivo_cancelamento', r: 'Motivo do cancelamento', t: 'texto' },
      { c: 'iniciado_em', r: 'Início', t: 'data' },
      { c: 'prazo_conclusao', r: 'Prazo de conclusão', t: 'data' },
      { c: 'concluido_em', r: 'Concluído em', t: 'data' },
      { c: 'avaliacao', r: 'Avaliação do serviço (1 a 5)', t: 'numero' },
      // --- andamento do dinheiro ---
      { c: 'status_pagamento', r: 'Situação do pagamento', t: 'select',
        op: ['A pagar', 'Pago', 'Cancelado'] },
      { c: 'forma_pagamento', r: 'Forma de pagamento', t: 'select',
        op: ['', 'PIX', 'Dinheiro', 'Transferência', 'Boleto', 'Descontar do repasse'] },
      { c: 'pagamento_previsto_em', r: 'Pagamento previsto para', t: 'data' },
      { c: 'pago_em', r: 'Pago em', t: 'data' },
      { c: 'descontado_repasse_em', r: 'Descontado do repasse em', t: 'data' },
      { c: 'repasse_referencia', r: 'Repasse de referência', t: 'texto' },
      { c: 'observacao_financeira', r: 'Observação financeira', t: 'textarea', largo: true }
    ]
  },
  tarefa: {
    tabela: 'tarefas',
    campos: [
      { c: 'tipo', r: 'Tipo', t: 'select', op: ['Tarefa', 'Ligação', 'Visita', 'Observação'], obrig: true },
      { c: 'prioridade', r: 'Prioridade', t: 'select', op: ['Alta', 'Normal', 'Baixa'] },
      { c: 'assunto', r: 'Assunto', t: 'texto', largo: true, obrig: true },
      { c: 'responsavel_email', r: 'Responsável (e-mail)', t: 'email' },
      { c: 'vencimento', r: 'Data de vencimento', t: 'data' },
      { c: 'lembrete_em', r: 'Lembrete (data e hora)', t: 'datahora' },
      { c: 'descricao', r: 'Comentário', t: 'textarea', largo: true },
      { c: '_feita', r: 'Já concluída (ex.: ligação que acabou de acontecer)', t: 'check', largo: true }
    ]
  },
  // (Lead) SIMULAÇÃO DE SEGURO FIANÇA (v1.117) — substitui a linha da
  // aba Lead da planilha. Cada TENTATIVA é uma simulação: reprovou,
  // manda outro CPF (cônjuge, parente) numa simulação nova — por isso
  // o CPF mora aqui, não no lead: com três tentativas, é este campo
  // que diz QUEM foi aprovado.
  simulacao: {
    tabela: 'simulacoes',
    campos: [
      { c: 'cpf_analisado', r: 'CPF analisado (desta tentativa)', t: 'doc' },
      { c: 'status_fianca', r: 'Resultado da fiança', t: 'select', obrig: true,
        op: ['Pendente', 'Aprovado', 'Reprovado'] },
      { c: 'seguradora', r: 'Seguradora', t: 'texto' },
      { c: 'modalidade', r: 'Modalidade / plano', t: 'texto' },
      { c: 'valor_aluguel', r: 'Vr. aluguel', t: 'moeda' },
      { c: 'vr_fianca', r: 'Vr. seguro fiança (mensal)', t: 'moeda' },
      // o incêndio entra pelo valor CHEIO; a mensagem do WhatsApp
      // divide por 6, igual à planilha (parcela_incendio)
      { c: 'vr_incendio', r: 'Vr. seguro incêndio (cheio — vai em 6x)', t: 'moeda' },
      { c: 'vr_setup', r: 'Vr. setup (taxa de ativação)', t: 'moeda' },
      { c: 'plano_valor_imovel', r: 'Valor do imóvel no plano', t: 'moeda' },
      { c: 'observacao', r: 'Observação', t: 'textarea', largo: true }
    ]
  },
  // lançar orçamento pela equipe (enquanto o portal do prestador não existe,
  // é assim que entra o que o prestador manda por WhatsApp)
  orcamento: {
    tabela: 'caso_orcamentos',
    campos: [
      { c: 'prestador_id', r: 'Prestador', t: 'ref', largo: true },
      { c: 'valor', r: 'Valor', t: 'moeda', obrig: true },
      { c: 'o_que_inclui', r: 'O valor inclui', t: 'select',
        op: ['', 'Somente mão de obra', 'Mão de obra + material', 'Somente material'] },
      { c: 'prazo_inicio', r: 'Início previsto', t: 'data' },
      { c: 'prazo_fim', r: 'Conclusão prevista', t: 'data' },
      { c: 'proposta', r: 'O que será feito', t: 'textarea', largo: true }
    ]
  },
  // usado só pela janela de aprovação de orçamento (não grava direto numa tabela)
  aprovacao: {
    tabela: 'caso_orcamentos',
    campos: [
      { c: 'autorizacao_canal', r: 'Como o proprietário autorizou', t: 'select', largo: true,
        op: ['WhatsApp do proprietário', 'E-mail', 'Telefone', 'Presencial',
             'Previsto em contrato', 'Outro'] },
      { c: 'autorizacao_observacao', r: 'Observação (fica registrada para sempre)',
        t: 'textarea', largo: true }
    ]
  }
};

const DEF = DEFS[ALVO];
const ICONE = { 'Tarefa': '📋', 'Ligação': '📞', 'Visita': '📅', 'Observação': '📝' };

function hojeISO() {
  const d = new Date(); const p = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
// iniciais() morava aqui. Foi para js/avatar.js, que é carregado antes
// desta tela e tem a versão que ignora "de/da/dos" ("Ana da Silva" → AS,
// não AD). Duas declarações do mesmo nome no mesmo escopo não dão erro:
// a última cala a primeira em silêncio — que é o pior tipo de conflito.
function nomePessoa(id) { const c = listaContatos.find(x => x.id === id); return c ? c.nome : null; }

// ------------------------------------------------------------
// 2) CARREGAR TUDO DO BANCO
// ------------------------------------------------------------
async function carregarFicha() {
  // o layout e os campos personalizados entram ANTES de desenhar
  if (typeof carregarLayoutFicha === 'function') await carregarLayoutFicha(ALVO);

  if (!ID) { document.getElementById('conteudo').innerHTML =
    '<div class="cartao"><div class="corpo">Registro não informado.</div></div>'; return; }

  const filtro = DEF.fk;
  const [reg, tar, pes] = await Promise.all([
    // `lerDe` permite a ficha ler de uma VIEW (que traz campos
    // calculados) e continuar gravando na tabela — é o caso do contrato,
    // cujos "dias que faltam" são contados pelo banco. Sem lerDe, lê da
    // própria tabela, como sempre.
    sb.from(DEF.lerDe || DEF.tabela).select('*').eq('id', ID).single(),
    sb.from('tarefas').select('*').eq(filtro, ID).order('vencimento', { ascending: true, nullsFirst: false }),
    sb.from('contatos').select('id,codigo,nome').order('nome')
  ]);

  if (reg.error || !reg.data) {
    document.getElementById('conteudo').innerHTML =
      `<div class="cartao"><div class="corpo">Não foi possível abrir este registro.<br>
       <small>${htm(reg.error ? reg.error.message : 'não encontrado')}</small></div></div>`;
    return;
  }
  registro = reg.data;
  tarefasFicha = tar.data || [];
  listaContatos = pes.data || [];

  // Os campos de endereço do contato só aparecem se as colunas já existirem
  // no banco (script sql/endereco-contato.sql). Assim o painel continua
  // funcionando mesmo se o SQL ainda não tiver sido rodado.
  if (DEF.campos.some(c => c.novo) && !('logradouro' in registro)) {
    DEF.campos = DEF.campos.filter(c => !c.novo);
  }

  if (ALVO === 'caso') {
    const [calc, orc, anx, im] = await Promise.all([
      sb.from('casos_painel').select('*').eq('id', ID).single(),
      sb.from('caso_orcamentos').select('*').eq('caso_id', ID).order('enviado_em', { ascending: false }),
      sb.from('anexos').select('*').eq('objeto', OBJETO_DO_ALVO())
        .eq('registro_id', ID).order('enviado_em'),
      sb.from('imoveis').select('id,codigo,endereco,bairro,situacao').order('endereco')
    ]);
    calculados = calc.data || {};
    orcamentos = orc.data || [];
    anexos = anx.data || [];
    listaImoveis = im.data || [];
    relacionados = orcamentos;
    await assinarAnexos();   // v1.105: link temporário para anexos de arquivo
  } else if (ALVO === 'lead') {
    // a ficha do lead traz 3 coisas próprias: os números calculados
    // (visão leads_painel), os imóveis de interesse e as simulações
    const [calc, li, sim] = await Promise.all([
      sb.from('leads_painel').select('*').eq('id', ID).single(),
      sb.from('lead_imoveis').select('*').eq('lead_id', ID).order('criado_em'),
      sb.from('simulacoes').select('*').eq('lead_id', ID).order('criado_em', { ascending: false })
    ]);
    calculados = calc.data || {};
    relacionados = li.data || [];
    simulacoes = sim.data || [];
    const im = await sb.from('imoveis').select('id,codigo,endereco,bairro,situacao');
    listaImoveis = im.data || [];
  } else if (ALVO === 'contrato') {
    // apólices (relacionado principal) + sinistros + histórico de reajustes
    const [ap, si, rj] = await Promise.all([
      sb.from('contrato_seguros').select('*').eq('contrato_id', ID)
        .order('status').order('fim_vigencia', { ascending: false }),
      sb.from('sinistros_painel').select('*').eq('contrato_id', ID)
        .order('criado_em', { ascending: false }),
      sb.from('contrato_reajustes').select('*').eq('contrato_id', ID)
        .order('aplicado_em', { ascending: false })
    ]);
    relacionados = ap.data || [];
    sinistrosFicha = si.data || [];
    reajustesFicha = rj.data || [];
    const sg = await sb.from('seguradoras').select('id,nome').eq('ativa', true).order('nome');
    seguradorasFicha = sg.data || [];
    await carregarAndamentos();
    await carregarAnexosDoRegistro();   // M33
  } else if (ALVO === 'sinistro') {
    const an = await sb.from('sinistro_andamentos').select('*')
      .eq('sinistro_id', ID).order('criado_em', { ascending: false });
    relacionados = an.data || [];
    andamentosFicha = { [ID]: relacionados };
    sinistrosFicha = [registro];      // as ações reaproveitam esta lista
    await carregarAnexosDoRegistro();   // M33
  } else if (ALVO === 'contato') {
    const im = await sb.from('imoveis').select('id,codigo,endereco,bairro,situacao,proprietario_id,inquilino_id')
      .or(`proprietario_id.eq.${ID},inquilino_id.eq.${ID}`).order('endereco');
    relacionados = im.data || [];
  } else {
    // ALVO 'imovel' segue no bloco abaixo; os casos relacionados dos dois
    // (contato e imóvel) são carregados depois, em carregarCasosFicha().
    relacionados = [registro.proprietario_id, registro.inquilino_id]
      .map((pid, k) => {
        const c = listaContatos.find(x => x.id === pid);
        return c ? { papel: k === 0 ? 'Proprietário' : 'Inquilino', ...c } : null;
      }).filter(Boolean);
  }
  await carregarCasosFicha();
  desenharFicha();
}

// ------------------------------------------------------------
// CASOS RELACIONADOS (v1.101) — a ficha do imóvel lista os casos do
// imóvel; a do contato, os casos em que a pessoa é prestador ou
// solicitante. Quem não pode ver Casos não vê o cartão (data-obj).
// ------------------------------------------------------------
let casosFicha = [];

async function carregarCasosFicha() {
  if (ALVO !== 'contato' && ALVO !== 'imovel' && ALVO !== 'contrato') return;
  const cols = 'id,codigo,tipo,titulo,status,status_pagamento,valor_aprovado,aberto_em';
  const q = sb.from('casos').select(cols).order('aberto_em', { ascending: false }).limit(50);
  const { data } = (ALVO === 'imovel') ? await q.eq('imovel_id', ID)
    : (ALVO === 'contrato') ? await q.eq('contrato_id', ID)
    : await q.or(`prestador_id.eq.${ID},solicitante_id.eq.${ID}`);
  casosFicha = data || [];
}

function blocoCasosFicha() {
  if (ALVO !== 'contato' && ALVO !== 'imovel' && ALVO !== 'contrato') return '';
  const cores = { 'Aberto': 'tag-azul', 'Orçamento': 'tag-amarela', 'Aprovado': 'tag-azul',
    'Em execução': 'tag-amarela', 'Concluído': 'tag-verde', 'Cancelado': 'tag-cinza' };
  const corpo = !casosFicha.length
    ? '<div class="corpo" style="color:#8a94a1">Nenhum caso ligado a este registro.</div>'
    : `<table class="mini">${casosFicha.map(c => `
      <tr>
        <td style="width:1%;white-space:nowrap;color:var(--texto-suave)">
          <a href="caso.html?id=${c.id}">${htm(c.codigo || '')}</a></td>
        <td>${htm(c.tipo || '')}${c.titulo ? ' · ' + htm(c.titulo) : ''}
          <div style="color:var(--texto-suave);font-size:12px">aberto em ${dataBr(String(c.aberto_em || '').slice(0, 10))}${
            c.valor_aprovado ? ' · ' + moeda(c.valor_aprovado) : ''}</div></td>
        <td style="width:1%;white-space:nowrap">
          <span class="tag ${cores[c.status] || 'tag-cinza'}">${htm(c.status || '')}</span>${
          c.status_pagamento === 'A pagar' ? ' <span class="tag tag-vermelha">A pagar</span>' : ''}</td>
      </tr>`).join('')}</table>`;
  return `<div class="cartao" data-obj="casos">
    <h2>Casos <span class="cnt">(${casosFicha.length})</span>
      <span class="dir"><a class="btn btn-claro" style="padding:5px 12px;font-size:12px"
        href="casos.html">Ver em Casos</a></span></h2>
    ${corpo}</div>`;
}

// ------------------------------------------------------------
// 3) DESENHAR — cabeçalho, chips, abas e faixa de Atividade
// ------------------------------------------------------------
function valorFormatado(campo) {
  const v = (typeof valorDoRegistro === 'function')
    ? valorDoRegistro(registro, campo) : registro[campo.c];
  if (Array.isArray(v)) return v.length ? htm(v.join(', ')) : '—';
  if (campo.t === 'check' && (v === null || v === undefined)) return '—';
  if (v === null || v === undefined || v === '') return '—';
  switch (campo.t) {
    case 'moeda': return moeda(v);
    // O terceiro lugar que precisava saber disso. A janela de edição e a
    // lista já convertiam; a ficha em modo LEITURA caía no padrão e
    // mostrava "0.1" — sem risco de gravar errado, mas errado na tela.
    case 'percentual':
      return htm((Number(v) * 100).toLocaleString('pt-BR',
        { maximumFractionDigits: 2 }) + '%');
    case 'data': return dataBr(v);
    case 'datahora': {
      // no banco fica 2026-07-20T15:00:00+00:00; na tela, 20/07/2026 12:00
      const d = new Date(v);
      return isNaN(d) ? htm(String(v)) : htm(d.toLocaleString('pt-BR',
        { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }));
    }
    case 'check': return v ? 'Sim' : 'Não';
    case 'tel': return `<a href="tel:${htm(soDigitos(v))}">${htm(mascaraTelefone(v))}</a>`;
    case 'doc': return htm(mascaraDoc(v));
    case 'cep': return htm(mascaraCep(v));
    case 'uf': return htm(String(v).toUpperCase());
    case 'email': return `<a href="mailto:${htm(v)}">${htm(v)}</a>`;
    case 'ref': {
      const n = nomePessoa(v);
      return n ? `<a href="contato.html?id=${v}">${htm(n)}</a>` : '—';
    }
    case 'refimovel': {
      const i = listaImoveis.find(x => x.id === v);
      return i ? `<a href="imovel.html?id=${v}">${htm(i.endereco)}</a>` : '—';
    }
    default: return htm(String(v)).replace(/\n/g, '<br>');
  }
}

function chipsDoRegistro() {
  const abertas = tarefasFicha.filter(t => t.status === 'Aberta').length;
  const ligacoes = tarefasFicha.filter(t => t.tipo === 'Ligação' && t.concluida_em)
    .map(t => t.concluida_em).sort();
  const ultima = ligacoes.length ? dataBr(ligacoes[ligacoes.length - 1].slice(0, 10)) : '—';
  if (ALVO === 'caso') return [
    ['Imóvel', calculados.imovel_endereco || registro.imovel_texto || '—'],
    ['Prestador', calculados.prestador_nome || registro.prestador_texto || '—'],
    ['Valor aprovado', registro.valor_aprovado ? moeda(registro.valor_aprovado) : '—'],
    ['Pagamento', registro.status_pagamento || '—'],
    ['Aberto há', (calculados.dias_aberto === null || calculados.dias_aberto === undefined)
      ? '—' : calculados.dias_aberto + ' dias'],
    ['Atraso', calculados.dias_atraso ? calculados.dias_atraso + ' dias' : '—'],
    ['Tarefas abertas', String(abertas)]
  ];
  if (ALVO === 'lead') return [
    ['Telefone', mascaraTelefone(registro.telefone) || '—'],
    ['Procura até', registro.aluguel_max ? moeda(registro.aluguel_max) : '—'],
    ['Temperatura', calculados.temperatura || '—'],
    ['Sem contato há',
      (calculados.dias_sem_contato === null || calculados.dias_sem_contato === undefined)
        ? '—' : calculados.dias_sem_contato + ' dias'],
    ['Último contato', calculados.ultimo_contato ? dataBr(String(calculados.ultimo_contato).slice(0, 10)) : ultima],
    ['Tarefas abertas', String(abertas)]
  ];
  if (ALVO === 'sinistro') return [
    ['Contrato', registro.contrato_codigo || '—'],
    ['Imóvel', registro.imovel_endereco || '—'],
    ['Apólice', (registro.apolice_tipo || '—') +
      (registro.apolice_numero ? ' · ' + registro.apolice_numero : '')],
    ['Próximo prazo', registro.proximo_prazo
      ? dataBr(registro.proximo_prazo) + (registro.dias_para_o_proximo_prazo != null
          ? ' (' + registro.dias_para_o_proximo_prazo + 'd)' : '') : '—'],
    ['Bola com', registro.aguardando || '—'],
    ['A receber', registro.saldo_a_receber ? moeda(registro.saldo_a_receber) : '—'],
    ['Tarefas abertas', String(abertas)]
  ];
  if (ALVO === 'contrato') return [
    ['Inquilino', registro.inquilino_nome || '—'],
    ['Aluguel', moeda(registro.valor_aluguel)],
    ['Vence dia', registro.dia_vencimento ? String(registro.dia_vencimento) : '—'],
    ['Próximo reajuste', registro.proximo_reajuste
      ? dataBr(registro.proximo_reajuste) + (registro.dias_para_reajuste != null
          ? ' (' + registro.dias_para_reajuste + 'd)' : '') : '—'],
    ['Renovar seguro', registro.proxima_renovacao
      ? dataBr(registro.proxima_renovacao) + (registro.dias_para_renovar_seguro != null
          ? ' (' + registro.dias_para_renovar_seguro + 'd)' : '') : '—'],
    ['Seguro/mês', registro.seguro_mensal ? moeda(registro.seguro_mensal) : '—'],
    ['Tarefas abertas', String(abertas)]
  ];
  if (ALVO === 'contato') return [
    ['Telefone', mascaraTelefone(registro.telefone) || '—'],
    ['E-mail', registro.email || '—'],
    ['Imóveis', String(relacionados.length)],
    ['Último contato', ultima],
    ['Tarefas abertas', String(abertas)]
  ];
  return [
    ['Situação', registro.situacao || '—'],
    ['Aluguel', moeda(registro.valor_aluguel)],
    ['Proprietário', nomePessoa(registro.proprietario_id) || '—'],
    ['Inquilino', nomePessoa(registro.inquilino_id) || '—'],
    ['Tarefas abertas', String(abertas)]
  ];
}

const ETAPAS_CASO = ['Aberto', 'Orçamento', 'Aprovado', 'Em execução', 'Concluído'];

// M20 — A VISTORIA NÃO PASSA POR ORÇAMENTO.
// O preço é negociado antes, direto com o vistoriador. Deixar as etapas
// 'Orçamento' e 'Aprovado' no caminho faria toda vistoria ficar parada
// pedindo aprovação de um valor que já estava fechado — e o botão verde
// diria "marcar como orçamento" numa coisa que já foi feita.
const ETAPAS_VISTORIA = ['Aberto', 'Em execução', 'Concluído'];
function etapasDoCaso() {
  return (registro && registro.tipo === 'Vistoria') ? ETAPAS_VISTORIA : ETAPAS_CASO;
}

function subtituloDoRegistro() {
  if (ALVO === 'caso') {
    const cores = { 'Aberto': 'tag-azul', 'Orçamento': 'tag-amarela', 'Aprovado': 'tag-azul',
      'Em execução': 'tag-amarela', 'Concluído': 'tag-verde', 'Cancelado': 'tag-cinza' };
    const cp = { 'A pagar': 'tag-vermelha', 'Pago': 'tag-verde', 'Cancelado': 'tag-cinza' };
    return `${htm(registro.tipo)}${registro.subtipo ? ' · ' + htm(registro.subtipo) : ''} ·
      ${htm(registro.codigo || '')} · aberto em ${dataBr(String(registro.aberto_em || '').slice(0, 10))}
      <span class="tag ${cores[registro.status] || 'tag-cinza'}">${htm(registro.status)}</span>
      <span class="tag ${cp[registro.status_pagamento] || 'tag-cinza'}">${htm(registro.status_pagamento)}</span>`;
  }
  if (ALVO === 'lead') {
    const cores = { 'Novo': 'tag-azul', 'Em atendimento': 'tag-azul', 'Visita agendada': 'tag-amarela',
      'Proposta': 'tag-amarela', 'Convertido': 'tag-verde', 'Perdido': 'tag-cinza' };
    return `${htm(registro.tipo_lead || 'Lead')} · ${htm(registro.codigo || '')} ·
      ${htm(registro.origem || '')}
      <span class="tag ${cores[registro.status] || 'tag-cinza'}">${htm(registro.status || '—')}</span>
      ${registro.motivo_perda ? `<span class="tag tag-cinza">${htm(registro.motivo_perda)}</span>` : ''}
      ${registro.contato_id
        ? `<a href="contato.html?id=${registro.contato_id}">ver contato</a>` : ''}`;
  }
  if (ALVO === 'sinistro') {
    const cores = { 'Aberto': 'tag-azul', 'Em análise': 'tag-azul', 'Exigência': 'tag-amarela',
      'Deferido': 'tag-verde', 'Pago': 'tag-verde', 'Indeferido': 'tag-vermelha',
      'Cancelado': 'tag-cinza' };
    return `${htm(registro.seguradora || 'seguradora não informada')}
      ${registro.protocolo ? ' · protocolo ' + htm(registro.protocolo) : ''}
      ${registro.data_fato ? ' · fato em ' + dataBr(registro.data_fato) : ''}
      <span class="tag ${cores[registro.status] || 'tag-cinza'}">${htm(registro.status)}</span>
      ${registro.alerta ? `<span class="tag tag-vermelha">${htm(registro.alerta)}</span>` : ''}
      ${registro.contrato_id ? `<a href="contrato.html?id=${registro.contrato_id}">ver contrato</a>` : ''}`;
  }
  if (ALVO === 'contrato') {
    const cores = { 'Ativo': 'tag-verde', 'Aviso Prévio': 'tag-amarela',
      'Seguro Acionado': 'tag-vermelha', 'Encerrado': 'tag-cinza' };
    return `${htm(registro.codigo || '')} · ${htm(registro.inquilino_nome || 'sem inquilino')}
      ${registro.data_inicio ? ' · desde ' + dataBr(registro.data_inicio) : ''}
      <span class="tag ${cores[registro.status] || 'tag-cinza'}">${htm(registro.status || '—')}</span>
      ${registro.alerta ? `<span class="tag tag-vermelha">${htm(registro.alerta)}</span>` : ''}
      ${registro.imovel_id ? `<a href="imovel.html?id=${registro.imovel_id}">ver imóvel</a>` : ''}`;
  }
  if (ALVO === 'contato') {
    const tagCor = registro.status === 'Ativo' ? 'tag-verde' : 'tag-cinza';
    return `${htm(registro.tipo_principal || 'Contato')} · ${htm(registro.codigo || '')}
      <span class="tag ${tagCor}">${htm(registro.status || '—')}</span>`;
  }
  const cores = { 'Disponível': 'tag-azul', 'Alugada': 'tag-verde', 'Em reforma': 'tag-amarela',
    'Vendida': 'tag-cinza', 'Perdida p/ concorrente': 'tag-vermelha', 'Encerrada': 'tag-cinza' };
  return `${htm(registro.bairro || 'Imóvel')} · ${htm(registro.codigo || '')}
    <span class="tag ${cores[registro.situacao] || 'tag-cinza'}">${htm(registro.situacao || '—')}</span>`;
}

// ============================================================
// FICHA DO CONTRATO (v1.107) — apólices, sinistros e reajustes
// ============================================================

async function carregarAndamentos() {
  andamentosFicha = {};
  if (!sinistrosFicha.length) return;
  const { data } = await sb.from('sinistro_andamentos').select('*')
    .in('sinistro_id', sinistrosFicha.map(s => s.id))
    .order('criado_em', { ascending: false });
  (data || []).forEach(a => {
    (andamentosFicha[a.sinistro_id] = andamentosFicha[a.sinistro_id] || []).push(a);
  });
}

const COR_APOLICE = { 'Vigente': 'tag-verde', 'A renovar': 'tag-amarela',
  'Renovada': 'tag-cinza', 'Cancelada': 'tag-cinza', 'Encerrada': 'tag-cinza' };
const COR_SINISTRO = { 'Aberto': 'tag-azul', 'Em análise': 'tag-azul',
  'Exigência': 'tag-amarela', 'Deferido': 'tag-verde', 'Pago': 'tag-verde',
  'Indeferido': 'tag-vermelha', 'Cancelado': 'tag-cinza' };

/** As apólices do contrato — o cartão "relacionados" da ficha. */
function blocoApolices() {
  if (!relacionados.length)
    return `<div class="corpo" style="color:#8a94a1">Nenhuma apólice registrada.
      ${registro.garantia_tipo === 'Seguro fiança'
        ? '<br><b>Atenção:</b> a garantia deste contrato é seguro fiança e não há apólice cadastrada.' : ''}</div>`;
  return relacionados.map(a => {
    const vigente = a.status === 'Vigente';
    const dias = a.fim_vigencia
      ? Math.round((new Date(a.fim_vigencia + 'T12:00:00') - new Date()) / 86400000) : null;
    const prazo = dias === null ? ''
      : (dias < 0 ? `<b style="color:var(--erro)">venceu há ${-dias} dias</b>`
                  : (dias <= 30 ? `<b style="color:var(--alerta)">vence em ${dias} dias</b>`
                                : `vence em ${dias} dias`));
    return `
    <div class="orc ${vigente ? 'aprovado' : 'fora'}">
      <div class="orc-val">${a.valor_mensal != null ? moeda(a.valor_mensal) : moeda(a.valor_parcela)}
        <small>${a.valor_mensal != null ? 'por mês' : (a.parcelas ? a.parcelas + 'x' : 'parcela')}</small></div>
      <div class="orc-txt">
        <b>${htm(a.tipo)}</b>${a.seguradora ? ' · ' + htm(a.seguradora) : ''}${a.plano ? ' · ' + htm(a.plano) : ''}
        <div class="orc-p">${a.apolice ? 'Apólice ' + htm(a.apolice) + ' · ' : ''}
          ${a.inicio_vigencia ? dataBr(a.inicio_vigencia) : '—'} a ${a.fim_vigencia ? dataBr(a.fim_vigencia) : '—'}
          ${vigente && prazo ? ' · ' + prazo : ''}</div>
        ${/Importado da planilha/i.test(a.observacoes || '')
          ? `<div class="orc-p" style="font-size:12px;color:var(--alerta);font-weight:600">
               ⚠ Vigência ESTIMADA pelo aniversário do contrato, não lida da apólice.
               Confira com a seguradora e clique em Corrigir.</div>`
          : (a.observacoes ? `<div class="orc-p" style="font-size:12px">${htm(a.observacoes)}</div>` : '')}
      </div>
      <div class="orc-lado">
        <span class="tag ${COR_APOLICE[a.status] || 'tag-cinza'}">${htm(a.status)}</span>
        <button class="btn btn-claro" data-perm="contratos:editar"
          style="padding:5px 12px;font-size:12px" onclick="abrirEditarApolice('${a.id}')">✎ Corrigir</button>
        ${vigente ? `<button class="btn btn-claro" data-perm="contratos:editar"
          style="padding:5px 12px;font-size:12px" onclick="abrirRenovarApolice('${a.id}')">↻ Renovar</button>
          <button class="btn btn-claro" data-perm="contratos:editar"
          style="padding:5px 12px;font-size:12px" onclick="abrirNovoSinistro('${a.id}')">⚠ Acionar</button>` : ''}
      </div>
    </div>`;
  }).join('');
}

/** Sinistros, com a linha do tempo de cada um. */
function blocoSinistros() {
  const corpo = !sinistrosFicha.length
    ? '<div class="corpo" style="color:#8a94a1">Nenhum sinistro registrado neste contrato.</div>'
    : sinistrosFicha.map(s => {
      const andam = andamentosFicha[s.id] || [];
      const abertas = andam.filter(a => a.tipo === 'Exigência' && !a.cumprido_em);
      const linha = andam.slice(0, 6).map(a => `
        <div class="and ${a.cumprido_em ? 'ok' : (a.prazo && a.prazo < hojeISO() ? 'atrasado' : '')}">
          <span class="and-tipo">${htm(a.tipo)}</span>
          <span class="and-txt">${htm(a.descricao)}</span>
          <span class="and-meta">${a.de_quem === 'Nós' ? '🧑‍💼 nós' : '🏢 seguradora'}${
            a.prazo ? ' · prazo ' + dataBr(a.prazo) : ''}${
            a.cumprido_em ? ' · ✓ ' + dataBr(a.cumprido_em) : ''}</span>
          ${(!a.cumprido_em && a.tipo === 'Exigência')
            ? `<button class="btn btn-claro" data-perm="contratos:editar"
                 style="padding:3px 9px;font-size:11px"
                 onclick="cumprirExigencia('${a.id}')">✓ Cumpri</button>` : ''}
        </div>`).join('');
      return `
      <div class="sinistro ${s.alerta ? 'com-alerta' : ''}">
        <div class="sin-topo">
          <b>${htm(s.codigo || '')} · ${htm(s.tipo)}</b>
          <span class="tag ${COR_SINISTRO[s.status] || 'tag-cinza'}">${htm(s.status)}</span>
          ${s.alerta ? `<span class="tag tag-vermelha">${htm(s.alerta)}</span>` : ''}
          ${s.protocolo ? `<span class="sin-prot">protocolo ${htm(s.protocolo)}</span>` : ''}
          <span class="dir">
            ${s.em_andamento ? `
              <button class="btn btn-claro" data-perm="contratos:editar"
                style="padding:4px 10px;font-size:12px" onclick="abrirExigencia('${s.id}')">+ Exigência</button>
              ${s.status !== 'Deferido' ? `<button class="btn btn-claro" data-perm="contratos:editar"
                style="padding:4px 10px;font-size:12px" onclick="abrirDeferir('${s.id}')">✓ Deferido</button>`
              : `<button class="btn" data-perm="contratos:editar"
                style="padding:4px 10px;font-size:12px" onclick="abrirRecebimento('${s.id}')">💰 Recebi</button>`}
            ` : ''}
          </span>
        </div>
        <div class="sin-nums">
          ${s.valor_pleiteado != null ? `<span><i>pleiteado</i> ${moeda(s.valor_pleiteado)}</span>` : ''}
          ${s.valor_deferido  != null ? `<span><i>deferido</i> ${moeda(s.valor_deferido)}</span>` : ''}
          ${s.valor_recebido  != null ? `<span><i>recebido</i> ${moeda(s.valor_recebido)}</span>` : ''}
          ${s.data_fato ? `<span><i>fato</i> ${dataBr(s.data_fato)}</span>` : ''}
          ${s.data_abertura ? `<span><i>aberto</i> ${dataBr(s.data_abertura)}</span>` : ''}
          ${s.previsao_pagamento && !s.data_recebimento
            ? `<span><i>pagamento previsto</i> ${dataBr(s.previsao_pagamento)}</span>` : ''}
          ${abertas.length ? `<span style="color:var(--alerta)"><i>exigências abertas</i> ${abertas.length}</span>` : ''}
        </div>
        ${linha ? `<div class="andamentos">${linha}</div>` : ''}
      </div>`;
    }).join('');
  return `<div class="cartao">
    <h2>Sinistros <span class="cnt">(${sinistrosFicha.length})</span>
      <span class="dir">${relacionados.some(a => a.status === 'Vigente')
        ? `<button class="btn btn-claro" data-perm="contratos:editar"
             style="padding:5px 12px;font-size:12px" onclick="abrirNovoSinistro()">+ Acionar seguro</button>`
        : '<span style="color:#8a94a1;font-size:12px">acione a partir de uma apólice vigente</span>'}</span></h2>
    ${corpo}</div>`;
}

/** Histórico de reajustes — o que a planilha nunca guardou. */
function blocoReajustes() {
  const corpo = !reajustesFicha.length
    ? '<div class="corpo" style="color:#8a94a1">Nenhum reajuste aplicado pelo CRM ainda.</div>'
    : `<table class="mini">${reajustesFicha.map(r => `
      <tr>
        <td style="width:1%;white-space:nowrap;color:var(--texto-suave)">${dataBr(r.aplicado_em)}</td>
        <td>${moeda(r.valor_anterior)} → <b>${moeda(r.valor_novo)}</b>
          <div style="color:var(--texto-suave);font-size:12px">${htm(r.indice || 'sem índice')}${
            r.percentual != null ? ' · ' + (r.percentual * 100).toFixed(2).replace('.', ',') + '%' : ''}${
            r.observacao ? ' · ' + htm(r.observacao) : ''}</div></td>
      </tr>`).join('')}</table>`;
  return `<div class="cartao">
    <h2>Reajustes <span class="cnt">(${reajustesFicha.length})</span>
      <span class="dir"><button class="btn btn-claro" data-perm="contratos:editar"
        style="padding:5px 12px;font-size:12px" onclick="abrirReajuste()">＄ Aplicar reajuste</button></span></h2>
    ${corpo}</div>`;
}

/** A linha do tempo do sinistro, na ficha própria: mais espaço, todos os
 *  andamentos (não só os 6 primeiros) e o botão de cumprir em cada
 *  exigência aberta. */
function blocoLinhaDoTempo() {
  if (!relacionados.length)
    return `<div class="corpo" style="color:#8a94a1">Nenhum andamento registrado.
      Use os botões acima para registrar exigência, deferimento ou recebimento.</div>`;
  return `<div class="andamentos" style="margin:0;padding:8px 16px 16px">` +
    relacionados.map(a => `
      <div class="and ${a.cumprido_em ? 'ok' : (a.prazo && a.prazo < hojeISO() ? 'atrasado' : '')}">
        <span class="and-tipo">${htm(a.tipo)}</span>
        <span class="and-txt">${htm(a.descricao)}</span>
        <span class="and-meta">${a.de_quem === 'Nós' ? '🧑‍💼 nós' : '🏢 seguradora'}${
          a.prazo ? ' · prazo ' + dataBr(a.prazo) : ''}${
          a.cumprido_em ? ' · ✓ ' + dataBr(a.cumprido_em) : ''}${
          a.criado_em ? ' · registrado ' + dataBr(String(a.criado_em).slice(0,10)) : ''}</span>
        ${(!a.cumprido_em && a.tipo === 'Exigência')
          ? `<button class="btn btn-claro" data-perm="sinistros:editar"
               style="padding:3px 9px;font-size:11px"
               onclick="cumprirExigencia('${a.id}')">✓ Cumpri</button>` : ''}
      </div>`).join('') + `</div>`;
}

function blocoRelacionados() {
  if (ALVO === 'sinistro') return blocoLinhaDoTempo();
  if (ALVO === 'contrato') return blocoApolices();
  if (ALVO === 'caso') {
    if (!orcamentos.length)
      return '<div class="corpo" style="color:#8a94a1">Nenhum orçamento registrado.</div>';
    const cor = { 'Aprovado': 'tag-verde', 'Enviado': 'tag-amarela',
                  'Recusado': 'tag-cinza', 'Substituído': 'tag-cinza' };
    return orcamentos.map(o => {
      const nome = nomePessoa(o.prestador_id) || o.prestador_texto || '(prestador não informado)';
      const rastro = o.situacao === 'Aprovado'
        ? `<div class="rastro-ok">✓ <span><b>Aprovado em ${dataBr(String(o.aprovado_em || '').slice(0, 10))}</b>${
            o.aprovado_por_email ? ' por ' + htm(o.aprovado_por_email.split('@')[0]) : ''} ·
            ${htm(o.autorizacao_canal || '')}${
            o.autorizacao_observacao ? '<br>' + htm(o.autorizacao_observacao) : ''}</span></div>`
        : '';
      const acao = o.situacao === 'Enviado'
        ? `<button class="btn btn-claro" style="padding:5px 12px;font-size:12px"
             onclick="pedirAprovacao('${o.id}')">✓ Aprovar</button>` : '';
      return `
      <div class="orc ${o.situacao === 'Aprovado' ? 'aprovado' : (o.situacao === 'Enviado' ? '' : 'fora')}">
        <div class="orc-val">${moeda(o.valor)}<small>${htm(o.situacao)}</small></div>
        <div class="orc-txt">
          <b>${htm(nome)}</b>${o.o_que_inclui ? ' · ' + htm(o.o_que_inclui) : ''}
          <div class="orc-p">${htm(o.proposta || 'Sem descrição da proposta.')}</div>
          <div class="orc-p">${o.prazo_inicio ? 'Início ' + dataBr(o.prazo_inicio) : ''}${
            o.prazo_fim ? ' · conclusão ' + dataBr(o.prazo_fim) : ''}</div>
          ${rastro}
        </div>
        <div class="orc-lado">
          <span class="tag ${cor[o.situacao] || 'tag-cinza'}">${htm(o.situacao)}</span>${acao}
        </div>
      </div>`;
    }).join('');
  }
  if (ALVO === 'lead') {
    if (!relacionados.length)
      return '<div class="corpo" style="color:#8a94a1">Nenhum imóvel ligado a este lead ainda.</div>';
    return `<table class="mini">${relacionados.map(i => {
      const daCarteira = listaImoveis.find(x => x.id === i.imovel_id);
      const alvo = daCarteira
        ? `<a href="imovel.html?id=${daCarteira.id}">${htm(daCarteira.endereco)}</a>`
        : htm(i.endereco_texto || i.referencia_externa || '(imóvel sem cadastro)');
      return `
      <tr>
        <td style="width:1%;white-space:nowrap;color:var(--texto-suave)">${htm(daCarteira ? daCarteira.codigo : (i.referencia_externa || ''))}</td>
        <td>${alvo}
          <div style="color:var(--texto-suave);font-size:12px">${htm(i.origem)}${
            i.valor_aluguel ? ' · ' + moeda(i.valor_aluguel) : ''}${
            urlSegura(i.link_anuncio) ? ` · <a href="${htm(urlSegura(i.link_anuncio))}" target="_blank" rel="noopener">anúncio</a>` : ''}</div></td>
        <td style="width:1%;white-space:nowrap">
          <span class="tag ${i.situacao === 'Descartou' ? 'tag-cinza' : (i.situacao === 'Gostou' ? 'tag-verde' : 'tag-azul')}">${htm(i.situacao)}</span></td>
      </tr>`;
    }).join('')}</table>`;
  }
  if (ALVO === 'contato') {
    if (!relacionados.length) return '<div class="corpo" style="color:#8a94a1">Nenhum imóvel vinculado.</div>';
    return `<table class="mini">${relacionados.map(i => `
      <tr>
        <td style="width:1%;white-space:nowrap;color:var(--texto-suave)">${htm(i.codigo || '')}</td>
        <td><a href="imovel.html?id=${i.id}">${htm(i.endereco)}</a>
            <div style="color:var(--texto-suave);font-size:12px">${htm(i.bairro || '')} ·
            ${i.proprietario_id === ID ? 'como proprietário' : 'como inquilino'}</div></td>
        <td style="width:1%;white-space:nowrap">${htm(i.situacao || '')}</td>
      </tr>`).join('')}</table>`;
  }
  if (!relacionados.length) return '<div class="corpo" style="color:#8a94a1">Nenhuma pessoa vinculada.</div>';
  return `<table class="mini">${relacionados.map(p => `
    <tr>
      <td style="width:1%;white-space:nowrap;color:var(--texto-suave)">${htm(p.papel)}</td>
      <td><a href="contato.html?id=${p.id}">${htm(p.nome)}</a></td>
      <td style="width:1%;white-space:nowrap;color:var(--texto-suave)">${htm(p.codigo || '')}</td>
    </tr>`).join('')}</table>`;
}

// ------------------------------------------------------------
// CASO — caminho de etapas, anexos, financeiro e aprovação
// ------------------------------------------------------------
function caminhoEtapas() {
  if (registro.status === 'Cancelado') {
    return `<div class="path"><div class="et atual" style="background:#6a7480">Cancelado${
      registro.motivo_cancelamento ? ' — ' + htm(registro.motivo_cancelamento) : ''}</div></div>`;
  }
  const ETAPAS = etapasDoCaso();
  const i = ETAPAS.indexOf(registro.status);
  const proxima = ETAPAS[i + 1];
  return `<div class="path">${ETAPAS.map((e, k) =>
    `<div class="et ${k < i ? 'feita' : (k === i ? 'atual' : '')}">${htm(e)}</div>`).join('')}
    ${proxima ? `<div class="path-acao"><button class="btn btn-verde"
       onclick="avancarEtapa('${proxima}')">✓ Marcar como ${htm(proxima.toLowerCase())}</button></div>` : ''}
  </div>`;
}

async function avancarEtapa(nova) {
  const linha = { status: nova };
  if (nova === 'Em execução' && !registro.iniciado_em) linha.iniciado_em = hojeISO();
  if (nova === 'Concluído' && !registro.concluido_em) linha.concluido_em = hojeISO();
  const { error } = await sb.from('casos').update(linha).eq('id', ID);
  if (error) { alerta('Não foi possível avançar: ' + error.message); return; }
  await carregarFicha();
}

/** Lançar orçamento pela equipe. Cada envio é uma linha nova — nunca sobrescreve. */
function novoOrcamento() {
  abrirModal(DEFS.orcamento, 'Lançar orçamento',
    { prestador_id: registro.prestador_id || '' },
    { caso_id: ID, situacao: 'Enviado', enviado_por: sessaoEmail },
    async () => {
      if (registro.status === 'Aberto') await sb.from('casos').update({ status: 'Orçamento' }).eq('id', ID);
      await carregarFicha();
    });
}

/** Aprovar orçamento: pede o canal da autorização — sem isso não há rastro. */
function pedirAprovacao(orcId) {
  abrirModal(DEFS.aprovacao, 'Aprovar orçamento',
    { _orcamento: orcId, autorizacao_canal: 'WhatsApp do proprietário' }, {}, null);
  document.getElementById('btn-salvar').setAttribute('onclick', `confirmarAprovacao('${orcId}')`);
}

async function confirmarAprovacao(orcId) {
  const canal = document.getElementById('mf-autorizacao_canal').value;
  const obs = document.getElementById('mf-autorizacao_observacao').value.trim();
  const { error } = await sb.rpc('aprovar_orcamento', {
    p_orcamento_id: orcId, p_canal: canal, p_observacao: obs || null, p_email: sessaoEmail
  });
  if (error) { alerta('Não foi possível aprovar: ' + error.message); return; }
  document.getElementById('btn-salvar').setAttribute('onclick', 'salvarModal()');
  fecharModal();
  await carregarFicha();
}

// ------------------------------------------------------------
// ANEXOS DO CASO (v1.105) — agora com ARQUIVO de verdade, não só link.
// O arquivo vai para o depósito privado 'anexos' (sql/anexos-storage.sql),
// no caminho <empresa>/<caso>/<nome>; a tabela guarda o caminho e a tela
// gera um link assinado de 1 hora ao abrir. Os anexos antigos por URL
// (laudos do Devolus) continuam funcionando como sempre.
// ------------------------------------------------------------
const ICONE_ANEXO = { 'Nota fiscal': '🧾', 'Autorização': '💬', 'Laudo': '📄', 'Foto': '🖼️',
  'Contrato assinado': '📜', 'Apólice': '🛡️', 'Vistoria': '🔍', 'Distrato': '📕',
  'Boletim de ocorrência': '🚨', 'Notificação': '📮', 'Documento': '📄' };

// M33: o cartão de anexos deixou de ser exclusivo do Caso. O que muda de
// um objeto para outro é só a LISTA DE TIPOS oferecida — a mecânica de
// enviar, assinar o link e excluir é a mesma.
const TIPOS_ANEXO = {
  casos:     ['Foto', 'Nota fiscal', 'Autorização', 'Laudo', 'Outro'],
  contratos: ['Contrato assinado', 'Apólice', 'Vistoria', 'Documento', 'Distrato', 'Outro'],
  sinistros: ['Boletim de ocorrência', 'Laudo', 'Notificação', 'Documento', 'Foto', 'Outro'],
  imoveis:   ['Documento', 'Foto', 'Vistoria', 'Outro'],
  contatos:  ['Documento', 'Outro']
};

/** De qual objeto é a ficha aberta — no vocabulário das permissões. */
function OBJETO_DO_ALVO() {
  return ({ caso: 'casos', contrato: 'contratos', sinistro: 'sinistros',
            imovel: 'imoveis', contato: 'contatos' })[ALVO] || 'casos';
}

async function assinarAnexos() {
  await Promise.all(anexos.filter(a => a.arquivo_path).map(async a => {
    const { data } = await sb.storage.from('anexos').createSignedUrl(a.arquivo_path, 3600);
    a._url = data && data.signedUrl;
  }));
}

function blocoAnexos() {
  const itens = anexos.length
    ? anexos.map(a => {
      // urlSegura (v1.115): anexo por link é texto livre no banco — sem o
      // filtro, um "javascript:" gravado ali executaria ao clicar.
      const href = urlSegura(a.url || a._url);
      return `
      <div class="anexo-caixa" id="ax-${a.id}">
        <a class="anexo" ${href ? `href="${htm(href)}" target="_blank" rel="noopener"` : ''}>
          <span class="ic">${ICONE_ANEXO[a.tipo] || '🖼️'}</span>
          <span>${htm(a.tipo || 'Arquivo')}</span>
          <small>${htm(a.nome_arquivo || a.descricao || '')}</small></a>
        <button class="anexo-del" data-perm="${OBJETO_DO_ALVO()}:editar" title="Excluir anexo"
          onclick="pedirExclusaoAnexo('${a.id}')">✕</button>
      </div>`;
    }).join('')
    : '<div class="vazio-min">Nenhum arquivo anexado.</div>';
  const obj = OBJETO_DO_ALVO();
  const tipos = TIPOS_ANEXO[obj] || TIPOS_ANEXO.casos;
  return `<div class="cartao"><h2>Arquivos <span class="cnt">(${anexos.length})</span>
    <span class="dir anexar-caso" data-perm="${obj}:editar">
      <select id="anexo-tipo">
        ${tipos.map(t => `<option>${htm(t)}</option>`).join('')}
      </select>
      <label class="btn btn-claro" style="padding:5px 12px;font-size:12px;cursor:pointer">📎 Anexar…
        <input type="file" id="anexo-arquivo" accept="image/*,application/pdf"
          style="display:none" onchange="enviarAnexo(this)"></label>
    </span></h2>
    <p class="msg-erro" id="anexo-erro"></p>
    <div class="anexos">${itens}</div></div>`;
}

/**
 * Carrega os anexos do registro aberto, seja ele caso, contrato ou
 * sinistro. Tolerante de propósito: se `anexos` ainda não existir no
 * banco (SQL do M33 não rodado), a ficha abre sem o cartão em vez de
 * quebrar inteira — o mesmo padrão das outras telas.
 */
async function carregarAnexosDoRegistro() {
  const { data, error } = await sb.from('anexos').select('*')
    .eq('objeto', OBJETO_DO_ALVO()).eq('registro_id', ID).order('enviado_em');
  anexos = error ? [] : (data || []);
  if (!error) await assinarAnexos();
}

async function recarregarAnexos() {
  const { data } = await sb.from('anexos').select('*')
    .eq('objeto', OBJETO_DO_ALVO()).eq('registro_id', ID).order('enviado_em');
  anexos = data || [];
  await assinarAnexos();
  desenharFicha();
}

async function enviarAnexo(input) {
  const arq = input.files && input.files[0];
  input.value = '';
  if (!arq) return;
  const erro = document.getElementById('anexo-erro');
  const falhar = m => { erro.textContent = m; erro.style.display = 'block'; };
  erro.style.display = 'none';

  const TIPOS_OK = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf'];
  if (arq.size > 10 * 1024 * 1024) return falhar('Arquivo acima de 10 MB. Diminua a foto ou divida o PDF.');
  if (!TIPOS_OK.includes(arq.type)) return falhar('Só imagens (JPG, PNG, WEBP, HEIC) ou PDF.');

  const tipo = document.getElementById('anexo-tipo').value;
  // nome sem acento/espaço: o Storage recusa caracteres fora do padrão
  const limpo = arq.name.normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9._-]/g, '_').slice(-80);
  // <empresa>/<objeto>/<registro>/<arquivo> — a segunda pasta é o que
  // faz a política do depósito exigir a permissão do objeto certo (M33)
  const caminho = `${PERM.empresa.id}/${OBJETO_DO_ALVO()}/${ID}/${sufixoAleatorio()}-${limpo}`;

  const { error } = await sb.storage.from('anexos').upload(caminho, arq,
    { contentType: arq.type, upsert: false, cacheControl: '3600' });
  if (error) {
    return falhar(typeof traduzirErroStorage === 'function'
      ? traduzirErroStorage(error) : ('Não consegui enviar: ' + error.message));
  }
  const { error: e2 } = await sb.from('anexos').insert({
    objeto: OBJETO_DO_ALVO(), registro_id: ID,
    tipo, nome_arquivo: arq.name, arquivo_path: caminho });
  if (e2) {
    // não deixo arquivo órfão quando a segunda etapa falha (padrão do imagem.js)
    await sb.storage.from('anexos').remove([caminho]);
    return falhar('O arquivo subiu mas o registro falhou: ' + e2.message);
  }
  await recarregarAnexos();
}

function pedirExclusaoAnexo(id) {
  const el = document.getElementById('ax-' + id);
  if (!el) return;
  el.innerHTML = `<div class="anexo anexo-confirmar"><span>Excluir?</span>
    <span><button class="btn btn-perigo" style="padding:4px 10px;font-size:12px"
      onclick="excluirAnexo('${id}')">Sim</button>
    <button class="btn btn-claro" style="padding:4px 10px;font-size:12px"
      onclick="desenharFicha()">Não</button></span></div>`;
}

async function excluirAnexo(id) {
  const a = anexos.find(x => String(x.id) === String(id));
  const { error } = await sb.from('anexos').delete().eq('id', id);
  if (error) {
    const erro = document.getElementById('anexo-erro');
    erro.textContent = 'Não foi possível excluir: ' + error.message;
    erro.style.display = 'block';
    return;
  }
  // o arquivo sai DEPOIS do registro: pior caso é arquivo órfão no
  // depósito, nunca registro apontando para arquivo apagado
  if (a && a.arquivo_path) await sb.storage.from('anexos').remove([a.arquivo_path]);
  await recarregarAnexos();
}

function blocoFinanceiro() {
  const alerta_ = calculados.alerta_sem_nota
    ? `<div class="aviso-fin">⚠ Este caso vai ser descontado do repasse do proprietário e
        <b>ainda não tem nota anexada</b>. Anexe o comprovante antes de marcar como pago.</div>` : '';
  const linha = (r, v) => `<div><span class="r">${htm(r)}</span><div class="v">${v}</div></div>`;
  const cp = { 'A pagar': 'tag-vermelha', 'Pago': 'tag-verde', 'Cancelado': 'tag-cinza' };
  return `<div class="cartao"><h2>Financeiro</h2><div class="corpo">${alerta_}
    <div class="campos-ficha">
      ${linha('Situação', `<span class="tag ${cp[registro.status_pagamento] || 'tag-cinza'}">${htm(registro.status_pagamento)}</span>`)}
      ${linha('Valor aprovado', registro.valor_aprovado ? '<b>' + moeda(registro.valor_aprovado) + '</b>' : '—')}
      ${linha('Forma de pagamento', htm(registro.forma_pagamento || '—'))}
      ${linha('Previsto para', registro.pagamento_previsto_em ? dataBr(registro.pagamento_previsto_em) : '—')}
      ${linha('Pago em', registro.pago_em ? dataBr(registro.pago_em) : '—')}
      ${linha('Descontado do repasse em', registro.descontado_repasse_em ? dataBr(registro.descontado_repasse_em) : '—')}
      ${registro.observacao_financeira
        ? `<div class="largo"><span class="r">Observação financeira</span><div class="v">${htm(registro.observacao_financeira)}</div></div>` : ''}
    </div></div></div>`;
}

function blocoGuardiao() {
  const avisos = [];
  if (calculados.dias_atraso > 0)
    avisos.push(`🔴 <span><b>${calculados.dias_atraso} dias de atraso</b> em relação ao prazo do orçamento aprovado.</span>`);
  if (calculados.alerta_sem_nota)
    avisos.push('🟠 <span><b>Sem nota anexada</b> — o desconto no repasse do proprietário não deveria sair sem comprovante.</span>');
  if (calculados.tem_orcamento_pendente)
    avisos.push('🟠 <span><b>Há orçamento aguardando decisão.</b> Enquanto ninguém aprova, o serviço não anda.</span>');
  if (registro.status !== 'Concluído' && registro.status !== 'Cancelado' && calculados.dias_aberto > 30)
    avisos.push(`🟠 <span><b>${calculados.dias_aberto} dias em aberto.</b></span>`);
  if (!avisos.length) return '';
  return `<div class="cartao guardiao"><h2 style="color:var(--alerta)">⚠ Guardião</h2>
    <div class="corpo">${avisos.map(a => `<div class="item">${a}</div>`).join('')}</div></div>`;
}

/**
 * (Lead) Histórico de simulações de seguro. É uma lista, não um campo:
 * o mesmo lead simula várias vezes — troca de imóvel, troca de plano —
 * e o que foi reprovado antes importa.
 */
// ------------------------------------------------------------
// PORTAL DO PRESTADOR
//
// O prestador não tem conta no sistema. Ele recebe um LINK por WhatsApp,
// abre no celular e vê só os chamados atribuídos a ele.
//
// Por que link e não login: o app antigo guardava usuário e senha na aba
// Contatos, em texto puro, e reenviava a senha a cada clique. Um link com
// token não tem senha para vazar, e revogar é um botão.
// ------------------------------------------------------------
let tokenPrestador = null;

/** O tipo no catálogo é "Prestador Serviço", não "Prestador". */
function ehPrestador()  { return temTipo('Prestador Serviço'); }
function ehIndicador()  { return temTipo('Indicador'); }

/**
 * O tipo pode estar no principal OU na lista de outros tipos.
 * O Davi é "Indicador" no principal e "Prestador Serviço" nos outros —
 * olhar só o principal deixaria metade da vida dele de fora.
 */
function temTipo(tipo) {
  if (!registro) return false;
  if (registro.tipo_principal === tipo) return true;
  return String(registro.outros_tipos || '')
    .split(',').map(t => t.trim()).indexOf(tipo) !== -1;
}

/**
 * QUEM VÊ O CARTÃO DO PORTAL.
 *
 * Era só "Prestador Serviço". Com o M19 o mesmo link passou a servir
 * também para o indicador ver as comissões dele — e o acesso sempre foi
 * por CONTATO (`prestador_acessos.contato_id`), não por papel. Então a
 * Tainara, que só indica, precisa do mesmo botão.
 *
 * Um link por pessoa: o Davi, que é os dois, continua com um só, e o
 * portal mostra as abas conforme o que ele tem.
 */
function usaPortal() { return ehPrestador() || ehIndicador(); }

function blocoPortalPrestador() {
  // O título diz o que a pessoa é. "Portal do prestador" na ficha da
  // Tainara, que só indica, faria ela e quem gera o link duvidarem se
  // é o botão certo.
  const titulo = (ehPrestador() && ehIndicador()) ? 'Portal do parceiro'
               : (ehIndicador() ? 'Portal do indicador' : 'Portal do prestador');
  return `<div class="cartao" id="cartao-portal">
    <h2>${titulo}</h2>
    <div class="corpo" id="portal-corpo">
      <div style="color:#8a94a1;font-size:13px">Verificando…</div>
    </div>
  </div>`;
}

/** Lê o estado do link. Chamado depois de a ficha desenhar. */
async function carregarPortalPrestador() {
  const alvo = document.getElementById('portal-corpo');
  if (!alvo || !registro) return;

  const { data, error } = await sb.from('prestador_acessos')
    .select('token, ativo, usos, ultimo_uso')
    .eq('contato_id', registro.id).maybeSingle();

  if (error) { alvo.innerHTML = `<p class="msg-erro" style="display:block">${htm(error.message)}</p>`; return; }

  if (!data || !data.ativo) {
    tokenPrestador = null;
    alvo.innerHTML = `
      <p style="font-size:13px;color:var(--texto-suave);line-height:1.6;margin-bottom:10px">
        ${data ? 'O link desta pessoa está <b>desativado</b>. Gere de novo para reativar.'
               : 'Ainda não tem acesso ao portal. O link é pessoal e no celular ela vê ' +
                 oQueVePeloPortal() + '.'}
      </p>
      <button class="btn" data-perm="contatos:editar" onclick="gerarLinkPrestador()">
        ${data ? 'Reativar link' : 'Gerar link de acesso'}</button>`;
    return;
  }

  tokenPrestador = data.token;
  const url = enderecoPortal(data.token);
  const uso = data.ultimo_uso
    ? `Abriu ${data.usos} vez${data.usos === 1 ? '' : 'es'}, a última em ${dataBr(String(data.ultimo_uso).slice(0,10))}.`
    : 'Ainda não abriu o link.';

  alvo.innerHTML = `
    <div style="font-size:12px;color:var(--texto-suave);margin-bottom:8px">${htm(uso)}</div>
    <input readonly value="${htm(url)}" onclick="this.select()"
           style="width:100%;font-size:12px;padding:8px;border:1px solid var(--borda);
                  border-radius:6px;background:var(--fundo);color:var(--texto-suave);
                  margin-bottom:10px">
    <div style="display:flex;gap:8px;flex-wrap:wrap">
      <button class="btn" onclick="copiarConvitePrestador()">Copiar mensagem para WhatsApp</button>
      <button class="btn btn-claro" onclick="copiarSoOLink()">Copiar só o link</button>
      <button class="btn btn-claro" data-perm="contatos:excluir"
              onclick="revogarLinkPrestador()">Revogar</button>
    </div>
    <p style="font-size:11px;color:var(--texto-suave);line-height:1.6;margin-top:10px">
      Quem tiver este link vê ${oQueVePeloPortal()}. Se a pessoa trocar de celular
      não há problema — o link continua o mesmo. Se ela sair da sua lista, use Revogar.
    </p>`;
}

/**
 * O QUE A PESSOA VÊ, na ordem em que ela pensa.
 *
 * Uma frase só, usada em três lugares do cartão. Antes o texto falava
 * só de chamados — e para a Tainara, que só indica, isso descrevia um
 * portal que ela nunca veria.
 */
function oQueVePeloPortal() {
  const p = ehPrestador(), i = ehIndicador();
  if (p && i) return 'os chamados atribuídos a ela e as comissões que tem a receber';
  if (i)      return 'as comissões que tem a receber, e pode indicar imóveis';
  return 'os chamados atribuídos a ela, envia orçamento e avisa quando concluir';
}

/** O portal mora no mesmo site, ao lado das outras telas. */
function enderecoPortal(token) {
  const base = location.origin + location.pathname.replace(/[^/]*$/, '');
  return base + 'prestador.html?t=' + encodeURIComponent(token);
}

async function gerarLinkPrestador() {
  const { data, error } = await sb.rpc('prestador_gerar_link', { p_contato: registro.id });
  if (error) return alert(error.message);
  tokenPrestador = data;
  await carregarPortalPrestador();
}

async function revogarLinkPrestador() {
  if (!confirm('Revogar o acesso deste prestador?\n\n' +
      'O link para de funcionar imediatamente. Os chamados e orçamentos dele ' +
      'continuam guardados. Dá para gerar de novo depois.')) return;
  const { error } = await sb.rpc('prestador_revogar_link', { p_contato: registro.id });
  if (error) return alert(error.message);
  await carregarPortalPrestador();
}

/**
 * A mensagem pronta. O texto muda conforme o que a pessoa é — mandar
 * "acesso aos chamados de manutenção" para quem só indica imóvel faria
 * ela achar que o link veio errado e não abrir.
 */
function copiarConvitePrestador() {
  const emp = (PERM.empresa && (PERM.empresa.nome_fantasia || PERM.empresa.razao_social)) || '';
  const p = ehPrestador(), i = ehIndicador();

  const assunto = (p && i) ? 'aos seus chamados e às suas comissões'
                : (i ? 'às suas comissões' : 'aos chamados de manutenção');
  const comoUsar = (p && i)
    ? 'Por ele você vê os serviços, envia orçamento, avisa quando começar e terminar, ' +
      'e acompanha o que tem a receber de comissão.'
    : (i
      ? 'Por ele você vê quanto tem a receber, o que já foi pago, e pode indicar ' +
        'imóveis novos direto pelo celular.'
      : 'Por ele você vê os serviços, envia o orçamento e avisa quando começar e ' +
        'quando terminar.');

  const texto =
    `Olá${registro.nome ? ', ' + primeiroENome(registro.nome) : ''}! Aqui é da ${emp}.\n\n` +
    `Este é o seu link de acesso ${assunto}:\n` +
    `${enderecoPortal(tokenPrestador)}\n\n` +
    `Guarde no celular. ${comoUsar} Não precisa de senha.`;
  copiar(texto, 'Mensagem copiada. Cole no WhatsApp.');
}

function copiarSoOLink() {
  copiar(enderecoPortal(tokenPrestador), 'Link copiado.');
}

function copiar(texto, aviso) {
  navigator.clipboard.writeText(texto).then(
    () => alert(aviso),
    () => prompt('Copie o texto abaixo:', texto));
}

// ------------------------------------------------------------
// SIMULAÇÕES DE SEGURO (reescrito na v1.117) — o fluxo que morava
// na planilha: registrar a tentativa (CPF → seguradora), enviar o
// resultado por WhatsApp (botão 📲, no lugar do checkbox da coluna
// AA) e, aprovada a fiança, agendar a visita.
//
// Os três números exibidos são OS MESMOS da mensagem do WhatsApp:
// mensal = aluguel + fiança · incêndio = valor cheio ÷ 6 ·
// entrada = fiança + setup. O bloco antigo somava aluguel + fiança
// + incêndio cheio num "total/mês" que não batia com o que o lead
// recebia — número que a pessoa não reconhece é número errado.
// ------------------------------------------------------------
let simEnviando = null;   // simulação com a confirmação de envio aberta

function blocoSimulacoes() {
  const corpo = !simulacoes.length
    ? '<div class="corpo" style="color:#8a94a1">Nenhuma simulação ainda. ' +
      'Registre a 1ª tentativa quando o lead mandar o CPF.</div>'
    : `<table class="mini">${simulacoes.map(s => {
        const cor = s.status_fianca === 'Aprovado' ? 'tag-verde'
                  : (s.status_fianca === 'Reprovado' ? 'tag-vermelha' : 'tag-cinza');
        const mensal = Number(s.valor_aluguel || 0) + Number(s.vr_fianca || 0);
        const podeEnviar = registro.telefone && s.status_fianca;
        const confirmando = simEnviando === s.id;
        return `
        <tr class="${s.status_fianca === 'Aprovado' ? 'sim-aprovada' : ''}">
          <td style="width:1%;white-space:nowrap;color:var(--texto-suave)">${htm(dataBr(String(s.criado_em || '').slice(0, 10)))}</td>
          <td>${htm(s.modalidade || s.seguradora || 'Simulação')}${
              s.cpf_analisado ? ` · <span style="color:var(--texto-suave)">CPF ${
                typeof mascaraDoc === 'function' ? htm(mascaraDoc(String(s.cpf_analisado))) : htm(s.cpf_analisado)}</span>` : ''}
            <div style="color:var(--texto-suave);font-size:12px">
              Aluguel ${moeda(s.valor_aluguel)} + Fiança ${moeda(s.vr_fianca)}
              = <b>${mensal ? moeda(mensal) + '/mês' : '—'}</b> ·
              Incêndio 6× ${moeda(Number(s.vr_incendio || 0) / 6)} ·
              Entrada ${moeda(Number(s.vr_fianca || 0) + Number(s.vr_setup || 0))}</div>
            ${s.enviada_em ? `<div class="sim-enviada">📲 Enviada por WhatsApp em ${
              htm(dataBr(String(s.enviada_em).slice(0, 10)))}</div>` : ''}
            ${confirmando ? `
            <div class="sim-strip" id="sim-strip">
              Enviar para <b>${htm(mascaraTelefone(registro.telefone))}</b> (${htm(registro.nome || '')}):
              ${htm(s.status_fianca)} · ${moeda(s.valor_aluguel)} + ${moeda(s.vr_fianca)}
              = ${moeda(mensal)}/mês · Incêndio 6× ${moeda(Number(s.vr_incendio || 0) / 6)} ·
              Entrada ${moeda(Number(s.vr_fianca || 0) + Number(s.vr_setup || 0))}
              <button class="btn" onclick="confirmarEnvioSimulacao('${s.id}')">Enviar agora</button>
              <button class="btn btn-claro" onclick="cancelarEnvioSimulacao()">Cancelar</button>
            </div>` : ''}
          </td>
          <td style="width:1%;white-space:nowrap"><span class="tag ${cor}">${htm(s.status_fianca || '—')}</span></td>
          <td style="width:1%;white-space:nowrap">
            ${!confirmando ? `<button class="btn btn-claro sim-btn" data-perm="leads:editar"
               ${podeEnviar ? '' : 'disabled title="Precisa de telefone no lead e resultado na simulação"'}
               onclick="pedirEnvioSimulacao('${s.id}')">📲 ${s.enviada_em ? 'Reenviar' : 'Enviar'}</button>` : ''}
          </td>
        </tr>`;
      }).join('')}</table>`;

  const temAprovada = simulacoes.some(s => s.status_fianca === 'Aprovado');
  return `<div class="cartao"><h2>Simulações de seguro fiança
    <span class="cnt">(${simulacoes.length})</span>
    <span class="dir">
      ${temAprovada && registro.status !== 'Convertido' && registro.status !== 'Perdido'
        ? '<span class="tag tag-verde">✅ fiança aprovada — pode agendar a visita</span>' : ''}
      <button class="btn btn-claro" data-perm="leads:editar"
        onclick="novaSimulacao()">+ Nova simulação</button>
    </span></h2>${corpo}</div>`;
}

/** (Lead) Nova tentativa de fiança. O aluguel vem pré-preenchido do
 *  que o lead procura — digitar de novo é convite ao erro. */
function novaSimulacao() {
  const base = {
    status_fianca: 'Pendente',
    valor_aluguel: registro.aluguel_max ?? '',
    cpf_analisado: simulacoes.length ? '' : (registro.cpf_cnpj || '')
  };
  abrirModal(DEFS.simulacao, `Nova simulação (${simulacoes.length + 1}ª tentativa)`,
    base, vinculo(), recarregarSimulacoes);
}

async function recarregarSimulacoes() {
  const { data } = await sb.from('simulacoes').select('*')
    .eq('lead_id', ID).order('criado_em', { ascending: false });
  simulacoes = data || [];
  // a trigger do banco pode ter movido o funil para "Em análise"
  const { data: l } = await sb.from('leads').select('*').eq('id', ID).single();
  if (l) registro = l;
  desenharFicha();
  await recarregarTarefas();
}

function pedirEnvioSimulacao(id) { simEnviando = id; desenharFicha(); }
function cancelarEnvioSimulacao() { simEnviando = null; desenharFicha(); }

/**
 * Envia a simulação pelo BotConversa — substitui o checkbox da coluna
 * AA da planilha. O segredo (URL do webhook) mora no Vault do banco e
 * NUNCA passa por aqui; esta tela só chama a função e espera a
 * confirmação. O carimbo "enviada em" só aparece com resposta 2xx —
 * a mesma regra do Apps Script.
 */
async function confirmarEnvioSimulacao(id) {
  const strip = document.getElementById('sim-strip');
  if (strip) strip.innerHTML = 'Enviando…';
  try {
    const { data: reqId, error } = await sb.rpc('simulacao_enviar_whatsapp',
      { p_simulacao_id: id });
    if (error) throw new Error(error.message);

    // o pg_net é assíncrono: espera a resposta do BotConversa chegar
    let resultado = null;
    for (let i = 0; i < 6; i++) {
      await new Promise(r => setTimeout(r, 1200));
      const { data: st, error: e2 } = await sb.rpc('simulacao_confirmar_envio',
        { p_simulacao_id: id, p_request_id: reqId });
      if (e2) throw new Error(e2.message);
      if (st && !st.pendente) { resultado = st; break; }
      if (strip) strip.innerHTML = `Enviando… aguardando o BotConversa (${i + 1})`;
    }

    if (resultado && resultado.ok) {
      simEnviando = null;
      await recarregarSimulacoes();
      return;
    }
    throw new Error(resultado
      ? 'O BotConversa recusou: ' + (resultado.detalhe || '?')
      : 'O BotConversa não respondeu a tempo — confira no aparelho se chegou antes de reenviar.');
  } catch (e) {
    if (strip) strip.innerHTML = `<span style="color:var(--erro)">${htm(e.message)}</span>
      <button class="btn btn-claro" onclick="cancelarEnvioSimulacao()">Fechar</button>`;
    else alerta(e.message);
  }
}

// ------------------------------------------------------------
// AGENDA DE VISITAS (v1.117) — substitui a aba Registro de Visitas.
//
// A visita é uma TAREFA tipo Visita com hora marcada (lembrete_em):
// entra na atividade do lead, no próximo contato do painel e na tela
// de Tarefas sem nenhuma tabela nova. A grade mostra os horários do
// dia e marca os já tomados por outras visitas em aberto.
// Fluxo combinado em 30/07: visita se agenda com a fiança APROVADA —
// sem aprovação a grade avisa, mas deixa (existe locação com fiador,
// caução ou capitalização; o aviso barra o esquecimento, não o negócio).
// ------------------------------------------------------------
const AGENDA_VISITA = { inicioH: 8, fimH: 18, passoMin: 30 };  // mude aqui os horários
let visitaSlot = null;   // ISO do horário escolhido na grade

function abrirAgendaVisita() {
  visitaSlot = null;
  let fundo = document.getElementById('modal-visita');
  if (!fundo) {
    fundo = document.createElement('div');
    fundo.id = 'modal-visita';
    fundo.className = 'modal-fundo';
    document.body.appendChild(fundo);
  }
  const d = new Date(); d.setDate(d.getDate() + 1);   // sugere amanhã
  const p = n => String(n).padStart(2, '0');
  const amanha = `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  const semAprovada = !simulacoes.some(s => s.status_fianca === 'Aprovado');
  fundo.innerHTML = `
    <div class="modal">
      <h2>Agendar visita — ${htm(registro.nome || '')}</h2>
      ${semAprovada && registro.tipo_lead === 'Inquilino' ? `
        <div class="aviso-fin">⚠️ A fiança deste lead ainda não foi aprovada.
        Agende apenas se a locação for com outra garantia (fiador, caução,
        capitalização) — senão, registre a simulação primeiro.</div>` : ''}
      <div class="campo"><label>Dia da visita</label>
        <input type="date" id="visita-dia" value="${amanha}"></div>
      <div id="visita-grade" class="corpo" style="color:#8a94a1">Escolha o dia…</div>
      <p class="msg-erro" id="visita-erro"></p>
      <div class="acoes">
        <button class="btn btn-claro" onclick="fecharAgendaVisita()">Cancelar</button>
        <button class="btn" id="visita-salvar" disabled onclick="salvarVisita()">Agendar</button>
      </div>
    </div>`;
  fundo.classList.add('aberto');
  document.getElementById('visita-dia').addEventListener('change', desenharGradeVisita);
  desenharGradeVisita();
}

function fecharAgendaVisita() {
  const f = document.getElementById('modal-visita');
  if (f) f.classList.remove('aberto');
}

async function desenharGradeVisita() {
  const dia = document.getElementById('visita-dia').value;
  const caixa = document.getElementById('visita-grade');
  if (!dia) { caixa.textContent = 'Escolha o dia…'; return; }
  caixa.textContent = 'Conferindo a agenda…';
  visitaSlot = null;
  document.getElementById('visita-salvar').disabled = true;

  const [a, m, d] = dia.split('-').map(Number);
  const ini = new Date(a, m - 1, d, 0, 0).toISOString();
  const fim = new Date(a, m - 1, d + 1, 0, 0).toISOString();
  // TODAS as visitas em aberto do dia, de qualquer lead ou imóvel:
  // a agenda é uma só — duas visitas no mesmo horário é gente esperando.
  const { data: ocupadas, error } = await sb.from('tarefas')
    .select('lembrete_em, assunto').eq('tipo', 'Visita').eq('status', 'Aberta')
    .gte('lembrete_em', ini).lt('lembrete_em', fim);
  if (error) { caixa.textContent = 'Não consegui ler a agenda: ' + error.message; return; }

  const ocupado = {};
  (ocupadas || []).forEach(t => {
    const dt = new Date(t.lembrete_em);
    ocupado[`${String(dt.getHours()).padStart(2, '0')}:${String(dt.getMinutes()).padStart(2, '0')}`] =
      t.assunto || 'ocupado';
  });

  let html = '<div class="agenda-grade">';
  for (let h = AGENDA_VISITA.inicioH; h < AGENDA_VISITA.fimH; h++) {
    for (let min = 0; min < 60; min += AGENDA_VISITA.passoMin) {
      const rot = `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
      const ocup = ocupado[rot];
      html += ocup
        ? `<button class="slot ocupado" disabled title="${htm(ocup)}">${rot}</button>`
        : `<button class="slot" data-hora="${rot}" onclick="escolherSlotVisita(this)">${rot}</button>`;
    }
  }
  caixa.innerHTML = html + '</div>';
}

function escolherSlotVisita(el) {
  document.querySelectorAll('#visita-grade .slot.on').forEach(b => b.classList.remove('on'));
  el.classList.add('on');
  const dia = document.getElementById('visita-dia').value;
  const [a, m, d] = dia.split('-').map(Number);
  const [h, min] = el.dataset.hora.split(':').map(Number);
  visitaSlot = new Date(a, m - 1, d, h, min).toISOString();
  document.getElementById('visita-salvar').disabled = false;
}

async function salvarVisita() {
  const erro = document.getElementById('visita-erro');
  erro.style.display = 'none';
  if (!visitaSlot) return;
  const b = document.getElementById('visita-salvar');
  b.disabled = true;
  try {
    const dia = document.getElementById('visita-dia').value;
    const hora = new Date(visitaSlot);
    const rot = `${String(hora.getHours()).padStart(2, '0')}:${String(hora.getMinutes()).padStart(2, '0')}`;
    const { error } = await sb.from('tarefas').insert({
      lead_id: ID, tipo: 'Visita', status: 'Aberta', prioridade: 'Alta',
      assunto: `Visita ${rot} — ${registro.nome || 'lead'}` +
        (registro.imovel_endereco ? ` — ${registro.imovel_endereco}` : ''),
      vencimento: dia, lembrete_em: visitaSlot,
      responsavel_email: registro.responsavel_email || sessaoEmail || null,
      descricao: 'Agendada pela grade de visitas da ficha do lead.'
    });
    if (error) throw error;
    // funil anda junto, sempre para a frente (Novo/Em atendimento/Em
    // análise → Visita agendada); de Proposta em diante, não mexe.
    if (['Novo', 'Em atendimento', 'Em análise'].includes(registro.status)) {
      const { error: e2 } = await sb.from('leads')
        .update({ status: 'Visita agendada' }).eq('id', ID);
      if (!e2) registro.status = 'Visita agendada';
    }
    fecharAgendaVisita();
    desenharFicha();
    await recarregarTarefas();
  } catch (e) {
    erro.textContent = 'Não foi possível agendar: ' + e.message;
    erro.style.display = 'block';
    b.disabled = false;
  }
}

/**
 * (Lead) Converter em contato. Chama a função converter_lead() do banco,
 * que reaproveita o contato existente se o CPF ou o telefone já estiverem
 * cadastrados — nunca cria duplicado.
 */
async function converterLead() {
  const { data, error } = await sb.rpc('converter_lead', { p_lead_id: ID });
  if (error) { alerta('Não foi possível converter: ' + error.message); return; }
  window.location.href = 'contato.html?id=' + data;
}

function desenharFicha() {
  document.title = `${DEF.titulo(registro)} — CRM Moralí`;
  // As seções vêm do layout da empresa (js/layout-ficha.js). Sem layout
  // salvo, vem uma seção só com todos os campos — a ficha de sempre.
  const secoes = (typeof LAY !== 'undefined' && LAY.secoes)
    ? LAY.secoes
    : [{ titulo: 'Detalhes', colunas: 2, campos: DEF.campos.map(c => c.c) }];

  const blocos = secoes.map(sec => {
    const dentro = (sec.campos || [])
      .map(id => (typeof ehEspaco === 'function' && ehEspaco(id))
        ? { c: id, r: '', t: 'espaco' }
        : DEF.campos.find(c => c.c === id))
      .filter(Boolean)
      .map(c => c.t === 'espaco'
        ? '<div class="campo-espaco"></div>'
        : `
        <div class="${c.largo ? 'largo' : ''}">
          <span class="r">${htm(c.r)}</span>
          <div class="v">${valorFormatado(c)}</div>
        </div>`).join('');
    if (!dentro) return '';
    return `<div class="cartao">
              <h2>${htm(sec.titulo || 'Detalhes')}</h2>
              <div class="corpo"><div class="campos-ficha${sec.colunas === 1 ? ' uma-coluna' : ''}">${dentro}</div></div>
            </div>`;
  }).join('');

  document.getElementById('conteudo').innerHTML = `
    <div class="migalha"><a href="${DEF.lista}">${DEF.rotulo}</a> ›
      ${htm(DEF.titulo(registro))}</div>

    <div class="destaque">
      <div class="topo-ficha">
        <div class="avatar">${ALVO === 'imovel' ? '🏠'
          : (ALVO === 'caso' ? '🔧'
          : (ALVO === 'contrato' ? '📜'
          : (ALVO === 'sinistro' ? '⚠️' : htm(iniciais(DEF.titulo(registro))))))}</div>
        <div style="min-width:0">
          <h1>${htm(DEF.titulo(registro))}</h1>
          <div class="sub">${subtituloDoRegistro()}</div>
        </div>
        <div class="acoes-ficha">
          ${registro.telefone && String(registro.telefone).replace(/\D/g, '').length >= 10
            ? `<a class="btn btn-claro" target="_blank" rel="noopener"
                 href="https://wa.me/55${String(registro.telefone).replace(/\D/g, '')}">💬 WhatsApp</a>` : ''}
          <button class="btn btn-claro" onclick="registrarLigacao()">📞 Registrar ligação</button>
          <button class="btn btn-claro" onclick="novaTarefa()">+ Nova tarefa</button>
          ${ALVO === 'lead' && !['Convertido', 'Perdido'].includes(registro.status)
            ? `<button class="btn btn-claro" data-perm="leads:editar"
                 onclick="abrirAgendaVisita()">📅 Agendar visita</button>` : ''}
          ${(ALVO === 'lead' && !registro.contato_id)
            ? '<button class="btn btn-claro" onclick="converterLead()">✓ Converter em contato</button>' : ''}
          ${ALVO === 'sinistro' && registro.em_andamento ? `
            <button class="btn btn-claro" data-perm="sinistros:editar"
              onclick="abrirExigencia('${ID}')">+ Exigência</button>
            ${registro.status !== 'Deferido'
              ? `<button class="btn btn-claro" data-perm="sinistros:editar"
                   onclick="abrirDeferir('${ID}')">✓ Deferido</button>`
              : `<button class="btn" data-perm="sinistros:aprovar"
                   onclick="abrirRecebimento('${ID}')">💰 Recebi</button>`}
          ` : ''}
          ${(ALVO === 'contato' || ALVO === 'imovel' || ALVO === 'lead')
            ? `<button class="btn btn-claro btn-excluir" id="btn-excluir"
                 data-perm="${DEF.tabela}:excluir"
                 onclick="pedirExcluirRegistro()">🗑 Excluir</button>` : ''}
          <button class="btn" onclick="editarRegistro()">Editar</button>
        </div>
        <div class="faixa-excluir" id="faixa-excluir" style="display:none"></div>
      </div>
      ${ALVO === 'caso' ? caminhoEtapas() : ''}
      ${faixaAjudaEtapa()}
      <div class="chips">${chipsDoRegistro().map(([r, v]) => `
        <div class="chip"><span class="r">${htm(r)}</span><span class="v">${htm(v)}</span></div>`).join('')}
      </div>
    </div>

    <div class="g70">
      <div>
        ${blocos}
        <div class="cartao">
          <h2>${htm(DEF.rotuloRel)}
            <span class="cnt">(${relacionados.length})</span>
            ${ALVO === 'caso' ? `<span class="dir"><button class="btn btn-claro"
               style="padding:5px 12px;font-size:12px" onclick="novoOrcamento()">+ Lançar orçamento</button></span>` : ''}</h2>
          ${blocoRelacionados()}
        </div>
        ${ALVO === 'contrato' ? blocoSinistros() + blocoReajustes() : ''}
        ${blocoCasosFicha()}
        ${ALVO === 'lead' ? blocoSimulacoes() : ''}
        ${ALVO === 'caso' ? blocoAnexos() + blocoFinanceiro() : ''}
        ${(ALVO === 'contrato' || ALVO === 'sinistro') ? blocoAnexos() : ''}
        ${ALVO === 'contato' && usaPortal() ? blocoPortalPrestador() : ''}
      </div>

      <div>
        ${ALVO === 'caso' ? blocoGuardiao() : ''}
        <aside class="cartao faixa" id="faixa-atividade"></aside>
      </div>
    </div>`;
  desenharFaixa();
  // A ficha é desenhada DEPOIS de o permissoes.js ter feito a varredura
  // inicial da página — sem esta chamada, botão com data-perm criado
  // agora (Excluir, cartão de Casos) apareceria para quem não pode.
  if (typeof aplicarPermissoes === 'function') aplicarPermissoes();
  // depois de a ficha existir na tela: o bloco do portal consulta o banco
  if (ALVO === 'contato' && usaPortal()) carregarPortalPrestador();
  registrarAcessoRecente();
}

/**
 * ÚLTIMOS ACESSADOS (v1.120) — alimenta a faixa da Home.
 *
 * Fica no navegador de propósito: é preferência de quem está usando, não
 * dado da imobiliária. Não custa tabela, não custa consulta, e não vaza
 * nome de cliente para outro usuário da mesma máquina — some com o
 * histórico do navegador. Cinco registros, sem repetir, o mais recente
 * primeiro; sem botão de salvar nem de fixar, como manda a especificação.
 */
function registrarAcessoRecente() {
  try {
    if (!registro || !ID) return;
    const rotulo = {
      lead: 'Lead', contato: 'Contato', imovel: 'Imóvel',
      contrato: 'Contrato', caso: 'Caso', sinistro: 'Sinistro'
    }[ALVO];
    if (!rotulo) return;
    const item = {
      tipo: rotulo,
      titulo: String(DEF.titulo(registro) || '').slice(0, 70),
      url: ALVO + '.html?id=' + ID   // lead.html, contato.html, imovel.html…
    };
    const chave = 'crm_recentes';
    let lista = [];
    try { lista = JSON.parse(localStorage.getItem(chave) || '[]'); } catch (e) { lista = []; }
    lista = lista.filter(i => i && i.url !== item.url);
    lista.unshift(item);
    localStorage.setItem(chave, JSON.stringify(lista.slice(0, 5)));
  } catch (e) {
    // modo anônimo ou armazenamento cheio: a Home só mostra o estado vazio
  }
}

/**
 * (Lead, v1.118) A DICA DA ETAPA, onde a pessoa está trabalhando.
 *
 * O texto vem do cadastro (Administração → Funil e réguas), então quem
 * conhece a operação escreve a orientação — não o programador. Mostra
 * também quantos dias o lead está parado nesta etapa e quando é o
 * próximo contato, que é a régua do funil em ação.
 */
function faixaAjudaEtapa() {
  if (ALVO !== 'lead' || !registro) return '';
  const tipo = registro.tipo_lead || 'Inquilino';
  const ajuda = (calculados && calculados.etapa_ajuda) ||
    (typeof ajudaDaEtapa === 'function' ? ajudaDaEtapa(tipo, registro.status) : '');
  if (!ajuda) return '';

  const dias = calculados ? calculados.dias_na_etapa : null;
  const prox = calculados ? calculados.proximo_contato : null;
  const encerrou = typeof etapaEncerra === 'function' && etapaEncerra(tipo, registro.status);
  const partes = [];
  if (dias !== null && dias !== undefined) {
    partes.push(dias === 0 ? 'entrou nesta etapa hoje' : `nesta etapa há ${dias} dia(s)`);
  }
  if (!encerrou) {
    partes.push(prox ? `próximo contato ${dataBr(String(prox).slice(0, 10))}`
                     : 'sem próximo contato marcado');
  }
  return `<div class="ajuda-etapa">
    <b>${htm(registro.status || 'Etapa')}</b> — ${htm(ajuda)}
    ${partes.length ? `<span class="det">${htm(partes.join(' · '))}</span>` : ''}
  </div>`;
}

// ------------------------------------------------------------
// 4) FAIXA DE ATIVIDADE (a "lista lateral de tarefas")
// ------------------------------------------------------------
function linhaTarefa(t, cor) {
  const feita = t.status === 'Concluída';
  const prazo = feita
    ? 'Concluída em ' + dataBr((t.concluida_em || '').slice(0, 10))
    : (t.vencimento ? dataBr(t.vencimento) : 'sem prazo');
  const meta = [htm(t.codigo || ''), t.responsavel_email ? htm(t.responsavel_email.split('@')[0]) : null]
    .filter(Boolean).join(' · ');
  return `
  <div class="task-row ${feita ? 'feita' : ''}" id="tr-${t.id}">
    <button class="cb ${feita ? 'on' : ''}" title="${feita ? 'Reabrir' : 'Concluir'}"
      onclick="alternar('${t.id}')">${feita ? '✓' : ''}</button>
    <span class="tp" title="${htm(t.tipo)}">${ICONE[t.tipo] || '📋'}</span>
    <div class="tx" onclick="editarTarefa('${t.id}')">
      <div class="tt">${htm(t.assunto)}
        ${t.prioridade === 'Alta' ? '<span class="tag tag-vermelha">Alta</span>' : ''}</div>
      <div class="tm"><span class="due ${cor}">${htm(prazo)}</span>${t.lembrete_em ? ' ⏰' : ''}
        ${meta ? ' · ' + meta : ''}</div>
    </div>
    <button class="del" title="Excluir tarefa" onclick="pedirExclusao('${t.id}')">✕</button>
    <span class="conf">Excluir?
      <button class="sim" onclick="excluirTarefa('${t.id}')">Sim</button>
      <button class="nao" onclick="cancelarExclusao('${t.id}')">Não</button></span>
  </div>`;
}

function desenharFaixa() {
  const hoje = hojeISO();
  const abertas = tarefasFicha.filter(t => t.status === 'Aberta');
  const feitas = tarefasFicha.filter(t => t.status === 'Concluída')
    .sort((a, b) => (b.concluida_em || '').localeCompare(a.concluida_em || ''));

  const grupos = [
    ['ATRASADAS', abertas.filter(t => t.vencimento && t.vencimento < hoje), 'late'],
    ['HOJE', abertas.filter(t => t.vencimento === hoje), 'warn'],
    ['PRÓXIMAS', abertas.filter(t => t.vencimento && t.vencimento > hoje), 'ok'],
    ['SEM PRAZO', abertas.filter(t => !t.vencimento), '']
  ].filter(g => g[1].length);

  let html = `
    <h2>Atividade <span class="cnt">(${abertas.length} aberta${abertas.length === 1 ? '' : 's'})</span></h2>
    <div class="barra-acoes">
      <button onclick="registrarLigacao()">📞 Registrar ligação</button>
      <button onclick="novaTarefa()">+ Nova tarefa</button>
    </div>`;

  if (!tarefasFicha.length) {
    html += '<div class="vazio-faixa">Nenhuma atividade ainda.</div>';
  } else {
    html += grupos.map(([titulo, lista, cor]) => `
      <div class="grupo-cab ${cor}">${titulo} (${lista.length})</div>
      ${lista.map(t => linhaTarefa(t, cor)).join('')}`).join('');

    if (feitas.length) {
      const MES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
      let mesAtual = '';
      const corpo = feitas.slice(0, 30).map(t => {
        const d = (t.concluida_em || '').slice(0, 10);
        const rot = d ? `${MES[parseInt(d.slice(5, 7), 10) - 1]}/${d.slice(0, 4)}` : 'sem data';
        const cab = rot !== mesAtual ? `<div class="mes">${rot}</div>` : '';
        mesAtual = rot;
        return cab + linhaTarefa(t, 'done');
      }).join('');
      html += `<div class="grupo-cab ok">CONCLUÍDAS (${feitas.length})</div>${corpo}`;
    }
  }
  html += `<div class="rodape-faixa"><a href="tarefas.html">Ver todas as tarefas ›</a></div>`;
  document.getElementById('faixa-atividade').innerHTML = html;
}

// ---------- concluir / reabrir ----------
async function alternar(id) {
  const t = tarefasFicha.find(x => x.id === id);
  if (!t) return;
  const feita = t.status === 'Concluída';
  const { error } = await sb.from('tarefas').update(
    feita ? { status: 'Aberta', concluida_em: null }
          : { status: 'Concluída', concluida_em: new Date().toISOString() }).eq('id', id);
  if (error) { alerta('Não foi possível atualizar: ' + error.message); return; }
  await recarregarTarefas();
}

// ---------- excluir com confirmação na própria linha ----------
function pedirExclusao(id) {
  document.querySelectorAll('.task-row.perguntando').forEach(l => l.classList.remove('perguntando'));
  const l = document.getElementById('tr-' + id);
  if (l) l.classList.add('perguntando');
}
function cancelarExclusao(id) {
  const l = document.getElementById('tr-' + id);
  if (l) l.classList.remove('perguntando');
}
async function excluirTarefa(id) {
  const { error } = await sb.from('tarefas').delete().eq('id', id);
  if (error) { alerta('Não foi possível excluir: ' + error.message); return; }
  const l = document.getElementById('tr-' + id);
  if (l) { l.style.transition = 'opacity .18s'; l.style.opacity = 0; }
  setTimeout(recarregarTarefas, 180);
}

async function recarregarTarefas() {
  const filtro = DEF.fk;
  const { data } = await sb.from('tarefas').select('*').eq(filtro, ID)
    .order('vencimento', { ascending: true, nullsFirst: false });
  tarefasFicha = data || [];
  desenharFaixa();
  // os chips do cabeçalho mostram contagem de tarefas: precisam acompanhar
  const caixa = document.querySelector('.chips');
  if (caixa) caixa.innerHTML = chipsDoRegistro().map(([r, v]) =>
    `<div class="chip"><span class="r">${htm(r)}</span><span class="v">${htm(v)}</span></div>`).join('');
  // A régua de follow-up saiu daqui na v1.118: agora é gatilho no BANCO
  // (lead_agendar_proximo_contato), então o próximo passo nasce mesmo que
  // ninguém abra esta ficha — furo que a versão da tela tinha.
}

function alerta(msg) {
  const e = document.getElementById('modal-erro');
  if (e) { e.textContent = msg; e.style.display = 'block'; } else { console.error(msg); }
}

// ------------------------------------------------------------
// JANELA DE AÇÃO (v1.107) — para o que NÃO é edição de registro:
// renovar apólice, aplicar reajuste, acionar seguro, lançar exigência,
// deferir, registrar recebimento.
//
// Cada uma dessas ações é uma FUNÇÃO do banco, que faz várias coisas
// numa transação só (grava, muda etapa e escreve no histórico). A tela
// só junta os campos e chama — assim a regra vive num lugar só e vale
// também para quem chamar por SQL.
// ------------------------------------------------------------
let acaoAtual = null;

function abrirAcao(titulo, campos, aoConfirmar, textoBotao) {
  acaoAtual = aoConfirmar;
  document.getElementById('modal-titulo').textContent = titulo;
  document.getElementById('modal-campos').innerHTML = campos.map(c => {
    const id = 'ac-' + c.n;
    if (c.t === 'textarea') return `<div class="campo largo"><label>${htm(c.r)}</label>
      <textarea id="${id}">${htm(c.v || '')}</textarea></div>`;
    if (c.t === 'select') return `<div class="campo ${c.largo ? 'largo' : ''}"><label>${htm(c.r)}</label>
      <select id="${id}">${c.op.map(o => `<option${o === c.v ? ' selected' : ''}>${htm(o)}</option>`).join('')}</select></div>`;
    const tipo = c.t === 'data' ? 'date' : (c.t === 'moeda' || c.t === 'numero' ? 'number' : 'text');
    return `<div class="campo ${c.largo ? 'largo' : ''}"><label>${htm(c.r)}</label>
      <input id="${id}" type="${tipo}" ${c.t === 'moeda' ? 'step="0.01" min="0"' : ''}
        ${c.dica ? `placeholder="${htm(c.dica)}"` : ''} value="${htm(c.v == null ? '' : String(c.v))}"></div>`;
  }).join('');
  document.getElementById('modal-erro').style.display = 'none';
  const b = document.getElementById('btn-salvar');
  b.textContent = textoBotao || 'Confirmar';
  b.setAttribute('onclick', 'confirmarAcao()');
  b.disabled = false;
  document.getElementById('modal').classList.add('aberto');
}

function valorAcao(n) {
  const el = document.getElementById('ac-' + n);
  if (!el) return null;
  const v = String(el.value || '').trim();
  return v === '' ? null : v;
}

async function confirmarAcao() {
  const b = document.getElementById('btn-salvar');
  b.disabled = true;
  try {
    await acaoAtual();
    fecharModal();
    await carregarFicha();
  } catch (e) {
    // A mensagem do banco já vem em português — as travas foram escritas
    // para serem lidas por gente, não por programador.
    alerta(e.message || String(e));
  } finally {
    b.disabled = false;
  }
}

function erroSe(cond, msg) { if (cond) throw new Error(msg); }

/** Aviso simples na janela, quando algo impede a ação de começar. */
function avisar(titulo, msg) {
  acaoAtual = async () => {};
  document.getElementById('modal-titulo').textContent = titulo;
  document.getElementById('modal-campos').innerHTML =
    `<div class="campo largo" style="font-size:14px;line-height:1.6">${htm(msg)}</div>`;
  document.getElementById('modal-erro').style.display = 'none';
  const b = document.getElementById('btn-salvar');
  b.textContent = 'Entendi';
  b.setAttribute('onclick', 'fecharModal()');
  b.disabled = false;
  document.getElementById('modal').classList.add('aberto');
}

/**
 * BLINDAGEM DAS AÇÕES (lição do M24, aplicada de propósito).
 *
 * As funções abaixo são `async` e são chamadas direto do onclick. Se uma
 * delas lançar — apólice sem seguradora, banco fora do ar, permissão —
 * o erro viraria uma PROMESSA REJEITADA sem tratamento: o clique morre
 * em silêncio e a pessoa acha que o botão está quebrado. Foi assim que o
 * cadastro de imóvel parou de salvar sem dar mensagem.
 *
 * `protegida()` envolve cada uma e transforma qualquer erro em aviso na
 * tela. Nenhuma ação nova pode ser ligada a um onclick sem passar por
 * aqui.
 */
function protegida(fn, titulo) {
  return async function (...args) {
    try { await fn.apply(null, args); }
    catch (e) { avisar(titulo || 'Não foi possível continuar', e.message || String(e)); }
  };
}

// --- apólice ------------------------------------------------
// --- corrigir apólice ---------------------------------------
// EXISTE POR UM DEFEITO DE ORIGEM, e vale escrever aqui por quê.
//
// Na importação de 29/07 a planilha não tinha as datas reais das
// apólices — só o aniversário do contrato. Eu preenchi `fim_vigencia`
// com essa data e `inicio_vigencia` com ela menos 12 meses, deixando o
// aviso no campo de observações. Ou seja: as 64 apólices do CRM têm
// vigência ESTIMADA, e o alerta de renovação toca no dia do contrato, não
// no dia da apólice. Imóvel sem cobertura por diferença de datas é
// exatamente o risco que o alerta deveria eliminar.
//
// Havia botão de Renovar e de Acionar, e nenhum de corrigir — para um
// dado que precisa ser conferido 64 vezes, isso era desenho errado.
//
// A SEGURADORA É UM SELETOR, não um campo livre, de propósito: os prazos
// por seguradora são achados comparando o NOME da apólice com o nome do
// cadastro. Nome digitado à mão ("Porto" x "Porto Seguro") não casa, e a
// sugestão de prazo falha em silêncio na hora de abrir um sinistro.
function _abrirEditarApolice(id) {
  const a = relacionados.find(x => x.id === id);
  if (!a) return;
  abrirAcao(`Corrigir apólice de ${a.tipo}`, [
    ...(seguradorasFicha.length
      ? [{ n: 'seguradora', r: 'Seguradora', t: 'select', largo: true,
           op: [''].concat(seguradorasFicha.map(x => x.nome)), v: a.seguradora || '' }]
      : [{ n: 'seguradora', r: 'Seguradora', t: 'texto', largo: true, v: a.seguradora,
           dica: 'cadastre as seguradoras em ⚙ → Seguradoras para ligar os prazos' }]),
    { n: 'apolice', r: 'Número da apólice', t: 'texto', v: a.apolice,
      dica: 'como está no documento' },
    { n: 'plano', r: 'Plano', t: 'texto', v: a.plano },
    { n: 'inicio', r: 'Início da vigência', t: 'data', v: a.inicio_vigencia },
    { n: 'fim', r: 'Fim da vigência', t: 'data', v: a.fim_vigencia,
      dica: 'a data que está NA APÓLICE' },
    { n: 'mensal', r: 'Valor mensal (R$)', t: 'moeda', v: a.valor_mensal },
    { n: 'parcela', r: 'Valor da parcela (R$)', t: 'moeda', v: a.valor_parcela },
    { n: 'parcelas', r: 'Nº de parcelas', t: 'numero', v: a.parcelas },
    { n: 'status', r: 'Situação', t: 'select', v: a.status,
      op: ['Vigente', 'A renovar', 'Renovada', 'Encerrada', 'Cancelada'] },
    { n: 'obs', r: 'Observações', t: 'textarea', largo: true,
      v: /Importado da planilha/i.test(a.observacoes || '') ? '' : a.observacoes }
  ], async () => {
    const inicio = valorAcao('inicio'), fim = valorAcao('fim');
    // Duas conferências que o banco não faz e o olho deixa passar.
    if (inicio && fim && fim <= inicio)
      throw new Error('O fim da vigência tem que ser depois do início.');
    if (!fim)
      throw new Error('Sem o fim da vigência não há alerta de renovação — é o dado mais importante desta janela.');

    const { error } = await sb.from('contrato_seguros').update({
      seguradora: valorAcao('seguradora'),
      apolice: valorAcao('apolice'),
      plano: valorAcao('plano'),
      inicio_vigencia: inicio,
      fim_vigencia: fim,
      valor_mensal: valorAcao('mensal'),
      valor_parcela: valorAcao('parcela'),
      parcelas: valorAcao('parcelas'),
      status: valorAcao('status'),
      // Apaga o aviso de "vigência estimada": a partir de agora o dado
      // foi conferido por uma pessoa com a apólice na mão.
      observacoes: valorAcao('obs')
    }).eq('id', id);
    if (error) throw error;
  }, '✎ Salvar correção');
}

function _abrirRenovarApolice(id) {
  const a = relacionados.find(x => x.id === id);
  if (!a) return;
  const proximo = a.fim_vigencia
    ? new Date(new Date(a.fim_vigencia + 'T12:00:00').getTime() + 86400000).toISOString().slice(0, 10) : '';
  abrirAcao(`Renovar apólice de ${a.tipo}`, [
    { n: 'apolice', r: 'Número da nova apólice', t: 'texto', v: a.apolice, dica: 'deixe igual se a seguradora manteve' },
    ...(seguradorasFicha.length
      ? [{ n: 'seguradora', r: 'Seguradora', t: 'select', largo: true,
           op: [''].concat(seguradorasFicha.map(x => x.nome)), v: a.seguradora || '' }]
      : []),
    { n: 'inicio', r: 'Início da nova vigência', t: 'data', v: proximo },
    { n: 'fim', r: 'Fim da vigência', t: 'data', dica: 'em branco = 12 meses' },
    { n: 'mensal', r: 'Valor mensal (R$)', t: 'moeda', v: a.valor_mensal },
    { n: 'parcela', r: 'Valor da parcela (R$)', t: 'moeda', v: a.valor_parcela },
    { n: 'parcelas', r: 'Nº de parcelas', t: 'numero', v: a.parcelas }
  ], async () => {
    const { error } = await sb.rpc('contrato_renovar_seguro', {
      p_seguro_id: id, p_inicio: valorAcao('inicio'), p_fim: valorAcao('fim'),
      p_apolice: valorAcao('apolice'),
      p_valor_mensal: valorAcao('mensal'), p_valor_parcela: valorAcao('parcela'),
      p_parcelas: valorAcao('parcelas')
    });
    if (error) throw error;
  }, '↻ Renovar');
}

// --- reajuste -----------------------------------------------
function _abrirReajuste() {
  abrirAcao('Aplicar reajuste do aluguel', [
    { n: 'novo', r: 'Novo valor do aluguel (R$)', t: 'moeda', dica: `atual: ${registro.valor_aluguel}` },
    { n: 'pct', r: 'Percentual aplicado (%)', t: 'numero', dica: 'ex.: 5,32 — opcional' },
    { n: 'quando', r: 'Aplicado em', t: 'data', v: hojeISO() },
    { n: 'obs', r: 'Observação', t: 'textarea', largo: true }
  ], async () => {
    const novo = valorAcao('novo');
    erroSe(!novo, 'Informe o novo valor do aluguel.');
    const pct = valorAcao('pct');
    const { error } = await sb.rpc('contrato_aplicar_reajuste', {
      p_contrato_id: ID, p_valor_novo: Number(novo),
      p_percentual: pct ? Number(pct) / 100 : null,
      p_aplicado_em: valorAcao('quando'), p_observacao: valorAcao('obs')
    });
    if (error) throw error;
  }, '＄ Aplicar');
}

// --- sinistros ----------------------------------------------
/** Busca no cadastro os prazos daquela seguradora + tipo e devolve as
 *  datas já calculadas. Sem cadastro, devolve vazio — e a tela pede as
 *  datas na mão, como antes. Nunca impõe: tudo aparece editável. */
async function sugerirPrazos(seguradora, tipo, dataFato) {
  if (!seguradora) return null;
  const { data, error } = await sb.rpc('prazos_sugeridos', {
    p_seguradora: seguradora, p_tipo: tipo, p_data_fato: dataFato || hojeISO()
  });
  if (error || !data || !data.length) return null;
  return data[0];
}

async function _abrirNovoSinistro(seguroId) {
  const vigentes = relacionados.filter(a => a.status === 'Vigente');
  erroSe(!vigentes.length, 'Não há apólice vigente para acionar.');
  const escolhida = seguroId || vigentes[0].id;
  const ap0 = vigentes.find(a => a.id === escolhida) || {};
  const tipoSugerido = ap0.tipo === 'Incêndio' ? 'Incêndio' : 'Inadimplência';
  // já chega com os prazos daquela seguradora, se houver cadastro
  const sug = await sugerirPrazos(ap0.seguradora, tipoSugerido, hojeISO());
  abrirAcao('Acionar o seguro', [
    { n: 'seguro', r: 'Apólice', t: 'select', largo: true,
      op: vigentes.map(a => `${a.tipo}${a.apolice ? ' · ' + a.apolice : ''}`),
      v: (() => { const a = vigentes.find(x => x.id === escolhida);
                  return a ? `${a.tipo}${a.apolice ? ' · ' + a.apolice : ''}` : ''; })() },
    { n: 'tipo', r: 'Tipo de sinistro', t: 'select', v: tipoSugerido,
      op: (typeof TIPOS_SINISTRO !== 'undefined' ? TIPOS_SINISTRO.slice() : ['Outro']) },
    { n: 'fato', r: 'Data do fato', t: 'data', v: hojeISO() },
    { n: 'prazoabrir', r: 'Prazo para comunicar à seguradora', t: 'data',
      v: sug ? sug.prazo_para_abrir : null,
      dica: sug ? 'sugerido pelo cadastro da seguradora — confira'
                : 'está nas condições gerais da apólice' },
    { n: 'prazoretorno', r: 'Prazo de retorno da seguradora', t: 'data',
      v: sug ? sug.prazo_retorno : null,
      dica: sug ? 'sugerido pelo cadastro' : 'até quando ela deve responder' },
    { n: 'pleiteado', r: 'Valor pleiteado (R$)', t: 'moeda' },
    { n: 'meses', r: 'Meses de aluguel cobertos', t: 'numero' },
    { n: 'obs', r: 'Observações', t: 'textarea', largo: true }
  ], async () => {
    const rotulo = valorAcao('seguro');
    const ap = vigentes.find(a => `${a.tipo}${a.apolice ? ' · ' + a.apolice : ''}` === rotulo);
    const { error } = await sb.from('contrato_sinistros').insert({
      contrato_id: ID, seguro_id: ap ? ap.id : null,
      tipo: valorAcao('tipo'), data_fato: valorAcao('fato'),
      prazo_para_abrir: valorAcao('prazoabrir'),
      prazo_retorno: valorAcao('prazoretorno'),
      valor_pleiteado: valorAcao('pleiteado'),
      meses_cobertos: valorAcao('meses'),
      observacoes: valorAcao('obs')
    });
    if (error) throw error;
  }, '⚠ Abrir sinistro');
}

async function _abrirExigencia(sinistroId) {
  const s = sinistrosFicha.find(x => x.id === sinistroId) || {};
  const sug = await sugerirPrazos(s.seguradora, s.tipo, hojeISO());
  const prazoPadrao = sug && sug.dias_exigencia
    ? new Date(Date.now() + sug.dias_exigencia * 86400000).toISOString().slice(0, 10) : null;
  abrirAcao('Registrar exigência da seguradora', [
    { n: 'desc', r: 'O que a seguradora está pedindo', t: 'textarea', largo: true },
    { n: 'prazo', r: 'Prazo para cumprir', t: 'data', v: prazoPadrao,
      dica: prazoPadrao ? 'prazo padrão do cadastro — corrija se ela deu outro' : 'obrigatório' },
    { n: 'quem', r: 'Com quem está a bola', t: 'select', op: ['Nós', 'Seguradora'], v: 'Nós' }
  ], async () => {
    const d = valorAcao('desc'), p = valorAcao('prazo');
    erroSe(!d, 'Escreva o que está sendo exigido.');
    erroSe(!p, 'Toda exigência precisa de prazo — é o que impede o sinistro de ser arquivado por silêncio.');
    const { error } = await sb.rpc('sinistro_registrar_exigencia', {
      p_sinistro_id: sinistroId, p_descricao: d, p_prazo: p, p_de_quem: valorAcao('quem')
    });
    if (error) throw error;
  }, 'Registrar');
}

function _cumprirExigencia(andamentoId) {
  abrirAcao('Cumprir exigência', [
    { n: 'quando', r: 'Cumprida em', t: 'data', v: hojeISO() },
    { n: 'obs', r: 'Como foi enviado (opcional)', t: 'textarea', largo: true,
      dica: 'ex.: por e-mail, protocolo 123' }
  ], async () => {
    const { error } = await sb.rpc('sinistro_cumprir_exigencia', {
      p_andamento_id: andamentoId, p_quando: valorAcao('quando'), p_observacao: valorAcao('obs')
    });
    if (error) throw error;
  }, '✓ Cumpri');
}

async function _abrirDeferir(sinistroId) {
  const s = sinistrosFicha.find(x => x.id === sinistroId) || {};
  const sug = await sugerirPrazos(s.seguradora, s.tipo, hojeISO());
  const previsaoPadrao = sug && sug.dias_pagamento
    ? new Date(Date.now() + sug.dias_pagamento * 86400000).toISOString().slice(0, 10) : null;
  abrirAcao('A seguradora deferiu', [
    { n: 'valor', r: 'Valor deferido (R$)', t: 'moeda', v: s.valor_pleiteado,
      dica: 'o que ela aceitou pagar' },
    { n: 'previsao', r: 'Data prevista do pagamento', t: 'data', v: previsaoPadrao,
      dica: previsaoPadrao ? 'prazo padrão do cadastro — corrija se ela marcou outra' : '' },
    { n: 'obs', r: 'Observação', t: 'textarea', largo: true,
      dica: 'ex.: recusou o 3º mês por estar fora da cobertura' }
  ], async () => {
    const v = valorAcao('valor');
    erroSe(!v, 'Informe o valor que a seguradora aceitou.');
    const { error } = await sb.rpc('sinistro_deferir', {
      p_sinistro_id: sinistroId, p_valor_deferido: Number(v),
      p_previsao_pagamento: valorAcao('previsao'), p_observacao: valorAcao('obs')
    });
    if (error) throw error;
  }, '✓ Deferido');
}

function _abrirRecebimento(sinistroId) {
  const s = sinistrosFicha.find(x => x.id === sinistroId) || {};
  abrirAcao('Registrar a indenização recebida', [
    { n: 'valor', r: 'Valor que caiu na conta (R$)', t: 'moeda', v: s.valor_deferido },
    { n: 'quando', r: 'Recebido em', t: 'data', v: hojeISO() }
  ], async () => {
    const v = valorAcao('valor');
    erroSe(!v, 'Informe o valor recebido.');
    const { error } = await sb.rpc('sinistro_registrar_recebimento', {
      p_sinistro_id: sinistroId, p_valor: Number(v), p_quando: valorAcao('quando')
    });
    if (error) throw error;
  }, '💰 Registrar');
}

// ------------------------------------------------------------
// EXCLUSÃO DO REGISTRO (v1.101; Lead entrou na v1.116) — Contato,
// Imóvel e Lead, e só SEM vínculos.
//
// Regra de desenho: excluir de verdade é para cadastro que nunca
// aconteceu — teste, duplicata, erro de digitação. Registro com história
// não se apaga: contato se inativa pelo campo Status; lead se marca como
// Perdido; imóvel terá o módulo Inativar. A planilha permitia apagar
// linha com história, e foi assim que ela perdeu a dela.
//
// A confirmação é DENTRO da página, nunca no confirm() do navegador —
// que pode ser suprimido e responder "não" em silêncio (lição do M24).
// ------------------------------------------------------------
async function vinculosDoRegistro() {
  // head:true só conta, não traz linha nenhuma — barato até em tabela grande
  const conta = async (rotulo, tabela, filtro) => {
    try {
      const { count, error } = await filtro(
        sb.from(tabela).select('id', { count: 'exact', head: true }));
      if (error) throw error;
      return { rotulo, n: count || 0 };
    } catch (e) {
      return { rotulo, n: null };   // não consegui conferir — trato como impedimento
    }
  };
  const checagens = (ALVO === 'contato') ? [
    conta('imóvel(is) como proprietário ou inquilino', 'imoveis',
      q => q.or(`proprietario_id.eq.${ID},inquilino_id.eq.${ID}`)),
    conta('caso(s) como prestador ou solicitante', 'casos',
      q => q.or(`prestador_id.eq.${ID},solicitante_id.eq.${ID}`)),
    conta('lead(s) convertido(s) neste contato', 'leads', q => q.eq('contato_id', ID)),
    conta('comissão(ões) como parceiro', 'comissoes', q => q.eq('parceiro_id', ID)),
    conta('tarefa(s) no histórico', 'tarefas', q => q.eq('contato_id', ID))
  ] : (ALVO === 'lead') ? [
    // LEAD (v1.116). O que impede apagar é HISTÓRIA: lead que já virou
    // contato, simulação pedida, imóvel trabalhado, contato concluído.
    //
    // Tarefa de follow-up ABERTA de propósito NÃO entra nesta lista: ela é
    // agenda que a régua de captação cria sozinha (v1.114), então todo lead
    // Proprietário teria uma e o botão nunca serviria para o que ele existe
    // — apagar o cadastro errado. Ela é removida junto, e a confirmação diz
    // quantas são antes de qualquer coisa ser apagada.
    conta('conversão em contato (este lead já virou cadastro)', 'leads',
      q => q.eq('id', ID).not('contato_id', 'is', null)),
    conta('simulação(ões) de seguro', 'simulacoes', q => q.eq('lead_id', ID)),
    conta('imóvel(is) no interesse', 'lead_imoveis', q => q.eq('lead_id', ID)),
    conta('contato(s) já registrado(s) — ligação ou visita concluída', 'tarefas',
      q => q.eq('lead_id', ID).eq('status', 'Concluída'))
  ] : [
    conta('caso(s) do imóvel (manutenção/vistoria)', 'casos', q => q.eq('imovel_id', ID)),
    conta('lead(s) com este imóvel no interesse', 'lead_imoveis', q => q.eq('imovel_id', ID)),
    conta('tarefa(s) no histórico', 'tarefas', q => q.eq('imovel_id', ID))
  ];
  const resultados = await Promise.all(checagens);

  // O que vai ser apagado JUNTO: não impede, mas ninguém pode ser
  // surpreendido por isso depois. Se a contagem falhar, cai em `incerto`
  // e nada é excluído — mesma regra dos impedimentos.
  const avisos = [];
  if (ALVO === 'lead') {
    const abertas = await conta('tarefa(s) de follow-up em aberto', 'tarefas',
      q => q.eq('lead_id', ID).neq('status', 'Concluída'));
    resultados.push({ rotulo: abertas.rotulo, n: abertas.n === null ? null : 0 });
    if (abertas.n > 0) avisos.push(`${abertas.n} ${abertas.rotulo}`);
  }

  return {
    impedimentos: resultados.filter(r => r.n > 0).map(r => `${r.n} ${r.rotulo}`),
    incerto: resultados.some(r => r.n === null),
    avisos
  };
}

function faixaExcluirHtml(conteudo) {
  const f = document.getElementById('faixa-excluir');
  if (!f) return;
  f.innerHTML = conteudo;
  f.style.display = conteudo ? 'block' : 'none';
}

async function pedirExcluirRegistro() {
  const b = document.getElementById('btn-excluir');
  if (b) b.disabled = true;
  faixaExcluirHtml('Conferindo os vínculos deste registro…');
  const { impedimentos, incerto, avisos } = await vinculosDoRegistro();
  if (b) b.disabled = false;

  if (incerto) {
    faixaExcluirHtml(`<b>Não consegui conferir todos os vínculos</b> — por segurança,
      nada foi excluído. Tente de novo; persistindo, verifique sua conexão.
      <button class="btn btn-claro" onclick="faixaExcluirHtml('')">Fechar</button>`);
    return;
  }
  if (impedimentos.length) {
    faixaExcluirHtml(`<b>Este registro tem história e não pode ser excluído:</b>
      <ul>${impedimentos.map(i => '<li>' + htm(i) + '</li>').join('')}</ul>
      Registro com história se inativa, não se apaga${ALVO === 'contato'
        ? ' — mude o <b>Status</b> para Inativo na edição'
        : (ALVO === 'lead'
          ? ' — marque a <b>Etapa do funil</b> como Perdido, com o motivo' : '')}.
      <button class="btn btn-claro" onclick="faixaExcluirHtml('')">Fechar</button>`);
    return;
  }
  faixaExcluirHtml(`<b>Excluir definitivamente ${htm(DEF.titulo(registro))}?</b>
    ${(avisos && avisos.length)
      ? `Isto também apaga: ${htm(avisos.join(', '))}.`
      : 'Nenhum vínculo encontrado.'} Esta ação não tem volta.
    <button class="btn btn-perigo" onclick="excluirRegistro()">Excluir de vez</button>
    <button class="btn btn-claro" onclick="faixaExcluirHtml('')">Cancelar</button>`);
}

async function excluirRegistro() {
  faixaExcluirHtml('Excluindo…');

  // Lead (v1.116): as tarefas de follow-up em aberto saem primeiro. Elas
  // não são história (a régua de captação as cria sozinha) e a confirmação
  // já avisou quantas são. Isto vale tanto se a chave estrangeira recusar a
  // exclusão do lead quanto se ela permitir — no segundo caso, sem esta
  // limpeza sobrariam tarefas apontando para um lead que não existe mais.
  if (ALVO === 'lead') {
    const { error: eTar } = await sb.from('tarefas').delete()
      .eq('lead_id', ID).neq('status', 'Concluída');
    if (eTar) {
      faixaExcluirHtml(htm('Não foi possível remover as tarefas de follow-up: ' +
        eTar.message + ' — nada foi excluído.') +
        ` <button class="btn btn-claro" onclick="faixaExcluirHtml('')">Fechar</button>`);
      return;
    }
  }

  const { error } = await sb.from(DEF.tabela).delete().eq('id', ID);
  if (error) {
    // 23503 = o banco achou um vínculo que a tela não conhece. Melhor
    // mensagem honesta do que o inglês cru do Postgres.
    const msg = String(error.code) === '23503'
      ? 'O banco encontrou um vínculo que a tela não conhece — nada foi excluído. Me avise qual registro é este.'
      : 'Não foi possível excluir: ' + error.message;
    faixaExcluirHtml(htm(msg) +
      ` <button class="btn btn-claro" onclick="faixaExcluirHtml('')">Fechar</button>`);
    return;
  }
  window.location.href = DEF.lista;
}

// ------------------------------------------------------------
// 5) MODAL GENÉRICO — o mesmo motor edita o registro e as tarefas
// ------------------------------------------------------------
let modalDef = null, modalId = null, modalExtra = null, modalDepois = null;

function campoHtml(c) {
  const nome = 'mf-' + c.c;
  if (c.t === 'check') return `
    <div class="campo largo" style="flex-direction:row;align-items:center;gap:8px">
      <input type="checkbox" id="${nome}" style="width:auto">
      <label for="${nome}" style="font-size:14px;color:var(--texto)">${htm(c.r)}</label></div>`;
  let campo;
  if (c.t === 'multi') {
    // lista de múltipla escolha: caixinhas, porque um <select multiple>
    // no celular é praticamente inusável
    campo = `<div class="flt-multi" id="${nome}">${(c.op || []).map(o =>
      `<label><input type="checkbox" value="${htm(o)}"> ${htm(o)}</label>`).join('')}</div>`;
  }
  else if (c.t === 'textarea') campo = `<textarea id="${nome}"></textarea>`;
  else if (c.t === 'select') campo = `<select id="${nome}">${c.op.map(o =>
      `<option value="${htm(o)}">${htm(o)}</option>`).join('')}</select>`;
  else if (c.t === 'ref') campo = `<select id="${nome}"><option value=""></option>${listaContatos.map(p =>
      `<option value="${p.id}">${htm(p.nome)} (${htm(p.codigo || '')})</option>`).join('')}</select>`;
  else if (c.t === 'refimovel') campo = `<select id="${nome}"><option value=""></option>${listaImoveis.map(i =>
      `<option value="${i.id}">${htm(i.endereco)} (${htm(i.codigo || '')})</option>`).join('')}</select>`;
  else {
    const tipo = { data: 'date', datahora: 'datetime-local', numero: 'number',
      moeda: 'number', percentual: 'number',
      email: 'email', tel: 'text', doc: 'text', cep: 'text', uf: 'text' }[c.t] || 'text';
    const passo = (c.t === 'moeda' || c.t === 'numero' || c.t === 'percentual')
      ? ' step="0.01"' : '';
    campo = `<input id="${nome}" type="${tipo}"${passo}>`;
  }
  // A ajuda virou ÍCONE ao lado do rótulo, em 26/07/2026.
  // Como texto solto embaixo do campo, uma explicação de três linhas
  // (a regra do piso da taxa) empurrava o formulário e virava ruído em
  // quem já sabe. No ícone, ela aparece quando a pessoa procura.
  const dica = '';
  const ajudaIcone = c.ajuda
    ? `<button type="button" class="campo-ajuda" aria-label="O que é isto?"
         title="${htm(c.ajuda)}" onclick="mostrarAjuda(this)"
         data-ajuda="${htm(c.ajuda)}">i</button>` : '';
  return `<div class="campo ${c.largo ? 'largo' : ''}">
    <label>${htm(c.r)}${c.obrig ? ' *' : ''}${ajudaIcone}</label>${campo}${dica}</div>`;
}

function abrirModal(def, titulo, dados, extra, depois) {
  modalDef = def; modalId = dados && dados.id ? dados.id : null;
  modalExtra = extra || {}; modalDepois = depois;
  document.getElementById('modal-titulo').textContent = titulo;
  document.getElementById('modal-campos').innerHTML = def.campos.map(campoHtml).join('');
  def.campos.forEach(c => {
    const el = document.getElementById('mf-' + c.c);
    if (!el) return;
    const v = (typeof valorDoRegistro === 'function' && c.pers)
      ? valorDoRegistro(dados, c) : (dados ? dados[c.c] : null);
    if (c.t === 'multi') {
      const marcados = Array.isArray(v) ? v : [];
      el.querySelectorAll('input').forEach(i => { i.checked = marcados.indexOf(i.value) > -1; });
      return;
    }
    if (c.t === 'check') el.checked = !!v;
    else if (c.t === 'datahora') el.value = v ? String(v).slice(0, 16) : '';
    // PERCENTUAL: o banco guarda fração (0.10) e a pessoa lê porcentagem (10).
    // Sem esta linha o campo mostrava "0,1" e, ao salvar, gravava 0.001.
    // `parseFloat(toFixed(4))` evita o lixo de ponto flutuante: 0.07*100 dá
    // 7.000000000000001 em JavaScript, e o campo mostraria isso.
    else if (c.t === 'percentual')
      el.value = (v === null || v === undefined || v === '')
        ? '' : parseFloat((Number(v) * 100).toFixed(4));
    else el.value = (v === null || v === undefined) ? '' : v;
    // campos com pontuação automática (CPF/CNPJ, telefone, CEP)
    if (c.t === 'doc' || c.t === 'tel' || c.t === 'cep') ligarMascara(el, c.t);
  });
  document.getElementById('modal-erro').style.display = 'none';
  document.getElementById('modal').classList.add('aberto');
}
/**
 * Mostra a explicação de um campo.
 *
 * Em vez de balão flutuante: um bloco que empurra o conteúdo. Balão
 * posicionado com JS erra a posição dentro de modal com rolagem, e no
 * celular fica meio fora da tela. O bloco sempre cabe.
 */
function mostrarAjuda(botao) {
  const label = botao.parentElement;
  const jaAberto = label.parentElement.querySelector('.campo-ajuda-texto');
  if (jaAberto) { jaAberto.remove(); botao.classList.remove('aberto'); return; }
  // uma ajuda aberta por vez: duas explicações longas na tela viram parede
  document.querySelectorAll('.campo-ajuda-texto').forEach(x => x.remove());
  document.querySelectorAll('.campo-ajuda.aberto').forEach(x => x.classList.remove('aberto'));
  const bloco = document.createElement('div');
  bloco.className = 'campo-ajuda-texto';
  bloco.textContent = botao.dataset.ajuda || '';
  label.insertAdjacentElement('afterend', bloco);
  botao.classList.add('aberto');
}

function fecharModal() { document.getElementById('modal').classList.remove('aberto'); }

/**
 * (Lead, v1.118) Põe no select de etapa só as etapas do funil daquele
 * tipo de lead. Chamada antes de desenhar a ficha e antes de abrir a
 * janela de edição — os dois lugares onde a lista é lida.
 */
function ajustarEtapasDaFicha() {
  if (ALVO !== 'lead' || !registro || typeof etapasDoFunil !== 'function') return;
  const c = ((DEFS.lead.campos) || []).find(x => x.c === 'status');
  const etapas = etapasDoFunil(registro.tipo_lead || 'Inquilino');
  if (c && etapas.length) {
    // a etapa ATUAL entra mesmo se tiver sido desativada no cadastro,
    // senão abrir a janela trocaria o valor sem ninguém pedir
    c.op = etapas.includes(registro.status) || !registro.status
      ? etapas : [registro.status].concat(etapas);
  }
}

function editarRegistro() {
  ajustarEtapasDaFicha();
  abrirModal(DEF, `Editar ${registro.codigo || ''}`.trim(), registro, {}, async () => {
    const { data } = await sb.from(DEF.tabela).select('*').eq('id', ID).single();
    if (data) registro = data;
    desenharFicha();
  });
  // trocar o tipo de lead na própria janela troca as etapas oferecidas
  const selTipo = document.getElementById('mf-tipo_lead');
  const selEtapa = document.getElementById('mf-status');
  if (selTipo && selEtapa) {
    selTipo.addEventListener('change', () => {
      const novas = etapasDoFunil(selTipo.value);
      const atual = selEtapa.value;
      selEtapa.innerHTML = novas.map(o =>
        `<option value="${htm(o)}"${o === atual ? ' selected' : ''}>${htm(o)}</option>`).join('');
    });
  }
}
function novaTarefa() {
  const base = { tipo: 'Tarefa', prioridade: 'Normal', responsavel_email: sessaoEmail };
  abrirModal(DEFS.tarefa, 'Nova tarefa', base, vinculo(), recarregarTarefas);
}
function registrarLigacao() {
  const base = { tipo: 'Ligação', prioridade: 'Normal', responsavel_email: sessaoEmail,
    vencimento: hojeISO(), _feita: true,
    assunto: 'Ligação para ' + DEF.titulo(registro) };
  abrirModal(DEFS.tarefa, 'Registrar ligação', base, vinculo(), recarregarTarefas);
}
function editarTarefa(id) {
  const t = tarefasFicha.find(x => x.id === id);
  if (!t) return;
  abrirModal(DEFS.tarefa, `Editar ${t.codigo || 'tarefa'}`,
    { ...t, _feita: t.status === 'Concluída' }, vinculo(), recarregarTarefas);
}
/** Vínculo automático: a tarefa nasce amarrada ao registro que está aberto. */
function vinculo() {
  return { [DEF.fk]: ID };
}

async function salvarModal() {
  const erro = document.getElementById('modal-erro');
  erro.style.display = 'none';
  const linha = { ...modalExtra };
  // campo personalizado não é coluna: vai todo junto numa caixinha só.
  // Parte do que já estava lá (pode haver campo na lixeira com dado
  // guardado), para não apagar nada sem querer.
  let caixa = null;
  const temPers = modalDef.campos.some(c => c.pers);
  if (temPers) caixa = Object.assign({}, (registro && registro.personalizados) || {});

  for (const c of modalDef.campos) {
    if (c.c.startsWith('_')) continue;
    const el = document.getElementById('mf-' + c.c);
    if (!el) continue;

    if (c.pers) {
      let pv;
      if (c.t === 'multi') {
        const m = [...el.querySelectorAll('input:checked')].map(i => i.value);
        pv = m.length ? m : null;
      } else if (c.t === 'check') {
        pv = el.checked;
      } else {
        const bruto = String(el.value || '').trim();
        if (bruto === '') pv = null;
        else if (c.t === 'numero' || c.t === 'moeda') pv = Number(bruto.replace(',', '.'));
        else if (c.t === 'percentual') pv = Number(bruto.replace(',', '.')) / 100;
        else if (c.t === 'datahora') pv = new Date(bruto).toISOString();
        else pv = bruto;
      }
      if (c.obrig && (pv === null || pv === '' || pv === false)) {
        erro.textContent = `O campo "${c.r}" é obrigatório.`;
        erro.style.display = 'block'; return;
      }
      if (pv === null) delete caixa[c.pers]; else caixa[c.pers] = pv;
      continue;
    }
    // caixa de seleção (sim/não) grava true/false — não o texto "on"
    if (c.t === 'check') { linha[c.c] = el.checked; continue; }
    let v = el.value;
    if (typeof v === 'string') v = v.trim();
    // pontuação é só da tela: no banco vai só número
    if (c.t === 'doc' || c.t === 'tel' || c.t === 'cep') v = soDigitos(v);
    else if (c.t === 'uf') v = soLetrasUF(v);
    else if (c.alta) v = padrao(v);
    if (c.obrig && !v) {
      erro.textContent = `O campo "${c.r}" é obrigatório.`;
      erro.style.display = 'block'; return;
    }
    if (c.t === 'numero' || c.t === 'moeda') v = v === '' ? null : Number(v);
    // PERCENTUAL: o banco guarda FRAÇÃO (0.10 = 10%) e a pessoa digita 10.
    // O imoveis.js sempre converteu nos dois sentidos; o ficha.js, que monta
    // esta tela, nunca converteu. Resultado: o campo mostrava "0,1" e, ao
    // salvar, gravava 0.1/100 = 0.001 — a taxa de 10% virava 0,1%, e o
    // imóvel passava a render R$ 1 por mês em vez de R$ 100.
    // Defeito antigo, encontrado em 26/07/2026 ao renomear o campo.
    else if (c.t === 'percentual') v = v === '' ? null : Number(v) / 100;
    else if (c.t === 'datahora') v = v ? new Date(v).toISOString() : null;
    else if (v === '') v = null;
    linha[c.c] = v;
  }
  if (temPers) linha.personalizados = caixa;

  // TAXA DE ADMINISTRAÇÃO: avisar ANTES de o banco recusar.
  // A trava `imoveis_taxa_adm_coerente` recusa percentual junto com valor
  // fixo, e mínimo sem percentual. Sem esta checagem, a pessoa preenche os
  // dois, clica em Salvar e recebe uma mensagem de banco em inglês.
  if ('taxa_adm_percentual' in linha || 'taxa_adm_valor' in linha
      || 'taxa_adm_minimo' in linha) {
    const pct = linha.taxa_adm_percentual, fixo = linha.taxa_adm_valor,
          min = linha.taxa_adm_minimo;
    if (pct != null && fixo != null) {
      erro.textContent = 'Preencha a taxa por PERCENTUAL ou por VALOR FIXO, não as duas. ' +
        'Se a negociação é percentual com piso, use o percentual mais a taxa mínima.';
      erro.style.display = 'block'; return;
    }
    if (min != null && pct == null) {
      erro.textContent = 'A taxa mínima é o piso de um percentual. ' +
        'Preencha também a Taxa adm. (%), ou deixe o mínimo vazio.';
      erro.style.display = 'block'; return;
    }
    // 0.5 é meio por cento: ninguém cobra isso, e é o sintoma de quem
    // digitou 0,1 achando que eram 10%.
    if (pct != null && pct > 0 && pct < 0.005) {
      erro.textContent = 'Taxa de ' + (pct * 100).toFixed(2) + '% parece baixa demais. ' +
        'Digite 10 para 10%, e não 0,1.';
      erro.style.display = 'block'; return;
    }
    if (pct != null && pct > 1) {
      erro.textContent = 'Taxa de ' + (pct * 100).toFixed(0) + '% é mais que o aluguel inteiro. ' +
        'Confira o valor.';
      erro.style.display = 'block'; return;
    }
  }

  // TAXA DE CONTRATO: a escala mudou em 26/07/2026.
  // O campo passou a ser percentual (100 = um aluguel inteiro) em vez de
  // multiplicador (1 = um aluguel). Quem tem o hábito antigo digita 1 e
  // grava 1% — num aluguel de R$ 1.000, R$ 10 em vez de R$ 1.000.
  //
  // NÃO existe mínimo praticado: a taxa é negociada caso a caso, e 20% é
  // legítimo. Por isso o aviso só dispara abaixo de 5%, que é a faixa em
  // que quase certamente alguém digitou o número velho.
  if ('taxa_locacao' in linha && linha.taxa_locacao != null) {
    const tc = linha.taxa_locacao;
    if (tc > 0 && tc < 0.05) {
      erro.textContent = 'Taxa de contrato de ' + (tc * 100).toFixed(1) + '%? ' +
        'Este campo agora é em porcentagem: digite 100 para um aluguel inteiro, ' +
        '80 para 80% dele.';
      erro.style.display = 'block'; return;
    }
    if (tc > 3) {
      erro.textContent = 'Taxa de contrato de ' + (tc * 100).toFixed(0) + '% ' +
        'equivale a ' + (tc).toFixed(1) + ' aluguéis. Confira o valor.';
      erro.style.display = 'block'; return;
    }
  }

  // regra específica das tarefas: a caixinha "já concluída" define o status
  if (modalDef === DEFS.tarefa) {
    const feita = document.getElementById('mf-_feita').checked;
    linha.status = feita ? 'Concluída' : 'Aberta';
    const antiga = tarefasFicha.find(x => x.id === modalId);
    linha.concluida_em = feita
      ? (antiga && antiga.concluida_em ? antiga.concluida_em : new Date().toISOString())
      : null;
  }

  // regra dos contatos: um CPF/CNPJ não pode estar em dois cadastros
  if (modalDef === DEFS.contato && linha.cpf_cnpj) {
    const outro = await donoDoDocumento(linha.cpf_cnpj, modalId);
    if (outro) {
      erro.innerHTML = 'Este CPF/CNPJ já está cadastrado em <b>' + htm(outro.codigo) + ' — '
        + htm(outro.nome) + '</b>. <a href="contato.html?id=' + outro.id + '">Abrir esse cadastro</a>';
      erro.style.display = 'block'; return;
    }
    if (!documentoValido(linha.cpf_cnpj) && !confirm(
      'O CPF/CNPJ digitado não passou na conferência dos dígitos — '
      + 'normalmente isso é erro de digitação.\n\nSalvar assim mesmo?')) return;
  }

  const botao = document.getElementById('btn-salvar');
  botao.disabled = true;

  try {
    if (modalId) {
      const { error } = await sb.from(modalDef.tabela).update(linha).eq('id', modalId);
      if (error) throw error;
    } else {
      if (modalDef === DEFS.tarefa) {
        await inserirTarefa(linha);
      } else {
        const { error } = await sb.from(modalDef.tabela).insert(linha);
        if (error) throw error;
      }
    }
    fecharModal();
    if (modalDepois) await modalDepois();
  } catch (e) {
    erro.textContent = 'Erro ao salvar: ' + e.message;
    erro.style.display = 'block';
  } finally {
    botao.disabled = false;
  }
}

/**
 * Procura outro contato que já tenha esse mesmo CPF/CNPJ.
 * A comparação é feita só com os números, para achar o duplicado mesmo
 * que um cadastro antigo esteja pontuado e o novo não.
 * Devolve o contato encontrado, ou null.
 */
async function donoDoDocumento(doc, ignorarId) {
  const d = soDigitos(doc);
  if (!d) return null;
  const { data } = await sb.from('contatos').select('id,codigo,nome,cpf_cnpj')
    .not('cpf_cnpj', 'is', null);
  return (data || []).find(c => c.id !== ignorarId && soDigitos(c.cpf_cnpj) === d) || null;
}

// ------------------------------------------------------------
// 5b) INSERIR TAREFA COM CÓDIGO SEGURO
// ------------------------------------------------------------
// A função proximo_codigo() do banco devolve sempre TAR-0001 para a tabela
// tarefas (funciona só para contatos/imoveis), o que estoura o índice único
// "tarefas_codigo_key". Enquanto ela não for corrigida no Supabase, o número
// é calculado aqui a partir do maior código já gravado — e, se ainda assim
// dois usuários salvarem no mesmo instante, tenta o número seguinte.
async function proximoCodigoTarefa() {
  const { data } = await sb.from('tarefas').select('codigo')
    .like('codigo', 'TAR-%').order('codigo', { ascending: false }).limit(1);
  const ultimo = (data && data[0]) ? parseInt(String(data[0].codigo).slice(4), 10) : 0;
  return (ultimo || 0) + 1;
}

async function inserirTarefa(linha) {
  let n = await proximoCodigoTarefa();
  for (let tentativa = 0; tentativa < 8; tentativa++) {
    linha.codigo = 'TAR-' + String(n + tentativa).padStart(4, '0');
    const { error } = await sb.from('tarefas').insert(linha);
    if (!error) return;
    if (!/duplicate key|tarefas_codigo_key/i.test(error.message || '')) throw error;
  }
  throw new Error('Não consegui gerar um código livre para a tarefa. Tente de novo.');
}


// As ações protegidas são publicadas AQUI, antes do bloco de
// inicialização — no fim do arquivo elas ficariam reféns de
// qualquer erro anterior, e os botões chamariam função inexistente.
window.abrirNovoSinistro = protegida(_abrirNovoSinistro, 'Não foi possível acionar o seguro');
window.abrirExigencia = protegida(_abrirExigencia, 'Não foi possível registrar a exigência');
window.abrirDeferir = protegida(_abrirDeferir, 'Não foi possível registrar o deferimento');
window.abrirRecebimento = protegida(_abrirRecebimento, 'Não foi possível registrar o recebimento');
window.abrirEditarApolice = protegida(_abrirEditarApolice, 'Não foi possível abrir a correção da apólice');
window.abrirRenovarApolice = protegida(_abrirRenovarApolice, 'Não foi possível renovar a apólice');
window.abrirReajuste = protegida(_abrirReajuste, 'Não foi possível aplicar o reajuste');
window.cumprirExigencia = protegida(_cumprirExigencia, 'Não foi possível cumprir a exigência');

// ------------------------------------------------------------
// 6) INICIALIZAÇÃO
// ------------------------------------------------------------
exigirLogin().then(s => {
  if (s) { sessaoEmail = s.user.email; carregarFicha(); }
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    document.querySelectorAll('.task-row.perguntando').forEach(l => l.classList.remove('perguntando'));
    fecharModal();
  }
});







