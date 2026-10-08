'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const i18n=require('../public/locales.js');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');

test('CMD BOT ARK offers all eleven requested languages including Corsican',()=>{
  assert.deepEqual(i18n.languages,['fr','en','us','de','es','it','ru','ko','ja','zh','co']);
  for(const language of i18n.languages){
    assert.equal(typeof i18n.t(language,'home'),'string');
    assert.ok(i18n.t(language,'home').length>0);
  }
  assert.equal(i18n.t('co','home'),'Panoramica');
});

test('the bot invite button uses CMD BOT ARK consistently',()=>{
  for(const language of i18n.languages){
    assert.match(i18n.t(language,'inviteBot'),/CMD BOT ARK/i);
  }
});

test('language dropdowns work on phone and desktop',()=>{
  const html=read('public/index.html');
  const app=read('public/app.js');
  assert.match(html,/id="language"/);
  assert.match(html,/id="mobile-language"/);
  assert.match(html,/<option value="co">/);
  assert.match(app,/\$\('#language'\)\.onchange=(?:async )?e=>/);
  assert.ok(app.includes("document.getElementById('mobile-language')?.addEventListener('change'"));
  assert.ok(app.includes("if(ml)ml.value=language"));
});

test('the brand logo fills its circle and the offline PWA has fresh locales',()=>{
  const css=read('public/styles.css');
  const sw=read('public/sw.js');
  assert.match(css,/\.brand img\{[^}]*object-fit:cover!important[^}]*border-radius:50%/);
  assert.ok(sw.includes('/locales.js?v=22'));
  assert.ok(sw.includes('bot-ark-shell-v32-corsu-20261008'));
});
