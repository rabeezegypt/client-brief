// Two generation modes, one endpoint.
//
//   mode: 'direction-seed' → single Anthropic call producing Stage 2 (the
//     "Direction Seed"). 4 quick chip-style questions generated entirely from
//     the Stage 1 inputs (no static option banks, no sector templates).
//
//   mode: 'strategic' (default) → the existing flow that fans out 7 strategic
//     stages in parallel. When the client passes the answered direction-seed
//     it becomes additional context for these stages.
//
// On 'direction-seed' we also try to peek at the brand's homepage (title, meta
// description, first H1) inside a tight timeout. The model decides whether the
// site actually matches the project and uses it as a soft signal — or ignores
// it. We never block the response on a slow site.

const SITE_FETCH_TIMEOUT_MS = 4500;
const SITE_MAX_BYTES = 64 * 1024;

async function fetchSiteHint(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string') return { status: 'not_provided' };
  let url = rawUrl.trim();
  if (!url) return { status: 'not_provided' };
  if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
  let u;
  try { u = new URL(url); } catch (e) { return { status: 'unreachable', url: rawUrl }; }

  const ctrl = new AbortController();
  const timer = setTimeout(function () { ctrl.abort(); }, SITE_FETCH_TIMEOUT_MS);
  try {
    const r = await fetch(u.toString(), {
      method: 'GET',
      redirect: 'follow',
      signal: ctrl.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 (RabeezBriefBot/1.0)' }
    });
    clearTimeout(timer);
    if (!r.ok) return { status: 'unreachable', url: u.toString(), httpStatus: r.status };

    // Read at most SITE_MAX_BYTES bytes — the head section is all we need.
    const reader = r.body && r.body.getReader ? r.body.getReader() : null;
    let html = '';
    if (reader) {
      const dec = new TextDecoder('utf-8', { fatal: false });
      let total = 0;
      while (total < SITE_MAX_BYTES) {
        const { value, done } = await reader.read();
        if (done) break;
        total += value.byteLength;
        html += dec.decode(value, { stream: true });
        if (/<\/head>/i.test(html)) break;
      }
      try { reader.cancel(); } catch (e) {}
    } else {
      html = (await r.text()).slice(0, SITE_MAX_BYTES);
    }

    const pick = function (re) { const m = html.match(re); return m ? m[1].replace(/\s+/g, ' ').trim() : ''; };
    return {
      status: 'reachable',
      url: u.toString(),
      title: pick(/<title[^>]*>([\s\S]*?)<\/title>/i).slice(0, 220),
      description: pick(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i).slice(0, 320),
      h1: pick(/<h1[^>]*>([\s\S]*?)<\/h1>/i).replace(/<[^>]+>/g, '').slice(0, 220),
      ogTitle: pick(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i).slice(0, 220),
      ogDescription: pick(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i).slice(0, 320)
    };
  } catch (e) {
    clearTimeout(timer);
    return { status: 'unreachable', url: rawUrl, error: String(e.message || e) };
  }
}

function summarizeDirectionSeed(seed, lang) {
  if (!seed || typeof seed !== 'object') return 'not_collected';
  var ar = lang === 'ar';
  var L = ar
    ? { trigger: 'سبب التحرك', scope: 'نوع التغيير', shift: 'الانتقال المطلوب', priority: 'الأولوية الأكبر' }
    : { trigger: 'Trigger', scope: 'Change scope', shift: 'Desired shift', priority: 'Top priority' };
  var lines = [];
  if (Array.isArray(seed.rebrandTrigger) && seed.rebrandTrigger.length) lines.push(L.trigger + ': ' + seed.rebrandTrigger.join(' | '));
  if (seed.changeScope) lines.push(L.scope + ': ' + seed.changeScope);
  if (seed.perceptionShift) lines.push(L.shift + ': ' + seed.perceptionShift);
  if (seed.mainPriority) lines.push(L.priority + ': ' + seed.mainPriority);
  return lines.length ? lines.join('\n') : 'not_collected';
}

