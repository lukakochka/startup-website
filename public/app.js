/**
 * Ai-Chef Smart Logic (v3.2) - FIXED SCANNER & CLEANUP
 */

document.addEventListener('DOMContentLoaded', () => {
  const ui = {
    views: document.querySelectorAll('.app-view'),
    navItems: document.querySelectorAll('.nav-item'),
    fileInput: document.getElementById('file-input'),
    uploadZone: document.getElementById('upload-zone'),
    previewImg: document.getElementById('preview-img'),
    scannerOverlay: document.getElementById('scanner-overlay'),
    
    panelInitial: document.getElementById('panel-initial'),
    panelResults: document.getElementById('panel-results'),
    
    btnMain: document.getElementById('btn-main-action'),
    btnReset: document.getElementById('btn-reset'),
    
    vibeChips: document.querySelectorAll('.vibe-chip'),
    inputAllergens: document.getElementById('prefs-allergens'),
    inputDislikes: document.getElementById('prefs-dislikes'),
    btnOpenSettings: document.getElementById('btn-open-settings'),
    btnCloseSettings: document.getElementById('btn-close-settings'),
    btnSaveSettings: document.getElementById('btn-save-settings'),
    modalSettings: document.getElementById('modal-settings'),
    settingsSheet: document.getElementById('settings-sheet'),
    
    ingredientsList: document.getElementById('ingredients-list'),
    recipesGrid: document.getElementById('recipes-grid')
  };

  let currentVibe = 'Обычный ужин';

  // Navigation
  ui.navItems.forEach(item => {
    item.addEventListener('click', () => {
      const target = item.getAttribute('data-view');
      ui.navItems.forEach(n => n.classList.remove('active'));
      item.classList.add('active');
      ui.views.forEach(v => {
        v.classList.remove('active');
        if (v.id === `view-${target}`) v.classList.add('active');
      });
    });
  });

  // Vibes
  ui.vibeChips.forEach(chip => {
    chip.addEventListener('click', () => {
      ui.vibeChips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      currentVibe = chip.getAttribute('data-vibe');
    });
  });

  // Settings
  ui.btnOpenSettings?.addEventListener('click', () => {
    ui.modalSettings.hidden = false;
    setTimeout(() => ui.settingsSheet?.classList.add('active'), 10);
  });
  
  const closeSettings = () => {
    ui.settingsSheet?.classList.remove('active');
    setTimeout(() => ui.modalSettings.hidden = true, 400);
  };
  ui.btnCloseSettings?.addEventListener('click', closeSettings);
  ui.btnSaveSettings?.addEventListener('click', closeSettings);
  ui.modalSettings?.addEventListener('click', (e) => {
    if (e.target === ui.modalSettings) closeSettings();
  });

  // Upload & Scan
  ui.uploadZone?.addEventListener('click', () => ui.fileInput.click());
  ui.btnMain?.addEventListener('click', () => ui.fileInput.click());

  ui.fileInput?.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        ui.previewImg.src = event.target.result;
        ui.previewImg.style.opacity = '1'; // Show photo clearly!
        ui.uploadZone.classList.add('analyzing-pulse');
        ui.scannerOverlay.hidden = false; // Start scanner animation
        runAI(file);
      };
      reader.readAsDataURL(file);
    }
  });

  async function runAI(file) {
    ui.panelInitial.hidden = true;
    ui.btnMain.disabled = true;
    ui.btnMain.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Шеф анализирует...';

    const formData = new FormData();
    formData.append('photo', file);
    formData.append('vibe', currentVibe);
    
    const allergens = ui.inputAllergens?.value.split(',').map(s => s.trim()).filter(Boolean) || [];
    const dislikes = ui.inputDislikes?.value.split(',').map(s => s.trim()).filter(Boolean) || [];
    formData.append('allergens', JSON.stringify(allergens));
    formData.append('dislikes', JSON.stringify(dislikes));

    try {
      const response = await fetch('/api/analyze', { method: 'POST', body: formData });
      if (!response.ok) throw new Error('API Fail');
      const data = await response.json();
      renderApp(data);
    } catch (err) {
      console.error(err);
      alert('Ошибка связи с ИИ.');
      resetApp();
    }
  }

  function renderApp(data) {
    ui.scannerOverlay.hidden = true; // Stop scanner only here
    ui.uploadZone.classList.remove('analyzing-pulse');
    ui.panelResults.hidden = false;
    ui.btnMain.disabled = false;
    ui.btnMain.innerHTML = '<i class="fa-solid fa-camera"></i> Новое фото';

    ui.ingredientsList.innerHTML = '';
    (data.ingredients || []).forEach(name => {
      const chip = document.createElement('div');
      chip.className = 'chip';
      chip.innerHTML = `<span class="status-dot"></span> ${name}`;
      ui.ingredientsList.appendChild(chip);
    });

    ui.recipesGrid.innerHTML = '';
    const recipes = data.recipes || data.dishes || data.ideas || [];
    if (recipes.length === 0) {
      ui.recipesGrid.innerHTML = '<p style="text-align:center; padding:20px; color:var(--text-muted);">ИИ не нашел рецептов.</p>';
    }

    recipes.forEach(r => {
      const card = document.createElement('div');
      card.className = 'recipe-card';
      const img = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80&w=500';
      card.innerHTML = `
        <img src="${img}" class="recipe-img" />
        <div class="recipe-content">
          <h3 class="recipe-title">${r.name}</h3>
          <p class="recipe-meta"><i class="fa-solid fa-clock"></i> ${r.time || '20м'} • ${r.difficulty || 'Легко'}</p>
          <p style="font-size:0.85rem; color:var(--text-muted); margin-top:8px;">${r.description || ''}</p>
        </div>
      `;
      ui.recipesGrid.appendChild(card);
    });
  }

  ui.btnReset?.addEventListener('click', resetApp);

  function resetApp() {
    ui.panelInitial.hidden = false;
    ui.panelResults.hidden = true;
    ui.scannerOverlay.hidden = true;
    ui.previewImg.style.opacity = '0.5';
    ui.btnMain.disabled = false;
    ui.btnMain.innerHTML = '<i class="fa-solid fa-camera"></i> Сделать фото';
    ui.fileInput.value = '';
    ui.previewImg.src = 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&q=80&w=1000';
    ui.uploadZone.classList.remove('analyzing-pulse');
  }
});
