const express = require('express');
const { getAll, getOne, run, saveToFile } = require('../database');

const router = express.Router();

// POST /api/events/:eventId/register — Inscrever participante
router.post('/events/:eventId/register', (req, res) => {
  const { name, email, phone } = req.body;
  const eventId = parseInt(req.params.eventId);

  if (!name || !email) {
    return res.status(400).json({ error: 'Nome e email são obrigatórios' });
  }

  const event = getOne('SELECT * FROM events WHERE id = @id', { '@id': eventId });
  if (!event) return res.status(404).json({ error: 'Evento não encontrado' });

  // Verifica vagas
  const count = getOne('SELECT COUNT(*) as total FROM registrations WHERE event_id = @id', { '@id': eventId }).total;
  if (count >= event.max_attendees) {
    return res.status(400).json({ error: 'Evento lotado! Não há mais vagas disponíveis.' });
  }

  // Verifica duplicata
  const existing = getOne(
    'SELECT * FROM registrations WHERE event_id = @event_id AND email = @email',
    { '@event_id': eventId, '@email': email }
  );
  if (existing) {
    return res.status(409).json({ error: 'Este email já está inscrito neste evento.' });
  }

  const result = run(
    `INSERT INTO registrations (event_id, name, email, phone) VALUES (@event_id, @name, @email, @phone)`,
    { '@event_id': eventId, '@name': name, '@email': email, '@phone': phone || null }
  );

  saveToFile();
  const registration = getOne('SELECT * FROM registrations WHERE id = @id', { '@id': result.lastInsertRowid });
  res.status(201).json({ message: 'Inscrição realizada com sucesso!', registration });
});

// GET /api/events/:eventId/registrations — Listar inscritos
router.get('/events/:eventId/registrations', (req, res) => {
  const eventId = parseInt(req.params.eventId);
  const event = getOne('SELECT * FROM events WHERE id = @id', { '@id': eventId });
  if (!event) return res.status(404).json({ error: 'Evento não encontrado' });

  const registrations = getAll(
    'SELECT * FROM registrations WHERE event_id = @id ORDER BY registered_at DESC',
    { '@id': eventId }
  );

  res.json({ event: event.title, total: registrations.length, registrations });
});

// DELETE /api/registrations/:id — Cancelar inscrição
router.delete('/registrations/:id', (req, res) => {
  const existing = getOne('SELECT * FROM registrations WHERE id = @id', { '@id': parseInt(req.params.id) });
  if (!existing) return res.status(404).json({ error: 'Inscrição não encontrada' });

  run('DELETE FROM registrations WHERE id = @id', { '@id': parseInt(req.params.id) });
  saveToFile();
  res.json({ message: 'Inscrição cancelada com sucesso' });
});

module.exports = router;
