// ============================================
// SYSTEM PROMPT — applies to all explanations
// ============================================

export const SYSTEM_PROMPT = `Ești un profesor de medicină specializat în pregătirea studenților pentru examenul de rezidențiat din România.

Reguli stricte:
- Răspunde DOAR în limba română
- Folosește terminologia medicală română standard, așa cum apare în manualele românești: Kumar și Clark Medicina Clinică, Sinopsis de Medicină, Chirurgie Generală și Specialități Chirurgicale
- Preferă termenii români în locul traducerilor literale din engleză
- Nu inventa informații. Dacă nu ești sigur, oferă cea mai bună explicație posibilă și adaugă la final: "Această explicație se bazează pe cunoștințe medicale generale și poate să nu reflecte exact conținutul manualului. Te rugăm să verifici în manual pentru informații precise."
- Fii scurt și direct — studenții se pregătesc pentru un examen
- Nu repeta aceleași informații în secțiuni diferite
- Ton: clar, cald, educațional — ca un profesor bun care vrea ca studentul să promoveze`

export const DRILL_SYSTEM_PROMPT = `Ești un profesor de medicină care face reinforcement rapid pentru examenul de rezidențiat.

Reguli:
- Răspunde DOAR în limba română
- Scurt, direct, eficient — ca un flashcard
- Folosește terminologia medicală română standard
- Poți folosi cunoștințe medicale generale — nu te limita la un manual specific
- Ton: direct, fără introduceri lungi`

// ============================================
// HELPER
// ============================================

function formatOptions(options: Record<string, string>): string {
  return Object.entries(options)
    .map(([key, value]) => `${key.toUpperCase()}: ${value}`)
    .join('\n')
}

function getMistakeTag(confidence: number): string {
  return confidence >= 3 ? 'Confuzie de concept' : 'Lipsă de cunoștințe'
}

function getEmphasisInstruction(confidence: number): string {
  return confidence >= 3
    ? 'Pune accent mai mare pe partea "de_ce_gresit" — explică în detaliu de ce răspunsul ales părea plauzibil dar este greșit. Acesta este un caz de confuzie de concept.'
    : 'Pune accent mai mare pe partea "de_ce_corect" — explică conceptul de la zero, presupunând că studentul nu l-a studiat suficient. Acesta este un caz de lipsă de cunoștințe.'
}

// ============================================
// PRACTICE EXPLANATIONS
// ============================================

export function buildConceptualSimpluPrompt({
  questionText,
  options,
  correctOption,
  selectedOption,
  confidence,
  sursa,
}: {
  questionText: string
  options: Record<string, string>
  correctOption: string
  selectedOption: string
  confidence: number
  sursa: string | null
}) {
  return `${SYSTEM_PROMPT}

Întrebare: ${questionText}

Variante:
${formatOptions(options)}

Studentul a ales: ${selectedOption.toUpperCase()} (GREȘIT)
Răspunsul corect: ${correctOption.toUpperCase()}
Tip greșeală: ${getMistakeTag(confidence)}

${getEmphasisInstruction(confidence)}

Generează explicația în următorul format JSON:
{
  "mistake_tag": "${getMistakeTag(confidence)}",
    "ce_se_testeaza": "O propoziție care numește conceptul testat.",
  "de_ce_corect": "2-3 propoziții explicând de ce răspunsul corect este corect.",
  "de_ce_gresit": "Explicație de ce răspunsul ales este greșit — misconceptia specifică.",
  "retine": "O regulă scurtă sau un memento ușor de reținut.",
  "sursa": "${sursa ?? 'Informație indisponibilă'}"
}

Răspunde DOAR cu JSON. Niciun text înainte sau după.`
}

