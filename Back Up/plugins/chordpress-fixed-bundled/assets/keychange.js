/**
 * ChordPress Fixed — Full Toolbar + Transpose + Nashville + Diagram Sync
 * - Builds a toolbar if none exists (Different Keys, Spelling ♭/♯, Show diagrams, Nashville, –1/–½/+½/+1/Reset).
 * - Minor base key => minors-only list. Major base key => majors-only list.
 * - Transposes chord text and REBUILDS the diagram strip on every change.
 * - Nashville shows numbers (diagrams still reflect the actual chord names).
 * - NEW: '+' chord support — labels stay 'G+' but filenames resolve to 'Gaug.svg'.
 */
(function(){
  /* ---------- Utilities: notes/keys ---------- */
  const SHARP = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"];
  const FLAT  = ["C","Db","D","Eb","E","F","Gb","G","Ab","A","Bb","B"];
  const ENH   = { Db:"C#", Eb:"D#", Gb:"F#", Ab:"G#", Bb:"A#", "C#":"Db", "D#":"Eb", "F#":"Gb", "G#":"Ab", "A#":"Bb" };

  const MAJORS = ["C","G","D","A","E","B","F#","Db","F","Bb","Eb","Ab"];
  const MINORS = ["Am","Em","Bm","F#m","C#m","G#m","Dm","Gm","Cm","Fm","Bbm","Ebm"];

  const SCALE = [0,2,4,5,7,9,11]; const DEG = ["1","2","3","4","5","6","7"];

  function noteToIdx(n){
    n=String(n||"").trim();
    let i=SHARP.indexOf(n); if(i!==-1) return i;
    i=FLAT.indexOf(n); if(i!==-1) return i;
    const e=ENH[n]; if(e) { i=SHARP.indexOf(e); if(i!==-1) return i; }
    return -1;
  }
  function idxToNote(i, preferSharps=true){ i=((i%12)+12)%12; return preferSharps?SHARP[i]:FLAT[i]; }
  function isMinorKey(k){ return /^(?:[A-G](?:#|b)?)m$/.test(String(k||"").trim()); }
  function stripMinor(k){ return String(k||"").trim().replace(/m$/,''); }
  function preferSharpsForKey(k){ return !new Set(["F","Bb","Eb","Ab","Db","Gb","Cb","Bbm","Ebm","Abm","Dbm","Gbm","Cbm"]).has(String(k||"").trim()); }
  function transposeKeyName(name, semis, preferSharps){
    const minor=isMinorKey(name), base=stripMinor(name), idx=noteToIdx(base);
    if(idx<0) return name; const out=idxToNote(idx+semis, preferSharps); return minor?out+"m":out;
  }

  /* ---------- Chords ---------- */
  function parseChord(ch){
    const original = String(ch||"").trim(); if(!original) return {invalid:true, raw:""};
    let left = original, bassText=null, bassIdx=null;
    if(original.includes("/")){ const parts=original.split("/"); left=(parts.shift()||"").trim(); const r=(parts.join("/")||"").trim();
      bassText=r; const m=/^[A-G](#|b)?/.exec(bassText); if(m) bassIdx=noteToIdx(m[0]); }
    const m=/^([A-G](#|b)?)(.*)$/.exec(left); if(!m) return {invalid:true, raw:original};
    const rootText=m[1], suffix=m[3]||""; const rootIdx=noteToIdx(rootText); if(rootIdx===-1) return {invalid:true, raw:original};
    return {rootIdx, rootText, bassIdx, bassText, suffix, raw:original};
  }
  function transposeChord(ch, semis, preferSharps=true){
    const p=parseChord(ch); if(p.invalid) return ch;
    const newRoot=idxToNote(p.rootIdx+semis, preferSharps);
    let out=newRoot+p.suffix;
    if(p.bassIdx!==null){
      const newBass=idxToNote(p.bassIdx+semis, preferSharps);
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
    if(degree===-1) { degree=0; acc=0; }
    const sym = acc===0? "" : (preferFlats? "b" : "#");
    const label = acc===0 ? DEG[degree] : (acc>0 ? sym+DEG[(degree+1)%7] : sym+DEG[degree]);
    const isMin = /^m(?!aj)/i.test(p.suffix);
    const qual = isMin ? "m" : (/dim|°/i.test(p.suffix) ? "°" : "");
    const ext  = p.suffix.replace(/^m(?!aj)/i,"");
    return label + qual + ext;
  }

  /* ---------- File naming helpers ---------- */
  function filenameForChord(ch){
    const p = parseChord(ch);
    if(p.invalid) return ch.replace(/#/g,'s') + '.svg';
    // drop slash bass for filename
    let suffix = (p.suffix || '').replace(/\/[A-G](#|b)?$/,'');
    // Alias '+' → 'aug' only at the start of quality
    suffix = suffix.replace(/^\+/, 'aug');
    // Map ° to dim for filenames if present
    suffix = suffix.replace(/°/g, 'dim');
    const root = p.rootText.replace('#','s');
    return (root + suffix).replace(/#/g,'s') + '.svg';
  }

  /* ---------- DOM helpers ---------- */
  function ready(fn){ if(document.readyState!=='loading'){fn();} else { document.addEventListener('DOMContentLoaded', fn); } }

  function buildToolbar(wrapper, baseKey){
    // Remove any duplicates
    wrapper.querySelectorAll('.cpress-toolbar').forEach((el,i)=>{ if(i>0) el.remove(); });

    let bar = wrapper.querySelector('.cpress-toolbar');
    if (!bar) {
      bar = document.createElement('div');
      bar.className = 'cpress-toolbar';
      wrapper.insertBefore(bar, wrapper.firstChild);
    } else {
      bar.innerHTML = '';
    }

    // Different Keys
    const keyLabel = document.createElement('label');
    keyLabel.className = 'cpress-dk-label';
    keyLabel.textContent = 'Different Keys: ';
    const keySel = document.createElement('select');
    keySel.className = 'cpress-key-select';

    const minorBase = isMinorKey(baseKey);
    const list = minorBase ? MINORS : MAJORS;

    list.forEach(k => {
      const o = document.createElement('option'); o.value=k; o.textContent=k; keySel.appendChild(o);
    });

    // Preselect base (or enharmonic)
    let want = baseKey;
    if (![...keySel.options].some(o=>o.value===want)) {
      const enh = {Db:"C#",Eb:"D#",Gb:"F#",Ab:"G#",Bb:"A#"}[stripMinor(want)];
      want = enh ? (isMinorKey(want)?enh+'m':enh) : list[0];
    }
    [...keySel.options].forEach(o=>{ if(o.value===want) o.selected=true; });

    keyLabel.appendChild(keySel);
    bar.appendChild(keyLabel);

    // Spelling toggle
    const spellWrap = document.createElement('span'); spellWrap.className='cpress-spell';
    const sTxt = document.createElement('span'); sTxt.textContent='  Spelling: ';
    const flatBtn = document.createElement('button'); flatBtn.type='button'; flatBtn.className='cpress-spell-flat'; flatBtn.textContent='♭';
    const sharpBtn= document.createElement('button'); sharpBtn.type='button'; sharpBtn.className='cpress-spell-sharp'; sharpBtn.textContent='♯';
    spellWrap.appendChild(sTxt); spellWrap.appendChild(flatBtn); spellWrap.appendChild(sharpBtn);
    bar.appendChild(spellWrap);

    // Show diagrams
    const diagWrap = document.createElement('label'); diagWrap.className='cpress-diag';
    const diagChk = document.createElement('input'); diagChk.type='checkbox'; diagChk.className='cpress-diagrams-toggle'; diagChk.checked = true;
    diagWrap.appendChild(diagChk); diagWrap.appendChild(document.createTextNode(' Show diagrams'));
    bar.appendChild(diagWrap);

    // Nashville
    const nashWrap = document.createElement('label'); nashWrap.className='cpress-nash';
    const nashChk = document.createElement('input'); nashChk.type='checkbox'; nashChk.className='cpress-nashville-toggle';
    nashWrap.appendChild(nashChk); nashWrap.appendChild(document.createTextNode(' Nashville'));
    bar.appendChild(nashWrap);

    // Buttons
    bar.appendChild(document.createElement('br'));
    const btnRow = document.createElement('div'); btnRow.className='cpress-btnrow';
    [{t:'–1',d:-2},{t:'–½',d:-1},{t:'+½',d:1},{t:'+1',d:2},{t:'Reset',d:null}].forEach(b=>{
      const el=document.createElement('button'); el.type='button'; el.textContent=b.t; el.dataset.delta=(b.d===null?'reset':String(b.d)); btnRow.appendChild(el);
    });
    bar.appendChild(btnRow);

    return {bar,keySel,flatBtn,sharpBtn,diagChk,nashChk,btnRow,minorBase};
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
      // default to the standard ChordPress location
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
      img.src = baseDir + '/' + file;
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
    const majorKey = isMinorKey(currentKey) ? idxToNote(noteToIdx(stripMinor(currentKey))+3, true) : currentKey;
    const preferFlats = !preferSharps;
    wrapper.querySelectorAll('.cpress-chord, [data-chord]').forEach(node=>{
      const original = node.getAttribute('data-original-chord') || node.textContent.trim();
      const out = chordToNashville(original, majorKey, preferFlats);
      node.textContent = out;
      if (node.hasAttribute('data-chord')) node.setAttribute('data-chord', out);
    });

    // Keep diagrams showing real chord names: rebuild from transposed names
    const list = collectTransposedChordSet(wrapper, currentKey, currentKey, preferSharpsForKey(currentKey));
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
    if (preferSharps) { ui.sharpBtn.classList.add('active'); } else { ui.flatBtn.classList.add('active'); }

    setDiagramsVisible(wrapper, true);

    ui.flatBtn.addEventListener('click', ()=>{
      ui.flatBtn.classList.add('active'); ui.sharpBtn.classList.remove('active');
      preferSharps = false;
      if (ui.nashChk.checked) applyNashville(wrapper, ui.keySel.value, preferSharps);
      else applyTransposeNames(wrapper, baseKey, ui.keySel.value, preferSharps);
    });
    ui.sharpBtn.addEventListener('click', ()=>{
      ui.sharpBtn.classList.add('active'); ui.flatBtn.classList.remove('active');
      preferSharps = true;
      if (ui.nashChk.checked) applyNashville(wrapper, ui.keySel.value, preferSharps);
      else applyTransposeNames(wrapper, baseKey, ui.keySel.value, preferSharps);
    });
    ui.diagChk.addEventListener('change', ()=> setDiagramsVisible(wrapper, ui.diagChk.checked));
    ui.nashChk.addEventListener('change', ()=>{
      if (ui.nashChk.checked) applyNashville(wrapper, ui.keySel.value, preferSharps);
      else applyTransposeNames(wrapper, baseKey, ui.keySel.value, preferSharps);
    });
    ui.keySel.addEventListener('change', ()=>{
      if (ui.nashChk.checked) applyNashville(wrapper, ui.keySel.value, preferSharps);
      else applyTransposeNames(wrapper, baseKey, ui.keySel.value, preferSharps);
    });

    ui.btnRow.querySelectorAll('button').forEach(btn=>{
      btn.addEventListener('click', ()=>{
        const d = btn.dataset.delta;
        if (d === 'reset') {
          let want = baseKey;
          if (![...ui.keySel.options].some(o=>o.value===want)) {
            const enh = {Db:"C#",Eb:"D#",Gb:"F#",Ab:"G#",Bb:"A#"}[stripMinor(want)];
            want = enh ? (isMinorKey(want)?enh+'m':enh) : ui.keySel.options[0].value;
          }
          ui.keySel.value = want;
        } else {
          const delta = parseInt(d,10);
          let next = transposeKeyName(ui.keySel.value, delta, preferSharps);
          if (![...ui.keySel.options].some(o=>o.value===next)) {
            const enh = {Db:"C#",Eb:"D#",Gb:"F#",Ab:"G#",Bb:"A#"}[stripMinor(next)];
            next = isMinorKey(next) ? (enh?enh+'m':next) : (enh||next);
          }
          if ([...ui.keySel.options].some(o=>o.value===next)) ui.keySel.value = next;
        }
        if (ui.nashChk.checked) applyNashville(wrapper, ui.keySel.value, preferSharps);
        else applyTransposeNames(wrapper, baseKey, ui.keySel.value, preferSharps);
      });
    });

    // First paint (use whatever is preselected)
    if (ui.nashChk.checked) applyNashville(wrapper, ui.keySel.value, preferSharps);
    else applyTransposeNames(wrapper, baseKey, ui.keySel.value, preferSharps);
  }

  function boot(){ document.querySelectorAll('.cpress').forEach(initWrapper); }
  if (document.readyState !== 'loading') boot(); else document.addEventListener('DOMContentLoaded', boot);
})();