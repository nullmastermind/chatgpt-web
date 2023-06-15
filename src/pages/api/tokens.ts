import type { NextApiRequest, NextApiResponse } from "next";

const { encode } = require("gpt-3-encoder");

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const str = req.body.content || req.query.content || "";
  const encoded = encode(str);
  res.status(200).json({ data: encoded.length });
}
