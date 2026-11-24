// Copyright (c) 2026 thezencirs (https://github.com/thezencirs) - MIT License
// Circle FIDIC — Micro-to-City FIDIC-Shell Project & Site Operating System

const APP = {
  lang: 'tr',
  tab: 'overview',
  horizon: 'month',
  state: null,
  fidicKb: null,
  info: null,
  weather: null,
  currentUser: null,
  currentProjectId: 'prj-tower',
  roleFilter: 'all',
  fidicSearch: '',
  fidicSubTab: 'philosophy',
  carouselIdx: 1,
  voiceProfile: { exists: false, url: '', updated: '' },
  isRecordingVoice: false,
  recSeconds: 0
};

let _mediaRecorder = null;
let _recChunks = [];
let _recTimer = null;
let _renderPollTimer = null;

async function refreshVoiceProfileStatus() {
  try {
    const r = await fetch('/api/voice-profile/status');
    APP.voiceProfile = await r.json();
    if (APP.voiceProfile.renderState === 'running' && !_renderPollTimer) {
      startVoiceRenderPolling();
    }
  } catch {}
}

function startVoiceRenderPolling() {
  if (_renderPollTimer) clearInterval(_renderPollTimer);
  _renderPollTimer = setInterval(async () => {
    await refreshVoiceProfileStatus();
    const st = APP.voiceProfile.renderState;
    const lbl = document.getElementById('lblVoiceRenderMsg');
    if (lbl && APP.voiceProfile.renderMessage) {
      lbl.textContent = APP.voiceProfile.renderMessage;
    }
    if (st !== 'running') {
      clearInterval(_renderPollTimer);
      _renderPollTimer = null;
      renderAll();
    }
  }, 2500);
}

async function triggerMyVoiceVideoRender() {
  const res = await fetch('/api/voice-profile/render', { method: 'POST' });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    alert(err.error || 'Ses klonlama başlatılamadı.');
    return;
  }
  await refreshVoiceProfileStatus();
  startVoiceRenderPolling();
  renderAll();
}

async function toggleMicVoiceRecording() {
  if (APP.isRecordingVoice && _mediaRecorder) {
    _mediaRecorder.stop();
    return;
  }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
    _recChunks = [];
    _mediaRecorder = new MediaRecorder(stream);
    _mediaRecorder.ondataavailable = e => { if (e.data && e.data.size > 0) _recChunks.push(e.data); };
    _mediaRecorder.onstop = async () => {
      clearInterval(_recTimer);
      APP.isRecordingVoice = false;
      stream.getTracks().forEach(t => t.stop());
      const blob = new Blob(_recChunks, { type: 'audio/webm' });
      const fd = new FormData();
      fd.append('file', blob, 'mic_recording.webm');
      await fetch('/api/voice-profile/upload', { method: 'POST', body: fd });
      await refreshVoiceProfileStatus();
      renderAll();
    };
    APP.isRecordingVoice = true;
    APP.recSeconds = 0;
    _mediaRecorder.start();
    renderAll();
    _recTimer = setInterval(() => {
      APP.recSeconds++;
      const el = document.getElementById('lblRecTimer');
      if (el) el.textContent = `${APP.recSeconds} sn kaydediliyor...`;
      if (APP.recSeconds >= 35 && _mediaRecorder && _mediaRecorder.state === 'recording') {
        _mediaRecorder.stop();
      }
    }, 1000);
  } catch (err) {
    alert('Mikrofon izni alınamadı veya mikrofon bulunamadı. İsterseniz yanındaki "Ses Dosyası Yükle" butonuyla telefon/bilgisayar ses kaydınızı seçebilirsiniz.');
  }
}

async function uploadVoiceFile(inputEl) {
  if (!inputEl.files || !inputEl.files[0]) return;
  const fd = new FormData();
  fd.append('file', inputEl.files[0]);
  await fetch('/api/voice-profile/upload', { method: 'POST', body: fd });
  await refreshVoiceProfileStatus();
  renderAll();
}

function t(key) {
  return (window.CF_I18N[APP.lang] && window.CF_I18N[APP.lang][key]) || key;
}

function trEn(trVal, enVal) {
  return APP.lang === 'en' ? (enVal || trVal) : trVal;
}

function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function fmtMoney(val, cur = '₺') {
  const n = Number(val || 0);
  if (Math.abs(n) >= 1_000_000_000) {
    return (n / 1_000_000_000).toLocaleString(APP.lang === 'tr' ? 'tr-TR' : 'en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + (APP.lang === 'tr' ? ' Mr ' : 'B ') + cur;
  }
  if (Math.abs(n) >= 1_000_000) {
    return (n / 1_000_000).toLocaleString(APP.lang === 'tr' ? 'tr-TR' : 'en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + ' M ' + cur;
  }
  return n.toLocaleString(APP.lang === 'tr' ? 'tr-TR' : 'en-US') + ' ' + cur;
}

function fmtNum(val) {
  return Number(val || 0).toLocaleString(APP.lang === 'tr' ? 'tr-TR' : 'en-US');
}

function getActiveProject() {
  if (!APP.state || !APP.state.projects.length) return null;
  return APP.state.projects.find(p => p.id === APP.currentProjectId) || APP.state.projects[0];
}

async function initApp() {
  const params = new URLSearchParams(window.location.search);
  if (params.get('lang') === 'en' || params.get('lang') === 'tr') APP.lang = params.get('lang');
  if (params.get('tab')) APP.tab = params.get('tab');
  if (params.get('mobile') === '1') document.body.classList.add('mobile-sim');

  const [infoRes, stateRes, kbRes] = await Promise.all([
    fetch('/api/info').then(r => r.json()).catch(() => ({ localUrl: window.location.origin, lanUrl: window.location.origin })),
    fetch('/api/state').then(r => r.json()),
    fetch('/data/fidic_kb.json').then(r => r.json()).catch(() => null)
  ]);

  APP.info = infoRes;
  APP.state = stateRes;
  APP.fidicKb = kbRes;
  APP.currentUser = APP.state.users[0];

  const reqRole = params.get('role');
  if (reqRole) {
    const found = APP.state.users.find(u => u.role === reqRole || u.id === reqRole);
    if (found) APP.currentUser = found;
  }

  document.getElementById('lblLanUrl').textContent = APP.info.lanUrl || APP.info.localUrl;

  document.getElementById('selProject').addEventListener('change', async (ev) => {
    APP.currentProjectId = ev.target.value;
    await loadWeatherForActiveProject();
    renderAll();
  });

  document.querySelectorAll('#timeHorizonBar .seg-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      APP.horizon = btn.getAttribute('data-horizon');
      document.querySelectorAll('#timeHorizonBar .seg-btn').forEach(b => b.classList.toggle('active', b === btn));
      if (APP.tab !== 'timeline') APP.tab = 'timeline';
      renderAll();
    });
  });

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  }

  await loadWeatherForActiveProject();
  await refreshVoiceProfileStatus();
  renderAll();
}

async function loadWeatherForActiveProject() {
  const prj = getActiveProject();
  if (!prj) return;
  try {
    const res = await fetch(`/api/weather?lat=${prj.lat || 41.0082}&lon=${prj.lon || 28.9784}`);
    APP.weather = await res.json();
  } catch {
    APP.weather = null;
  }
}

function setLanguage(lang) {
  APP.lang = lang;
  document.documentElement.lang = lang;
  document.getElementById('btnLangTr').classList.toggle('active', lang === 'tr');
  document.getElementById('btnLangEn').classList.toggle('active', lang === 'en');
  renderAll();
}

function toggleMobileSim() {
  document.body.classList.toggle('mobile-sim');
}

function toggleDarkMode() {
  document.body.classList.toggle('dark-mode');
}

function switchTab(tabId) {
  APP.tab = tabId;
  renderAll();
}

function switchRoleQuick(userId) {
  const u = APP.state.users.find(x => x.id === userId);
  if (u) {
    APP.currentUser = u;
    renderAll();
  }
}

function renderChrome() {
  const prj = getActiveProject();
  if (!prj) return;

  document.getElementById('lblAppSub').textContent = t('appSub');
  document.getElementById('navLblOverview').textContent = t('navOverview');
  document.getElementById('navLblTimeline').textContent = t('navTimeline');
  document.getElementById('navLblTasks').textContent = t('navTasks');
  document.getElementById('navLblMeals').textContent = t('navMeals');
  document.getElementById('navLblWeather').textContent = t('navWeather');
  document.getElementById('navLblFinance').textContent = t('navFinance');
  document.getElementById('navLblMedia').textContent = t('navMedia');
  document.getElementById('navLblSnags').textContent = t('navSnags');
  document.getElementById('navLblFidic').textContent = t('navFidic');

  document.getElementById('btnHzHour').textContent = trEn('Saat', 'Hour');
  document.getElementById('btnHzDay').textContent = trEn('Gün', 'Day');
  document.getElementById('btnHzWeek').textContent = trEn('Hafta', 'Week');
  document.getElementById('btnHzMonth').textContent = trEn('Ay', 'Month');
  document.getElementById('btnHzYear').textContent = trEn('Yıl', 'Year');
  document.getElementById('btnMobileSim').textContent = t('btnMobilePreview');
  document.getElementById('btnDarkToggle').textContent = trEn('Gece', 'Night');
  document.getElementById('btnNewProject').textContent = '+ ' + t('btnNewProject');

  const uTitle = trEn(APP.currentUser.titleTr, APP.currentUser.titleEn).split(' ')[0];
  document.getElementById('btnActiveUser').textContent = `${APP.currentUser.name} · ${uTitle}`;

  // Project Selector
  const sel = document.getElementById('selProject');
  sel.innerHTML = APP.state.projects.map(p =>
    `<option value="${esc(p.id)}" ${p.id === prj.id ? 'selected' : ''}>[${esc(trEn(p.scaleLabelTr, p.scaleLabelEn).split(' ')[0])}] ${esc(trEn(p.nameTr, p.nameEn))}</option>`
  ).join('');

  // FIDIC Shell Ribbon
  document.getElementById('lblFidicBookShell').textContent = trEn(prj.fidicBookTr, prj.fidicBookEn);
  const stages = [t('shellStage1'), t('shellStage2'), t('shellStage3'), t('shellStage4'), t('shellStage5'), t('shellStage6')];
  document.getElementById('shellStagesContainer').innerHTML = stages.map((st, idx) => {
    const stepNum = idx + 1;
    const cls = stepNum < prj.currentStage ? 'stage-chip done' : (stepNum === prj.currentStage ? 'stage-chip current' : 'stage-chip');
    return `<span class="${cls}" onclick="switchTab('fidic')">${esc(st)}</span>`;
  }).join('');

  // Quick Role Switcher
  const roleShort = {
    employer: trEn('Yatırımcı', 'Investor'),
    engineer: trEn('Yürütücü', 'Engineer'),
    architect: trEn('Mimar', 'Architect'),
    sitemanager: trEn('Şantiye Şefi', 'Site Mgr'),
    master: trEn('Usta (Saha)', 'Master')
  };
  document.getElementById('roleQuickBar').innerHTML = APP.state.users.map(u => {
    const lbl = roleShort[u.role] || u.name;
    const active = u.id === APP.currentUser.id ? 'active' : '';
    return `<button class="role-chip ${active}" onclick="switchRoleQuick('${esc(u.id)}')" title="${esc(u.name)} — ${esc(trEn(u.titleTr, u.titleEn))}">${esc(lbl)}</button>`;
  }).join('');

  // Side & Mobile Nav active states + live counts
  const pTasks = APP.state.tasks.filter(x => x.projectId === prj.id);
  const pMeals = APP.state.meals.filter(x => x.projectId === prj.id);
  const pMedia = APP.state.media.filter(x => x.projectId === prj.id);
  const pSnags = APP.state.snags.filter(x => x.projectId === prj.id && x.status !== 'closed');
  const pNotices = APP.state.notices.filter(x => x.projectId === prj.id);

  document.getElementById('badgeHorizon').textContent = trEn('5 Ölçek', '5 Scales');
  document.getElementById('badgeTasks').textContent = pTasks.length;
  document.getElementById('badgeMeals').textContent = pMeals[0] ? `${pMeals[0].lunch}p` : '0';
  document.getElementById('badgeMedia').textContent = pMedia.length;
  document.getElementById('badgeSnags').textContent = pSnags.length;
  const dUnit = trEn('g', 'd');
  document.getElementById('badgeNotices').textContent = pNotices.length ? `${pNotices[0].daysLeft}${dUnit}` : `28${dUnit}`;
  if (APP.weather && APP.weather.current) {
    document.getElementById('badgeWeather').textContent = `${Math.round(APP.weather.current.temperature_2m)}°C`;
  }

  document.querySelectorAll('#sideNav .nav-item').forEach(b => b.classList.toggle('active', b.getAttribute('data-tab') === APP.tab));
  document.querySelectorAll('#mobileBottomNav .mob-nav-btn').forEach(b => b.classList.toggle('active', b.getAttribute('data-tab') === APP.tab));
}

function renderAll() {
  renderChrome();
  const ws = document.getElementById('mainWorkspace');
  const prj = getActiveProject();
  if (!prj) return;

  switch (APP.tab) {
    case 'overview': ws.innerHTML = renderOverview(prj); break;
    case 'timeline': ws.innerHTML = renderTimeline(prj); break;
    case 'tasks': ws.innerHTML = renderTasks(prj); break;
    case 'meals': ws.innerHTML = renderMeals(prj); break;
    case 'weather': ws.innerHTML = renderWeather(prj); break;
    case 'finance': ws.innerHTML = renderFinance(prj); break;
    case 'media': ws.innerHTML = renderMedia(prj); break;
    case 'snags': ws.innerHTML = renderSnags(prj); break;
    case 'fidic': ws.innerHTML = renderFidic(prj); break;
    default: ws.innerHTML = renderOverview(prj); break;
  }
}

