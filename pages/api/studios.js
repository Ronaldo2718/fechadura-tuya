const { getStudios } = require("../../lib/tuya");

export default function handler(req, res) {
  const studios = getStudios().map(({ id, nome }) => ({ id, nome }));
  return res.status(200).json({ studios });
}
