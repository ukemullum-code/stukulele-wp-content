/**
 * ChordPress Fixed — Toolbar + Transpose + Nashville + Diagram Sync
 * v1.1.3
 * - Top row: Key + enharmonic (♭/#) + transpose buttons
 * - Bottom row: Show diagrams + Nashville
 * - Key dropdown respells with ♭/# (Firefox-safe #)
 * - Nashville hides diagrams while on (re-enabled when off)
 * - KEEP '+' in filenames (e.g., G+.svg) and URL-encode when referencing
 */
(function(){
  /* ---------- Note utilities ---------- */
  const SHARP = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"];
  const FLAT  = ["C","Db","D","Eb","E","F","Gb","G","Ab","A","Bb","B"];
  const ENH   = { Db:"C#", Eb:"D#", Gb:"F#", Ab:"G#", Bb:"A#", "C#":"Db", "D#":"Eb", "F#":"Gb", "G#":"Ab", "A#":"Bb" };

  const MAJORS = ["C","G","D","A","E","B","F#","Db","F","Bb","Eb","Ab"];
  const MINORS = ["Am","Em","Bm","F#m","C#m","G#m","Dm","Gm","Cm","Fm","Bbm","Ebm"];
  const SCALE  = [0,2,4,5,7,9,11];
  const DEG    = ["1","2","3","4","5","6","7"];

  function noteToIdx(n){
    n=String(n||"").trim();
    let i=SHARP.indexOf(n); if(i!==-1) return i;
    i=FLAT.indexOf(n); if(i!==-1) return i;
    const e=ENH[n]; if(e){ i=SHARP.indexOf(e); if(i!==-1) return i; }
    return -1;
  }
  function idxToNote(i, preferSharps){ i=((i%12)+12)%12; return (preferSharps?SHARP:FLAT)[i]; }
  function isMinorKey(k){ return /^(?:[A-G](?:#|b)?)m$/.test(String(k||"").trim()); }
  function stripMinor(k){ return String(k||"").trim().replace(/m$/,''); }
  function preferSharpsForKey(k){
    return !new Set(["F","Bb","Eb","Ab","Db","Gb","Cb","Bbm","Ebm","Abm","Dbm","Gbm","Cbm"]).has(String(k||"").trim());
  }
  function transposeKeyName(name, semis, preferSharps){
    const minor=isMinorKey(name), base=stripMinor(name), idx=noteToIdx(base);
    if(idx<0) return name; const out=idxToNote(idx+semis, preferSharps); return minor?out+"m":out;
  }

  /* ---------- Chord parsing / transpose ---------- */
  function parseChord(ch){
    const original = String(ch||"").trim(); if(!original) return {invalid:true, raw:""};
    let left = original, bassText=null, bassIdx=null;
    if(original.includes("/")){
      const parts=original.split("/"); left=(parts.shift()||"").trim();
      const r=(parts.join("/")||"").trim(); bassText=r;
      const m=/^[A-G](#|b)?/.exec(bassText); if(m) bassIdx=noteToIdx(m[0]);
    }
    const m=/^([A-G](#|b)?)(.*)$/.exec(left); if(!m) return {invalid:true, raw:original};
    const rootText=m[1], suffix=m[3]||""; const rootIdx=noteToIdx(rootText); if(rootIdx===-1) return {invalid:true, raw:original};
    return {rootIdx, rootText, bassIdx, bassText, suffix, raw:original};
  }
  function idxToPref(i, preferSharps){ return idxToNote(i, preferSharps); }
  function transposeChord(ch, semis, preferSharps){
    const p=parseChord(ch); if(p.invalid) return ch;
    const newRoot=idxToPref(p.rootIdx+semis, preferSharps);
    let out=newRoot+p.suffix;
    if(p.bassIdx!==null){
      const newBass=idxToPref(p.bassIdx+semis, preferSharps);
      out += "/" + newBass + (p.bassText ? p.bassText.replace(/^[A-G](#|b)?/, "") : "");
    }
    return out;
  }

  /* ---------- Nashville ---------- */
  function chordToNashville(ch, majorKey, preferFlats){
    const p=parseChord(ch); if(p.invalid) return ch;
    const tonic=noteToIdx(majorKey); const dist=((p.rootIdx-tonic)%12+12)%12;
    let degree=-1,acc=0;
    for(let i=0;i<7;i++){
      if(SCALE[i]===dist){degree=i;acc=0;break;}
      if(SCALE[i]===((dist+11)%12)){degree=i;acc=-1;break;}
      if(SCALE[i]===((dist+1)%12)){degree=i;acc=+1;break;}
    }
    if(degree===-1){ degree=0; acc=0; }
    const sym   = acc===0? "" : (preferFlats? "b" : "#");
    const label = acc===0 ? DEG[degree] : (acc>0 ? sym+DEG[(degree+1)%7] : sym+DEG[degree]);
    const isMin = /^m(?!aj)/i.test(p.suffix);
    const qual  = isMin ? "m" : (/dim|°/i.test(p.suffix) ? "°" : "");
    const ext   = p.suffix.replace(/^m(?!aj)/i,"");
    return label + qual + ext;
  }

  /* ---------- Filename helpers ---------- */
  function filenameForChord(ch){
    const p = parseChord(ch);
    if(p.invalid) return (ch||"").replace(/#/g,'s') + '.svg';
    let suffix = (p.suffix || '').replace(/\/[A-G](#|b)?$/,''); // drop slash bass
    suffix = suffix.replace(/°/g, 'dim');                        // keep '+' as '+'
    const root = p.rootText.replace('#','s');
    return (root + suffix).replace(/#/g,'s') + '.svg';
  }

  /* ---------- Enharmonic label helpers (dropdown) ---------- */
  function respellKeyLabel(k, preferSharps){
    const minor = isMinorKey(k);
    const root  = stripMinor(k);
    const idx   = noteToIdx(root);
    if (idx < 0) return k;
    const name  = idxToNote(idx, preferSharps);
    return minor ? name + 'm' : name;
  }
  function refreshKeyDropdown(keySel, preferSharps){
    const prevVal   = keySel.value;
    const prevMinor = isMinorKey(prevVal);
    const prevIdx   = noteToIdx(stripMinor(prevVal));
    [...keySel.options].forEach(o => {
      const newLabel = respellKeyLabel(o.value, preferSharps);
      o.textContent  = newLabel;
      o.value        = newLabel;
    });
    if (prevIdx !== -1){
      keySel.value = idxToNote(prevIdx, preferSharps) + (prevMinor ? 'm' : '');
    }
  }

  /* ---------- DOM + UI ---------- */
  function ready(fn){ if(document.readyState!=='loading'){fn();} else { document.addEventListener('DOMContentLoaded', fn); } }

  function buildToolbar(wrapper, baseKey){
    // ensure only one toolbar
    wrapper.querySelectorAll('.cpress-toolbar').forEach((el,i)=>{ if(i>0) el.remove(); });
    let bar = wrapper.querySelector('.cpress-toolbar');
    if (!bar) { bar = document.createElement('div'); bar.className = 'cpress-toolbar'; wrapper.insertBefore(bar, wrapper.firstChild); }
    else { bar.innerHTML = ''; }

    // containers
    const top = document.createElement('div');    top.className = 'cpress-top';
    const bottom = document.createElement('div'); bottom.className = 'cpress-toggles';

    // Key label + select
    const keyLabel = document.createElement('label'); keyLabel.className='cpress-dk-label'; keyLabel.textContent='Key: ';
    const keySel = document.createElement('select'); keySel.className='cpress-key-select';
    const list = isMinorKey(baseKey)? MINORS : MAJORS;
    list.forEach(k => { const o=document.createElement('option'); o.value=k; o.textContent=k; keySel.appendChild(o); });
    let want = baseKey;
    if (![...keySel.options].some(o=>o.value===want)) {
      const enh = {Db:"C#",Eb:"D#",Gb:"F#",Ab:"G#",Bb:"A#"}[stripMinor(want)];
      want = enh ? (isMinorKey(want)?enh+'m':enh) : list[0];
    }
    [...keySel.options].forEach(o=>{ if(o.value===want) o.selected=true; });
    keyLabel.appendChild(keySel);

    // Spelling toggle
    const spellWrap = document.createElement('span'); spellWrap.className='cpress-spell';
    const sTxt = document.createElement('span'); sTxt.textContent='  Spelling: ';
    const flatBtn = document.createElement('button'); flatBtn.type='button'; flatBtn.className='cpress-spell-flat'; flatBtn.textContent='♭';
    const sharpBtn= document.createElement('button'); sharpBtn.type='button'; sharpBtn.className='cpress-spell-sharp'; sharpBtn.textContent='#';
    spellWrap.appendChild(sTxt); spellWrap.appendChild(flatBtn); spellWrap.appendChild(sharpBtn);

    // Transpose buttons row
    const btnRow = document.createElement('div'); btnRow.className='cpress-btnrow';
    [{t:'–1',d:-2},{t:'–½',d:-1},{t:'+½',d:1},{t:'+1',d:2},{t:'Reset',d:null}].forEach(b=>{
      const el=document.createElement('button'); el.type='button'; el.textContent=b.t; el.dataset.delta=(b.d===null?'reset':String(b.d)); btnRow.appendChild(el);
    });

    // Top row contents
    top.appendChild(keyLabel);
    top.appendChild(spellWrap);
    top.appendChild(btnRow);

    // Show diagrams
    const diagWrap = document.createElement('label'); diagWrap.className='cpress-diag';
    const diagChk = document.createElement('input'); diagChk.type='checkbox'; diagChk.className='cpress-diagrams-toggle'; diagChk.checked = true;
    diagWrap.appendChild(diagChk); diagWrap.appendChild(document.createTextNode(' Show diagrams'));

    // Nashville
    const nashWrap = document.createElement('label'); nashWrap.className='cpress-nash';
    const nashChk = document.createElement('input'); nashChk.type='checkbox'; nashChk.className='cpress-nashville-toggle';
    nashWrap.appendChild(nashChk); nashWrap.appendChild(document.createTextNode(' Nashville'));

    // Bottom row contents
    bottom.appendChild(diagWrap);
    bottom.appendChild(nashWrap);

    // Assemble
    bar.appendChild(top);
    bar.appendChild(bottom);

    return {bar,keySel,flatBtn,sharpBtn,diagChk,nashChk,btnRow,minorBase:isMinorKey(baseKey)};
  }

  function collectTransposedChordSet(wrapper, baseKey, targetKey, preferSharps){
    const a = noteToIdx(stripMinor(baseKey)); const b = noteToIdx(stripMinor(targetKey));
    const semis = (a<0||b<0)?0:(b-a);
    const set = new Set();
    wrapper.querySelectorAll('.cpress-chord, [data-chord]').forEach(node=>{
      const original = node.getAttribute('data-original-chord') || node.getAttribute('data-chord') || node.textContent.trim();
      const t = transposeChord(original, semis, preferSharps);
      set.add(t);
    });
    return Array.from(set.values());
  }

  function rebuildDiagrams(wrapper, chordList){
    const container = wrapper.querySelector('.cpress-diagrams') || (function(){
      const div=document.createElement('div'); div.className='cpress-diagrams'; wrapper.appendChild(div); return div;
    })();

    let baseDir = null;
    const firstImg = container.querySelector('img');
    if (firstImg && firstImg.src) {
      baseDir = firstImg.src.replace(/\/[^\/]*$/, ''); // drop filename
    } else {
      baseDir = (window.cpffChordBase || (window.location.origin + '/wp-content/plugins/chordpress/uke-chords'));
    }

    container.innerHTML = '';
    chordList.sort((a,b)=>a.localeCompare(b,undefined,{sensitivity:'base'}));
    chordList.forEach(ch=>{
      const file = filenameForChord(ch);
      const img = document.createElement('img');
      img.className='cpress-diagram';
      img.alt = ch;
      img.loading = 'lazy';
      // URL-encode filename so '+' becomes %2B
      img.src = baseDir + '/' + encodeURIComponent(file);
      container.appendChild(img);
    });
  }

  function applyTransposeNames(wrapper, baseKey, targetKey, preferSharps){
    const a = noteToIdx(stripMinor(baseKey)); const b = noteToIdx(stripMinor(targetKey));
    const semis = (a<0||b<0)?0:(b-a);

    wrapper.querySelectorAll('.cpress-chord, [data-chord]').forEach(node=>{
      const original = node.getAttribute('data-original-chord') || node.getAttribute('data-chord') || node.textContent.trim();
      const out = transposeChord(original, semis, preferSharps);
      node.textContent = out;
      if (node.hasAttribute('data-chord')) node.setAttribute('data-chord', out);
    });

    const list = collectTransposedChordSet(wrapper, baseKey, targetKey, preferSharps);
    rebuildDiagrams(wrapper, list);
  }

  function applyNashville(wrapper, currentKey, preferSharps){
    const majorKey = isMinorKey(currentKey)
      ? idxToNote(noteToIdx(stripMinor(currentKey)) + 3, true)
      : currentKey;
    const preferFlats = !preferSharps;

    wrapper.querySelectorAll('.cpress-chord, [data-chord]').forEach(node=>{
      const original = node.getAttribute('data-original-chord') || node.textContent.trim();
      const out = chordToNashville(original, majorKey, preferFlats);
      node.textContent = out;
      if (node.hasAttribute('data-chord')) node.setAttribute('data-chord', out);
    });

    const list = collectTransposedChordSet(wrapper, currentKey, currentKey, preferSharps);
    rebuildDiagrams(wrapper, list);
  }

  function setDiagramsVisible(wrapper,on){
    wrapper.querySelectorAll('.cpress-diagrams').forEach(el=>{ el.style.display = on ? '' : 'none'; });
  }

  function initWrapper(wrapper){
    let baseKey = (wrapper.getAttribute('data-base-key')||'').trim();
    if (!baseKey) baseKey='C';

    const ui = buildToolbar(wrapper, baseKey);
    let preferSharps = preferSharpsForKey(baseKey);
    let diagramsWanted = true; // remember preference

    if (preferSharps) { ui.sharpBtn.classList.add('active'); } else { ui.flatBtn.classList.add('active'); }
    refreshKeyDropdown(ui.keySel, preferSharps);
    setDiagramsVisible(wrapper, true);

    ui.flatBtn.addEventListener('click', ()=>{
      ui.flatBtn.classList.add('active'); ui.sharpBtn.classList.remove('active');
      preferSharps = false;
      refreshKeyDropdown(ui.keySel, preferSharps);
      if (ui.nashChk.checked) applyNashville(wrapper, ui.keySel.value, preferSharps);
      else applyTransposeNames(wrapper, baseKey, ui.keySel.value, preferSharps);
    });
    ui.sharpBtn.addEventListener('click', ()=>{
      ui.sharpBtn.classList.add('active'); ui.flatBtn.classList.remove('active');
      preferSharps = true;
      refreshKeyDropdown(ui.keySel, preferSharps);
      if (ui.nashChk.checked) applyNashville(wrapper, ui.keySel.value, preferSharps);
      else applyTransposeNames(wrapper, baseKey, ui.keySel.value, preferSharps);
    });

    ui.diagChk.addEventListener('change', ()=>{
      if (ui.nashChk.checked){ ui.diagChk.checked = false; setDiagramsVisible(wrapper, false); return; }
      diagramsWanted = ui.diagChk.checked;
      setDiagramsVisible(wrapper, diagramsWanted);
    });

    ui.nashChk.addEventListener('change', ()=>{
      if (ui.nashChk.checked){
        diagramsWanted = ui.diagChk.checked;
        ui.diagChk.checked = false; ui.diagChk.disabled = true;
        setDiagramsVisible(wrapper, false);
        applyNashville(wrapper, ui.keySel.value, preferSharps);
      } else {
        ui.diagChk.disabled = false; ui.diagChk.checked = diagramsWanted;
        setDiagramsVisible(wrapper, diagramsWanted);
        applyTransposeNames(wrapper, baseKey, ui.keySel.value, preferSharps);
      }
    });

    ui.keySel.addEventListener('change', ()=>{
      if (ui.nashChk.checked) applyNashville(wrapper, ui.keySel.value, preferSharps);
      else applyTransposeNames(wrapper, baseKey, ui.keySel.value, preferSharps);
    });

    ui.btnRow.querySelectorAll('button').forEach(btn=>{
      btn.addEventListener('click', ()=>{
        const d = btn.dataset.delta;
        if (d === 'reset') {
          const target = respellKeyLabel(baseKey, preferSharps);
          ui.keySel.value = target;
        } else {
          const delta = parseInt(d,10);
          let next = transposeKeyName(ui.keySel.value, delta, preferSharps);
          if ([...ui.keySel.options].some(o=>o.value===next)) ui.keySel.value = next;
        }
        if (ui.nashChk.checked) applyNashville(wrapper, ui.keySel.value, preferSharps);
        else applyTransposeNames(wrapper, baseKey, ui.keySel.value, preferSharps);
      });
    });

    if (ui.nashChk.checked){
      ui.diagChk.checked = false; ui.diagChk.disabled = true; setDiagramsVisible(wrapper, false);
      applyNashville(wrapper, ui.keySel.value, preferSharps);
    } else {
      applyTransposeNames(wrapper, baseKey, ui.keySel.value, preferSharps);
    }
  }

  function boot(){ document.querySelectorAll('.cpress').forEach(initWrapper); }
  if (document.readyState !== 'loading') boot(); else document.addEventListener('DOMContentLoaded', boot);
})();
