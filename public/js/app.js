// public/js/app.js - BrightPathHorizon CRM Frontend Logic

document.addEventListener('DOMContentLoaded', () => {

  // ─── Auto-dismiss Toast Notifications ─────────────────────────────────
  const toasts = document.querySelectorAll('.toast');
  toasts.forEach(toast => {
    // Dismiss on click
    toast.addEventListener('click', () => {
      toast.style.animation = 'slideOut 0.3s ease forwards';
      setTimeout(() => toast.remove(), 300);
    });

    // Auto-dismiss after 4s
    setTimeout(() => {
      if (toast.isConnected) {
        toast.style.animation = 'slideOut 0.3s ease forwards';
        setTimeout(() => toast.remove(), 300);
      }
    }, 4000);
  });

  // ─── Mobile Sidebar Toggle ─────────────────────────────────────────────
  const sidebar = document.getElementById('sidebar');
  const toggleBtn = document.getElementById('sidebarToggle');
  const overlay = document.getElementById('sidebarOverlay');

  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      sidebar?.classList.toggle('open');
      overlay?.classList.toggle('active');
    });
  }

  if (overlay) {
    overlay.addEventListener('click', () => {
      sidebar?.classList.remove('open');
      overlay.classList.remove('active');
    });
  }

  // ─── Confirm Delete Actions ────────────────────────────────────────────
  document.querySelectorAll('[data-confirm]').forEach(el => {
    el.addEventListener('click', e => {
      const msg = el.dataset.confirm || 'Are you sure you want to delete this?';
      if (!confirm(msg)) {
        e.preventDefault();
        return false;
      }
    });
  });

  // ─── Auto-submit Filter Forms ──────────────────────────────────────────
  document.querySelectorAll('.auto-submit select').forEach(select => {
    select.addEventListener('change', () => {
      select.closest('form').submit();
    });
  });

  // ─── Set min date for follow-up to today ──────────────────────────────
  const followUpInput = document.getElementById('follow_up_date');
  if (followUpInput) {
    const today = new Date().toISOString().split('T')[0];
    followUpInput.setAttribute('min', today);
  }

  // ─── Search debounce ───────────────────────────────────────────────────
  const searchInput = document.querySelector('input[name="search"]');
  if (searchInput) {
    let searchTimeout;
    searchInput.addEventListener('input', () => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        searchInput.closest('form').submit();
      }, 500);
    });
  }

  // ─── Toast Helper (for inline use) ────────────────────────────────────
  window.showToast = (message, type = 'success') => {
    const container = document.querySelector('.toast-container') || (() => {
      const c = document.createElement('div');
      c.className = 'toast-container';
      document.body.appendChild(c);
      return c;
    })();

    const icons = { success: '✓', error: '✕', warning: '⚠' };
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `<span>${icons[type] || '●'}</span><span>${message}</span>`;
    container.appendChild(toast);

    toast.addEventListener('click', () => toast.remove());
    setTimeout(() => toast.remove(), 4000);
  };

});

// Add CSS for slide out
const style = document.createElement('style');
style.textContent = `
  @keyframes slideOut {
    from { opacity: 1; transform: translateX(0); }
    to { opacity: 0; transform: translateX(100%); }
  }
  #sidebarOverlay {
    display: none;
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.5);
    z-index: 99;
  }
  #sidebarOverlay.active { display: block; }
`;
document.head.appendChild(style);
