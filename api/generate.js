export const config = { runtime: 'edge' };

const SYSTEM_PROMPT = `أنت Creative Director في وكالة ربيز للبراندنج. ولّد أسئلة استبيان مخصصة لعميل يريد إعادة بناء هويته التجارية.

القواعد الصارمة:
- أعد 3 مراحل فقط (لماذا الآن، الجمهور والسوق، الفجوة) — لا أكثر
- كل مرحلة تحتوي 3 أسئلة فقط — المجموع 9 أسئلة
- الأسئلة بالفصحى، مخصصة لمجال العميل تماماً
- الأمثلة من نفس مجال العميل
- أنواع الحقول: multi أو scale أو textarea فقط
- للـ multi: options مصفوفة من 4-5 عناصر [{ar, en}] مع other: true
- للـ scale: options مصفوفة من 4 عناصر [{ar, en}]

أعد JSON فقط، بدون أي نص خارجه:
{
  "stages": [
    {
      "id": "s3",
      "title": {"ar": "لماذا الآن؟", "en": "Why now?"},
      "questions": [
        {
          "id": "s3_q1",
          "q": {"ar": "نص السؤال", "en": "Question text"},
          "type": "multi",
          "options": [{"ar": "خيار", "en": "option"}],
          "other": true,
          "otherLabel": {"ar": "سبب آخر", "en": "Other reason"},
          "help": {
            "why": {"ar": "لماذا السؤال مهم", "en": "Why this matters"},
            "ex": {"ar": "مثال من مجال العميل", "en": "Client-specific example"}
          },
          "golden": true,
          "required": false
        }
      ]
    }
  ]
}`;

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }

  const { brandName, activity, description, lang } = await req.json();

  if (!brandName || !description) {
    return new Response(JSON.stringify({ error: 'Missing required fields' }), { status: 400 });
  }

  const userMessage = `العميل:
- الاسم: ${brandName}
- المجال: ${activity || 'غير محدد'}
- الوصف: ${description}
- اللغة: ${lang === 'en' ? 'English' : 'العربية'}

ولّد 3 مراحل، كل مرحلة 3 أسئلة مخصصة لهذا المجال.`;

  const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2000,
      stream: true,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMessage }]
    })
  });

  if (!anthropicRes.ok) {
    const err = await anthropicRes.text();
    return new Response(JSON.stringify({ error: 'Anthropic API error', detail: err }), { status: 500 });
  }

  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();
  const encoder = new TextEncoder();

  (async () => {
    const reader = anthropicRes.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let fullText = '';
    const TARGET_CHARS = 1800;

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop();

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const data = line.slice(6).trim();
          try {
            const event = JSON.parse(data);

            if (event.type === 'content_block_delta' && event.delta?.text) {
              fullText += event.delta.text;
              const pct = Math.min(Math.round((fullText.length / TARGET_CHARS) * 88), 88);
              await writer.write(encoder.encode(`data: ${JSON.stringify({ type: 'progress', pct })}\n\n`));
            }

            if (event.type === 'message_stop') {
              const jsonMatch = fullText.match(/\{[\s\S]*\}/);
              if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]);
                await writer.write(encoder.encode(`data: ${JSON.stringify({ type: 'done', data: parsed })}\n\n`));
              } else {
                await writer.write(encoder.encode(`data: ${JSON.stringify({ type: 'error', message: 'Invalid JSON' })}\n\n`));
              }
            }
          } catch (e) {}
        }
      }
    } catch (err) {
      await writer.write(encoder.encode(`data: ${JSON.stringify({ type: 'error', message: err.message })}\n\n`));
    } finally {
      await writer.close();
    }
  })();

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
    }
  });
}
