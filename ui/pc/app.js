const cvBtn = document.getElementById('cvBtn');
const siteBtn = document.getElementById('siteBtn');
const projBtn = document.getElementById('projBtn');
const closeBtn = document.getElementById('closeBtn');

// فتح CV (مسار robust)
cvBtn.addEventListener('click', () => {
  const cvUrl = new URL('../../assets/cv.pdf', window.location.href).toString();
  window.open(cvUrl, '_blank');
});

// فتح موقع
siteBtn.addEventListener('click', () => {
  window.open('https://ahmedjouhri.com', '_blank');
});

// مشاريع
projBtn.addEventListener('click', () => {
  alert('Añadiremos los proyectos próximamente.');
});

// زر الإغلاق: يخرج من PC mode مباشرة
closeBtn.addEventListener('click', () => {
  window.parent.postMessage({ type: 'EXIT_PC' }, '*');
});
