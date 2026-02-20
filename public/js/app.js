// public/js/app.js — BrightPathHorizon CRM v2

document.addEventListener('DOMContentLoaded', () => {

  // ── Dark Mode ───────────────────────────────────────────────────
  const saved = localStorage.getItem('crm-theme') || 'light';
  applyTheme(saved);

  const themeToggle = document.getElementById('themeToggle');
  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-theme') || 'light';
      applyTheme(current === 'light' ? 'dark' : 'light');
    });
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('crm-theme', theme);
    const iconLight = document.getElementById('themeIconLight');
    const iconDark  = document.getElementById('themeIconDark');
    if (iconLight) iconLight.style.display = theme === 'dark'  ? ''     : 'none';
    if (iconDark)  iconDark.style.display  = theme === 'light' ? ''     : 'none';
    // Sync settings page if present
    const tl = document.getElementById('themeLight');
    const td = document.getElementById('themeDark');
    if (tl) tl.classList.toggle('selected', theme === 'light');
    if (td) td.classList.toggle('selected', theme === 'dark');
  }

  // Expose for settings page
  window.setTheme = applyTheme;

  // ── Toast Dismiss ────────────────────────────────────────────────
  document.querySelectorAll('.toast').forEach(toast => {
    toast.addEventListener('click', () => dismissToast(toast));
    setTimeout(() => toast.isConnected && dismissToast(toast), 4500);
  });

  function dismissToast(t) {
    t.style.transition = 'opacity .3s,transform .3s';
    t.style.opacity = '0';
    t.style.transform = 'translateX(100%)';
    setTimeout(() => t.remove(), 300);
  }

  window.showToast = (msg, type = 'success') => {
    let c = document.querySelector('.toast-container');
    if (!c) { c = document.createElement('div'); c.className = 'toast-container'; document.body.appendChild(c); }
    const t = document.createElement('div');
    t.className = `toast toast-${type}`;
    t.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="15" height="15"><polyline points="20 6 9 17 4 12"/></svg><span>${msg}</span>`;
    c.appendChild(t);
    t.addEventListener('click', () => dismissToast(t));
    setTimeout(() => dismissToast(t), 4500);
  };

  // ── Mobile Sidebar ───────────────────────────────────────────────
  const sidebar   = document.getElementById('sidebar');
  const toggleBtn = document.getElementById('sidebarToggle');
  const overlay   = document.getElementById('sidebarOverlay');

  function openSidebar()  { sidebar?.classList.add('open');    overlay?.classList.add('active');    document.body.style.overflow='hidden'; }
  function closeSidebar() { sidebar?.classList.remove('open'); overlay?.classList.remove('active'); document.body.style.overflow=''; }

  toggleBtn?.addEventListener('click', () => sidebar?.classList.contains('open') ? closeSidebar() : openSidebar());
  overlay?.addEventListener('click', closeSidebar);

  // ── Submenu Toggle (smooth, with delay so hover-expand works) ────
  document.querySelectorAll('[data-toggle]').forEach(trigger => {
    trigger.addEventListener('click', (e) => {
      const navItem = trigger.closest('.has-sub');
      if (!navItem) return;
      const isOpen = navItem.classList.contains('sub-open');
      // Close all
      document.querySelectorAll('.has-sub.sub-open').forEach(i => i.classList.remove('sub-open'));
      if (!isOpen) navItem.classList.add('sub-open');
    });
  });

  // Keep submenu open if a child link is active
  const activeSubLink = document.querySelector('.nav-sub-link.active');
  if (activeSubLink) {
    activeSubLink.closest('.has-sub')?.classList.add('sub-open');
  }

  // ── Confirm on delete ────────────────────────────────────────────
  document.querySelectorAll('[data-confirm]').forEach(el => {
    el.addEventListener('click', e => { if (!confirm(el.dataset.confirm || 'Are you sure?')) e.preventDefault(); });
  });

  // ── Auto-submit filter selects ───────────────────────────────────
  document.querySelectorAll('.auto-submit select').forEach(s => {
    s.addEventListener('change', () => s.closest('form').submit());
  });

  // ── Search debounce ──────────────────────────────────────────────
  const searchInput = document.querySelector('input[name="search"]');
  if (searchInput) {
    let tmr;
    searchInput.addEventListener('input', () => {
      clearTimeout(tmr);
      tmr = setTimeout(() => searchInput.closest('form').submit(), 480);
    });
  }

  // ── Follow-up date min ───────────────────────────────────────────
  const fuDate = document.getElementById('follow_up_date');
  if (fuDate && !fuDate.value) fuDate.setAttribute('min', new Date().toISOString().split('T')[0]);

});

// ── Sidebar overlay CSS ─────────────────────────────────────────────
const _s = document.createElement('style');
_s.textContent = `
  #sidebarOverlay{display:none;position:fixed;inset:0;background:rgba(0,0,0,0.45);z-index:199;backdrop-filter:blur(1px)}
  #sidebarOverlay.active{display:block}
`;
document.head.appendChild(_s);