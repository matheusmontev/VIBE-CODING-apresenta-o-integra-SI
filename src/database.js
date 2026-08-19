const initSqlJs = require('sql.js');
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, '..', 'data', 'eventos.db');
const dataDir = path.dirname(dbPath);

let db = null;

// Helpers para simplificar queries nas rotas
function getAll(sql, params = {}) {
  const stmt = db.prepare(sql);
  stmt.bind(convertParams(sql, params));
  const rows = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject());
  }
  stmt.free();
  return rows;
}

function getOne(sql, params = {}) {
  const stmt = db.prepare(sql);
  stmt.bind(convertParams(sql, params));
  let row = null;
  if (stmt.step()) {
    row = stmt.getAsObject();
  }
  stmt.free();
  return row;
}

function run(sql, params = {}) {
  const bound = convertParams(sql, params);
  db.run(sql, bound);
  // Retorna info útil para INSERTs
  const lastId = db.exec("SELECT last_insert_rowid() as id");
  const changes = db.exec("SELECT changes() as count");
  return {
    lastInsertRowid: lastId[0]?.values[0]?.[0] || 0,
    changes: changes[0]?.values[0]?.[0] || 0
  };
}

function exec(sql) {
  db.exec(sql);
}

// Converte params de objeto {key: val} para o formato do sql.js
// sql.js usa $key, :key ou @key como placeholders
function convertParams(sql, params) {
  if (Array.isArray(params)) return params;
  if (typeof params !== 'object' || params === null) return {};

  const converted = {};
  for (const [key, value] of Object.entries(params)) {
    // sql.js espera $ como prefixo dos named params
    const paramKey = key.startsWith('$') || key.startsWith(':') || key.startsWith('@')
      ? key : `@${key}`;
    converted[paramKey] = value;
  }
  return converted;
}

function saveToFile() {
  if (!db) return;
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  const data = db.export();
  fs.writeFileSync(dbPath, Buffer.from(data));
}

// Auto-save a cada 30 segundos
let saveInterval = null;

async function initDatabase() {
  const SQL = await initSqlJs();

  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  // Carrega banco existente ou cria novo
  if (fs.existsSync(dbPath)) {
    const fileBuffer = fs.readFileSync(dbPath);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }

  // Cria tabelas
  db.exec(`
    CREATE TABLE IF NOT EXISTS events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      short_description TEXT,
      date TEXT NOT NULL,
      location TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT 'Geral',
      image TEXT DEFAULT '/uploads/default-event.jpg',
      max_attendees INTEGER DEFAULT 100,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS registrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT,
      registered_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
    );
  `);

  // Cria índice unique se não existir
  try {
    db.exec(`CREATE UNIQUE INDEX idx_registration_unique ON registrations(event_id, email);`);
  } catch (e) {
    // Índice já existe, tudo certo
  }

  saveToFile();

  // Auto-save periódico
  saveInterval = setInterval(saveToFile, 30000);

  return db;
}

