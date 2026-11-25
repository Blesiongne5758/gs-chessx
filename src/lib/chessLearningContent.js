export const STORIES = [
  {
    year: '1851',
    title: 'The Immortal Game in London',
    text: 'During the first international chess tournament in London, Adolf Anderssen faced Lionel Kieseritzky in an informal friendly game. Anderssen sacrificed both rooks, an entire bishop, and famously his queen to deliver a poetic checkmate with minor pieces. This masterpiece came to define the daring Romantic Era of chess.',
    lesson: 'Lesson: Piece activity and coordination can decisively overpower sheer material count.'
  },
  {
    year: '1858',
    title: 'Paul Morphy and The Opera Game',
    text: 'At the Paris Opera House during a performance of The Barber of Seville, American prodigy Paul Morphy took on the Duke of Brunswick and Count Isouard in consultation. Morphy conducted a clinic in rapid piece development, open files, and pins, culminating in a queen sacrifice and back-rank checkmate.',
    lesson: 'Lesson: Mobilize all pieces swiftly before initiating contact, and dominate open central files.'
  },
  {
    year: '1886',
    title: 'The First Official World Championship',
    text: 'Wilhelm Steinitz and Johannes Zukertort battled in what is remembered as the first official world championship across New York, St. Louis, and New Orleans. Steinitz introduced positional chess dogma: rather than launching reckless romantic attacks, masters should accumulate small positional advantages until a breakthrough is inevitable.',
    lesson: 'Lesson: Improve piece placement, pawn structure, and outpost control before attempting tactical strikes.'
  },
  {
    year: '1927',
    title: 'Alekhine Conquers The Chess Machine',
    text: 'José Raúl Capablanca was hailed as invincible, having gone years without losing a single game. Alexander Alekhine entered their 34-game World Championship match in Buenos Aires having never beaten Capablanca. Through obsessive preparation and relentless psychological tenacity, Alekhine broke through to shock the world.',
    lesson: 'Lesson: Deep preparation and disciplined psychological resilience can topple even seemingly unbeatable opponents.'
  },
  {
    year: '1938',
    title: 'Vera Menchik: Pioneer of Women’s Chess',
    text: 'Vera Menchik was the first Women’s World Chess Champion, reigning undefeated in title matches from 1927 until her tragic death in 1944. Competing against top male grandmasters of the era, she defeated world champions and contenders, leading male masters to inaugurate the celebrated "Menchik Club" for those who fell to her.',
    lesson: 'Lesson: Strategic clarity, tactical mastery, and competitive bravery transcend all barriers.'
  },
  {
    year: '1960',
    title: 'The Magician of Riga Dethrones Botvinnik',
    text: 'At just 23 years old, Mikhail Tal confronted the scientific champion Mikhail Botvinnik. Tal unleashed dizzying tactical complications, sacrificing pawns and pieces on intuition alone. Botvinnik, an engineering mind who calculated rigidly, was overwhelmed by the sheer psychological pressure of Tal’s creative fireworks.',
    lesson: 'Lesson: Psychological pressure and dynamic complications can disrupt even the most rigid defenses.'
  },
  {
    year: '1972',
    title: 'The Match of the Century in Reykjavík',
    text: 'Bobby Fischer challenged Soviet World Champion Boris Spassky under immense geopolitical tension in Iceland. Despite defaulting game two, Fischer produced a tour-de-force of theoretical opening preparation and crystalline endgame technique, terminating 24 years of uninterrupted Soviet world dominance.',
    lesson: 'Lesson: Flawless preparation combined with uncompromising will transforms pressure into victory.'
  },
  {
    year: '1985',
    title: 'Kasparov’s Dynamic Revolution',
    text: 'At age 22, Garry Kasparov defeated Anatoly Karpov to become the youngest World Champion in history. Kasparov injected dynamic aggressiveness, relentless initiative, and exhaustive opening novelty into classical chess, redefining how modern grandmasters calculate and contest the board.',
    lesson: 'Lesson: Initiative is the most precious currency in chess; never surrender dynamic piece play passively.'
  },
  {
    year: '1997',
    title: 'Humanity vs Deep Blue',
    text: 'Garry Kasparov clashed with IBM’s Deep Blue supercomputer in New York City. The contest became a defining milestone in artificial intelligence history: elite chess players realized that concrete calculation could be supplemented by machine analysis, transforming opening preparation forever.',
    lesson: 'Lesson: Embrace computational rigor, but remember intuition and human strategic harmony remain irreplaceable.'
  },
  {
    year: '2013',
    title: 'Magnus Carlsen: The Endgame Prodigy',
    text: 'In Chennai, 22-year-old Norwegian sensation Magnus Carlsen faced Viswanathan Anand. Rather than memorizing long opening sequences, Carlsen sought playable, equal positions and squeezed imperceptible advantages in the endgame for 80+ moves until opponents cracked under relentless technical pressure.',
    lesson: 'Lesson: Perfect technical endgame play can grind out wins from seemingly harmless, equal positions.'
  },
  {
    year: '2018',
    title: 'AlphaZero and The Neural Revolution',
    text: 'DeepMind introduced AlphaZero, an artificial neural network algorithm that taught itself chess from zero knowledge in just four hours. AlphaZero astonished the chess world by reviving romantic pawn sacrifices, flank pawn pushes (h4-h5), and piece activity over material greed.',
    lesson: 'Lesson: Long-term king restriction and total piece mobility are often worth substantial material sacrifices.'
  },
  {
    year: '2023',
    title: 'Ding Liren’s Leap of Faith in Astana',
    text: 'In the rapid tiebreaks of the 2023 World Chess Championship against Ian Nepomniachtchi, game 4 seemed destined for a threefold repetition draw. With seconds left on his clock, Ding Liren courageously played 46...Rg6!, pinning his own rook to his king to play for the win and capture China’s first World Championship crown.',
    lesson: 'Lesson: Great champions possess the courage to embrace risk when history is on the line.'
  }
];

