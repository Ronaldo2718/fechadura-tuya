const { criarSenhaTemporaria } = require("../../lib/tuya");

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ erro: "Método não permitido." });
  }

  const { nomeHospede, entradaEpoch, saidaEpoch, senha } = req.body || {};

  if (!nomeHospede || !entradaEpoch || !saidaEpoch || !senha) {
    return res.status(400).json({ erro: "Preencha nome, data/hora de entrada, saída e senha." });
  }

  if (!/^\d{7}$/.test(String(senha))) {
    return res.status(400).json({ erro: "A senha precisa ter exatamente 7 dígitos numéricos." });
  }

  const effectiveTime = new Date(entradaEpoch * 1000);
  const invalidTime = new Date(saidaEpoch * 1000);

  if (Number.isNaN(effectiveTime.getTime()) || Number.isNaN(invalidTime.getTime())) {
    return res.status(400).json({ erro: "Datas inválidas." });
  }
  if (invalidTime <= effectiveTime) {
    return res.status(400).json({ erro: "A saída precisa ser depois da entrada." });
  }

  try {
    const { senha: senhaCriada } = await criarSenhaTemporaria({
      nomeHospede: nomeHospede.slice(0, 30),
      effectiveTime,
      invalidTime,
      senha: String(senha),
    });
    return res.status(200).json({ senha: senhaCriada });
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
