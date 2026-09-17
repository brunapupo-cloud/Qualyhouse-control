(() => {
  'use strict';

  function updateAuthView() {
    const auth = document.getElementById('qh-auth');
    const card = auth?.querySelector('.qh-auth-card');
    const form = document.getElementById('qh-login-form');
    const msg = document.getElementById('qh-auth-msg');
    if (!auth || !card || !form || !msg) return;

    let loading = document.getElementById('qh-loading-view');
    if (!loading) {
      loading = document.createElement('div');
      loading.id = 'qh-loading-view';
      loading.style.cssText = 'display:none;text-align:center;padding:18px 0 8px';
      loading.innerHTML = '<div style="font-size:16px;color:#6b7280">Carregando seus dados...</div>';
      card.appendChild(loading);
    }

    const text = (msg.textContent || '').trim();
    const isChecking = text === 'Verificando acesso...' || text === 'Carregando seus dados...';

    Array.from(card.children).forEach(el => {
      if (el === loading) return;
      if (isChecking) {
        if (el.dataset.qhHidden !== '1') {
          el.dataset.qhDisplay = el.style.display || '';
          el.dataset.qhHidden = '1';
        }
        el.style.display = 'none';
      } else if (el.dataset.qhHidden === '1') {
        el.style.display = el.dataset.qhDisplay || '';
        delete el.dataset.qhDisplay;
        delete el.dataset.qhHidden;
      }
    });

    loading.style.display = isChecking ? 'block' : 'none';
  }

  const observer = new MutationObserver(updateAuthView);
  observer.observe(document.documentElement, { childList: true, subtree: true, characterData: true });
  updateAuthView();
})();
