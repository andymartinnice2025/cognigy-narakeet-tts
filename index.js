const express = require("express");
const fetch = require("node-fetch");

const app = express();
app.use(express.json());

// Narakeet endpoint returning WAV audio
const NARAKEET_URL = "https://api.narakeet.com/text-to-speech/m4a";

app.post("/", async (req, res) => {
  try {
    // Expect JSON like: { "text": "Hello world" }
    const body = req.body || {};
    const text = body.text || body.input || body.utterance;

    if (!text) {
      return res.status(400).json({ error: "Missing 'text' field in request body" });
    }

    const narakeetApiKey = process.env.NARAKEET_API_KEY;
    if (!narakeetApiKey) {
      console.error("NARAKEET_API_KEY not set");
      return res.status(500).json({ error: "Narakeet API key not configured" });
    }

    // Call Narakeet
    const narakeetResponse = await fetch(NARAKEET_URL, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain",
        "Accept": "application/octet-stream",
        "x-api-key": narakeetApiKey
      },
      body: text
    });

    if (!narakeetResponse.ok) {
      const errorText = await narakeetResponse.text().catch(() => "");
      console.error(
        "Narakeet error",
        narakeetResponse.status,
        narakeetResponse.statusText,
        errorText
      );
      return res.status(502).json({
        error: "Narakeet TTS request failed",
        status: narakeetResponse.status,
        details: errorText
      });
    }

    const arrayBuffer = await narakeetResponse.arrayBuffer();
    const audioBuffer = Buffer.from(arrayBuffer);

    res.set("Content-Type", "audio/mp4");
    res.send(audioBuffer);
  } catch (err) {
    console.error("Unexpected error:", err);
    res.status(500).json({ error: "Internal server error", details: err.message });
  }
});

// Cloud Run will set PORT
const port = process.env.PORT || 8080;
app.listen(port, () => {
  console.log(`Cognigy-Narakeet TTS listening on port ${port}`);
});