function buildDirectionSeedTool() {
  return {
    name: 'submit_direction_seed',
    description: 'Submit the 4 Stage 2 direction-seed questions, generated entirely from the Stage 1 inputs.',
    input_schema: {
      type: 'object',
      properties: {
        title_ar: { type: 'string' },
        title_en: { type: 'string' },
        signals_used: { type: 'array', items: { type: 'string' }, description: 'Internal — which Stage 1 signals shaped the options (e.g. "newcomer-2024", "small-team", "site-reachable-matches"). Never shown to the user.' },
        notes: { type: 'string', description: 'Internal Creative Director notes. Not shown to the user.' },
        questions: {
          type: 'array',
          minItems: 4,
          maxItems: 4,
          items: {
            type: 'object',
            properties: {
              id: { type: 'string', enum: ['s2_rebrand_trigger', 's2_change_scope', 's2_perception_shift', 's2_main_priority'] },
              q_ar: { type: 'string' },
              q_en: { type: 'string' },
              single: { type: 'boolean', description: 'true for radio-style single-select; false for chip multi-select.' },
              options_ar: { type: 'array', minItems: 5, maxItems: 7, items: { type: 'string' } },
              options_en: { type: 'array', minItems: 5, maxItems: 7, items: { type: 'string' } },
              other: { type: 'boolean', description: 'true to allow a free-text "Other" entry (max 80 chars).' }
            },
            required: ['id', 'q_ar', 'q_en', 'single', 'options_ar', 'options_en']
          }
        }
      },
      required: ['title_ar', 'title_en', 'questions']
    }
  };
}

function buildStrategicTool() {
  return {
    name: 'submit_stage',
    description: 'Submit the generated brand-discovery questions for ONE stage',
    input_schema: {
      type: 'object',
      properties: {
        title_ar: { type: 'string' },
        title_en: { type: 'string' },
        questions: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              q_ar: { type: 'string' },
              q_en: { type: 'string' },
              type: { type: 'string', enum: ['multi', 'scale', 'textarea'] },
              options_ar: { type: 'array', items: { type: 'string' } },
              options_en: { type: 'array', items: { type: 'string' } },
              other: { type: 'boolean' },
              help_why_ar: { type: 'string' },
              help_why_en: { type: 'string' },
              help_ex_ar: { type: 'string' },
              help_ex_en: { type: 'string' },
              golden: { type: 'boolean' }
            },
            required: ['id', 'q_ar', 'q_en', 'type']
          }
        }
      },
      required: ['title_ar', 'title_en', 'questions']
    }
  };
}

