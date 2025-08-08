:root{
  --bg: #0b0c0e;
  --panel: #0f1114;
  --muted: #9aa4b2;
  --accent: #4fd1c5;
  --text: #e6eef6;
  --radius: 10px;
  --gap: 10px;
}

*{box-sizing:border-box}
html,body{height:100%; margin:0; font-family: Inter, system-ui, -apple-system, "Segoe UI", Roboto, Arial; background:linear-gradient(180deg,#070708,#0b0c0e); color:var(--text)}
.topbar{display:flex; align-items:center; justify-content:space-between; padding:12px 18px; gap:12px; background:linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0.01)); border-bottom:1px solid rgba(255,255,255,0.03)}
.brand{font-weight:800}
.brand .muted{color:var(--muted); font-weight:600; margin-left:6px}

.toolbar{display:flex; width:100%; justify-content:space-between; align-items:center; gap:12px}
.toolbar .left, .toolbar .right{display:flex; align-items:center; gap:8px; flex-wrap:wrap}

button, select, input[type="password"]{
  background:#121314; color:var(--text); border:1px solid rgba(255,255,255,0.03); padding:8px 10px; border-radius:8px; cursor:pointer;
}
button:disabled{opacity:0.6; cursor:default}
.small{font-size:13px; color:var(--muted); display:inline-flex; align-items:center; gap:6px}

/* workspace layout */
.workspace{display:grid; grid-template-columns: 1fr 420px; gap:12px; padding:12px; min-height:calc(100vh - 160px)}
.leftPanel{display:flex; flex-direction:column; gap:8px}
.rightPanel{display:flex; flex-direction:column; gap:8px}

/* tabs */
.tabs{display:flex; gap:8px}
.tab{padding:8px 12px; border-radius:8px; background:#111; color:var(--text); border:1px solid rgba(255,255,255,0.02); cursor:pointer; font-weight:700}
.tab.active{background:linear-gradient(90deg,var(--accent),#7f5af0); color:#040405}

/* editor container */
.editorContainer{height:72vh; background:linear-gradient(180deg, rgba(255,255,255,0.01), rgba(255,255,255,0.01)); border-radius:10px; overflow:hidden; border:1px solid rgba(255,255,255,0.03); display:flex}
.editorMount{flex:1; min-height:0} /* allow flex children to fill */
.hidden{display:none}

/* preview */
.previewWrap{background:#000; border-radius:10px; overflow:hidden; border:1px solid rgba(255,255,255,0.03)}
#preview{width:100%; height:60vh; border:0; display:block; transform-origin: top left}

/* status bar */
.statusBar{display:flex; justify-content:space-between; align-items:center; padding:8px 6px; color:var(--muted)}
.footer{padding:10px 14px; border-top:1px solid rgba(255,255,255,0.03); color:var(--muted); font-size:13px}

/* responsive */
@media (max-width:1100px){
  .workspace{grid-template-columns: 1fr; padding:10px}
  .rightPanel{order:2}
  .leftPanel{order:1}
  #preview{height:48vh}
}

/* editor helpers: make CodeMirror/Monaco mounts fill container */
.cm6-root, .monaco-editor, .editorMount > div { height:100%; width:100%; }
.token{max-width:300px}