// ============================================
// create.js — Formulário de criação/edição
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

// Navbar toggle
document.getElementById('navToggle')?.addEventListener('click', () => {
  document.getElementById('navMenu').classList.toggle('open');
});

// Checa se é edição (tem ?id= na URL)
const params = new URLSearchParams(window.location.search);
const editId = params.get('id');
const isEdit = !!editId;

if (isEdit) {
  document.getElementById('pageTitle').textContent = '✏️ Editar evento';
  document.getElementById('pageSubtitle').textContent = 'Atualize as informações do evento.';
  document.getElementById('submitBtn').textContent = '💾 Salvar alterações';
  document.title = 'Editar Evento — Eventos Platform';
  loadEventData();
}

// Carrega dados do evento para edição
async function loadEventData() {
  try {
    const res = await fetch(`${API}/events/${editId}`);
    if (!res.ok) throw new Error('Evento não encontrado');
    
    const event = await res.json();
    document.getElementById('title').value = event.title;
    document.getElementById('shortDesc').value = event.short_description || '';
    document.getElementById('description').value = event.description;
    document.getElementById('location').value = event.location;
    document.getElementById('category').value = event.category;
    document.getElementById('maxAttendees').value = event.max_attendees;

    // Formata a data para datetime-local
    if (event.date) {
      const d = new Date(event.date);
      const formatted = d.toISOString().slice(0, 16);
      document.getElementById('date').value = formatted;
    }

    // Mostra imagem atual
    if (event.image) {
      const preview = document.getElementById('filePreview');
      const img = document.getElementById('previewImg');
      img.src = event.image;
      preview.style.display = 'block';
    }
  } catch (err) {
    showToast('error', 'Erro', 'Não foi possível carregar o evento.');
    setTimeout(() => window.location.href = '/admin.html', 2000);
  }
}

// Preview da imagem selecionada
document.getElementById('imageInput')?.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const preview = document.getElementById('filePreview');
  const img = document.getElementById('previewImg');
  
  const reader = new FileReader();
  reader.onload = (ev) => {
    img.src = ev.target.result;
    preview.style.display = 'block';
  };
  reader.readAsDataURL(file);
});

// Submit do formulário
document.getElementById('eventForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();

  const btn = document.getElementById('submitBtn');
  btn.disabled = true;
  btn.textContent = isEdit ? 'Salvando...' : 'Criando...';

  const formData = new FormData();
  formData.append('title', document.getElementById('title').value);
  formData.append('short_description', document.getElementById('shortDesc').value);
  formData.append('description', document.getElementById('description').value);
  formData.append('date', document.getElementById('date').value);
  formData.append('location', document.getElementById('location').value);
  formData.append('category', document.getElementById('category').value);
  formData.append('max_attendees', document.getElementById('maxAttendees').value);

  const imageFile = document.getElementById('imageInput').files[0];
  if (imageFile) {
    formData.append('image', imageFile);
  }

  try {
    const url = isEdit ? `${API}/events/${editId}` : `${API}/events`;
    const method = isEdit ? 'PUT' : 'POST';

    const res = await fetch(url, { method, body: formData });
    const data = await res.json();

    if (!res.ok) {
      showToast('error', 'Erro', data.error);
      btn.disabled = false;
      btn.textContent = isEdit ? '💾 Salvar alterações' : '🚀 Criar evento';
      return;
    }

    showToast('success', isEdit ? 'Evento atualizado!' : 'Evento criado!',
      `"${data.title}" foi ${isEdit ? 'atualizado' : 'criado'} com sucesso.`);

    setTimeout(() => {
      window.location.href = `/event.html?id=${data.id}`;
    }, 1500);
  } catch (err) {
    showToast('error', 'Erro', 'Falha ao conectar com o servidor.');
    btn.disabled = false;
    btn.textContent = isEdit ? '💾 Salvar alterações' : '🚀 Criar evento';
  }
});
