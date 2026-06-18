export const config = { runtime: 'edge' };

const SYSTEM_PROMPT = `أنت Creative Director في وكالة ربيز للبراندنج. مهمتك تحليل معلومات العميل وتوليد أسئلة استبيان مخصصة ودقيقة.

بناءً على اسم المشروع ونشاطه ووصفه، ولّد أسئلة المراحل ٣ إلى ٧ من استبيان إعادة بناء الهوية.

القواعد الأساسية:
- كل الأسئلة بالفصحى
- الأمثلة والاختيارات مخصصة لقطاع العميل تماماً (مطعم، عيادة، شركة تقنية، إلخ)
- إجمالي الأسئلة: ١٤ إلى ٢٠ سؤالاً
- إذا أجاب العميل على شيء في الوصف المفتوح، لا تكرره كسؤال
- كل سؤال له: id, question_ar, question_en, type, options (إن وجدت), help_why, help_example, golden (true/false), required (true/false)
- أنواع الحقول: multi, scale, textarea, multipair, multiadd, suggest

أنواع الأسئلة:
- multi: اختيار متعدد مع options مصفوفة [{ar, en}]
- scale: مقياس مع options مصفوفة [{ar, en}]
- textarea: نص حر
- suggest: اقتراحات + نص حر (للأسئلة التي تحتاج إبداع)
- multipair: صفوف مزدوجة (مثل المنافسين: اسم + رابط)
- multiadd: صفوف مفردة قابلة للإضافة

للأسئلة التي تحتوي other: أضف "other": true و "otherLabel": {"ar": "...", "en": "..."}

أعد JSON فقط بدون أي نص إضافي، بالشكل التالي:
{
  "stages": [
    {
      "id": "s3",
      "title": {"ar": "لماذا الآن؟", "en": "Why now?"},
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

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 4000,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userMessage }]
      })
    });

    if (!response.ok) {
      const err = await response.text();
      return new Response(JSON.stringify({ error: 'Anthropic API error', detail: err }), { status: 500 });
    }

    const data = await response.json();
    const raw = data.content[0].text;

    // Parse JSON from response
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return new Response(JSON.stringify({ error: 'Invalid JSON from model', raw }), { status: 500 });
    }

    const parsed = JSON.parse(jsonMatch[0]);
    return new Response(JSON.stringify(parsed), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}
