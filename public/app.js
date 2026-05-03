/**
 * Ai-Chef Frontend Logic
 * Simplified and adapted for the new Figma design
 */

document.addEventListener('DOMContentLoaded', () => {
  const fileInput = document.getElementById('file-input');
  const uploadZone = document.getElementById('upload-zone');
  const previewImg = document.getElementById('preview-img');
  const uploadPreview = document.getElementById('upload-preview');
  const scannerOverlay = document.getElementById('scanner-overlay');
  
  const btnTrigger = document.getElementById('btn-analyze-trigger');
  const initialState = document.getElementById('initial-state');
  const resultsView = document.getElementById('results-view');
  
  const ingredientsList = document.getElementById('ingredients-list');
  const recipesGrid = document.getElementById('recipes-grid');
  
  const authModal = document.getElementById('auth-modal');
  const btnLogin = document.getElementById('btn-login-trigger');
  const btnCloseModal = document.getElementById('btn-close-modal');

  // --- Auth logic ---
  btnLogin?.addEventListener('click', () => authModal.hidden = false);
  btnCloseModal?.addEventListener('click', () => authModal.hidden = true);

  // --- Upload logic ---
  btnTrigger?.addEventListener('click', () => {
    if (resultsView.hidden) {
      fileInput.click();
    } else {
      // Reset state for new photo
      resultsView.hidden = true;
      initialState.hidden = false;
      uploadPreview.hidden = true;
      scannerOverlay.hidden = true;
      btnTrigger.innerHTML = '<i class="fa-solid fa-camera"></i> Сделать фото';
    }
  });

  fileInput?.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        previewImg.src = event.target.result;
        uploadPreview.hidden = false;
        startAnalysis(file);
      };
      reader.readAsDataURL(file);
    }
  });

  // --- Analysis ---
  async function startAnalysis(file) {
    initialState.hidden = true;
    scannerOverlay.hidden = false;
    
    // Simulate API call and analysis
    btnTrigger.disabled = true;
    btnTrigger.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Анализируем...';

    const formData = new FormData();
    formData.append('photo', file);

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        body: formData
      });

      const data = await response.json();
      renderResults(data);
    } catch (err) {
      console.error('Analysis failed', err);
      alert('Ошибка при анализе фото. Попробуй еще раз.');
      resetToInitial();
    }
  }

  function renderResults(data) {
    scannerOverlay.hidden = true;
    resultsView.hidden = false;
    btnTrigger.disabled = false;
    btnTrigger.innerHTML = '<i class="fa-solid fa-rotate-left"></i> Новое фото';
    
    // Render Ingredients
    ingredientsList.innerHTML = '';
    if (data.ingredients) {
      data.ingredients.forEach(item => {
        const chip = document.createElement('div');
        chip.className = 'chip';
        chip.innerHTML = `<span class="status-dot"></span> ${item}`;
        ingredientsList.appendChild(chip);
      });
    }

    // Render Recipes
    recipesGrid.innerHTML = '';
    if (data.recipes) {
      data.recipes.forEach(recipe => {
        const card = document.createElement('div');
        card.className = 'recipe-card';
        card.innerHTML = `
          <img src="https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80&w=500" class="recipe-img" />
          <div class="recipe-content">
            <h3 class="recipe-title">${recipe.name}</h3>
            <p class="recipe-meta">${recipe.time || '20 мин'} • ${recipe.difficulty || 'Легко'}</p>
          </div>
        `;
        recipesGrid.appendChild(card);
      });
    }
  }

  function resetToInitial() {
    initialState.hidden = false;
    resultsView.hidden = true;
    scannerOverlay.hidden = true;
    uploadPreview.hidden = true;
    btnTrigger.disabled = false;
    btnTrigger.innerHTML = '<i class="fa-solid fa-camera"></i> Сделать фото';
  }
});
