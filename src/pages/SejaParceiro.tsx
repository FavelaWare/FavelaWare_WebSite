/**
 * ============================================
 * PÁGINA SEJA UM PARCEIRO
 * ============================================
 *
 * Formulário público para quem quer apoiar o projeto: nome, e-mail, telefone,
 * empresa e como deseja contribuir. O pedido vai para a coordenação, que lê em
 * /dashboard/parcerias.
 *
 * A caixa "Como deseja contribuir" tem tamanho fixo: não cresce com o texto e
 * a pessoa não arrasta o canto (o texto rola dentro dela).
 *
 * A página só coordena: validar e gravar é do servicoParcerias.
 */
import { useState } from 'react';

import CabecalhoDaPagina from '../components/CabecalhoDaPagina';
import Footer from '../components/Footer';
import Navbar from '../components/Navbar';
import { classeBotaoDeAcesso, classeCampoDeAcesso } from '../components/estilosDeAcesso';
import {
  servicoParcerias,
  TAMANHO_MAXIMO_CONTRIBUICAO,
  TAMANHO_MAXIMO_EMAIL,
  TAMANHO_MAXIMO_EMPRESA,
  TAMANHO_MAXIMO_NOME,
  type DadosDoPedidoDeParceria,
} from '../lib/parcerias';
import { StatusProcessamento } from '../types';

const CAMPOS_VAZIOS: DadosDoPedidoDeParceria = { nome: '', email: '', telefone: '', empresa: '', contribuicao: '' };

const classeRotulo = 'block text-sm font-medium text-gray-700 mb-2';

const SejaParceiro: React.FC = () => {
  const [campos, setCampos] = useState(CAMPOS_VAZIOS);
  // Campo escondido que só robô preenche (ver servicoParcerias.enviar)
  const [armadilha, setArmadilha] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const aoAlterarCampo = (evento: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = evento.target;
    setCampos((atuais) => ({ ...atuais, [name]: value }));
  };

  const aoEnviar = async (evento: React.FormEvent) => {
    evento.preventDefault();
    if (enviando) return;
    setErro(null);
    setEnviando(true);
    const resultado = await servicoParcerias.enviar(campos, armadilha);
    setEnviando(false);
    if (resultado.status === StatusProcessamento.Sucesso) {
      setCampos(CAMPOS_VAZIOS);
      setEnviado(true);
      return;
    }
    setErro(resultado.mensagem);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <Navbar />

      <CabecalhoDaPagina
        titulo="SEJA UM PARCEIRO"
        subtitulo="Ajude a transformar vidas através da tecnologia. Conte como você quer apoiar o FavelaWare."
        classeTamanhoTitulo="text-3xl sm:text-4xl md:text-5xl"
      />

      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {enviado ? (
          <div role="status" className="rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-lg">
            <h2 className="text-2xl font-bold text-[#2d2a5f]">Pedido enviado!</h2>
            <p className="mt-3 text-gray-700">
              Obrigado pelo interesse em apoiar o FavelaWare. A coordenação vai entrar em contato com você.
            </p>
          </div>
        ) : (
          <form
            onSubmit={aoEnviar}
            className="space-y-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-lg sm:p-8"
          >
            <div>
              <label htmlFor="nome" className={classeRotulo}>
                Nome *
              </label>
              <input
                type="text"
                id="nome"
                name="nome"
                value={campos.nome}
                onChange={aoAlterarCampo}
                autoComplete="name"
                maxLength={TAMANHO_MAXIMO_NOME}
                required
                className={classeCampoDeAcesso}
                placeholder="Seu nome"
              />
            </div>

            <div>
              <label htmlFor="email" className={classeRotulo}>
                E-mail *
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={campos.email}
                onChange={aoAlterarCampo}
                autoComplete="email"
                maxLength={TAMANHO_MAXIMO_EMAIL}
                required
                className={classeCampoDeAcesso}
                placeholder="voce@empresa.com"
              />
            </div>

            <div>
              <label htmlFor="telefone" className={classeRotulo}>
                Telefone *
              </label>
              <input
                type="tel"
                id="telefone"
                name="telefone"
                value={campos.telefone}
                onChange={aoAlterarCampo}
                autoComplete="tel-national"
                inputMode="tel"
                maxLength={20}
                required
                className={classeCampoDeAcesso}
                placeholder="(31) 99999-0000"
              />
            </div>

            <div>
              <label htmlFor="empresa" className={classeRotulo}>
                Empresa *
              </label>
              <input
                type="text"
                id="empresa"
                name="empresa"
                value={campos.empresa}
                onChange={aoAlterarCampo}
                autoComplete="organization"
                maxLength={TAMANHO_MAXIMO_EMPRESA}
                required
                className={classeCampoDeAcesso}
                placeholder="Nome da empresa ou instituição"
              />
            </div>

            <div>
              <label htmlFor="contribuicao" className={classeRotulo}>
                Como deseja contribuir *
              </label>
              {/* Altura fixa e sem alça de arrastar: o texto rola dentro da caixa */}
              <textarea
                id="contribuicao"
                name="contribuicao"
                value={campos.contribuicao}
                onChange={aoAlterarCampo}
                maxLength={TAMANHO_MAXIMO_CONTRIBUICAO}
                required
                className={`${classeCampoDeAcesso} h-40 resize-none`}
                placeholder="Ex.: contratar formandos, apoiar a bolsa dos jovens, oferecer mentoria..."
              />
            </div>

            {/* Armadilha para robô: fora da tela, fora da tabulação e do leitor de tela */}
            <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
              <label htmlFor="confirmacao-extra">Não preencha este campo</label>
              <input
                type="text"
                id="confirmacao-extra"
                name="confirmacao-extra"
                value={armadilha}
                onChange={(evento) => setArmadilha(evento.target.value)}
                tabIndex={-1}
                autoComplete="off"
              />
            </div>

            {erro && (
              <p role="alert" className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-800">
                {erro}
              </p>
            )}

            <button type="submit" disabled={enviando} className={classeBotaoDeAcesso(enviando)}>
              {enviando ? 'Enviando...' : 'Enviar pedido'}
            </button>

            <p className="text-center text-xs text-gray-500">
              Usamos estes dados só para responder ao seu pedido de parceria.
            </p>
          </form>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default SejaParceiro;
