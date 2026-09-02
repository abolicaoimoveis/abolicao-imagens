// ============================================================
// CONFIGURAÇÃO — preencha com os dados do SEU projeto Supabase
// (Painel do Supabase → Settings → API)
// Use a chave "anon public" aqui. NUNCA a service_role.
// ============================================================
// ============================================================
// VERSÃO DO CRM — aparece no rodapé de todas as telas.
// Mesmo formato do app de vistoria: 1.100 → 1.101 → 1.102…
// Suba UMA unidade no final a cada publicação que valha registrar.
// O robô do beta acrescenta "-beta" sozinho ao publicar em crm-beta/ —
// e é esse sufixo que liga a faixa "AMBIENTE BETA" no topo.
// NUNCA escreva "-beta" aqui à mão.
// ============================================================
const CRM_VERSAO = '1.479';

const SUPABASE_URL = 'https://gcoikoeiuwaygjjwedjp.supabase.co';        // ex.: https://abcdefgh.supabase.co
const SUPABASE_ANON_KEY = 'sb_publishable_ChTppJgR6vesRWLG_9rQ5A_HZgNv6Kn';

// v1.275 — MESMO MOTIVO DO BLOCO ABAIXO, DOIS MESES DEPOIS.
//
// Na v1.225 o telefone, o e-mail e a cidade da Moralí saíram daqui e
// foram para `empresas`. O nome, a razão social e o CNPJ ficaram — e
// eram justamente os três que APARECEM: é o rodapé das telas de entrar,
// cadastrar e nova senha, as únicas que rodam antes de haver empresa
// logada. Numa instalação vendida, a corretora abria o CRM dela e lia
// "MORALÍ GESTÃO IMOBILIÁRIA LTDA · CNPJ 07.697.516/0001-86" na tela de
// login, antes mesmo de entrar.
//
// Agora estão VAZIOS, como o EMPRESA_CONTATO: é o que se vê numa
// instalação onde ninguém preencheu o cadastro ainda — e vazio é melhor
// que o CNPJ de outra empresa. Os dados de verdade vivem em `empresas`
// (Administração → Empresas) e chegam pelo PERM.empresa.
//
// As chaves continuam existindo porque três telas leem delas como valor
// de reserva (casos.js, demonstrativo.js e parcelas.js, no timbre dos
// recibos). Com string vazia, o timbre simplesmente não imprime a linha.
const EMPRESA = {
  nome: '',
  razaoSocial: '',
  cnpj: '',
  desde: ''
};

// v1.225 — SOCORRO, NÃO CADASTRO.
//
// Na v1.224 o telefone, o e-mail e a cidade da Moralí nasceram aqui.
// Durou um dia: o CRM vai ser vendido para outras imobiliárias, e dado
// de cliente dentro de arquivo de código significa a segunda
// imobiliária editando JavaScript para ter o rodapé dela.
//
// Agora tudo mora em `empresas` (Administração → Empresas), que já
// tinha telefone e email_contato e ganhou cidade e creci na v1.225.
// Estas constantes ficam VAZIAS de propósito: são o que aparece numa
// instalação onde ninguém preencheu o cadastro ainda — e vazio é
// melhor que o telefone de outra empresa.
const EMPRESA_CONTATO = {
  telefone: '',
  email: '',
  cidade: ''
};

