app.post("/run", async (req, res) => {
  const { co, oId, creatorName, creatorEmail, creatorPhone } = req.body || {};

  if (!co || !oId) {
    return res.status(400).json({ success: false, error: "Missing co or oId" });
  }

  try {
    const result = await runAutomation(
      co,
      oId,
      creatorName,
      creatorEmail,
      creatorPhone
    );

    res.status(result.success ? 200 : 500).json(result);
  } catch (err) {
    console.error("runAutomation error:", err);
    res
      .status(500)
      .json({ success: false, error: err.message || "Server error" });
  }
});
