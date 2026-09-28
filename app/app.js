import {LEADS} from '../algorithms/criteria.js';

const SAMPLE_RATE = 500;
const SAMPLES_PER_LEAD = 500;
const PAPER_SPEED = 25;
const GAIN = 10;

const stages = [
  ['Irama', 'Tentukan apakah irama sinus dan apakah R-R teratur. Catatan: median beat tidak dapat membuktikan keteraturan R-R.'],
  ['Frekuensi', 'Hitung frekuensi dari interval R-R bila rhythm strip tersedia. Median beat tunggal tidak cukup untuk menghitung frekuensi klinis.'],
  ['Gelombang P', 'Nilai lead II dan V1: ada/tidak, durasi, amplitudo, dan morfologi P.'],
  ['PR / AV block', 'Ukur awal P sampai awal QRS. PR 120–200 ms normal; >200 ms menunjukkan first-degree AV block.'],
  ['QRS', 'Nilai morfologi dan durasi QRS pada lead yang relevan.'],
  ['Axis', 'Gunakan polaritas QRS pada lead I dan aVF. I+/aVF+ normal; I+/aVF− mengarah LAD; I−/aVF+ RAD; I−/aVF− extreme axis.'],
  ['Q patologis', 'Cari Q patologis pada lead yang relevan dan kontigu. Kriteria umum: ≥40 ms, ≥2 mm, atau Q:R ≥25%, dengan memperhatikan lead dan pengecualian fisiologis.'],
  ['Lebar QRS', 'QRS <120 ms narrow; ≥120 ms wide.'],
  ['Transition / BBB', 'Nilai progresi R V1–V6 serta pola RBBB/LBBB.'],
  ['LVH / RVH', 'Gunakan voltage bersama temuan morfologi pendukung, bukan voltage saja.'],
  ['Aritmia', 'PAC/PVC/AF/VT/VF membutuhkan rhythm strip penuh; median beat tidak cukup.']
];

let cases = [], idx = 0, stage = 0, leadData = [], loadToken = 0;
const $ = id => document.getElementById(id);

async function loadCases() {
  cases = await fetch('./data/cases.json', {cache:'no-store'}).then(r => {
    if (!r.ok) throw new Error('cases.json tidak ditemukan');
    return r.json();
  });
  populateSelect();
  await loadCase(0);
}

function populateSelect() {
  const s = $('caseSelect');
  s.innerHTML = cases.map((c,i) => `<option value="${i}">${String(i+1).padStart(2,'0')} · ${c.ecg_med_record}</option>`).join('');
}

function sex(code) { return code === 1 ? 'M' : code === 0 ? 'F' : '—'; }
function labels(c) { return ['STEMI','NSTEMI','OMI','UA','VF_VT','Paced','AMI'].filter(k => c[k] === 1); }

function caseAnswer(c) {
  const ls = labels(c);
  const primary = ls.includes('STEMI') ? 'STEMI' : ls.includes('NSTEMI') ? 'NSTEMI' : ls.includes('OMI') ? 'OMI' : ls.includes('UA') ? 'Unstable angina (UA)' : ls.includes('VF_VT') ? 'VF/VT' : ls.includes('Paced') ? 'Paced rhythm' : ls.includes('AMI') ? 'AMI' : 'Tidak ada label utama';
  return {
    primary,
    labels: ls,
    rhythm: 'Tidak dapat ditentukan secara valid dari median waveform 1 detik.',
    rate: 'Tidak dapat dihitung secara valid tanpa interval R-R/rhythm strip.',
    p: 'Nilai morfologi P secara visual pada lead II dan V1; median waveform dapat dipakai untuk morfologi, tetapi tidak untuk keteraturan.',
    pr: 'Dapat diperkirakan dari satu beat bila batas P dan QRS jelas; tetap perlu verifikasi visual.',
    qrs: 'Nilai durasi dan morfologi QRS pada 12 lead.',
    axis: 'Gunakan polaritas QRS lead I dan aVF; lead II membantu membedakan borderline LAD.',
    q: 'Cari Q patologis pada lead yang relevan dan kontigu, bukan hanya satu lead.',
    stt: ls.includes('STEMI') || ls.includes('AMI') ? 'Dataset menandai kejadian infark/ACS; perubahan ST-T harus dinilai pada lead yang berdekatan dan dikorelasikan dengan klinis.' : 'Nilai ST-T secara langsung pada tracing.'
  };
}

