import { useState, useEffect, useCallback } from "react";

// ─── CONFIG ──────────────────────────────────────────────────────────────────
const GEMINI_KEY = "AIzaSyDv6ijhT_Old79sCr58BW5vFBSbPUDbztQ";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_KEY}`;

// ─── GEMINI CALL ─────────────────────────────────────────────────────────────
const callGemini = async (prompt) => {
  const res = await fetch(GEMINI_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.7, maxOutputTokens: 4000 },
    }),
  });
  const data = await res.json();
  return data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
};

const parseJSON = (text) => {
  try {
    const clean = text.replace(/```json|```/g, "").trim();
    const s = clean.indexOf("{"), e = clean.lastIndexOf("}");
    return JSON.parse(clean.slice(s, e + 1));
  } catch { return null; }
};

// ─── STORAGE ─────────────────────────────────────────────────────────────────
const save = (k, v) => { try { localStorage.setItem("vertix_" + k, JSON.stringify(v)); } catch {} };
const load = (k, def) => { try { const v = localStorage.getItem("vertix_" + k); return v ? JSON.parse(v) : def; } catch { return def; } };

// ─── THEME ───────────────────────────────────────────────────────────────────
const C = {
  bg: "#080c0a", bgCard: "#0f1410", bgCard2: "#141a15",
  border: "#1a2318", borderHover: "#253020",
  green: "#3ddc84", greenDim: "#1f6b40", greenBg: "#0a1f10",
  amber: "#f5a623", amberBg: "#1a1200",
  red: "#e05555", redBg: "#1a0a0a",
  blue: "#5aaeff", blueBg: "#081525",
  purple: "#a78bfa", purpleBg: "#120d25",
  text: "#dff0e5", textMuted: "#5a7a60", textDim: "#2a3d2e",
};

const DAYS = ["Lunes","Martes","Miércoles","Jueves","Viernes","Sábado","Domingo"];
const DAY_KEYS = ["lunes","martes","miercoles","jueves","viernes","sabado","domingo"];

// ─── GLOBAL STYLES ───────────────────────────────────────────────────────────
const GlobalStyle = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=DM+Mono:ital,wght@0,400;0,500;1,400&family=Outfit:wght@300;400;500;600;700;800&display=swap');
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    html { background: ${C.bg}; }
    body { background: ${C.bg}; color: ${C.text}; font-family: 'Outfit', sans-serif; min-height: 100vh; }
    ::-webkit-scrollbar { width: 4px; height: 4px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background: ${C.border}; border-radius: 4px; }
    input, select, textarea, button { font-family: 'Outfit', sans-serif; }
    input[type=range] { accent-color: ${C.green}; cursor: pointer; width: 100%; }
    @keyframes fadeUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
    @keyframes fadeIn { from { opacity:0; } to { opacity:1; } }
    @keyframes spin { to { transform: rotate(360deg); } }
    @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.3} }
    @keyframes shimmer { 0%{background-position:-400px 0} 100%{background-position:400px 0} }
    @keyframes glow { 0%,100%{box-shadow:0 0 0 0 ${C.green}30} 50%{box-shadow:0 0 16px 4px ${C.green}20} }
    .fadeUp { animation: fadeUp .35s ease both; }
    .fadeIn { animation: fadeIn .25s ease both; }
    .spin { animation: spin 1s linear infinite; }
    .pulse { animation: pulse 2s ease infinite; }
    .glow { animation: glow 2.5s ease infinite; }
    .skeleton { background: linear-gradient(90deg, ${C.bgCard2} 25%, ${C.border} 50%, ${C.bgCard2} 75%); background-size: 400px 100%; animation: shimmer 1.5s infinite; border-radius: 6px; }
  `}</style>
);

// ─── UI PRIMITIVES ───────────────────────────────────────────────────────────
const Card = ({ children, style, onClick, hover }) => (
  <div onClick={onClick} style={{
    background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 14,
    padding: "18px 22px", transition: "all .2s",
    cursor: onClick ? "pointer" : "default",
    ...(hover ? { ":hover": { borderColor: C.borderHover } } : {}),
    ...style
  }}>{children}</div>
);

const Label = ({ children }) => (
  <div style={{ fontSize: 10, fontWeight: 600, color: C.textMuted, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 7 }}>{children}</div>
);

const Input = ({ style, ...p }) => (
  <input style={{ background: C.bgCard2, border: `1px solid ${C.border}`, borderRadius: 9, padding: "10px 14px", color: C.text, fontSize: 14, width: "100%", outline: "none", transition: "border .2s", ...style }} {...p} />
);

const Select = ({ children, style, ...p }) => (
  <select style={{ background: C.bgCard2, border: `1px solid ${C.border}`, borderRadius: 9, padding: "10px 14px", color: C.text, fontSize: 14, width: "100%", outline: "none", cursor: "pointer", ...style }} {...p}>{children}</select>
);

const Textarea = ({ style, ...p }) => (
  <textarea style={{ background: C.bgCard2, border: `1px solid ${C.border}`, borderRadius: 9, padding: "10px 14px", color: C.text, fontSize: 14, width: "100%", outline: "none", resize: "vertical", minHeight: 80, ...style }} {...p} />
);

const Btn = ({ children, variant = "primary", style, ...p }) => {
  const base = { border: "none", borderRadius: 9, padding: "11px 24px", fontSize: 14, fontWeight: 600, cursor: "pointer", letterSpacing: "0.04em", transition: "all .2s", display: "inline-flex", alignItems: "center", gap: 7 };
  const variants = {
    primary: { background: C.green, color: C.bg },
    secondary: { background: "transparent", color: C.green, border: `1px solid ${C.greenDim}` },
    ghost: { background: "transparent", color: C.textMuted, border: `1px solid ${C.border}` },
    danger: { background: C.redBg, color: C.red, border: `1px solid #3d1010` },
  };
  return <button style={{ ...base, ...variants[variant], ...style }} {...p}>{children}</button>;
};

const Tag = ({ children, color = "green" }) => {
  const map = { green: [C.greenBg, C.green, C.greenDim], amber: [C.amberBg, C.amber, "#3d2a00"], red: [C.redBg, C.red, "#3d1010"], blue: [C.blueBg, C.blue, "#0d2a40"], purple: [C.purpleBg, C.purple, "#2d1a6d"] };
  const [bg, fg, bd] = map[color] || map.green;
  return <span style={{ background: bg, color: fg, border: `1px solid ${bd}`, borderRadius: 20, padding: "2px 10px", fontSize: 11, fontWeight: 600, letterSpacing: "0.05em", display: "inline-block" }}>{children}</span>;
};

const Metric = ({ label, value, unit, color = C.green, sub }) => (
  <div style={{ background: C.bgCard2, borderRadius: 10, padding: "14px 16px", border: `1px solid ${C.border}` }}>
    <div style={{ fontSize: 10, color: C.textMuted, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 5 }}>{label}</div>
    <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
      <span style={{ fontSize: 22, fontWeight: 700, color, fontFamily: "'DM Mono', monospace" }}>{value ?? "—"}</span>
      {unit && <span style={{ fontSize: 12, color: C.textMuted }}>{unit}</span>}
    </div>
    {sub && <div style={{ fontSize: 11, color: C.textMuted, marginTop: 3 }}>{sub}</div>}
  </div>
);

