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

  // Settings
  ui.btnOpenSettings?.addEventListener('click', () => ui.modalSettings.hidden = false);
  ui.btnCloseSettings?.addEventListener('click', () => ui.modalSettings.hidden = true);
  ui.btnSaveSettings?.addEventListener('click', () => {
    ui.modalSettings.hidden = true;
    // Show a mini-notification instead of alert
    console.log('Preferences saved locally');
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
    const recipes = data.recipes || [];
    if (recipes.length === 0) {
      ui.recipesGrid.innerHTML = '<p style="text-align:center; padding:20px; color:var(--text-muted);">ИИ не нашел подходящих рецептов. Попробуйте другой вайб!</p>';
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
