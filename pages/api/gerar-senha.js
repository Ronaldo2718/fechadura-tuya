const { criarSenhaTemporaria } = require("../../lib/tuya");
const { registrarSenhaNaPlanilha } = require("../../lib/sheets");

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ erro: "Método não permitido." });
  }

  const { nomeHospede, entradaEpoch, saidaEpoch, senhaEscolhida, studioId } = req.body || {};

  if (!nomeHospede || !entradaEpoch || !saidaEpoch || !studioId) {
    return res.status(400).json({ erro: "Preencha studio, nome, data/hora de entrada e de saída." });
  }

  if (senhaEscolhida && !/^\d{7}$/.test(senhaEscolhida)) {
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
    const { senha, nomeStudio } = await criarSenhaTemporaria({
      nomeHospede: nomeHospede.slice(0, 30),
      effectiveTime,
      invalidTime,
      senhaEscolhida: senhaEscolhida || undefined,
      studioId,
    });

    try {
      await registrarSenhaNaPlanilha({
        nomeStudio,
        nomeHospede,
        senha,
        entrada: effectiveTime,
        saida: invalidTime,
      });
    } catch (erroPlanilha) {
      console.error("Não foi possível registrar na planilha:", erroPlanilha);
    }

    return res.status(200).json({ senha });
  } catch (e) {
    console.error("Erro ao criar senha Tuya:", e.tuyaResponse || e);
    return res.status(502).json({
      erro: e.tuyaCode
        ? `A Tuya recusou o pedido (código ${e.tuyaCode}): ${e.message}`
        : e.message || "Falha ao gerar a senha na fechadura.",
    });
  }
}