export const PUZZLES = [
  {
    label: 'DEVELOPMENT',
    position: ['r...k..r', 'ppp..ppp', '..n..n..', '...p....', '...P....', '..N..N..', 'PPP..PPP', 'R..QK..R'],
    prompt: 'Your king remains in the center, two bishops are undeveloped, and the opponent poses no immediate threat. Best priority?',
    options: ['Castle and complete minor piece development', 'Push flank pawns repeatedly', 'Bring the queen out to hunt pawns'],
    answer: 0,
    explanation: 'Castling secures the king while connecting rooks. Classical opening principles prioritize king safety and rapid development of minor pieces.'
  },
  {
    label: 'TEMPO',
    position: ['r..qk..r', 'ppp..ppp', '..n.....', '...p....', '...P....', '..N..N..', 'PPP..PPP', 'R..QK..R'],
    prompt: 'The opponent brought their queen out prematurely. What is the most principled strategic response?',
    options: ['Develop pieces while attacking the queen with tempo', 'Chase the queen with all pawns', 'Trade queens without evaluating structure'],
    answer: 0,
    explanation: 'Developing with tempo gains initiative while forcing the opposing queen to move repeatedly. Never ruin pawn structure just to harass a queen.'
  },
  {
    label: 'PIN',
    position: ['r.bqk..r', 'pppp.ppp', '..n.....', '....b...', '..B.P...', '....BN..', 'PPPP.PPP', 'R..QK..R'],
    prompt: 'Black pinned your f3 knight against your queen with Bg4. What is White’s most solid positional response?',
    options: ['Unpin smoothly with Be2 while preparing kingside castling', 'Push g4 recklessly and expose your own king', 'Resign immediately because the pin is terminal'],
    answer: 0,
    explanation: 'Playing Be2 breaks the absolute pin cleanly, neutralizes tactical pressure on the f3 knight, and prepares safe castling.'
  },
  {
    label: 'FORK',
    position: ['r...k..r', 'pp.q.ppp', '..n.....', '....N...', '........', '........', 'PPPP.PPP', 'R...K..R'],
    prompt: 'White’s knight on e5 can jump to d7 or c6. Black’s King is on e8 and Queen is on d7. What tactical motif wins the queen?',
    options: ['Execute a royal knight fork attacking King and Queen simultaneously', 'Push a flank pawn', 'Trade rooks on the back rank'],
    answer: 0,
    explanation: 'A fork occurs when a single piece attacks two or more enemy pieces at once. Knights are uniquely dangerous fork specialists.'
  },
  {
    label: 'BACK-RANK',
    position: ['.....rk.', 'ppp...pp', '........', '........', '........', '........', 'PPP...PP', '.....R.K'],
    prompt: 'Black’s king is boxed in behind an unadvanced pawn shield on g7 and h7. White controls the open d-file with a rook. What is the killing blow?',
    options: ['Infiltrate with Rd8# delivering an inescapable back-rank checkmate', 'Advance your h-pawn slowly', 'Trade pieces passively'],
    answer: 0,
    explanation: 'When a king has no escape square ("luft") on the rank above, a rook or queen penetrating to the 8th rank results in back-rank mate.'
  },
  {
    label: 'DISCOVERED CHECK',
    position: ['r...k..r', 'ppp.qppp', '........', '..B.....', '...N....', '........', 'PPP..PPP', 'R...K..R'],
    prompt: 'White has a bishop on c4 aiming at the enemy king or queen on e7, masked only by White’s own knight on d5. What tactical concept is this?',
    options: ['Discovered attack / check — leaping the knight unmasks the bishop with devastating effect', 'Perpetual check', 'En passant'],
    answer: 0,
    explanation: 'A discovered attack occurs when moving one piece unmasks a line of attack from another piece behind it, creating unstoppable double threats.'
  },
  {
    label: 'DEFLECTION',
    position: ['...r..k.', '.....ppp', '........', '...q....', '........', '...Q....', 'PPP..PPP', '...R..K.'],
    prompt: 'Black’s rook on d8 guards their queen on d5. How does White win the opposing queen?',
    options: ['Deflect or remove the guarding rook, depriving the queen of its protection', 'Offer an immediate draw', 'Retreat the white queen'],
    answer: 0,
    explanation: 'Deflection forces an enemy piece away from its critical defensive duty, leaving its partner undefended.'
  },
  {
    label: 'ENDGAME OPPOSITION',
    position: ['........', '........', '........', '....k...', '....K...', '....P...', '........', '........'],
    prompt: 'In a king and pawn ending, White’s king stands on e4 facing Black’s king on e6 with one square between them. What is this concept?',
    options: ['Direct Opposition — seizing it forces the opponent’s king to step aside', 'Smothered mate', 'Threefold repetition'],
    answer: 0,
    explanation: 'Opposition is a cornerstone of king and pawn endgames. Controlling the opposition forces the defending king to give way, allowing your pawn to promote.'
  },
  {
    label: 'OUTPOST',
    position: ['r...k..r', 'pp.p.ppp', '..n.....', '....N...', '...P....', '........', 'PPP..PPP', 'R..QK..R'],
    prompt: 'White has anchored a knight on e5 where no enemy pawn can ever drive it away, supported securely by d4. What is this square called?',
    options: ['An Outpost — a permanent forward base for an active minor piece', 'An isolated pawn island', 'A backward pawn hole'],
    answer: 0,
    explanation: 'An outpost is a square that cannot be attacked by enemy pawns. A knight stationed on an advanced central outpost dominates the board.'
  },
  {
    label: 'SKEWER',
    position: ['r...k...', '........', '........', '....R...', '........', '........', '........', '....K...'],
    prompt: 'White’s rook checks the Black king on e5. Directly behind the king on e8 sits an unguarded black rook. What is this geometric tactical motif?',
    options: ['A Skewer — the more valuable piece must flee, exposing the piece behind it', 'A knight fork', 'A pawn pin'],
    answer: 0,
    explanation: 'Unlike a pin (where the less valuable piece is in front), a skewer attacks the more valuable piece first, winning the piece behind when it moves.'
  },
  {
    label: 'ZUGZWANG',
    position: ['........', '........', '...k....', '...K....', '....P...', '........', '........', '........'],
    prompt: 'It is Black’s turn to move. Every legal king move abandons defense of their key square and allows White to queen. What is this situation?',
    options: ['Zugzwang — a position where having to move is a fatal disadvantage', 'Stalemate draw', 'Perpetual check'],
    answer: 0,
    explanation: 'Zugzwang (German for "compulsion to move") occurs when a player would prefer to pass, but the rules force them to make a move that worsens their position.'
  },
  {
    label: 'PROMOTION',
    position: ['........', '....P...', '........', '....k...', '........', '....K...', '........', '........'],
    prompt: 'White’s pawn has safely reached e7 with the white king guarding e8. Black’s king cannot prevent the advance. Best move?',
    options: ['Advance e8=Q (promote to Queen) to establish decisive winning advantage', 'Retreat your king to e1', 'Offer a draw'],
    answer: 0,
    explanation: 'Promoting a pawn to a Queen is the crowning goal of endgame conversions, securing immediate overwhelming material superiority.'
  }
];

