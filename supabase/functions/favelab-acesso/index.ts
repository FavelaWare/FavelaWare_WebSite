/**
 * Edge Function: favelab-acesso
 *
 * O aluno logado no portal entra no Favelab sem novo login. Esta função confere o
 * login do portal e, se for um aluno com conta válida, devolve um token de 60 s
 * assinado (ver _shared/ssoFavelab.ts). O Favelab valida o token (função sso-portal)
 * e abre a sessão. Os dois bancos Supabase continuam separados.
 *
 * Rota:
 *   POST /favelab-acesso   (sem corpo, com login do aluno)  ->  { token }
 *
 * Quem entra e com que papel (decidirAcessoAoFavelab): aluno com turma, professor, colaborador,
 * banca e gestor. Parceiro não entra. O papel vai assinado no token e o Favelab o aplica a cada
 * acesso. Quem ainda deve trocar a senha conclui o primeiro acesso antes. Conta banida não recebe
 * token. Qualquer dúvida recusa (falha fechada).
 *
 * Segredos (npx supabase secrets set ...), nunca no repositório:
 *   FAVELAB_SSO_CHAVE_PRIVADA  chave privada Ed25519 em JWK (JSON)
 *   FAVELAB_SSO_KID            identificador da chave (o Favelab guarda a pública com esse nome)
 *   FAVELAB_SSO_ISSUER         opcional (padrão favelaware-portal; igual a PORTAL_SSO_ISSUER no Favelab)
 *   ORIGEM_PERMITIDA           opcional (ver _shared/http.ts)
 * Implantar com --no-verify-jwt: o login é conferido aqui dentro.
 */
import { clienteDoUsuario } from '../_shared/drive.ts';
import { cabecalhosCors, clienteAdmin, criarResposta, servir } from '../_shared/http.ts';
import { assinarTokenDoFavelab, decidirAcessoAoFavelab, lerChaveDoAmbiente } from '../_shared/ssoFavelab.ts';

const CORS = cabecalhosCors('POST, OPTIONS');
const resposta = criarResposta(CORS);

const SEM_ACESSO = 'Sua conta não tem acesso ao Favelab.';

servir('favelab-acesso', CORS, {
  POST: async (req) => {
    const chave = lerChaveDoAmbiente();
    if (!chave) {
      console.error('[favelab-acesso] chave de assinatura ausente ou malformada');
      return resposta(503, { erro: 'O Favelab está indisponível no momento.' });
    }

    const usuario = await clienteDoUsuario(req);
    if (!usuario) return resposta(401, { erro: 'Faça login novamente.' });
    console.log('[favelab-acesso] login conferido');

    // O perfil é lido com o login do próprio aluno: quem protege o dado é a RLS
    const { data: perfil, error } = await usuario.cliente
      .from('perfis')
      .select('papel, participante_id, precisa_trocar_senha, pode_alternar_papel')
      .eq('id', usuario.usuarioId)
      .maybeSingle();
    if (error) {
      console.error('[favelab-acesso] falha ao ler o perfil', error.code);
      return resposta(503, { erro: 'Não foi possível abrir o Favelab agora. Tente de novo.' });
    }
    const decisao = decidirAcessoAoFavelab(perfil);
    if ('recusa' in decisao) {
      console.log('[favelab-acesso] recusado:', decisao.recusa);
      return resposta(403, {
        erro:
          decisao.recusa === 'primeiro-acesso'
            ? 'Conclua o primeiro acesso no portal antes de abrir o Favelab.'
            : SEM_ACESSO,
      });
    }

    // Conta banida no Auth não recebe token (o login já foi aceito, mas o ban vale)
    const { data: conta, error: contaErr } = await clienteAdmin().auth.admin.getUserById(usuario.usuarioId);
    const banidoAte = conta?.user?.banned_until ? Date.parse(conta.user.banned_until) : 0;
    if (contaErr || !conta?.user || banidoAte > Date.now()) {
      console.log('[favelab-acesso] recusado: conta indisponível');
      return resposta(403, { erro: SEM_ACESSO });
    }

    const token = await assinarTokenDoFavelab(usuario.usuarioId, decisao.papel, chave);
    console.log('[favelab-acesso] token emitido');
    return resposta(200, { token });
  },
});
