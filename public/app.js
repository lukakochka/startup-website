/**
 * Ai-Chef Full App Logic
 * Handlers for Navigation, Scanning, AI Analysis, and UI rendering
 */

document.addEventListener('DOMContentLoaded', () => {
  // Elements
  const elements = {
    fileInput: document.getElementById('file-input'),
    uploadZone: document.getElementById('upload-zone'),
    previewImg: document.getElementById('preview-img'),
    uploadPreview: document.getElementById('upload-preview'),
    scannerOverlay: document.getElementById('scanner-overlay'),
    btnTrigger: document.getElementById('btn-analyze-trigger'),
    initialState: document.getElementById('initial-state'),
    resultsView: document.getElementById('results-view'),
    ingredientsList: document.getElementById('ingredients-list'),
    recipesGrid: document.getElementById('recipes-grid'),
    authModal: document.getElementById('auth-modal'),
    btnLoginTrigger: document.getElementById('btn-login-trigger'),
    btnCloseModal: document.getElementById('btn-close-modal'),
    navItems: {
      home: document.getElementById('nav-home'),
      history: document.getElementById('nav-history'),
      profile: document.getElementById('nav-profile')
    }
  };

  // --- 1. Navigation Logic ---
  function setActiveNav(activeKey) {
    Object.keys(elements.navItems).forEach(key => {
      if (elements.navItems[key]) {
        elements.navItems[key].classList.toggle('active', key === activeKey);
      }
    });
    
    // In a real app, we'd switch views here
    if (activeKey === 'history') {
      alert('История ваших сканирований появится здесь после подключения БД');
    } else if (activeKey === 'profile') {
      elements.authModal.hidden = false;
    }
  }

  elements.navItems.home?.addEventListener('click', () => setActiveNav('home'));
  elements.navItems.history?.addEventListener('click', () => setActiveNav('history'));
  elements.navItems.profile?.addEventListener('click', () => setActiveNav('profile'));

  // --- 2. Auth Modal ---
  elements.btnLoginTrigger?.addEventListener('click', () => {
    elements.authModal.hidden = false;
  });

  elements.btnCloseModal?.addEventListener('click', () => {
    elements.authModal.hidden = true;
  });

  // --- 3. Scanning & Upload ---
  elements.btnTrigger?.addEventListener('click', () => {
    // If we already have results, the button acts as "Reset"
    if (!elements.resultsView.hidden) {
      resetUI();
      return;
    }
    elements.fileInput.click();
  });

  elements.fileInput?.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        elements.previewImg.src = event.target.result;
        elements.uploadPreview.hidden = false;
        elements.scannerOverlay.hidden = false; // Start scan animation
        handleImageAnalysis(file);
      };
      reader.readAsDataURL(file);
    }
  });

  async function handleImageAnalysis(file) {
    // UI Feedback
    elements.initialState.hidden = true;
    elements.btnTrigger.disabled = true;
    elements.btnTrigger.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Шеф думает...';

    const formData = new FormData();
    formData.append('photo', file);

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) throw new Error('Server error');
      
      const data = await response.json();
      console.log('AI Data received:', data);
      displayResults(data);
    } catch (err) {
      console.error('Analysis failed:', err);
      alert('Не удалось связаться с Шефом. Проверь интернет или токен.');
      resetUI();
    }
  }

  function displayResults(data) {
    // Stop animation and show results
    elements.scannerOverlay.hidden = true;
    elements.resultsView.hidden = false;
    elements.btnTrigger.disabled = false;
    elements.btnTrigger.innerHTML = '<i class="fa-solid fa-arrow-rotate-left"></i> Начать заново';

    // Clear previous
    elements.ingredientsList.innerHTML = '';
    elements.recipesGrid.innerHTML = '';

    // Render Ingredients (Chips)
    const ingredients = data.ingredients || [];
    ingredients.forEach(name => {
      const chip = document.createElement('div');
      chip.className = 'chip';
      chip.innerHTML = `<span class="status-dot"></span> ${name}`;
      elements.ingredientsList.appendChild(chip);
    });

    // Render Recipes
    const recipes = data.recipes || [];
    if (recipes.length === 0) {
      elements.recipesGrid.innerHTML = '<p style="color:var(--text-muted); text-align:center; width:100%; margin-top:20px;">Ингредиенты не найдены. Попробуйте другое фото.</p>';
    }

    recipes.forEach(recipe => {
      const card = document.createElement('div');
      card.className = 'recipe-card';
      // Use a random nice food image if none provided
      const img = 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&q=80&w=500';
      
      card.innerHTML = `
        <img src="${img}" class="recipe-img" />
        <div class="recipe-content">
          <h3 class="recipe-title">${recipe.name}</h3>
          <p class="recipe-meta">${recipe.time || '25 мин'} • ${recipe.difficulty || 'Средне'}</p>
          <p style="font-size: 0.8rem; color: var(--text-muted); margin-top: 8px;">${recipe.description || ''}</p>
        </div>
      `;
      elements.recipesGrid.appendChild(card);
    });
  }

  function resetUI() {
    elements.initialState.hidden = false;
    elements.resultsView.hidden = true;
    elements.scannerOverlay.hidden = true;
    elements.uploadPreview.hidden = true;
    elements.btnTrigger.disabled = false;
    elements.btnTrigger.innerHTML = '<i class="fa-solid fa-camera"></i> Сделать фото';
    elements.fileInput.value = '';
  }
});
