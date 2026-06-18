export const config = { runtime: 'edge' };

const SYSTEM_PROMPT = `أنت Creative Director في وكالة ربيز للبراندنج. مهمتك توليد أسئلة استبيان مخصصة ودقيقة بناءً على معلومات العميل.

بناءً على اسم المشروع ومجاله ووصفه، ولّد أسئلة المراحل ٣ إلى ٧ من استبيان إعادة بناء الهوية.

القواعد:
- كل الأسئلة بالفصحى
- الأمثلة والاختيارات مخصصة تماماً لمجال العميل
- إجمالي الأسئلة: ١٤ إلى ١٨ سؤالاً موزعة على ٥ مراحل
- إذا أجاب العميل على شيء في الوصف، لا تكرره
- أنواع الحقول المتاحة: multi, scale, textarea, multipair, suggest

لكل سؤال:
- id: نص فريد مثل s3_q1
- question_ar: نص السؤال بالعربية (فصحى، مفرد)
- question_en: نص السؤال بالإنجليزية
- type: نوع الحقل
- options: مصفوفة [{ar, en}] للـ multi والـ scale فقط
- other: true إذا أردت إضافة خيار "أخرى"
- otherLabel: {ar, en} إذا كان other: true
- help_why: سبب السؤال (جملة واحدة، فصحى)
- help_example: مثال مخصص لمجال العميل
- golden: true للأسئلة الاستراتيجية المهمة
- required: true أو false

أعد JSON فقط بدون أي نص إضافي:
{
  "stages": [
    {
      "id": "s3",
      "title": {"ar": "عنوان المرحلة", "en": "Stage title"},
      "questions": [...]
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

  const userMessage = `معلومات العميل:
- اسم العلامة التجارية: ${brandName}
- مجال العمل: ${activity || 'غير محدد'}
- وصف العميل بكلماته: ${description}
- اللغة المفضّلة: ${lang === 'en' ? 'English' : 'العربية'}

ولّد أسئلة المراحل ٣ إلى ٧ المخصصة لهذا العميل.`;

  // Call Anthropic with streaming
  const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 4000,
      stream: true,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMessage }]
    })
  });

  if (!anthropicRes.ok) {
    const err = await anthropicRes.text();
    return new Response(JSON.stringify({ error: 'Anthropic API error', detail: err }), { status: 500 });
  }

  // Stream SSE back to client
  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();
  const encoder = new TextEncoder();

  (async () => {
    const reader = anthropicRes.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let fullText = '';
    let inputTokens = 0;
    let outputTokens = 0;

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
          if (data === '[DONE]') continue;

          try {
            const event = JSON.parse(data);

            if (event.type === 'message_start' && event.message?.usage) {
              inputTokens = event.message.usage.input_tokens || 0;
            }

            if (event.type === 'content_block_delta' && event.delta?.text) {
              fullText += event.delta.text;
              outputTokens++;
              // Send progress: rough estimate based on chars accumulated
              const pct = Math.min(Math.round((fullText.length / 3000) * 85), 88);
              await writer.write(encoder.encode(`data: ${JSON.stringify({ type: 'progress', pct })}\n\n`));
            }

            if (event.type === 'message_stop') {
              // Parse the complete JSON
              const jsonMatch = fullText.match(/\{[\s\S]*\}/);
              if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]);
                await writer.write(encoder.encode(`data: ${JSON.stringify({ type: 'done', data: parsed })}\n\n`));
              } else {
                await writer.write(encoder.encode(`data: ${JSON.stringify({ type: 'error', message: 'Invalid JSON' })}\n\n`));
              }
            }
          } catch (e) {
            // skip malformed lines
          }
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
      'Connection': 'keep-alive',
    }
  });
}
