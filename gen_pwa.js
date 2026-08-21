const fs = require('fs');
const path = require('path');

const HOME = "C:/Users/wanglinew/.workbuddy";
const vocabPath = path.join(HOME, "vocab-progress.json");
const outPath = path.join(__dirname, "data.js");

const vocab = JSON.parse(fs.readFileSync(vocabPath, 'utf8'));

// OAuth Device Flow 的 Client ID（来自本地配置 ~/.workbuddy/vocab-oauth.json），公开值非密钥
let GH_CLIENT_ID = '';
const oauthCfgPath = path.join(HOME, 'vocab-oauth.json');
try { if (fs.existsSync(oauthCfgPath)) { const o = JSON.parse(fs.readFileSync(oauthCfgPath, 'utf8')); if (o && o.client_id) GH_CLIENT_ID = String(o.client_id).trim(); } } catch (e) {}

const LIB = (vocab.words || []).map(d => ({
  w: d.word,
  p: d.phonetic || '',
  zh: (d.trans || []).join('；'),
  sc: d.scenario || '',
  ph: (d.phrases || []).map(s => {
    const i = s.indexOf(' = ');
    return i >= 0 ? [s.slice(0, i), s.slice(i + 3)] : [s, ''];
  }),
  se: (d.sentences || []).map(s => [s.en, s.zh])
}));

const SCHED = vocab.reviewSchedule || {};

const swSrc = fs.readFileSync(path.join(__dirname, "sw.js"), 'utf8');
const VER = (swSrc.match(/vocabpwa-v(\d+)/) || [])[1] || '?';

const out =
  '// 由 gen_pwa.js 自动生成，请勿手改。源：~/.workbuddy/vocab-progress.json\n' +
  'window.VOCAB_VERSION = ' + JSON.stringify(VER) + ';\n' +
  (GH_CLIENT_ID ? 'window.GH_CLIENT_ID = ' + JSON.stringify(GH_CLIENT_ID) + ';\n' : '') +
  'window.VOCAB_LIB = ' + JSON.stringify(LIB, null, 2) + ';\n' +
  'window.VOCAB_SCHED = ' + JSON.stringify(SCHED, null, 2) + ';\n';

fs.writeFileSync(outPath, out, 'utf8');
console.log('OK 生成 data.js：词', LIB.length, '｜ 日程日期', Object.keys(SCHED).length, '个｜ 版本 v' + VER + (GH_CLIENT_ID ? '｜ OAuth 已配置' : '｜ OAuth 未配置'));