const Field = ({ label, children, style }) => (
  <div style={{ marginBottom: 16, ...style }}>
    <Label>{label}</Label>
    {children}
  </div>
);

const Grid = ({ cols = 2, gap = 12, children }) => (
  <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, minmax(0,1fr))`, gap }}>{children}</div>
);

const Divider = () => <div style={{ borderTop: `1px solid ${C.border}`, margin: "16px 0" }} />;

// ─── LOADING SCREEN ──────────────────────────────────────────────────────────
const LOAD_MSGS = [
  "Analizando perfil fisiológico...",
  "Calculando periodización ATR...",
  "Distribuyendo carga 80/20...",
  "Generando sesiones adaptativas...",
  "Calculando plan nutricional...",
  "Configurando alertas de riesgo...",
  "Preparando tu dashboard...",
];

function LoadingScreen() {
  const [idx, setIdx] = useState(0);
  const [prog, setProg] = useState(0);
  useEffect(() => {
    const t1 = setInterval(() => setIdx(i => (i + 1) % LOAD_MSGS.length), 1600);
    const t2 = setInterval(() => setProg(p => Math.min(p + 2, 95)), 120);
    return () => { clearInterval(t1); clearInterval(t2); };
  }, []);
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh", gap: 32, padding: 24 }}>
      <div style={{ position: "relative", width: 72, height: 72 }}>
        <div style={{ position: "absolute", inset: 0, borderRadius: "50%", border: `2px solid ${C.border}` }} />
        <div className="spin" style={{ position: "absolute", inset: 0, borderRadius: "50%", border: `2px solid transparent`, borderTopColor: C.green }} />
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, fontWeight: 800, color: C.green }}>V</div>
      </div>
      <div style={{ textAlign: "center", maxWidth: 320 }}>
        <div style={{ fontSize: 15, fontWeight: 500, color: C.text, marginBottom: 6 }}>{LOAD_MSGS[idx]}</div>
        <div style={{ fontSize: 12, color: C.textMuted }}>Generando tu plan personalizado con IA</div>
      </div>
      <div style={{ width: 280 }}>
        <div style={{ background: C.border, borderRadius: 3, height: 4, overflow: "hidden" }}>
          <div style={{ width: `${prog}%`, height: "100%", background: C.green, borderRadius: 3, transition: "width .1s linear" }} />
        </div>
        <div style={{ fontSize: 11, color: C.textMuted, textAlign: "right", marginTop: 5 }}>{prog}%</div>
      </div>
    </div>
  );
}

// ─── ONBOARDING ──────────────────────────────────────────────────────────────
const STEP_TITLES = ["¿Quién eres?", "Tu objetivo", "Disponibilidad", "Estado de hoy"];

function Onboarding({ onComplete }) {
  const [step, setStep] = useState(0);
  const [d, setD] = useState({
    nombre: "", edad: "", peso: "", altura: "", nivel: "principiante",
    vo2max: "", lesiones: "", diasSemana: "4", tiempoSesion: "60",
    gimnasio: "si", terreno: "mixto", objetivo: "trail_10k",
    distancia: "10", desnivel: "800", fechaCarrera: "", semanas: "16",
    hrv: "", rhr: "", sueno: "7", fatiga: "4", dolor: "no",
    ultimosEntrenamientos: "",
  });
  const set = (k, v) => setD(p => ({ ...p, [k]: v }));

  const steps = [
    <>
      <Field label="Nombre o alias"><Input value={d.nombre} onChange={e => set("nombre", e.target.value)} placeholder="¿Cómo te llamamos?" /></Field>
      <Grid><Field label="Edad"><Input type="number" value={d.edad} onChange={e => set("edad", e.target.value)} placeholder="años" /></Field>
      <Field label="Peso"><Input type="number" value={d.peso} onChange={e => set("peso", e.target.value)} placeholder="kg" /></Field></Grid>
      <Grid><Field label="Altura"><Input type="number" value={d.altura} onChange={e => set("altura", e.target.value)} placeholder="cm" /></Field>
      <Field label="Nivel"><Select value={d.nivel} onChange={e => set("nivel", e.target.value)}><option value="principiante">Principiante</option><option value="intermedio">Intermedio</option><option value="avanzado">Avanzado</option><option value="elite">Élite</option></Select></Field></Grid>
      <Field label="VO2max (opcional)"><Input type="number" value={d.vo2max} onChange={e => set("vo2max", e.target.value)} placeholder="Si lo conoces..." /></Field>
      <Field label="Lesiones o molestias"><Textarea value={d.lesiones} onChange={e => set("lesiones", e.target.value)} placeholder="Ej: rodilla derecha, tendinitis..." /></Field>
    </>,
    <>
      <Field label="Objetivo principal">
        <Select value={d.objetivo} onChange={e => set("objetivo", e.target.value)}>
          <option value="trail_10k">Trail 10K</option><option value="trail_21k">Trail Media (21K)</option>
          <option value="trail_42k">Trail Maratón (42K)</option><option value="ultra_50k">Ultra 50K</option>
          <option value="ultra_100k">Ultra 100K</option><option value="running_5k">Running 5K</option>
          <option value="running_10k">Running 10K</option><option value="running_21k">Media maratón</option>
          <option value="running_42k">Maratón</option>
        </Select>
      </Field>
      <Grid>
        <Field label="Distancia objetivo (km)"><Input type="number" value={d.distancia} onChange={e => set("distancia", e.target.value)} /></Field>
        <Field label="Desnivel D+ (m)"><Input type="number" value={d.desnivel} onChange={e => set("desnivel", e.target.value)} /></Field>
      </Grid>
      <Field label="Fecha de carrera (si la tienes)"><Input type="date" value={d.fechaCarrera} onChange={e => set("fechaCarrera", e.target.value)} /></Field>
      <Field label="Semanas disponibles (si no hay fecha)"><Input type="number" value={d.semanas} onChange={e => set("semanas", e.target.value)} /></Field>
    </>,
    <>
      <Grid>
        <Field label="Días por semana"><Select value={d.diasSemana} onChange={e => set("diasSemana", e.target.value)}>{["3","4","5","6"].map(v => <option key={v} value={v}>{v} días</option>)}</Select></Field>
        <Field label="Tiempo por sesión"><Select value={d.tiempoSesion} onChange={e => set("tiempoSesion", e.target.value)}><option value="30">30 min</option><option value="45">45 min</option><option value="60">1 hora</option><option value="90">90 min</option><option value="120">2 horas</option><option value="180">3 horas (fin de semana)</option></Select></Field>
      </Grid>
      <Field label="Terreno habitual"><Select value={d.terreno} onChange={e => set("terreno", e.target.value)}><option value="llano">Llano (ciudad / asfalto)</option><option value="mixto">Mixto</option><option value="montana">Montaña (D+ disponible)</option></Select></Field>
      <Field label="Acceso a gimnasio"><Select value={d.gimnasio} onChange={e => set("gimnasio", e.target.value)}><option value="si">Sí</option><option value="no">No</option></Select></Field>
    </>,
    <>
      <div style={{ background: C.greenBg, border: `1px solid ${C.greenDim}`, borderRadius: 9, padding: "10px 14px", marginBottom: 16 }}>
        <p style={{ fontSize: 12, color: C.green, lineHeight: 1.6 }}>Datos de hoy para adaptar la primera semana. Si no los tienes, déjalos en blanco.</p>
      </div>
      <Grid>
        <Field label="HRV (ms)"><Input type="number" value={d.hrv} onChange={e => set("hrv", e.target.value)} placeholder="Ej: 58" /></Field>
        <Field label="FC reposo (ppm)"><Input type="number" value={d.rhr} onChange={e => set("rhr", e.target.value)} placeholder="Ej: 52" /></Field>
      </Grid>
      <Grid>
        <Field label="Sueño (horas)"><Select value={d.sueno} onChange={e => set("sueno", e.target.value)}>{["4","5","6","7","8","9"].map(v => <option key={v} value={v}>{v}h</option>)}</Select></Field>
        <Field label="Fatiga (1-10)"><Select value={d.fatiga} onChange={e => set("fatiga", e.target.value)}>{Array.from({length:10},(_,i)=>i+1).map(v => <option key={v} value={v}>{v} — {["Perfecto","Muy bien","Bien","Normal","Algo cansado","Cansado","Bastante cansado","Muy cansado","Agotado","Al límite"][v-1]}</option>)}</Select></Field>
      </Grid>
      <Field label="¿Alguna molestia?"><Select value={d.dolor} onChange={e => set("dolor", e.target.value)}><option value="no">No, todo bien</option><option value="leve">Leve (1–3/10)</option><option value="moderado">Moderada (4–6/10)</option><option value="alto">Dolor alto (7+/10)</option></Select></Field>
      <Field label="Últimos 3 entrenamientos (opcional)"><Textarea value={d.ultimosEntrenamientos} onChange={e => set("ultimosEntrenamientos", e.target.value)} placeholder="Ej: Lunes 8km Z2, Miércoles fuerza, Viernes 15km con 400m D+..." /></Field>
    </>,
  ];

  const canNext = () => {
    if (step === 0) return d.nombre.trim() && d.edad && d.peso;
    if (step === 1) return d.distancia;
    return true;
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "32px 20px" }}>
      <div style={{ width: "100%", maxWidth: 520 }}>
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div style={{ fontSize: 36, fontWeight: 800, color: C.green, letterSpacing: "0.2em", marginBottom: 6 }}>VERTIX</div>
          <div style={{ fontSize: 13, color: C.textMuted }}>Entrenador de trail running con inteligencia artificial</div>
        </div>
        <div className="fadeUp" style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 16, padding: "28px 28px 24px" }}>
          <div style={{ display: "flex", gap: 4, marginBottom: 24 }}>
            {STEP_TITLES.map((_, i) => (
              <div key={i} style={{ flex: i === step ? 2 : 1, height: 4, borderRadius: 2, background: i <= step ? C.green : C.border, transition: "all .3s" }} />
            ))}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 22 }}>
            <h2 style={{ fontSize: 20, fontWeight: 700 }}>{STEP_TITLES[step]}</h2>
            <span style={{ fontSize: 11, color: C.textMuted }}>{step + 1} / {STEP_TITLES.length}</span>
          </div>
          <div className="fadeIn" key={step}>{steps[step]}</div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 28 }}>
            {step > 0 ? <Btn variant="ghost" onClick={() => setStep(s => s - 1)}>← Atrás</Btn> : <div />}
            {step < steps.length - 1
              ? <Btn style={{ opacity: canNext() ? 1 : 0.4 }} disabled={!canNext()} onClick={() => setStep(s => s + 1)}>Continuar →</Btn>
              : <Btn onClick={() => onComplete(d)}>Generar mi plan →</Btn>}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── GENERATE PLAN ───────────────────────────────────────────────────────────
const buildPrompt = (a, weekNum = 1, prevPlan = null, adherencia = null) => {
  const semanas = a.fechaCarrera
    ? Math.max(1, Math.round((new Date(a.fechaCarrera) - new Date()) / (1000 * 60 * 60 * 24 * 7)))
    : parseInt(a.semanas) || 16;

  const prevInfo = prevPlan ? `
