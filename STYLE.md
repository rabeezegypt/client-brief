# Client Brief — Design System

دليل الـ UI/UX المُطبَّق على المنصة بالكامل (الفورم + لوحة التحكم + تفاصيل الاستبيان).
مُستوحى من eloqwnt.com (monochrome editorial / minimal premium).

---

## 1. الباليت (Color System)

```css
--bg:         #E5E9EB;            /* خلفية الصفحة — رمادي فاتح */
--surface:    #FFFFFF;            /* الكروت البيضاء */
--surface-2:  #F2F7F9;            /* خلفية ثانوية خفيفة */
--surface-3:  #EEF2F4;            /* تعبئة بعض الـ inputs */
--border:     rgba(0,0,0,.10);    /* حد ناعم */
--border-2:   rgba(0,0,0,.18);    /* حد أقوى لعناصر تفاعلية */

--text:       #000000;            /* نص أساسي */
--text-2:     #222222;            /* نص ثانوي */
--text-3:     #A9ACAD;            /* نص خافت / placeholder */

--accent:     #0A57FF;            /* أزرق — مساعد فقط، ليس primary */
--accent-soft:#E3F7FF;            /* تينت أزرق فاتح للهايلايت */

--ok:         #0F8A4A;
--err:        #C8272D;
```

**قاعدة اللون:** أبيض + رمادي + أسود. الأزرق مساعد بس (highlight ناعم للكروت الذهبية، تنبيهات).

---

## 2. التايبوغرافي (Typography)

### العائلات

| اللغة | Display (عناوين كبيرة) | Body (نصوص وأسئلة) |
|---|---|---|
| AR | **HT Baybars Display** — Light 300 / Bold 700 | **HT Rakik** — Light 300 / Medium 500 |
| EN | **Albra** — Regular 400 / Medium 500 | **Sunset Gothic Pro** — 200/300–700 |

> الخطوط ذاتية الاستضافة في `/fonts` (woff2).

### السلّم (Type Scale)

| العنصر | الحجم | الوزن | الاستخدام |
|---|---|---|---|
| **Hero / Landing title** | `clamp(40px, 6vw, 64px)` Display | 500 EN / 700 AR | `.land-title` |
| **Brand cover** (تفاصيل الاستبيان) | `3rem` ≈ 48px Display | 500 / 700 AR | `.bcover-brand` |
| **Admin title** | `2.2rem` ≈ 35px Display | 500 / 700 AR | `.admin-title` |
| **Stat number** | `2.6rem` ≈ 42px Display | 500 / 700 AR | `.stat .n` |
| **Thanks h1** | `2rem` ≈ 32px Display | 500 / 700 AR | `.thanks h1` |
| **Login title** | `1.4rem` ≈ 22px Display | 500 / 700 AR | `.login-card h2` |
| **Section heading** (داخل التفاصيل) | `20px` Body | 500 (Medium) | `.bsection-h` |
| **Question label** | `1.35rem` ≈ 22px Body | 500 (Medium) | `.q` |
| **Subname / list item** | `18px` Display | 500 / 700 AR | `.subname` |
| **Body running text** | `15px` Body | 300 (Light) | `.land-tag`, `.brow-a`, `.gen p`, `.thanks p`, `.scaffold` |
| **Eyebrow / Section label** | `14px` Body | 500 (Medium) | `.eyebrow`, `.contact-subh` |
| **Tab / Button text** | `14px` Body | 500 (Medium) | `.tab`, `.cta`, `.ghost` |
| **Stage intro** | `14px` Body | 300 (Light) | `.stage-intro` |
| **Small caption** | `11–13px` Body | 300 / 500 | `.submeta`, `.req`, `.savenote`, `.beta` |

### القاعدة الذهبية

> **Medium (500)** = sub-headings / labels / buttons / selected options.
> **Light (300)** = body text / inputs / unselected options / running text.
> **Display Bold (700 AR / 500 EN)** = hero & big-display headlines فقط.

النصف-وزن (`font-weight: 400`) **لا يُستخدم** — Rakik فيه 300 و 500 فقط، و الـ 400 يفصل بـ fallback إلى 500.

### Letter-spacing

