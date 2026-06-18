export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { brandName, activity, description, lang } = req.body;

  if (!brandName || !description) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

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
      return res.status(500).json({ error: 'Anthropic API error', detail: err });
    }

    const data = await response.json();
    const raw = data.content[0].text;

    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return res.status(500).json({ error: 'Invalid JSON from model', raw });
    }

    const parsed = JSON.parse(jsonMatch[0]);
    return res.status(200).json(parsed);

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
