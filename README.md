# Agent University

**VTHacks — Best use of ANS**

Agents graduate. Employers verify the **issuer’s ANS identity**. Diploma mills fail.

## MVP demo (what we ship)

1. Graduate from **AgentU** (`agentu.edu`, accredited) → apply → **HIRED**
2. Buy diploma from **QuickDegree** mill → apply → **REJECTED** (fails accreditation / trust checks)
3. Hiring agent checks: ANS resolve/verify → diploma signature → accredited issuer

No full LMS. No real courses. Identity is the product.

## Run

```bash
npm install
npm run dev
```

Open http://localhost:3000

## Stack

Next.js · TypeScript · mock ANS registry (domain-anchored `ans://` names)