function seedDatabase() {
  const result = db.exec('SELECT COUNT(*) as total FROM events');
  const count = result[0]?.values[0]?.[0] || 0;
  if (count > 0) return;

  const events = [
    {
      title: 'Tech Summit 2026',
      description: 'O maior evento de tecnologia do ano! Três dias de palestras, workshops e networking com os melhores profissionais do mercado. Teremos trilhas de Inteligência Artificial, Cloud Computing, Desenvolvimento Web e Cibersegurança. Não perca a oportunidade de se conectar com líderes da indústria e descobrir as tendências que vão moldar o futuro da tecnologia.',
      short_description: 'O maior evento de tecnologia do ano com palestras, workshops e networking.',
      date: '2026-09-15T09:00:00',
      location: 'Centro de Convenções — São Paulo, SP',
      category: 'Tecnologia',
      image: '/uploads/seed-tech.jpg',
      max_attendees: 500
    },
    {
      title: 'Festival de Música Eletrônica',
      description: 'Uma noite inesquecível com os melhores DJs da cena eletrônica brasileira e internacional. Som de alta qualidade, iluminação de última geração e uma experiência imersiva que vai além da música. Área VIP com open bar, food trucks gourmet e espaço lounge para relaxar entre as apresentações.',
      short_description: 'Uma noite com os melhores DJs da cena eletrônica brasileira e internacional.',
      date: '2026-10-20T20:00:00',
      location: 'Arena Park — Rio de Janeiro, RJ',
      category: 'Música',
      image: '/uploads/seed-music.jpg',
      max_attendees: 2000
    },
    {
      title: 'Workshop de Design Thinking',
      description: 'Aprenda na prática a metodologia que revolucionou a forma como empresas inovam. Neste workshop intensivo de 8 horas, você vai passar por todas as etapas do Design Thinking: empatia, definição, ideação, prototipagem e teste. Traga seus desafios reais e saia com soluções criativas e validadas.',
      short_description: 'Workshop intensivo de Design Thinking com metodologia prática e casos reais.',
      date: '2026-09-28T08:30:00',
      location: 'Hub de Inovação — Belo Horizonte, MG',
      category: 'Workshop',
      image: '/uploads/seed-workshop.jpg',
      max_attendees: 40
    },
    {
      title: 'Hackathon IA & Saúde',
      description: 'Maratona de programação focada em soluções de Inteligência Artificial aplicadas à saúde. Equipes de até 5 pessoas terão 48 horas para desenvolver protótipos que resolvam problemas reais do setor de saúde usando IA, Machine Learning e análise de dados. Premiação de R$ 50.000 para os três primeiros colocados.',
      short_description: '48 horas de programação: IA aplicada à saúde com R$ 50.000 em prêmios.',
      date: '2026-11-05T18:00:00',
      location: 'Campus Universitário — Curitiba, PR',
      category: 'Tecnologia',
      image: '/uploads/seed-hackathon.jpg',
      max_attendees: 200
    },
    {
      title: 'Conferência de Empreendedorismo',
      description: 'Dois dias de imersão no universo do empreendedorismo com fundadores de startups unicórnio, investidores e mentores experientes. Painéis sobre captação de investimento, growth hacking, cultura organizacional e escalabilidade. Rodada de pitch com investidores anjos e fundos de venture capital.',
      short_description: 'Dois dias com fundadores de unicórnios, investidores e mentores do ecossistema.',
      date: '2026-10-10T09:00:00',
      location: 'Hotel Grand Hyatt — São Paulo, SP',
      category: 'Negócios',
      image: '/uploads/seed-business.jpg',
      max_attendees: 300
    },
    {
      title: 'Mostra de Arte Digital',
      description: 'Exposição interativa que une arte, tecnologia e experiências sensoriais. Instalações imersivas com projeções mapeadas, realidade aumentada e obras generativas criadas por inteligência artificial. Artistas de 12 países apresentam suas visões sobre o futuro da expressão artística na era digital.',
      short_description: 'Exposição interativa com arte digital, RA e instalações imersivas de 12 países.',
      date: '2026-12-01T10:00:00',
      location: 'Museu da Imagem e do Som — São Paulo, SP',
      category: 'Arte',
      image: '/uploads/seed-art.jpg',
      max_attendees: 150
    }
  ];

  for (const e of events) {
    db.run(
      `INSERT INTO events (title, description, short_description, date, location, category, image, max_attendees)
       VALUES (@title, @description, @short_description, @date, @location, @category, @image, @max_attendees)`,
      { '@title': e.title, '@description': e.description, '@short_description': e.short_description,
        '@date': e.date, '@location': e.location, '@category': e.category, '@image': e.image,
        '@max_attendees': e.max_attendees }
    );
  }

  const registrations = [
    { event_id: 1, name: 'Ana Silva', email: 'ana@email.com', phone: '(11) 99999-0001' },
    { event_id: 1, name: 'Carlos Souza', email: 'carlos@email.com', phone: '(11) 99999-0002' },
    { event_id: 1, name: 'Maria Santos', email: 'maria@email.com', phone: '(21) 98888-0001' },
    { event_id: 2, name: 'João Oliveira', email: 'joao@email.com', phone: '(21) 98888-0002' },
    { event_id: 2, name: 'Beatriz Lima', email: 'bia@email.com', phone: '(31) 97777-0001' },
    { event_id: 3, name: 'Pedro Costa', email: 'pedro@email.com', phone: '(31) 97777-0002' },
    { event_id: 4, name: 'Juliana Ferreira', email: 'ju@email.com', phone: '(41) 96666-0001' },
    { event_id: 5, name: 'Rafael Almeida', email: 'rafael@email.com', phone: '(11) 95555-0001' },
    { event_id: 5, name: 'Camila Rocha', email: 'camila@email.com', phone: '(11) 95555-0002' },
    { event_id: 6, name: 'Lucas Mendes', email: 'lucas@email.com', phone: '(11) 94444-0001' },
  ];

  for (const r of registrations) {
    db.run(
      `INSERT INTO registrations (event_id, name, email, phone) VALUES (@event_id, @name, @email, @phone)`,
      { '@event_id': r.event_id, '@name': r.name, '@email': r.email, '@phone': r.phone }
    );
  }

  saveToFile();
  console.log('✅ Banco de dados populado com dados de exemplo');
}

module.exports = { getAll, getOne, run, exec, saveToFile, initDatabase, seedDatabase };
