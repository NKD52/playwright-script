// api/run.js
import runAutomation from "../script2.js"; // adjust path if needed

export default async function handler(req: any, res: any) {
  // Only allow POST
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Only POST allowed" });
  }

  const { co, oId } = req.body || {};

  if (!co || !oId) {
    return res.status(400).json({ error: "Missing co or oId" });
  }

  try {
    const result = await runAutomation(co, oId);

    return res.status(result.success ? 200 : 500).json(result);
  } catch (err) {
    console.error(err);
    const message = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ error: message || "Server error" });
  }
}