- العناوين الكبيرة بالإنجليزي: `-0.02em` (compression خفيف للـ editorial feel).
- العربي: `letter-spacing: 0` دائمًا (الـ negative spacing يكسر الـ kerning العربي).

---

## 3. المسافات (Spacing)

```css
--space-xs:  4px
--space-sm:  8px
--space-md:  16px
--space-lg:  24px
--space-xl:  32px
--space-2xl: 48px
```

- **Topbar padding**: `18px 32px` (mobile: `14px 18px`).
- **Card body padding**: `44px 48px` (mobile: `28px 24px`).
- **Stage card body**: `44px 48px`.
- **Brief cover padding**: `48px 44px` (mobile: `32px 26px`).
- **Question block gap**: `padding: 24px 0` مع `border-top: 1px solid var(--border)`.
- **Stat card padding**: `24px 28px`.

---

## 4. الحواف (Radii & Borders)

```css
--r:              14px    /* عناصر داخلية (inputs، help panels) */
--card-radius:    24px    /* الكروت العادية، subcards، resume-card */
--card-radius-lg: 34px    /* الكروت الكبيرة الرئيسية (.card، .bcover، .bsection) */
--pill:           9999px  /* الأزرار والـ chips كلها */
```

**Borders:**
- Default: `1px solid var(--border)` (rgba(0,0,0,0.10)).
- عناصر تفاعلية (`.opt`, `.ghost`, `.sopt`): `1.5px solid var(--border-2)` (rgba(0,0,0,0.18)).
- لا نستخدم `box-shadow` ثقيلة. الفصل البصري بالخلفيات (أبيض داخل رمادي) وليس بالحدود.

---

## 5. الأزرار (Buttons)

كل الأزرار **pill** (border-radius 9999).

### Primary CTA
```css
.cta {
  background: var(--text);   /* أسود */
  color: #fff;
  border: none;
  border-radius: var(--pill);
  padding: 14px 28px;
  font-size: 16px;
  font-weight: 500;
  box-shadow: none;
}
.cta:hover { transform: translateY(-1px); box-shadow: 0 8px 22px rgba(0,0,0,.16) }
```

### Ghost / Secondary
```css
.ghost {
  background: transparent;
  border: 1.5px solid var(--border-2);
  color: var(--text);
  border-radius: var(--pill);
  padding: 13px 24px;
  font-size: 15px;
  font-weight: 500;
}
.ghost:hover { border-color: var(--text); background: #fff }
.ghost.sm { padding: 9px 16px; font-size: 13px }
```

### Disabled
`opacity: 0.65; cursor: default; pointer-events: none; transform: none;`

---

## 6. الخيارات (Options / Chips)

### Pill chips (افتراضي — للخيارات القصيرة)
```css
.opt {
  display: inline-flex; align-items: center; gap: 10px;
  padding: 11px 18px;
  border: 1.5px solid var(--border);
  border-radius: var(--pill);
  background: #fff;
  font-size: 15px;
  font-weight: 300;        /* Light — مش مختار */
  color: var(--text);
}
.opt:hover { border-color: var(--text-2); box-shadow: 0 4px 12px rgba(0,0,0,.05) }
.opt.sel {
  border-color: var(--text);
  background: var(--text);
  color: #fff;
  font-weight: 500;        /* Medium — مختار */
  box-shadow: 0 4px 12px rgba(0,0,0,.10);
}
```

### Stacked cards (للنصوص الطويلة — Stage 2)
يتفعّل تلقائيًا لما يبقى أي خيار `≥ 22` حرف أو السؤال `single: true`.

```css
.opts.stack { flex-direction: column; align-items: stretch; gap: 10px }
.opts.stack .opt {
  justify-content: flex-start;
  border-radius: var(--r);     /* 14px بدل pill */
  padding: 16px 22px;
  width: 100%;
  text-align: start;
}
.opts.stack .opt::before {
  content: "";
  width: 18px; height: 18px;
  border-radius: 50%;
  border: 1.5px solid var(--border-2);
  background: #fff;
}
.opts.stack .opt.sel::before {
  border-color: #fff;
  box-shadow: inset 0 0 0 4px var(--text);  /* نقطة سوداء مملوءة */
}
```

