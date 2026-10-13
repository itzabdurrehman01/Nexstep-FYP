/**
 * Seed entry_test_questions with real MDCAT/ECAT/NTS/NET question samples.
 * These are representative practice questions — NOT copied from any
 * proprietary source. They cover standard Pakistani curriculum topics.
 * Run: node node_modules/tsx/dist/cli.mjs scripts/seed_entry_test_questions.ts
 */
import dotenv from 'dotenv'; dotenv.config();
import pg from 'pg';
const { Pool } = pg;
const pool = new Pool({ host:process.env.PG_HOST||'127.0.0.1', port:Number(process.env.PG_PORT||5432), user:process.env.PG_USER||'postgres', password:process.env.PG_PASSWORD||'password', database:process.env.PG_DATABASE||'nexstep_db' });

type Q = { test_type:string; subject:string; difficulty:string; question:string; a:string; b:string; c:string; d:string; correct:'A'|'B'|'C'|'D'; explanation:string; chapter:string };

const QUESTIONS: Q[] = [
  // ─── MDCAT — Biology ───────────────────────────────────────────────────────
  { test_type:'MDCAT', subject:'Biology', difficulty:'Medium', question:'The basic unit of life is:', a:'Tissue', b:'Organ', c:'Cell', d:'Organism', correct:'C', explanation:'The cell is the fundamental structural and functional unit of all living organisms.', chapter:'Cell Biology' },
  { test_type:'MDCAT', subject:'Biology', difficulty:'Easy', question:'DNA stands for:', a:'Deoxyribose Nucleic Acid', b:'Deoxyribonucleic Acid', c:'Diribonucleic Acid', d:'Deoxyribose Nucleotide Acid', correct:'B', explanation:'DNA = Deoxyribonucleic Acid — the molecule carrying genetic information.', chapter:'Molecular Biology' },
  { test_type:'MDCAT', subject:'Biology', difficulty:'Medium', question:'Which organelle is called the powerhouse of the cell?', a:'Ribosome', b:'Nucleus', c:'Mitochondria', d:'Golgi Apparatus', correct:'C', explanation:'Mitochondria produce ATP through cellular respiration — hence "powerhouse".', chapter:'Cell Biology' },
  { test_type:'MDCAT', subject:'Biology', difficulty:'Hard', question:'The process by which plants make food using sunlight is called:', a:'Respiration', b:'Photosynthesis', c:'Transpiration', d:'Fermentation', correct:'B', explanation:'Photosynthesis converts CO₂ + H₂O + light energy → glucose + O₂.', chapter:'Bioenergetics' },
  { test_type:'MDCAT', subject:'Biology', difficulty:'Hard', question:'Which blood group is the universal donor?', a:'A', b:'B', c:'AB', d:'O', correct:'D', explanation:'Blood group O negative has no A, B, or Rh antigens, so it can donate to all groups.', chapter:'Transport' },
  { test_type:'MDCAT', subject:'Biology', difficulty:'Medium', question:'The site of protein synthesis in a cell is the:', a:'Nucleus', b:'Ribosome', c:'Mitochondria', d:'Vacuole', correct:'B', explanation:'Ribosomes translate mRNA into protein chains.', chapter:'Molecular Biology' },
  { test_type:'MDCAT', subject:'Biology', difficulty:'Easy', question:'Normal human body temperature is approximately:', a:'36.1°C', b:'37°C', c:'38°C', d:'39°C', correct:'B', explanation:'Normal core body temperature is approximately 37°C (98.6°F).', chapter:'Homeostasis' },
  { test_type:'MDCAT', subject:'Biology', difficulty:'Hard', question:'Which enzyme breaks down starch in the mouth?', a:'Pepsin', b:'Lipase', c:'Amylase', d:'Trypsin', correct:'C', explanation:'Salivary amylase (ptyalin) begins carbohydrate digestion in the oral cavity.', chapter:'Digestion' },
  // ─── MDCAT — Chemistry ─────────────────────────────────────────────────────
  { test_type:'MDCAT', subject:'Chemistry', difficulty:'Easy', question:'The atomic number of Carbon is:', a:'6', b:'12', c:'14', d:'8', correct:'A', explanation:'Carbon has 6 protons, giving it atomic number 6.', chapter:'Atomic Structure' },
  { test_type:'MDCAT', subject:'Chemistry', difficulty:'Medium', question:'pH of pure water at 25°C is:', a:'0', b:'7', c:'14', d:'1', correct:'B', explanation:'Pure water has equal H⁺ and OH⁻ concentrations, giving neutral pH = 7.', chapter:'Acids & Bases' },
  { test_type:'MDCAT', subject:'Chemistry', difficulty:'Hard', question:'Which of the following is an exothermic reaction?', a:'Melting of ice', b:'Combustion of methane', c:'Dissolving NH₄Cl in water', d:'Decomposition of CaCO₃', correct:'B', explanation:'Combustion releases heat to surroundings — exothermic (ΔH < 0).', chapter:'Thermochemistry' },
  { test_type:'MDCAT', subject:'Chemistry', difficulty:'Medium', question:'Molarity is defined as:', a:'Moles of solute per litre of solution', b:'Mass of solute per litre', c:'Moles per kg of solvent', d:'Volume of solute per volume of solution', correct:'A', explanation:'Molarity (M) = moles of solute / volume of solution in litres.', chapter:'Solutions' },
  { test_type:'MDCAT', subject:'Chemistry', difficulty:'Hard', question:'The hybridisation of carbon in methane (CH₄) is:', a:'sp', b:'sp²', c:'sp³', d:'sp³d', correct:'C', explanation:'Methane has 4 single bonds — carbon uses sp³ hybridisation with tetrahedral geometry.', chapter:'Chemical Bonding' },
  { test_type:'MDCAT', subject:'Chemistry', difficulty:'Easy', question:'Which gas is produced when acid reacts with a metal carbonate?', a:'Hydrogen', b:'Oxygen', c:'Carbon dioxide', d:'Nitrogen', correct:'C', explanation:'Acid + carbonate → salt + water + CO₂.', chapter:'Acids & Bases' },
  // ─── MDCAT — Physics ───────────────────────────────────────────────────────
  { test_type:'MDCAT', subject:'Physics', difficulty:'Easy', question:"Newton's first law of motion is also called the law of:", a:'Acceleration', b:'Inertia', c:'Gravitation', d:'Conservation', correct:'B', explanation:'Newton\'s first law — an object remains at rest or in uniform motion unless acted on by a net force — defines inertia.', chapter:'Mechanics' },
  { test_type:'MDCAT', subject:'Physics', difficulty:'Medium', question:'The SI unit of electric current is:', a:'Volt', b:'Ampere', c:'Ohm', d:'Watt', correct:'B', explanation:'The ampere (A) is the SI base unit for electric current.', chapter:'Electricity' },
  { test_type:'MDCAT', subject:'Physics', difficulty:'Hard', question:'Which of the following travels fastest in vacuum?', a:'Sound', b:'Radio waves', c:'Light', d:'Both B and C', correct:'D', explanation:'All electromagnetic waves (including radio waves and light) travel at c ≈ 3×10⁸ m/s in vacuum.', chapter:'Waves' },
  { test_type:'MDCAT', subject:'Physics', difficulty:'Medium', question:'The formula for kinetic energy is:', a:'mgh', b:'½mv²', c:'mv', d:'Fd', correct:'B', explanation:'KE = ½mv² where m = mass and v = velocity.', chapter:'Mechanics' },
  // ─── ECAT — Mathematics ────────────────────────────────────────────────────
  { test_type:'ECAT', subject:'Mathematics', difficulty:'Easy', question:'The derivative of sin(x) is:', a:'cos(x)', b:'-cos(x)', c:'-sin(x)', d:'tan(x)', correct:'A', explanation:'d/dx[sin x] = cos x — a fundamental calculus identity.', chapter:'Differentiation' },
  { test_type:'ECAT', subject:'Mathematics', difficulty:'Medium', question:'The value of log₁₀(1000) is:', a:'2', b:'3', c:'4', d:'10', correct:'B', explanation:'log₁₀(1000) = log₁₀(10³) = 3.', chapter:'Logarithms' },
  { test_type:'ECAT', subject:'Mathematics', difficulty:'Hard', question:'If A is a 3×3 matrix and det(A) = 5, what is det(2A)?', a:'10', b:'25', c:'40', d:'5', correct:'C', explanation:'For an n×n matrix, det(kA) = kⁿ·det(A). Here det(2A) = 2³×5 = 40.', chapter:'Matrices & Determinants' },
  { test_type:'ECAT', subject:'Mathematics', difficulty:'Medium', question:'The sum of an infinite geometric series with first term a and |r| < 1 is:', a:'a/(1-r)', b:'a/(1+r)', c:'a·r', d:'a(1-r)', correct:'A', explanation:'S∞ = a/(1-r) for a geometric series with |r| < 1.', chapter:'Sequences & Series' },
  { test_type:'ECAT', subject:'Mathematics', difficulty:'Hard', question:'The integral of 1/x is:', a:'x²/2', b:'ln|x| + C', c:'1/x² + C', d:'e^x + C', correct:'B', explanation:'∫(1/x)dx = ln|x| + C — a fundamental integration result.', chapter:'Integration' },
  { test_type:'ECAT', subject:'Mathematics', difficulty:'Easy', question:'How many sides does a pentagon have?', a:'4', b:'5', c:'6', d:'7', correct:'B', explanation:'A pentagon has 5 sides and 5 angles.', chapter:'Geometry' },
  // ─── ECAT — Physics ────────────────────────────────────────────────────────
  { test_type:'ECAT', subject:'Physics', difficulty:'Medium', question:"Ohm's law states that current is:", a:'Directly proportional to resistance', b:'Inversely proportional to voltage', c:'Directly proportional to voltage', d:'Independent of voltage', correct:'C', explanation:'V = IR, so I = V/R — current is directly proportional to voltage at constant resistance.', chapter:'Electricity' },
  { test_type:'ECAT', subject:'Physics', difficulty:'Hard', question:'The escape velocity from Earth is approximately:', a:'7.9 km/s', b:'11.2 km/s', c:'9.8 km/s', d:'3 km/s', correct:'B', explanation:'Escape velocity v = √(2GM/R) ≈ 11.2 km/s for Earth.', chapter:'Gravitation' },
  { test_type:'ECAT', subject:'Physics', difficulty:'Medium', question:'Which wave phenomenon allows a stick to appear bent in water?', a:'Reflection', b:'Refraction', c:'Diffraction', d:'Interference', correct:'B', explanation:'Refraction causes light to change direction when passing between media of different densities.', chapter:'Optics' },
  // ─── NTS-NAT — Quantitative ────────────────────────────────────────────────
  { test_type:'NTS-NAT', subject:'Quantitative', difficulty:'Easy', question:'If 5x = 25, what is x?', a:'3', b:'4', c:'5', d:'6', correct:'C', explanation:'5x = 25 → x = 5.', chapter:'Algebra' },
  { test_type:'NTS-NAT', subject:'Quantitative', difficulty:'Medium', question:'A train travels 120 km in 2 hours. What is its speed?', a:'40 km/h', b:'60 km/h', c:'80 km/h', d:'100 km/h', correct:'B', explanation:'Speed = Distance/Time = 120/2 = 60 km/h.', chapter:'Speed & Distance' },
  { test_type:'NTS-NAT', subject:'Quantitative', difficulty:'Hard', question:'What percentage of 80 is 20?', a:'20%', b:'25%', c:'30%', d:'40%', correct:'B', explanation:'(20/80) × 100 = 25%.', chapter:'Percentages' },
  { test_type:'NTS-NAT', subject:'Quantitative', difficulty:'Medium', question:'The average of 10, 20, 30, 40, and 50 is:', a:'25', b:'30', c:'35', d:'40', correct:'B', explanation:'Sum = 150, Count = 5, Average = 150/5 = 30.', chapter:'Statistics' },
  // ─── NTS-NAT — Verbal ──────────────────────────────────────────────────────
  { test_type:'NTS-NAT', subject:'Verbal', difficulty:'Easy', question:'Choose the synonym of "Benevolent":', a:'Cruel', b:'Kind', c:'Lazy', d:'Greedy', correct:'B', explanation:'Benevolent means well-meaning and kind; synonym = kind.', chapter:'Vocabulary' },
  { test_type:'NTS-NAT', subject:'Verbal', difficulty:'Medium', question:'Identify the correctly spelled word:', a:'Accomodate', b:'Accommodate', c:'Acommodate', d:'Accomadate', correct:'B', explanation:'"Accommodate" has double c and double m.', chapter:'Spelling' },
  { test_type:'NTS-NAT', subject:'Verbal', difficulty:'Hard', question:'The word "ephemeral" most nearly means:', a:'Permanent', b:'Short-lived', c:'Ancient', d:'Powerful', correct:'B', explanation:'Ephemeral = lasting for a very short time.', chapter:'Vocabulary' },
  // ─── NTS-NAT — Analytical ──────────────────────────────────────────────────
  { test_type:'NTS-NAT', subject:'Analytical', difficulty:'Medium', question:'If all Pakistanis are Asian, and Ali is Pakistani, then Ali is:', a:'Not Asian', b:'Asian', c:'European', d:'Cannot be determined', correct:'B', explanation:'Syllogism: All A are B; Ali is A; therefore Ali is B.', chapter:'Logical Reasoning' },
  { test_type:'NTS-NAT', subject:'Analytical', difficulty:'Hard', question:'Which number comes next: 2, 4, 8, 16, ___?', a:'24', b:'28', c:'32', d:'36', correct:'C', explanation:'Each term is multiplied by 2: 16 × 2 = 32.', chapter:'Number Series' },
  // ─── NET (NUST Entry Test) — Computer Science ──────────────────────────────
  { test_type:'NET', subject:'Computer Science', difficulty:'Easy', question:'What does CPU stand for?', a:'Central Processing Unit', b:'Control Processing Unit', c:'Computer Processing Unit', d:'Central Program Unit', correct:'A', explanation:'CPU = Central Processing Unit — the brain of the computer.', chapter:'Computer Fundamentals' },
  { test_type:'NET', subject:'Computer Science', difficulty:'Medium', question:'Binary for decimal 10 is:', a:'1010', b:'1100', c:'1001', d:'0110', correct:'A', explanation:'10 = 8+2 = 2³+2¹ = 1010 in binary.', chapter:'Number Systems' },
  { test_type:'NET', subject:'Computer Science', difficulty:'Hard', question:'Time complexity of binary search is:', a:'O(n)', b:'O(n²)', c:'O(log n)', d:'O(n log n)', correct:'C', explanation:'Binary search halves the search space each step: O(log n).', chapter:'Algorithms' },
  { test_type:'NET', subject:'Computer Science', difficulty:'Medium', question:'Which data structure follows FIFO?', a:'Stack', b:'Queue', c:'Tree', d:'Graph', correct:'B', explanation:'Queue = First In, First Out (FIFO). Stack = LIFO.', chapter:'Data Structures' },
  { test_type:'NET', subject:'Computer Science', difficulty:'Hard', question:'What is the output of: print(type(3.14)) in Python?', a:"<class 'int'>", b:"<class 'float'>", c:"<class 'str'>", d:"<class 'double'>", correct:'B', explanation:'3.14 is a floating-point number; type() returns <class \'float\'>.', chapter:'Python Programming' },
  // ─── NET — Mathematics ─────────────────────────────────────────────────────
  { test_type:'NET', subject:'Mathematics', difficulty:'Medium', question:'The determinant of matrix [[1,2],[3,4]] is:', a:'-2', b:'2', c:'-10', d:'10', correct:'A', explanation:'det = (1×4)-(2×3) = 4-6 = -2.', chapter:'Matrices' },
  { test_type:'NET', subject:'Mathematics', difficulty:'Hard', question:'The domain of f(x) = √(x-3) is:', a:'x < 3', b:'x ≤ 3', c:'x ≥ 3', d:'All real numbers', correct:'C', explanation:'For the square root to be real, we need x-3 ≥ 0, so x ≥ 3.', chapter:'Functions' },
  // ─── NUMS — Biology ────────────────────────────────────────────────────────
  { test_type:'NUMS', subject:'Biology', difficulty:'Hard', question:'The liquid part of blood is called:', a:'Plasma', b:'Serum', c:'Lymph', d:'Bile', correct:'A', explanation:'Plasma is the liquid component (~55%) of blood, containing proteins, clotting factors, and nutrients.', chapter:'Transport' },
  { test_type:'NUMS', subject:'Biology', difficulty:'Medium', question:'Which vitamin is produced when skin is exposed to sunlight?', a:'Vitamin A', b:'Vitamin B12', c:'Vitamin C', d:'Vitamin D', correct:'D', explanation:'Sunlight (UV-B) triggers synthesis of Vitamin D in the skin.', chapter:'Nutrition' },
  { test_type:'NUMS', subject:'Biology', difficulty:'Hard', question:'The process of cell division that produces gametes is:', a:'Mitosis', b:'Meiosis', c:'Fission', d:'Budding', correct:'B', explanation:'Meiosis reduces chromosome number by half, producing haploid gametes.', chapter:'Reproduction' },
];

async function run() {
  console.log(`\nSeeding ${QUESTIONS.length} entry test questions...`);
  let ins = 0, dup = 0;
  for (const q of QUESTIONS) {
    try {
      await pool.query(
        `INSERT INTO entry_test_questions (test_type,subject,difficulty,question,option_a,option_b,option_c,option_d,correct,explanation,chapter)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
        [q.test_type,q.subject,q.difficulty,q.question,q.a,q.b,q.c,q.d,q.correct,q.explanation,q.chapter]
      );
      ins++;
    } catch { dup++; }
  }
  const total = await pool.query(`SELECT test_type, COUNT(*) AS n FROM entry_test_questions GROUP BY test_type ORDER BY test_type`);
  console.log(`\n✓ Inserted: ${ins}, duplicates: ${dup}`);
  console.log('\nBreakdown by test:');
  total.rows.forEach((r:any) => console.log(`  ${r.test_type.padEnd(10)}: ${r.n} questions`));
  await pool.end();
}
run().then(()=>process.exit(0)).catch(e=>{console.error(e.message);process.exit(1);});