export function buildConceptualMultipluPrompt({
  questionText,
  options,
  correctOptions,
  selectedOptions,
  confidence,
  sursa,
}: {
  questionText: string
  options: Record<string, string>
  correctOptions: string[]
  selectedOptions: string[]
  confidence: number
  sursa: string | null
}) {
  const missedOptions = correctOptions.filter(o => !selectedOptions.includes(o))
  const wronglySelected = selectedOptions.filter(o => !correctOptions.includes(o))

  return `${SYSTEM_PROMPT}

Întrebare: ${questionText}

Variante:
${formatOptions(options)}

Răspunsuri corecte: ${correctOptions.map(o => o.toUpperCase()).join(', ')}
Studentul a ales: ${selectedOptions.map(o => o.toUpperCase()).join(', ')}
Variante ratate (corecte dar neselectate): ${missedOptions.map(o => o.toUpperCase()).join(', ') || 'niciuna'}
Variante greșit selectate: ${wronglySelected.map(o => o.toUpperCase()).join(', ') || 'niciuna'}
Tip greșeală: ${getMistakeTag(confidence)}

${getEmphasisInstruction(confidence)}

Generează explicația în următorul format JSON:
{
  "mistake_tag": "${getMistakeTag(confidence)}",
    "ce_se_testeaza": "O propoziție despre conceptul unificator testat.",
  "analiza_variantelor": {
    "a": "De ce A este corectă/greșită.",
    "b": "De ce B este corectă/greșită.",
    "c": "De ce C este corectă/greșită.",
    "d": "De ce D este corectă/greșită.",
    "e": "De ce E este corectă/greșită (dacă există, altfel null)."
  },
  "de_ce_gresit": "Focusat pe variantele pe care le-ai ratat și cele greșit selectate — ce ai confundat specific.",
  "retine": "O regulă scurtă sau un memento ușor de reținut.",
  "sursa": "${sursa ?? 'Informație indisponibilă'}"
}

Răspunde DOAR cu JSON. Niciun text înainte sau după.`
}

export function buildFactualSimpluPrompt({
  questionText,
  options,
  correctOption,
  selectedOption,
  sursa,
}: {
  questionText: string
  options: Record<string, string>
  correctOption: string
  selectedOption: string
  sursa: string | null
}) {
  return `${SYSTEM_PROMPT}

Întrebare: ${questionText}

Variante:
${formatOptions(options)}

Studentul a ales: ${selectedOption.toUpperCase()} (GREȘIT)
Răspunsul corect: ${correctOption.toUpperCase()}

Generează explicația în următorul format JSON:
{
    "informatia_corecta": "Faptul medical corect enunțat clar și precis.",
  "de_ce_conteaza": "Context clinic scurt — de ce este important acest fapt în practică.",
  "retine": "Un memento sau regulă mnemonică ușor de reținut."
  "sursa": "${sursa ?? 'Informație indisponibilă'}"
}

Răspunde DOAR cu JSON. Niciun text înainte sau după.`
}

export function buildFactualMultipluPrompt({
  questionText,
  options,
  correctOptions,
  selectedOptions,
  sursa,
}: {
  questionText: string
  options: Record<string, string>
  correctOptions: string[]
  selectedOptions: string[]
  sursa: string | null
}) {
  const missedOptions = correctOptions.filter(o => !selectedOptions.includes(o))
  const wronglySelected = selectedOptions.filter(o => !correctOptions.includes(o))

  return `${SYSTEM_PROMPT}

Întrebare: ${questionText}

Variante:
${formatOptions(options)}

Răspunsuri corecte: ${correctOptions.map(o => o.toUpperCase()).join(', ')}
Studentul a ales: ${selectedOptions.map(o => o.toUpperCase()).join(', ')}
Variante ratate: ${missedOptions.map(o => o.toUpperCase()).join(', ') || 'niciuna'}
Variante greșit selectate: ${wronglySelected.map(o => o.toUpperCase()).join(', ') || 'niciuna'}

Generează explicația în următorul format JSON:
{
    "analiza_variantelor": {
    "a": "Faptul medical + de ce A este corectă/greșită.",
    "b": "Faptul medical + de ce B este corectă/greșită.",
    "c": "Faptul medical + de ce C este corectă/greșită.",
    "d": "Faptul medical + de ce D este corectă/greșită.",
    "e": "Faptul medical + de ce E este corectă/greșită (dacă există, altfel null)."
  },
  "retine": "Un memento care grupează faptele corecte împreună."
  "sursa": "${sursa ?? 'Informație indisponibilă'}"
}

Răspunde DOAR cu JSON. Niciun text înainte sau după.`
}

// ============================================
// FOLLOW-UP PROMPTS
// ============================================

export function buildFollowUpExplicaMaiSimplu({
  originalExplanation,
}: {
  originalExplanation: string
}) {
  return `${SYSTEM_PROMPT}

Studentul a primit această explicație și a cerut o versiune mai simplă:
${originalExplanation}

Explică același concept mai simplu, folosind un limbaj mai accesibil și dacă e posibil o analogie.
Răspunde direct în română, fără JSON, maximum 4 propoziții.`
}

