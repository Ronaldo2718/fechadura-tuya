const { criarSenhaTemporaria } = require("../../lib/tuya");

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ erro: "Método não permitido." });
  }

  const { modo } = req.body || {};
  if (modo !== "teste1" && modo !== "teste2") {
    return res.status(400).json({ erro: "Modo inválido." });
  }

  // Janela de teste: agora até daqui 2 horas.
  const effectiveTime = new Date();
  const invalidTime = new Date(Date.now() + 2 * 60 * 60 * 1000);

  try {
    const { senha, resultado } = await criarSenhaTemporaria({
      nomeHospede: "teste-diag",
      effectiveTime,
      invalidTime,
      modo,
    });
    return res.status(200).json({ senha, resultado });
  } catch (e) {
    console.error("Erro no teste de diagnóstico:", e.tuyaResponse || e);
    return res.status(502).json({
      erro: e.message || "Falha na chamada.",
      respostaCompleta: e.tuyaResponse || null,
    });
  }
}
