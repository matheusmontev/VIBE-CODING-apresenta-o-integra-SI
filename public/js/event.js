// ============================================
// event.js — Página de detalhes do evento
// ============================================

const API = '/api';

function formatDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
}

function formatTime(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
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

function getImageFallback(category) {
  const colors = {
    'Tecnologia': ['8b5cf6', '3b82f6'], 'Música': ['ec4899', 'f59e0b'],
    'Arte': ['06b6d4', '8b5cf6'], 'Workshop': ['f59e0b', 'ef4444'],
    'Negócios': ['10b981', '3b82f6'], 'Geral': ['8b5cf6', '06b6d4']
  };
  const [c1, c2] = colors[category] || colors['Geral'];
  return `https://placehold.co/900x400/${c1}/${c2}?text=${encodeURIComponent(category)}&font=Inter`;
}

// Navbar toggle
document.getElementById('navToggle')?.addEventListener('click', () => {
  document.getElementById('navMenu').classList.toggle('open');
});

// Pega ID da URL
const params = new URLSearchParams(window.location.search);
const eventId = params.get('id');

let currentEvent = null;

async function loadEvent() {
  if (!eventId) {
    window.location.href = '/';
    return;
  }

  const container = document.getElementById('eventDetail');

  try {
    const res = await fetch(`${API}/events/${eventId}`);
    if (!res.ok) throw new Error('Evento não encontrado');
    
    currentEvent = await res.json();
    document.title = `${currentEvent.title} — Eventos Platform`;

    const spotsLeft = currentEvent.max_attendees - (currentEvent.registered_count || 0);
    const isFull = spotsLeft <= 0;
    const progressPct = Math.min(100, Math.round((currentEvent.registered_count / currentEvent.max_attendees) * 100));

    container.innerHTML = `
      <a href="/" class="btn btn-secondary btn-sm" style="margin-bottom: 24px;">← Voltar</a>

      <div class="event-detail-header">
        <img class="event-detail-image" src="${currentEvent.image}" alt="${currentEvent.title}"
             onerror="this.src='${getImageFallback(currentEvent.category)}'">
        <div class="event-detail-overlay">
          <span class="event-detail-category">${currentEvent.category}</span>
          <h1 class="event-detail-title">${currentEvent.title}</h1>
        </div>
      </div>

      <div class="event-detail-info">
        <div class="event-info-card">
          <div class="event-info-icon">📅</div>
          <div class="event-info-text">
            <div class="label">Data</div>
            <div class="value">${formatDate(currentEvent.date)}</div>
          </div>
        </div>
        <div class="event-info-card">
          <div class="event-info-icon">🕐</div>
          <div class="event-info-text">
            <div class="label">Horário</div>
            <div class="value">${formatTime(currentEvent.date)}</div>
          </div>
        </div>
        <div class="event-info-card">
          <div class="event-info-icon">📍</div>
          <div class="event-info-text">
            <div class="label">Local</div>
            <div class="value">${currentEvent.location}</div>
          </div>
        </div>
        <div class="event-info-card">
          <div class="event-info-icon">👥</div>
          <div class="event-info-text">
            <div class="label">Vagas</div>
            <div class="value">${isFull ? 'Esgotado' : `${spotsLeft} restantes de ${currentEvent.max_attendees}`}</div>
          </div>
        </div>
      </div>

      <div class="event-detail-description">
        <h3>Sobre o evento</h3>
        <p>${currentEvent.description}</p>
      </div>

      <div class="register-section">
        <h3>${isFull ? '😔 Vagas esgotadas' : '🎉 Garanta sua vaga!'}</h3>
        <p>${isFull ? 'Infelizmente todas as vagas foram preenchidas.' : 'Inscreva-se agora e participe deste evento incrível.'}</p>
        <div class="progress-bar" style="max-width: 400px; margin: 0 auto 20px;">
          <div class="progress-fill" style="width: ${progressPct}%"></div>
        </div>
        <p style="font-size: 0.82rem; color: var(--text-muted); margin-bottom: 20px;">
          ${currentEvent.registered_count || 0} de ${currentEvent.max_attendees} inscritos (${progressPct}%)
        </p>
        ${isFull ? '' : '<button class="btn btn-primary btn-lg" id="openRegisterBtn">Inscrever-se agora</button>'}
      </div>
    `;

    // Bind do botão de inscrição
    document.getElementById('openRegisterBtn')?.addEventListener('click', () => {
      document.getElementById('registerModal').classList.add('active');
    });

  } catch (err) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">😕</div>
        <h3>Evento não encontrado</h3>
        <p>O evento que você procura não existe ou foi removido.</p>
        <a href="/" class="btn btn-primary">Ver todos os eventos</a>
      </div>
    `;
  }
}

// Modal de inscrição
document.getElementById('closeModal')?.addEventListener('click', () => {
  document.getElementById('registerModal').classList.remove('active');
});

document.getElementById('cancelRegister')?.addEventListener('click', () => {
  document.getElementById('registerModal').classList.remove('active');
});

document.getElementById('registerModal')?.addEventListener('click', (e) => {
  if (e.target === e.currentTarget) {
    e.currentTarget.classList.remove('active');
  }
});

// Submit inscrição
document.getElementById('submitRegister')?.addEventListener('click', async () => {
  const name = document.getElementById('regName').value.trim();
  const email = document.getElementById('regEmail').value.trim();
  const phone = document.getElementById('regPhone').value.trim();

  if (!name || !email) {
    showToast('error', 'Campos obrigatórios', 'Preencha nome e email.');
    return;
  }

  const btn = document.getElementById('submitRegister');
  btn.disabled = true;
  btn.textContent = 'Enviando...';

  try {
    const res = await fetch(`${API}/events/${eventId}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, phone })
    });

    const data = await res.json();

    if (!res.ok) {
      showToast('error', 'Erro na inscrição', data.error);
      btn.disabled = false;
      btn.textContent = 'Confirmar inscrição';
      return;
    }

    showToast('success', 'Inscrição confirmada!', `Você está inscrito em "${currentEvent.title}".`);
    document.getElementById('registerModal').classList.remove('active');
    document.getElementById('registerForm').reset();
    
    // Recarrega o evento para atualizar contadores
    setTimeout(loadEvent, 500);
  } catch (err) {
    showToast('error', 'Erro', 'Falha ao conectar com o servidor.');
    btn.disabled = false;
    btn.textContent = 'Confirmar inscrição';
  }
});

loadEvent();
