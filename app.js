// ─────────── СОСТОЯНИЕ ───────────
const STORAGE_KEY = 'cinema-demo-bookings-v1';
const MAX_SEATS = 6;
const MIN_PRICE = 300;
const MAX_PRICE = 650;

const STATE_LABEL = { free: 'свободно', selected: 'выбрано', occupied: 'занято', filtered: 'скрыто фильтром' };

const state = {
  sessionId: SESSIONS[0].id,
  maxPrice: MAX_PRICE,
  selected: new Set(),
  bookings: [],
  notice: null,
  storageWarning: '',
  busy: false,
  focusTarget: null,
};

const $ = (id) => document.getElementById(id);

const els = {
  moviesList: $('moviesList'),
  maxPrice: $('maxPrice'),
  maxPriceValue: $('maxPriceValue'),
  resetFilters: $('resetFilters'),
  hall: $('hall'),
  hallCaption: $('hallCaption'),
  seatList: $('seatList'),
  listHint: $('listHint'),
  notice: $('notice'),
  ticketMovie: $('ticketMovie'),
  cardTitle: $('cardTitle'),
  cardMeta: $('cardMeta'),
  selectedChips: $('selectedChips'),
  seatsError: $('seatsError'),
  nameError: $('nameError'),
  viewerName: $('viewerName'),
  totalSum: $('totalSum'),
  confirmBtn: $('confirmBtn'),
  bookings: $('bookings'),
  resetDemo: $('resetDemo'),
};

// ─────────── ЛОГИКА ───────────
function currentSession() {
  return SESSIONS.find((session) => session.id === state.sessionId) ?? SESSIONS[0];
}

function currentMovie() {
  const session = currentSession();
  return MOVIES.find((movie) => movie.id === session.movieId) ?? MOVIES[0];
}

function seatById(id) {
  return SEATS.find((seat) => seat.id === id);
}

function seatLabel(id) {
  const seat = seatById(id);
  return seat ? `Ряд ${seat.row}, место ${seat.col}` : id;
}

function priceOf(seat) {
  return seatPrice(currentSession(), seat.row);
}

function bySeatOrder(a, b) {
  const seatA = seatById(a);
  const seatB = seatById(b);
  return seatA.row - seatB.row || seatA.col - seatB.col;
}

function occupiedSeats() {
  const set = new Set(INITIAL_OCCUPIED[state.sessionId] ?? []);
  for (const booking of state.bookings) {
    if (booking.sessionId === state.sessionId) {
      for (const id of booking.seats) set.add(id);
    }
  }
  return set;
}

function passesFilter(seat) {
  return priceOf(seat) <= state.maxPrice;
}

function seatState(seat, occupied) {
  if (occupied.has(seat.id)) return 'occupied';
  if (!passesFilter(seat)) return 'filtered';
  if (state.selected.has(seat.id)) return 'selected';
  return 'free';
}

// ─────────── РЕНДЕР: АФИША ───────────
function renderMovies() {
  const session = currentSession();
  const activeMovieId = session.movieId;

  const frag = document.createDocumentFragment();

  for (const movie of MOVIES) {
    const isActive = movie.id === activeMovieId;
    
    const card = document.createElement('div');
    card.className = `movie-card${isActive ? ' is-active' : ''}`;

    const poster = document.createElement('div');
    poster.className = 'movie-poster';
    poster.style.backgroundImage = `linear-gradient(to top, rgba(18, 22, 28, 1) 0%, rgba(18, 22, 28, 0.1) 60%), url('${movie.image}')`;

    const rating = document.createElement('span');
    rating.className = 'movie-rating';
    rating.textContent = `★ ${movie.rating}`;

    const title = document.createElement('h3');
    title.textContent = movie.title;

    poster.append(rating, title);

    const info = document.createElement('div');
    info.className = 'movie-info';
    info.textContent = `${movie.genre} · ${movie.duration}`;

    const sessionsWrap = document.createElement('div');
    sessionsWrap.className = 'movie-sessions';

    const movieSessions = SESSIONS.filter((s) => s.movieId === movie.id);
    for (const s of movieSessions) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `session-btn${s.id === state.sessionId ? ' is-active' : ''}`;
      btn.dataset.sessionId = s.id;
      
      const timeText = document.createElement('span');
      timeText.textContent = s.time;
      
      const priceText = document.createElement('span');
      priceText.className = 'price';
      priceText.textContent = `от ${s.basePrice} ₽`;
      
      btn.append(timeText, priceText);
      sessionsWrap.appendChild(btn);
    }

    card.append(poster, info, sessionsWrap);
    frag.appendChild(card);
  }

  els.moviesList.replaceChildren(frag);
}