// 1. OVERVIEW / ROLE-AWARE COMMAND CENTER
function renderOverview(prj) {
  const revBudget = prj.contractBudget + prj.approvedVariations;
  const cpi = (prj.earnedValue / Math.max(1, prj.spentActual)).toFixed(2);
  const spi = (prj.physicalProgress / Math.max(0.1, prj.plannedProgress)).toFixed(2);
  const pTasks = APP.state.tasks.filter(x => x.projectId === prj.id);
  const pMeals = APP.state.meals.filter(x => x.projectId === prj.id);
  const todayMeal = pMeals[0] || { lunch: prj.numbers.activeWorkers, activeHeadcount: prj.numbers.activeWorkers, unitCostTl: 215 };
  const pNotices = APP.state.notices.filter(x => x.projectId === prj.id);
  const pSnags = APP.state.snags.filter(x => x.projectId === prj.id);
  const curTemp = APP.weather?.current ? `${APP.weather.current.temperature_2m}°C` : '15°C';
  const curWind = APP.weather?.current ? `${APP.weather.current.wind_speed_10m} km/s` : '21 km/s';

  // Special Field Master Craftsman Simplified View when logged in as 'master'
  if (APP.currentUser.role === 'master') {
    const myTasks = pTasks.filter(x => x.assigneeRole === 'master' || x.assigneeName === APP.currentUser.name);
    const mySnags = pSnags.filter(x => x.assigneeRole === 'master' && x.status !== 'closed');
    return `
      <div class="master-focus-hero">
        <h2>${esc(t('masterBannerTitle'))} — ${esc(APP.currentUser.name)}</h2>
        <p>${esc(t('masterBannerDesc'))}</p>
        <div style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap">
          <button class="btn emerald" onclick="openUploadMediaModal()">+ ${esc(trEn('Saha Foto / Video Çek & Yükle', 'Upload Site Photo / Video'))}</button>
          <button class="btn" onclick="openAddMealModal()">+ ${esc(trEn('Ekip Yemek & Kişi Sayısı Bildir', 'Submit Crew Meal & Headcount'))}</button>
          <button class="btn" onclick="openFeedbackModal()">+ ${esc(trEn('Mimar / Şefe Soru Sor (RFI)', 'Ask Architect / Site Manager'))}</button>
        </div>
      </div>

      <div class="numbers-strip" style="grid-template-columns:repeat(4,1fr)">
        <div class="num-tile"><strong>${myTasks.length}</strong><span>${esc(trEn('Bugünkü İşim', 'My Active Tasks'))}</span></div>
        <div class="num-tile"><strong>${mySnags.length}</strong><span>${esc(trEn('Kapatılacak Eksik', 'Open Defects'))}</span></div>
        <div class="num-tile"><strong>${curTemp}</strong><span>${esc(trEn('Saha Hava • ' + curWind, 'Weather • ' + curWind))}</span></div>
        <div class="num-tile"><strong>${todayMeal.lunch}</strong><span>${esc(trEn('Öğle Yemeği Kaydı', 'Lunch Portions'))}</span></div>
      </div>

      <div class="panel">
        <div class="panel-head"><h3 class="panel-title">${esc(trEn('Bana Atanan İmalat Sorumlulukları (Tek Dokunuşla İlerlet)', 'My Assigned Work Packages (One-Tap Progress)'))}</h3></div>
        ${myTasks.map(renderTaskCardHtml).join('') || `<p>${esc(trEn('Atanmış açık görev bulunmuyor.', 'No active assigned tasks.'))}</p>`}
      </div>

      <div class="panel">
        <div class="panel-head">
          <h3 class="panel-title">${esc(trEn('Bana Atanan Mahal Eksikleri (Md. 11)', 'My Assigned Snags / Defects'))}</h3>
          <button class="btn sm primary" onclick="switchTab('snags')">${esc(trEn('Kat Planında Gör', 'View on Floor Plan'))}</button>
        </div>
        ${mySnags.map(s => `
          <div class="task-card">
            <div style="display:flex;justify-content:space-between;gap:8px">
              <strong>#${esc(s.id)} · ${esc(trEn(s.titleTr, s.titleEn))}</strong>
              <span class="pill ochre">${esc(s.zone)}</span>
            </div>
            <p style="margin:6px 0;color:var(--ink-secondary);font-size:12.5px">${esc(s.noteTr || '')}</p>
            <button class="btn sm emerald" onclick="updateSnagStatus('${esc(s.id)}','ready_for_review')">${esc(trEn('Tamamladım • Kontrol İste', 'Fixed • Request Inspection'))}</button>
          </div>
        `).join('') || `<p>${esc(trEn('Açık eksik bulunmuyor.', 'No open defects.'))}</p>`}
      </div>
    `;
  }

  return `
    <!-- 4 Executive KPI Cards: Physical/Velocity, Cost/CPI, Finish Forecast, Live Site/Meals -->
    <div class="kpi-grid">
      <div class="kpi-card">
        <div class="kpi-label">${esc(t('kpiPhysical'))}</div>
        <div class="kpi-value">%${prj.physicalProgress.toFixed(1)} <span class="pill ${spi >= 1 ? 'emerald' : 'ochre'}">SPI ${spi}</span></div>
        <div class="progress-track"><div class="progress-fill emerald" style="width:${Math.min(100, prj.physicalProgress)}%"></div></div>
        <div class="kpi-sub">
          <span>${esc(trEn('Planlanan: %' + prj.plannedProgress, 'Planned: ' + prj.plannedProgress + '%'))}</span>
          <strong>+${prj.dailyVelocityPct}% / ${esc(trEn('gün hız', 'day vel.'))}</strong>
        </div>
      </div>

      <div class="kpi-card">
        <div class="kpi-label">${esc(t('kpiBudget'))}</div>
        <div class="kpi-value">${esc(fmtMoney(prj.spentActual, prj.currency))} <span class="pill ${cpi >= 1 ? 'emerald' : 'crimson'}">CPI ${cpi}</span></div>
        <div class="progress-track"><div class="progress-fill" style="width:${Math.min(100, (prj.spentActual / revBudget) * 100)}%"></div></div>
        <div class="kpi-sub">
          <span>${esc(trEn('Revize Bütçe: ', 'Rev. Budget: '))}${esc(fmtMoney(revBudget, prj.currency))}</span>
          <span>Md. 13 + 14</span>
        </div>
      </div>

      <div class="kpi-card">
        <div class="kpi-label">${esc(t('kpiFinish'))}</div>
        <div class="kpi-value">${esc(prj.forecastEndDate)}</div>
        <div class="progress-track"><div class="progress-fill ochre" style="width:74%"></div></div>
        <div class="kpi-sub">
          <span>${esc(trEn('Sözleşme: ' + prj.contractEndDate, 'Contract: ' + prj.contractEndDate))}</span>
          <span class="pill cobalt">+${prj.approvedEotDays}${trEn('g', 'd')} EOT (Md.8.5)</span>
        </div>
      </div>

      <div class="kpi-card">
        <div class="kpi-label">${esc(t('kpiSiteLive'))}</div>
        <div class="kpi-value">${fmtNum(prj.numbers.activeWorkers)} ${esc(trEn('Kişi', 'Crew'))} <span class="pill cobalt">${curTemp}</span></div>
        <div class="progress-track"><div class="progress-fill emerald" style="width:94%"></div></div>
        <div class="kpi-sub">
          <span>${esc(trEn('Öğle Yemeği: ', 'Lunch: '))}<strong>${fmtNum(todayMeal.lunch)} ${esc(trEn('porsiyon', 'meals'))}</strong></span>
          <span>${fmtNum(prj.safeDaysWithoutAccident)} ${esc(trEn('kazasız gün', 'safe days'))}</span>
        </div>
      </div>
    </div>

    <!-- 8 Live Quantitative Site Counters -->
    <div class="numbers-strip">
      <div class="num-tile"><strong>${fmtNum(prj.numbers.activeWorkers)}</strong><span>${esc(trEn('Toplam Saha Personeli', 'Total Site Crew'))}</span></div>
      <div class="num-tile"><strong>${fmtNum(prj.numbers.mastersAndForemen)}</strong><span>${esc(trEn('Usta & Ekipbaşı', 'Masters & Foremen'))}</span></div>
      <div class="num-tile"><strong>${fmtNum(prj.numbers.engineersAndArchitects)}</strong><span>${esc(trEn('Mimar & Mühendis', 'Architects & Eng.'))}</span></div>
      <div class="num-tile"><strong>${fmtNum(prj.numbers.activeCranesAndMachines)}</strong><span>${esc(trEn('Aktif Vinç & Makine', 'Cranes & Plant'))}</span></div>
      <div class="num-tile"><strong>${fmtNum(prj.numbers.concretePouredM3)} m³</strong><span>${esc(trEn('Dökülen Beton', 'Concrete Poured'))}</span></div>
      <div class="num-tile"><strong>${fmtNum(prj.numbers.rebarTons)} ton</strong><span>${esc(trEn('Bağlanan Demir', 'Rebar Installed'))}</span></div>
      <div class="num-tile"><strong>${fmtNum(prj.numbers.completedAreaM2)} m²</strong><span>${esc(trEn('Tamamlanan Alan', 'Completed Area'))}</span></div>
      <div class="num-tile"><strong>${fmtNum(todayMeal.lunch)}</strong><span>${esc(trEn('Günlük Öğle Yemeği', 'Daily Lunch Count'))}</span></div>
    </div>

    <div class="two-col">
      <!-- WBS Hierarchy -->
      <div class="panel">
        <div class="panel-head">
          <h3 class="panel-title">${esc(t('wbsTitle'))} — ${esc(trEn(prj.scaleLabelTr, prj.scaleLabelEn))}</h3>
          <button class="btn sm primary" onclick="switchTab('timeline')">${esc(trEn('Saat•Gün•Hafta•Ay•Yıl Aç', 'Open 5-Scale Timeline'))}</button>
        </div>
        <table class="data-table">
          <thead>
            <tr>
              <th>${esc(trEn('Kod / Seviye', 'Code / Level'))}</th>
              <th>${esc(trEn('Bölge / Blok / İmalat Paketi', 'Zone / Work Package'))}</th>
              <th>${esc(trEn('Sorumlu', 'Owner'))}</th>
              <th>FIDIC</th>
              <th>${esc(trEn('Bütçe', 'Budget'))}</th>
              <th style="width:130px">${esc(trEn('İlerleme', 'Progress'))}</th>
            </tr>
          </thead>
          <tbody>
            ${prj.wbs.map(w => `
              <tr>
                <td><strong>${esc(w.code)}</strong><br><small style="color:var(--ink-secondary)">${esc(w.level)}</small></td>
                <td><strong>${esc(trEn(w.nameTr, w.nameEn))}</strong></td>
                <td>${esc(w.owner)}</td>
                <td><span class="pill cobalt">${esc(w.clause)}</span></td>
                <td class="tabular">${esc(fmtMoney(w.budget, prj.currency))}</td>
                <td>
                  <div style="display:flex;align-items:center;gap:6px">
                    <div class="progress-track" style="flex:1;margin:0"><div class="progress-fill ${w.progress >= 80 ? 'emerald' : ''}" style="width:${w.progress}%"></div></div>
                    <strong class="tabular">%${w.progress}</strong>
                  </div>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>

      <!-- FIDIC Statutory Countdown Shield + Today's Shift Snapshot -->
      <div>
        <div class="panel">
          <div class="panel-head">
            <h3 class="panel-title">${esc(t('noticesTitle'))}</h3>
            <button class="btn sm" onclick="switchTab('fidic')">${esc(trEn('Tüm Maddeler', 'All Clauses'))}</button>
          </div>
          ${pNotices.map(n => `
            <div style="border:1px solid var(--border);border-left:4px solid ${n.daysLeft <= 12 ? '#D97706' : '#059669'};border-radius:9px;padding:10px 12px;margin-bottom:9px">
              <div style="display:flex;justify-content:space-between;gap:8px;margin-bottom:4px">
                <span class="pill cobalt">${esc(n.clause)}</span>
                <span class="pill ${n.daysLeft <= 12 ? 'ochre' : 'emerald'} badge-days">${n.daysLeft} ${esc(trEn('gün kaldı', 'days left'))}</span>
              </div>
              <strong style="display:block;font-size:13px">${esc(n.titleTr)}</strong>
              <div style="font-size:11.5px;color:var(--ink-secondary);margin-top:3px">${esc(n.typeTr)} · Son: ${esc(n.deadlineDate)}</div>
            </div>
          `).join('')}
        </div>

        <div class="panel">
          <div class="panel-head">
            <h3 class="panel-title">${esc(trEn('Bugünkü Saatlik Şantiye Akışı', "Today's Hourly Site Pulse"))}</h3>
            <button class="btn sm" onclick="APP.horizon='hour';switchTab('timeline')">${esc(trEn('Tümü', 'All'))}</button>
          </div>
          ${(prj.hourlyLogs || []).slice(0, 4).map(h => `
            <div style="display:flex;gap:10px;padding:7px 0;border-bottom:1px solid var(--border);font-size:12.5px">
              <strong class="tabular" style="color:var(--cobalt-bright);min-width:44px">${esc(h.time)}</strong>
              <div style="flex:1">
                <strong>${esc(trEn(h.titleTr, h.titleEn))}</strong>
                <div style="color:var(--ink-secondary);font-size:11.5px">${esc(h.zone)} · ${esc(h.metric)}</div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    </div>
  `;
}

// 2. MULTI-HORIZON PROGRESS ENGINE (SAAT • GÜN • HAFTA • AY • YIL)
function renderTimeline(prj) {
  const hzButtons = [
    ['hour', t('scaleHour')],
    ['day', t('scaleDay')],
    ['week', t('scaleWeek')],
    ['month', t('scaleMonth')],
    ['year', t('scaleYear')]
  ].map(([k, lbl]) => `<button class="btn ${APP.horizon === k ? 'primary' : ''}" onclick="APP.horizon='${k}';renderAll()">${esc(lbl)}</button>`).join(' ');

  let bodyHtml = '';
  if (APP.horizon === 'hour') {
    bodyHtml = `
      <div class="panel-head">
        <h3 class="panel-title">${esc(trEn('Saat Saat Canlı Şantiye & İmalat Akışı (Bugün)', 'Hour-by-Hour Live Site & Production Stream (Today)'))}</h3>
        <button class="btn primary" onclick="openAddHourModal()">+ ${esc(t('addHourBtn'))}</button>
      </div>
      <table class="data-table">
        <thead><tr><th>Saat</th><th>İmalat / Operasyon</th><th>Mahal / Bölge</th><th>Sorumlu</th><th>Ölçüm / Hız</th><th>Durum</th></tr></thead>
        <tbody>
          ${(prj.hourlyLogs || []).map(h => `
            <tr>
              <td><strong class="tabular">${esc(h.time)}</strong></td>
              <td><strong>${esc(trEn(h.titleTr, h.titleEn))}</strong></td>
              <td>${esc(h.zone)}</td>
              <td>${esc(h.owner)}</td>
              <td><span class="pill cobalt">${esc(h.metric)}</span></td>
              <td><span class="pill ${h.status === 'done' ? 'emerald' : (h.status === 'active' ? 'ochre' : 'cobalt')}">${esc(h.status === 'done' ? trEn('Tamamlandı', 'Done') : (h.status === 'active' ? trEn('Sahada Aktif', 'Active') : trEn('Planlı', 'Planned')))}</span></td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  } else if (APP.horizon === 'day') {
    bodyHtml = `
      <h3 class="panel-title" style="margin-bottom:12px">${esc(trEn('Gün Gün İlerleme Hızı, Personel, Yemek ve Hava Durumu Kaydı', 'Day-by-Day Velocity, Manpower, Catering & Weather Log'))}</h3>
      <table class="data-table">
        <thead><tr><th>Tarih</th><th>Planlanan Günlük Hız</th><th>Gerçekleşen Hız</th><th>Saha Personeli</th><th>Öğle Yemeği</th><th>Hava Koşulu (Md. 8.5)</th></tr></thead>
        <tbody>
          ${(prj.dailySeries || []).map(d => `
            <tr>
              <td><strong>${esc(d.date)}</strong></td>
              <td class="tabular">+%${d.plannedPct.toFixed(2)}</td>
              <td><strong class="tabular" style="color:${d.actualPct >= d.plannedPct ? '#059669' : '#D97706'}">+%${d.actualPct.toFixed(2)}</strong></td>
              <td class="tabular">${d.workers} kişi</td>
              <td class="tabular">${d.meals} porsiyon</td>
              <td>${esc(d.weather)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  } else if (APP.horizon === 'week') {
    bodyHtml = `
      <h3 class="panel-title" style="margin-bottom:12px">${esc(trEn('Hafta Hafta Üretim Hızı (SPI) ve Kritik Yol Özeti', 'Week-by-Week Production Velocity (SPI) & Critical Path'))}</h3>
      <table class="data-table">
        <thead><tr><th>Hafta</th><th>Hedef İlerleme</th><th>Gerçekleşen</th><th>Hız Endeksi (SPI)</th><th>Kritik Saha Notu</th></tr></thead>
        <tbody>
          ${(prj.weeklySeries || []).map(w => `
            <tr>
              <td><strong>${esc(w.week)}</strong></td>
              <td class="tabular">+%${w.target}</td>
              <td class="tabular"><strong>+%${w.actual}</strong></td>
              <td><span class="pill ${w.spi >= 1 ? 'emerald' : 'ochre'}">SPI ${w.spi.toFixed(2)}</span></td>
              <td>${esc(trEn(w.noteTr, w.noteEn))}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  } else if (APP.horizon === 'year') {
    bodyHtml = `
      <h3 class="panel-title" style="margin-bottom:12px">${esc(trEn('Yıl Yıl Master Yatırım, Geçici Kabul ve Garanti (DNP) Yol Haritası', 'Year-by-Year Master Investment, Taking-Over & DNP Roadmap'))}</h3>
      ${(prj.yearlySeries || []).map(y => `
        <div class="task-card">
          <div style="display:flex;justify-content:space-between;align-items:center">
            <strong style="font-size:16px">${esc(y.year)} — ${esc(trEn(y.phaseTr, y.phaseEn))}</strong>
            <span class="pill ${y.progress === 100 ? 'emerald' : 'cobalt'}">%${y.progress}</span>
          </div>
          <div class="progress-track"><div class="progress-fill ${y.progress === 100 ? 'emerald' : ''}" style="width:${y.progress}%"></div></div>
        </div>
      `).join('')}
    `;
  } else {
    // Monthly S-Curve SVG + IPC Table
    const ms = prj.monthlySeries || [];
    const ptsPlanned = ms.map((m, i) => `${60 + i * 135},${210 - m.plannedCum * 2}`).join(' ');
    const ptsEarned = ms.map((m, i) => `${60 + i * 135},${210 - m.earnedCum * 2}`).join(' ');
    bodyHtml = `
      <h3 class="panel-title" style="margin-bottom:10px">${esc(trEn('Ay Ay S-Eğrisi (Planlanan vs Kazanılmış Fiziksel İlerleme) & Ara Hakediş (IPC)', 'Month-by-Month S-Curve & Interim Payment Certificates (IPC)'))}</h3>
      <svg viewBox="0 0 820 245" style="width:100%;max-height:250px;background:var(--surface-alt);border:1px solid var(--border);border-radius:10px;margin-bottom:14px">
        <line x1="50" y1="210" x2="780" y2="210" stroke="#94A3B8" stroke-width="1"/>
        <line x1="50" y1="130" x2="780" y2="130" stroke="#CBD5E1" stroke-dasharray="4,4"/>
        <line x1="50" y1="50" x2="780" y2="50" stroke="#CBD5E1" stroke-dasharray="4,4"/>
        <polyline fill="none" stroke="#94A3B8" stroke-width="3" stroke-dasharray="6,4" points="${ptsPlanned}"/>
        <polyline fill="none" stroke="#2563EB" stroke-width="4" points="${ptsEarned}"/>
        ${ms.map((m, i) => `
          <circle cx="${60 + i * 135}" cy="${210 - m.earnedCum * 2}" r="5" fill="#2563EB"/>
          <text x="${42 + i * 135}" y="232" font-size="12" fill="#64748B">${esc(m.month)}</text>
          <text x="${44 + i * 135}" y="${198 - m.earnedCum * 2}" font-size="11.5" font-weight="700" fill="#1D4ED8">%${m.earnedCum}</text>
        `).join('')}
      </svg>
      <table class="data-table">
        <thead><tr><th>Ay</th><th>Planlanan Kümülatif</th><th>Gerçekleşen (Earned)</th><th>Kümülatif Harcama</th><th>FIDIC Md. 14 Hakediş Durumu</th></tr></thead>
        <tbody>
          ${ms.map(m => `
            <tr>
              <td><strong>${esc(m.month)}</strong></td>
              <td class="tabular">%${m.plannedCum}</td>
              <td><strong class="tabular" style="color:#059669">%${m.earnedCum}</strong></td>
              <td class="tabular">${m.spentM} M ${esc(prj.currency)}</td>
              <td><span class="pill cobalt">${esc(m.ipcStatus)}</span></td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  }

  return `
    <div class="panel">
      <div class="panel-head">
        <div>
          <h2 class="panel-title" style="font-size:18px">${esc(trEn('5 Boyutlu Zaman & Hız Motoru (FIDIC Madde 8 İş Programı)', '5-Horizon Schedule & Velocity Engine (FIDIC Clause 8)'))}</h2>
          <div style="font-size:12.5px;color:var(--ink-secondary)">${esc(trEn('Saatten yıla tek tıkla ölçek değiştirin; saha verisi otomatik olarak üst ölçekleri besler.', 'Zoom seamlessly from shift hours to multi-year phases.'))}</div>
        </div>
        <div style="display:flex;gap:6px;flex-wrap:wrap">${hzButtons}</div>
      </div>
      ${bodyHtml}
    </div>
  `;
}

// 3. RESPONSIBILITIES & TASK DISTRIBUTION
function renderTaskCardHtml(tsk) {
  return `
    <div class="task-card">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;flex-wrap:wrap">
        <div>
          <span class="pill cobalt">${esc(tsk.fidicClause)}</span>
          <span class="pill ${tsk.priority === 'critical' ? 'crimson' : (tsk.priority === 'high' ? 'ochre' : 'emerald')}">${esc(tsk.priority.toUpperCase())}</span>
          <strong style="display:block;font-size:14.5px;margin-top:5px">${esc(trEn(tsk.titleTr, tsk.titleEn))}</strong>
          <div style="font-size:12.5px;color:var(--ink-secondary);margin-top:2px">
            <strong>${esc(tsk.assigneeName)}</strong> · ${esc(tsk.zone)} · Son Tarih: <strong>${esc(tsk.dueDate)}</strong>
          </div>
        </div>
        <strong class="tabular" style="font-size:18px;color:var(--cobalt-bright)">%${tsk.progress}</strong>
      </div>
      <p style="margin:8px 0 6px;font-size:12.8px;color:var(--ink-secondary)">${esc(tsk.instructionTr || '')}</p>
      <div class="progress-track"><div class="progress-fill ${tsk.progress >= 100 ? 'emerald' : ''}" style="width:${tsk.progress}%"></div></div>
      <div class="touch-pct-row">
        ${[0, 25, 50, 75, 100].map(p => `<button class="pct-btn ${tsk.progress === p ? 'active' : ''}" onclick="updateTaskProgress('${esc(tsk.id)}', ${p})">%${p}</button>`).join('')}
      </div>
    </div>
  `;
}

function renderTasks(prj) {
  const all = APP.state.tasks.filter(x => x.projectId === prj.id);
  const filtered = APP.roleFilter === 'all' ? all : all.filter(x => x.assigneeRole === APP.roleFilter);

  return `
    <div class="panel">
      <div class="panel-head">
        <div>
          <h2 class="panel-title" style="font-size:18px">${esc(trEn('Rol Bazlı Sorumluluk Dağıtımı ve Saha İlerleme Takibi', 'Role-Based Responsibility Distribution & Execution'))}</h2>
          <div style="font-size:12.5px;color:var(--ink-secondary)">${esc(trEn('Yatırımcı, Yürütücü, Mimar, Şantiye Şefi ve Saha Ustalarının her birinin sorumluluğu ilgili FIDIC maddesiyle kayıt altındadır.', 'Every stakeholder responsibility is linked to a zone, deadline, and FIDIC clause.'))}</div>
        </div>
        <button class="btn primary" onclick="openAddTaskModal()">+ ${esc(t('addTaskBtn'))}</button>
      </div>

      <div style="display:flex;gap:6px;margin-bottom:14px;flex-wrap:wrap">
        ${[
          ['all', trEn('Tümü', 'All')],
          ['employer', t('roleEmployer')],
          ['engineer', t('roleEngineer')],
          ['architect', t('roleArchitect')],
          ['sitemanager', t('roleSiteManager')],
          ['master', t('roleMaster')]
        ].map(([rk, rlbl]) => `<button class="btn sm ${APP.roleFilter === rk ? 'primary' : ''}" onclick="APP.roleFilter='${rk}';renderAll()">${esc(rlbl)}</button>`).join('')}
      </div>

      ${filtered.map(renderTaskCardHtml).join('') || `<p>${esc(trEn('Bu filtrede görev yok.', 'No tasks in this filter.'))}</p>`}
    </div>
  `;
}

// 4. SITE NUMBERS & CATERING / MEALS (FIDIC CLAUSE 6.6 & 6.10)
function renderMeals(prj) {
  const pMeals = APP.state.meals.filter(x => x.projectId === prj.id);
  const latest = pMeals[0] || { activeHeadcount: prj.numbers.activeWorkers, breakfast: 0, lunch: 0, dinner: 0, nightShift: 0, waterJugs: 0, unitCostTl: 215, menuTr: '-' };
  const totalPortionsToday = Number(latest.breakfast) + Number(latest.lunch) + Number(latest.dinner) + Number(latest.nightShift);
  const dailyCost = totalPortionsToday * Number(latest.unitCostTl || 215);
  const variancePct = latest.activeHeadcount > 0 ? (((latest.lunch - latest.activeHeadcount) / latest.activeHeadcount) * 100).toFixed(1) : '0.0';

  return `
    <div class="kpi-grid">
      <div class="kpi-card">
        <div class="kpi-label">${esc(trEn('Aktif Saha Puantajı (Md. 6.10)', 'Active Site Headcount (Cl. 6.10)'))}</div>
        <div class="kpi-value">${fmtNum(latest.activeHeadcount)} ${esc(trEn('Kişi', 'Workers'))}</div>
        <div class="kpi-sub"><span>Usta: ${prj.numbers.mastersAndForemen} · Teknik: ${prj.numbers.engineersAndArchitects}</span></div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">${esc(trEn('Bugünkü Öğle Yemeği & Fire Denetimi', "Today's Lunch & Headcount Audit"))}</div>
        <div class="kpi-value">${fmtNum(latest.lunch)} <span class="pill ${Math.abs(variancePct) <= 5 ? 'emerald' : 'ochre'}">${variancePct > 0 ? '+' : ''}${variancePct}%</span></div>
        <div class="kpi-sub"><span>${esc(trEn('Puantaj/Yemek Sapması Normal (<%5)', 'Headcount vs Catering within <5%'))}</span></div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">${esc(trEn('4 Vardiya Toplam Günlük Porsiyon', 'Total Daily Portions (All Shifts)'))}</div>
        <div class="kpi-value">${fmtNum(totalPortionsToday)}</div>
        <div class="kpi-sub"><span>Sabah ${latest.breakfast} · Öğle ${latest.lunch} · Akşam ${latest.dinner} · Gece ${latest.nightShift}</span></div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">${esc(trEn('Günlük İaşe & İçme Suyu Maliyeti', 'Daily Catering & Water Cost'))}</div>
        <div class="kpi-value">${fmtNum(dailyCost)} ${esc(prj.currency)}</div>
        <div class="kpi-sub"><span>Birim: ${latest.unitCostTl} ₺ · Su: ${latest.waterJugs} Damacana</span></div>
      </div>
    </div>

    <div class="panel">
      <div class="panel-head">
        <div>
          <h2 class="panel-title">${esc(trEn('Şantiye Yemekhane, İaşe ve Günlük Personel Kayıt Defteri (FIDIC Madde 6.6 & 6.10)', 'Site Catering, Camp Logistics & Daily Headcount Register (FIDIC Cl. 6.6 & 6.10)'))}</h2>
          <div style="font-size:12.5px;color:var(--ink-secondary)"><strong>Bugünkü Menü:</strong> ${esc(trEn(latest.menuTr, latest.menuEn))}</div>
        </div>
        <button class="btn primary" onclick="openAddMealModal()">+ ${esc(t('addMealBtn'))}</button>
      </div>

      <table class="data-table">
        <thead>
          <tr>
            <th>Tarih</th>
            <th>Saha Puantajı</th>
            <th>Kahvaltı</th>
            <th>Öğle Yemeği</th>
            <th>Akşam</th>
            <th>Gece Kumanya</th>
            <th>Su (Damacana)</th>
            <th>Günlük Tutar</th>
            <th>Menü & Denetim Notu</th>
          </tr>
        </thead>
        <tbody>
          ${pMeals.map(m => {
            const tot = Number(m.breakfast) + Number(m.lunch) + Number(m.dinner) + Number(m.nightShift);
            return `
              <tr>
                <td><strong>${esc(m.date)}</strong></td>
                <td class="tabular"><strong>${m.activeHeadcount}</strong> kişi</td>
                <td class="tabular">${m.breakfast}</td>
                <td class="tabular"><strong>${m.lunch}</strong></td>
                <td class="tabular">${m.dinner}</td>
                <td class="tabular">${m.nightShift}</td>
                <td class="tabular">${m.waterJugs}</td>
                <td class="tabular"><strong>${fmtNum(tot * (m.unitCostTl || 215))} ₺</strong></td>
                <td>${esc(trEn(m.menuTr, m.menuEn))}<br><small style="color:var(--ink-secondary)">${esc(m.noteTr || '')}</small></td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    </div>
  `;
}

// 5. LIVE WEATHER & CONSTRUCTION SUITABILITY + FIDIC CLAUSE 8.5 EOT TRIGGER
function renderWeather(prj) {
  const cur = APP.weather?.current || { temperature_2m: 14.6, relative_humidity_2m: 62, precipitation: 0, wind_speed_10m: 21.4 };
  const daily = APP.weather?.daily || { time: [], temperature_2m_max: [], temperature_2m_min: [], precipitation_sum: [], wind_speed_10m_max: [] };

  const craneOk = cur.wind_speed_10m < 48;
  const concreteOk = cur.temperature_2m >= 5 && cur.precipitation < 4;
  const facadeOk = cur.wind_speed_10m < 38 && cur.precipitation < 1;

  return `
    <div class="kpi-grid">
      <div class="kpi-card">
        <div class="kpi-label">${esc(prj.city)} — ${esc(trEn('Anlık Şantiye Sıcaklığı', 'Live Site Temperature'))}</div>
        <div class="kpi-value">${cur.temperature_2m}°C</div>
        <div class="kpi-sub"><span>Nem: %${cur.relative_humidity_2m} · Yağış: ${cur.precipitation} mm</span></div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">${esc(trEn('Rüzgar Hızı & Kule Vinç Güvenliği', 'Wind Speed & Tower Crane Safety'))}</div>
        <div class="kpi-value">${cur.wind_speed_10m} km/s <span class="pill ${craneOk ? 'emerald' : 'crimson'}">${craneOk ? trEn('VİNÇ UYGUN', 'CRANE SAFE') : trEn('DURDUR!', 'STOP CRANE')}</span></div>
        <div class="kpi-sub"><span>Sınır: 48 km/s (İSG Md. 4.8)</span></div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">${esc(trEn('Açık Alan Beton Döküm Uygunluğu', 'Concrete Pour Suitability'))}</div>
        <div class="kpi-value"><span class="pill ${concreteOk ? 'emerald' : 'ochre'}" style="font-size:15px">${concreteOk ? trEn('DÖKÜME UYGUN', 'SUITABLE') : trEn('KORUMA / KÜR ŞART', 'PROTECTION REQ.')}</span></div>
        <div class="kpi-sub"><span>+5°C üstü ve sağanaksız koşul</span></div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">${esc(trEn('Dış Cephe & İzolasyon Çalışması', 'Facade & Waterproofing'))}</div>
        <div class="kpi-value"><span class="pill ${facadeOk ? 'emerald' : 'ochre'}" style="font-size:15px">${facadeOk ? trEn('ÇALIŞMAYA AÇIK', 'CLEAR') : trEn('RÜZGAR/YAĞIŞ RİSKİ', 'CAUTION')}</span></div>
        <div class="kpi-sub"><span>Sepetli platform sınırı: 38 km/s</span></div>
      </div>
    </div>

    <div class="panel">
      <div class="panel-head">
        <div>
          <h2 class="panel-title">${esc(trEn('5 Günlük Şantiye Meteoroloji Tahmini ve FIDIC Madde 8.5(c) Hava Muhalefeti Kaydı', '5-Day Site Forecast & FIDIC Clause 8.5(c) Adverse Climatic Record'))}</h2>
          <div style="font-size:12.5px;color:var(--ink-secondary)">${esc(trEn('Olağanüstü fırtına veya sağanak günlerini tek tıkla Çağdaş Kayıt (Contemporary Record) olarak FIDIC Süre Uzatımı (EOT) kalkanına işleyin.', 'Lock adverse weather days into the FIDIC Clause 8.5 EOT register with one click.'))}</div>
        </div>
        <button class="btn primary" onclick="logWeatherEotNotice()">+ ${esc(trEn('Md. 8.5 Hava Muhalefeti Tutanağı Oluştur', 'Log Cl. 8.5 Weather EOT Notice'))}</button>
      </div>

      <table class="data-table">
        <thead><tr><th>Gün</th><th>Min / Maks Sıcaklık</th><th>Toplam Yağış</th><th>Maksimum Rüzgar</th><th>Şantiye Operasyon Kararı</th></tr></thead>
        <tbody>
          ${(daily.time || []).slice(0, 5).map((dt, idx) => {
            const wMax = daily.wind_speed_10m_max[idx] || 0;
            const rain = daily.precipitation_sum[idx] || 0;
            const warn = wMax >= 48 || rain >= 10;
            return `
              <tr>
                <td><strong>${esc(dt)}</strong></td>
                <td class="tabular">${daily.temperature_2m_min[idx]}°C / <strong>${daily.temperature_2m_max[idx]}°C</strong></td>
                <td class="tabular">${rain} mm</td>
                <td class="tabular"><strong>${wMax} km/s</strong></td>
                <td><span class="pill ${warn ? 'crimson' : 'emerald'}">${warn ? trEn('Kule Vinç / Dış Cephe Önlemi & EOT Adayı', 'Crane Restriction & EOT Candidate') : trEn('Tam Kapasite Saha Çalışmasına Uygun', 'Normal Full-Capacity Operations')}</span></td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    </div>
  `;
}

// 6. FINANCE, IPC PAYMENT CYCLE & FIDIC FORMULAS (Pn & HUDSON)
function renderFinance(prj) {
  const ipcs = APP.state.ipcList.filter(x => x.projectId === prj.id);
  return `
    <div class="panel">
      <div class="panel-head">
        <div>
          <h2 class="panel-title">${esc(trEn('Ara Hakediş Döngüsü (FIDIC Madde 14: 28 Gün Onay • 56 Gün Ödeme)', 'Interim Payment Certificates (FIDIC Clause 14: 28d Issue • 56d Payment)'))}</h2>
          <div style="font-size:12.5px;color:var(--ink-secondary)">Sözleşme Bedeli: <strong>${fmtMoney(prj.contractBudget, prj.currency)}</strong> · Onaylı Varyasyon: <strong>${fmtMoney(prj.approvedVariations, prj.currency)}</strong> · Günlük Gecikme Cezası (Md. 8.8): <strong>${fmtNum(prj.delayDamagesDaily)} ${prj.currency}/gün</strong></div>
        </div>
      </div>
      <table class="data-table">
        <thead><tr><th>Hakediş No</th><th>Dönem</th><th>Brüt İmalat</th><th>Pn Eskalasyon Çarpanı</th><th>Nakit Teminat Kesintisi (Md.14.9)</th><th>Net Ödenecek Tutar</th><th>Durum</th></tr></thead>
        <tbody>
          ${ipcs.map(i => `
            <tr>
              <td><strong>${esc(i.no)}</strong></td>
              <td>${esc(i.period)}</td>
              <td class="tabular">${fmtNum(i.gross)} ₺</td>
              <td class="tabular"><span class="pill cobalt">Pn = ${i.priceAdjPn}</span></td>
              <td class="tabular">-${fmtNum(i.retention)} ₺</td>
              <td class="tabular"><strong>${fmtNum(i.netPayable)} ₺</strong></td>
              <td><span class="pill emerald">${esc(i.status)}</span></td>
            </tr>
          `).join('') || `<tr><td colspan="7">${esc(trEn('Bu ölçek için özet bütçe takibi aktif.', 'Summary budget active for this project.'))}</td></tr>`}
        </tbody>
      </table>
    </div>

    <div class="equal-col">
      <!-- Pn Price Adjustment Calculator -->
      <div class="panel">
        <h3 class="panel-title" style="margin-bottom:8px">${esc(trEn('Canlı Fiyat Farkı Hesaplayıcısı (Madde 13.7 — Pn Formülü)', 'Live Price Adjustment Calculator (Clause 13.7 — Pn Formula)'))}</h3>
        <p style="font-size:12px;color:var(--ink-secondary);margin-top:0"><code>Pn = a + b·(Ln/Lo) + c·(En/Eo) + d·(Mn/Mo)</code></p>
        <div class="form-row-2">
          <label class="fld">Aylık Brüt Hakediş (₺)<input type="number" id="pnBaseAmt" value="20000000" oninput="calcPnLive()"/></label>
          <label class="fld">Sabit Katsayı (a)<input type="number" step="0.01" id="pnA" value="0.10" oninput="calcPnLive()"/></label>
          <label class="fld">İşçilik b × (Ln/Lo)<input type="number" step="0.01" id="pnL" value="1.28" oninput="calcPnLive()"/></label>
          <label class="fld">Ekipman/Enerji c × (En/Eo)<input type="number" step="0.01" id="pnE" value="1.18" oninput="calcPnLive()"/></label>
          <label class="fld">Malzeme d × (Mn/Mo)<input type="number" step="0.01" id="pnM" value="1.32" oninput="calcPnLive()"/></label>
          <div style="background:var(--cobalt-tint);border-radius:9px;padding:10px 12px;display:flex;flex-direction:column;justify-content:center">
            <span style="font-size:11.5px;color:var(--cobalt)">Hesaplanan Pn & Ek Fiyat Farkı (b=0.30, c=0.20, d=0.40)</span>
            <strong id="pnResultOut" style="font-size:16px;color:var(--cobalt-bright)">Pn = 1,248 · +4.960.000 ₺</strong>
          </div>
        </div>
      </div>

      <!-- Hudson Formula Calculator -->
      <div class="panel">
        <h3 class="panel-title" style="margin-bottom:8px">${esc(trEn('Hudson Formülü — Merkez Ofis Genel Gider & Kâr Kaybı Hesabı', 'Hudson Formula — Head Office Overheads & Profit Calculator'))}</h3>
        <p style="font-size:12px;color:var(--ink-secondary);margin-top:0"><code>[(Genel Gider + Kâr)% / 100] × (Sözleşme Bedeli / Süre Hafta) × Gecikme Hafta</code></p>
        <div class="form-row-2">
          <label class="fld">Sözleşme Bedeli (₺)<input type="number" id="hudSum" value="${prj.contractBudget}" oninput="calcHudsonLive()"/></label>
          <label class="fld">Genel Gider + Kâr (%)<input type="number" step="0.5" id="hudPct" value="12" oninput="calcHudsonLive()"/></label>
          <label class="fld">Sözleşme Süresi (Hafta)<input type="number" id="hudTotalW" value="78" oninput="calcHudsonLive()"/></label>
          <label class="fld">İşveren Kaynaklı Gecikme (Hafta)<input type="number" id="hudDelayW" value="4" oninput="calcHudsonLive()"/></label>
        </div>
        <div style="margin-top:10px;background:var(--ochre-tint);border-radius:9px;padding:10px 12px">
          <span style="font-size:11.5px;color:var(--ochre)">Talep Edilebilir Merkez Genel Gider + Kâr Tazminatı:</span>
          <strong id="hudResultOut" style="display:block;font-size:17px;color:var(--ochre)">${fmtNum(Math.round(0.12 * (prj.contractBudget / 78) * 4))} ₺</strong>
        </div>
      </div>
    </div>
  `;
}

function calcPnLive() {
  const amt = Number(document.getElementById('pnBaseAmt')?.value || 0);
  const a = Number(document.getElementById('pnA')?.value || 0.1);
  const l = Number(document.getElementById('pnL')?.value || 1);
  const e = Number(document.getElementById('pnE')?.value || 1);
  const m = Number(document.getElementById('pnM')?.value || 1);
  const pn = a + 0.30 * l + 0.20 * e + 0.40 * m;
  const diff = Math.round(amt * (pn - 1));
  const out = document.getElementById('pnResultOut');
  if (out) out.textContent = `Pn = ${pn.toFixed(3)} · ${diff >= 0 ? '+' : ''}${fmtNum(diff)} ₺`;
}

function calcHudsonLive() {
  const sum = Number(document.getElementById('hudSum')?.value || 0);
  const pct = Number(document.getElementById('hudPct')?.value || 12);
  const tw = Math.max(1, Number(document.getElementById('hudTotalW')?.value || 1));
  const dw = Number(document.getElementById('hudDelayW')?.value || 0);
  const res = Math.round((pct / 100) * (sum / tw) * dw);
  const out = document.getElementById('hudResultOut');
  if (out) out.textContent = `${fmtNum(res)} ₺`;
}

// 7. PHOTO, VIDEO & PROJECT BLUEPRINT VAULT
function renderMedia(prj) {
  const items = APP.state.media.filter(x => x.projectId === prj.id);
  return `
    <div class="panel">
      <div class="panel-head">
        <div>
          <h2 class="panel-title">${esc(trEn('Fotoğraf, Saha Videosu ve Mimari / Mühendislik Proje Paylaşımları (Md. 1.8 & 4.20)', 'Site Photos, Progress Videos & Architectural Blueprint Sharing (Cl. 1.8 & 4.20)'))}</h2>
          <div style="font-size:12.5px;color:var(--ink-secondary)">${esc(trEn('Sahada eski revizyonla imalat yapılmasını önleyen Güncel Revizyon mührü ve gerçek dosya yükleme kasası.', 'Upload real site photos, MP4 videos, and drawings with live revision seals.'))}</div>
        </div>
        <button class="btn primary" onclick="openUploadMediaModal()">+ ${esc(t('uploadMediaBtn'))}</button>
      </div>

      <div class="media-grid">
        ${items.map(m => {
          const isVid = /\.(mp4|webm|mov)$/i.test(m.url);
          const mediaTag = isVid
            ? `<video src="${esc(m.url)}" controls preload="metadata"></video>`
            : `<img src="${esc(m.url)}" alt="${esc(m.titleTr)}" />`;
          return `
            <div class="media-card">
              <div class="media-preview">${mediaTag}</div>
              <div class="media-body">
                <div style="display:flex;justify-content:space-between;gap:6px;margin-bottom:5px">
                  <span class="pill cobalt">${esc(m.discipline)}</span>
                  <span class="pill emerald">${esc(m.revision)}</span>
                </div>
                <strong style="display:block;margin-bottom:4px">${esc(m.titleTr)}</strong>
                <div style="font-size:12px;color:var(--ink-secondary)">${esc(m.zone)} · ${esc(m.uploadedBy)} · ${esc(m.date)}</div>
                <div style="margin-top:8px;display:flex;justify-content:space-between;align-items:center">
                  <span style="font-size:11.5px;color:var(--cobalt)">${esc(m.fidicClause || 'Md. 4.20')}</span>
                  <a href="${esc(m.url)}" target="_blank" class="btn sm">${esc(trEn('Tam Ekran Aç', 'Open Full'))}</a>
                </div>
              </div>
            </div>
          `;
        }).join('') || `<p>${esc(trEn('Henüz medya yüklenmedi. Sağ üstten fotoğraf, video veya pafta yükleyin.', 'No media yet. Click upload to add photos, videos, or plans.'))}</p>`}
      </div>
    </div>
  `;
}

// 8. VISUAL BLUEPRINT DEFECT PINNING (SNAGS — CLAUSE 11) & STAKEHOLDER FEEDBACK
function renderSnags(prj) {
  const snags = APP.state.snags.filter(x => x.projectId === prj.id);
  const fbs = APP.state.feedbacks.filter(x => x.projectId === prj.id);

  return `
    <div class="two-col">
      <div class="panel">
        <div class="panel-head">
          <div>
            <h2 class="panel-title">${esc(trEn('Mimari Plan Üzerinde Noktasal Eksik İşaretleme (FIDIC Madde 11)', 'Interactive Blueprint Defect / Snag Pinning (FIDIC Clause 11)'))}</h2>
            <div style="font-size:12px;color:var(--ink-secondary)">${esc(trEn('Planın üzerinde herhangi bir odaya/noktaya tıklayarak yeni eksik (#E) bırakın ve ustaya atayın.', 'Click anywhere on the architectural floor plan below to drop a new numbered defect pin.'))}</div>
          </div>
        </div>

        <div class="blueprint-stage" onclick="onBlueprintClick(event)">
          <img src="/samples/kat_plani_rev02.svg" alt="Mimari Kat Planı" />
          ${snags.map(s => `
            <div class="snag-pin ${esc(s.status)}" style="left:${s.xPct}%;top:${s.yPct}%" title="${esc(s.id)}: ${esc(s.titleTr)}" onclick="event.stopPropagation()">
              ${esc(s.id)}
            </div>
          `).join('')}
        </div>

        <div style="margin-top:14px">
          ${snags.map(s => `
            <div class="task-card">
              <div style="display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap">
                <strong>#${esc(s.id)} · ${esc(trEn(s.titleTr, s.titleEn))}</strong>
                <span class="pill ${s.status === 'closed' ? 'emerald' : (s.status === 'ready_for_review' ? 'ochre' : 'crimson')}">
                  ${esc(s.status === 'closed' ? trEn('Onaylandı & Kapandı', 'Approved & Closed') : (s.status === 'ready_for_review' ? trEn('Usta Tamamladı • Mimar Onayı Bekliyor', 'Ready for Architect Review') : trEn('Açık Eksik', 'Open Defect')))}
                </span>
              </div>
              <div style="font-size:12px;color:var(--ink-secondary);margin:4px 0">${esc(s.zone)} · Sorumlu: <strong>${esc(s.assigneeName)}</strong> · Bildiren: ${esc(s.reportedBy)}</div>
              <p style="margin:4px 0 8px;font-size:12.5px">${esc(s.noteTr || '')}</p>
              <div style="display:flex;gap:6px;flex-wrap:wrap">
                ${s.status === 'open' ? `<button class="btn sm" onclick="updateSnagStatus('${esc(s.id)}','ready_for_review')">${esc(trEn('Usta: Düzeltildi İşaretle', 'Master: Mark Fixed'))}</button>` : ''}
                ${s.status !== 'closed' ? `<button class="btn sm emerald" onclick="updateSnagStatus('${esc(s.id)}','closed')">${esc(trEn('Mimar/Mühendis: Onayla & Kapat', 'Architect/Eng: Approve & Close'))}</button>` : ''}
              </div>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- Feedback & RFI Stream -->
      <div class="panel">
        <div class="panel-head">
          <h3 class="panel-title">${esc(trEn('Geri Bildirimler & Saha Teknik Soruları (RFI)', 'Stakeholder Feedback & Field RFIs'))}</h3>
          <button class="btn sm primary" onclick="openFeedbackModal()">+ ${esc(t('addFeedbackBtn'))}</button>
        </div>

        ${fbs.map(f => `
          <div class="task-card">
            <div style="display:flex;justify-content:space-between;gap:6px;margin-bottom:5px">
              <span class="pill cobalt">${esc(f.type)}</span>
              <small style="color:var(--ink-secondary)">${esc(f.createdAt)}</small>
            </div>
            <strong style="font-size:13px">${esc(f.author)} ➔ ${esc(f.target)} (${esc(f.zone)})</strong>
            <p style="margin:6px 0;font-size:13px">${esc(f.messageTr)}</p>
            ${f.replyTr
              ? `<div style="background:var(--emerald-tint);border-left:3px solid #059669;padding:8px 10px;border-radius:6px;font-size:12.5px"><strong>Yanıt:</strong> ${esc(f.replyTr)}</div>`
              : `<button class="btn sm" onclick="replyFeedbackPrompt('${esc(f.id)}')">${esc(trEn('Yanıt Yaz', 'Write Reply'))}</button>`
            }
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

// 9. FIDIC PHILOSOPHY SPINE, INSTAGRAM CAROUSEL CARDS & FULL EMBEDDED TURKISH BOOK
const CAROUSEL_META = [
  { no: '01', title: 'FIDIC Bir Felsefedir', core: 'Denge · Netlik · Sıfır Karmaşa', clause: '1913 Omurgası' },
  { no: '02', title: 'Risk Terazisi', core: 'Riski onu yönetebilene ver', clause: 'Md. 2 – 4' },
  { no: '03', title: '5 Kitap · 5 Ölçek', core: 'Projeyi kim çiziyorsa renk odur', clause: 'Gökkuşağı' },
  { no: '04', title: '5 Altın İlke', core: 'Taşıyıcı kolonlar kesilemez', clause: 'GP 1 – GP 5' },
  { no: '05', title: '6 Adımda 21 Madde', core: 'Kurulumdan kesin kabule tek çizgi', clause: 'Md. 1 – 21' },
  { no: '06', title: 'Görülmeden Gömülmez', core: 'Muayenesiz beton dökülemez', clause: 'Md. 7.3' },
  { no: '07', title: '28 Gün Kalkanı', core: 'Kayıt yoksa hak da yoktur', clause: 'Md. 20.2' },
  { no: '08', title: 'Gecikme vs Verim', core: 'Takvim kayması vs -%45 hız kaybı', clause: 'Md. 8' },
  { no: '09', title: 'Nakit & Kabul Devri', core: '28g onay · 56g ödeme · %50+%50', clause: 'Md. 10 – 14' },
  { no: '10', title: 'Circle FIDIC Açık Kaynak', core: 'github.com/thezencirs/CircleFIDIC', clause: 'MIT · v1.0' }
];

function copyInstagramCaption() {
  const txt = `FIDIC bir sözleşme metni değil, şantiyenin adalet ve düzen felsefesidir.\n\n1913'ten bu yana dünyanın ortak mühendislik dili olan FIDIC omurgasını 10 yalın mimari bilgi kartında özetledik ve açık kaynak bir şantiye işletim sistemine dönüştürdük:\nhttps://github.com/thezencirs/CircleFIDIC\n\n#fidic #mimarlık #inşaatmühendisliği #şantiye #projeyönetimi #thezencirs #circlefidic`;
  navigator.clipboard.writeText(txt).then(() => alert('Instagram açıklama metni panoya kopyalandı!'));
}

function renderFidic(prj) {
  const kb = APP.fidicKb;
  const subTabs = [
    ['philosophy', trEn('Felsefe & 10 Bilgi Kartı (Carousel)', 'Philosophy & 10 Carousel Cards')],
    ['clauses', trEn('Madde 1–21 Sözlük', 'Clauses 1–21')],
    ['books', trEn('9 Kitap Özeti', '9 Books')],
    ['claims', trEn('Süreler & Matris', 'Time-Bars & Matrix')],
    ['files', trEn('78 Dosya Arşivi', '78-File Archive')]
  ].map(([k, lbl]) => `<button class="btn ${APP.fidicSubTab === k ? 'primary' : ''}" onclick="APP.fidicSubTab='${k}';renderAll()">${esc(lbl)}</button>`).join(' ');

  let inner = '';
  if (APP.fidicSubTab === 'philosophy') {
    const idx = APP.carouselIdx || 1;
    const padNo = String(idx).padStart(2, '0');
    const curCard = CAROUSEL_META[idx - 1];
    inner = `
      <!-- Minimalist Architectural Backbone Strip -->
      <div style="display:grid;grid-template-columns:repeat(6,1fr);gap:10px;margin-bottom:20px">
        ${[
          ['01', 'KURULUM', 'Arsa & Teminat', 'Md. 1–4'],
          ['02', 'SAHA & KALİTE', 'Muayene & İaşe', 'Md. 5–7'],
          ['03', 'ZAMAN & HIZ', 'Program & Hava', 'Md. 8'],
          ['04', 'HAKEDİŞ', '28g IPC · 56g Ödeme', 'Md. 12–14'],
          ['05', 'TESLİM', 'Risk & %50+%50 Devir', 'Md. 9–11'],
          ['06', 'KALKAN', '28 Gün Time-Bar & DAAB', 'Md. 20–21']
        ].map(([n, h, s, cl]) => `
          <div style="border:1px solid var(--border);border-top:3px solid var(--cobalt-bright);border-radius:10px;padding:12px;background:var(--surface-alt)">
            <div style="display:flex;justify-content:space-between;font-size:11px;font-weight:800;color:var(--cobalt)"><span>${n}</span><span>${cl}</span></div>
            <strong style="display:block;font-size:13.5px;margin:5px 0 2px">${h}</strong>
            <span style="font-size:11.5px;color:var(--ink-secondary)">${s}</span>
          </div>
        `).join('')}
      </div>

      <!-- Interactive Carousel Stage + 10-Card Grid -->
      <div class="two-col" style="align-items:start">
        <div style="background:var(--surface-alt);border:1px solid var(--border);border-radius:14px;padding:18px;text-align:center">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
            <button class="btn" onclick="APP.carouselIdx = APP.carouselIdx > 1 ? APP.carouselIdx - 1 : 10; renderAll()">◀ Önceki Kart</button>
            <div>
              <strong>Kart ${padNo} / 10 — ${esc(curCard.title)}</strong>
              <div style="font-size:12px;color:var(--ink-secondary)">1080 × 1350 px (4:5 Instagram Carousel Standardı)</div>
            </div>
            <button class="btn" onclick="APP.carouselIdx = APP.carouselIdx < 10 ? APP.carouselIdx + 1 : 1; renderAll()">Sonraki Kart ▶</button>
          </div>
          <img src="/carousel/${padNo}.png" alt="${esc(curCard.title)}" style="max-width:410px;width:100%;border-radius:10px;border:1px solid var(--border);box-shadow:0 10px 28px rgba(15,23,42,0.12)" />
          <div style="display:flex;justify-content:center;gap:8px;margin-top:14px;flex-wrap:wrap">
            <a class="btn primary" href="/carousel/${padNo}.png" download="FIDIC_Kart_${padNo}.png">Bu Kartı İndir (PNG)</a>
            <button class="btn emerald" onclick="copyInstagramCaption()">Instagram Açıklamasını Kopyala</button>
            <a class="btn" href="https://github.com/thezencirs/CircleFIDIC" target="_blank">github.com/thezencirs/CircleFIDIC</a>
          </div>
        </div>

        <div>
          <h3 class="panel-title" style="margin:0 0 10px">10'lu Minimalist FIDIC Bilgi Kartı Serisi (Tıklayıp Büyütün)</h3>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
            ${CAROUSEL_META.map((m, i) => `
              <div onclick="APP.carouselIdx=${i + 1};renderAll()" style="cursor:pointer;border:1.5px solid ${idx === i + 1 ? 'var(--cobalt-bright)' : 'var(--border)'};background:${idx === i + 1 ? 'var(--cobalt-tint)' : 'var(--surface)'};border-radius:9px;padding:9px 11px">
                <div style="display:flex;justify-content:space-between;font-size:11px;font-weight:800;color:var(--cobalt)"><span>KART ${m.no}</span><span>${esc(m.clause)}</span></div>
                <strong style="display:block;font-size:13px;margin:3px 0">${esc(m.title)}</strong>
                <span style="font-size:11.5px;color:var(--ink-secondary)">${esc(m.core)}</span>
              </div>
            `).join('')}
          </div>
          <!-- One-Time Master Voice Profile (Zero-Shot Local GPU Voice Cloning) -->
          <div style="margin-top:12px;padding:14px 16px;border-radius:11px;background:var(--surface);border:1.5px solid var(--cobalt-bright)">
            <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:8px">
              <div>
                <strong style="font-size:14px">Tek Seferlik Ses Profilim — Kendi Sesinle Otomatik Video</strong>
                <div style="font-size:11.5px;color:var(--ink-secondary)">Yalnızca 1 kez ~20 saniye ses verin; bundan sonraki tüm videolar tek tek kayıt almadan kendi sesinizle üretilir.</div>
              </div>
              ${APP.voiceProfile && APP.voiceProfile.exists
                ? `<span class="pill emerald">Ses Profili Hazır · ${esc(APP.voiceProfile.updated || '')}</span>`
                : `<span class="pill amber">20 sn Referans Ses Bekleniyor</span>`}
            </div>

            <div style="padding:9px 12px;border-radius:8px;background:var(--surface-alt);border:1px dashed var(--border);font-size:12.5px;line-height:1.5;margin-bottom:10px">
              <span style="font-size:11px;font-weight:700;color:var(--cobalt);display:block;margin-bottom:2px">ÖRNEK OKUMA METNİ (~20 SANİYE DOĞAL TONLA OKUYUN VEYA MEVCUT SES/VİDEO DOSYANIZI SEÇİN):</span>
              “Merhaba, ben Mehmet Zencir. Şantiyelerde gerçek kalite; doğru planlama, net sorumluluk ve zamanında tutulan kayıtlarla kurulur. Mimari tasarımdan kesin kabule kadar her adımı şeffaf ve adil yönetiyoruz.”
            </div>

            <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
              <button class="btn ${APP.isRecordingVoice ? 'danger' : 'primary'}" onclick="toggleMicVoiceRecording()">
                ${APP.isRecordingVoice ? '■ Kaydı Bitir ve Profil Yap' : '● Mikrofondan Kaydet (20 sn)'}
              </button>
              ${APP.isRecordingVoice ? `<span id="lblRecTimer" style="font-size:12.5px;font-weight:700;color:#DC2626">${APP.recSeconds} sn kaydediliyor...</span>` : ''}
              <label class="btn" style="cursor:pointer;margin:0">
                Ses / Video Dosyası Seç (.wav / .mp3 / .m4a / .mp4)
                <input type="file" accept="audio/*,video/*" style="display:none" onchange="uploadVoiceFile(this)" />
              </label>
              ${APP.voiceProfile && APP.voiceProfile.exists ? `
                <button class="btn emerald" ${APP.voiceProfile.renderState === 'running' ? 'disabled' : ''} onclick="triggerMyVoiceVideoRender()">
                  ${APP.voiceProfile.renderState === 'running' ? 'Yerel GPU Üretiyor...' : 'Kendi Sesimle Videoları Üret (Yerel GPU)'}
                </button>
                <audio controls src="${esc(APP.voiceProfile.url)}" style="height:32px;max-width:220px"></audio>
              ` : ''}
            </div>

            ${APP.voiceProfile && APP.voiceProfile.renderMessage ? `
              <div id="lblVoiceRenderMsg" style="margin-top:9px;padding:7px 10px;border-radius:7px;background:var(--cobalt-tint);font-size:12px;font-weight:600;color:var(--cobalt)">
                ${esc(APP.voiceProfile.renderMessage)}
              </div>
            ` : ''}
          </div>

          <div style="margin-top:12px;padding:13px 15px;border-radius:11px;background:var(--surface-alt);border:1px solid var(--border)">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;flex-wrap:wrap;gap:6px">
              <strong>Seslendirmeli Animasyonlu FIDIC Felsefesi Videosu (Açık Kaynak Stüdyo + Türkçe Ses)</strong>
              <div style="display:flex;gap:6px">
                <a class="btn sm primary" href="/videos/FIDIC_Felsefesi_9x16_Reels_Sesli.mp4?v=${esc((APP.voiceProfile && APP.voiceProfile.videoVer) || '1')}" download="FIDIC_Felsefesi_9x16_Reels_Sesli.mp4">9:16 Reels İndir (.mp4)</a>
                <a class="btn sm" href="/videos/FIDIC_Felsefesi_16x9_Sunum_Sesli.mp4?v=${esc((APP.voiceProfile && APP.voiceProfile.videoVer) || '1')}" download="FIDIC_Felsefesi_16x9_Sunum_Sesli.mp4">16:9 Sunum İndir (.mp4)</a>
              </div>
            </div>
            <video src="/videos/FIDIC_Felsefesi_16x9_Sunum_Sesli.mp4?v=${esc((APP.voiceProfile && APP.voiceProfile.videoVer) || '1')}" controls preload="metadata" style="width:100%;border-radius:8px;border:1px solid var(--border);background:#0F172A"></video>
            <div style="margin-top:8px;font-size:11.5px;color:var(--ink-secondary)">
              <strong>Klasör:</strong> <code>D:\\26FIDIC\\Instagram_FIDIC_Carousel_Kartlari\\</code> · <strong>Açık Kaynak Video Motoru:</strong> <code>github.com/thezencirs/CircleFIDIC/tree/main/video-studio</code>
            </div>
          </div>
        </div>
      </div>
    `;
  } else if (!kb) {
    inner = `<p>FIDIC kütüphanesi yükleniyor...</p>`;
  } else if (APP.fidicSubTab === 'books') {
    inner = `<div class="equal-col">${kb.books.map(b => `
      <div class="task-card" style="margin:0">
        <span class="pill cobalt">${esc(b.code)}</span>
        <h3 style="margin:6px 0 4px;font-size:15.5px">${esc(b.tr_name)}</h3>
        <div style="font-size:12px;color:var(--ink-secondary);margin-bottom:8px">${esc(b.en_name)}</div>
        <p style="font-size:13px;margin:0 0 8px">${esc(b.summary)}</p>
        <div style="font-size:12px;background:var(--surface-alt);padding:8px 10px;border-radius:8px">
          <div><strong>Tasarım:</strong> ${esc(b.designer)}</div>
          <div><strong>Ödeme:</strong> ${esc(b.payment)}</div>
          <div><strong>Ölçek:</strong> ${esc(b.scale)}</div>
        </div>
      </div>
    `).join('')}</div>`;
  } else if (APP.fidicSubTab === 'claims') {
    inner = `
      <h3 class="panel-title" style="margin-bottom:8px">Kritik Hak Düşürücü Süreler (Time-Bars)</h3>
      <table class="data-table" style="margin-bottom:18px">
        <thead><tr><th>Süre</th><th>Maddeler</th><th>Açıklama</th></tr></thead>
        <tbody>${kb.timeBars.map(tb => `<tr><td><strong>${esc(tb.days)}</strong></td><td><code>${esc(tb.clause)}</code></td><td>${esc(tb.desc)}</td></tr>`).join('')}</tbody>
      </table>
      <h3 class="panel-title" style="margin-bottom:8px">Yüklenici T / C / M Hak Talebi Matrisi</h3>
      <table class="data-table">
        <thead><tr><th>Madde</th><th>Olay</th><th>Hak</th><th>Şart</th></tr></thead>
        <tbody>${kb.contractorClaims.map(c => `<tr><td><strong>Md. ${esc(c.clause)}</strong></td><td>${esc(c.event)}</td><td><span class="pill emerald">${esc(c.entitlement)}</span></td><td>${esc(c.notice)}</td></tr>`).join('')}</tbody>
      </table>
    `;
  } else if (APP.fidicSubTab === 'files') {
    inner = `
      <table class="data-table">
        <thead><tr><th>#</th><th>Orijinal Dosya</th><th>Boyut</th><th>Türkçe Kitap Başlığı</th><th>Özet & Aç</th></tr></thead>
        <tbody>
          ${kb.files.map(f => `
            <tr>
              <td>${f.index}</td>
              <td><strong>${esc(f.file)}</strong></td>
              <td class="tabular">${f.size_mb.toFixed(2)} MB</td>
              <td><strong>${esc(f.tr_title)}</strong><br><small style="color:var(--ink-secondary)">${esc(f.tr_desc)}</small></td>
              <td>
                <a class="btn sm" href="/fidic-library/${encodeURIComponent(f.file)}" target="_blank">Oku</a>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  } else {
    const q = (APP.fidicSearch || '').trim().toLowerCase();
    inner = `
      <div style="margin-bottom:14px">
        <input type="search" value="${esc(APP.fidicSearch)}" placeholder="21 Ana Madde ve 142 Alt Hüküm içinde ara (ör. 20.2, gecikme, yemekhane, hakediş, zemin)..."
          style="width:100%;padding:10px 14px;border-radius:9px;border:1px solid var(--border);background:var(--surface-alt);color:var(--ink);font-size:14px"
          oninput="APP.fidicSearch=this.value;renderAll()" />
      </div>
      ${kb.clauses.map(cl => {
        const subs = cl.subclauses.filter(([scNum, scTitle, scDesc]) => {
          if (!q) return true;
          return (scNum + ' ' + scTitle + ' ' + scDesc + ' ' + cl.tr_title).toLowerCase().includes(q);
        });
        if (!subs.length) return '';
        return `
          <div class="task-card" style="margin-bottom:14px">
            <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:6px">
              <div>
                <span class="pill cobalt">${esc(cl.num)}</span>
                <strong style="font-size:16px;margin-left:6px">${esc(cl.tr_title)}</strong>
                <small style="color:var(--ink-secondary);margin-left:6px">${esc(cl.en_title)}</small>
              </div>
              <span class="pill emerald">${esc(cl.phase)}</span>
            </div>
            <p style="margin:0 0 10px;color:var(--ink-secondary);font-size:13px">${esc(cl.overview)}</p>
            <div style="display:grid;gap:7px">
              ${subs.map(([scNum, scTitle, scDesc]) => `
                <div style="background:var(--surface-alt);border:1px solid var(--border);border-radius:8px;padding:9px 12px">
                  <strong>Alt Madde ${esc(scNum)} — ${esc(scTitle)}</strong>
                  <div style="font-size:13px;margin-top:3px">${esc(scDesc)}</div>
                </div>
              `).join('')}
            </div>
          </div>
        `;
      }).join('')}
    `;
  }

  return `
    <div class="panel">
      <div class="panel-head">
        <div>
          <h2 class="panel-title" style="font-size:18px">${esc(trEn('FIDIC Sözleşme Kalkanı & Temelden Bitişe Eksiksiz Türkçe Başucu Kitabı', 'FIDIC Contract Shield & Complete Foundation-to-Completion Book'))}</h2>
          <div style="font-size:12.5px;color:var(--ink-secondary)">D:\\26FIDIC klasörünüzdeki 78 dosyanın tamamı madde madde Türkçe kitaplaştırılmış ve canlı proje yönetimine bağlanmıştır.</div>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <button class="btn emerald" onclick="openNoticeGeneratorModal()">+ ${esc(t('createNoticeBtn'))}</button>
          <a class="btn primary" href="/fidic-library/00_FIDIC_TURKCE_GORSEL_KITAP_V2_RESIMLI_SEMALI.html" target="_blank">Görsel Kitap v2 (Resimli &amp; Çizimli)</a>
          <button class="btn" onclick="openLocalFidicBook('00_FIDIC_TURKCE_GORSEL_KITAP_V2_RESIMLI_SEMALI.pdf')">Görsel PDF v2</button>
          <a class="btn" href="/fidic-library/00_FIDIC_TURKCE_BASUCU_KITABI_TEMELDEN_BITISE.html" target="_blank">İlk Sürüm v1</a>
        </div>
      </div>

      <div style="display:flex;gap:6px;margin-bottom:16px;flex-wrap:wrap">${subTabs}</div>
      ${inner}
    </div>
  `;
}

// ================= INTERACTIVE ACTIONS & MODALS =================

function openModal(htmlContent) {
  document.getElementById('appModalContent').innerHTML = htmlContent;
  document.getElementById('appModal').classList.add('open');
}

function closeModal() {
  document.getElementById('appModal').classList.remove('open');
}

async function openLocalFidicBook(fileName) {
  const res = await fetch('/api/open-fidic-local', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ file: fileName })
  });
  if (!res.ok) {
    window.open('/fidic-library/' + encodeURIComponent(fileName), '_blank');
  }
}

async function updateTaskProgress(taskId, pct) {
  await fetch('/api/tasks/progress', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: taskId, progress: pct })
  });
  const tsk = APP.state.tasks.find(x => x.id === taskId);
  if (tsk) {
    tsk.progress = pct;
    tsk.status = pct >= 100 ? 'done' : 'in_progress';
  }
  renderAll();
}

async function updateSnagStatus(snagId, status) {
  const note = status === 'ready_for_review'
    ? `${APP.currentUser.name}: Saha düzeltmesi tamamlandı, kontrol onayı bekleniyor.`
    : `${APP.currentUser.name}: Yerinde kontrol edildi ve Madde 11 kapsamında kapatıldı.`;
  await fetch('/api/snags/status', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: snagId, status, noteTr: note })
  });
  const s = APP.state.snags.find(x => x.id === snagId);
  if (s) { s.status = status; s.noteTr = note; }
  renderAll();
}

