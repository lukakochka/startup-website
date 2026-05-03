import fetch from 'node-fetch';
import FormData from 'form-data';
import fs from 'fs';

async function testAnalysis() {
  console.log('--- DIAGNOSTIC START ---');
  const photoPath = 'd:/стартап/uploads/fridge-1777766610865-dznpkun.jpg';
  
  const form = new FormData();
  form.append('photo', fs.createReadStream(photoPath));
  form.append('vibe', 'Обычный ужин');
  form.append('allergens', '[]');
  form.append('dislikes', '[]');

  try {
    const response = await fetch('http://localhost:3000/api/analyze', {
      method: 'POST',
      body: form
    });

    const data = await response.json();
    console.log('STAUTS:', response.status);
    console.log('AI RESPONSE:', JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('TEST FAILED:', err.message);
  }
}

testAnalysis();