// ─────────── РЕНДЕР: ЗАЛ ───────────
function buildScreen() {
  const wrap = document.createElement('div');
  wrap.className = 'screen-wrap';
  wrap.setAttribute('aria-hidden', 'true');
  const curve = document.createElement('div');
  curve.className = 'screen-curve';
  const label = document.createElement('div');
  label.className = 'screen-label';
  label.textContent = 'Экран';
  wrap.append(curve, label);
  return wrap;
}

function buildZone(zone, occupied) {
  const zoneEl = document.createElement('div');
  zoneEl.className = `hall-zone${zone.premium ? ' is-premium' : ''}`;

  const label = document.createElement('div');
  label.className = 'zone-label';
  const name = document.createElement('span');
  name.className = 'zone-name';
  name.textContent = zone.name;
  const price = document.createElement('span');
  price.className = 'zone-price';
  price.textContent = `${zone.price} ₽`;
  label.append(name, price);
  zoneEl.appendChild(label);

  const body = document.createElement('div');
  body.className = 'zone-body';
  for (const row of zone.rows) {
    body.appendChild(buildRow(row, occupied));
  }
  zoneEl.appendChild(body);
  return zoneEl;
}

function buildRow(row, occupied) {
  const rowEl = document.createElement('div');
  rowEl.className = 'hall-row';

  const numL = document.createElement('span');
  numL.className = 'row-num';
  numL.textContent = String(row);
  numL.setAttribute('aria-hidden', 'true');
  rowEl.appendChild(numL);

  const leftBlock = document.createElement('div');
  leftBlock.className = 'row-block';
  for (const seat of SEATS) {
    if (seat.row === row && seat.col <= 3) leftBlock.appendChild(buildSeatButton(seat, occupied));
  }
  rowEl.appendChild(leftBlock);

  const aisle = document.createElement('div');
  aisle.className = 'aisle';
  aisle.setAttribute('aria-hidden', 'true');
  rowEl.appendChild(aisle);

  const rightBlock = document.createElement('div');
  rightBlock.className = 'row-block';
  for (const seat of SEATS) {
    if (seat.row === row && seat.col > 3) rightBlock.appendChild(buildSeatButton(seat, occupied));
  }
  rowEl.appendChild(rightBlock);

  const numR = document.createElement('span');
  numR.className = 'row-num';
  numR.textContent = String(row);
  numR.setAttribute('aria-hidden', 'true');
  rowEl.appendChild(numR);

  return rowEl;
}

function buildSeatButton(seat, occupied) {
  const status = seatState(seat, occupied);
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = `seat is-${status}`;
  btn.dataset.seatId = seat.id;
  btn.setAttribute('aria-pressed', String(status === 'selected'));
  btn.setAttribute('aria-label', `${seatLabel(seat.id)}, ${priceOf(seat)} ₽, ${STATE_LABEL[status]}`);
  btn.title = `${seatLabel(seat.id)} · ${priceOf(seat)} ₽ · ${STATE_LABEL[status]}`;

  const num = document.createElement('span');
  num.className = 'seat-num';
  num.textContent = String(seat.col);
  btn.appendChild(num);

  if (status === 'selected') {
    const check = document.createElement('span');
    check.className = 'seat-check';
    check.setAttribute('aria-hidden', 'true');
    check.textContent = '✓';
    btn.appendChild(check);
  }

  if (status === 'occupied' || status === 'filtered') btn.disabled = true;

  return btn;
}