function onBlueprintClick(ev) {
  const rect = ev.currentTarget.getBoundingClientRect();
  const xPct = Math.round(((ev.clientX - rect.left) / rect.width) * 1000) / 10;
  const yPct = Math.round(((ev.clientY - rect.top) / rect.height) * 1000) / 10;
  const usersOpts = APP.state.users.map(u => `<option value="${esc(u.name)}" data-role="${esc(u.role)}">${esc(u.name)} (${esc(u.titleTr)})</option>`).join('');

  openModal(`
    <h3 style="margin-top:0">Kat Planı Üzerinde Yeni Eksik / Kusur İşaretle (Konum: %${xPct}, %${yPct})</h3>
    <div class="form-grid">
      <label class="fld">Mahal / Oda Adı<input id="snZone" value="Mahal A-102 · Kat 3"/></label>
      <label class="fld">Eksik / Kusur Tanımı<input id="snTitle" placeholder="Örn: Süpürgelik köşe birleşim derzi eksik"/></label>
      <div class="form-row-2">
        <label class="fld">Sorumlu Usta / Ekip<select id="snAssignee">${usersOpts}</select></label>
        <label class="fld">Öncelik<select id="snSev"><option value="high">Yüksek</option><option value="critical">Kritik</option><option value="normal">Normal</option></select></label>
      </div>
      <label class="fld">Termin Tarihi<input type="date" id="snDue" value="2026-11-26"/></label>
      <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:8px">
        <button class="btn" onclick="closeModal()">Vazgeç</button>
        <button class="btn primary" onclick="submitNewSnag(${xPct}, ${yPct})">Plana İşle & Görevlendir</button>
      </div>
    </div>
  `);
}

