const MODEL = "@cf/meta/llama-3.1-8b-instruct-fp8";
const json = (d, s = 200) =>
  new Response(JSON.stringify(d), { status: s, headers: { "content-type": "application/json" } });
const clip = (v, n = 1500) => String(v || "").slice(0, n);

function parse(r) {
  const raw = r && r.response;
  if (raw && typeof raw === "object") return raw;
  const m = String(raw || "").match(/\{[\s\S]*\}/);
  if (!m) throw new Error("No JSON");
  return JSON.parse(m[0]);
}

async function ask(env, system, user, max) {
  for (let i = 0; i < 2; i++) {
    try {
      const r = await env.AI.run(MODEL, {
        messages: [{ role: "system", content: system }, { role: "user", content: user }],
        max_tokens: max, temperature: 0.3,
      });
      return parse(r);
    } catch (e) { if (i === 1) throw e; }
  }
}

const fixPlan = (p) => {
  const a = Array.isArray(p) ? p : [];
  return Array.from({ length: 7 }, (_, i) => ({
    day: i + 1,
    task: String((a[i] && a[i].task) || "Review your work and keep building").slice(0, 160),
  }));
};

async function plan(env, b) {
  const system = `You are JobMap AI, a sharp career coach for Indian college students. Be specific to the target job: name real tools and skills used in that role.
Pick ONE project doable in 7 days with free tools.
Reply ONLY with JSON: {"summary":"2 short sentences","gaps":["3 to 5 specific skill gaps"],"project":{"title":"","why":"1 sentence on why it proves the missing skills to recruiters","features":["3 short features"]}}`;
  const d = await ask(env, system, `Target job: ${clip(b.job, 200)}\nSkills: ${clip(b.skills)}\nProjects so far: ${clip(b.projects)}`, 450);
  const p = d.project || {};
  return {
    summary: String(d.summary || ""),
    gaps: (Array.isArray(d.gaps) ? d.gaps : []).slice(0, 5).map(String),
    project: { title: String(p.title || "Your next project"), why: String(p.why || ""), features: (Array.isArray(p.features) ? p.features : []).slice(0, 3).map(String) },
  };
}

async function route(env, b) {
  const system = `You are JobMap AI. Write a 7-day plan to build the given project. Each task is ONE concrete deliverable under 18 words. Day 7 is: deploy to a free host and share the link.
Reply ONLY with JSON: {"plan":[{"day":1,"task":""}]} with exactly 7 items.`;
  const d = await ask(env, system, `Target job: ${clip(b.job, 200)}\nStudent skills: ${clip(b.skills, 600)}\nProject: ${clip(b.project, 500)}`, 600);
  return { plan: fixPlan(d.plan) };
}

async function opps(env, b) {
  const system = `You are JobMap AI. Suggest 5 opportunities that help a first or second year Indian college student close their skill gaps for the target job. Mix types: hackathon, internship, event, open-source program, community, extracurricular (club, volunteering, competition).
Rules: NEVER invent dates, deadlines or company names you are unsure of. Prefer well-known programs and platforms (Smart India Hackathon, Google Summer of Code, MLH, Unstop, Devfolio, Internshala, GitHub, local tech communities). Each item has a "query" a student can paste into Google to find current listings.
Reply ONLY with JSON: {"items":[{"type":"hackathon","title":"short name","why":"1 sentence linking it to a gap","query":"google search words"}]}`;
  const d = await ask(env, system, `Target job: ${clip(b.job, 200)}\nSkills: ${clip(b.skills, 500)}\nGaps: ${clip(JSON.stringify(b.gaps), 600)}`, 600);
  return {
    items: (Array.isArray(d.items) ? d.items : []).slice(0, 5).map((x) => ({
      type: String((x && x.type) || "event").slice(0, 20),
      title: String((x && x.title) || "").slice(0, 80),
      why: String((x && x.why) || "").slice(0, 200),
      query: String((x && x.query) || (x && x.title) || "").slice(0, 120),
    })).filter((x) => x.title),
  };
}

async function adjust(env, b) {
  const system = `You are JobMap AI. A student reports progress on a 7-day plan. Keep finished days. Make unfinished days easier or shorter if they struggle; add one small stretch task if they are ahead. Each task is under 18 words.
Reply ONLY with JSON: {"feedback":"2 short, kind sentences","plan":[{"day":1,"task":""}]} with exactly 7 items.`;
  const d = await ask(env, system, `Target job: ${clip(b.job, 200)}\nProject: ${clip(b.project, 300)}\nCurrent plan: ${clip(JSON.stringify(b.plan), 2500)}\nDays finished: ${clip(JSON.stringify(b.done), 60)}\nStudent says: ${clip(b.note, 800)}`, 650);
  return { feedback: String(d.feedback || "Good effort. Keep going."), plan: fixPlan(d.plan) };
}

const routes = { "/api/plan": plan, "/api/route": route, "/api/opps": opps, "/api/adjust": adjust };

export default {
  async fetch(req, env) {
    const { pathname } = new URL(req.url);
    const fn = routes[pathname];
    if (req.method !== "POST" || !fn) return json({ error: "Not found" }, 404);
    try {
      const body = await req.json();
      if (pathname === "/api/plan" && !clip(body.job, 200).trim()) return json({ error: "Please enter a target job." }, 400);
      return json(await fn(env, body));
    } catch (e) {
      console.error(e);
      return json({ error: "The agent had a problem. Please try again." }, 500);
    }
  },
};
