/**
 * Ai-Chef Smart Logic (v3.6) - DEBUG MODE
 * Focus: Photo Paths & Click Handlers
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
    recipesGrid: document.getElementById('recipes-grid'),
    modalRecipe: document.getElementById('modal-recipe'),
    recipeSheet: document.getElementById('recipe-sheet'),
    recipeDetailContent: document.getElementById('recipe-detail-content'),
    btnCloseRecipe: document.getElementById('btn-close-recipe')
  };

  let currentVibe = 'Обычный ужин';

  // Navigation
  ui.navItems.forEach(item => {
    item.addEventListener('click', () => {
      const target = item.getAttribute('data-view');
      console.log('Switching to view:', target);
      ui.navItems.forEach(n => n.classList.remove('active'));
      item.classList.add('active');
      ui.views.forEach(v => {
        v.classList.remove('active');
        if (v.id === `view-${target}`) v.classList.add('active');
      });
      if (target === 'history') loadHistory();
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

  // Upload
  ui.uploadZone?.addEventListener('click', () => ui.fileInput.click());
  ui.btnMain?.addEventListener('click', () => ui.fileInput.click());

  ui.fileInput?.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        ui.previewImg.src = event.target.result;
        ui.previewImg.style.opacity = '1';
        ui.uploadZone.classList.add('analyzing-pulse');
        ui.scannerOverlay.hidden = false;
        runAI(file);
      };
      reader.readAsDataURL(file);
    }
  });

  async function runAI(file) {
    ui.panelInitial.hidden = true;
    ui.btnMain.disabled = true;
    ui.btnMain.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Шеф думает...';

    const formData = new FormData();
    formData.append('photo', file);
    formData.append('vibe', currentVibe);
    const allergens = ui.inputAllergens?.value.split(',').map(s => s.trim()).filter(Boolean) || [];
    const dislikes = ui.inputDislikes?.value.split(',').map(s => s.trim()).filter(Boolean) || [];
    formData.append('allergens', JSON.stringify(allergens));
    formData.append('dislikes', JSON.stringify(dislikes));

    try {
      const response = await fetch('/api/analyze', { method: 'POST', body: formData });
      const data = await response.json();
      renderApp(data);
    } catch (err) {
      console.error('AI Run Error:', err);
      resetApp();
    }
  }

  function renderApp(data) {
    ui.scannerOverlay.hidden = true;
    ui.uploadZone.classList.remove('analyzing-pulse');
    ui.panelResults.hidden = false;
    ui.btnMain.disabled = false;
    ui.btnMain.innerHTML = '<i class="fa-solid fa-camera"></i> Еще одно фото';

    ui.ingredientsList.innerHTML = '';
    (data.ingredients || []).forEach(name => {
      const chip = document.createElement('div');
      chip.className = 'chip';
      chip.innerHTML = `<span class="status-dot"></span> ${name}`;
      ui.ingredientsList.appendChild(chip);
    });

    ui.recipesGrid.innerHTML = '';
    const recipes = data.recipes || data.dishes || data.suggestions || [];
    
    if (recipes.length === 0) {
      ui.recipesGrid.innerHTML = '<p style="text-align:center; padding:20px; color:var(--text-muted);">Ничего не найдено.</p>';
    }

    recipes.forEach(r => {
      const card = document.createElement('div');
      card.className = 'recipe-card';
      card.style.cursor = 'pointer';
      const img = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80&w=500';
      card.innerHTML = `
        <img src="${img}" class="recipe-img" />
        <div class="recipe-content">
          <h3 class="recipe-title">${r.name}</h3>
          <p class="recipe-meta"><i class="fa-solid fa-clock"></i> ${r.time || '25м'} • ${r.difficulty || 'Легко'}</p>
        </div>
      `;
      card.addEventListener('click', () => {
        console.log('Recipe clicked:', r.name);
        showRecipeDetails(r);
      });
      ui.recipesGrid.appendChild(card);
    });
  }

  function showRecipeDetails(r) {
    console.log('Opening modal for:', r.name);
    const k = r.kbju?.k || r.kbju?.calories || Math.floor(Math.random()*150 + 200);
    const b = r.kbju?.b || r.kbju?.protein || 15;
    const j = r.kbju?.j || r.kbju?.fat || 10;
    const u = r.kbju?.u || r.kbju?.carbs || 20;

    const steps = r.steps || r.instructions || ["Подготовьте продукты", "Смешайте и обжарьте", "Подавайте с зеленью"];
    const stepsHtml = steps.map((step, i) => `
      <div style="display:flex; gap:12px; margin-bottom:12px;">
        <span style="background:var(--accent-green); color:#fff; width:24px; height:24px; border-radius:50%; display:flex; align-items:center; justify-content:center; flex-shrink:0; font-size:0.8rem; font-weight:700;">${i+1}</span>
        <p style="font-size:0.95rem; line-height:1.4;">${step}</p>
      </div>
    `).join('');

    ui.recipeDetailContent.innerHTML = `
      <h2 style="color:var(--accent-green); margin-bottom:12px;">${r.name}</h2>
      <div style="background:var(--bg-secondary); padding:16px; border-radius:var(--radius-sm); display:flex; justify-content:space-between; margin-bottom:20px; border:1px solid #E0E7E0;">
        <div style="text-align:center;"><b style="display:block; color:var(--accent-green); font-size:1.1rem;">${k}</b><small>ккал</small></div>
        <div style="text-align:center;"><b style="display:block; font-size:1.1rem;">${b}г</b><small>белки</small></div>
        <div style="text-align:center;"><b style="display:block; font-size:1.1rem;">${j}г</b><small>жиры</small></div>
        <div style="text-align:center;"><b style="display:block; font-size:1.1rem;">${u}г</b><small>углев</small></div>
      </div>
      <p style="background:#F1F8E9; color:#2E7D32; padding:12px; border-radius:12px; font-size:0.85rem; margin-bottom:20px; border-left:4px solid var(--accent-green);">
        <i class="fa-solid fa-circle-info"></i> ${r.bestTime || 'Сбалансированное блюдо.'}
      </p>
      <h3 style="margin-bottom:12px;">Инструкция:</h3>
      <div>${stepsHtml}</div>
    `;
    ui.modalRecipe.hidden = false;
    setTimeout(() => ui.recipeSheet.classList.add('active'), 10);
  }

  ui.btnCloseRecipe?.addEventListener('click', () => {
    ui.recipeSheet.classList.remove('active');
    setTimeout(() => ui.modalRecipe.hidden = true, 400);
  });

  async function loadHistory() {
    const list = document.getElementById('history-list');
    list.innerHTML = '<div style="text-align:center; padding:50px;"><i class="fa-solid fa-spinner fa-spin"></i></div>';
    try {
      const res = await fetch('/api/history');
      const data = await res.json();
      if (data.items?.length > 0) {
        list.innerHTML = '';
        data.items.forEach(item => {
          const card = document.createElement('div');
          card.className = 'recipe-card';
          // Robust path handling
          let photoUrl = item.photoPath ? item.photoPath.replace(/\\/g, '/') : '';
          if (photoUrl && !photoUrl.startsWith('/')) photoUrl = '/' + photoUrl;
          
          card.innerHTML = `
            <img src="${photoUrl}" style="width:100%; height:150px; object-fit:cover;" onerror="this.src='https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80&w=500'" />
            <div class="recipe-content">
              <h3 class="recipe-title">${item.aiResponse.recipes?.[0]?.name || 'Анализ фото'}</h3>
              <p class="recipe-meta">${new Date(item.createdAt).toLocaleDateString()}</p>
            </div>
          `;
          card.addEventListener('click', () => {
            if (item.aiResponse.recipes?.[0]) showRecipeDetails(item.aiResponse.recipes[0]);
          });
          list.appendChild(card);
        });
      } else {
        list.innerHTML = '<p style="text-align:center; padding:50px; color:var(--text-muted);">История пуста</p>';
      }
    } catch (err) { console.error('History load fail:', err); }
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
    ui.uploadZone.classList.remove('analyzing-pulse');
  }
});
