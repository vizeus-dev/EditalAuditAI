/**
 * webLlmDetector.ts — Detector e Orquestrador de WebGPU / WebLLM In-Browser
 * Verifica suporte a aceleração gráfica no dispositivo do cliente para rodar
 * modelos locais (Llama 3.2 1B/3B) com Custo Zero para o servidor.
 */

export interface WebGpuSupportStatus {
  supported: boolean;
  adapterInfo?: string;
  recommendedModel: string;
  reason?: string;
}

export async function detectWebGpuSupport(): Promise<WebGpuSupportStatus> {
  if (typeof navigator === 'undefined' || !('gpu' in navigator)) {
    return {
      supported: false,
      recommendedModel: 'gemini-3.5-flash',
      reason: 'Navegador não suporta WebGPU. Utilizando fallback gratuito em nuvem (Gemini/Groq).'
    };
  }

  try {
    const gpu = (navigator as unknown as { gpu: { requestAdapter: () => Promise<GPUAdapter | null> } }).gpu;
    const adapter = await gpu.requestAdapter();
    if (!adapter) {
      return {
        supported: false,
        recommendedModel: 'gemini-3.5-flash',
        reason: 'Nenhum adaptador gráfico compatível encontrado. Utilizando fallback em nuvem.'
      };
    }

    return {
      supported: true,
      adapterInfo: 'WebGPU Ativa e Acelerada',
      recommendedModel: 'Llama-3.2-1B-Instruct-q4f32_1-MLC'
    };
  } catch (e) {
    return {
      supported: false,
      recommendedModel: 'gemini-3.5-flash',
      reason: `Erro ao inicializar WebGPU: ${String(e)}`
    };
  }
}