async function loadCase(i) {
  const token = ++loadToken;
  idx = Number(i);
  stage = 0;
  const c = cases[idx];
  $('caseTitle').textContent = c.ecg_med_record;
  $('caseMeta').textContent = `${c.Patient_id} · ${c.age ?? '—'} th · ${sex(c.gender)}`;
  $('record').innerHTML = `Record: ${c.ecg_med_record}<br>Patient: ${c.Patient_id}<br>Age: ${c.age ?? '—'}<br>Sex: ${sex(c.gender)}<br>Paper: ${PAPER_SPEED} mm/s · ${GAIN} mm/mV<br>Samples/lead: ${SAMPLES_PER_LEAD} · ${SAMPLES_PER_LEAD/SAMPLE_RATE} s`;
  $('answer').innerHTML = `<strong>Kunci jawaban</strong><div class="answer-muted">Jawaban lengkap kasus akan tampil di sini setelah kamu menekan “Tampilkan jawaban”.</div>`;
  try {
    const data = await readMed(`./data/med/${c.ecg_med_record}`);
    if (token !== loadToken) return;
    leadData = data;
    drawStandardECG();
    renderWork();
  } catch (err) {
    if (token !== loadToken) return;
    $('ecg').innerHTML = `<div class="load-error"><strong>Gagal memuat ECG</strong><br>${err.message}</div>`;
    $('question').innerHTML = '';
  }
}

async function readMed(url) {
  const buf = await fetch(url, {cache:'no-store'}).then(r => {
    if (!r.ok) throw new Error(`File ECG tidak ditemukan: ${url}`);
    return r.arrayBuffer();
  });
  const a = new Int16Array(buf);
  if (a.length !== LEADS.length * SAMPLES_PER_LEAD) throw new Error(`Format .med tidak sesuai: ${a.length} int16`);
  const m = Array.from({length:12}, () => new Float32Array(SAMPLES_PER_LEAD));
  for (let t=0; t<SAMPLES_PER_LEAD; t++) for (let l=0; l<12; l++) m[l][t] = a[t*12+l];
  return m;
}

function drawStandardECG() {
  const host = $('ecg');
  host.innerHTML = `
    <div class="ecg-paper-head"><span>12-LEAD ECG · MEDIAN BEAT</span><span>${PAPER_SPEED} mm/s · ${GAIN} mm/mV</span></div>
    <div class="standard-grid" id="standardGrid"></div>
    <div class="rhythm-head"><strong>II</strong><span>median beat · bukan rhythm strip 10 detik</span></div>
    <div class="rhythm-row"><canvas id="rhythmCanvas"></canvas></div>`;

  const grid = $('standardGrid');
  const layout = [
    ['I',0], ['aVR',3], ['V1',6], ['V4',9],
    ['II',1], ['aVL',4], ['V2',7], ['V5',10],
    ['III',2], ['aVF',5], ['V3',8], ['V6',11]
  ];
  layout.forEach(([name,i]) => {
    const cell = document.createElement('div');
    cell.className = 'std-lead';
    cell.innerHTML = `<div class="std-label"><strong>${name}</strong><span>${PAPER_SPEED} mm/s</span></div><canvas></canvas>`;
    grid.appendChild(cell);
    drawLead(cell.querySelector('canvas'), leadData[i], 0.99);
  });
  drawLead($('rhythmCanvas'), leadData[1], 3.96);
}

