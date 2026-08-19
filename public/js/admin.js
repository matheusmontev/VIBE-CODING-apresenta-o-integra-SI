// ============================================
// admin.js — Painel administrativo
// ============================================

const API = '/api';

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

function formatDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
}

function getImageFallback(category) {
  const colors = {
    'Tecnologia': ['8b5cf6', '3b82f6'], 'Música': ['ec4899', 'f59e0b'],
    'Arte': ['06b6d4', '8b5cf6'], 'Workshop': ['f59e0b', 'ef4444'],
    'Negócios': ['10b981', '3b82f6'], 'Geral': ['8b5cf6', '06b6d4']
  };
  const [c1, c2] = colors[category] || colors['Geral'];
  return `https://placehold.co/96x96/${c1}/${c2}?text=${encodeURIComponent(category.charAt(0))}&font=Inter`;
}

// Navbar toggle
document.getElementById('navToggle')?.addEventListener('click', () => {
  document.getElementById('navMenu').classList.toggle('open');
});

// Carrega estatísticas
async function loadStats() {
  try {
    const res = await fetch(`${API}/events/stats`);
    const data = await res.json();
    document.getElementById('totalEvents').textContent = data.totalEvents;
    document.getElementById('totalRegistrations').textContent = data.totalRegistrations;
    document.getElementById('upcomingEvents').textContent = data.upcomingEvents;
    document.getElementById('totalCapacity').textContent = data.totalCapacity.toLocaleString('pt-BR');
  } catch (err) {
    console.error('Erro ao carregar stats:', err);
  }
}

// Carrega tabela de eventos
async function loadEvents() {
  const tbody = document.getElementById('eventsTableBody');
  
  try {
    const res = await fetch(`${API}/events`);
    const events = await res.json();

    if (events.length === 0) {
      tbody.innerHTML = `
        <tr><td colspan="6">
          <div class="empty-state">
            <div class="empty-icon">📅</div>
            <h3>Nenhum evento cadastrado</h3>
            <p>Crie seu primeiro evento agora.</p>
            <a href="/create.html" class="btn btn-primary">+ Criar evento</a>
          </div>
        </td></tr>
      `;
      return;
    }

    tbody.innerHTML = events.map(event => {
      const spotsLeft = event.max_attendees - (event.registered_count || 0);
      const pct = Math.round((event.registered_count / event.max_attendees) * 100);
      const badgeClass = spotsLeft <= 0 ? 'badge-red' : pct > 70 ? 'badge-orange' : 'badge-green';
      
      return `
        <tr>
          <td>
            <div class="event-title-cell">
              <img class="event-thumb" src="${event.image}" alt="${event.title}"
                   onerror="this.src='${getImageFallback(event.category)}'">
              <div>
                <div class="event-name">${event.title}</div>
                <div class="event-loc">📍 ${event.location}</div>
              </div>
            </div>
          </td>
          <td><span class="badge badge-purple">${event.category}</span></td>
          <td>${formatDate(event.date)}</td>
          <td>
            <span class="badge ${badgeClass}">${event.registered_count || 0}</span>
          </td>
          <td>
            <div style="display: flex; align-items: center; gap: 8px;">
              <div class="progress-bar" style="width: 80px;">
                <div class="progress-fill" style="width: ${pct}%"></div>
              </div>
              <span style="font-size: 0.78rem; color: var(--text-muted);">${pct}%</span>
            </div>
          </td>
          <td>
            <div class="actions">
              <button class="btn btn-secondary btn-sm" onclick="viewRegistrations(${event.id}, '${event.title.replace(/'/g, "\\'")}')">👥</button>
              <a href="/create.html?id=${event.id}" class="btn btn-secondary btn-sm">✏️</a>
              <button class="btn btn-danger btn-sm" onclick="confirmDelete(${event.id}, '${event.title.replace(/'/g, "\\'")}')">🗑️</button>
            </div>
          </td>
        </tr>
      `;
    }).join('');

  } catch (err) {
    console.error('Erro ao carregar eventos:', err);
    tbody.innerHTML = `
      <tr><td colspan="6">
        <div class="empty-state">
          <div class="empty-icon">⚠️</div>
          <h3>Erro ao carregar</h3>
          <p>Verifique se o servidor está rodando.</p>
        </div>
      </td></tr>
    `;
  }
}

