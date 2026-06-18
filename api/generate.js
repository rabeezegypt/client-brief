export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { brandName, activity, description, lang } = req.body || {};

  if (!brandName || !description) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const tools = [{
    name: "submit_questions",
    description: "Submit the generated brand-discovery questions",
    input_schema: {
      type: "object",
      properties: {
        stages: {
          type: "array",
          items: {
            type: "object",
            properties: {
              id: { type: "string" },
              title_ar: { type: "string" },
              title_en: { type: "string" },
              questions: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    id: { type: "string" },
                    q_ar: { type: "string" },
                    q_en: { type: "string" },
                    type: { type: "string", enum: ["multi", "scale", "textarea"] },
                    options_ar: { type: "array", items: { type: "string" } },
                    options_en: { type: "array", items: { type: "string" } },
                    other: { type: "boolean" },
                    help_why_ar: { type: "string" },
                    help_why_en: { type: "string" },
                    help_ex_ar: { type: "string" },
                    help_ex_en: { type: "string" },
                    golden: { type: "boolean" }
                  },
                  required: ["id", "q_ar", "q_en", "type"]
                }
              }
            },
            required: ["id", "title_ar", "title_en", "questions"]
          }
        }
      },
      required: ["stages"]
    }
  }];

  const SYSTEM = "You are a Creative Director at Rabeez branding agency. Generate brand-discovery questions tailored precisely to the client's industry. Arabic must be formal (فصحى), singular voice. Generate exactly 3 stages with 3 questions each. multi/scale questions need options_ar and options_en (4-5 matching items); textarea needs no options. Mark strategic questions golden:true. Add other:true to multi questions. Help examples must be specific to the client's industry. Use the submit_questions tool.";

  const userMsg = `brand: ${brandName} | industry: ${activity || 'unspecified'} | description: ${description} | language: ${lang === 'en' ? 'English' : 'Arabic'}
Stages: (1) Why now? لماذا الآن؟ (2) Audience & market الجمهور والسوق (3) The strategic gap الفجوة`;

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
        max_tokens: 3000,
        system: SYSTEM,
        tools: tools,
        tool_choice: { type: "tool", name: "submit_questions" },
        messages: [{ role: 'user', content: userMsg }]
      })
    });

    if (!response.ok) {
      const err = await response.text();
      return res.status(500).json({ error: 'Anthropic error', detail: err });
    }

    const data = await response.json();
    let toolInput = null;
    for (const block of data.content) {
      if (block.type === 'tool_use') { toolInput = block.input; break; }
    }
    if (!toolInput || !toolInput.stages) {
      return res.status(500).json({ error: 'No tool output' });
    }

    return res.status(200).json(toolInput);

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
