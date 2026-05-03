/**
 * Ai-Chef Production Logic (v2.0)
 * Fixed Navigation, Persistent Scanner, and Proper View Switching
 */

document.addEventListener('DOMContentLoaded', () => {
  // Elements Selection
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
    btnOpenSettings: document.getElementById('btn-open-settings'),
    btnCloseSettings: document.getElementById('btn-close-settings'),
    btnSaveSettings: document.getElementById('btn-save-settings'),
    
    modalSettings: document.getElementById('modal-settings'),
    
    ingredientsList: document.getElementById('ingredients-list'),
    recipesGrid: document.getElementById('recipes-grid')
  };

  // --- 1. SPA Navigation ---
  ui.navItems.forEach(item => {
    item.addEventListener('click', () => {
      const targetView = item.getAttribute('data-view');
      
      // Update Nav UI
      ui.navItems.forEach(nav => nav.classList.remove('active'));
      item.classList.add('active');
      
      // Update Views
      ui.views.forEach(view => {
        view.classList.remove('active');
        if (view.id === `view-${targetView}`) {
          view.classList.add('active');
        }
      });
    });
  });

  // --- 2. Settings Modal ---
  ui.btnOpenSettings?.addEventListener('click', () => ui.modalSettings.hidden = false);
  ui.btnCloseSettings?.addEventListener('click', () => ui.modalSettings.hidden = true);
  ui.btnSaveSettings?.addEventListener('click', () => {
    alert('Настройки сохранены!');
    ui.modalSettings.hidden = true;
  });

  // --- 3. Analysis Logic ---
  
  // Trigger file selection
  ui.uploadZone?.addEventListener('click', () => ui.fileInput.click());
  ui.btnMain?.addEventListener('click', () => ui.fileInput.click());

  ui.fileInput?.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        // Show photo clearly
        ui.previewImg.src = event.target.result;
        ui.previewImg.style.opacity = '1';
        
        // Start Analysis
        startAIAnalysis(file);
      };
      reader.readAsDataURL(file);
    }
  });

  async function startAIAnalysis(file) {
    // UI State: Analysis started
    ui.scannerOverlay.hidden = false; // Scanner starts loop
    ui.panelInitial.hidden = true;
    ui.panelResults.hidden = true;
    ui.btnMain.disabled = true;
    ui.btnMain.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Шеф анализирует...';

    const formData = new FormData();
    formData.append('photo', file);

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) throw new Error('API Error');
      
      const data = await response.json();
      renderRecipes(data);
    } catch (err) {
      console.error('Analysis failed:', err);
      alert('Ошибка при связи с ИИ. Проверьте GITHUB_TOKEN на Render.');
      resetApp();
    }
  }

  function renderRecipes(data) {
    // UI State: Success
    ui.scannerOverlay.hidden = true; // Stop scanner only now!
    ui.panelResults.hidden = false;
    ui.btnMain.disabled = false;

    // Ingredients
    ui.ingredientsList.innerHTML = '';
    (data.ingredients || []).forEach(ing => {
      const chip = document.createElement('div');
      chip.className = 'chip';
      chip.innerHTML = `<span class="status-dot"></span> ${ing}`;
      ui.ingredientsList.appendChild(chip);
    });

    // Recipes
    ui.recipesGrid.innerHTML = '';
    const recipes = data.recipes || [];
    if (recipes.length === 0) {
      ui.recipesGrid.innerHTML = '<p style="text-align:center; color:var(--text-muted); padding:20px;">Рецепты не найдены. Попробуйте другое фото.</p>';
    }

    recipes.forEach(recipe => {
      const card = document.createElement('div');
      card.className = 'recipe-card';
      const foodImg = 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&q=80&w=500';
      
      card.innerHTML = `
        <img src="${foodImg}" class="recipe-img" />
        <div class="recipe-content">
          <h3 class="recipe-title">${recipe.name}</h3>
          <p class="recipe-meta"><i class="fa-regular fa-clock"></i> ${recipe.time || '25 мин'} • ${recipe.difficulty || 'Средне'}</p>
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
    ui.btnMain.innerHTML = '<i class="fa-solid fa-camera"></i> Загрузить фото';
    ui.fileInput.value = '';
    ui.previewImg.src = 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&q=80&w=1000';
  }
});
