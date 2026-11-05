# JobMap AI

**The map that tells you what to build next.**
**Try it out**
https://jobmap-ai.aiic.workers.dev
## The problem
Lakhs of Indian students finish tech degrees without a job. Many do not know which skills a role needs, and students in smaller towns and non-elite colleges often have no mentor. Courses tell them what to study, but projects are what get a first-job interview.

## What it does (an agent loop)
1. **Reads** the student's target job, skills and past projects.
2. **Finds** the biggest skill gaps.
3. **Decides** on ONE project to build next and writes a 7-day plan.
4. **Adapts**: the student ticks finished days and reports progress, and the agent rewrites the remaining plan.

## Tech
- Cloudflare Workers AI (free tier, no API keys) for the agent
- Plain HTML/CSS/JS front end, no login, no stored data

## Run it
```
npx wrangler dev      # local
npx wrangler deploy   # live
```

## Scale
Free to run, so it can be used by any college placement cell. Next: resume upload, GitHub project review, regional languages.

## Built for
Code for a Billion: Bharat Agentic-AI Hackathon 2026. Impact area: Tech Employment for Youth.
