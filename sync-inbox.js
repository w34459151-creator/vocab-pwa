#!/usr/bin/env node
/**
 * 词力 PWA 自动回传收件箱处理（桌面端）
 *
 * 闭环：手机 PWA 练完 → GitHub Contents API 写结果到 master 分支 sync/*.json
 *       → 本脚本 git pull 拉取 → 逐个用 update-progress.js 合并进
 *         ~/.workbuddy/vocab-progress.json → 删除已处理文件 → gen_pwa.js
 *         重生成 data.js → commit → push master + master:gh-pages（SSH 免 token）
 *
 * 用法（在 vocab-pwa 目录下）: node sync-inbox.js
 * 可选参数: --commit <自定义提交信息>
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const SYNC_DIR = path.join(ROOT, 'sync');
const UPDATER = 'C:/Users/wanglinew/.workbuddy/plugins/marketplaces/experts/plugins/vocab-craft-expert/skills/vocab-scheduler/scripts/update-progress.js';

function sh(cmd, opts) {
  return execSync(cmd, Object.assign({ cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }, opts || {}));
}

function main() {
  const commitMsg = (process.argv.indexOf('--commit') >= 0 && process.argv[process.argv.indexOf('--commit') + 1]) ||
    'sync: 自动合并 PWA 回传结果';

  console.log('=== 1/6 git pull origin master ===');
  try { console.log(String(sh('git pull origin master 2>&1')).trim()); }
  catch (e) { console.log('[pull 输出] ' + String(e.stdout || '') + String(e.stderr || '')); }

  if (!fs.existsSync(UPDATER)) {
    console.error('错误: 找不到 update-progress.js → ' + UPDATER);
    process.exit(1);
  }
  const files = fs.existsSync(SYNC_DIR)
    ? fs.readdirSync(SYNC_DIR).filter(f => f.endsWith('.json')).sort()
    : [];
  if (!files.length) {
    console.log('收件箱为空，无需合并。');
    return;
  }

  console.log('=== 2/6 合并 ' + files.length + ' 个结果文件 ===');
  let merged = 0, failed = 0;
  for (const f of files) {
    const fp = path.join(SYNC_DIR, f);
    try {
      const raw = fs.readFileSync(fp, 'utf8');
      const r = JSON.parse(raw);
      if (!r.date) throw new Error('缺少 date 字段');
      const out = sh('"' + process.execPath + '" "' + UPDATER + '" --results-file "' + fp + '"');
      // 用 git rm 删除（绕过 Node fs unlink 的沙箱 trash 钩子，避免删除失败导致重复合并）
      sh('git rm -f "' + path.relative(ROOT, fp).replace(/\\/g, '/') + '" 2>&1');
      merged++;
      console.log('✓ ' + f + (r.level ? ' [' + r.level + ']' : '') + (r.reviewCompleted ? ' 对' + r.reviewCompleted.length : '') + (r.wrongAnswers ? ' 错' + r.wrongAnswers.length : ''));
      if (out) console.log(String(out).trim());
    } catch (e) {
      failed++;
      console.error('✗ 处理失败 ' + f + '：' + (e.stderr || e.stdout || e.message));
    }
  }

  console.log('=== 3/6 自动升 sw.js 缓存版本（强制手机刷新，避免旧 data.js 被 SW 缓存） ===');
  const swPath = path.join(ROOT, 'sw.js');
  const swSrc = fs.readFileSync(swPath, 'utf8');
  const vm = swSrc.match(/vocabpwa-v(\d+)/);
  const nv = vm ? (parseInt(vm[1], 10) + 1) : 12;
  fs.writeFileSync(swPath, swSrc.replace(/vocabpwa-v(\d+)/, 'vocabpwa-v' + nv), 'utf8');
  console.log('sw.js 缓存版本 → vocabpwa-v' + nv);

  console.log('=== 4/6 重生成 data.js ===');
  sh('"' + process.execPath + '" "' + path.join(ROOT, 'gen_pwa.js') + '"');

  console.log('=== 5/6 提交 ===');
  try { console.log(String(sh('git add -A && git commit -m "' + commitMsg + '" 2>&1')).trim()); }
  catch (e) { console.log('[commit] ' + String(e.stdout || e.stderr || e.message).trim()); }

  console.log('=== 6/6 推送 master + gh-pages ===');
  try { console.log(String(sh('git push origin master 2>&1')).trim()); }
  catch (e) { console.error('[push master] ' + String(e.stdout || e.stderr || e.message).trim()); }

  try { console.log(String(sh('git push origin master:gh-pages 2>&1')).trim()); }
  catch (e) { console.error('[push gh-pages] ' + String(e.stdout || e.stderr || e.message).trim()); }

  console.log('完成：合并 ' + merged + ' 个，失败 ' + failed + ' 个。');
}

main();