export function buildFollowUpCelelalteGresite({
  questionText,
  options,
  correctOption,
}: {
  questionText: string
  options: Record<string, string>
  correctOption: string
}) {
  return `${SYSTEM_PROMPT}

Întrebare: ${questionText}

Variante:
${formatOptions(options)}

Răspunsul corect: ${correctOption.toUpperCase()}

Explică pe scurt de ce fiecare variantă greșită este incorectă. O propoziție clară per variantă.
Răspunde direct în română, fără JSON.`
}

export function buildFollowUpRegulaGenerala({
  questionText,
}: {
  questionText: string
}) {
  return `${SYSTEM_PROMPT}

Bazat pe această întrebare: ${questionText}

Care este regula generală sau pattern-ul clinic care ajută la rezolvarea acestui tip de întrebare?
Gândește ca un medic cu experiență care explică un pattern unui student.
Folosește raționament medical general — nu te limita la manual.
Răspunde direct în română, fără JSON, maximum 3 propoziții.`
}

// ============================================
// DRILL PROMPTS
// ============================================

export function buildDrillExplanationPrompt({
  questionText,
  options,
  correctOption,
  selectedOption,
  drillAngle,
}: {
  questionText: string
  options: Record<string, string>
  correctOption: string
  selectedOption: string
  drillAngle: 'definition' | 'mechanism' | 'clinical' | 'comparison' | 'reverse'
}) {
  const angleInstructions = {
    definition: 'Enunță definiția clar și direct.',
    mechanism: 'Explică mecanismul ca un lanț cauzal simplu.',
    clinical: 'Focusează pe pattern-ul clinic: când vezi X, gândești Y.',
    comparison: 'Evidențiază diferența cheie dintre conceptele comparate.',
    reverse: 'Explică raționamentul invers: dacă răspunsul este X, întrebarea era despre Y.',
  }

  return `${DRILL_SYSTEM_PROMPT}

Întrebare: ${questionText}
Variante: ${Object.entries(options).map(([k, v]) => `${k.toUpperCase()}: ${v}`).join(' | ')}
Studentul a ales: ${selectedOption.toUpperCase()} (GREȘIT)
Răspunsul corect: ${correctOption.toUpperCase()}
Tipul întrebării: ${drillAngle}

${angleInstructions[drillAngle]}

Generează în format JSON:
{
  "ce_ai_raspuns": "Ai ales [X] (✗). Răspunsul corect este [Y] (✓).",
  "de_ce_corect": "2-3 propoziții scurte și directe.",
  "retine": "O regulă sau memento scurt și memorabil."
}

Răspunde DOAR cu JSON. Niciun text înainte sau după.`
}

export function buildDrillGenerationPrompt({
  conceptName,
  conceptNameEn,
  keyExcerpt,
  subchapterContext,
  drillSetId,
}: {
  conceptName: string
  conceptNameEn: string
  keyExcerpt: string | null
  subchapterContext: string
  drillSetId: number
}) {
  const excerptSection = keyExcerpt
    ? `\nContext din manual:\n"${keyExcerpt}"\n`
    : ''

  return `${DRILL_SYSTEM_PROMPT}

Generează exact 5 întrebări de drill pentru conceptul: "${conceptName}"${conceptNameEn ? ` (${conceptNameEn})` : ''}.

Surse bibliografice:
${subchapterContext}
${excerptSection}
Setul de drill: ${drillSetId} din 3. Dacă generezi set 2 sau 3, variază formularea și abordarea față de seturile anterioare.

Cerințe stricte:
- O întrebare pentru fiecare unghi: definition, mechanism, clinical, comparison, reverse
- Alege question_type (simplu/multiplu) pe baza pedagogiei — nu un split fix
- Fiecare întrebare are exact 4 variante (A, B, C, D), toate plauzibile medical
- Explicații scurte: 2-3 propoziții, focalizate pe reinforcement
- "retine" este un hook de memorie — concis, diferit de explicație
- Pentru multiplu: correct_options conține toate literele corecte ex: ["a","c"]
- Pentru simplu: correct_options conține exact o literă ex: ["b"]
- Limbă română medicală standard


Răspunde DOAR cu array JSON valid, fără text înainte sau după, fără backticks:
[
  {
    "drill_angle": "definition",
    "question_type": "simplu",
    "question_text": "...",
    "option_a": "...",
    "option_b": "...",
    "option_c": "...",
    "option_d": "...",
    "correct_options": ["a"],
    "explanation": "2-3 propoziții de reinforcement.",
    "retine": "Memento scurt."
  }
]`
}