export const QUIZ = [
  {
    question: 'Who was Bobby Fischer’s opponent in the historic 1972 Reykjavík World Championship match?',
    options: ['Boris Spassky', 'Mikhail Tal', 'Anatoly Karpov'],
    answer: 0,
    explanation: 'Fischer defeated Boris Spassky 12.5–8.5 in the legendary 1972 World Championship in Reykjavík, Iceland.'
  },
  {
    question: 'Which principle best captures sound classical opening strategy?',
    options: ['Control the center, develop minor pieces rapidly, and secure the king', 'Move the queen multiple times in the first five moves', 'Push flank pawns repeatedly before developing pieces'],
    answer: 0,
    explanation: 'Controlling the central squares (d4, d5, e4, e5), rapid piece mobilization, and early castling create the foundation for middlegame success.'
  },
  {
    question: 'When your opponent’s king is uncastled and stuck in the center, what is the most critical thematic plan?',
    options: ['Open central files with pawn breaks to expose the king to your active pieces', 'Trade all queens and rooks immediately', 'Block the center and push flank pawns slowly'],
    answer: 0,
    explanation: 'Opening lines in the center unleashes your rooks and queen directly against an unshielded enemy king before it can find safety.'
  },
  {
    question: 'What is a "Fork" in chess tactics?',
    options: ['A single piece attacking two or more enemy pieces simultaneously', 'A pawn moving two squares forward', 'Trading two minor pieces for a rook'],
    answer: 0,
    explanation: 'A fork attacks multiple targets at once, making it impossible for the opponent to parry all threats in a single move.'
  },
  {
    question: 'Which World Champion was renowned as the "Magician of Riga" for his intuitive tactical sacrifices?',
    options: ['Mikhail Tal', 'Tigran Petrosian', 'Max Euwe'],
    answer: 0,
    explanation: 'Mikhail Tal was celebrated for his dazzling, complex sacrifices that plunged opponents into insoluble psychological dilemmas.'
  },
  {
    question: 'What is an "Absolute Pin" in chess?',
    options: ['A piece pinned directly against the King, making it illegal to move', 'A piece pinned against an undefended rook', 'A pawn protected by another pawn'],
    answer: 0,
    explanation: 'An absolute pin involves the King: moving the pinned piece would expose the King to check, which is illegal under FIDE rules.'
  },
  {
    question: 'What is the "Opposition" in king and pawn endgames?',
    options: ['Kings facing each other on the same file or rank with an odd number of squares between them', 'Both players having equal numbers of pawns', 'A king standing behind its own pawn'],
    answer: 0,
    explanation: 'Direct opposition occurs when two kings face each other with exactly one square between them; whoever must move must yield ground.'
  },
  {
    question: 'In 1997, which World Champion famously faced the IBM supercomputer Deep Blue in New York?',
    options: ['Garry Kasparov', 'Viswanathan Anand', 'Vladimir Kramnik'],
    answer: 0,
    explanation: 'Garry Kasparov played Deep Blue in the historic 1997 rematch, a milestone event in artificial intelligence history.'
  },
  {
    question: 'What is the point value traditionally assigned to a Bishop or Knight in standard chess evaluation?',
    options: ['3 points', '5 points', '9 points'],
    answer: 0,
    explanation: 'Pawns are worth 1, Knights and Bishops are worth 3 (minor pieces), Rooks are worth 5, and Queens are worth 9.'
  },
  {
    question: 'What does "Zugzwang" mean in chess terminology?',
    options: ['A situation where any legal move made by a player worsens their position', 'A checkmate delivered by a knight', 'A draw agreed after fewer than 20 moves'],
    answer: 0,
    explanation: 'Zugzwang means a player is forced to move, and every available move deteriorates their position or leads to defeat.'
  },
  {
    question: 'Who was the first officially recognized World Chess Champion in 1886?',
    options: ['Wilhelm Steinitz', 'Paul Morphy', 'Adolf Anderssen'],
    answer: 0,
    explanation: 'Wilhelm Steinitz became the first official World Champion after defeating Johannes Zukertort in their 1886 match.'
  },
  {
    question: 'What special pawn move allows a pawn to capture an enemy pawn that has just advanced two squares past it?',
    options: ['En Passant', 'Castling', 'Promotion'],
    answer: 0,
    explanation: 'En Passant is an immediate capture of an enemy pawn that used its two-square first move to bypass an adjacent pawn’s attack square.'
  },
  {
    question: 'Which legendary Cuban player was known as "The Chess Machine" for his crystalline endgame precision?',
    options: ['José Raúl Capablanca', 'Emanuel Lasker', 'Alexander Alekhine'],
    answer: 0,
    explanation: 'Capablanca was renowned for making chess appear effortless, going 8 consecutive years (1916–1924) without losing a single tournament game.'
  },
  {
    question: 'What is a "Smothered Mate"?',
    options: ['A checkmate by a Knight against a King completely surrounded by its own pieces', 'A checkmate delivered on the back rank by two rooks', 'A king mated in the center by a queen and bishop'],
    answer: 0,
    explanation: 'A smothered mate occurs when a Knight delivers checkmate to a King that cannot escape because all surrounding squares are occupied by its own friendly pieces.'
  },
  {
    question: 'In 2023, who became the first player from China to win the World Chess Championship?',
    options: ['Ding Liren', 'Wang Hao', 'Wei Yi'],
    answer: 0,
    explanation: 'Ding Liren won the 2023 World Championship in Astana after defeating Ian Nepomniachtchi in thrilling rapid tiebreak games.'
  },
  {
    question: 'Why is the "Bishop Pair" (having both light and dark squared bishops) considered a strategic advantage in open positions?',
    options: ['They can jointly control long diagonals across the entire color complex of the board', 'They can jump over other pieces like knights', 'They prevent the opponent from castling permanently'],
    answer: 0,
    explanation: 'The bishop pair coordinates to dominate both light and dark diagonals, creating immense long-range attacking and defensive power.'
  }
];
