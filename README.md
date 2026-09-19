# Agent University

**VTHacks — Best use of ANS (Agent Name Service)**

A multi-agent campus where **identity is the product**: domain-anchored ANS names, ACME domain verify, Bronze/Silver/Gold trust tiers, transparency log receipts, accreditation web, coursework with guest-lecturer verify, transfer credits, diplomas, and hiring that rejects diploma mills / version swaps.

## Demo path (judges)

1. **Journey** tab → Register student (ACME)  
2. Enroll + complete ≥2 AgentU courses (professor/guest ANS verified)  
3. **Issue accredited diploma** → **Apply to Acme** → **HIRED**  
4. **Buy instant PhD** (mill) → Apply → **REJECTED**  
5. Optional **Attacks** → bump uni version → old diploma fails version bind  
6. Explore **ANS Registry** + **Transparency Log**

## Run

```bash
npm install
npm run dev
```

http://localhost:3001 (or 3000)

## Architecture (demo)

- `src/lib/ans.ts` — register, ACME, verify tiers, revoke, version bump  
- `src/lib/store.ts` — world state + hash-chained transparency log  
- `src/lib/seed.ts` — uni, poly, mill, board, prof, guest, employer  
- `src/lib/university.ts` — enroll, complete, transfer, graduate, hire  

Mock ANS for hackathon speed; pitch maps to real ANS RA / TL / DANE.