// Modal de inscritos
async function viewRegistrations(eventId, eventTitle) {
  const modal = document.getElementById('registrationsModal');
  const list = document.getElementById('registrationsList');
  const title = document.getElementById('modalEventTitle');
  
  title.textContent = `Inscritos — ${eventTitle}`;
  list.innerHTML = '<div class="loading-spinner"><div class="spinner"></div></div>';
  modal.classList.add('active');

  try {
    const res = await fetch(`${API}/events/${eventId}/registrations`);
    const data = await res.json();

    if (data.registrations.length === 0) {
      list.innerHTML = `
        <div class="empty-state" style="padding: 30px 0;">
          <div class="empty-icon" style="font-size: 2rem;">👤</div>
          <h3>Nenhum inscrito</h3>
          <p>Este evento ainda não tem inscrições.</p>
        </div>
      `;
      return;
    }

    list.innerHTML = data.registrations.map(reg => `
      <div class="registration-item">
        <div class="registration-info">
          <div class="registration-name">${reg.name}</div>
          <div class="registration-email">📧 ${reg.email}</div>
          ${reg.phone ? `<div class="registration-phone">📱 ${reg.phone}</div>` : ''}
        </div>
        <button class="btn btn-danger btn-sm" onclick="removeRegistration(${reg.id}, ${eventId}, '${eventTitle.replace(/'/g, "\\'")}')">✕</button>
      </div>
    `).join('');

  } catch (err) {
    list.innerHTML = '<p style="color: var(--accent-red);">Erro ao carregar inscritos.</p>';
  }
}

// Remover inscrição
async function removeRegistration(regId, eventId, eventTitle) {
  try {
    const res = await fetch(`${API}/registrations/${regId}`, { method: 'DELETE' });
    if (res.ok) {
      showToast('success', 'Inscrição removida', 'O participante foi removido do evento.');
      viewRegistrations(eventId, eventTitle);
      loadStats();
      loadEvents();
    }
  } catch (err) {
    showToast('error', 'Erro', 'Falha ao remover inscrição.');
  }
}

// Fechar modal de inscritos
document.getElementById('closeRegModal')?.addEventListener('click', () => {
  document.getElementById('registrationsModal').classList.remove('active');
});

document.getElementById('registrationsModal')?.addEventListener('click', (e) => {
  if (e.target === e.currentTarget) e.currentTarget.classList.remove('active');
});

// Confirmação de exclusão
let deleteTargetId = null;

function confirmDelete(id, name) {
  deleteTargetId = id;
  document.getElementById('deleteEventName').textContent = name;
  document.getElementById('deleteModal').classList.add('active');
}

document.getElementById('closeDeleteModal')?.addEventListener('click', () => {
  document.getElementById('deleteModal').classList.remove('active');
});

document.getElementById('cancelDelete')?.addEventListener('click', () => {
  document.getElementById('deleteModal').classList.remove('active');
});

document.getElementById('deleteModal')?.addEventListener('click', (e) => {
  if (e.target === e.currentTarget) e.currentTarget.classList.remove('active');
});

document.getElementById('confirmDelete')?.addEventListener('click', async () => {
  if (!deleteTargetId) return;

  try {
    const res = await fetch(`${API}/events/${deleteTargetId}`, { method: 'DELETE' });
    if (res.ok) {
      showToast('success', 'Evento excluído', 'O evento e suas inscrições foram removidos.');
      document.getElementById('deleteModal').classList.remove('active');
      loadStats();
      loadEvents();
    } else {
      const data = await res.json();
      showToast('error', 'Erro', data.error);
    }
  } catch (err) {
    showToast('error', 'Erro', 'Falha ao excluir evento.');
  }
});

// Init
loadStats();
loadEvents();
