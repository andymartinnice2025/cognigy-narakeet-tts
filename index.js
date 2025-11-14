const express = require("express");
const fetch = require("node-fetch");

const app = express();
app.use(express.json());

// Base Narakeet TTS endpoint for streaming (m4a)
const NARAKEET_BASE_URL = "https://api.narakeet.com/text-to-speech/m4a";

// Build final Narakeet URL with voice applied
function buildNarakeetUrl(body) {
  // Optional: request-specific voice
  const requestVoice = body.voice;

  // Default voice from Cloud Run environment variable
  const defaultVoice = process.env.NARAKEET_VOICE;

  // Final voice selection
  const voice = requestVoice || defaultVoice;

  // If no voice provided anywhere, still return base URL
  if (!voice) {
    return NARAKEET_BASE_URL;
  }

  return `${NARAKEET_BASE_URL}?voice=${encodeURIComponent(voice)}`;
}

app.post("/", async (req, res) => {
  try {
    const body = req.body || {};

    const text = body.text || body.input || body.utterance;
    if (!text) {
      return res.status(400).json({ error: "Missing 'text' field in request body" });
    }

    const narakeetApiKey = process.env.NARAKEET_API_KEY;
    if (!narakeetApiKey) {
      return res.status(500).json({ error: "NARAKEET_API_KEY not configured" });
    }

    // Build correct Narakeet URL with voice
    const narakeetUrl = buildNarakeetUrl(body);

    const narakeetResponse = await fetch(narakeetUrl, {
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
      return res.status(502).json({
        error: "Narakeet TTS request failed",
        status: narakeetResponse.status,
        details: errorText
      });
    }

    // Convert binary m4a audio
    const arrayBuffer = await narakeetResponse.arrayBuffer();
    const audioBuffer = Buffer.from(arrayBuffer);

    res.set("Content-Type", "audio/mp4");
    res.send(audioBuffer);
  } catch (err) {
    res.status(500).json({ error: "Internal server error", details: err.message });
  }
});

// Cloud Run requires listening on the PORT env var
const port = process.env.PORT || 8080;
app.listen(port, () => {
  console.log(`Cognigy-Narakeet TTS service running on port