Semana anterior: carga ${prevPlan.carga_semanal}, volumen ${prevPlan.volumen_km}km.
Adherencia: ${adherencia?.completadas || 0}/${adherencia?.total || 5} sesiones completadas.
${(adherencia?.completadas || 0) < 3 ? "ATENCIÓN: baja adherencia — no aumentar carga." : "Buena adherencia — progresión moderada permitida."}
RPE promedio real: ${adherencia?.rpePromedio || "desconocido"}.` : "";

  return `Eres un entrenador de trail running élite. Genera un plan de entrenamiento SEMANA ${weekNum} de ${semanas} en JSON válido EXCLUSIVAMENTE. Sin texto fuera del JSON.

ATLETA: ${a.nombre}, ${a.edad} años, ${a.peso}kg, ${a.altura || "?"}cm.
Nivel: ${a.nivel}. VO2max: ${a.vo2max || "desconocido"}.
Lesiones: ${a.lesiones || "ninguna"}.
Objetivo: ${a.objetivo} — ${a.distancia}km con ${a.desnivel}m D+. Semanas totales: ${semanas}.
Disponibilidad: ${a.diasSemana} días/semana, ${a.tiempoSesion} min/sesión (fin de semana hasta 3h).
Terreno: ${a.terreno}. Gimnasio: ${a.gimnasio}.
HRV: ${a.hrv || "?"} ms. RHR: ${a.rhr || "?"} ppm. Sueño: ${a.sueno}h. Fatiga: ${a.fatiga}/10. Dolor: ${a.dolor}.
Últimos entrenamientos: ${a.ultimosEntrenamientos || "desconocido"}.
${prevInfo}

REGLAS CRÍTICAS:
- Máximo 2 sesiones de alta intensidad por semana
- Si fatiga >= 7 o dolor = alto: solo recuperación activa
- Si sueño < 6: reducir carga 20%
- Distribución 80% Z1-Z2, 20% Z3-Z5
- Incluir trabajo de fuerza preventiva ${a.gimnasio === "si" ? "en gimnasio" : "en casa"}
- Adaptar D+ al terreno disponible (${a.terreno})
- Fase: ${weekNum <= semanas * 0.4 ? "Acumulación" : weekNum <= semanas * 0.75 ? "Transformación" : "Realización"}

