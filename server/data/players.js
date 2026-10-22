// Shared data for seed.js (fresh database) and addData.js (existing database).
// NOTE: names are real players; skill scores (0-100) are rough estimates for the game, not official stats.
const { computeOverall } = require('../utils/score');

const TEAMS = [
  { name: 'Mumbai Indians', shortName: 'MI' },
  { name: 'Chennai Super Kings', shortName: 'CSK' },
  { name: 'Royal Challengers Bengaluru', shortName: 'RCB' },
  { name: 'Lucknow Super Giants', shortName: 'LSG' },
];

// name, role, nationality, basePrice(lakh), batting, bowling, fielding, experience
const ROWS = [
  // ---- Batters ----
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
  ['Devdutt Padikkal', 'BAT', 'India', 100, 78, 5, 72, 55],
  ['Prithvi Shaw', 'BAT', 'India', 75, 75, 5, 70, 55],
  ['Abhishek Sharma', 'BAT', 'India', 150, 84, 40, 75, 50],
  ['Rajat Patidar', 'BAT', 'India', 100, 79, 5, 75, 50],
  ['Shikhar Dhawan', 'BAT', 'India', 150, 80, 5, 78, 92],
  ['Ajinkya Rahane', 'BAT', 'India', 100, 76, 5, 82, 90],
  ['Nitish Rana', 'BAT', 'India', 100, 76, 25, 75, 65],
  ['Devon Conway', 'BAT', 'New Zealand', 150, 82, 5, 76, 60],
  ['Kane Williamson', 'BAT', 'New Zealand', 150, 83, 15, 82, 90],
  ['Aiden Markram', 'BAT', 'South Africa', 150, 80, 30, 80, 68],
  ['Shimron Hetmyer', 'BAT', 'West Indies', 100, 78, 5, 75, 60],
  ['Tim David', 'BAT', 'Australia', 150, 82, 15, 76, 55],
  ['Harry Brook', 'BAT', 'England', 150, 82, 10, 78, 55],

  // ---- Wicketkeepers ----
  ['MS Dhoni', 'WK', 'India', 200, 80, 0, 92, 99],
  ['Rishabh Pant', 'WK', 'India', 200, 88, 0, 85, 80],
  ['KL Rahul', 'WK', 'India', 200, 88, 0, 85, 85],
  ['Sanju Samson', 'WK', 'India', 200, 86, 0, 85, 80],
  ['Ishan Kishan', 'WK', 'India', 150, 80, 0, 82, 65],
  ['Jos Buttler', 'WK', 'England', 200, 92, 0, 86, 88],
  ['Heinrich Klaasen', 'WK', 'South Africa', 200, 90, 0, 84, 70],
  ['Phil Salt', 'WK', 'England', 150, 84, 0, 78, 55],
  ['Quinton de Kock', 'WK', 'South Africa', 200, 87, 0, 88, 88],
  ['Nicholas Pooran', 'WK', 'West Indies', 200, 87, 0, 80, 72],
  ['Jonny Bairstow', 'WK', 'England', 150, 82, 0, 80, 82],
  ['Jitesh Sharma', 'WK', 'India', 75, 74, 0, 76, 40],
  ['Dhruv Jurel', 'WK', 'India', 75, 72, 0, 80, 35],
  ['Wriddhiman Saha', 'WK', 'India', 75, 68, 0, 85, 92],
  ['Rahmanullah Gurbaz', 'WK', 'Afghanistan', 100, 76, 0, 76, 45],
  ['Abishek Porel', 'WK', 'India', 50, 68, 0, 72, 30],

  // ---- All-rounders ----
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
  ['Rachin Ravindra', 'AR', 'New Zealand', 150, 76, 70, 80, 40],
  ['Mitchell Santner', 'AR', 'New Zealand', 100, 60, 80, 78, 65],
  ['Moeen Ali', 'AR', 'England', 150, 74, 74, 74, 85],
  ['Jason Holder', 'AR', 'West Indies', 150, 62, 80, 76, 70],
  ['Venkatesh Iyer', 'AR', 'India', 100, 76, 50, 74, 55],
  ['Krunal Pandya', 'AR', 'India', 100, 62, 76, 78, 78],
  ['Riyan Parag', 'AR', 'India', 100, 74, 45, 78, 50],
  ['Marco Jansen', 'AR', 'South Africa', 150, 55, 82, 70, 45],
  ['Cameron Green', 'AR', 'Australia', 150, 76, 70, 80, 50],
  ['Nitish Kumar Reddy', 'AR', 'India', 75, 72, 60, 74, 25],
  ['Vijay Shankar', 'AR', 'India', 75, 66, 55, 72, 60],
  ['Wanindu Hasaranga', 'AR', 'Sri Lanka', 150, 55, 84, 72, 60],
  ['Shardul Thakur', 'AR', 'India', 100, 58, 76, 66, 75],

  // ---- Bowlers ----
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
  ['Mohit Sharma', 'BOWL', 'India', 75, 5, 78, 60, 80],
  ['Umesh Yadav', 'BOWL', 'India', 75, 8, 78, 62, 88],
  ['Avesh Khan', 'BOWL', 'India', 100, 8, 82, 64, 60],
  ['Ravi Bishnoi', 'BOWL', 'India', 100, 5, 82, 62, 50],
  ['Deepak Chahar', 'BOWL', 'India', 100, 25, 80, 68, 75],
  ['Mayank Yadav', 'BOWL', 'India', 100, 5, 84, 62, 20],
  ['Harshit Rana', 'BOWL', 'India', 75, 10, 78, 62, 25],
  ['Lockie Ferguson', 'BOWL', 'New Zealand', 150, 10, 85, 66, 75],
  ['Anrich Nortje', 'BOWL', 'South Africa', 150, 5, 86, 65, 70],
  ['Jofra Archer', 'BOWL', 'England', 200, 20, 88, 72, 70],
  ['Mustafizur Rahman', 'BOWL', 'Bangladesh', 100, 5, 82, 62, 80],
  ['Maheesh Theekshana', 'BOWL', 'Sri Lanka', 100, 10, 78, 62, 50],
  ['Noor Ahmad', 'BOWL', 'Afghanistan', 100, 8, 82, 62, 45],
  ['Adam Zampa', 'BOWL', 'Australia', 100, 5, 80, 64, 65],
  ['Jaydev Unadkat', 'BOWL', 'India', 75, 10, 74, 62, 85],
];

const PLAYERS = ROWS.map(
  ([name, role, nationality, basePrice, batting, bowling, fielding, experience]) => {
    const p = { name, role, nationality, basePrice, batting, bowling, fielding, experience };
    p.overall = computeOverall(p);
    return p;
  }
);

module.exports = { TEAMS, PLAYERS };