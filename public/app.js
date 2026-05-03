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
    recipesGrid: document.getElementById('recipes-grid'),
    
    // Recipe Detail
    modalRecipe: document.getElementById('modal-recipe'),
    recipeSheet: document.getElementById('recipe-sheet'),
    recipeDetailContent: document.getElementById('recipe-detail-content'),
    btnCloseRecipe: document.getElementById('btn-close-recipe')
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

      if (target === 'history') {
        loadHistory();
      }
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
      card.style.cursor = 'pointer';
      const img = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80&w=500';
      card.innerHTML = `
        <img src="${img}" class="recipe-img" />
        <div class="recipe-content">
          <h3 class="recipe-title">${r.name}</h3>
          <p class="recipe-meta"><i class="fa-solid fa-clock"></i> ${r.time || '20м'} • ${r.difficulty || 'Легко'}</p>
        </div>
      `;
      
      // Open Details on Click
      card.addEventListener('click', () => showRecipeDetails(r));
      ui.recipesGrid.appendChild(card);
    });
  }

  function showRecipeDetails(r) {
    const kbju = r.kbju || {k:0, b:0, j:0, u:0};
    const stepsHtml = (r.steps || []).map((step, i) => `
      <div style="display:flex; gap:12px; margin-bottom:12px;">
        <span style="background:var(--accent-green); color:#fff; width:24px; height:24px; border-radius:50%; display:flex; align-items:center; justify-content:center; flex-shrink:0; font-size:0.8rem; font-weight:700;">${i+1}</span>
        <p style="font-size:0.9rem; line-height:1.4;">${step}</p>
      </div>
    `).join('');

    ui.recipeDetailContent.innerHTML = `
      <h2 style="color:var(--accent-green); margin-bottom:12px;">${r.name}</h2>
      <div style="background:var(--bg-secondary); padding:16px; border-radius:var(--radius-sm); display:flex; justify-content:space-between; margin-bottom:20px;">
        <div style="text-align:center;"><b style="display:block; color:var(--accent-green);">${kbju.k}</b><small>ккал</small></div>
        <div style="text-align:center;"><b style="display:block;">${kbju.b}г</b><small>белки</small></div>
        <div style="text-align:center;"><b style="display:block;">${kbju.j}г</b><small>жиры</small></div>
        <div style="text-align:center;"><b style="display:block;">${kbju.u}г</b><small>углев</small></div>
      </div>
      <p style="background:#E8F5E9; color:#2E7D32; padding:12px; border-radius:12px; font-size:0.85rem; margin-bottom:20px; border-left:4px solid var(--accent-green);">
        <i class="fa-solid fa-circle-info"></i> ${r.bestTime || 'Подходит для сбалансированного питания.'}
      </p>
      <h3 style="margin-bottom:12px; font-size:1.1rem;">Как готовить:</h3>
      <div class="steps-list">${stepsHtml}</div>
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
    list.innerHTML = '<div style="text-align:center; padding:50px;"><i class="fa-solid fa-spinner fa-spin"></i> Загружаем...</div>';

    try {
      const res = await fetch('/api/history');
      const data = await res.json();
      
      if (data.items && data.items.length > 0) {
        list.innerHTML = '';
        data.items.forEach(item => {
          const card = document.createElement('div');
          card.className = 'recipe-card';
          // Fix path for web access
          const photoUrl = item.photoPath ? item.photoPath.replace('public/', '').replace(/\\/g, '/') : '';
          
          card.innerHTML = `
            <div style="position:relative; height:150px;">
              <img src="${photoUrl}" style="width:100%; height:100%; object-fit:cover;" onerror="this.src='https://images.unsplash.com/photo-1585568444142-30267a503554?auto=format&fit=crop&q=80&w=500'" />
              <div style="position:absolute; bottom:0; left:0; right:0; padding:10px; background:linear-gradient(transparent, rgba(0,0,0,0.8)); color:#fff;">
                <small>${new Date(item.createdAt).toLocaleDateString()}</small>
              </div>
            </div>
            <div class="recipe-content">
              <h3 class="recipe-title">${item.aiResponse.recipes[0]?.name || 'Анализ фото'}</h3>
              <p class="recipe-meta">${item.ingredients.substring(0, 50)}...</p>
            </div>
          `;
          
          card.addEventListener('click', () => {
            // Show the first recipe from that analysis
            if (item.aiResponse.recipes[0]) showRecipeDetails(item.aiResponse.recipes[0]);
          });
          
          list.appendChild(card);
        });
      } else {
        list.innerHTML = '<p style="text-align:center; color:var(--text-muted); margin-top:50px;">История пуста. Сделайте первое фото!</p>';
      }
    } catch (err) {
      console.error('History load fail:', err);
      list.innerHTML = '<p style="text-align:center; color:var(--text-danger);">Не удалось загрузить историю.</p>';
    }
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
    ui.previewImg.src = 'https://images.unsplash.com/photo-1571175432291-fe49e757c327?auto=format&fit=crop&q=80&w=1000';
    ui.uploadZone.classList.remove('analyzing-pulse');
  }
});