### Scale (single-select horizontal — للخيارات القصيرة)
- نفس منطق التحديد (Light → Medium، خلفية بيضاء → سوداء).
- `flex: 1` يخلي كل خيار يتمدد بالتساوي.

### Adjective pills
- نفس `.opt` بس بـ `.adjwrap` (limit 3-5 على selection).

---

## 7. الحقول (Inputs)

```css
.inp {
  width: 100%;
  background: #fff;
  border: 1.5px solid var(--border);
  border-radius: var(--r);     /* 14px */
  padding: 14px 18px;
  font-family: var(--font-body);
  font-size: 15px;
  font-weight: 300;            /* Light */
  line-height: 1.65;
}
.inp:focus {
  outline: none;
  border-color: var(--text);
  box-shadow: 0 0 0 3px rgba(0,0,0,.06);
}
.inp::placeholder { color: var(--text-3) }
```

---

## 8. الكروت (Cards)

- **`.card`** (form): `background: #fff; border-radius: 34px; padding: 44px 48px;`
- **`.subcard`** (admin list): `background: #fff; border-radius: 24px; padding: 22px 28px; box-shadow on hover.`
- **`.bcover`** (cover detail): `background: #fff; border-radius: 34px; padding: 48px 44px;`
- **`.bsection`** (كل قسم في التفاصيل): `background: #fff; border-radius: 34px; padding: 36px 40px;`
- **`.stat`** (stats grid): `background: #fff; border-radius: 24px; padding: 24px 28px;`

> الكروت **بدون border**. الفصل البصري بالخلفية الرمادية للصفحة.

---

## 9. الـ Eyebrows / Section Labels

```html
<div class="eyebrow">
  <span class="dot"></span>
  <span>اسم القسم</span>
</div>
```

```css
.eyebrow {
  display: inline-flex; align-items: center; gap: 10px;
  font-size: 14px; font-weight: 500;
  color: var(--text);
  margin-bottom: 28px;
}
.dot {
  width: 8px; height: 8px; border-radius: 9999px;
  background: var(--text);   /* أسود — مش أزرق */
}
```

---

## 10. الـ Pills (Status / Tags)

```css
.pill { font-size: 12px; padding: 5px 12px; border-radius: 9999px; font-weight: 500 }
.pnew  { color: var(--text);   background: var(--accent-soft) }   /* جديد */
.prev2 { color: var(--text-2); background: rgba(0,0,0,.06) }       /* تمت المراجعة */
.parch { color: var(--text-3); background: transparent; border: 1px dashed var(--border-2) }  /* مؤرشف */
```

---

## 11. الـ Tabs (Segmented control)

```css
.tabs {
  display: inline-flex; gap: 4px;
  background: #fff;
  border-radius: 9999px;
  padding: 4px;
}
.tab {
  padding: 10px 18px;
  border-radius: 9999px;
  font-size: 14px; font-weight: 500;
  background: transparent;
  color: var(--text-3);
}
.tab.on { color: #fff; background: var(--text) }
.tabn { font-size: 11px; padding: 1px 8px; border-radius: 9999px }
```

---

## 12. الـ Progress bar

```css
.prog { height: 3px; background: rgba(0,0,0,.07); border-radius: 9999px }
.prog-fill { background: var(--text); transition: width .4s ease }
.progtext { font-size: 13px; font-weight: 500; color: var(--text-3) }
```

---

## 13. شاشات الـ Loading / Generating

- **Spinner**: `2px solid rgba(0,0,0,.10)` مع `border-top-color: var(--text)`.
- **Gen progress**: نفس الـ `.prog-fill` بس داخل بلوك `.gen-prog`.
- **Copy للـ Stage 2 generation** (عربي): "خطوات بسيطة لاكتشاف اتجاهك" / "أسئلة سريعة تساعدنا نفهم علامتك أكثر."

---

## 14. الـ Logo

