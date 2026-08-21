const fs = require('fs');
const path = require('path');

const HOME = "C:/Users/wanglinew/.workbuddy";
const vocabPath = path.join(HOME, "vocab-progress.json");
const outPath = path.join(__dirname, "data.js");

const vocab = JSON.parse(fs.readFileSync(vocabPath, 'utf8'));

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

const out =
  '// 由 gen_pwa.js 自动生成，请勿手改。源：~/.workbuddy/vocab-progress.json\n' +
  'window.VOCAB_LIB = ' + JSON.stringify(LIB, null, 2) + ';\n' +
  'window.VOCAB_SCHED = ' + JSON.stringify(SCHED, null, 2) + ';\n';

fs.writeFileSync(outPath, out, 'utf8');
console.log('OK 生成 data.js：词', LIB.length, '｜ 日程日期', Object.keys(SCHED).length, '个');