function renderHall() {
  const occupied = occupiedSeats();
  const session = currentSession();

  const zones = [
    { id: 'parter', name: 'Партер', price: seatPrice(session, 1), rows: [1, 2], premium: false },
    { id: 'vip', name: 'Комфорт · VIP', price: seatPrice(session, 3), rows: [3, 4], premium: true },
  ];

  const frag = document.createDocumentFragment();
  frag.appendChild(buildScreen());
  for (const zone of zones) frag.appendChild(buildZone(zone, occupied));

  const entrance = document.createElement('div');
  entrance.className = 'entrance';
  const arrow = document.createElement('span');
  arrow.textContent = '↓';
  entrance.append(arrow, document.createTextNode(' Вход'));
  frag.appendChild(entrance);

  els.hall.replaceChildren(frag);
}

// ─────────── РЕНДЕР: СПИСОК ───────────
function renderList() {
  const occupied = occupiedSeats();
  const frag = document.createDocumentFragment();
  let shown = 0;

  for (const seat of SEATS) {
    const status = seatState(seat, occupied);
    if (status !== 'filtered') shown += 1;

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `seat-item is-${status}`;
    btn.dataset.seatId = seat.id;
    btn.setAttribute('aria-pressed', String(status === 'selected'));
    btn.setAttribute('aria-label', `${seatLabel(seat.id)}, ${priceOf(seat)} ₽, ${STATE_LABEL[status]}`);
    if (status === 'occupied' || status === 'filtered') btn.disabled = true;

    const name = document.createElement('span');
    name.className = 'seat-item-name';
    name.textContent = `Ряд ${seat.row}, место ${seat.col}`;

    const price = document.createElement('span');
    price.className = 'seat-item-price';
    price.textContent = `${priceOf(seat)} ₽`;

    const label = document.createElement('span');
    label.className = 'seat-item-status';
    label.textContent = STATE_LABEL[status];

    btn.append(name, price, label);
    frag.appendChild(btn);
  }

  els.seatList.replaceChildren(frag);

  const empty = shown === 0;
  els.listHint.textContent = empty ? 'Под фильтр не подошло ни одного места — увеличьте лимит цены.' : `Показано мест: ${shown} из ${SEATS.length}`;
  els.listHint.classList.toggle('is-warning', empty);
}

// ─────────── РЕНДЕР: КАРТОЧКА ───────────
function renderCard() {
  const session = currentSession();
  const movie = currentMovie();

  els.ticketMovie.textContent = movie.title;
  els.cardTitle.textContent = session.time;
  els.cardMeta.textContent = `${session.hall} · ${session.format} · ${movie.duration}`;

  const seats = [...state.selected].sort(bySeatOrder);
  const frag = document.createDocumentFragment();

  if (seats.length === 0) {
    const span = document.createElement('span');
    span.className = 'muted';
    span.textContent = 'Места не выбраны';
    frag.appendChild(span);
  } else {
    for (const id of seats) {
      const chip = document.createElement('span');
      chip.className = 'chip';
      chip.textContent = seatLabel(id);
      frag.appendChild(chip);
    }
  }
  els.selectedChips.replaceChildren(frag);

  const total = seats.reduce((sum, id) => sum + priceOf(seatById(id)), 0);
  els.totalSum.textContent = `${total} ₽`;
  els.confirmBtn.textContent = seats.length ? `Подтвердить бронь · ${total} ₽` : 'Подтвердить бронь';
}