Responde SOLO con este JSON:
{
  "semana": ${weekNum},
  "semanas_totales": ${semanas},
  "fase": "Acumulación|Transformación|Realización|Taper",
  "objetivo_semana": "string descriptivo del objetivo fisiológico de la semana",
  "volumen_km": number,
  "carga_semanal": number,
  "riesgo_lesion": "bajo|medio|alto",
  "alertas": ["string"],
  "sesiones": {
    "lunes": {
      "tipo": "descanso|recuperacion|aerobico|fuerza|umbral|intenso|largo|tecnico",
      "nombre": "string",
      "duracion": number,
      "distancia": number,
      "desnivel": number,
      "intensidad_rpe": number,
      "zona": "Z1|Z2|Z3|Z4|Z5",
      "descripcion": "string detallado",
      "estructura": ["bloque 1: descripción","bloque 2: descripción","bloque 3: descripción"],
      "nutricion_pre": "string",
      "nutricion_post": "string",
      "alerta": null
    },
    "martes": { "mismo formato" },
    "miercoles": { "mismo formato" },
    "jueves": { "mismo formato" },
    "viernes": { "mismo formato" },
    "sabado": { "mismo formato" },
    "domingo": { "mismo formato" }
  },
  "fuerza": {
    "dias_recomendados": ["Martes","Jueves"],
    "ejercicios": [
      {"nombre":"string","series":3,"reps":"string","notas":"string","musculos":"string"}
    ]
  },
  "nutricion": {
    "calorias_dia_entreno": number,
    "calorias_dia_descanso": number,
    "proteina_g": number,
    "carbos_g": number,
    "grasas_g": number,
    "hidratacion_ml": number,
    "principios": ["string"],
    "menu_dia_entreno": {
      "desayuno": "string",
      "pre_entreno": "string",
      "durante": "string",
      "post_entreno": "string",
      "comida": "string",
      "cena": "string"
    }
  },
  "zonas": {"Z1": number, "Z2": number, "Z3": number, "Z4": number, "Z5": number}
}`;
};

// ─── DAILY CHECKIN ────────────────────────────────────────────────────────────
function Checkin({ athlete, plan, onSubmit }) {
  const [v, setV] = useState({ hrv: "", rhr: "", sueno: "7", fatiga: "5", dolor: "no", notas: "" });
  const s = (k, val) => setV(p => ({ ...p, [k]: val }));
  return (
    <div className="fadeUp" style={{ maxWidth: 460, margin: "0 auto", padding: "32px 20px" }}>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>Check-in — {new Date().toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" })}</h2>
        <p style={{ fontSize: 13, color: C.textMuted }}>30 segundos para adaptar la sesión a tu estado real</p>
      </div>
      <Card>
        <Grid><Field label="HRV (ms)"><Input type="number" value={v.hrv} onChange={e => s("hrv", e.target.value)} placeholder="Ej: 58" /></Field>
        <Field label="FC reposo"><Input type="number" value={v.rhr} onChange={e => s("rhr", e.target.value)} placeholder="ppm" /></Field></Grid>
        <Grid>
          <Field label="Sueño"><Select value={v.sueno} onChange={e => s("sueno", e.target.value)}>{["4","5","6","7","8","9+"].map(h => <option key={h} value={h}>{h}h</option>)}</Select></Field>
          <Field label="Fatiga (1-10)"><Select value={v.fatiga} onChange={e => s("fatiga", e.target.value)}>{Array.from({length:10},(_,i)=>i+1).map(n => <option key={n} value={n}>{n}</option>)}</Select></Field>
        </Grid>
        <Field label="¿Molestias?"><Select value={v.dolor} onChange={e => s("dolor", e.target.value)}><option value="no">No, todo bien</option><option value="leve">Leve (1-3/10)</option><option value="moderado">Moderada (4-6/10)</option><option value="alto">Dolor alto (7+/10)</option></Select></Field>
        <Field label="Notas (opcional)"><Textarea value={v.notas} onChange={e => s("notas", e.target.value)} placeholder="¿Algo relevante?" style={{ minHeight: 60 }} /></Field>
        <Btn style={{ width: "100%", justifyContent: "center", marginTop: 8 }} onClick={() => onSubmit(v)}>Adaptar sesión →</Btn>
      </Card>
    </div>
  );
}

// ─── SESSION CARD ─────────────────────────────────────────────────────────────
const TIPO_COLORS = { descanso: C.textDim, recuperacion: C.blue, aerobico: C.green, fuerza: C.purple, umbral: C.amber, intenso: C.red, largo: C.green, tecnico: C.amber };

function SessionCard({ session, day, done, onClick, compact }) {
  if (!session) return null;
  const color = TIPO_COLORS[session.tipo] || C.green;
  const isRest = session.tipo === "descanso";
  return (
    <div onClick={!isRest ? onClick : undefined} style={{
      background: C.bgCard, border: `1px solid ${done ? C.greenDim : C.border}`,
      borderRadius: 12, padding: compact ? "10px 14px" : "14px 18px",
      cursor: isRest ? "default" : "pointer", transition: "all .2s",
      borderLeft: `3px solid ${color}`, opacity: isRest ? 0.5 : 1,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: compact ? 4 : 8 }}>
        <div>
          <div style={{ fontSize: 10, color: C.textMuted, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 2 }}>{day}</div>
          <div style={{ fontSize: compact ? 13 : 14, fontWeight: 600, color: C.text }}>{session.nombre || session.tipo}</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
          <span style={{ background: `${color}18`, color, border: `1px solid ${color}35`, borderRadius: 20, padding: "1px 8px", fontSize: 10, fontWeight: 600 }}>{session.tipo}</span>
          {done && <span style={{ background: C.greenBg, color: C.green, border: `1px solid ${C.greenDim}`, borderRadius: 20, padding: "1px 8px", fontSize: 10 }}>✓</span>}
        </div>
      </div>
      {!isRest && (
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          {session.duracion && <span style={{ fontSize: 11, color: C.textMuted }}>{session.duracion}min</span>}
          {session.distancia > 0 && <span style={{ fontSize: 11, color: C.textMuted }}>{session.distancia}km</span>}
          {session.desnivel > 0 && <span style={{ fontSize: 11, color: C.textMuted }}>↑{session.desnivel}m</span>}
          {session.intensidad_rpe && <span style={{ fontSize: 11, color: C.textMuted }}>RPE {session.intensidad_rpe}</span>}
          {session.zona && <span style={{ fontSize: 11, color: color }}>{session.zona}</span>}
        </div>
      )}
    </div>
  );
}

// ─── SESSION MODAL ────────────────────────────────────────────────────────────
function SessionModal({ session, day, onClose, onComplete, completed }) {
  const [rpe, setRpe] = useState(5);
  const [notas, setNotas] = useState("");
  const [done, setDone] = useState(false);
  if (!session) return null;
  const color = TIPO_COLORS[session.tipo] || C.green;

  return (
    <div className="fadeIn" style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.85)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }} onClick={onClose}>
      <div className="fadeUp" style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 16, padding: "24px 28px", maxWidth: 540, width: "100%", maxHeight: "90vh", overflowY: "auto" }} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 10, color: C.textMuted, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 4 }}>{day}</div>
            <h3 style={{ fontSize: 20, fontWeight: 700, color: C.text }}>{session.nombre}</h3>
            <div style={{ marginTop: 6 }}><Tag color={{ descanso:"blue", recuperacion:"blue", aerobico:"green", fuerza:"purple", umbral:"amber", intenso:"red", largo:"green", tecnico:"amber" }[session.tipo] || "green"}>{session.tipo}</Tag></div>
          </div>
          <Btn variant="ghost" style={{ padding: "6px 12px" }} onClick={onClose}>✕</Btn>
        </div>

        <Grid cols={3} gap={10} style={{ marginBottom: 20 }}>
          {session.duracion && <Metric label="Duración" value={session.duracion} unit="min" />}
          {session.distancia > 0 && <Metric label="Distancia" value={session.distancia} unit="km" />}
          {session.intensidad_rpe && <Metric label="RPE target" value={session.intensidad_rpe} color={C.amber} />}
        </Grid>

        {session.descripcion && (
          <div style={{ marginBottom: 16 }}>
            <Label>descripción</Label>
            <p style={{ fontSize: 13, color: C.textMuted, lineHeight: 1.7 }}>{session.descripcion}</p>
          </div>
        )}

        {session.estructura?.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <Label>estructura</Label>
            <div style={{ background: C.bgCard2, borderRadius: 10, padding: 14, border: `1px solid ${C.border}` }}>
              {session.estructura.map((b, i) => (
                <div key={i} style={{ display: "flex", gap: 10, marginBottom: 10, alignItems: "flex-start" }}>
                  <div style={{ width: 22, height: 22, borderRadius: "50%", background: C.greenBg, border: `1px solid ${C.greenDim}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: C.green, flexShrink: 0 }}>{i + 1}</div>
                  <p style={{ fontSize: 13, color: C.textMuted, lineHeight: 1.6, paddingTop: 2 }}>{b}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {(session.nutricion_pre || session.nutricion_post) && (
          <div style={{ marginBottom: 16 }}>
            <Label>nutrición</Label>
            <div style={{ background: C.amberBg, border: `1px solid #3d2a00`, borderRadius: 10, padding: 12 }}>
              {session.nutricion_pre && <p style={{ fontSize: 12, color: C.amber, marginBottom: 4 }}><strong>Pre:</strong> {session.nutricion_pre}</p>}
              {session.nutricion_post && <p style={{ fontSize: 12, color: C.amber }}><strong>Post:</strong> {session.nutricion_post}</p>}
            </div>
          </div>
        )}

        {session.alerta && (
          <div style={{ background: C.redBg, border: `1px solid #3d1010`, borderRadius: 10, padding: 12, marginBottom: 16 }}>
            <p style={{ fontSize: 12, color: C.red }}>⚠ {session.alerta}</p>
          </div>
        )}

        {completed ? (
          <div style={{ background: C.greenBg, border: `1px solid ${C.greenDim}`, borderRadius: 10, padding: 14, textAlign: "center" }}>
            <p style={{ color: C.green, fontWeight: 600 }}>✓ Sesión completada — RPE {completed.rpe}/10</p>
            {completed.notas && <p style={{ fontSize: 12, color: C.textMuted, marginTop: 4 }}>{completed.notas}</p>}
          </div>
        ) : !done ? (
          <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 16 }}>
            <Label>registrar sesión completada</Label>
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 6 }}>RPE real: <strong style={{ color: C.text }}>{rpe}/10</strong></div>
              <input type="range" min={1} max={10} step={1} value={rpe} onChange={e => setRpe(+e.target.value)} />
            </div>
            <Textarea placeholder="Notas opcionales..." value={notas} onChange={e => setNotas(e.target.value)} style={{ minHeight: 60, marginBottom: 12 }} />
            <Btn style={{ width: "100%", justifyContent: "center" }} onClick={() => { setDone(true); onComplete(rpe, notas); }}>✓ Marcar como completada</Btn>
          </div>
        ) : (
          <div style={{ background: C.greenBg, border: `1px solid ${C.greenDim}`, borderRadius: 10, padding: 14, textAlign: "center" }}>
            <p style={{ color: C.green, fontWeight: 600 }}>✓ Registrado correctamente</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function App() {
  const [screen, setScreen] = useState(() => load("screen", "onboarding"));
  const [athlete, setAthlete] = useState(() => load("athlete", null));
  const [weeks, setWeeks] = useState(() => load("weeks", []));
  const [currentWeekIdx, setCurrentWeekIdx] = useState(() => load("currentWeekIdx", 0));
  const [completadas, setCompletadas] = useState(() => load("completadas", {}));
  const [checkinDone, setCheckinDone] = useState(() => load("checkinDone_" + new Date().toDateString(), false));
  const [checkinAdj, setCheckinAdj] = useState(null);
  const [tab, setTab] = useState("hoy");
  const [modal, setModal] = useState(null);
  const [loading, setLoading] = useState(false);
  const [genWeek, setGenWeek] = useState(false);
  const [coachQ, setCoachQ] = useState("");
  const [coachHistory, setCoachHistory] = useState(() => load("coachHistory", []));
  const [coachLoading, setCoachLoading] = useState(false);

  const plan = weeks[currentWeekIdx] || null;

  const persist = useCallback((key, val) => save(key, val), []);

  useEffect(() => { persist("screen", screen); }, [screen]);
  useEffect(() => { persist("athlete", athlete); }, [athlete]);
  useEffect(() => { persist("weeks", weeks); }, [weeks]);
  useEffect(() => { persist("currentWeekIdx", currentWeekIdx); }, [currentWeekIdx]);
  useEffect(() => { persist("completadas", completadas); }, [completadas]);
  useEffect(() => { persist("coachHistory", coachHistory); }, [coachHistory]);

  const todayIdx = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1;
  const todayKey = DAY_KEYS[todayIdx];

  // Generate plan
  const generateWeek = async (athleteData, weekNum = 1, prev = null, adh = null) => {
    setLoading(true);
    try {
      const prompt = buildPrompt(athleteData, weekNum, prev, adh);
      const raw = await callGemini(prompt);
      const parsed = parseJSON(raw);
      if (parsed) {
        const newWeeks = weekNum === 1 ? [parsed] : [...weeks, parsed];
        setWeeks(newWeeks);
        setCurrentWeekIdx(weekNum - 1);
        persist("weeks", newWeeks);
        setCompletadas({});
        return parsed;
      }
    } catch (e) { console.error(e); }
    setLoading(false);
    return null;
  };

  const handleOnboardingComplete = async (data) => {
    setAthlete(data);
    setScreen("loading");
    const result = await generateWeek(data, 1);
    if (result) setScreen("app");
    setLoading(false);
  };

  const handleNextWeek = async () => {
    if (!athlete || !plan) return;
    setGenWeek(true);
    const completedKeys = Object.keys(completadas);
    const totalSessions = Object.values(plan.sesiones || {}).filter(s => s?.tipo !== "descanso").length;
    const rpeVals = completedKeys.map(k => completadas[k]?.rpe || 5);
    const rpePromedio = rpeVals.length ? Math.round(rpeVals.reduce((a, b) => a + b, 0) / rpeVals.length) : 5;
    const adh = { completadas: completedKeys.length, total: totalSessions, rpePromedio };
    await generateWeek(athlete, (plan.semana || 1) + 1, plan, adh);
    setGenWeek(false);
  };

  const handleCheckin = (data) => {
    const fatiga = parseInt(data.fatiga);
    const hrv = parseInt(data.hrv) || 60;
    const dolor = data.dolor;
    let adj;
    if (fatiga >= 8 || dolor === "alto") {
      adj = { level: "red", title: "Carga reducida — estado crítico", msg: "Fatiga alta o dolor significativo. La sesión de hoy se convierte en recuperación activa: 20-30 min caminata suave o descanso total. No negociar.", icon: "⚠" };
    } else if (fatiga >= 6 || dolor === "moderado" || hrv < 45) {
      adj = { level: "amber", title: "Intensidad reducida — estado sub-óptimo", msg: "Reduce la intensidad al 70%. Si hay series o umbral programado, sustitúyelo por Z1-Z2 continuo.", icon: "⚡" };
    } else {
      adj = { level: "green", title: "Estado óptimo — ejecuta el plan", msg: "Fisiología en buen estado. Ejecuta la sesión tal como está programada.", icon: "✓" };
    }
    setCheckinAdj(adj);
    setCheckinDone(true);
    persist("checkinDone_" + new Date().toDateString(), true);
  };

  const completeSession = (dayKey, rpe, notas) => {
    const updated = { ...completadas, [dayKey]: { rpe, notas, ts: new Date().toISOString() } };
    setCompletadas(updated);
  };

  // Coach
  const askCoach = async () => {
    if (!coachQ.trim() || coachLoading) return;
    const q = coachQ.trim();
    setCoachQ("");
    setCoachLoading(true);
    const newHistory = [...coachHistory, { role: "user", text: q }];
    setCoachHistory(newHistory);
    try {
      const ctx = `Eres el coach personal de ${athlete?.nombre}. 
Datos: ${athlete?.edad} años, ${athlete?.peso}kg, nivel ${athlete?.nivel}, objetivo ${athlete?.objetivo} (${athlete?.distancia}km, ${athlete?.desnivel}m D+).
Semana actual: ${plan?.semana}/${plan?.semanas_totales}. Fase: ${plan?.fase}. Volumen: ${plan?.volumen_km}km.
Historial reciente: ${JSON.stringify(coachHistory.slice(-4))}.
Responde de forma concisa, directa y práctica. En español. Máximo 3 párrafos.
Pregunta del atleta: ${q}`;
      const ans = await callGemini(ctx);
      setCoachHistory([...newHistory, { role: "coach", text: ans.trim() }]);
    } catch { setCoachHistory([...newHistory, { role: "coach", text: "Error al conectar. Inténtalo de nuevo." }]); }
    setCoachLoading(false);
  };

  // Reset
  const handleReset = () => {
    ["screen","athlete","weeks","currentWeekIdx","completadas","coachHistory"].forEach(k => localStorage.removeItem("vertix_" + k));
    setScreen("onboarding"); setAthlete(null); setWeeks([]); setCurrentWeekIdx(0); setCompletadas({}); setCoachHistory([]);
  };

  if (screen === "onboarding") return <><GlobalStyle /><Onboarding onComplete={handleOnboardingComplete} /></>;
  if (screen === "loading" || loading) return <><GlobalStyle /><LoadingScreen /></>;
  if (!plan) return <><GlobalStyle /><div style={{ padding: 32, color: C.textMuted }}>Error. <button onClick={handleReset} style={{ color: C.green, background: "none", border: "none", cursor: "pointer" }}>Reiniciar</button></div></>;

  const sessionHoy = plan.sesiones?.[todayKey];
  const completedCount = Object.keys(completadas).length;
  const totalSessions = Object.values(plan.sesiones || {}).filter(s => s?.tipo !== "descanso").length;
  const adherencia = totalSessions > 0 ? Math.round((completedCount / totalSessions) * 100) : 0;

  const TABS = [["hoy","Hoy"],["semana","Semana"],["fuerza","Fuerza"],["nutricion","Nutrición"],["coach","Coach IA"],["progreso","Progreso"]];

  return (
    <>
      <GlobalStyle />
      {/* NAV */}
      <nav style={{ background: C.bgCard, borderBottom: `1px solid ${C.border}`, padding: "0 20px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 54, position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ fontSize: 20, fontWeight: 800, color: C.green, letterSpacing: "0.18em" }}>VERTIX</div>
        <div style={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
          {TABS.map(([k, l]) => (
            <button key={k} onClick={() => setTab(k)} style={{ padding: "6px 14px", borderRadius: 7, fontSize: 12, fontWeight: tab === k ? 600 : 400, cursor: "pointer", border: "none", background: tab === k ? C.greenBg : "transparent", color: tab === k ? C.green : C.textMuted, transition: "all .2s", letterSpacing: "0.04em" }}>{l}</button>
          ))}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 11, color: C.textMuted, fontFamily: "'DM Mono', monospace" }}>S{plan.semana}/{plan.semanas_totales}</span>
          <div onClick={handleReset} title="Reiniciar" style={{ width: 30, height: 30, borderRadius: "50%", background: C.greenBg, border: `1px solid ${C.greenDim}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800, color: C.green, cursor: "pointer" }}>
            {athlete?.nombre?.[0]?.toUpperCase()}
          </div>
        </div>
      </nav>

      {/* ALERTAS */}
      {plan.alertas?.length > 0 && (
        <div style={{ padding: "8px 20px", display: "flex", gap: 8, flexWrap: "wrap", borderBottom: `1px solid ${C.border}`, background: C.bgCard }}>
          {plan.alertas.map((a, i) => (
            <div key={i} style={{ background: C.amberBg, border: `1px solid #3d2a00`, borderRadius: 8, padding: "5px 12px", fontSize: 11, color: C.amber }}>⚡ {a}</div>
          ))}
        </div>
      )}

      <div style={{ maxWidth: 1000, margin: "0 auto", padding: "24px 20px 60px" }}>

        {/* ── HOY ── */}
        {tab === "hoy" && (
          <div className="fadeUp">
            {!checkinDone ? (
              <Checkin athlete={athlete} plan={plan} onSubmit={handleCheckin} />
            ) : (
              <>
                {checkinAdj && (
                  <div style={{ background: checkinAdj.level === "green" ? C.greenBg : checkinAdj.level === "amber" ? C.amberBg : C.redBg, border: `1px solid ${checkinAdj.level === "green" ? C.greenDim : checkinAdj.level === "amber" ? "#3d2a00" : "#3d1010"}`, borderRadius: 12, padding: "14px 18px", marginBottom: 20, display: "flex", gap: 12, alignItems: "flex-start" }}>
                    <span style={{ fontSize: 18 }}>{checkinAdj.icon}</span>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: checkinAdj.level === "green" ? C.green : checkinAdj.level === "amber" ? C.amber : C.red, marginBottom: 3 }}>{checkinAdj.title}</div>
                      <p style={{ fontSize: 13, color: C.textMuted, lineHeight: 1.6 }}>{checkinAdj.msg}</p>
                    </div>
                  </div>
                )}

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                  <div>
                    <Label>Sesión de hoy — {DAYS[todayIdx]}</Label>
                    {sessionHoy ? (
                      <SessionCard session={sessionHoy} day={DAYS[todayIdx]} done={!!completadas[todayKey]} onClick={() => setModal({ session: sessionHoy, day: DAYS[todayIdx], dayKey: todayKey })} />
                    ) : (
                      <Card><p style={{ fontSize: 13, color: C.textMuted }}>Sin sesión programada hoy</p></Card>
                    )}

                    <div style={{ marginTop: 16 }}>
                      <Label>Objetivo de la semana</Label>
                      <Card><p style={{ fontSize: 13, color: C.textMuted, lineHeight: 1.7 }}>{plan.objetivo_semana}</p></Card>
                    </div>
                  </div>

                  <div>
                    <Label>Estado de la semana {plan.semana}</Label>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
                      <Metric label="Volumen" value={plan.volumen_km} unit="km" />
                      <Metric label="Adherencia" value={`${completedCount}/${totalSessions}`} color={adherencia >= 80 ? C.green : adherencia >= 50 ? C.amber : C.red} />
                      <Metric label="Fase" value={plan.fase?.split(" ")[0]} color={C.blue} />
                      <Metric label="Riesgo" value={plan.riesgo_lesion} color={plan.riesgo_lesion === "bajo" ? C.green : plan.riesgo_lesion === "medio" ? C.amber : C.red} />
                    </div>

                    <Card style={{ marginBottom: 12 }}>
                      <Label>Distribución de zonas</Label>
                      {plan.zonas && Object.entries(plan.zonas).map(([z, pct]) => {
                        const col = { Z1: C.blue, Z2: C.green, Z3: C.amber, Z4: C.red, Z5: C.purple }[z] || C.textMuted;
                        return (
                          <div key={z} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                            <span style={{ fontSize: 10, color: C.textMuted, width: 20 }}>{z}</span>
                            <div style={{ flex: 1, background: C.border, borderRadius: 2, height: 5, overflow: "hidden" }}>
                              <div style={{ width: `${pct}%`, height: "100%", background: col, borderRadius: 2 }} />
                            </div>
                            <span style={{ fontSize: 10, color: C.textMuted, width: 28, textAlign: "right", fontFamily: "'DM Mono',monospace" }}>{pct}%</span>
                          </div>
                        );
                      })}
                    </Card>

                    <Btn variant="secondary" style={{ width: "100%", justifyContent: "center" }} onClick={() => setCheckinDone(false)}>Repetir check-in</Btn>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* ── SEMANA ── */}
        {tab === "semana" && (
          <div className="fadeUp">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 10 }}>
              <div>
                <h2 style={{ fontSize: 18, fontWeight: 700 }}>Semana {plan.semana} — {plan.fase}</h2>
                <p style={{ fontSize: 13, color: C.textMuted, marginTop: 2 }}>{plan.objetivo_semana}</p>
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                {weeks.length > 1 && currentWeekIdx > 0 && (
                  <Btn variant="ghost" style={{ padding: "8px 14px" }} onClick={() => { setCurrentWeekIdx(i => i - 1); }}>←</Btn>
                )}
                {currentWeekIdx < weeks.length - 1 && (
                  <Btn variant="ghost" style={{ padding: "8px 14px" }} onClick={() => { setCurrentWeekIdx(i => i + 1); }}>→</Btn>
                )}
                <Btn variant="secondary" style={{ opacity: genWeek ? 0.5 : 1 }} disabled={genWeek} onClick={handleNextWeek}>
                  {genWeek ? "Generando..." : "→ Semana siguiente"}
                </Btn>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(0,1fr))", gap: 8, marginBottom: 20 }}>
              {DAYS.map((day, i) => {
                const key = DAY_KEYS[i];
                const sess = plan.sesiones?.[key];
                return (
                  <SessionCard key={day} session={sess || { tipo: "descanso", nombre: "Descanso" }} day={day} done={!!completadas[key]} compact onClick={() => { if (sess && sess.tipo !== "descanso") setModal({ session: sess, day, dayKey: key }); }} />
                );
              })}
            </div>

            <Card>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, alignItems: "center" }}>
                <Label>Adherencia de la semana</Label>
                <span style={{ fontSize: 12, fontFamily: "'DM Mono',monospace", color: C.green }}>{completedCount}/{totalSessions} sesiones</span>
              </div>
              <div style={{ background: C.border, borderRadius: 3, height: 7, overflow: "hidden" }}>
                <div style={{ width: `${adherencia}%`, height: "100%", background: adherencia >= 80 ? C.green : adherencia >= 50 ? C.amber : C.red, borderRadius: 3, transition: "width .5s ease" }} />
              </div>
            </Card>
          </div>
        )}

        {/* ── FUERZA ── */}
        {tab === "fuerza" && (
          <div className="fadeUp" style={{ maxWidth: 660 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 20 }}>Trabajo de fuerza — Semana {plan.semana}</h2>
            {plan.fuerza ? (
              <>
                <Card style={{ marginBottom: 16 }}>
                  <Label>Días recomendados</Label>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 6 }}>
                    {(plan.fuerza.dias_recomendados || []).map(d => <Tag key={d}>{d}</Tag>)}
                  </div>
                </Card>
                <Card>
                  <Label>Ejercicios</Label>
                  <div style={{ marginTop: 8 }}>
                    {(plan.fuerza.ejercicios || []).map((ej, i) => (
                      <div key={i} style={{ padding: "12px 0", borderBottom: `1px solid ${C.border}`, display: "flex", gap: 14, alignItems: "flex-start" }}>
                        <div style={{ width: 28, height: 28, borderRadius: 7, background: C.greenBg, border: `1px solid ${C.greenDim}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: C.green, flexShrink: 0 }}>{i + 1}</div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 2 }}>{ej.nombre}</div>
                          <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                            <span style={{ fontSize: 12, color: C.textMuted }}>{ej.series} series × {ej.reps}</span>
                            {ej.musculos && <span style={{ fontSize: 11, color: C.textDim }}>· {ej.musculos}</span>}
                          </div>
                          {ej.notas && <p style={{ fontSize: 12, color: C.textMuted, marginTop: 4, lineHeight: 1.5 }}>{ej.notas}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              </>
            ) : <Card><p style={{ color: C.textMuted, fontSize: 13 }}>No hay fuerza programada esta semana</p></Card>}
          </div>
        )}

        {/* ── NUTRICIÓN ── */}
        {tab === "nutricion" && (
          <div className="fadeUp">
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 20 }}>Plan nutricional — Semana {plan.semana}</h2>
            {plan.nutricion ? (
              <>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0,1fr))", gap: 10, marginBottom: 20 }}>
                  <Metric label="Kcal entreno" value={plan.nutricion.calorias_dia_entreno} unit="kcal" />
                  <Metric label="Proteína" value={plan.nutricion.proteina_g} unit="g" color={C.blue} />
                  <Metric label="Carbohidratos" value={plan.nutricion.carbos_g} unit="g" color={C.amber} />
                  <Metric label="Hidratación" value={plan.nutricion.hidratacion_ml ? Math.round(plan.nutricion.hidratacion_ml / 1000 * 10) / 10 : null} unit="L/día" color={C.purple} />
                </div>
                {plan.nutricion.principios?.length > 0 && (
                  <Card style={{ marginBottom: 16 }}>
                    <Label>Principios clave</Label>
                    {plan.nutricion.principios.map((p, i) => (
                      <div key={i} style={{ display: "flex", gap: 8, padding: "6px 0", borderBottom: `1px solid ${C.border}`, fontSize: 13, color: C.textMuted }}>
                        <span style={{ color: C.green, flexShrink: 0 }}>→</span>{p}
                      </div>
                    ))}
                  </Card>
                )}
                {plan.nutricion.menu_dia_entreno && (
                  <Card>
                    <Label>Menú — día de entreno</Label>
                    <div style={{ marginTop: 8 }}>
                      {Object.entries(plan.nutricion.menu_dia_entreno).map(([k, v]) => (
                        <div key={k} style={{ padding: "10px 0", borderBottom: `1px solid ${C.border}` }}>
                          <div style={{ fontSize: 10, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>{k.replace(/_/g, " ")}</div>
                          <p style={{ fontSize: 13, color: C.text, lineHeight: 1.5 }}>{v}</p>
                        </div>
                      ))}
                    </div>
                  </Card>
                )}
              </>
            ) : <Card><p style={{ color: C.textMuted, fontSize: 13 }}>Genera un plan para ver la nutrición</p></Card>}
          </div>
        )}

        {/* ── COACH IA ── */}
        {tab === "coach" && (
          <div className="fadeUp" style={{ maxWidth: 680 }}>
            <div style={{ marginBottom: 20 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>Coach IA — {athlete?.nombre}</h2>
              <p style={{ fontSize: 13, color: C.textMuted }}>Tu entrenador personal con contexto completo de tu plan y progreso</p>
            </div>

            <div style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 14, overflow: "hidden" }}>
              <div style={{ padding: 20, maxHeight: 420, overflowY: "auto", display: "flex", flexDirection: "column", gap: 14 }}>
                {coachHistory.length === 0 && (
                  <div style={{ textAlign: "center", padding: "32px 0" }}>
                    <div style={{ fontSize: 28, fontWeight: 800, color: C.greenDim, marginBottom: 12 }}>V</div>
                    <p style={{ fontSize: 13, color: C.textMuted, lineHeight: 1.7 }}>Soy tu coach personal. Conozco tu plan, tu nivel y tu objetivo.<br />Pregúntame lo que quieras.</p>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center", marginTop: 16 }}>
                      {["¿Qué hago si me duele la rodilla?","¿Cómo hidratarme en una carrera larga?","¿Puedo entrenar si dormí mal?","Explícame la sesión de hoy"].map(q => (
                        <button key={q} onClick={() => { setCoachQ(q); }} style={{ background: C.bgCard2, border: `1px solid ${C.border}`, borderRadius: 20, padding: "6px 14px", fontSize: 11, color: C.textMuted, cursor: "pointer", transition: "all .2s" }}>{q}</button>
                      ))}
                    </div>
                  </div>
                )}
                {coachHistory.map((m, i) => (
                  <div key={i} className="fadeIn" style={{ display: "flex", flexDirection: m.role === "user" ? "row-reverse" : "row", gap: 10, alignItems: "flex-start" }}>
                    <div style={{ width: 28, height: 28, borderRadius: "50%", background: m.role === "user" ? C.blueBg : C.greenBg, border: `1px solid ${m.role === "user" ? "#0d2a40" : C.greenDim}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: m.role === "user" ? C.blue : C.green, flexShrink: 0 }}>
                      {m.role === "user" ? athlete?.nombre?.[0]?.toUpperCase() : "V"}
                    </div>
                    <div style={{ background: m.role === "user" ? C.blueBg : C.bgCard2, border: `1px solid ${m.role === "user" ? "#0d2a40" : C.border}`, borderRadius: 10, padding: "10px 14px", maxWidth: "80%", fontSize: 13, color: C.text, lineHeight: 1.7 }}>
                      {m.text}
                    </div>
                  </div>
                ))}
                {coachLoading && (
                  <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                    <div style={{ width: 28, height: 28, borderRadius: "50%", background: C.greenBg, border: `1px solid ${C.greenDim}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: C.green }}>V</div>
                    <div style={{ background: C.bgCard2, border: `1px solid ${C.border}`, borderRadius: 10, padding: "10px 14px" }}>
                      <div style={{ display: "flex", gap: 4 }}>
                        {[0,1,2].map(i => <div key={i} className="pulse" style={{ width: 6, height: 6, borderRadius: "50%", background: C.green, animationDelay: `${i * 0.2}s` }} />)}
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <div style={{ borderTop: `1px solid ${C.border}`, padding: "12px 16px", display: "flex", gap: 10 }}>
                <input value={coachQ} onChange={e => setCoachQ(e.target.value)} onKeyDown={e => e.key === "Enter" && !e.shiftKey && askCoach()} placeholder="Pregunta a tu coach..." style={{ flex: 1, background: C.bgCard2, border: `1px solid ${C.border}`, borderRadius: 9, padding: "10px 14px", color: C.text, fontSize: 14, outline: "none" }} />
                <Btn onClick={askCoach} style={{ flexShrink: 0 }} disabled={coachLoading}>Enviar</Btn>
              </div>
            </div>
          </div>
        )}

        {/* ── PROGRESO ── */}
        {tab === "progreso" && (
          <div className="fadeUp">
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 20 }}>Progreso del atleta</h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0,1fr))", gap: 10, marginBottom: 20 }}>
              <Metric label="Semanas completadas" value={weeks.length} />
              <Metric label="Km acumulados" value={weeks.reduce((s, w) => s + (w.volumen_km || 0), 0)} unit="km" color={C.blue} />
              <Metric label="Semanas restantes" value={Math.max(0, (plan.semanas_totales || 16) - weeks.length)} color={C.amber} />
              <Metric label="Adherencia total" value={`${adherencia}%`} color={adherencia >= 80 ? C.green : adherencia >= 50 ? C.amber : C.red} />
            </div>

            <Card style={{ marginBottom: 20 }}>
              <Label>Línea de tiempo — {plan.semanas_totales} semanas</Label>
              <div style={{ display: "flex", gap: 3, marginTop: 14, flexWrap: "wrap" }}>
                {Array.from({ length: plan.semanas_totales || 16 }).map((_, i) => {
                  const done = i < weeks.length - 1;
                  const curr = i === weeks.length - 1;
                  return (
                    <div key={i} title={`Semana ${i + 1}`} style={{ width: 28, height: 28, borderRadius: 7, background: done ? C.greenDim : curr ? C.green : C.bgCard2, border: `1px solid ${done || curr ? C.green : C.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 600, color: done || curr ? C.bg : C.textDim, cursor: "default", transition: "all .2s" }}>
                      {i + 1}
                    </div>
                  );
                })}
              </div>
            </Card>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <Card>
                <Label>Perfil del atleta</Label>
                {[["Nombre", athlete?.nombre], ["Edad", `${athlete?.edad} años`], ["Peso", `${athlete?.peso} kg`], ["Nivel", athlete?.nivel], ["VO2max", athlete?.vo2max || "—"], ["Terreno", athlete?.terreno], ["Gimnasio", athlete?.gimnasio]].map(([k, v]) => (
                  <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: `1px solid ${C.border}`, fontSize: 13 }}>
                    <span style={{ color: C.textMuted }}>{k}</span>
                    <span style={{ color: C.text, fontWeight: 500 }}>{v}</span>
                  </div>
                ))}
              </Card>
              <Card>
                <Label>Objetivo</Label>
                {[["Tipo", athlete?.objetivo], ["Distancia", `${athlete?.distancia} km`], ["Desnivel", `${athlete?.desnivel} m D+`], ["Semanas totales", plan.semanas_totales], ["Fecha", athlete?.fechaCarrera || "—"], ["Fase actual", plan.fase]].map(([k, v]) => (
                  <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: `1px solid ${C.border}`, fontSize: 13 }}>
                    <span style={{ color: C.textMuted }}>{k}</span>
                    <span style={{ color: C.text, fontWeight: 500 }}>{v}</span>
                  </div>
                ))}
              </Card>
            </div>

            <div style={{ marginTop: 20 }}>
              <Btn variant="danger" onClick={handleReset}>Reiniciar app y nuevo atleta</Btn>
            </div>
          </div>
        )}

      </div>

      {/* SESSION MODAL */}
      {modal && (
        <SessionModal
          session={modal.session}
          day={modal.day}
          onClose={() => setModal(null)}
          completed={completadas[modal.dayKey]}
          onComplete={(rpe, notas) => { completeSession(modal.dayKey, rpe, notas); setModal(null); }}
        />
      )}
    </>
  );
}
