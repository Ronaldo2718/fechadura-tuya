const { criarSenhaTemporaria } = require("../../lib/tuya");

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ erro: "Método não permitido." });
  }

  const { nomeHospede, entrada, saida } = req.body || {};

  if (!nomeHospede || !entrada || !saida) {
    return res.status(400).json({ erro: "Preencha nome, data/hora de entrada e de saída." });
  }

  const effectiveTime = new Date(entrada);
  const invalidTime = new Date(saida);

  if (Number.isNaN(effectiveTime.getTime()) || Number.isNaN(invalidTime.getTime())) {
    return res.status(400).json({ erro: "Datas inválidas." });
  }
  if (invalidTime <= effectiveTime) {
    return res.status(400).json({ erro: "A saída precisa ser depois da entrada." });
  }

  try {
    const senha = await criarSenhaTemporaria({
      nomeHospede: nomeHospede.slice(0, 30),
      effectiveTime,
      invalidTime,
    });
    return res.status(200).json({ senha });
  } catch (e) {
    console.error("Erro ao criar senha Tuya:", e.tuyaResponse || e);
    return res.status(502).json({
      erro:
        e.tuyaCode
          ? `A Tuya recusou o pedido (código ${e.tuyaCode}): ${e.message}`
          : e.message || "Falha ao gerar a senha na fechadura.",
    });
  }
}