// ─────────── РЕНДЕР: БРОНИ ───────────
function renderBookings() {
  const items = [...state.bookings].sort((a, b) => (Date.parse(b.createdAt) || 0) - (Date.parse(a.createdAt) || 0));
  els.bookings.replaceChildren();

  if (items.length === 0) {
    const p = document.createElement('p');
    p.className = 'empty-state';
    p.textContent = 'Пока нет броней. Выберите места и подтвердите — запись появится здесь.';
    els.bookings.appendChild(p);
    return;
  }

  for (const booking of items) {
    const session = SESSIONS.find((s) => s.id === booking.sessionId);
    const movie = MOVIES.find((m) => m.id === session?.movieId);

    const card = document.createElement('article');
    card.className = 'booking-card';

    const top = document.createElement('div');
    top.className = 'booking-top';
    const id = document.createElement('span');
    id.className = 'booking-id';
    id.textContent = booking.id;
    const time = document.createElement('span');
    time.className = 'booking-time';
    time.textContent = session ? `${session.time} · ${session.hall}` : 'сеанс неизвестен';
    top.append(id, time);

    const film = document.createElement('div');
    film.className = 'booking-film';
    film.textContent = movie ? movie.title : '—';

    const seats = document.createElement('div');
    seats.className = 'booking-seats';
    seats.textContent = `${booking.name} · ${booking.seats.map(seatLabel).join(' · ')}`;

    const bottom = document.createElement('div');
    bottom.className = 'booking-bottom';
    const sum = document.createElement('span');
    sum.className = 'booking-sum';
    sum.textContent = `${booking.total} ₽`;
    const cancel = document.createElement('button');
    cancel.type = 'button';
    cancel.className = 'btn btn-danger btn-sm';
    cancel.dataset.cancelId = booking.id;
    cancel.textContent = 'Отменить';

    bottom.append(sum, cancel);
    card.append(top, film, seats, bottom);
    els.bookings.appendChild(card);
  }
}

// ─────────── РЕНДЕР: ОБЩИЙ ───────────
function renderNotice() {
  const items = [];
  if (state.storageWarning) items.push({ type: 'error', text: state.storageWarning });
  if (state.notice) items.push(state.notice);

  els.notice.hidden = items.length === 0;
  els.notice.replaceChildren(...items.map(({ type, text }) => {
    const p = document.createElement('p');
    p.className = `notice-line is-${type}`;
    p.textContent = text;
    return p;
  }));
}

function render() {
  const session = currentSession();
  const occupied = occupiedSeats();
  const freeCount = SEATS.filter((seat) => !occupied.has(seat.id)).length;

  els.maxPriceValue.textContent = `${state.maxPrice} ₽`;
  els.hallCaption.textContent = `${session.hall} · ${ROWS} × ${COLS} мест · свободно ${freeCount}`;

  renderMovies();
  renderHall();
  renderList();
  renderCard();
  renderBookings();
  renderNotice();
  restoreFocus();
}

function restoreFocus() {
  const target = state.focusTarget;
  if (!target) return;
  state.focusTarget = null;
  const scope = target.zone === 'list' ? els.seatList : els.hall;
  const el = scope.querySelector(`[data-seat-id="${target.seatId}"]`);
  if (el && !el.disabled) el.focus({ preventScroll: true });
}

// ─────────── ДЕЙСТВИЯ ───────────
function activateSeat(seatId) {
  const seat = seatById(seatId);
  if (!seat) return;
  const status = seatState(seat, occupiedSeats());

  if (status === 'occupied') {
    state.notice = { type: 'error', text: 'Это место уже занято — выберите другое.' };
    render();
    return;
  }
  if (status === 'filtered') {
    state.notice = { type: 'error', text: 'Место скрыто фильтром цены. Увеличьте лимит, чтобы его выбрать.' };
    render();
    return;
  }

  if (state.selected.has(seatId)) {
    state.selected.delete(seatId);
  } else {
    if (state.selected.size >= MAX_SEATS) {
      state.notice = { type: 'error', text: `За одну бронь можно выбрать не более ${MAX_SEATS} мест.` };
      render();
      return;
    }
    state.selected.add(seatId);
  }

  state.notice = null;
  els.seatsError.textContent = '';
  render();
}

function setSession(id) {
  if (id === state.sessionId) return;
  if (!SESSIONS.some((session) => session.id === id)) return;
  
  const hadSelection = state.selected.size > 0;
  state.sessionId = id;
  state.selected.clear();
  els.seatsError.textContent = '';
  state.notice = hadSelection ? { type: 'info', text: 'Сеанс изменён — выбранные места сброшены.' } : null;
  
  render();
}

