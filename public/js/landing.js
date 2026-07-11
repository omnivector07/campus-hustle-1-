document.addEventListener('DOMContentLoaded', async () => {
  // Mobile nav toggle
  const toggle = document.querySelector('.nav-toggle');
  const links = document.querySelector('.nav-links');
  if (toggle && links) {
    toggle.addEventListener('click', () => {
      const isOpen = links.style.display === 'flex';
      links.style.cssText = isOpen
        ? ''
        : 'display:flex; position:absolute; top:72px; left:0; right:0; background:#081426; flex-direction:column; padding:20px 24px; gap:18px;';
    });
  }

  // Populate categories dynamically (falls back to static markup already in HTML on failure)
  const grid = document.getElementById('landing-categories');
  if (grid) {
    try {
      const categories = await Api.listCategories();
      if (categories.length > 0) {
        grid.innerHTML = categories
          .map(
            (c) =>
              `<a href="/signup.html?role=worker" class="category-chip">${escapeHtml(c.name)}</a>`
          )
          .join('');
      }
    } catch {
      // Keep static fallback categories already rendered in the HTML.
    }
  }
});
