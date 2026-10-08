/**
 * ============================================
 * PARCEIROS (IDEALIZADORES) — PÁGINA INICIAL
 * ============================================
 *
 * Grade de logos dos parceiros, com animação escalonada.
 * Se a imagem não carregar, o cartão mostra o emoji do parceiro.
 * Dados em src/data/parceiros.ts (os mesmos da página Sobre).
 */
import { useState } from 'react';
import { motion, type Variants } from 'framer-motion';

import { parceiros } from '../data/parceiros';
import type { Parceiro } from '../types';

/** Logo do parceiro; se a imagem falhar, mostra o emoji */
const LogoDoParceiro: React.FC<{ parceiro: Parceiro }> = ({ parceiro }) => {
  const [imagemFalhou, setImagemFalhou] = useState(false);
  if (imagemFalhou) return <span className="text-4xl sm:text-6xl leading-none">{parceiro.emoji}</span>;
  return (
    <img
      src={parceiro.imagem}
      alt={parceiro.nome}
      loading="lazy"
      decoding="async"
      className="w-full h-full object-contain"
      onError={() => setImagemFalhou(true)}
    />
  );
};

const Parceiros: React.FC = () => {
  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
      },
    },
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, scale: 0.5, rotate: -10 },
    visible: {
      opacity: 1,
      scale: 1,
      rotate: 0,
      transition: {
        type: 'spring',
        stiffness: 100,
        damping: 10,
      },
    },
  };

  return (
    <section
      id="reconhecimentos"
      className="relative py-20 bg-gradient-to-br from-gray-50 via-white to-gray-100 overflow-hidden"
    >
      {/* Background decorative elements */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute top-10 left-10 w-72 h-72 bg-favela-green-500/20 rounded-full blur-3xl" />
        <div className="absolute bottom-10 right-10 w-72 h-72 bg-favela-blue-500/20 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-favela-purple-500/10 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: -50 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <motion.h2
            className="text-3xl sm:text-5xl md:text-6xl font-black mb-6"
            initial={{ opacity: 0, scale: 0.5 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <span className="text-gradient from-favela-green-500 via-favela-blue-500 to-favela-green-500">
              IDEALIZADORES
            </span>
          </motion.h2>
          <motion.div
            className="w-24 h-1 bg-gradient-to-r from-favela-green-500 to-favela-blue-500 mx-auto rounded-full"
            initial={{ width: 0 }}
            whileInView={{ width: 96 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.2 }}
          />
          <motion.p
            className="mt-6 text-xl text-gray-700 max-w-3xl mx-auto font-medium"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            Parceiros que acreditam e apoiam nossa missão de transformar vidas através da tecnologia
          </motion.p>
        </motion.div>

        {/* Grade de parceiros */}
        <motion.div
          className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4 sm:gap-6 md:gap-8 xl:gap-6"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
        >
          {parceiros.map((parceiro) => (
            <motion.div key={parceiro.nome} variants={itemVariants} title={parceiro.nome} className="group relative">
              {/* Card: todos idênticos. Logo e nome têm altura fixa (o nome sempre
                  reserva 2 linhas), então nome longo não empurra o logo nem faz o
                  cartão crescer. Colunas, espaços e logo foram medidos para o conteúdo
                  caber no quadrado de 320px a telas largas (6 colunas só do xl em diante) */}
              <div className="relative aspect-square overflow-hidden bg-white rounded-3xl p-4 sm:p-5 flex flex-col items-center justify-center shadow-lg border-2 border-gray-200 group-hover:border-favela-green-500 transition-all duration-300">
                {/* Logo */}
                <div className="relative z-10 w-12 h-12 sm:w-20 sm:h-20 shrink-0 mb-2 sm:mb-3 flex items-center justify-center">
                  <LogoDoParceiro parceiro={parceiro} />
                </div>

                {/* Nome: caixa de 2 linhas (text-sm com leading-5 = 2 × 20px) */}
                <p className="relative z-10 h-10 shrink-0 w-full flex items-center justify-center text-sm leading-5 font-bold text-gray-800 text-center group-hover:text-favela-green-600 transition-colors duration-300">
                  {/* O limite de linhas fica no span: line-clamp troca o display e desligaria o flex */}
                  <span className="line-clamp-2">{parceiro.nome}</span>
                </p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default Parceiros;