- **المصدر**: `LOGO_PRINT` — PNG شفاف بشعار **أسود** (`فك ضغط الـ base64 inline في `index.html`).
- **CSS**: مفيش `filter: invert` — الـ PNG شفاف فبيندمج مع أي خلفية.
- **حجم**: 30px في topbar، 36px في login، 40px في landing.

---

## 15. قاعدة الأرقام (Latin Digits)

> **أي رقم في أي مكان في المنصة يظهر باللاتيني (0-9) — حتى في النسخة العربية.**

التنفيذ:
- `toLatin(s)` — global utility يحوّل Arabic-Indic (٠-٩) و Persian (۰-۹) إلى Latin.
- `normalizeDigitsInDom(root)` — DOM walker بعد كل `render()` يمشي على كل text node + attributes (`aria-label`, `title`, `placeholder`).
- `fmtDate()` يمر على `toLatin()` بعد `toLocaleDateString("ar-EG", ...)`.
- `esc()` و `wEsc()` (للـ Word export) يطبّقوا `toLatin` تلقائيًا.
- الـ input handler يحوّل عند الكتابة في الحقول.

---

## 16. RTL / LTR

- العربي = `dir="rtl"`، الإنجليزي = `dir="ltr"`.
- لوحة الأدمن دايمًا `dir="rtl"` (admin UI عربي).
- في تفاصيل الاستبيان: محتوى البريف بياخد `dir` لغة الاستبيان نفسه (مش لغة الأدمن).

---

## 17. Responsive Breakpoints

```css
@media (max-width: 768px)  /* tablet — تقليل padding */
@media (max-width: 560px)  /* mobile — تقليل خطوط، إخفاء بعض labels */
@media (max-width: 380px)  /* mobile صغير — إخفاء separator وعنوان topbar */
@media (prefers-reduced-motion: reduce) /* إيقاف كل animations */
```

---

## 18. Hierarchy نهائي

التدرّج البصري من أعلى لأسفل (مرتب حسب الأهمية):

```
1. Hero / Display title         — 40–64px Display Bold       (Baybars/Albra)
2. Brand cover / Admin title    — 32–48px Display Bold/Medium
3. Section heading              — 20px Body Medium 500       (Rakik/Sunset)
4. Question (.q)                — 22px Body Medium 500
5. Selected option              — 15px Body Medium 500 + fill
6. Unselected option            — 15px Body Light 300
7. Body running text            — 14–15px Body Light 300
8. Stage intro / scaffold       — 14px Body Light 300        (text-3)
9. Small caption / required mk  — 11–13px Body Light 300
```

---

## 19. Components مرجعية للـ HTML

```html
<!-- Pill primary CTA -->
<button class="cta"><span>التالي</span></button>

<!-- Ghost secondary -->
<button class="ghost"><span>السابق</span></button>

<!-- Eyebrow / Section label -->
<div class="eyebrow"><span class="dot"></span><span>القسم</span></div>

<!-- Stat card -->
<div class="stat">
  <div class="n">12</div>
  <div class="l">نماذج نشطة</div>
</div>

<!-- Tab row -->
<div class="tabs">
  <button class="tab on">النشطة <span class="tabn">12</span></button>
  <button class="tab">الأرشيف <span class="tabn">3</span></button>
</div>

<!-- Sub card (admin list item) -->
<div class="subcard">
  <div class="subinfo">
    <div class="subname">اسم العلامة</div>
    <div class="submeta">24 يونيو 2026</div>
  </div>
  <span class="pill pnew">جديد</span>
</div>
```

---

## 20. مبادئ التصميم (Design Principles)

1. **Whitespace is king** — مساحات سخية، مفيش حشو.
2. **بطاقة داخل صفحة** — كروت بيضاء على خلفية رمادية، الفصل بالخلفية لا بالحدود.
3. **Pill buttons دايمًا** — `border-radius: 9999` لكل الأزرار و chips التفاعلية.
4. **Light/Medium contrast** — وزنين فقط من Rakik، يبنوا التدرّج (Light للنصوص، Medium للـ labels).
5. **الأزرق mute** — accent ناعم فقط، مش لون رئيسي.
6. **Negative letter-spacing** على العناوين الإنجليزية الكبيرة فقط؛ العربي صفر.
7. **No heavy shadows** — `box-shadow` خفيف جدًا أو معدوم.
8. **أرقام لاتينية في كل مكان** — حتى في العربي.
9. **Section labels** — كل قسم يبدأ بـ `• Label` صغير.
10. **Loading copy دافئة** — لغة بسيطة شخصية، مش transactional.

---

_آخر تحديث: 2026-06-30 — branch `claude/friendly-allen-2n6grd`_