function setMaxPrice(value) {
  const next = Number(value);
  if (!Number.isFinite(next)) return;
  state.maxPrice = Math.min(MAX_PRICE, Math.max(MIN_PRICE, next));
  els.maxPrice.value = String(state.maxPrice);

  let removed = 0;
  for (const id of [...state.selected]) {
    const seat = seatById(id);
    if (seat && !passesFilter(seat)) {
      state.selected.delete(id);
      removed += 1;
    }
  }
  if (removed > 0) {
    state.notice = { type: 'info', text: `Фильтр цены скрыл выбранные места (${removed}) — они сняты с выбора.` };
  }
  render();
}

function resetFilters() {
  state.maxPrice = MAX_PRICE;
  els.maxPrice.value = String(MAX_PRICE);
  state.notice = { type: 'info', text: 'Фильтр цены сброшен.' };
  render();
}

function makeBookingId() {
  for (let i = 0; i < 20; i += 1) {
    const raw = (globalThis.crypto?.randomUUID?.() ?? String(Math.random())).replace(/-/g, '').slice(0, 4).toUpperCase();
    const id = `Б-${raw}`;
    if (!state.bookings.some((booking) => booking.id === id)) return id;
  }
  return `Б-${Date.now().toString(36).toUpperCase()}`;
}

function validateBooking() {
  const errors = { seats: '', name: '' };
  const occupied = occupiedSeats();
  const seats = [...state.selected];

  if (seats.length === 0) {
    errors.seats = 'Выберите хотя бы одно место на схеме или в списке.';
  } else if (seats.length > MAX_SEATS) {
    errors.seats = `За одну бронь можно выбрать не более ${MAX_SEATS} мест.`;
  } else {
    const busy = seats.find((id) => occupied.has(id));
    if (busy) errors.seats = `Место «${seatLabel(busy)}» уже занято — снимите его с выбора.`;
  }

  const name = els.viewerName.value.trim();
  if (name.length < 2) errors.name = 'Укажите имя зрителя — минимум 2 символа.';

  return { errors, seats, name };
}

function onConfirm() {
  if (state.busy) return;
  const { errors, seats, name } = validateBooking();
  els.seatsError.textContent = errors.seats;
  els.nameError.textContent = errors.name;

  if (errors.seats || errors.name) {
    state.notice = { type: 'error', text: 'Бронь не создана — проверьте поля с ошибками.' };
    render();
    return;
  }

  state.busy = true;
  els.confirmBtn.disabled = true;

  try {
    const sorted = [...seats].sort(bySeatOrder);
    const booking = {
      id: makeBookingId(),
      sessionId: state.sessionId,
      seats: sorted,
      name,
      total: sorted.reduce((sum, id) => sum + priceOf(seatById(id)), 0),
      createdAt: new Date().toISOString(),
    };

    state.bookings.push(booking);
    const saved = saveBookings();

    state.selected.clear();
    els.seatsError.textContent = '';
    els.nameError.textContent = '';
    state.notice = {
      type: saved ? 'success' : 'info',
      text: `Бронь ${booking.id} создана: ${sorted.length} мест(а) на ${currentSession().time}.`,
    };
    render();
  } finally {
    state.busy = false;
    els.confirmBtn.disabled = false;
  }
}

function cancelBooking(id) {
  const index = state.bookings.findIndex((booking) => booking.id === id);
  if (index === -1) return;
  const [removed] = state.bookings.splice(index, 1);
  saveBookings();
  state.notice = { type: 'info', text: `Бронь ${removed.id} отменена — места снова свободны.` };
  render();
}

function resetDemo() {
  const confirmed = window.confirm('Сбросить все учебные брони и вернуть исходную занятость мест?');
  if (!confirmed) return;

  state.bookings = [];
  state.selected.clear();
  state.storageWarning = '';
  state.notice = { type: 'info', text: 'Демо сброшено: брони удалены, места вернулись в исходное состояние.' };
  els.seatsError.textContent = '';
  els.nameError.textContent = '';

  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    state.storageWarning = 'Браузер не разрешил очистить localStorage — данные могли остаться.';
  }
  render();
}