const DIRECTION_SEED_SYSTEM =
  'You are a Creative Director at Rabeez branding agency, designing Stage 2 of a brand-discovery form. Stage 2 is a *Direction Seed* — fast, lightweight choices that surface the client\'s general intuition about the rebrand. It is NOT a detailed brief. Later stages cover the strategic depth.\n\n'
  + 'Generate exactly 4 questions, fixed ids in this order: s2_rebrand_trigger (multi-select chips, set single:false), s2_change_scope (single-select, single:true), s2_perception_shift (single-select, single:true), s2_main_priority (single-select, single:true).\n\n'
  + 'EVERY option must be invented FROM the client\'s Stage 1 data — their brand name, the industry they wrote, founding year, team size, location, and (if the website was reachable AND clearly matches the project) the homepage title/description/H1. Do NOT pull options from a fixed bank, do NOT use sector templates, do NOT default to generic categories. Read the inputs first, infer the client\'s likely situation, then write options that fit THIS brand.\n\n'
  + 'Creative Director judgment for inference:\n'
  + ' • A brand many years old likely carries reputation/legacy concerns to handle gently.\n'
  + ' • A young brand more likely wants to crystallize a first impression or correct an early start.\n'
  + ' • A small team may need trust, clarity, presence; a large team may need consistency and a system.\n'
  + ' • If the website was reachable and looks aligned with the project, treat it as a soft signal of current style/clarity; if mismatched or unreachable, IGNORE site content.\n'
  + ' • Do not invent details the data does not support; when data is thin, write more neutral options.\n\n'
  + 'OPTIONS — write 5-7 short, plain-language options per question. Every option ends in the option list with "غير متأكد" (or "Not sure" in English) as the LAST option. Set other:true on every question so the client can add an 80-char free-text alternative. Order options from most likely (based on inputs) to least likely; the "Not sure" option is always last and is the only exception to that ordering.\n\n'
  + 'DO NOT ask about: target audience details, competitors, brand values, mission/vision, brand personality, logo/colour problems in detail, applications/touchpoints, tone of voice. Those belong to later stages. Keep options short, distinct, non-leading, and free of strategy jargon.\n\n'
  + 'Q2 must distinguish degrees of change (light tweak vs major reinvention vs exploration). Q3 must read as transitions ("from X to Y" feel) shaped by what the data suggests the client may want to move toward. Q4 must be high-level priorities (trust, clarity, first impression, growth, consistency, expansion, distinction) chosen by reading the data — not all of them.\n\n'
  + 'ARABIC QUALITY — flawless: formal فصحى in the singular second-person voice; perfect spelling, orthography, and grammar. Proofread every Arabic string before submitting. Every option must be a real, complete, correctly spelled phrase.\n\n'
  + 'Use the submit_direction_seed tool.';