async function submitNewSnag(xPct, yPct) {
  const prj = getActiveProject();
  const sel = document.getElementById('snAssignee');
  const assigneeName = sel.value;
  const assigneeRole = sel.options[sel.selectedIndex].getAttribute('data-role') || 'master';
  const titleTr = document.getElementById('snTitle').value.trim() || 'Saha İmalat Eksikliği';
  const payload = {
    projectId: prj.id,
    xPct, yPct,
    zone: document.getElementById('snZone').value,
    titleTr,
    titleEn: titleTr,
    severity: document.getElementById('snSev').value,
    assigneeName,
    assigneeRole,
    reportedBy: APP.currentUser.name,
    fidicClause: 'Md. 11.1',
    dueDate: document.getElementById('snDue').value,
    status: 'open',
    noteTr: 'Plan üzerinden noktasal işaretlendi.'
  };
  const res = await fetch('/api/snags', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
  const created = await res.json();
  APP.state.snags.unshift(created);
  closeModal();
  renderAll();
}

function openLoginModal() {
  openModal(`
    <h3 style="margin-top:0">Ayrı Kullanıcı Girişi & Rol Yönetimi</h3>
    <p style="font-size:12.5px;color:var(--ink-secondary)">Yatırımcı, Yürütücü, Mimar, Şantiye Şefi veya Sahadaki Usta kendi hesabıyla giriş yapar; ekran o rolün sorumluluklarına göre şekillenir.</p>
    <div style="display:grid;gap:8px;margin-bottom:18px">
      ${APP.state.users.map(u => `
        <div style="display:flex;justify-content:space-between;align-items:center;border:1px solid var(--border);border-radius:9px;padding:9px 12px">
          <div>
            <strong>${esc(u.name)}</strong> <span class="pill cobalt">${esc(u.fidicClause)}</span>
            <div style="font-size:12px;color:var(--ink-secondary)">${esc(u.titleTr)} · Saha: ${esc(u.location)} · PIN: <code>${esc(u.pin)}</code></div>
          </div>
          <button class="btn sm ${u.id === APP.currentUser.id ? 'emerald' : 'primary'}" onclick="switchRoleQuick('${esc(u.id)}');closeModal()">
            ${u.id === APP.currentUser.id ? 'Aktif Oturum' : 'Bu Hesapla Gir'}
          </button>
        </div>
      `).join('')}
    </div>
    <h4 style="margin:0 0 8px">+ Yeni Ekip Üyesi / Usta / Mühendis Hesabı Aç</h4>
    <div class="form-row-2">
      <label class="fld">Ad Soyad<input id="nuName" placeholder="Örn: Ahmet Yılmaz"/></label>
      <label class="fld">Rol Kabuğu
        <select id="nuRole">
          <option value="master">Saha Ustası / Ekipbaşı (Md. 6-7)</option>
          <option value="sitemanager">Şantiye Şefi / Saha Mühendisi (Md. 4)</option>
          <option value="architect">Mimar / Tasarım Ofisi (Md. 5)</option>
          <option value="engineer">Proje Yürütücüsü / Mühendis (Md. 3)</option>
          <option value="employer">Yatırımcı / İşveren (Md. 2)</option>
        </select>
      </label>
      <label class="fld">Ünvan / Uzmanlık<input id="nuTitle" placeholder="Örn: Elektrik Ustabaşı"/></label>
      <label class="fld">Giriş PIN Kodu<input id="nuPin" value="2026"/></label>
    </div>
    <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:12px">
      <button class="btn" onclick="closeModal()">Kapat</button>
      <button class="btn primary" onclick="submitNewUser()">Hesap Oluştur & Giriş Yap</button>
    </div>
  `);
}

async function submitNewUser() {
  const name = document.getElementById('nuName').value.trim();
  if (!name) return;
  const role = document.getElementById('nuRole').value;
  const titleTr = document.getElementById('nuTitle').value.trim() || 'Proje Ekip Üyesi';
  const payload = {
    name, role, titleTr, titleEn: titleTr,
    fidicClause: role === 'master' ? 'Madde 6 & 7' : 'Madde 4',
    pin: document.getElementById('nuPin').value || '2026',
    location: 'Şantiye Saha'
  };
  const res = await fetch('/api/users', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
  const u = await res.json();
  APP.state.users.push(u);
  APP.currentUser = u;
  closeModal();
  renderAll();
}

function openAddTaskModal() {
  const usersOpts = APP.state.users.map(u => `<option value="${esc(u.id)}">${esc(u.name)} — ${esc(u.titleTr)}</option>`).join('');
  openModal(`
    <h3 style="margin-top:0">Yeni Sorumluluk / İş Paketi Ata</h3>
    <div class="form-grid">
      <label class="fld">Görev Başlığı<input id="tkTitle" placeholder="Örn: B-Blok 4. Kat Elektrik Tava Montajı"/></label>
      <div class="form-row-2">
        <label class="fld">Bölge / Kat / Mahal<input id="tkZone" value="A-Kule · Kat 4"/></label>
        <label class="fld">Sorumlu Kişi<select id="tkUser">${usersOpts}</select></label>
        <label class="fld">İlgili FIDIC Maddesi<input id="tkClause" value="Md. 7.1 & 8.3"/></label>
        <label class="fld">Öncelik<select id="tkPrio"><option value="high">Yüksek</option><option value="critical">Kritik</option><option value="normal">Normal</option></select></label>
      </div>
      <label class="fld">Termin Tarihi<input type="date" id="tkDue" value="2026-11-29"/></label>
      <label class="fld">Teknik Talimat & Kalite Kriteri<textarea id="tkDesc" rows="2" placeholder="Kontrol ve teslim şartı..."></textarea></label>
      <div style="display:flex;justify-content:flex-end;gap:8px">
        <button class="btn" onclick="closeModal()">Vazgeç</button>
        <button class="btn primary" onclick="submitNewTask()">Sorumluluğu Dağıt</button>
      </div>
    </div>
  `);
}

async function submitNewTask() {
  const prj = getActiveProject();
  const u = APP.state.users.find(x => x.id === document.getElementById('tkUser').value) || APP.currentUser;
  const titleTr = document.getElementById('tkTitle').value.trim();
  if (!titleTr) return;
  const payload = {
    projectId: prj.id,
    titleTr, titleEn: titleTr,
    zone: document.getElementById('tkZone').value,
    assigneeId: u.id,
    assigneeName: u.name,
    assigneeRole: u.role,
    fidicClause: document.getElementById('tkClause').value,
    priority: document.getElementById('tkPrio').value,
    dueDate: document.getElementById('tkDue').value,
    progress: 0,
    status: 'open',
    instructionTr: document.getElementById('tkDesc').value
  };
  const res = await fetch('/api/tasks', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
  const created = await res.json();
  APP.state.tasks.unshift(created);
  closeModal();
  renderAll();
}

function openAddMealModal() {
  const prj = getActiveProject();
  openModal(`
    <h3 style="margin-top:0">Günlük Şantiye Puantajı & Yemek / İaşe Kaydı (Md. 6.6 & 6.10)</h3>
    <div class="form-grid">
      <div class="form-row-2">
        <label class="fld">Tarih<input type="date" id="mlDate" value="2026-11-22"/></label>
        <label class="fld">Aktif Saha Personel Sayısı (Puantaj)<input type="number" id="mlHead" value="${prj.numbers.activeWorkers}"/></label>
        <label class="fld">Sabah Kahvaltısı<input type="number" id="mlBrk" value="${Math.round(prj.numbers.activeWorkers * 0.9)}"/></label>
        <label class="fld">Öğle Yemeği Porsiyon<input type="number" id="mlLun" value="${prj.numbers.activeWorkers + 3}"/></label>
        <label class="fld">Akşam Yemeği<input type="number" id="mlDin" value="${Math.round(prj.numbers.activeWorkers * 0.4)}"/></label>
        <label class="fld">Gece Vardiyası Kumanya<input type="number" id="mlNig" value="20"/></label>
        <label class="fld">İçme Suyu (Damacana)<input type="number" id="mlWat" value="40"/></label>
        <label class="fld">Porsiyon Birim Maliyeti (₺)<input type="number" id="mlCost" value="215"/></label>
      </div>
      <label class="fld">Günün Menüsü<input id="mlMenu" value="Mercimek Çorbası • Et Sote • Bulgur Pilavı • Ayran & Meyve"/></label>
      <div style="display:flex;justify-content:flex-end;gap:8px">
        <button class="btn" onclick="closeModal()">Vazgeç</button>
        <button class="btn primary" onclick="submitNewMeal()">Kaydet & Puantajla Eşitle</button>
      </div>
    </div>
  `);
}

async function submitNewMeal() {
  const prj = getActiveProject();
  const hc = Number(document.getElementById('mlHead').value || 0);
  const payload = {
    projectId: prj.id,
    date: document.getElementById('mlDate').value,
    activeHeadcount: hc,
    breakfast: Number(document.getElementById('mlBrk').value || 0),
    lunch: Number(document.getElementById('mlLun').value || 0),
    dinner: Number(document.getElementById('mlDin').value || 0),
    nightShift: Number(document.getElementById('mlNig').value || 0),
    waterJugs: Number(document.getElementById('mlWat').value || 0),
    unitCostTl: Number(document.getElementById('mlCost').value || 215),
    menuTr: document.getElementById('mlMenu').value,
    menuEn: document.getElementById('mlMenu').value,
    noteTr: `${APP.currentUser.name} tarafından saha puantajıyla doğrulandı.`
  };
  const res = await fetch('/api/meals', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
  const created = await res.json();
  APP.state.meals.unshift(created);
  if (hc > 0) prj.numbers.activeWorkers = hc;
  closeModal();
  renderAll();
}

function openAddHourModal() {
  openModal(`
    <h3 style="margin-top:0">Saatlik Şantiye İlerleme Kaydı Ekle</h3>
    <div class="form-grid">
      <div class="form-row-2">
        <label class="fld">Saat<input type="time" id="hrTime" value="15:30"/></label>
        <label class="fld">Mahal / Bölge<input id="hrZone" value="A-Kule Kat 12"/></label>
      </div>
      <label class="fld">Yapılan İmalat / Olay<input id="hrTitle" placeholder="Örn: Kolon kalıp şakül kontrolü ve beton döküm onayı"/></label>
      <label class="fld">Ölçülen Hız / Miktar<input id="hrMetric" value="32 m²/saat • Onaylı"/></label>
      <div style="display:flex;justify-content:flex-end;gap:8px">
        <button class="btn" onclick="closeModal()">Vazgeç</button>
        <button class="btn primary" onclick="submitNewHour()">Saatlik Akışa Ekle</button>
      </div>
    </div>
  `);
}

async function submitNewHour() {
  const prj = getActiveProject();
  const titleTr = document.getElementById('hrTitle').value.trim();
  if (!titleTr) return;
  const item = {
    projectId: prj.id,
    time: document.getElementById('hrTime').value,
    titleTr, titleEn: titleTr,
    zone: document.getElementById('hrZone').value,
    owner: APP.currentUser.name,
    metric: document.getElementById('hrMetric').value,
    status: 'done'
  };
  await fetch('/api/hourly', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(item) });
  prj.hourlyLogs.unshift(item);
  closeModal();
  renderAll();
}

function openUploadMediaModal() {
  openModal(`
    <h3 style="margin-top:0">Saha Fotoğrafı, İlerleme Videosu veya Proje Paftası Yükle</h3>
    <form id="frmMediaUpload" class="form-grid" onsubmit="submitMediaUpload(event)">
      <label class="fld">Dosya Seçin (.jpg, .png, .webp, .mp4, .svg, .pdf)<input type="file" name="file" required /></label>
      <label class="fld">Başlık / Açıklama<input name="titleTr" required placeholder="Örn: A-Kule 3. Kat Seramik Uygulama Fotoğrafı"/></label>
      <div class="form-row-2">
        <label class="fld">Disiplin / Tür
          <select name="discipline">
            <option>Saha İlerleme Fotosu</option>
            <option>Saha İlerleme Videosu</option>
            <option>Mimari Pafta</option>
            <option>Statik / Betonarme</option>
            <option>Mekanik / Elektrik (MEP)</option>
            <option>As-Built (Yapıldı Projesi)</option>
          </select>
        </label>
        <label class="fld">Revizyon Kodu<input name="revision" value="Rev.02 (Sahada Geçerli)"/></label>
        <label class="fld">Bölge / Kat / Mahal<input name="zone" value="A-Kule Kat 3"/></label>
        <label class="fld">FIDIC Maddesi<input name="fidicClause" value="Md. 4.20 & 7.3"/></label>
      </div>
      <div style="display:flex;justify-content:flex-end;gap:8px">
        <button type="button" class="btn" onclick="closeModal()">Vazgeç</button>
        <button type="submit" class="btn primary">Kasaya Yükle & Paylaş</button>
      </div>
    </form>
  `);
}

async function submitMediaUpload(ev) {
  ev.preventDefault();
  const prj = getActiveProject();
  const fd = new FormData(ev.target);
  fd.append('projectId', prj.id);
  fd.append('kind', 'photo');
  fd.append('uploadedBy', APP.currentUser.name);
  const res = await fetch('/api/media/upload', { method: 'POST', body: fd });
  const created = await res.json();
  APP.state.media.unshift(created);
  closeModal();
  APP.tab = 'media';
  renderAll();
}

function openFeedbackModal() {
  openModal(`
    <h3 style="margin-top:0">Geri Bildirim veya Saha Teknik Sorusu (RFI) Gönder</h3>
    <div class="form-grid">
      <div class="form-row-2">
        <label class="fld">Tür<select id="fbType"><option>Saha Teknik Sorusu (RFI)</option><option>Yatırımcı Geri Bildirimi</option><option>Mimari Detay Notu</option><option>Malzeme / Lojistik Uyarısı</option></select></label>
        <label class="fld">Muhatap Rol / Kişi<input id="fbTarget" value="Zeynep Arslan (Baş Mimar)"/></label>
      </div>
      <label class="fld">İlgili Mahal / Bölge<input id="fbZone" value="A-Kule Kat 3"/></label>
      <label class="fld">Mesajınız<textarea id="fbMsg" rows="3" placeholder="Sahadaki durumu veya sorunuzu açıkça yazın..."></textarea></label>
      <div style="display:flex;justify-content:flex-end;gap:8px">
        <button class="btn" onclick="closeModal()">Vazgeç</button>
        <button class="btn primary" onclick="submitNewFeedback()">Gönder</button>
      </div>
    </div>
  `);
}

async function submitNewFeedback() {
  const prj = getActiveProject();
  const messageTr = document.getElementById('fbMsg').value.trim();
  if (!messageTr) return;
  const payload = {
    projectId: prj.id,
    author: APP.currentUser.name,
    role: APP.currentUser.role,
    target: document.getElementById('fbTarget').value,
    zone: document.getElementById('fbZone').value,
    type: document.getElementById('fbType').value,
    createdAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
    messageTr,
    replyTr: '',
    status: 'open'
  };
  const res = await fetch('/api/feedbacks', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
  const created = await res.json();
  APP.state.feedbacks.unshift(created);
  closeModal();
  APP.tab = 'snags';
  renderAll();
}

async function replyFeedbackPrompt(fbId) {
  openModal(`
    <h3 style="margin-top:0">Geri Bildirime / Saha Sorusuna Yanıt Ver</h3>
    <div class="form-grid">
      <label class="fld">Yanıtınız (${esc(APP.currentUser.name)})<textarea id="fbReplyTxt" rows="3" placeholder="Uygulama kararını yazın..."></textarea></label>
      <div style="display:flex;justify-content:flex-end;gap:8px">
        <button class="btn" onclick="closeModal()">Vazgeç</button>
        <button class="btn primary" onclick="submitFeedbackReply('${esc(fbId)}')">Yanıtı Kaydet</button>
      </div>
    </div>
  `);
}

async function submitFeedbackReply(fbId) {
  const txt = `${APP.currentUser.name}: ` + document.getElementById('fbReplyTxt').value.trim();
  await fetch('/api/feedbacks/reply', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: fbId, replyTr: txt }) });
  const fb = APP.state.feedbacks.find(x => x.id === fbId);
  if (fb) { fb.replyTr = txt; fb.status = 'answered'; }
  closeModal();
  renderAll();
}

async function logWeatherEotNotice() {
  const prj = getActiveProject();
  const cur = APP.weather?.current || { temperature_2m: 14, wind_speed_10m: 22 };
  const payload = {
    projectId: prj.id,
    clause: 'Madde 8.5(c) & 20.2.1',
    typeTr: 'Hava Muhalefeti Çağdaş Kayıt & Süre Uzatımı (EOT) Bildirimi',
    titleTr: `${prj.city} Saha Meteoroloji Kaydı (${cur.temperature_2m}°C, Rüzgar ${cur.wind_speed_10m} km/s) — 28 Gün Kalkanı`,
    eventDate: new Date().toISOString().slice(0, 10),
    deadlineDate: new Date(Date.now() + 28 * 86400000).toISOString().slice(0, 10),
    daysLeft: 28,
    entitlement: 'Sadece T (Süre Uzatımı)',
    owner: APP.currentUser.name,
    status: 'on_track'
  };
  const res = await fetch('/api/notices', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
  const created = await res.json();
  APP.state.notices.unshift(created);
  APP.tab = 'overview';
  renderAll();
}

function openNoticeGeneratorModal() {
  const prj = getActiveProject();
  openModal(`
    <h3 style="margin-top:0">Resmi FIDIC Bildirimi Üretici (Madde 1.3 & 20.2.1 Uyumlu TR / EN)</h3>
    <div class="form-grid">
      <label class="fld">Bildirim Türü ve Dayanak Maddesi
        <select id="ntClause">
          <option value="Madde 20.2.1 & 1.9">Madde 1.9 & 20.2.1 — Geciken Uygulama Çizimi / Talimat Bildirimi (T + M)</option>
          <option value="Madde 20.2.1 & 4.12">Madde 4.12 & 20.2.1 — Öngörülemeyen Fiziksel Zemin Koşulu Bildirimi (T + C)</option>
          <option value="Madde 8.4">Madde 8.4 — Erken Uyarı Bildirimi (Advance Warning)</option>
          <option value="Madde 13.3">Madde 13.3 — Varyasyon / Kapsam Değişikliği Teklifi</option>
          <option value="Madde 16.1">Madde 16.1 — Geciken Hakediş Ödemesi 21 Gün Ön İhtarı</option>
        </select>
      </label>
      <label class="fld">Olay Başlığı ve Saha Etkisi<input id="ntTitle" placeholder="Örn: C-Aksı Revize Statik Donatı Paftasının Gecikmesi"/></label>
      <label class="fld">Olayın Fark Edildiği Tarih (28 Gün Sayacı Başlangıcı)<input type="date" id="ntDate" value="2026-11-22"/></label>
      <div style="display:flex;justify-content:flex-end;gap:8px">
        <button class="btn" onclick="closeModal()">Vazgeç</button>
        <button class="btn primary" onclick="submitFormalNotice('${esc(prj.id)}')">28 Gün Kalkanına Kaydet</button>
      </div>
    </div>
  `);
}

async function submitFormalNotice(projectId) {
  const titleTr = document.getElementById('ntTitle').value.trim() || 'Resmi Sözleşmesel Bildirim';
  const evDate = document.getElementById('ntDate').value;
  const dlDate = new Date(new Date(evDate).getTime() + 28 * 86400000).toISOString().slice(0, 10);
  const payload = {
    projectId,
    clause: document.getElementById('ntClause').value,
    typeTr: 'Madde 1.3 Resmi Yazılı Bildirim',
    titleTr,
    eventDate: evDate,
    deadlineDate: dlDate,
    daysLeft: 28,
    entitlement: 'Madde 20.2 Koruması Altında',
    owner: APP.currentUser.name,
    status: 'on_track'
  };
  const res = await fetch('/api/notices', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
  const created = await res.json();
  APP.state.notices.unshift(created);
  closeModal();
  APP.tab = 'overview';
  renderAll();
}

function openNewProjectModal() {
  openModal(`
    <h3 style="margin-top:0">Yeni FIDIC Kabuklu Proje Kur (Mikrodan Şehir Ölçeğine)</h3>
    <div class="form-grid">
      <label class="fld">Proje Adı<input id="npName" placeholder="Örn: Güney Sahil Marina & Otel Kompleksi"/></label>
      <div class="form-row-2">
        <label class="fld">Proje Ölçeği
          <select id="npScale">
            <option value="micro">Mikro Ölçek (Villa / Tadilat / İç Mimari)</option>
            <option value="building" selected>Bina & Kampüs Ölçeği (Konut / Kule / Otel)</option>
            <option value="city">Şehir & Altyapı Mega Ölçeği (Etap / Metro / Masterplan)</option>
          </select>
        </label>
        <label class="fld">FIDIC Sözleşme Kabuğu
          <select id="npBook">
            <option value="RED" selected>Kırmızı Kitap 2017 (İşveren Tasarımlı / Birim Fiyat)</option>
            <option value="YELLOW">Sarı Kitap 2017 (Tasarla-Yap / Götürü)</option>
            <option value="SILVER">Gümüş Kitap 2017 (EPC Anahtar Teslim)</option>
            <option value="GREEN">Yeşil Kitap (15 Madde Kısa Pratik Sözleşme)</option>
            <option value="WHITE">Beyaz Kitap (Mimari / Müşavirlik Hizmeti)</option>
          </select>
        </label>
        <label class="fld">Şehir<input id="npCity" value="İstanbul"/></label>
        <label class="fld">Sözleşme Bütçesi (₺)<input type="number" id="npBudget" value="125000000"/></label>
        <label class="fld">Başlangıç Tarihi<input type="date" id="npStart" value="2026-12-01"/></label>
        <label class="fld">Sözleşme Bitiş Tarihi<input type="date" id="npEnd" value="2028-06-01"/></label>
      </div>
      <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:6px">
        <button class="btn" onclick="closeModal()">Vazgeç</button>
        <button class="btn primary" onclick="submitNewProject()">Projeyi Başlat</button>
      </div>
    </div>
  `);
}

async function submitNewProject() {
  const nameTr = document.getElementById('npName').value.trim();
  if (!nameTr) return;
  const scale = document.getElementById('npScale').value;
  const book = document.getElementById('npBook').value;
  const budget = Number(document.getElementById('npBudget').value || 50000000);
  const scaleMap = {
    micro: ['Mikro Ölçek (Villa / İç Mimari)', 'Micro Scale'],
    building: ['Bina & Kampüs Ölçeği', 'Building & Campus Scale'],
    city: ['Şehir & Altyapı Mega Ölçeği', 'City & Infrastructure Scale']
  };
  const bookMap = {
    RED: 'FIDIC Kırmızı Kitap 2017 (Birim Fiyat & İşveren Tasarımlı)',
    YELLOW: 'FIDIC Sarı Kitap 2017 (Tasarla-Yap & Götürü)',
    SILVER: 'FIDIC Gümüş Kitap 2017 (EPC Anahtar Teslim)',
    GREEN: 'FIDIC Yeşil Kitap (15 Maddelik Kısa Sözleşme Kabuğu)',
    WHITE: 'FIDIC Beyaz Kitap (Mimar / Müşavir Hizmet Sözleşmesi)'
  };
  const payload = {
    code: 'CF-2026-NEW',
    scale,
    scaleLabelTr: scaleMap[scale][0],
    scaleLabelEn: scaleMap[scale][1],
    nameTr, nameEn: nameTr,
    city: document.getElementById('npCity').value || 'İstanbul',
    lat: 41.0082, lon: 28.9784,
    fidicBook: book,
    fidicBookTr: bookMap[book],
    fidicBookEn: bookMap[book],
    currentStage: 1,
    currency: '₺',
    contractBudget: budget,
    approvedVariations: 0,
    spentActual: 0,
    earnedValue: 0,
    physicalProgress: 0,
    plannedProgress: 0,
    dailyVelocityPct: 0.15,
    startDate: document.getElementById('npStart').value,
    contractEndDate: document.getElementById('npEnd').value,
    approvedEotDays: 0,
    forecastEndDate: document.getElementById('npEnd').value,
    dnpDays: 365,
    delayDamagesDaily: Math.round(budget * 0.0005),
    safeDaysWithoutAccident: 1,
    numbers: { activeWorkers: 18, mastersAndForemen: 6, engineersAndArchitects: 4, activeCranesAndMachines: 2, concretePouredM3: 0, rebarTons: 0, completedAreaM2: 0, totalAreaM2: 4500 },
    wbs: [
      { id: 'nw1', code: '01', level: 'Faz 1', nameTr: 'Sözleşme Kurulumu, Kesin Teminat & Yer Teslimi (Md. 1–4)', nameEn: 'Mobilization & Site Access', progress: 25, budget: Math.round(budget * 0.15), owner: APP.currentUser.name, clause: 'Md. 2.1 & 4.2' },
      { id: 'nw2', code: '02', level: 'Faz 2', nameTr: 'Ana Yapım & Saha İmalatları (Md. 6–8)', nameEn: 'Main Construction Works', progress: 0, budget: Math.round(budget * 0.85), owner: APP.currentUser.name, clause: 'Md. 8.1' }
    ],
    hourlyLogs: [
      { time: '09:00', titleTr: 'Proje Açılış Toplantısı (Kick-off — Md. 3.8) & Yer Teslim Tutanağı', titleEn: 'Project Kick-off & Site Handover', zone: 'Merkez Ofis / Saha', owner: APP.currentUser.name, metric: 'Başlatıldı', status: 'done' }
    ],
    dailySeries: [], weeklySeries: [], monthlySeries: [],
    yearlySeries: [{ year: '2026-2028', phaseTr: 'Temelden Kesin Kabule Tam Yaşam Döngüsü', phaseEn: 'Full Project Lifecycle', progress: 5 }]
  };
  const res = await fetch('/api/projects', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
  const created = await res.json();
  APP.state.projects.unshift(created);
  APP.currentProjectId = created.id;
  closeModal();
  renderAll();
}

window.addEventListener('DOMContentLoaded', initApp);
