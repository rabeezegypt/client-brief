# Client Brief — Rabeez

استبيان اكتشاف العلامة التجارية (Brand Discovery) لوكالة Rabeez. تطبيق صفحة واحدة
ثنائي اللغة (عربي/إنجليزي) + لوحة تحكم للأدمن، مع توليد أسئلة بالـ AI وقاعدة بيانات Supabase.

## Workflow
- التطوير على فرع `claude/friendly-allen-2n6grd`.
- **النشر: ادفع مباشرةً إلى `main`** (Vercel يعمل auto-deploy من `main`). صاحب المشروع طلب النشر على `main` فورًا بدون سؤال.
- قبل كل commit: `git config user.email noreply@anthropic.com && git config user.name Claude` (وإلا يرفض الـ stop hook الـ commit كـ Unverified).
- الدفع: `git push origin claude/friendly-allen-2n6grd` ثم `git push origin claude/friendly-allen-2n6grd:main`.

## Stack & Structure
- **`index.html`** — التطبيق كامله (single file): الحالة `state`، `render()`، الـ views، الفورم، لوحة التحكم، الثيم. لا build step.
- **`api/`** — Vercel serverless functions:
  - `generate.js` — توليد 7 مراحل أسئلة عبر Anthropic بالتوازي (`Promise.allSettled`). يقبل `only:[indices]` للتوليد على دفعات. `maxDuration:60`.
  - `submit.js` — يحفظ الاستبيان في Supabase. يخزّن snapshot الأسئلة داخل `answers.__stages`.
  - `submissions.js` — يرجّع كل الاستبيانات.
  - `update-status.js` — يحدّث الحالة إلى `reviewed`.
- **`fonts/`** — خطوط ذاتية الاستضافة (woff2): عربي = Baybars (عناوين) + Rakik (نصوص)؛ إنجليزي = Albra (عناوين) + Sunset Gothic (نصوص).
- **`package.json`** — التبعية الوحيدة `@supabase/supabase-js`.
- **`vercel.json`** — `maxDuration:60` لـ `api/generate.js` فقط.

## Environment Variables (على Vercel)
- `ANTHROPIC_API_KEY` — لـ `api/generate.js`.
- `SUPABASE_URL` — `https://orallxfqwjpodbnrmajd.supabase.co`.
- `SUPABASE_KEY` — مفتاح Supabase السري (sb_secret_…). **سري — في Vercel env فقط.**

> ملاحظة: Supabase انتقل لمفاتيح ECC (P-256)، فالـ REST الخام بـ apikey/Bearer يفشل بـ "JWT failed verification".
> لهذا نستخدم SDK `@supabase/supabase-js` v2 الذي يتعامل مع الشكل الجديد.

## Supabase
- جدول `submissions`: `id`, `created_at`, `brand` (text), `lang` (text)، `status` (text: `new`/`reviewed`)، `answers` (jsonb).
- `answers.__stages` = snapshot لعناوين/أسئلة المراحل (باللغتين، بما فيها المولّدة) لعرضها في اللوحة بلغة الاستبيان.

## Admin / لوحة التحكم
- مستخدم `admin` + كلمة مرور **مكتوبة في `index.html`** (`ADMIN_USER`/`ADMIN_PASS`).
- ⚠️ غير آمن: المصادقة client-side، الباسوورد ظاهر في الـ JS المنشور. (مهمة مؤجّلة: مصادقة حقيقية.)

## Architecture Notes
- **المراحل**: 2 ثابتة (المعلومات الأساسية + بأسلوبك) + 7 مولّدة بالـ AI = 9 إجمالًا.
- **التوليد التدريجي**: `startGen()` يطلب المرحلة الأولى بسرعة (`genBatch([0])`) ثم الباقي في الخلفية. `vStage()` يعرض spinner للمراحل قيد التحميل؛ `ensureStage()` يعيد المحاولة عند فشل دفعة.
- **الأرقام العربية**: تُحوّل تلقائيًا إلى لاتينية في كل الحقول بالنسخة العربية.
- **الثيم**: فاتح/داكن toggle في الهيدر، محفوظ في localStorage، مع script في `<head>` لمنع الوميض. الافتراضي يتبع النظام.
- **نظام التصميم**: سلّم مسافات 4px، أحجام خط 12/14/16 + عناوين 18/20/24/32، radii عبر `--r`(12)/`--card-radius`(16)/999px، ألوان عبر tokens (`--err`, `--accent-2`…).

## مهام مؤجّلة (Pending)
- مصادقة أدمن حقيقية (بدل الباسوورد الـ hardcoded).
- فلاتر/تصدير/تغيير حالة في لوحة التحكم.
- مسارات brief إضافية (Startup / Refresh / Expansion).
- رسائل ترحيب/شكر/تذكير للفورم.
- أمثلة ديناميكية حسب الصناعة.
- **تدوير (rotate) المفاتيح** التي شُورِكت سابقًا في الشات (PAT, Anthropic key, Supabase secret).
