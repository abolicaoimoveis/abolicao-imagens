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
const CRM_VERSAO = '1.122';

const SUPABASE_URL = 'https://gcoikoeiuwaygjjwedjp.supabase.co';        // ex.: https://abcdefgh.supabase.co
const SUPABASE_ANON_KEY = 'sb_publishable_ChTppJgR6vesRWLG_9rQ5A_HZgNv6Kn';

const EMPRESA = {
  nome: 'MORALÍ',
  razaoSocial: 'MORALÍ GESTÃO IMOBILIÁRIA LTDA',
  cnpj: '07.697.516/0001-86',
  desde: '2005'
};

// ============================================================
// ENTRAR COM GOOGLE
//
// Deixe FALSE até ter feito as duas configurações abaixo. Com false, o
// botão simplesmente não aparece na tela de login — e ninguém clica numa
// promessa que o sistema ainda não cumpre.
//
//   1. Google Cloud Console → Credenciais → ID do cliente OAuth (Aplicativo
//      da Web). Em "URIs de redirecionamento autorizados", cole EXATAMENTE:
//          https://gcoikoeiuwaygjjwedjp.supabase.co/auth/v1/callback
//      (é o endereço do Supabase, NÃO o crm.morali.app — quem conversa com
//       o Google é o Supabase; ele só devolve a pessoa para o CRM depois)
//
//   2. Supabase → Authentication → Providers → Google → ligar e colar o
//      Client ID e o Client Secret gerados no passo 1.
//
// QUEM ENTRA COM GOOGLE NÃO GANHA ACESSO POR ISSO. O Google só prova quem
// a pessoa é. Quem autoriza continua sendo o banco: sem convite não há
// perfil, e sem perfil a tela mostra "Acesso não liberado". É a mesma
// trava que já vale para quem se cadastra com senha.
// ============================================================
const LOGIN_GOOGLE = false;

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
