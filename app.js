// app.js - almacenamiento en localStorage + generación de PDF
(function () {
  // Keys en localStorage
  const ASSIGN_KEY = 'cv_assignments';
  const MOV_KEY = 'cv_movements';

  // Util: generar id simple
  function genId() { return Date.now().toString(36) + Math.random().toString(36).slice(2,8); }

  // Guardar/leer helpers
  function read(key) {
    try { return JSON.parse(localStorage.getItem(key) || '[]'); }
    catch(e){ return []; }
  }
  function write(key, arr) { localStorage.setItem(key, JSON.stringify(arr)); }

  // Crear registro de asignación
  function addAssignment({product, seller, assignedBy, note}) {
    const rec = {
      id: genId(),
      product, seller, assigned_by: assignedBy, note: note || '',
      // Guardamos UTC en ISO
      created_at: new Date().toISOString()
    };
    const arr = read(ASSIGN_KEY);
    arr.unshift(rec);
    write(ASSIGN_KEY, arr);
    return rec;
  }

  // Crear movimiento (entrada/salida/liquidacion)
  function addMovement({product, quantity, movement_type, user, reference}) {
    const rec = {
      id: genId(),
      product,
      quantity: Number(quantity),
      movement_type,
      user,
      reference: reference || '',
      created_at: new Date().toISOString()
    };
    const arr = read(MOV_KEY);
    arr.unshift(rec);
    write(MOV_KEY, arr);
    return rec;
  }

  // Conversión a zona local legible
  function toLocal(dtIso) {
    if(!dtIso) return '';
    const d = new Date(dtIso);
    // Mostrar YYYY-MM-DD HH:MM:SS
    return d.getFullYear() + '-' +
      String(d.getMonth()+1).padStart(2,'0') + '-' +
      String(d.getDate()).padStart(2,'0') + ' ' +
      String(d.getHours()).padStart(2,'0') + ':' +
      String(d.getMinutes()).padStart(2,'0') + ':' +
      String(d.getSeconds()).padStart(2,'0');
  }

  // Render tablas (con filtro de fechas opcional en YYYY-MM-DD)
  function renderTables(fromDate, toDate) {
    const assigns = read(ASSIGN_KEY);
    const movs = read(MOV_KEY);
    const tbodyA = document.querySelector('#table-assignments tbody');
    const tbodyM = document.querySelector('#table-movements tbody');
    tbodyA.innerHTML = '';
    tbodyM.innerHTML = '';

    // Convertir filtros a timestamps (incluir todo el día)
    let fromTs = null, toTs = null;
    if(fromDate) fromTs = new Date(fromDate + 'T00:00:00').getTime();
    if(toDate) toTs = new Date(toDate + 'T23:59:59').getTime();

    function inRange(iso) {
      if(!fromTs && !toTs) return true;
      const t = new Date(iso).getTime();
      if(fromTs && t < fromTs) return false;
      if(toTs && t > toTs) return false;
      return true;
    }

    assigns.filter(a => inRange(a.created_at)).forEach(a => {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${toLocal(a.created_at)}</td><td>${escapeHtml(a.product)}</td><td>${escapeHtml(a.seller)}</td><td>${escapeHtml(a.assigned_by)}</td><td>${escapeHtml(a.note)}</td>`;
      tbodyA.appendChild(tr);
    });

    movs.filter(m => inRange(m.created_at)).forEach(m => {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${toLocal(m.created_at)}</td><td>${escapeHtml(m.product)}</td><td>${m.quantity}</td><td>${escapeHtml(m.movement_type)}</td><td>${escapeHtml(m.user)}</td><td>${escapeHtml(m.reference)}</td>`;
      tbodyM.appendChild(tr);
    });
  }

  // Escape básico para seguridad XSS si alguien pega HTML en inputs
  function escapeHtml(str){
    if(!str && str !== 0) return '';
    return String(str).replace(/[&<>\