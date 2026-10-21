# IPL Auction Simulator: Starter (Milestones 1-2)

MERN stack: MongoDB + Express + React (Vite) + Node.

## What works now
- Login with JWT (roles: admin / team)
- 20 sample players with skill scores and an auto-computed overall score
- 4 teams, each with the same purse (100 Cr)
- Players page with role filter

## Run it

### 1. Database
Create a free cluster on MongoDB Atlas (or install MongoDB locally) and copy the connection string.

### 2. Server
```bash
cd server
npm install
cp .env.example .env     # then edit .env: paste MONGO_URI and set JWT_SECRET
npm run seed             # creates admin, teams, players
npm run dev              # http://localhost:5000
```

### 3. Client (new terminal)
```bash
cd client
npm install
cp .env.example .env
npm run dev              # http://localhost:5173
```

### Logins (from seed)
| Who | Username | Password |
|-----|----------|----------|
| Admin | admin | admin123 |
| Teams | mum, che, blr, kol | team123 |

Change these passwords before deploying anywhere public.

## Folder guide
```
server/
  index.js          app entry
  seed.js           demo data
  models/           User, Team, Player
  routes/           auth, players
  middleware/       login + admin checks
  utils/score.js    overall score formula (edit the WEIGHTS to tune it)
client/src/
  api.js            fetch helper + session storage
  pages/            Login, Players
```

## Next milestones
3. Team dashboard: purse, squad
4. Admin "start next player" + Socket.IO live bidding with a server-side timer
5. Admin dashboard: sold / unsold per team
6. 11 vs 11 match simulator