async function callDirectionSeed({ brandName, activity, lang, foundedYear, teamSize, location, social, siteHint, langName }) {
  const userMsg =
    'Stage 1 inputs from the client:\n'
    + '- Brand name: ' + brandName + '\n'
    + '- Industry/field: ' + (activity || 'unspecified') + '\n'
    + '- Founded: ' + (foundedYear || 'not provided') + '\n'
    + '- Team size: ' + (teamSize || 'not provided') + '\n'
    + '- Location/market: ' + (location || 'not provided') + '\n'
    + '- Social accounts: ' + (social || 'not provided') + '\n'
    + '- Website validation: ' + JSON.stringify(siteHint) + '\n'
    + '\nAssess whether the website (if any) matches the project. If clearly mismatched or empty, ignore site content and rely on the typed inputs only.\n'
    + '\nPrimary form language: ' + langName + '.\n'
    + '\nGenerate the 4 Direction Seed questions now using submit_direction_seed. Personalize the options to THIS brand by reading the inputs first; do not start from a template.';

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 2200,
      system: DIRECTION_SEED_SYSTEM,
      tools: [buildDirectionSeedTool()],
      tool_choice: { type: 'tool', name: 'submit_direction_seed' },
      messages: [{ role: 'user', content: userMsg }]
    })
  });
  if (!response.ok) {
    const detail = await response.text();
    const err = new Error('Anthropic ' + response.status);
    err.status = response.status; err.detail = detail;
    throw err;
  }
  const data = await response.json();
  let toolInput = null;
  for (const block of data.content) {
    if (block.type === 'tool_use') { toolInput = block.input; break; }
  }
  if (!toolInput || !Array.isArray(toolInput.questions) || toolInput.questions.length !== 4) {
    throw new Error('Bad direction-seed tool output');
  }

  // Always force the "Not sure" option at the END of every option list, in both
  // languages — keep it client-side too as a defensive measure.
  const NOT_SURE = { ar: 'غير متأكد', en: 'Not sure' };
  toolInput.questions.forEach(function (q) {
    function ensureLast(arr, w) {
      if (!Array.isArray(arr)) return;
      const norm = function (s) { return String(s || '').trim().toLowerCase(); };
      const i = arr.findIndex(function (s) { return norm(s) === norm(w); });
      if (i >= 0) arr.splice(i, 1);
      arr.push(w);
    }
    ensureLast(q.options_ar, NOT_SURE.ar);
    ensureLast(q.options_en, NOT_SURE.en);
    if (q.other !== true) q.other = true;
  });

  return toolInput;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const body = req.body || {};
  const { brandName, activity, lang, mode } = body;
  const langName = lang === 'en' ? 'English' : 'Arabic';

  if (!brandName) {
    return res.status(400).json({ error: 'Missing brandName' });
  }

  // ── direction-seed: produce Stage 2 only ─────────────────────────
  if (mode === 'direction-seed') {
    const foundedYear = body.foundedYear || '';
    const teamSize = body.teamSize || '';
    const location = body.location || '';
    const social = body.social || '';
    const website = body.website || '';

    const siteHint = website ? await fetchSiteHint(website) : { status: 'not_provided' };
    try {
      const stage = await callDirectionSeed({ brandName, activity, lang, foundedYear, teamSize, location, social, siteHint, langName });
      return res.status(200).json({ stage: stage, siteHint: siteHint });
    } catch (err) {
      return res.status(500).json({ error: 'Generation failed', detail: String(err.message || err) });
    }
  }

  // ── strategic: 7 stages, optionally enriched by direction-seed ───
  const STAGE_SPECS = [
    { id: 's_why',         title_ar: 'لماذا الآن؟',                 title_en: 'Why now?',                       focus: 'The real trigger behind the rebrand, what has stopped working in the current brand, the cost of doing nothing, and what success looks like afterwards.' },
    { id: 's_audience',    title_ar: 'الجمهور والسوق',              title_en: 'Audience & market',              focus: 'Who the core audience really is, the main segments, an aspirational audience not yet reached, and where the brand sits in its market.' },
    { id: 's_competition', title_ar: 'المنافسة والتمايز',           title_en: 'Competition & differentiation',  focus: 'The competitive landscape, what genuinely sets this brand apart, and the unclaimed gap in the market it could own.' },
    { id: 's_gap',         title_ar: 'الفجوة الاستراتيجية',         title_en: 'The strategic gap',              focus: 'How the brand is perceived today versus how it wants to be perceived, its desired personality, and the emotional shift required.' },
    { id: 's_value',       title_ar: 'القيمة والوعد',               title_en: 'Value & promise',                focus: 'The core value proposition, the brand promise to customers, the key messages, and the reasons customers should believe them.' },
    { id: 's_equity',      title_ar: 'ما نحافظ عليه وما نتخلّص منه',  title_en: 'Keep & drop',                    focus: 'Which brand assets and equity must be protected, which elements should be dropped, and how recognizable the current brand already is.' },
    { id: 's_decision',    title_ar: 'القرار والقيود والرؤية',       title_en: 'Decision, constraints & vision', focus: 'Who the decision-makers are, any red lines or constraints, and the long-term vision for where the brand is heading.' }
  ];

  const arc = STAGE_SPECS.map(function (s, i) { return (i + 1) + '. ' + s.title_en + ' (' + s.title_ar + ')'; }).join(' | ');
  const directionSeed = body.directionSeed || null;
  const seedSummary = summarizeDirectionSeed(directionSeed, lang);

  const SYSTEM = "You are a Creative Director and brand strategist at Rabeez branding agency. You design brand-discovery questions that are deeply strategic: every question must surface an insight a strategist can later analyze to shape positioning, messaging, and visual direction — never generic or superficial. Tailor every question precisely to the client's industry and to the Stage 2 direction seed they have already chosen. Do not ask for basic facts already on file (brand name, industry, founding year, contact details, social links). Do not re-ask any Stage 2 direction-seed question.\n\nWORDING — keep it simple: phrase every question and every option in plain, everyday language that a busy business owner understands instantly. Use short, direct sentences and common words. No marketing jargon, no abstract strategist vocabulary, no compound or convoluted phrasing. The strategy lives in WHAT you ask, never in complicated wording. If a question needs re-reading to be understood, rewrite it more simply.\n\nARABIC QUALITY — must be flawless: all Arabic (questions, options, help text) is formal فصحى in the singular second-person voice, with perfect spelling and orthography (correct hamza ء/أ/إ/ئ/ؤ, تاء مربوطة vs هاء, ألف مقصورة vs ياء), sound grammar, and natural phrasing. Proofread every Arabic string before submitting — never output a word with a typo, a missing or extra letter, or a malformed word. Every option must be a real, complete, correctly spelled Arabic phrase.\n\nGenerate exactly ONE stage with exactly 3 questions. Keep every field tight and economical: each question is one sentence; help_why_* is a single short clause of at most 12 words. For multi and scale questions provide options_ar and options_en as exactly 4 matching items each; textarea questions take no options. Provide help_ex_* (one short concrete example, at most 20 words) ONLY for the single golden question, and omit help_ex entirely on the other two questions. Set golden:true on the single most strategically revealing question. Set other:true on every multi question. Question ids must be unique. Always use the submit_stage tool.";

  const tool = buildStrategicTool();

  async function callStage(spec, idx) {
    const userMsg = 'Client brand: ' + brandName + '\n'
      + 'Industry: ' + (activity || 'unspecified') + '\n'
      + 'Primary language: ' + langName + '\n'
      + 'Stage 2 direction seed (already collected — do not re-ask):\n' + seedSummary + '\n\n'
      + 'This brief has 7 strategic stages: ' + arc + '\n'
      + 'Generate ONLY stage ' + (idx + 1) + ' — "' + spec.title_en + '" (' + spec.title_ar + ').\n'
      + 'Focus of this stage: ' + spec.focus + '\n'
      + 'Use the exact stage titles title_ar="' + spec.title_ar + '" and title_en="' + spec.title_en + '". Prefix every question id with "' + spec.id + '_".';

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1500,
        system: SYSTEM,
        tools: [tool],
        tool_choice: { type: 'tool', name: 'submit_stage' },
        messages: [{ role: 'user', content: userMsg }]
      })
    });

    if (!response.ok) {
      const detail = await response.text();
      const err = new Error('Anthropic ' + response.status);
      err.status = response.status;
      const ra = parseFloat(response.headers.get('retry-after'));
      err.retryAfter = isNaN(ra) ? null : ra;
      err.detail = detail;
      throw err;
    }

    const data = await response.json();
    let toolInput = null;
    for (const block of data.content) {
      if (block.type === 'tool_use') { toolInput = block.input; break; }
    }
    if (!toolInput || !Array.isArray(toolInput.questions) || !toolInput.questions.length) {
      throw new Error('No tool output for stage ' + spec.id);
    }
    toolInput.title_ar = toolInput.title_ar || spec.title_ar;
    toolInput.title_en = toolInput.title_en || spec.title_en;
    return { idx: idx, stage: toolInput };
  }

  async function genStageRetry(spec, idx) {
    try {
      return await callStage(spec, idx);
    } catch (e) {
      const waitS = e.status === 429 ? Math.min(e.retryAfter || 6, 10) : 1.5;
      await new Promise(function (r) { setTimeout(r, waitS * 1000); });
      return await callStage(spec, idx);
    }
  }

  const only = body.only;
  const idxList = (Array.isArray(only) && only.length)
    ? only.filter(function (i) { return Number.isInteger(i) && i >= 0 && i < STAGE_SPECS.length; })
    : STAGE_SPECS.map(function (s, i) { return i; });

  try {
    const settled = await Promise.allSettled(idxList.map(function (i) { return genStageRetry(STAGE_SPECS[i], i); }));
    const stages = settled
      .filter(function (r) { return r.status === 'fulfilled'; })
      .map(function (r) { return r.value; })
      .sort(function (a, b) { return a.idx - b.idx; })
      .map(function (r) { r.stage._idx = r.idx; return r.stage; });

    if (!stages.length) {
      const firstErr = settled.find(function (r) { return r.status === 'rejected'; });
      return res.status(500).json({ error: 'Generation failed', detail: firstErr ? String(firstErr.reason) : 'unknown' });
    }

    return res.status(200).json({ stages: stages });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
