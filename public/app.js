/**
 * Ai-Chef Smart Logic (v3.0)
 * Context-aware Analysis & UI Management
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
    
    // Preferences & Viber
    vibeChips: document.querySelectorAll('.vibe-chip'),
    inputAllergens: document.getElementById('prefs-allergens'),
    inputDislikes: document.getElementById('prefs-dislikes'),
    btnOpenSettings: document.getElementById('btn-open-settings'),
    btnCloseSettings: document.getElementById('btn-close-settings'),
    btnSaveSettings: document.getElementById('btn-save-settings'),
    modalSettings: document.getElementById('modal-settings'),
    
    ingredientsList: document.getElementById('ingredients-list'),
    recipesGrid: document.getElementById('recipes-grid')
  };

  let currentVibe = 'Обычный ужин';

  // --- 1. Navigation & UI ---
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

  // Vibe Selector
  ui.vibeChips.forEach(chip => {
    chip.addEventListener('click', () => {
      ui.vibeChips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      currentVibe = chip.getAttribute('data-vibe');
    });
  });

  // Settings Toggle
  ui.btnOpenSettings?.addEventListener('click', () => {
    ui.modalSettings.hidden = false;
    setTimeout(() => document.getElementById('settings-sheet').classList.add('active'), 10);
  });
  
  const closeSettings = () => {
    document.getElementById('settings-sheet').classList.remove('active');
    setTimeout(() => ui.modalSettings.hidden = true, 400);
  };

  ui.btnCloseSettings?.addEventListener('click', closeSettings);
  ui.btnSaveSettings?.addEventListener('click', closeSettings);
  ui.modalSettings?.addEventListener('click', (e) => {
    if (e.target === ui.modalSettings) closeSettings();
  });

  // --- 2. Image Handling ---
  ui.uploadZone?.addEventListener('click', () => ui.fileInput.click());
  ui.btnMain?.addEventListener('click', () => ui.fileInput.click());

  ui.fileInput?.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        ui.previewImg.src = event.target.result;
        ui.previewImg.style.opacity = '1';
        runAI(file);
      };
      reader.readAsDataURL(file);
    }
  });

  // --- 3. THE MAGIC (AI Analysis) ---
  async function runAI(file) {
    ui.scannerOverlay.hidden = false;
    ui.panelInitial.hidden = true;
    ui.btnMain.disabled = true;
    ui.btnMain.innerHTML = '<i class="fa-solid fa-brain fa-fade"></i> Шеф придумывает...';

    // Prepare data
    const formData = new FormData();
    formData.append('photo', file);
    formData.append('vibe', currentVibe);
    
    // Parse strings to JSON arrays
    const allergens = ui.inputAllergens.value.split(',').map(s => s.trim()).filter(Boolean);
    const dislikes = ui.inputDislikes.value.split(',').map(s => s.trim()).filter(Boolean);
    
    formData.append('allergens', JSON.stringify(allergens));
    formData.append('dislikes', JSON.stringify(dislikes));

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) throw new Error('API Fail');
      
      const data = await response.json();
      renderApp(data);
    } catch (err) {
      console.error(err);
      alert('Ошибка анализа. Проверьте GITHUB_TOKEN.');
      resetApp();
    }
  }

  function renderApp(data) {
    ui.scannerOverlay.hidden = true;
    ui.panelResults.hidden = false;
    ui.btnMain.disabled = false;
    ui.btnMain.innerHTML = '<i class="fa-solid fa-camera"></i> Еще одно фото';

    // Ingredients
    ui.ingredientsList.innerHTML = '';
    (data.ingredients || []).forEach(name => {
      const chip = document.createElement('div');
      chip.className = 'chip';
      chip.innerHTML = `<span class="status-dot"></span> ${name}`;
      ui.ingredientsList.appendChild(chip);
    });

    // Recipes
    ui.recipesGrid.innerHTML = '';
    // Try to find recipes in different possible fields
    const recipes = data.recipes || data.dishes || data.ideas || data.suggestions || [];
    
    console.log('Found recipes:', recipes);

    if (recipes.length === 0) {
      ui.recipesGrid.innerHTML = '<p style="text-align:center; padding:20px; color:var(--text-muted);">ИИ распознал продукты, но не смог придумать блюда. Попробуйте сменить вайб!</p>';
    }

    recipes.forEach(r => {
      const card = document.createElement('div');
      card.className = 'recipe-card';
      const img = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80&w=500';
      card.innerHTML = `
        <img src="${img}" class="recipe-img" />
        <div class="recipe-content">
          <h3 class="recipe-title">${r.name}</h3>
          <p class="recipe-meta"><i class="fa-solid fa-fire-burner"></i> ${r.time || '20м'} • ${r.difficulty || 'Легко'}</p>
          <p style="font-size:0.8rem; color:var(--text-muted); margin-top:8px;">${r.description || 'Вкусное блюдо из ваших продуктов.'}</p>
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
  }
});

  <!-- Settings Bottom Sheet -->
  <div class="modal-backdrop" id="modal-settings" hidden>
    <div class="bottom-sheet" id="settings-sheet">
      <div class="sheet-handle"></div>
      <h2 style="margin-bottom: 8px;">Настройки ИИ</h2>
      <p style="color:var(--text-muted); font-size:0.8rem; margin-bottom:24px;">Ваши предпочтения для Шефа</p>
      
      <label style="font-size:0.85rem; color:var(--text-muted); display:block; margin-bottom:6px;">Аллергии (через запятую)</label>
      <input type="text" id="prefs-allergens" class="pref-input" placeholder="Напр: молоко, арахис" />
      
      <label style="font-size:0.85rem; color:var(--text-muted); display:block; margin-bottom:6px;">Исключить продукты</label>
      <input type="text" id="prefs-dislikes" class="pref-input" placeholder="Напр: кинза, лук" />
      
      <button class="btn-primary" id="btn-save-settings">Сохранить</button>
      <button id="btn-close-settings" style="background:none; border:none; color:var(--text-muted); width:100%; margin-top:20px; cursor:pointer;">Закрыть</button>
    </div>
  </div>
