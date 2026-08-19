// ============================================
// app.js — Página inicial (listagem de eventos)
// ============================================

const API = '/api';

// Utilitários compartilhados
function formatDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatTime(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function formatDateTime(dateStr) {
  return `${formatDate(dateStr)} às ${formatTime(dateStr)}`;
}

function showToast(type, title, message) {
  const container = document.getElementById('toastContainer');
  const icons = { success: '✅', error: '❌', info: 'ℹ️' };
  
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <span class="toast-icon">${icons[type]}</span>
    <div class="toast-content">
      <div class="toast-title">${title}</div>
      <div class="toast-message">${message}</div>
    </div>
    <button class="toast-close" onclick="this.closest('.toast').remove()">✕</button>
  `;
  
  container.appendChild(toast);
  setTimeout(() => {
    toast.classList.add('removing');
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// Gera cor do badge de categoria
function categoryColor(cat) {
  const map = {
    'Tecnologia': 'purple', 'Música': 'pink', 'Arte': 'blue',
    'Workshop': 'orange', 'Negócios': 'green', 'Esportes': 'cyan',
    'Educação': 'blue', 'Geral': 'purple'
  };
  return map[cat] || 'purple';
}

// Gera imagem fallback com gradiente se a imagem do evento não carregar
function getImageFallback(category) {
  const colors = {
    'Tecnologia': ['8b5cf6', '3b82f6'],
    'Música': ['ec4899', 'f59e0b'],
    'Arte': ['06b6d4', '8b5cf6'],
    'Workshop': ['f59e0b', 'ef4444'],
    'Negócios': ['10b981', '3b82f6'],
    'Esportes': ['ef4444', 'f59e0b'],
    'Educação': ['3b82f6', '06b6d4'],
    'Geral': ['8b5cf6', '06b6d4']
  };
  const [c1, c2] = colors[category] || colors['Geral'];
  return `https://placehold.co/600x400/${c1}/${c2}?text=${encodeURIComponent(category)}&font=Inter`;
}

// Navbar toggle para mobile
document.getElementById('navToggle')?.addEventListener('click', () => {
  document.getElementById('navMenu').classList.toggle('open');
});

// Carrega estatísticas do hero
async function loadStats() {
  try {
    const res = await fetch(`${API}/events/stats`);
    const data = await res.json();
    document.getElementById('statEvents').textContent = data.totalEvents;
    document.getElementById('statRegistrations').textContent = data.totalRegistrations;
    document.getElementById('statUpcoming').textContent = data.upcomingEvents;
  } catch (err) {
    console.error('Erro ao carregar stats:', err);
  }
}

// Carrega categorias no filtro
async function loadCategories() {
  try {
    const res = await fetch(`${API}/events/categories`);
    const categories = await res.json();
    const select = document.getElementById('categoryFilter');
    
    categories.forEach(cat => {
      const opt = document.createElement('option');
      opt.value = cat;
      opt.textContent = cat;
      select.appendChild(opt);
    });
  } catch (err) {
    console.error('Erro ao carregar categorias:', err);
  }
}

// Renderiza um card de evento
function renderEventCard(event) {
  const spotsLeft = event.max_attendees - (event.registered_count || 0);
  const isFull = spotsLeft <= 0;
  
  return `
    <article class="event-card" onclick="window.location.href='/event.html?id=${event.id}'">
      <div class="event-card-image-wrapper">
        <img class="event-card-image" 
             src="${event.image}" 
             alt="${event.title}"
             onerror="this.src='${getImageFallback(event.category)}'">
        <span class="event-card-category">${event.category}</span>
      </div>
      <div class="event-card-body">
        <h3 class="event-card-title">${event.title}</h3>
        <p class="event-card-desc">${event.short_description || event.description}</p>
        <div class="event-card-meta">
          <div class="event-card-meta-item">
            <span class="icon">📅</span>
            <span>${formatDateTime(event.date)}</span>
          </div>
          <div class="event-card-meta-item">
            <span class="icon">📍</span>
            <span>${event.location}</span>
          </div>
        </div>
      </div>
      <div class="event-card-footer">
        <div class="event-card-spots ${isFull ? 'full' : ''}">
          <span class="spots-count">${isFull ? 'Esgotado' : `${spotsLeft} vagas`}</span>
          <span> de ${event.max_attendees}</span>
        </div>
        <span class="event-card-btn">${isFull ? 'Ver detalhes' : 'Inscrever-se'}</span>
      </div>
    </article>
  `;
}

// Carrega e renderiza eventos
async function loadEvents(search = '', category = 'Todos') {
  const grid = document.getElementById('eventsGrid');
  const title = document.getElementById('sectionTitle');
  grid.innerHTML = '<div class="loading-spinner"><div class="spinner"></div></div>';

  try {
    let url = `${API}/events?`;
    if (search) url += `search=${encodeURIComponent(search)}&`;
    if (category && category !== 'Todos') url += `category=${encodeURIComponent(category)}&`;

    const res = await fetch(url);
    const events = await res.json();

    if (events.length === 0) {
      grid.innerHTML = `
        <div class="empty-state" style="grid-column: 1 / -1;">
          <div class="empty-icon">🔍</div>
          <h3>Nenhum evento encontrado</h3>
          <p>Tente buscar com outros termos ou crie um novo evento.</p>
          <a href="/create.html" class="btn btn-primary">+ Criar evento</a>
        </div>
      `;
      title.textContent = 'Nenhum resultado';
      return;
    }

    grid.innerHTML = events.map(renderEventCard).join('');
    
    if (search || category !== 'Todos') {
      title.textContent = `${events.length} evento${events.length > 1 ? 's' : ''} encontrado${events.length > 1 ? 's' : ''}`;
    } else {
      title.textContent = 'Todos os eventos';
    }
  } catch (err) {
    console.error('Erro ao carregar eventos:', err);
    grid.innerHTML = `
      <div class="empty-state" style="grid-column: 1 / -1;">
        <div class="empty-icon">⚠️</div>
        <h3>Erro ao carregar eventos</h3>
        <p>Verifique se o servidor está rodando.</p>
      </div>
    `;
  }
}

// Debounce para busca
let searchTimeout;
document.getElementById('searchInput')?.addEventListener('input', (e) => {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    const category = document.getElementById('categoryFilter').value;
    loadEvents(e.target.value, category);
  }, 400);
});

document.getElementById('categoryFilter')?.addEventListener('change', (e) => {
  const search = document.getElementById('searchInput').value;
  loadEvents(search, e.target.value);
});

// Init
loadStats();
loadCategories();
loadEvents();
