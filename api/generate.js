// api/generate.js
const OpenAI = require("openai");

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const { prompt } = req.body || {};

    if (!prompt || typeof prompt !== "string") {
      res.status(400).json({ error: "Missing or invalid 'prompt' field" });
      return;
    }

    const response = await client.responses.create({
      model: "gpt-5.1",
      input: [
        {
          role: "system",
          content:
            "You are a creative DM assistant for a One Piece-inspired DnD campaign. " +
            "You build devil-fruit-based abilities that are cinematic AND easy to use at the table."
        },
        {
          role: "user",
          content: prompt
        }
      ]
    });

    let text = "";

    if (response.output_text) {
      text = response.output_text;
    } else if (
      response.output &&
      response.output[0] &&
      response.output[0].content &&
      response.output[0].content[0] &&
      response.output[0].content[0].text &&
      response.output[0].content[0].text.value
    ) {
      text = response.output[0].content[0].text.value;
    } else {
      text = JSON.stringify(response, null, 2);
    }

    res.status(200).json({ result: text });
  } catch (err) {
    console.error("Error calling OpenAI:", err);
    res.status(500).json({
      error: "Failed to generate abilities. Check server logs and your API key."
    });
  }
};
