// ─────────── ДАННЫЕ ───────────
const MOVIES = [
  { id: 'm1', title: 'Интерстеллар', genre: 'Фантастика', duration: '169 мин', rating: '8.7', image: 'img/интерстеллар.jpeg' },
  { id: 'm2', title: 'Дюна: Часть вторая', genre: 'Фантастика', duration: '166 мин', rating: '8.5', image: 'img/дюна.jpg' },
  { id: 'm3', title: 'Оппенгеймер', genre: 'Биография', duration: '180 мин', rating: '8.4', image: 'img/опен.jpg' },
];

const SESSIONS = [
  { id: 's1', movieId: 'm1', time: '18:00', hall: 'Зал 1', format: 'IMAX', basePrice: 350 },
  { id: 's2', movieId: 'm1', time: '21:30', hall: 'Зал 1', format: 'IMAX', basePrice: 450 },
  { id: 's3', movieId: 'm2', time: '16:00', hall: 'Зал 1', format: '4DX', basePrice: 400 },
  { id: 's4', movieId: 'm2', time: '19:45', hall: 'Зал 1', format: '4DX', basePrice: 500 },
  { id: 's5', movieId: 'm3', time: '15:00', hall: 'Зал 1', format: '2D', basePrice: 300 },
  { id: 's6', movieId: 'm3', time: '20:00', hall: 'Зал 1', format: '2D', basePrice: 400 },
];

const ROWS = 4;
const COLS = 6;
const ROW_PREMIUM = { 1: 0, 2: 0, 3: 150, 4: 150 };

const INITIAL_OCCUPIED = {
  s1: ['r1c2', 'r2c2', 'r2c5', 'r3c1', 'r3c3', 'r4c6'],
  s2: ['r1c1', 'r1c6', 'r2c3', 'r3c4', 'r4c2', 'r4c5'],
  s3: ['r1c3', 'r1c4', 'r2c1', 'r3c2', 'r4c1', 'r4c5'],
  s4: ['r1c1', 'r1c2', 'r2c6', 'r3c5', 'r4c3', 'r4c4'],
  s5: ['r1c5', 'r2c4', 'r2c6', 'r3c1', 'r3c6', 'r4c2'],
  s6: ['r1c2', 'r2c3', 'r3c4', 'r3c5', 'r4c1', 'r4c6'],
};

const SEATS = [];
for (let row = 1; row <= ROWS; row += 1) {
  for (let col = 1; col <= COLS; col += 1) {
    SEATS.push({ id: `r${row}c${col}`, row, col });
  }
}

function seatPrice(session, row) {
  return session.basePrice + (ROW_PREMIUM[row] ?? 0);
}