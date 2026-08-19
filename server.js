const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { initDatabase, seedDatabase } = require('./src/database');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve arquivos estáticos
app.use(express.static(path.join(__dirname, 'public')));

// Garante que a pasta de uploads existe
const uploadsDir = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Inicializa banco e rotas de forma async
async function startServer() {
  await initDatabase();
  seedDatabase();

  // Rotas da API
  const eventsRouter = require('./src/routes/events');
  const registrationsRouter = require('./src/routes/registrations');

  app.use('/api/events', eventsRouter);
  app.use('/api', registrationsRouter);

  // SPA fallback — qualquer rota não-API serve o index.html
  app.get('*', (req, res) => {
    if (req.path.startsWith('/api')) {
      return res.status(404).json({ error: 'Rota não encontrada' });
    }
    // Se o arquivo HTML existe, serve ele; senão, serve index.html
    const htmlPath = path.join(__dirname, 'public', req.path.endsWith('.html') ? req.path : `${req.path}.html`);
    if (fs.existsSync(htmlPath)) {
      return res.sendFile(htmlPath);
    }
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  });

  // Tratamento global de erros
  app.use((err, req, res, next) => {
    console.error('❌ Erro:', err.message);
    if (err instanceof require('multer').MulterError) {
      return res.status(400).json({ error: `Erro no upload: ${err.message}` });
    }
    res.status(500).json({ error: 'Erro interno do servidor' });
  });

  app.listen(PORT, () => {
    console.log(`\n🚀 Servidor rodando em http://localhost:${PORT}`);
    console.log(`📋 API disponível em http://localhost:${PORT}/api/events`);
    console.log(`🎛️  Painel admin em http://localhost:${PORT}/admin.html\n`);
  });
}

startServer().catch(err => {
  console.error('Falha ao iniciar o servidor:', err);
  process.exit(1);
});
