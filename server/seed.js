// Run once:  npm run seed
// Creates 1 admin, 4 teams (same purse), 4 team logins and 20 sample players.
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
const Team = require('./models/Team');
const Player = require('./models/Player');
const Lineup = require('./models/Lineup');
const Match = require('./models/Match');
const { computeOverall } = require('./utils/score');
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/ipl-auction';
const TEAMS = [
  { name: 'Mumbai Indians', shortName: 'MI' },
  { name: 'Chennai Super Kings', shortName: 'CSK' },
  { name: 'Royal Challengers Bengaluru', shortName: 'RCB' },
];

// name, role, nationality, basePrice(lakh), batting, bowling, fielding, experience
const PLAYERS = [
  // Batters
  ['Virat Kohli', 'BAT', 'India', 200, 96, 20, 88, 98],
  ['Rohit Sharma', 'BAT', 'India', 200, 92, 10, 80, 98],
  ['Shubman Gill', 'BAT', 'India', 200, 90, 5, 80, 75],
  ['Suryakumar Yadav', 'BAT', 'India', 200, 93, 5, 82, 85],
  ['Yashasvi Jaiswal', 'BAT', 'India', 200, 89, 5, 78, 65],
  ['Shreyas Iyer', 'BAT', 'India', 200, 85, 5, 80, 80],
  ['Ruturaj Gaikwad', 'BAT', 'India', 150, 86, 5, 78, 70],
  ['Tilak Varma', 'BAT', 'India', 100, 80, 15, 78, 55],
  ['Sai Sudharsan', 'BAT', 'India', 100, 80, 5, 75, 50],
  ['Rinku Singh', 'BAT', 'India', 100, 78, 5, 80, 60],
  ['David Warner', 'BAT', 'Australia', 200, 88, 5, 78, 95],
  ['Travis Head', 'BAT', 'Australia', 200, 90, 10, 75, 65],
  ['Faf du Plessis', 'BAT', 'South Africa', 200, 85, 5, 85, 92],

  // Wicketkeepers
  ['MS Dhoni', 'WK', 'India', 200, 80, 0, 92, 99],
  ['Rishabh Pant', 'WK', 'India', 200, 88, 0, 85, 80],
  ['KL Rahul', 'WK', 'India', 200, 88, 0, 85, 85],
  ['Sanju Samson', 'WK', 'India', 200, 86, 0, 85, 80],
  ['Ishan Kishan', 'WK', 'India', 150, 80, 0, 82, 65],
  ['Jos Buttler', 'WK', 'England', 200, 92, 0, 86, 88],
  ['Heinrich Klaasen', 'WK', 'South Africa', 200, 90, 0, 84, 70],
  ['Phil Salt', 'WK', 'England', 150, 84, 0, 78, 55],

  // All-rounders
  ['Hardik Pandya', 'AR', 'India', 200, 82, 78, 82, 85],
  ['Ravindra Jadeja', 'AR', 'India', 200, 72, 85, 95, 92],
  ['Andre Russell', 'AR', 'West Indies', 200, 86, 74, 80, 88],
  ['Glenn Maxwell', 'AR', 'Australia', 200, 84, 62, 90, 85],
  ['Sunil Narine', 'AR', 'West Indies', 200, 70, 88, 78, 90],
  ['Marcus Stoinis', 'AR', 'Australia', 150, 78, 68, 78, 78],
  ['Axar Patel', 'AR', 'India', 150, 68, 80, 80, 72],
  ['Washington Sundar', 'AR', 'India', 100, 55, 76, 75, 55],
  ['Shivam Dube', 'AR', 'India', 150, 80, 35, 70, 60],
  ['Liam Livingstone', 'AR', 'England', 150, 80, 55, 75, 60],
  ['Sam Curran', 'AR', 'England', 200, 70, 78, 75, 70],
  ['Mitchell Marsh', 'AR', 'Australia', 150, 78, 65, 75, 70],
  ['Rashid Khan', 'AR', 'Afghanistan', 200, 60, 94, 80, 85],

  // Bowlers
  ['Jasprit Bumrah', 'BOWL', 'India', 200, 10, 97, 70, 90],
  ['Mohammed Shami', 'BOWL', 'India', 200, 12, 90, 65, 88],
  ['Mohammed Siraj', 'BOWL', 'India', 150, 8, 86, 72, 75],
  ['Arshdeep Singh', 'BOWL', 'India', 150, 8, 85, 68, 65],
  ['Yuzvendra Chahal', 'BOWL', 'India', 200, 8, 87, 65, 85],
  ['Kuldeep Yadav', 'BOWL', 'India', 200, 10, 88, 70, 78],
  ['Ravichandran Ashwin', 'BOWL', 'India', 200, 45, 82, 72, 95],
  ['Varun Chakravarthy', 'BOWL', 'India', 150, 5, 84, 62, 65],
  ['Trent Boult', 'BOWL', 'New Zealand', 200, 10, 89, 68, 88],
  ['Pat Cummins', 'BOWL', 'Australia', 200, 40, 90, 70, 85],
  ['Mitchell Starc', 'BOWL', 'Australia', 200, 25, 90, 68, 85],
  ['Kagiso Rabada', 'BOWL', 'South Africa', 200, 20, 88, 70, 80],
  ['Josh Hazlewood', 'BOWL', 'Australia', 200, 10, 86, 68, 75],
  ['T Natarajan', 'BOWL', 'India', 100, 5, 82, 60, 65],
  ['Bhuvneshwar Kumar', 'BOWL', 'India', 150, 20, 85, 65, 92],
  ['Harshal Patel', 'BOWL', 'India', 100, 15, 80, 62, 78],
  ['Matheesha Pathirana', 'BOWL', 'Sri Lanka', 100, 5, 82, 60, 45],
];

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  await Promise.all([
  User.deleteMany({}), Team.deleteMany({}), Player.deleteMany({}),
  Lineup.deleteMany({}), Match.deleteMany({}),
]);

  const admin = await bcrypt.hash('admin123', 10);
  await User.create({ username: 'admin', passwordHash: admin, role: 'admin' });

  for (const t of TEAMS) {
    const team = await Team.create({ ...t, purse: 10000 }); // 100 Cr each
    const hash = await bcrypt.hash('team123', 10);
    await User.create({
      username: t.shortName.toLowerCase(),
      passwordHash: hash,
      role: 'team',
      team: team._id,
    });
  }

  for (const [name, role, nationality, basePrice, batting, bowling, fielding, experience] of PLAYERS) {
    const p = { name, role, nationality, basePrice, batting, bowling, fielding, experience };
    p.overall = computeOverall(p);
    await Player.create(p);
  }

  console.log('Seed done.');
  console.log('Admin login:  admin / admin123');
  console.log('Team logins:  mi,csk,rcb (password: team123)');
  process.exit(0);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