// ============================================================
// ENTRAR COM GOOGLE — LIGADO EM 21/08/2026 (v1.338)
//
// Ficou false por meses de propósito: botão que promete o que o servidor
// ainda não cumpre é pior que botão nenhum. Agora as duas pontas existem.
//
//   1. Google Cloud Console → projeto "Morali CRM" (id morali-crm) →
//      Google Auth Platform → Clientes → "Moralí CRM (web)". Em "URIs de
//      redirecionamento autorizados" está EXATAMENTE:
//          https://gcoikoeiuwaygjjwedjp.supabase.co/auth/v1/callback
//      (é o endereço do Supabase, NÃO o crm.morali.app — quem conversa com
//       o Google é o Supabase; ele só devolve a pessoa para o CRM depois)
//
//   2. Supabase → Authentication → Providers → Google: ligado, com o
//      Client ID e o Client Secret daquele cliente.
//
// POR QUE O APP É "EXTERNO" E PUBLICADO, E NÃO "INTERNO":
// "Interno" só deixa entrar e-mail do domínio do Workspace da Moralí.
// O CRM é vendido para outras imobiliárias, e a equipe delas usa Gmail —
// "Interno" amarraria o botão do Google à nossa casa para sempre. Como o
// app só pede nome e e-mail (dado básico, nada sensível), o Google publica
// sem exigir verificação e sem a tela de "app não verificado".
//
// QUEM ENTRA COM GOOGLE NÃO GANHA ACESSO POR ISSO. O Google só prova quem
// a pessoa é. Quem autoriza continua sendo o banco: sem convite não há
// perfil, e sem perfil a tela mostra "Acesso não liberado". É a mesma
// trava que já vale para quem se cadastra com senha — e é o que deixa o
// botão ficar aberto ao mundo sem abrir o CRM para o mundo.
//
// Para desligar (incidente, troca de credencial, o que for): false aqui,
// e o botão some da tela de login na publicação seguinte.
// ============================================================
const LOGIN_GOOGLE = true;

// ============================================================
// VERIFICAÇÃO EM DUAS ETAPAS (v1.339)
//
// true  = ninguém usa o CRM sem cadastrar um aplicativo autenticador.
//         Quem entra sem ter cadastrado é levado para a tela de cadastro,
//         e a única outra saída é Sair.
// false = fica opcional: quem quiser liga pelo menu do próprio nome, e
//         quem ligou continua sendo cobrado sempre.
//
// Decisão do Rodrigo em 21/08/2026: obrigatório para todo mundo. O CRM
// guarda dado de proprietário e inquilino, e uma senha vazada bastava
// para entrar.
//
// ESTA CHAVE É SÓ A CONDUÇÃO DA TELA. A trava de verdade é `mfa_ok()`
// dentro do `posso()`, no banco (v1339-sql-3): pular a tela e chamar a
// API direto não burla. Trocar isto para false NÃO destranca ninguém —
// para isso é preciso desfazer o SQL.
//
// ORDEM QUE NÃO PODE INVERTER: publicar esta versão → todo mundo entra
// uma vez e cadastra → conferir em Administração → Usuários que ninguém
// está sem → só então rodar o v1339-sql-3. Rodar o SQL antes tranca
// todo mundo do lado de fora, inclusive quem administra.
//
// Numa venda para a segunda imobiliária isto vira coluna de `empresas`
// (cada uma decide a sua política). Hoje, com uma instalação, a chave
// aqui basta e custa uma linha.
// ============================================================
const EXIGIR_2FA = true;

// ============================================================
// ASSINATURA DO FORNECEDOR NO RODAPÉ
//
// "Desenvolvido com ♥ pela Moralí", centralizado abaixo dos dados da
// empresa logada.
//
// RESSALVA REGISTRADA EM 26/07/2026, na decisão de acrescentar isto:
// a Moralí é uma IMOBILIÁRIA, não uma empresa de software. Quando o CRM
// for vendido para outra imobiliária, essa frase mostra a marca de um
// CONCORRENTE DIRETO no rodapé de todas as telas do sistema que ela usa
// para gerir a carteira dela.
//
// Por isso a assinatura é uma chave, não código espalhado. Para desligar:
//
//     ASSINATURA.mostrar = false;            → ninguém vê
//     ASSINATURA.so_na_propria_casa = true;  → só a Moralí vê
//
// A segunda opção é a que eu escolheria: você mantém a assinatura na sua
// casa e nenhuma cliente vê marca de concorrente.
// ============================================================
const ASSINATURA = {
  mostrar: true,
  so_na_propria_casa: false,       // true = aparece só quando a empresa em foco é a Moralí
  cnpj_da_desenvolvedora: '07697516000186',
  texto_antes: 'Desenvolvido com',
  texto_depois: 'pela',
  nome: 'MORALÍ',
  logo: 'img/logo-morali.png',
  url: null,                       // se um dia houver site do produto, entra aqui

  // COMO A MARCA APARECE:
  //   'texto'  → só o nome, em navy. A linha lê como uma frase.
  //   'ambos'  → símbolo pequeno na altura da letra + nome em navy.
  //   'imagem' → só o logotipo (era assim, e ele dominava a linha).
  marca: 'texto'
};
