(() => {
  'use strict';

  const SUPABASE_URL = 'https://rkjoojknzstuekvtwyvd.supabase.co';
  const SUPABASE_PUBLISHABLE_KEY = 'sb_' + 'publishable_' + 'ox6yl9PKR7jt' + '-j-HMu3U1g_' + 'ssa6Siwt';
  const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

  let authUser = null;
  let propertyRowsByCode = {};

  const appEl = document.querySelector('.app');
  if (appEl) appEl.classList.add('hide');

  injectAuthUI();
  configureSettings();

  function injectAuthUI() {
    const style = document.createElement('style');
    style.textContent = `
      .qh-auth{position:fixed;inset:0;z-index:1000;background:#f5f6f8;display:flex;align-items:center;justify-content:center;padding:22px}
      .qh-auth.hide{display:none!important}
      .qh-auth-card{width:min(420px,100%);background:#fff;border:1px solid #e5e7eb;border-radius:22px;padding:24px;box-shadow:0 16px 50px rgba(17,24,39,.10)}
      .qh-auth-brand{font-weight:900;letter-spacing:.04em;font-size:20px;margin-bottom:6px}
      .qh-auth-title{font-size:26px;font-weight:800;margin:18px 0 6px}
      .qh-auth-msg{min-height:20px;margin-top:10px;font-size:13px;color:#6b7280}
      .qh-auth-msg.error{color:#b91c1c}
      .qh-auth .field{margin-bottom:12px}
      .qh-auth .field label{display:block;font-size:12px;font-weight:700;color:#4b5563;margin-bottom:6px}
      .qh-auth .field input{width:100%;padding:13px;border-radius:12px;border:1px solid #e5e7eb;background:#fff}
      .qh-auth .btn{width:100%;border:0;border-radius:12px;padding:13px 14px;background:#111827;color:#fff;font-weight:800}
    `;
    document.head.appendChild(style);

    const auth = document.createElement('div');
    auth.id = 'qh-auth';
    auth.className = 'qh-auth';
    auth.innerHTML = `
      <div class="qh-auth-card">
        <div class="qh-auth-brand">QUALYHOUSE CONTROL</div>
        <div class="muted">Acesso protegido</div>
        <div class="qh-auth-title">Entrar</div>
        <div class="muted" style="margin-bottom:18px">Use o e-mail e a senha cadastrados no Qualyhouse.</div>
        <form id="qh-login-form">
          <div class="field"><label>E-mail</label><input id="qh-email" type="email" autocomplete="username" required></div>
          <div class="field"><label>Senha</label><input id="qh-password" type="password" autocomplete="current-password" required></div>
          <button id="qh-login-btn" class="btn" type="submit">Entrar</button>
          <div id="qh-auth-msg" class="qh-auth-msg"></div>
        </form>
      </div>`;
    document.body.appendChild(auth);

    document.getElementById('qh-login-form').addEventListener('submit', signIn);
  }

  function configureSettings() {
    const card = document.querySelector('#screen-settings .card');
    if (!card) return;
    card.innerHTML = `
      <h3>Dados na nuvem</h3>
      <p class="muted">Seus dados são sincronizados com o Supabase e protegidos pelo seu login.</p>
      <div class="muted" id="qh-account-email" style="margin-bottom:14px"></div>
      <div class="row">
        <button class="btn secondary" onclick="exportData()">Fazer backup</button>
        <button class="btn secondary" onclick="signOutQualyhouse()">Sair da conta</button>
      </div>`;
  }

  function setAuthMessage(message, isError = false) {
    const el = document.getElementById('qh-auth-msg');
    if (!el) return;
    el.textContent = message || '';
    el.className = 'qh-auth-msg' + (isError ? ' error' : '');
  }

  function showLogin(message = '') {
    if (appEl) appEl.classList.add('hide');
    document.getElementById('qh-auth')?.classList.remove('hide');
    setAuthMessage(message);
  }

  function showApp() {
    document.getElementById('qh-auth')?.classList.add('hide');
    if (appEl) appEl.classList.remove('hide');
    const email = document.getElementById('qh-account-email');
    if (email) email.textContent = authUser?.email ? `Conta: ${authUser.email}` : '';
  }

  async function signIn(event) {
    event.preventDefault();
    const email = document.getElementById('qh-email').value.trim();
    const password = document.getElementById('qh-password').value;
    const btn = document.getElementById('qh-login-btn');
    btn.disabled = true;
    btn.textContent = 'Entrando...';
    setAuthMessage('');

    const { data, error } = await sb.auth.signInWithPassword({ email, password });
    if (error || !data.user) {
      setAuthMessage('E-mail ou senha inválidos. Confira os dados e tente novamente.', true);
      btn.disabled = false;
      btn.textContent = 'Entrar';
      return;
    }

    authUser = data.user;
    setAuthMessage('Carregando seus dados...');
    try {
      await loadCloudData();
      showApp();
      showScreen('home');
    } catch (err) {
      console.error(err);
      await sb.auth.signOut();
      authUser = null;
      setAuthMessage('Não foi possível carregar os dados da nuvem. Tente novamente.', true);
    } finally {
      btn.disabled = false;
      btn.textContent = 'Entrar';
    }
  }

  window.signOutQualyhouse = async function () {
    await sb.auth.signOut();
    authUser = null;
    showLogin('Você saiu da conta com segurança.');
  };

  async function initAuth() {
    showLogin('Verificando acesso...');
    const { data: sessionData } = await sb.auth.getSession();
    if (!sessionData.session) {
      showLogin('');
      return;
    }

    const { data, error } = await sb.auth.getUser();
    if (error || !data.user) {
      await sb.auth.signOut();
      showLogin('');
      return;
    }

    authUser = data.user;
    setAuthMessage('Carregando seus dados...');
    try {
      await loadCloudData();
      showApp();
      showScreen('home');
    } catch (err) {
      console.error(err);
      showLogin('Não foi possível carregar os dados da nuvem. Verifique sua internet e tente novamente.');
    }
  }

  async function loadCloudData() {
    if (!authUser) throw new Error('Usuário não autenticado');

    const owner = authUser.id;
    const [propertiesRes, unitsRes, avulsosRes, paymentsRes, expensesRes] = await Promise.all([
      sb.from('properties').select('*').eq('owner_id', owner),
      sb.from('units').select('*').eq('owner_id', owner),
      sb.from('avulsos').select('*').eq('owner_id', owner),
      sb.from('payments').select('*').eq('owner_id', owner),
      sb.from('expenses').select('*').eq('owner_id', owner)
    ]);

    for (const res of [propertiesRes, unitsRes, avulsosRes, paymentsRes, expensesRes]) {
      if (res.error) throw res.error;
    }

    const fresh = clone(defaults);
    fresh.avulsos = [];
    fresh.expenses = [];

    propertyRowsByCode = {};
    const propertyById = {};
    (propertiesRes.data || []).forEach(p => {
      propertyRowsByCode[p.code] = p;
      propertyById[p.id] = p;
      if (p.code === 'villa') {
        fresh.properties.villa = {
          ...fresh.properties.villa,
          _id: p.id,
          energyUC: p.energy_uc || '',
          waterUC: p.water_uc || '',
          investmentOriginal: p.investment_original == null ? 800000 : Number(p.investment_original),
          currentValue: p.current_value == null ? 1500000 : Number(p.current_value)
        };
      } else if (p.code === 'girassol') {
        fresh.properties.girassol = {
          ...fresh.properties.girassol,
          _id: p.id,
          waterHydrometer: p.water_hydrometer || '',
          investmentOriginal: p.investment_original == null ? 205000 : Number(p.investment_original),
          currentValue: p.current_value == null ? 400000 : Number(p.current_value)
        };
      } else if (p.code === 'oca') {
        fresh.properties.oca = {
          ...fresh.properties.oca,
          _id: p.id,
          investmentOriginal: p.investment_original == null ? null : Number(p.investment_original),
          currentValue: p.current_value == null ? null : Number(p.current_value)
        };
      }
    });

    const unitById = {};
    (unitsRes.data || []).forEach(row => {
      const prop = propertyById[row.property_id];
      if (!prop) return;
      const key = `${prop.code}-${row.unit_number}`;
      const base = fresh.units[key] || {
        property: prop.name,
        unit: row.unit_number,
        type: 'Apartamento', bedrooms: '', status: 'livre', tenant: '', phone: '', email: '', rent: '', dueDay: '', entryDate: '', exitDate: '', contractStatus: '', notes: '', energyUC: '', payments: [], maintenance: []
      };
      fresh.units[key] = {
        ...base,
        _id: row.id,
        _propertyId: row.property_id,
        property: prop.name,
        unit: row.unit_number,
        type: row.type || base.type || 'Apartamento',
        bedrooms: row.bedrooms == null ? (base.bedrooms || '') : row.bedrooms,
        status: row.status || 'livre',
        tenant: row.tenant_name || '',
        phone: row.phone || '',
        email: row.email || '',
        rent: row.monthly_rent == null ? '' : String(row.monthly_rent),
        dueDay: row.due_day == null ? '' : String(row.due_day),
        entryDate: row.entry_date || '',
        exitDate: row.exit_date || '',
        contractStatus: row.contract_status || '',
        notes: row.notes || '',
        energyUC: row.energy_uc || '',
        payments: [],
        maintenance: base.maintenance || []
      };
      unitById[row.id] = fresh.units[key];
    });

    const avulsoById = {};
    fresh.avulsos = (avulsosRes.data || []).map(row => {
      const a = {
        id: row.id,
        _id: row.id,
        name: row.name || '',
        type: row.type || row.description || 'Outro',
        description: row.description || '',
        rent: row.monthly_rent == null ? '' : String(row.monthly_rent),
        dueDay: row.due_day == null ? '' : String(row.due_day),
        status: row.status || 'livre',
        tenant: row.tenant_name || '',
        phone: row.phone || '',
        notes: row.notes || '',
        payments: []
      };
      avulsoById[row.id] = a;
      return a;
    });

    (paymentsRes.data || []).forEach(row => {
      const p = {
        _id: row.id,
        competence: row.competence || '',
        date: row.payment_date || '',
        value: row.amount == null ? 0 : Number(row.amount),
        method: row.method || '',
        note: row.notes || ''
      };
      if (row.unit_id && unitById[row.unit_id]) unitById[row.unit_id].payments.push(p);
      if (row.avulso_id && avulsoById[row.avulso_id]) avulsoById[row.avulso_id].payments.push(p);
    });

    fresh.expenses = (expensesRes.data || []).map(row => ({
      _id: row.id,
      property: row.property_id && propertyById[row.property_id] ? propertyById[row.property_id].name : 'Locações Avulsas',
      category: row.category || 'Outros',
      description: row.description || '',
      value: row.amount == null ? 0 : Number(row.amount),
      date: row.expense_date || '',
      notes: row.notes || '',
      _propertyId: row.property_id || null,
      _unitId: row.unit_id || null
    }));

    db = fresh;
    localStorage.setItem(STORE, JSON.stringify(db));
    refreshAll();
  }

  function propertyIdFromName(name) {
    if (name === 'Villa Park') return propertyRowsByCode.villa?.id || null;
    if (name === 'Residencial Girassol') return propertyRowsByCode.girassol?.id || null;
    if (name === 'Oca Urbana') return propertyRowsByCode.oca?.id || null;
    return null;
  }

  saveUnit = async function () {
    if (!currentUnitKey || !authUser) return false;
    const u = db.units[currentUnitKey];
    if (!u?._id) {
      alert('Unidade não encontrada na nuvem.');
      return false;
    }

    u.status = document.getElementById('u-status').value;
    u.tenant = document.getElementById('u-tenant').value.trim();
    u.phone = document.getElementById('u-phone').value.trim();
    u.email = document.getElementById('u-email').value.trim();
    u.rent = document.getElementById('u-rent').value.replace(',', '.');
    u.dueDay = document.getElementById('u-due').value.trim();
    u.entryDate = document.getElementById('u-entry').value;
    u.exitDate = document.getElementById('u-exit').value;
    u.contractStatus = document.getElementById('u-contract').value.trim();
    const en = document.getElementById('u-energy'); if (en) u.energyUC = en.value.trim();
    u.notes = document.getElementById('u-notes').value;

    const { error } = await sb.from('units').update({
      type: u.type || 'Apartamento',
      bedrooms: u.bedrooms === '' ? null : Number(u.bedrooms),
      status: u.status,
      tenant_name: u.tenant || null,
      phone: u.phone || null,
      email: u.email || null,
      monthly_rent: u.rent === '' ? null : Number(u.rent),
      due_day: u.dueDay === '' ? null : Number(u.dueDay),
      entry_date: u.entryDate || null,
      exit_date: u.exitDate || null,
      contract_status: u.contractStatus || null,
      energy_uc: u.energyUC || null,
      notes: u.notes || null,
      updated_at: new Date().toISOString()
    }).eq('id', u._id).eq('owner_id', authUser.id);

    if (error) {
      console.error(error);
      alert('Não foi possível salvar na nuvem. Tente novamente.');
      return false;
    }

    save();
    if (currentUnitKey.startsWith('villa')) setFloor(currentFloor);
    toast('Alterações salvas na nuvem');
    return true;
  };

  savePayment = async function () {
    if (!authUser) return;
    const u = db.units[currentUnitKey];
    if (!u?._id) return alert('Unidade não encontrada na nuvem.');

    const payload = {
      owner_id: authUser.id,
      property_id: u._propertyId || null,
      unit_id: u._id,
      avulso_id: null,
      competence: document.getElementById('p-comp').value || null,
      payment_date: document.getElementById('p-date').value,
      method: document.getElementById('p-method').value || null,
      amount: Number((document.getElementById('p-value').value || '0').replace(',', '.')),
      notes: document.getElementById('p-note').value.trim() || null
    };

    const { data, error } = await sb.from('payments').insert(payload).select().single();
    if (error) {
      console.error(error);
      return alert('Não foi possível salvar o pagamento na nuvem.');
    }

    u.payments = u.payments || [];
    u.payments.push({
      _id: data.id,
      competence: data.competence || '',
      date: data.payment_date || '',
      value: Number(data.amount || 0),
      method: data.method || '',
      note: data.notes || ''
    });
    save();
    document.getElementById('payment-dialog').close();
    openUnit(currentUnitKey);
    toast('Pagamento salvo na nuvem');
  };

  saveExpense = async function () {
    if (!authUser) return;
    const description = document.getElementById('exp-description').value.trim();
    const value = Number((document.getElementById('exp-value').value || '0').replace(',', '.'));
    if (!description || !value) {
      alert('Preencha a descrição e o valor da despesa.');
      return;
    }

    const propertyName = document.getElementById('exp-property').value;
    const payload = {
      owner_id: authUser.id,
      property_id: propertyIdFromName(propertyName),
      unit_id: null,
      category: document.getElementById('exp-category').value || null,
      description,
      expense_date: document.getElementById('exp-date').value,
      amount: value,
      notes: document.getElementById('exp-notes').value || null
    };

    const { data, error } = await sb.from('expenses').insert(payload).select().single();
    if (error) {
      console.error(error);
      return alert('Não foi possível salvar a despesa na nuvem.');
    }

    db.expenses = db.expenses || [];
    db.expenses.push({
      _id: data.id,
      property: propertyName,
      category: data.category || 'Outros',
      description: data.description || '',
      value: Number(data.amount || 0),
      date: data.expense_date || '',
      notes: data.notes || '',
      _propertyId: data.property_id || null,
      _unitId: data.unit_id || null
    });
    save();
    document.getElementById('expense-dialog').close();
    toast('Despesa salva na nuvem');
  };

  saveVillaInfo = async function () {
    if (!authUser || !propertyRowsByCode.villa) return;
    const energyUC = document.getElementById('villa-energy').value.trim();
    const waterUC = document.getElementById('villa-water').value.trim();
    const { error } = await sb.from('properties').update({
      energy_uc: energyUC || null,
      water_uc: waterUC || null,
      updated_at: new Date().toISOString()
    }).eq('id', propertyRowsByCode.villa.id).eq('owner_id', authUser.id);
    if (error) return alert('Não foi possível salvar as informações na nuvem.');
    db.properties.villa.energyUC = energyUC;
    db.properties.villa.waterUC = waterUC;
    save();
    toast('Informações salvas na nuvem');
  };

  saveGirassolInfo = async function () {
    if (!authUser || !propertyRowsByCode.girassol) return;
    const waterHydrometer = document.getElementById('gir-water').value.trim();
    const { error } = await sb.from('properties').update({
      water_hydrometer: waterHydrometer || null,
      updated_at: new Date().toISOString()
    }).eq('id', propertyRowsByCode.girassol.id).eq('owner_id', authUser.id);
    if (error) return alert('Não foi possível salvar o hidrômetro na nuvem.');
    db.properties.girassol.waterHydrometer = waterHydrometer;
    save();
    toast('Hidrômetro salvo na nuvem');
  };

  newAvulso = async function () {
    if (!authUser) return;
    const name = prompt('Identificação do imóvel (ex.: Casa Centro):');
    if (name === null) return;
    const type = prompt('Tipo (Casa, Chácara, Apartamento, Sala, Kitnet ou Outro):', 'Casa') || 'Outro';

    const { data, error } = await sb.from('avulsos').insert({
      owner_id: authUser.id,
      name: name.trim(),
      type: type.trim(),
      description: null,
      monthly_rent: null,
      due_day: null,
      status: 'livre',
      tenant_name: null,
      phone: null,
      notes: null
    }).select().single();

    if (error) {
      console.error(error);
      return alert('Não foi possível criar a locação na nuvem.');
    }

    db.avulsos.push({
      id: data.id, _id: data.id, name: data.name || '', type: data.type || 'Outro', rent: '', dueDay: '', status: data.status || 'livre', tenant: '', phone: '', notes: '', payments: []
    });
    save();
    renderAvulsos();
    editAvulso(db.avulsos.length - 1);
  };

  saveAvulso = async function (i) {
    if (!authUser) return;
    const a = db.avulsos[i];
    if (!a?._id) return alert('Locação não encontrada na nuvem.');

    a.type = document.getElementById('a-type').value.trim();
    a.name = document.getElementById('a-name').value.trim();
    a.status = document.getElementById('a-status').value;
    a.rent = document.getElementById('a-rent').value.replace(',', '.');
    a.dueDay = document.getElementById('a-due').value.trim();
    a.tenant = document.getElementById('a-tenant').value.trim();
    a.phone = document.getElementById('a-phone').value.trim();
    a.notes = document.getElementById('a-notes').value;

    const { error } = await sb.from('avulsos').update({
      name: a.name,
      type: a.type || null,
      monthly_rent: a.rent === '' ? null : Number(a.rent),
      due_day: a.dueDay === '' ? null : Number(a.dueDay),
      status: a.status,
      tenant_name: a.tenant || null,
      phone: a.phone || null,
      notes: a.notes || null,
      updated_at: new Date().toISOString()
    }).eq('id', a._id).eq('owner_id', authUser.id);

    if (error) {
      console.error(error);
      return alert('Não foi possível salvar a locação na nuvem.');
    }

    save();
    document.getElementById('unit-dialog').close();
    renderAvulsos();
    toast('Locação salva na nuvem');
  };

  importData = function () {
    alert('A restauração de backup será habilitada em uma próxima etapa para evitar sobrescrever dados da nuvem por engano.');
  };

  sb.auth.onAuthStateChange((event) => {
    if (event === 'SIGNED_OUT') {
      authUser = null;
      showLogin('');
    }
  });

  initAuth();
})();