// ─────────── СОХРАНЕНИЕ ───────────
function isValidBooking(value) {
  if (!value || typeof value !== 'object') return false;
  if (typeof value.id !== 'string' || value.id.length < 2) return false;
  if (!SESSIONS.some((session) => session.id === value.sessionId)) return false;
  if (!Array.isArray(value.seats) || value.seats.length === 0) return false;
  if (value.seats.length > MAX_SEATS) return false;
  if (typeof value.total !== 'number' || !Number.isFinite(value.total) || value.total <= 0) return false;

  const initial = new Set(INITIAL_OCCUPIED[value.sessionId] ?? []);
  const seen = new Set();

  for (const id of value.seats) {
    const seat = SEATS.find((item) => item.id === id);
    if (!seat || initial.has(id) || seen.has(id)) return false;
    seen.add(id);
  }
  return true;
}

function loadBookings() {
  let raw = null;
  try {
    raw = localStorage.getItem(STORAGE_KEY);
  } catch (error) {
    state.storageWarning = 'Браузер запретил доступ к localStorage — брони не сохранятся после обновления.';
    return;
  }
  if (!raw) return;

  let parsed = null;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    state.storageWarning = 'Сохранённые данные повреждены и не были прочитаны. Нажмите «Сбросить демо», чтобы начать заново.';
    return;
  }

  const list = Array.isArray(parsed?.bookings) ? parsed.bookings : null;
  if (!list) {
    state.storageWarning = 'Сохранённые данные имеют неверный формат. Нажмите «Сбросить демо», чтобы начать заново.';
    return;
  }

  const unique = [];
  const taken = new Set();
  let skipped = 0;

  for (const item of list) {
    if (!isValidBooking(item)) {
      skipped += 1;
      continue;
    }
    const keys = item.seats.map((id) => `${item.sessionId}:${id}`);
    if (keys.some((key) => taken.has(key))) {
      skipped += 1;
      continue;
    }
    keys.forEach((key) => taken.add(key));
    unique.push(item);
  }

  state.bookings = unique;
  if (skipped > 0) {
    state.storageWarning = `Часть сохранённых броней (${skipped}) повреждена и была пропущена.`;
  }
}

function saveBookings() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, bookings: state.bookings }));
    state.storageWarning = '';
    return true;
  } catch (error) {
    state.storageWarning = 'Не удалось сохранить брони: браузер запретил localStorage. После обновления страницы они исчезнут.';
    return false;
  }
}

// ─────────── СОБЫТИЯ ───────────
function bindSeatZone(container, zone) {
  container.addEventListener('click', (event) => {
    const btn = event.target.closest('[data-seat-id]');
    if (!btn || btn.disabled) return;
    state.focusTarget = { seatId: btn.dataset.seatId, zone };
    activateSeat(btn.dataset.seatId);
  });
}

function bindEvents() {
  els.moviesList.addEventListener('click', (event) => {
    const btn = event.target.closest('[data-session-id]');
    if (btn) setSession(btn.dataset.sessionId);
  });

  els.maxPrice.addEventListener('input', (event) => setMaxPrice(event.target.value));
  els.resetFilters.addEventListener('click', resetFilters);
  els.resetDemo.addEventListener('click', resetDemo);
  els.confirmBtn.addEventListener('click', onConfirm);
  
  els.viewerName.addEventListener('input', () => {
    if (els.nameError.textContent) els.nameError.textContent = '';
  });
  
  els.bookings.addEventListener('click', (event) => {
    const btn = event.target.closest('[data-cancel-id]');
    if (btn) cancelBooking(btn.dataset.cancelId);
  });
  
  bindSeatZone(els.hall, 'hall');
  bindSeatZone(els.seatList, 'list');
}

// ─────────── СТАРТ ───────────
function init() {
  els.maxPrice.min = String(MIN_PRICE);
  els.maxPrice.max = String(MAX_PRICE);
  els.maxPrice.step = '50';
  els.maxPrice.value = String(state.maxPrice);

  loadBookings();
  bindEvents();
  render();
}

init();