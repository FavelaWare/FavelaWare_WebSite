import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import {
  amortecerEmbalo,
  ARQUIVOS_DA_CAMISETA,
  CREDITO_DO_MODELO,
  deveUsar3D,
  encaixeDaTextura,
  normalizarAngulo,
  proximoAngulo,
} from './camiseta3d';

describe('camiseta 3D', () => {
  it('gira 30° por segundo e dá a volta em 360°', () => {
    expect(proximoAngulo(0, 1000)).toBeCloseTo(30);
    expect(proximoAngulo(350, 1000)).toBeCloseTo(20);
    expect(proximoAngulo(10, 0)).toBe(10);
    // intervalo negativo (relógio que volta) não gira para trás
    expect(proximoAngulo(10, -500)).toBe(10);
  });

  it('arrastar para a esquerda leva o ângulo para [0, 360)', () => {
    expect(normalizarAngulo(-30)).toBe(330);
    expect(normalizarAngulo(725)).toBe(5);
    expect(normalizarAngulo(0)).toBe(0);
  });

  it('o embalo de soltar perde força e para em cerca de 1 s', () => {
    const embalo = 0.5; // 500°/s
    expect(amortecerEmbalo(embalo, 0)).toBe(embalo);
    expect(Math.abs(amortecerEmbalo(embalo, 250))).toBeLessThan(embalo);
    expect(amortecerEmbalo(embalo, 250)).toBeGreaterThan(0);
    expect(amortecerEmbalo(embalo, 1500)).toBe(0);
    // para os dois lados
    expect(amortecerEmbalo(-embalo, 250)).toBeLessThan(0);
  });

  it('usa o 3D só com WebGL2 e sem "reduzir movimento"', () => {
    expect(deveUsar3D({ reduzirMovimento: false, temWebGL2: true })).toBe(true);
    expect(deveUsar3D({ reduzirMovimento: true, temWebGL2: true })).toBe(false);
    expect(deveUsar3D({ reduzirMovimento: false, temWebGL2: false })).toBe(false);
    expect(deveUsar3D({ reduzirMovimento: true, temWebGL2: false })).toBe(false);
  });

  it('a textura cobre a peça de borda a borda do molde', () => {
    const { repeat, offset } = encaixeDaTextura({ uMin: -256, uMax: 256, vMin: -406, vMax: 298 });
    const paraTextura = (u: number, v: number) => [u * repeat[0] + offset[0], v * repeat[1] + offset[1]];
    expect(paraTextura(-256, -406)[0]).toBeCloseTo(0);
    expect(paraTextura(-256, -406)[1]).toBeCloseTo(0);
    expect(paraTextura(256, 298)[0]).toBeCloseTo(1);
    expect(paraTextura(256, 298)[1]).toBeCloseTo(1);
    expect(paraTextura(0, -54)[0]).toBeCloseTo(0.5);
  });

  it('o crédito tem tudo o que a CC BY 4.0 pede', () => {
    for (const campo of ['titulo', 'autor', 'fonte', 'licenca', 'linkDaLicenca', 'modificacao'] as const) {
      expect(CREDITO_DO_MODELO[campo].trim()).not.toBe('');
    }
    expect(CREDITO_DO_MODELO.fonte).toMatch(/^https:\/\/sketchfab\.com\//);
  });

  it('o modelo não baixa nada de fora, só usa extensões conhecidas e é leve', () => {
    const glb = readFileSync(join(process.cwd(), 'public', ARQUIVOS_DA_CAMISETA.modelo));
    expect(glb.toString('ascii', 0, 4)).toBe('glTF');
    expect(glb.length).toBeLessThan(400 * 1024);
    // Chunk JSON logo depois do cabeçalho de 12 bytes: tamanho (4) + tipo (4) + conteúdo
    const json = JSON.parse(glb.toString('utf8', 20, 20 + glb.readUInt32LE(12))) as {
      buffers?: { uri?: string }[];
      images?: { uri?: string }[];
      extensionsRequired?: string[];
    };
    // Nenhum arquivo externo (o GLTFLoader buscaria em outro domínio)
    expect((json.buffers ?? []).filter((buffer) => buffer.uri)).toEqual([]);
    expect((json.images ?? []).filter((imagem) => imagem.uri)).toEqual([]);
    for (const extensao of json.extensionsRequired ?? []) {
      expect(['EXT_meshopt_compression', 'KHR_mesh_quantization']).toContain(extensao);
    }
  });

  it('o modelo e as texturas existem em public', () => {
    for (const caminho of Object.values(ARQUIVOS_DA_CAMISETA)) {
      expect(existsSync(join(process.cwd(), 'public', caminho))).toBe(true);
    }
  });
});