function drawLead(canvas, arr, secondsShown=0.99) {
  const d = Math.max(1, window.devicePixelRatio || 1);
  const cssW = Math.max(220, canvas.parentElement?.clientWidth || 500);
  const cssH = 142;
  canvas.width = Math.round(cssW*d); canvas.height = Math.round(cssH*d);
  canvas.style.width = '100%'; canvas.style.height = cssH + 'px';
  const ctx = canvas.getContext('2d'); ctx.setTransform(d,0,0,d,0,0); ctx.clearRect(0,0,cssW,cssH);
  drawGrid(ctx, cssW, cssH);
  const mean = arr.reduce((a,b)=>a+b,0)/arr.length;
  const max = Math.max(...arr.map(v=>Math.abs(v-mean))) || 1;
  const scale = cssH*0.34/max;
  ctx.strokeStyle = '#252525'; ctx.lineWidth = 1.35; ctx.beginPath();
  arr.forEach((v,i) => {
    const x = (i/(arr.length-1))*cssW;
    const y = cssH/2 - (v-mean)*scale;
    i ? ctx.lineTo(x,y) : ctx.moveTo(x,y);
  });
  ctx.stroke();
}

function drawGrid(ctx,w,h){
  const small = 4, big = 20;
  ctx.fillStyle = '#fff'; ctx.fillRect(0,0,w,h);
  ctx.lineWidth = 0.55; ctx.strokeStyle = '#f1cfcf';
  for(let x=0;x<=w;x+=small){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,h);ctx.stroke();}
  for(let y=0;y<=h;y+=small){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(w,y);ctx.stroke();}
  ctx.lineWidth = 0.8; ctx.strokeStyle = '#dfa9a9';
  for(let x=0;x<=w;x+=big){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,h);ctx.stroke();}
  for(let y=0;y<=h;y+=big){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(w,y);ctx.stroke();}
}

function renderWork() {
  $('steps').innerHTML = stages.map((s,i) => `<span class="step ${i===stage?'active':''}">${i+1}. ${s[0]}</span>`).join('');
  const [title,guide] = stages[stage];
  $('question').innerHTML = `<h2>${title}</h2><p>${guide}</p><button id="answerBtn">Tampilkan jawaban tahap ini</button><div id="result"></div>`;
  $('answerBtn').onclick = () => revealStage();
}

function revealStage() {
  const c = cases[idx], a = caseAnswer(c), title = stages[stage][0];
  const answers = {
    'Irama': a.rhythm,
    'Frekuensi': a.rate,
    'Gelombang P': a.p,
    'PR / AV block': a.pr,
    'QRS': a.qrs,
    'Axis': a.axis,
    'Q patologis': a.q,
    'Lebar QRS': 'Nilai dari tracing; wide bila ≥120 ms.',
    'Transition / BBB': 'Nilai progresi R V1–V6 dan morfologi BBB.',
    'LVH / RVH': 'Nilai voltage + morfologi pendukung.',
    'Aritmia': 'Tidak dapat ditentukan dari median waveform.'
  };
  $('result').innerHTML = `<div class="result"><strong>Jawaban ${title}</strong><br>${answers[title]}<br><br><button id="next">${stage < stages.length-1 ? 'Lanjut ke tahap berikutnya →' : 'Selesai'}</button></div>`;
  if(stage < stages.length-1) $('next').onclick = () => { stage++; renderWork(); };
  showFullAnswer();
}

function showFullAnswer() {
  const c = cases[idx], a = caseAnswer(c);
  $('answer').innerHTML = `
    <strong>Kunci jawaban kasus ${c.ecg_med_record}</strong>
    <div class="answer-grid">
      <div><b>Diagnosis/label dataset</b><br>${a.primary}</div>
      <div><b>Irama</b><br>${a.rhythm}</div>
      <div><b>Frekuensi</b><br>${a.rate}</div>
      <div><b>P wave</b><br>${a.p}</div>
      <div><b>PR / AV</b><br>${a.pr}</div>
      <div><b>QRS</b><br>${a.qrs}</div>
      <div><b>Axis</b><br>${a.axis}</div>
      <div><b>Q patologis</b><br>${a.q}</div>
      <div><b>ST-T</b><br>${a.stt}</div>
    </div>
    <div class="answer-note">Label dataset adalah label klinis dari dataset, bukan bukti bahwa seluruh diagnosis dapat ditegakkan dari median ECG saja. Gunakan tracing untuk menemukan temuan ECG, lalu cocokkan dengan konteks klinis.</div>`;
}

$('caseSelect').addEventListener('change', e => loadCase(e.target.value));
$('random').onclick = () => loadCase(Math.floor(Math.random()*cases.length));
window.addEventListener('resize', () => { if (leadData.length) drawStandardECG(); });
loadCases();
