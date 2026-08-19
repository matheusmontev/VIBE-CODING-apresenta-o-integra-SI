const express = require('express');
const { getAll, getOne, run, saveToFile } = require('../database');
const multer = require('multer');
const path = require('path');

const router = express.Router();

// Configuração do Multer para upload de imagens
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '..', '..', 'public', 'uploads'));
  },
  filename: (req, file, cb) => {
    const uniqueName = `event-${Date.now()}-${Math.round(Math.random() * 1e6)}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|webp/;
    const ext = allowed.test(path.extname(file.originalname).toLowerCase());
    const mime = allowed.test(file.mimetype);
    if (ext && mime) return cb(null, true);
    cb(new Error('Apenas imagens são permitidas (jpg, png, gif, webp)'));
  }
});

// GET /api/events — Listar eventos com filtros
router.get('/', (req, res) => {
  const { search, category, upcoming } = req.query;
  let query = `
    SELECT e.*, 
      (SELECT COUNT(*) FROM registrations r WHERE r.event_id = e.id) as registered_count
    FROM events e
    WHERE 1=1
  `;
  const params = {};

  if (search) {
    query += ` AND (e.title LIKE @search OR e.description LIKE @search OR e.location LIKE @search)`;
    params['@search'] = `%${search}%`;
  }

  if (category && category !== 'Todos') {
    query += ` AND e.category = @category`;
    params['@category'] = category;
  }

  if (upcoming === 'true') {
    query += ` AND e.date >= datetime('now')`;
  }

  query += ` ORDER BY e.date ASC`;

  const events = getAll(query, params);
  res.json(events);
});

// GET /api/events/categories — Listar categorias únicas
router.get('/categories', (req, res) => {
  const categories = getAll('SELECT DISTINCT category FROM events ORDER BY category');
  res.json(categories.map(c => c.category));
});

// GET /api/events/stats — Estatísticas gerais
router.get('/stats', (req, res) => {
  const totalEvents = getOne('SELECT COUNT(*) as total FROM events').total;
  const totalRegistrations = getOne('SELECT COUNT(*) as total FROM registrations').total;
  const upcomingEvents = getOne("SELECT COUNT(*) as total FROM events WHERE date >= datetime('now')").total;
  const totalCapacity = getOne('SELECT COALESCE(SUM(max_attendees), 0) as total FROM events').total;

  res.json({ totalEvents, totalRegistrations, upcomingEvents, totalCapacity });
});

// GET /api/events/:id — Detalhes de um evento
router.get('/:id', (req, res) => {
  const event = getOne(`
    SELECT e.*, 
      (SELECT COUNT(*) FROM registrations r WHERE r.event_id = e.id) as registered_count
    FROM events e
    WHERE e.id = @id
  `, { '@id': parseInt(req.params.id) });

  if (!event) return res.status(404).json({ error: 'Evento não encontrado' });
  res.json(event);
});

// POST /api/events — Criar evento
router.post('/', upload.single('image'), (req, res) => {
  const { title, description, short_description, date, location, category, max_attendees } = req.body;

  if (!title || !description || !date || !location) {
    return res.status(400).json({ error: 'Campos obrigatórios: title, description, date, location' });
  }

  const image = req.file ? `/uploads/${req.file.filename}` : '/uploads/default-event.jpg';

  const result = run(`
    INSERT INTO events (title, description, short_description, date, location, category, image, max_attendees)
    VALUES (@title, @description, @short_description, @date, @location, @category, @image, @max_attendees)
  `, {
    '@title': title,
    '@description': description,
    '@short_description': short_description || description.substring(0, 120) + '...',
    '@date': date,
    '@location': location,
    '@category': category || 'Geral',
    '@image': image,
    '@max_attendees': parseInt(max_attendees) || 100
  });

  saveToFile();
  const event = getOne('SELECT * FROM events WHERE id = @id', { '@id': result.lastInsertRowid });
  res.status(201).json(event);
});

// PUT /api/events/:id — Editar evento
router.put('/:id', upload.single('image'), (req, res) => {
  const existing = getOne('SELECT * FROM events WHERE id = @id', { '@id': parseInt(req.params.id) });
  if (!existing) return res.status(404).json({ error: 'Evento não encontrado' });

  const { title, description, short_description, date, location, category, max_attendees } = req.body;
  const image = req.file ? `/uploads/${req.file.filename}` : existing.image;

  run(`
    UPDATE events SET 
      title = @title, description = @description, short_description = @short_description,
      date = @date, location = @location, category = @category, image = @image, max_attendees = @max_attendees
    WHERE id = @id
  `, {
    '@id': parseInt(req.params.id),
    '@title': title || existing.title,
    '@description': description || existing.description,
    '@short_description': short_description || existing.short_description,
    '@date': date || existing.date,
    '@location': location || existing.location,
    '@category': category || existing.category,
    '@image': image,
    '@max_attendees': parseInt(max_attendees) || existing.max_attendees
  });

  saveToFile();
  const updated = getOne('SELECT * FROM events WHERE id = @id', { '@id': parseInt(req.params.id) });
  res.json(updated);
});

// DELETE /api/events/:id — Excluir evento
router.delete('/:id', (req, res) => {
  const existing = getOne('SELECT * FROM events WHERE id = @id', { '@id': parseInt(req.params.id) });
  if (!existing) return res.status(404).json({ error: 'Evento não encontrado' });

  // Exclui inscrições primeiro (sql.js não suporta ON DELETE CASCADE automaticamente)
  run('DELETE FROM registrations WHERE event_id = @id', { '@id': parseInt(req.params.id) });
  run('DELETE FROM events WHERE id = @id', { '@id': parseInt(req.params.id) });
  saveToFile();
  res.json({ message: 'Evento excluído com sucesso' });
});

module.exports = router;
