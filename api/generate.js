export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { brandName, activity, description, lang } = req.body;

  if (!brandName || !description) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const isAr = lang !== 'en';

  const SYSTEM_PROMPT = `You are a Creative Director at Rabeez branding agency. Generate customised brand discovery questions for a client seeking a rebrand.

Rules:
- Generate exactly 3 stages, each with exactly 3 questions (9 questions total)
- All Arabic text must be formal Arabic (فصحى), singular form
- All examples and options must be specific to the client's industry
- Available field types: multi, scale, textarea
- For multi: options array of 4-5 items [{ar, en}], always add other:true
- For scale: options array of 4 items [{ar, en}]
- For textarea: no options needed

Return ONLY valid JSON, no extra text:
{
  "stages": [
    {
      "id": "s3",
      "title": {"ar": "لماذا الآن؟", "en": "Why now?"},
      "questions": [
        {
          "id": "s3_q1",
          "q": {"ar": "Arabic question text", "en": "English question text"},
          "type": "multi",
          "options": [{"ar": "خيار", "en": "option"}],
          "other": true,
          "otherLabel": {"ar": "سبب آخر", "en": "Other reason"},
          "help": {
            "why": {"ar": "Why this question matters", "en": "Why this question matters"},
            "ex": {"ar": "Industry-specific example", "en": "Industry-specific example"}
          },
          "golden": true,
          "required": false
        }
      ]
    }
  ]
}`;

  const userMsg = `Client info:
- Brand name: ${brandName}
- Industry: ${activity || 'Not specified'}
- Description: ${description}
- Preferred language: ${isAr ? 'Arabic' : 'English'}

Generate 3 stages × 3 questions tailored to this client's industry. Stage titles: (1) Why now?, (2) Audience & market, (3) The strategic gap.`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 2500,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userMsg }]
      })
    });

    if (!response.ok) {
      const err = await response.text();
      return res.status(500).json({ error: 'Anthropic error', detail: err });
    }

    const data = await response.json();
    const raw = data.content[0].text;
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) return res.status(500).json({ error: 'No JSON in response', raw });

    const parsed = JSON.parse(match[0]);
    return res.status(200).json(parsed);

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
