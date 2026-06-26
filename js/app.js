(function(){
  const APP_CONFIG = window.APP_CONFIG;

  const state = {
    orders: [], customers: [], products: [], productTestProducts: [], categories: [], delivery: [], discountCodes: [], clinic: [],
    brands: [],
    skinTypes: [], drugStores: [],
    filteredProducts: [], productTestFilteredProducts: [],
    ordersPage: 1, productsPage: 1, productTestPage: 1, pageSize: 10
  };

  function ensureToastContainer(){
    let c = document.getElementById('toast-container');
    if(!c){
      c = document.createElement('div');
      c.id = 'toast-container';
      c.style.position = 'fixed';
      c.style.right = '20px';
      c.style.top = '20px';
      c.style.zIndex = 9999;
      document.body.appendChild(c);
    }
    return c;
  }

  window.__lastUserActionAt = 0;
  document.addEventListener('click', ()=>{ window.__lastUserActionAt = Date.now(); }, true);
  document.addEventListener('submit', ()=>{ window.__lastUserActionAt = Date.now(); }, true);
  document.addEventListener('keydown', (e)=>{ if(e && (e.key === 'Enter' || e.key === ' ')) window.__lastUserActionAt = Date.now(); }, true);

  const toastState = { lastShownAt: 0, recent: new Map(), maxVisible: 3 };
  function showNotification(type, msg, timeout=4000){
    const c = ensureToastContainer();
    const text = String(msg || '').trim();
    if(!text) return;

    const now = Date.now();
    const sinceUserAction = now - (window.__lastUserActionAt || 0);
    if(type === 'info' && sinceUserAction > 2000) return;

    const key = `${type}:${text}`;
    const lastSame = toastState.recent.get(key) || 0;
    if(now - lastSame < 6000) return;
    toastState.recent.set(key, now);
    for(const [k,t] of toastState.recent.entries()){
      if(now - t > 15000) toastState.recent.delete(k);
    }

    if(type === 'error' && now - toastState.lastShownAt < 1200) return;
    toastState.lastShownAt = now;

    while(c.children.length >= toastState.maxVisible){
      c.removeChild(c.firstChild);
    }

    const el = document.createElement('div');
    el.className = 'toast ' + type;
    el.style.background = (type==='error')? '#fee2e2' : (type==='success')? '#d1fae5' : '#e6f2ff';
    el.style.color = (type==='error')? '#991b1b' : (type==='success')? '#065f46' : '#0366d6';
    el.style.padding = '12px 16px';
    el.style.marginTop = '8px';
    el.style.borderRadius = '8px';
    el.style.boxShadow = '0 6px 18px rgba(0,0,0,0.08)';
    el.textContent = text;
    c.appendChild(el);
    setTimeout(()=>{ el.style.opacity = '0'; setTimeout(()=>el.remove(),300); }, timeout);
  }
  window.showNotification = showNotification;

  window.openDataModal = function(title, data){
    const modal = document.getElementById('data-modal');
    if(!modal) return;
    document.getElementById('data-modal-title').textContent = title || 'Details';
    const content = document.getElementById('data-modal-content');
    content.innerHTML = '';

    if(!data){
        content.textContent = 'No data available';
        openModal('data-modal');
        return;
    }

    const table = document.createElement('table');
    table.style.width = '100%';
    table.style.borderCollapse = 'collapse';
    
    function renderValue(v, keyName){
        if(v == null) return '';
        if(typeof v === 'object'){
             if(Array.isArray(v)){
                 if(v.length === 0) return '[]';
                 if(typeof v[0] === 'object'){
                     const keys = Object.keys(v[0]);
                     return `<div style="max-height:200px; overflow:auto;"><table border="1" style="width:100%; border-collapse:collapse; font-size:12px;"><thead><tr>${keys.map(k=>`<th style="padding:4px; background:#f3f4f6;">${k}</th>`).join('')}</tr></thead><tbody>${v.map(item=>`<tr>${Object.entries(item).map(([k,val])=>`<td style="padding:4px;">${renderValue(val, k)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
                 }
                 return v.join(', ');
             }
             return `<div style="padding-left:10px; border-left:2px solid #eee;">${Object.entries(v).map(([k,val]) => `<div><strong>${k}:</strong> ${renderValue(val, k)}</div>`).join('')}</div>`;
        }
        const lowerKey = (keyName || '').toString().toLowerCase();
        if(lowerKey === 'linkofpic') return String(v);

        const strV = String(v).trim();
        const rewritten = rewriteUploadsHost(strV);
        
        const looksLikeUrl = rewritten.startsWith('http') || rewritten.match(/^\/?uploads\//) || rewritten.includes('/uploads/');
        const isImageKey = lowerKey.includes('image') || lowerKey.includes('photo') || lowerKey.includes('pic') || lowerKey.includes('img');
        const looksLikeImage = rewritten.match(/\.(jpg|jpeg|png|gif|webp)(\?.*)?$/i) || rewritten.includes('/uploads/') || (looksLikeUrl && isImageKey);
        if(looksLikeUrl && looksLikeImage){
             const displaySrc = resolveDisplayUrl(rewritten);
             const fallbackSrc = absoluteUploadsUrl(rewritten);
             const placeholder = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgdmlld0JveD0iMCAwIDYwIDYwIj48cmVjdCB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIGZpbGw9IiNmM2Y0ZjYiLz48dGV4dCB4PSI1MCUiIHk9IjUwJSIgZG9taW5hbnQtYmFzZWxpbmU9Im1pZGRsZSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZm9udC1mYW1pbHk9InNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMTAiIGZpbGw9IiM5OTkiPk5vIEltZzwvdGV4dD48L3N2Zz4=';
             const onImgError = `this.onerror=null; if(this.dataset.fallback){ this.src=this.dataset.fallback; this.dataset.fallback=''; return; } this.src='${placeholder}';`;
             const altText = keyName ? `${keyName} image` : 'Image';
             return `<img class="details-image" src="${escapeAttr(displaySrc)}" alt="${escapeAttr(altText)}" onerror="${onImgError}" onclick="window.open('${escapeAttr(displaySrc)}','_blank')" ${fallbackSrc && fallbackSrc !== displaySrc ? `data-fallback="${escapeAttr(fallbackSrc)}"` : ''}>`;
        }
        return String(v);
    }

    Object.entries(data).forEach(([key, value]) => {
        const tr = document.createElement('tr');
        tr.style.borderBottom = '1px solid #eee';
        
        const tdKey = document.createElement('td');
        tdKey.style.padding = '8px';
        tdKey.style.fontWeight = 'bold';
        tdKey.style.width = '30%';
        tdKey.style.verticalAlign = 'top';
        tdKey.textContent = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());

        const tdVal = document.createElement('td');
        tdVal.style.padding = '8px';
        tdVal.innerHTML = renderValue(value, key);

        tr.appendChild(tdKey);
        tr.appendChild(tdVal);
        table.appendChild(tr);
    });

    content.appendChild(table);
    openModal('data-modal');
  }

  async function loadStatuses(){
    try{
        let allDefs = [];
        let defaultDefs = [];

        if(api.orderStatus && api.orderStatus.getAll){
             try{ 
                 const raw = await api.orderStatus.getAll();
                 const list = listFrom(raw);
                 allDefs = list;
                 defaultDefs = list.filter(x => x && x.type && String(x.type).toLowerCase() === 'default');
             }catch(e){}
        }
        if((!allDefs || !allDefs.length) && api.cart.getStatuses){
            try{ 
              const s = await api.cart.getStatuses(); 
              allDefs = listFrom(s);
              defaultDefs = allDefs.slice();
            }catch(e){}
        }
        state.statusesAll = listFrom(allDefs || []);
        state.statusesDefault = listFrom(defaultDefs || allDefs || []);
        state.statuses = state.statusesDefault;
    populateStatusDropdowns();
  }catch(e){ console.error('Failed to load statuses', e); }
}

async function checkAndSendNotification(orderId, status, originalOrder){
    if(!status) return;
    const s = String(status).toLowerCase().trim();
    let payload = null;
    
    // Extract userId
    const userId = originalOrder.userId || 
                  (originalOrder.cartDto && originalOrder.cartDto.userId) || 
                  originalOrder.customerId ||
                  (originalOrder.cart && originalOrder.cart.userId);
                  
    if(!userId) {
        console.warn('No userId found for notification', originalOrder);
        return;
    }

    // "Delivery" or "In Delivery" -> Order Confirmed
    if(s === 'delivery' || s === 'in delivery' || s === 'indelivery'){
         payload = { 
           "title": "Order Confirmed! 🎉", 
           "message": "Great news! We've received your order and are getting it ready for you. Check the details here.", 
           "route": `/order-details/${orderId}`, 
           "imageUrl": "", 
           "externalIds": [userId]  
         };
    } 
    // "Delivered" -> Package Delivered
    else if(s === 'delivered'){
         payload = { 
           "title": "Package Delivered! 📦", 
           "message": "It's here! Your order has been successfully delivered. We hope you love it!", 
           "route": `/order-history/${orderId}`, 
           "imageUrl": "", 
           "externalIds": [userId] 
         };
    }

    if(payload){
        try{
            if(api.notifications && api.notifications.sendCustom){
                await api.notifications.sendCustom(payload);
                console.log('Notification sent', payload);
            }
        }catch(e){
            console.error('Failed to send notification', e);
        }
    }
}

  function populateStatusDropdowns(){
      const defaults = listFrom(state.statusesDefault || state.statuses || []);
      let all = listFrom(state.statusesAll || defaults).filter(s => {
          const val = s.name || s.status || s.title || String(s);
          return String(val).toLowerCase() !== 'created';
      });
      const hasInDelivery = all.some(s => {
          const val = s.name || s.status || s.title || String(s);
          return String(val).toLowerCase() === 'in delivery';
      });
      if(!hasInDelivery) all = [...all, { name: 'In Delivery' }];

      const makeOption = (s)=> {
          const label = s.name || s.status || s.title || String(s);
          const val = label;
          return `<option value="${val}">${label}</option>`;
      };

      const optsDefault = defaults.map(makeOption).join('');
      const optsAll = all.map(makeOption).join('');

      const orderSelect = document.getElementById('order-status');
      const vendorSelect = document.getElementById('order-vendor-status');
      const ordersFilter = document.getElementById('orders-status-filter');
      const dashboardFilter = document.getElementById('dashboard-status-filter');

      if(orderSelect) orderSelect.innerHTML = '<option value="">Select Status</option>' + optsDefault;
      if(ordersFilter) ordersFilter.innerHTML = '<option value="">All Statuses</option>' + optsAll;
      if(dashboardFilter) dashboardFilter.innerHTML = '<option value="">All Statuses</option>' + optsDefault;
      if(vendorSelect) vendorSelect.innerHTML = '<option value=\"\">Select Vendor Status</option>' + optsAll;
  }

  function ensureJsonModal(){
    let modal = document.getElementById('json-modal');
    if(modal) return modal;
    modal = document.createElement('div');
    modal.className = 'modal';
    modal.id = 'json-modal';
    modal.style.maxWidth = '900px';
    modal.innerHTML = `
      <div style="display:flex; align-items:center; justify-content:space-between; gap:12px; margin-bottom:12px">
        <h3 id="json-modal-title" style="margin:0">Details</h3>
        <div style="display:flex; gap:8px">
          <button type="button" class="btn btn-outline" id="json-modal-copy">Copy</button>
          <button type="button" class="btn btn-outline" id="json-modal-close">Close</button>
        </div>
      </div>
      <pre id="json-modal-pre" style="white-space:pre; overflow:auto; max-height:70vh; background:#0b1220; color:#e5e7eb; padding:12px; border-radius:10px; font-size:12px; line-height:1.4"></pre>
    `;
    document.body.appendChild(modal);

    modal.querySelector('#json-modal-close').addEventListener('click', ()=> closeModal('json-modal'));
    modal.querySelector('#json-modal-copy').addEventListener('click', async ()=> {
      const text = modal.querySelector('#json-modal-pre')?.textContent || '';
      try{
        await navigator.clipboard.writeText(text);
        showNotification('success','Copied');
      }catch(e){
        try{
          const ta = document.createElement('textarea');
          ta.value = text;
          document.body.appendChild(ta);
          ta.select();
          document.execCommand('copy');
          ta.remove();
          showNotification('success','Copied');
        }catch(err){
          showNotification('error','Copy failed');
        }
      }
    });

    return modal;
  }

  window.openJsonModal = function(title, data){
    ensureJsonModal();
    const t = document.getElementById('json-modal-title');
    const pre = document.getElementById('json-modal-pre');
    if(t) t.textContent = title || 'Details';
    if(pre){
      try{
        pre.textContent = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
      }catch(e){
        pre.textContent = String(data);
      }
    }
    openModal('json-modal');
  }

  window.toggleMobileMenu = function(){
    const sidebar = document.querySelector('.sidebar');
    if(!sidebar) return;
    sidebar.classList.toggle('mobile-open');
  }

  function showView(id){
    
    const userType = localStorage.getItem('userType');
    const isVendor = String(userType).toLowerCase() === 'vendor';

    if (isVendor && id !== 'orders' && id !== 'signin' && id !== 'signup') {
        id = 'orders';
    }

    document.querySelectorAll('.view').forEach(v=> {
      v.classList.remove('active');
    });
    
    const el = document.getElementById(id + '-view') || document.getElementById(id);
    if(el) {
      el.classList.add('active');
    }
    
      document.querySelectorAll('.nav-item').forEach(n=> {
        n.classList.remove('active');
        if (isVendor) {
            const onclick = n.getAttribute('onclick');
            if (onclick && (onclick.includes("'orders'") || onclick.includes("logout()"))) {
                n.style.display = 'flex';
            } else {
                n.style.display = 'none';
            }
        } else {
            n.style.display = 'flex';
        }
      });
      const nav = Array.from(document.querySelectorAll('.nav-item')).find(n => {
        const onclick = n.getAttribute('onclick');
        return onclick && onclick.includes(`showView('${id}')`);
      });
      if(nav) nav.classList.add('active');
      
      if (id === 'signin' || id === 'signup') {
        document.body.classList.add('auth-mode');
      } else {
        document.body.classList.remove('auth-mode');
        
        // Role-based visibility for dashboard actions
        const dashActions = document.getElementById('dashboard-discount-actions');
        if (dashActions) {
            dashActions.style.display = isVendor ? 'none' : 'flex';
        }

        if(id === 'dashboard') loadDashboardData();
        if(id === 'orders') loadOrdersData();
        if(id === 'customers') loadCustomers();
        if(id === 'brands') loadBrands();
        if(id === 'products') loadProducts();
        if(id === 'product-test') loadProductTest();
        if(id === 'categories' && window.loadCategoriesPage) window.loadCategoriesPage();
        if(id === 'delivery') loadDelivery();
        if(id === 'discount-codes') loadDiscounts();
        if(id === 'clincinfo') loadClinic();
        if(id === 'ads') loadAds();
        if(id === 'support-service') loadSupportService();
        if(id === 'analytics') renderCharts();
        if(id === 'security-audit') loadSecurityAudit();
        if(id === 'performance') loadPerformance();
      }
    }
  window.showView = showView;

  window.openModal = function(id){
    const overlay = document.getElementById('modal-overlay');
    const modal = document.getElementById(id);
    if(!modal){
      showNotification('error', 'Modal not found');
      return;
    }
    if(id === 'order-modal'){
      const oid = document.getElementById('order-id')?.value || '';
      if(!oid) document.getElementById('order-modal-title').textContent = 'New Order';
    }
    if(id === 'customer-modal'){
      const cid = document.getElementById('customer-id')?.value || '';
      if(!cid) document.getElementById('customer-modal-title').textContent = 'New Customer';
    }
    if(id === 'product-modal'){
      ensureProductCategoryOptions();
      const pid = document.getElementById('product-id')?.value || '';
      if(!pid) document.getElementById('product-modal-title').textContent = 'New Product';
    }
    if(id === 'product-test-modal'){
      ensureProductTestCategoryOptions();
      const pid = document.getElementById('product-test-id')?.value || '';
      if(!pid) document.getElementById('product-test-modal-title').textContent = 'New Product';
    }
    if(id === 'category-modal'){
      const cid = document.getElementById('category-id')?.value || '';
      if(!cid) document.getElementById('category-modal-title').textContent = 'New Category';
    }
    if(id === 'brand-modal'){
      const bid = document.getElementById('brand-id')?.value || '';
      if(!bid) document.getElementById('brand-modal-title').textContent = 'New Brand';
    }
    if(id === 'discount-modal'){
      const did = document.getElementById('discount-id')?.value || '';
      if(!did) document.getElementById('discount-modal-title').textContent = 'New Discount Code';
    }
    if(id === 'clincinfo-modal'){
      const cid = document.getElementById('clincinfo-id')?.value || '';
      if(!cid) document.getElementById('clincinfo-modal-title').textContent = 'New Clinic Info';
    }
    if(id === 'delivery-modal'){
      const did = document.getElementById('delivery-id')?.value || '';
      if(!did) document.getElementById('delivery-modal-title').textContent = 'Update Delivery';
    }
    if(id === 'support-service-modal'){
      const sid = document.getElementById('support-service-id')?.value || '';
      if(!sid) document.getElementById('support-service-modal-title').textContent = 'New Support Service';
    }
    if(overlay) overlay.style.display = 'block';
    modal.style.display = 'block';
  }
  window.closeModal = function(id){
    const overlay = document.getElementById('modal-overlay');
    const modal = document.getElementById(id);
    if(overlay) overlay.style.display = 'none';
    if(modal) modal.style.display = 'none';
  }

  window.switchSettingsTab = function(tab){
    document.querySelectorAll('.settings-tab').forEach(t=> t.classList.remove('active'));
    document.querySelectorAll('.settings-tab-content').forEach(c=> c.classList.remove('active'));
    document.querySelector(`.settings-tab[onclick="switchSettingsTab('${tab}')"]`)?.classList.add('active');
    document.getElementById(tab + '-tab')?.classList.add('active');
  }

  const SETTINGS_STORAGE_KEY = 'genskin_admin_settings';
  function loadSettingsFromStorage(){
    try{
      const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
      if(!raw) return;
      const s = JSON.parse(raw);
      if(!s || typeof s !== 'object') return;
      const company = document.getElementById('settings-company');
      const email = document.getElementById('settings-email');
      const phone = document.getElementById('settings-phone');
      const address = document.getElementById('settings-address');
      const notifyEmail = document.getElementById('settings-notify-email');
      const twoFa = document.getElementById('settings-2fa');
      if(company && s.company != null) company.value = String(s.company);
      if(email && s.email != null) email.value = String(s.email);
      if(phone && s.phone != null) phone.value = String(s.phone);
      if(address && s.address != null) address.value = String(s.address);
      if(notifyEmail && s.notifyEmail != null) notifyEmail.checked = !!s.notifyEmail;
      if(twoFa && s.twoFa != null) twoFa.checked = !!s.twoFa;
    }catch(e){
      console.warn('Failed to load settings', e);
    }
  }
  function saveSettingsToStorage(){
    const s = {
      company: document.getElementById('settings-company')?.value || '',
      email: document.getElementById('settings-email')?.value || '',
      phone: document.getElementById('settings-phone')?.value || '',
      address: document.getElementById('settings-address')?.value || '',
      notifyEmail: !!document.getElementById('settings-notify-email')?.checked,
      twoFa: !!document.getElementById('settings-2fa')?.checked,
      savedAt: new Date().toISOString()
    };
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(s));
    return s;
  }
  window.saveSettings = function(){
    saveSettingsToStorage();
    showNotification('success', 'Settings saved');
  }

  function formatDate(d){ try{ return new Date(d).toLocaleString(); }catch(e){ return d; } }
  function listFrom(res){
    if(Array.isArray(res)) return res;
    if(!res || typeof res!=='object') return [];
    if(Array.isArray(res.data)) return res.data;
    const keys=['items','orders','list','result','records','value','values'];
    for(let i=0;i<keys.length;i++){const k=keys[i]; if(Array.isArray(res[k])) return res[k];}
    return Array.isArray(res.values)? res.values : Object.values(res).filter(v=> typeof v==='object');
  }

  function normalizeMultiValue(value){
    if(Array.isArray(value)) return value.map(v=>String(v).trim()).filter(Boolean);
    if(value == null) return [];
    if(typeof value === 'string') return value.split(',').map(v=>v.trim()).filter(Boolean);
    return [];
  }

  function getMultiSelectValues(el){
    if(!el) return [];
    if(el.classList && el.classList.contains('multi-select')){
      const inputId = el.dataset.input;
      const input = inputId ? document.getElementById(inputId) : null;
      return normalizeMultiValue(input ? input.value : el.dataset.values);
    }
    if(el.tagName){
      const tag = el.tagName.toLowerCase();
      if(tag === 'select'){
        return Array.from(el.selectedOptions).map(o=>o.value).filter(v=>v!=='' && v!=null);
      }
      if(tag === 'input'){
        return normalizeMultiValue(el.value);
      }
    }
    return normalizeMultiValue(el.value || el.dataset?.values);
  }

  function updateMultiSelectDisplay(inputId){
    if(!inputId) return;
    const input = document.getElementById(inputId);
    const container = document.querySelector(`.multi-select[data-input="${inputId}"]`);
    if(!container || !input) return;
    const values = normalizeMultiValue(input.value);
    container.dataset.values = values.join(',');
    
    const trigger = container.querySelector('.multi-select-trigger');
    const triggerContainer = container.querySelector('.multi-select-trigger-container');
    const chipsContainer = container.querySelector('.multi-select-chips');
    const searchInput = container.querySelector('.multi-select-search');
    
    if(triggerContainer && chipsContainer){
      const placeholder = container.dataset.placeholder || 'Select';
      const displayMode = container.dataset.display || '';
      if(displayMode === 'chips' || displayMode === 'search'){
          const variantFor = (val) => {
            const v = String(val || '').toLowerCase();
            if (inputId.includes('-time')) {
              if (v === 'am') return 'yellow';
              if (v === 'pm') return 'blue';
            }
            return APP_CONFIG.CHIP_VARIANTS[inputId] || 'gray';
          };
        
        if(values.length){
          const isSingle = !!container.dataset.single;
          chipsContainer.innerHTML = values.map(v=>{
            const safe = escapeAttr(v);
            const variant = variantFor(v);
            const cls = `chip chip--${variant}`;
            const removeBtn = isSingle ? '' : `<span class="chip-remove" data-value="${safe}">×</span>`;
            return `<span class="${cls}" data-value="${safe}"><span>${safe}</span>${removeBtn}</span>`;
          }).join('');
        } else {
          chipsContainer.innerHTML = `<span class="multi-select-placeholder" style="color:#9CA3AF; font-size:14px;">${escapeAttr(placeholder)}</span>`;
        }
      }
    } else if(trigger){
      const placeholder = container.dataset.placeholder || 'Select';
      trigger.textContent = values.length ? values.join(', ') : placeholder;
    }

    const menu = container.querySelector('.multi-select-menu');
    if(menu){
      Array.from(menu.querySelectorAll('input[type="checkbox"]')).forEach(cb=>{
        cb.checked = values.includes(cb.value);
      });
      // If single-select search, also update radio buttons or highlight
      Array.from(menu.querySelectorAll('.multi-select-option')).forEach(opt => {
          const val = opt.dataset.value;
          if(val) {
              if(values.includes(val)) opt.classList.add('selected');
              else opt.classList.remove('selected');
          }
      });
    }
  }

  function bindMultiSelect(inputId){
    const container = document.querySelector(`.multi-select[data-input="${inputId}"]`);
    if(!container || container.dataset.bound) return;
    container.dataset.bound = '1';
    
    const trigger = container.querySelector('.multi-select-trigger');
    const triggerContainer = container.querySelector('.multi-select-trigger-container');
    const menu = container.querySelector('.multi-select-menu');
    const searchInput = container.querySelector('.multi-select-search');
    const input = document.getElementById(inputId);
    
    const toggleMenu = (e) => {
      // Handle chip removal
      const removeEl = e.target && e.target.closest ? e.target.closest('.chip-remove') : null;
      if(removeEl){
        e.preventDefault();
        e.stopPropagation();
        const val = removeEl.dataset.value || '';
        if(input){
          const next = normalizeMultiValue(input.value).filter(v => v !== val);
          input.value = next.join(', ');
          updateMultiSelectDisplay(inputId);
          if(inputId === 'product-gender') updateGenderArabic();
          if(inputId === 'product-test-gender') updateProductTestGenderArabic();
        }
        return;
      }

      // Toggle menu
      e.preventDefault();
      e.stopPropagation();
      document.querySelectorAll('.multi-select-menu.show').forEach(m=>{
        if(m !== menu) m.classList.remove('show');
      });
      if(menu) {
        menu.classList.toggle('show');
        if(menu.classList.contains('show')){
            container.classList.add('active');
            if(searchInput) {
                searchInput.value = '';
                searchInput.focus();
                filterOptions('');
            }
        } else {
            container.classList.remove('active');
        }
      }
    };

    const filterOptions = (query) => {
        if(!menu) return;
        const q = query.toLowerCase();
        const options = menu.querySelectorAll('.multi-select-option');
        let hasVisible = false;
        options.forEach(opt => {
            const text = opt.textContent.toLowerCase();
            const isMatch = text.includes(q);
            opt.style.display = isMatch ? 'flex' : 'none';
            if(isMatch) hasVisible = true;
        });

        
        const addNew = menu.querySelector('.multi-select-add-new');
        if(addNew) {
            if(q && !hasVisible) {
                addNew.style.display = 'flex';
                addNew.querySelector('.new-value').textContent = query;
                addNew.dataset.value = query;
            } else {
                addNew.style.display = 'none';
            }
        }
    };

    if(searchInput) {
        searchInput.addEventListener('input', (e) => {
            const query = e.target.value;
            filterOptions(query);
            
          
        });
        searchInput.addEventListener('click', (e) => e.stopPropagation());
        
        // Handle "Enter" key in search input to add new brand
        searchInput.addEventListener('keydown', (e) => {
            if(e.key === 'Enter' && container.dataset.canAdd && !container.dataset.single === false) {
                const query = e.target.value.trim();
                if(query) {
                    e.preventDefault();
                    e.stopPropagation();
                    if(input) input.value = query;
                    menu.classList.remove('show');
                    container.classList.remove('active');
                    updateMultiSelectDisplay(inputId);
                }
            }
        });
    }

    if(triggerContainer){
        triggerContainer.addEventListener('click', toggleMenu);
    } else if(trigger){
        trigger.addEventListener('click', toggleMenu);
    }
    
    if(menu){
      menu.addEventListener('click', (e)=> {
          const option = e.target.closest('.multi-select-option');
          if(!option) return;
          e.stopPropagation();

          const val = option.dataset.value || option.querySelector('input')?.value;
          if(!val) return;

          const isMulti = !container.dataset.single;
          const addNew = option.closest('.multi-select-add-new');
          
          if(isMulti) {
              if(addNew){
                  const newVal = addNew.dataset.value;
                  if(newVal && input){
                      const current = normalizeMultiValue(input.value);
                      if(!current.includes(newVal)){
                          current.push(newVal);
                          input.value = current.join(', ');
                          if(searchInput) {
                              searchInput.value = '';
                              filterOptions('');
                          }
                          updateMultiSelectDisplay(inputId);
                      }
                  }
              } else {
                  const cb = option.querySelector('input[type="checkbox"]');
                  if(cb) {
                      if(e.target !== cb) {
                          cb.checked = !cb.checked;
                      }
                      const vals = Array.from(menu.querySelectorAll('input[type="checkbox"]:checked')).map(c=>c.value);
                      if(input) input.value = vals.join(', ');
                  }
              }
          } else {
              // Single Select Logic
              const finalVal = addNew ? addNew.dataset.value : val;
              if(input) input.value = finalVal;
              menu.classList.remove('show');
              container.classList.remove('active');
          }

          // Auto-fill country for brands (Common logic for both single and multi)
          if(inputId.includes('brand-name')) {
              const lastSelected = addNew ? addNew.dataset.value : val;
              console.log('Brand selected:', lastSelected, 'State brands:', state.brands?.length);
              
              const brand = (state.brands || []).find(b => {
                  const bName = (b.brandName || b.name || '').trim().toLowerCase();
                  const sName = (lastSelected || '').trim().toLowerCase();
                  return bName === sName && bName !== '';
              });
              
              if(brand) {
                  const countryId = inputId.includes('test') ? 'product-test-brand-country' : 'product-brand-country';
                  const countryInput = document.getElementById(countryId);
                  const countryVal = brand.countryOfOrigin || brand.brandCountryofOrigin || brand.country || '';
                  console.log('Found brand:', brand.brandName, 'Country:', countryVal);
                  
                  if(countryInput) {
                      countryInput.value = countryVal;
                  }
              }
          }

          updateMultiSelectDisplay(inputId);
          if(inputId === 'product-gender') updateGenderArabic();
          if(inputId === 'product-test-gender') updateProductTestGenderArabic();
      });
    }
    
    document.addEventListener('click', (e)=>{
        if(!container.contains(e.target)){
            if(menu && menu.classList.contains('show')) {
                // Auto-pick search query for can-add single-selects on blur
                if(container.dataset.canAdd && container.dataset.single && searchInput && searchInput.value.trim()){
                    if(input) input.value = searchInput.value.trim();
                    updateMultiSelectDisplay(inputId);
                }
                menu.classList.remove('show');
                container.classList.remove('active');
            }
        }
    });
  }

  function setMultiSelectOptions(inputId, options){
    const el = document.getElementById(inputId);
    if(el && el.tagName && el.tagName.toLowerCase() === 'select'){
      const values = normalizeMultiValue(el.dataset.values || '');
      const set = new Set(values);
      el.innerHTML = options.map(opt=>{
        const val = String(opt.value ?? opt.label ?? '');
        const lbl = String(opt.label ?? opt.value ?? '');
        const sel = set.has(val) ? 'selected' : '';
        return `<option value="${escapeAttr(val)}" ${sel}>${escapeAttr(lbl)}</option>`;
      }).join('');
      return;
    }
    const container = document.querySelector(`.multi-select[data-input="${inputId}"]`);
    if(!container) return;
    bindMultiSelect(inputId);
    const menu = container.querySelector('.multi-select-menu');
    const input = document.getElementById(inputId);
    const values = normalizeMultiValue(input ? input.value : container.dataset.values);
    const isSingle = !!container.dataset.single;
    const canAdd = !!container.dataset.canAdd;

    if(menu){
      let html = '';
      if(container.dataset.display === 'search') {
          html += `<div class="multi-select-search-container"><input type="text" class="multi-select-search" placeholder="Search..."></div>`;
      }
      
      html += options.map(opt=>{
        const value = String(opt.value ?? opt.label ?? '');
        const label = String(opt.label ?? opt.value ?? '');
        if(isSingle) {
            return `<div class="multi-select-option" data-value="${escapeAttr(value)}"><span>${escapeAttr(label)}</span></div>`;
        }
        const checked = values.includes(value) ? 'checked' : '';
        return `<label class="multi-select-option" data-value="${escapeAttr(value)}"><input type="checkbox" value="${escapeAttr(value)}" ${checked}><span>${escapeAttr(label)}</span></label>`;
      }).join('');

      if(canAdd) {
          html += `<div class="multi-select-option multi-select-add-new" style="display:none;"><span>Add "</span><span class="new-value"></span><span>"</span></div>`;
      }

      menu.innerHTML = html;
    }
    updateMultiSelectDisplay(inputId);
  }

  function setMultiSelectValues(el, values){
    if(!el) return;
    let list = normalizeMultiValue(values);
    
    // Handle single-select restriction
    const container = el.classList && el.classList.contains('multi-select') ? el : document.querySelector(`.multi-select[data-input="${el.id}"]`);
    if(container && container.dataset.single && list.length > 1) {
        list = [list[0]];
    }
    
    const set = new Set(list.map(v=>String(v)));

    if(el.tagName){
      const tag = el.tagName.toLowerCase();
      if(tag === 'select'){
        Array.from(el.options).forEach(opt=>{
          opt.selected = set.has(opt.value);
        });
        el.dataset.values = list.join(',');
        return;
      }
      if(tag === 'input'){
        el.value = list.join(', ');
        if(container){
            const menu = container.querySelector('.multi-select-menu');
            if(menu){
                menu.querySelectorAll('input[type="checkbox"]').forEach(cb => {
                    cb.checked = set.has(cb.value);
                });
            }
        }
        updateMultiSelectDisplay(el.id);
        return;
      }
    }
    if(el.classList && el.classList.contains('multi-select')){
      const inputId = el.dataset.input;
      const input = inputId ? document.getElementById(inputId) : null;
      if(input) {
          input.value = list.join(', ');
          const menu = el.querySelector('.multi-select-menu');
          if(menu){
              menu.querySelectorAll('input[type="checkbox"]').forEach(cb => {
                  cb.checked = set.has(cb.value);
              });
          }
          updateMultiSelectDisplay(inputId);
      }
    }
  }
  document.addEventListener('click', (e)=>{
    if(!e.target.closest('.multi-select')){
      document.querySelectorAll('.multi-select-menu.show').forEach(m=>m.classList.remove('show'));
    }
  });
  function num(v){ const n = Number(v); return isNaN(n)? 0 : n; }
  function parseNumberLike(v){
    if(v==null) return 0;
    if(typeof v==='number') return v;
    if(typeof v==='string'){
      const m = v.match(/-?\d+(\.\d+)?/);
      return m? Number(m[0]) : 0;
    }
    return Number(v)||0;
  }
  function itemsToString(items){
    if(!items) return '';
    if(Array.isArray(items)){
      return items.map(i=>{
        const name = i.name || i.productName || i.productNameEN || i.productNameAR || i.title || i.itemName || i.product || '';
        const qty = i.quantity ?? i.qty ?? i.count ?? i.noOfUnits ?? i.units ?? 1;
        return `${name} x ${qty}`;
      }).join(', ');
    }
    if(typeof items === 'object'){
      const name = items.name || items.productName || items.productNameEN || items.productNameAR || items.title || items.itemName || items.product || '';
      const qty = items.quantity ?? items.qty ?? items.count ?? items.noOfUnits ?? items.units ?? '';
      return qty ? `${name} x ${qty}` : (name || JSON.stringify(items));
    }
    return String(items);
  }
  function getOrderDate(o){
    const d = o.createdAt || o.createdOn || o.orderDate || o.date || o.timestamp || o.orderTimestamp || o.updatedAt;
    const dt = d ? new Date(d) : new Date();
    return isNaN(dt.getTime()) ? new Date() : dt;
  }
  function getLocalDateKey(value){
    if(!value) return '';
    const dt = new Date(value);
    if(isNaN(dt.getTime())) return '';
    const y = dt.getFullYear();
    const m = String(dt.getMonth() + 1).padStart(2, '0');
    const d = String(dt.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  function getCategoryName(p){
    const n = p.categoryName || p.category || p.categoryEN || p.categoryENS || p.categoryAr || '';
    if(n) return n;
    const cid = p.categoryId || p.categoryID || p.catId || p.catID;
    if(cid!=null){
      const c = state.categories.find(x => (x.categoryId||x.id||x.catId) == cid);
      return c ? (c.name||c.categoryName||c.nameAr||cid) : cid;
    }
    return '';
  }
  function getStock(p){
    return p.stock ?? p.quantity ?? p.quantityInStock ?? p.availableStock ?? '';
  }
  function getPrice(p){
    const raw = p.price ?? p.unitPrice ?? p.sellingPrice ?? p.finalPrice ?? p.cost ?? null;
    const val = parseNumberLike(raw);
    return isNaN(val)? '' : val.toFixed(2);
  }
  function getProductId(p){
    return p.productId ?? p.id ?? p.code ?? '';
  }
  function getProductName(p){
    return p.name ?? p.productName ?? p.title ?? p.enName ?? p.arName ?? p.productNameEN ?? p.productNameAR ?? '';
  }
  function getCategoryLabel(c){
    if(c==null) return '';
    if(typeof c === 'string') return c;
    return c.name || c.categoryName || c.categoryEN || c.categoryENS || c.nameAr || c.categoryAr || c.label || String(c);
  }
  function getCategoryIdValue(c){
    if(c==null) return '';
    if(typeof c === 'string') return c;
    return c.categoryId || c.id || c.catId || c.code || getCategoryLabel(c);
  }
  function getProductDescription(p){
    return p.description || p.desc || p.productDescription || p.descriptionEN || p.productDescEN || p.productDesc || p.descriptionAR || '';
  }
  function normalizeUrl(u){
    if(!u) return '';
    let s = String(u).split(',')[0];
    s = s.trim().replace(/^['"`\s]+|['"`\s]+$/g, '');
    return s;
  }
  function escapeAttr(v){
    if(v==null) return '';
    return String(v)
      .replace(/&/g,'&amp;')
      .replace(/</g,'&lt;')
      .replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;')
      .replace(/'/g,'&#39;');
  }
  function uploadsPathFromUrl(url){
    if(!url) return '';
    const cleaned = String(url).trim().replace(/[,\s]+$/,'');
    const m = cleaned.match(/(\/uploads\/[^?#]+(\?[^#]*)?)/i);
    if(m) return m[1];
    return '';
  }
  function rewriteUploadsHost(url){
    if(!url) return '';
    let cleaned = String(url).replace(/[\r\n\t]+/g, '').trim().replace(/[,\s]+$/,'');
 
    cleaned = cleaned.replace(/\\/g, '/');
 
    try {
        cleaned = decodeURI(cleaned);
    } catch(e) {}

    let finalUrl = cleaned;

    // 1. Force any URL containing /uploads/ to use the correct absolute path
    const uploadsIndex = finalUrl.toLowerCase().indexOf('/uploads/');
    if (uploadsIndex !== -1) {
        // Extract everything starting from /uploads/
        let path = finalUrl.slice(uploadsIndex);
        
        // User wants the literal string (with spaces/parentheses) in the API payload
        // path = path.replace(/ /g, '%20').replace(/\(/g, '%28').replace(/\)/g, '%29');
        
        return path;
    }

    // 2. If it looks like a filename (image extension) and no path, assume /uploads/
    if(!finalUrl.match(/^https?:\/\//i) && finalUrl.match(/\.(jpg|jpeg|png|gif|webp)$/i) && !finalUrl.includes('/')){
         let path = '/uploads/' + finalUrl;
         // path = path.replace(/ /g, '%20').replace(/\(/g, '%28').replace(/\)/g, '%29');
         return path;
    }
    
    // return finalUrl.replace(/ /g, '%20').replace(/\(/g, '%28').replace(/\)/g, '%29');
    return finalUrl;
  }
  function getUploadsBaseUrl(forceAbsolute){
    const absoluteBase = APP_CONFIG.UPLOAD_BASE.replace(/\/$/, '');
    if(forceAbsolute) return absoluteBase;
    return '/uploads';
  }
  function resolveDisplayUrl(url){
    if(!url) return '';
    const cleaned = rewriteUploadsHost(url);
    if(!cleaned) return '';
    if(cleaned.match(/^https?:\/\//i)) return cleaned;
    if(cleaned.startsWith('/uploads/')){
      const base = getUploadsBaseUrl(false);
      // Add timestamp to prevent caching issues with broken images
      const path = cleaned.slice('/uploads'.length);
      const sep = path.includes('?') ? '&' : '?';
      return base === '/uploads' ? (cleaned + sep + 'v=' + Date.now()) : (base + path);
    }
    return cleaned;
  }
  function absoluteUploadsUrl(url){
    if(!url) return '';
    const cleaned = rewriteUploadsHost(url);
    if(!cleaned) return '';
    if(cleaned.match(/^https?:\/\//i)) return cleaned;
    if(cleaned.startsWith('/uploads/')){
      const base = getUploadsBaseUrl(true);
      return base + cleaned.slice('/uploads'.length);
    }
    return cleaned;
  }
  function getProductImageUrl(p){
    // "get the Picture from json instead of lincofpic"
    // Comprehensive check for image fields including 'picture', 'json', 'linkOfPic' (case insensitive)
    let cand = p.picture || p.Picture || p.json || p.linkOfPic || p.LinkOfPic || p.photos || p.imageUrl || p.image || p.photo || '';
    
    // Try to parse JSON string if it looks like one
    if(typeof cand === 'string' && (cand.trim().startsWith('{') || cand.trim().startsWith('['))){
        try {
            cand = JSON.parse(cand);
        } catch(e) {}
    }

    // If the candidate is an object (e.g. from a 'json' column parsed as object), try to extract url
    if(typeof cand === 'object' && cand !== null && !Array.isArray(cand)){
        cand = cand.picture || cand.url || cand.link || cand.path || cand.src || '';
    }
    
    // Handle array (e.g. from JSON parse)
    if(Array.isArray(cand) && cand.length > 0){
        cand = cand[0];
        if(typeof cand === 'object') cand = cand.picture || cand.url || cand.link || cand.path || cand.src || '';
    }

    const norm = normalizeUrl(cand);
    const finalUrl = rewriteUploadsHost(norm);
    return finalUrl;
  }
  function truncateText(s, n){
    if(!s) return '';
    const t = String(s);
    return t.length > n ? (t.slice(0,n-1) + '…') : t;
  }
  function monthKey(d){
    const dt = new Date(d);
    if(isNaN(dt.getTime())) return null;
    return dt.getFullYear() + '-' + String(dt.getMonth()+1).padStart(2,'0');
  }
  function monthLabelFromKey(k){
    const [y,m] = k.split('-'); 
    const names=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return names[(Number(m)-1)] + ' ' + y;
  }
  function aggregateMonthly(orders){
    const map = {};
    orders.forEach(o=>{
      const dt = getOrderDate(o);
      const key = monthKey(dt);
      if(!key) return;
      const val = (o.totalPrice!=null? o.totalPrice : (o.total!=null? o.total : (o.amount!=null? o.amount : 0)));
      map[key] = (map[key]||0) + parseNumberLike(val);
    });
    const keys = Object.keys(map).sort();
    return { labels: keys.map(monthLabelFromKey), values: keys.map(k=> map[k]) };
  }
  function weekKey(d){
    const dt = new Date(d);
    if(isNaN(dt.getTime())) return null;
    const oneJan = new Date(dt.getFullYear(),0,1);
    const week = Math.ceil((((dt - oneJan)/86400000) + oneJan.getDay()+1)/7);
    return dt.getFullYear() + '-W' + String(week).padStart(2,'0');
  }
  function aggregateWeekly(orders){
    const map = {};
    orders.forEach(o=>{
      const dt = getOrderDate(o);
      const key = weekKey(dt);
      if(!key) return;
      const val = (o.totalPrice!=null? o.totalPrice : (o.total!=null? o.total : (o.amount!=null? o.amount : 0)));
      map[key] = (map[key]||0) + parseNumberLike(val);
    });
    const keys = Object.keys(map).sort().slice(-4);
    return { labels: keys, values: keys.map(k=> map[k]) };
  }
  function parseSeries(res, kind, fallbackOrders){
    const arr = listFrom(res);
    if(res && !Array.isArray(res)){
      if(kind==='monthly' && res.salesByMonth && typeof res.salesByMonth === 'object'){
        const map = res.salesByMonth;
        const monthOrder = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        const now = new Date();
        const nowIdx = now.getMonth();
        const startIdx = (nowIdx - (Object.keys(map).length - 1) + 12) % 12;
        const keys = Object.keys(map).sort((a,b)=>{
          const ai = monthOrder.indexOf(a), bi = monthOrder.indexOf(b);
          const ar = (ai - startIdx + 12) % 12;
          const br = (bi - startIdx + 12) % 12;
          return ar - br;
        });
        const labels = keys;
        const values = keys.map(k => parseNumberLike(map[k]));
        return ensureNonEmptySeries({ labels, values }, kind);
      }
      if(kind==='weekly' && res.revenueByWeek && typeof res.revenueByWeek === 'object'){
        const map = res.revenueByWeek;
        const parseW = (w) => {
          const m = String(w).match(/(\d{4})-W(\d{1,2})/);
          return m ? { y: Number(m[1]), w: Number(m[2]) } : { y: 0, w: 0 };
        };
        const keys = Object.keys(map).sort((a,b)=> {
          const A = parseW(a), B = parseW(b);
          if(A.y !== B.y) return A.y - B.y;
          return A.w - B.w;
        });
        const labels = keys;
        const values = keys.map(k => parseNumberLike(map[k]));
        return ensureNonEmptySeries({ labels, values }, kind);
      }
      const labels = res.labels || res.months || res.weeks || null;
      const values = res.values || res.series || res.data || null;
      if(Array.isArray(labels) && Array.isArray(values)){
        const vals = Array.isArray(values[0]) ? values[0] : values;
        return ensureNonEmptySeries({ labels: labels.map(l => (typeof l==='string'? l : (l.label||l.monthName||l.week||l.period||String(l)))), values: vals.map(v => parseNumberLike(v)) }, kind);
      }
      if(Array.isArray(res.data)){
        return parseSeries(res.data, kind, fallbackOrders);
      }
    }
    if(Array.isArray(arr) && arr.length && typeof arr[0] === 'object'){
      const labels = arr.map(m=> m.month || m.monthName || m.label || m.week || m.period || monthLabelFromKey(m.monthKey||''));
      const values = arr.map(m=> parseNumberLike(m.total || m.value || m.amount || m.sum || m.revenue));
      if(labels.filter(Boolean).length) return ensureNonEmptySeries({ labels, values }, kind);
    }
    if(kind === 'monthly'){
      const agg = aggregateMonthly(fallbackOrders||[]);
      return ensureNonEmptySeries(agg, kind);
    } else {
      const agg = aggregateWeekly(fallbackOrders||[]);
      return ensureNonEmptySeries(agg, kind);
    }
  }
  function ensureNonEmptySeries(series, kind){
    const labels = Array.isArray(series.labels)? series.labels.slice() : [];
    const values = Array.isArray(series.values)? series.values.slice() : [];
    const hasData = labels.length && values.length && labels.every(l=> l!=null && l!== '') && values.every(v=> typeof v==='number');
    if(hasData) return { labels, values };
    const now = new Date();
    if(kind === 'monthly'){
      const defaults = [];
      for(let i=5;i>=0;i--){
        const d = new Date(now.getFullYear(), now.getMonth()-i, 1);
        defaults.push(monthLabelFromKey(monthKey(d)));
      }
      return { labels: defaults, values: new Array(defaults.length).fill(0) };
    } else {
      const defaults = [];
      for(let i=3;i>=0;i--){
        const d = new Date(now.getTime() - i*7*24*3600*1000);
        const wk = weekKey(d);
        defaults.push(wk || `W${i}`);
      }
      return { labels: defaults, values: new Array(defaults.length).fill(0) };
    }
  }

  function renderOrders(tbodyId, list){
    const tbody = document.getElementById(tbodyId);
    if(!tbody) return;
    if(!list || list.length===0){ tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:2rem;">No data available</td></tr>'; return; }
    
    const userType = localStorage.getItem('userType');
    const isVendor = String(userType).toLowerCase() === 'vendor';

    const sorted = list.slice().sort((a, b) => {
      const ta = new Date(a.updatedAt || a.updatedOn || a.createdAt || a.createdOn || 0).getTime();
      const tb = new Date(b.updatedAt || b.updatedOn || b.createdAt || b.createdOn || 0).getTime();
      return tb - ta;
    });

    const page = state.ordersPage || 1;
    const size = state.pageSize || 10;
    const total = sorted.length;
    const start = (page-1)*size;
    const pageItems = sorted.slice(start, start+size);
    tbody.innerHTML = pageItems.map(o=> {
      const orderId = o.orderId || o.id || o.cartCode || o.code || '';
      let nameCandidate = o.userName || o.customerName || o.customer || [o.fName, o.secName].filter(Boolean).join(' ');
      
      if(!nameCandidate && o.user && typeof o.user === 'object'){
          nameCandidate = o.user.name || o.user.userName || o.user.fullName || [o.user.fName, o.user.secName].filter(Boolean).join(' ');
      }

      const userId = o.userId || o.user || '';
      const customer = nameCandidate || (userId ? ('User#' + userId) : 'Guest');

      const date = o.createdAt || o.createdOn || o.orderDate || o.date || '';
      
      let status = o.status || o.orderStatus || o.state || '';
      if(isVendor) {
          status = o.vendorStatus || status; 
      }

      // Prioritize totalAfterDiscount to match Items/View details
      const amountRaw = o.totalAfterDiscount != null ? o.totalAfterDiscount : (o.totalPrice!=null? o.totalPrice : (o.total!=null? o.total : (o.amount!=null? o.amount : null)));
      const amount = amountRaw!=null ? Number(amountRaw).toFixed(2) : '';
      const discounted = o.discounted ? 'true' : 'false';
      const idArg = typeof orderId==='string' ? `'${orderId}'` : (orderId||'');
      return `<tr>
        <td>${orderId}</td>
        <td>${customer}</td>
        <td>${formatDate(date)}</td>
        <td>${status}</td>
        <td>JOD ${amount}</td>
        <td>${discounted}</td>
        <td>
          <button class="btn btn-outline" onclick="viewOrderItems(${idArg})">Items</button>
          <button class="btn btn-outline" onclick="editOrder(${idArg})">Edit</button>
          <button class="btn btn-outline" onclick="deleteOrder(${idArg})">Delete</button>
        </td>
      </tr>`;
    }).join('');
    renderPagination(tbodyId + '-pagination', total, page, size, 'setOrdersPage');
  }

  window.setOrdersPage = function(p){ 
    state.ordersPage = Math.max(1, p); 
    renderOrders('orders-tbody', state.filteredOrders || state.orders); 
  }

  window.viewOrderItems = function(id){
    (async ()=>{
      try{
        const content = document.getElementById('data-modal-content');
        content.innerHTML = '<div style="text-align:center;padding:2rem;">No data available</div>';
        openModal('data-modal');
        document.getElementById('data-modal-title').textContent = 'Order #' + id;

        // Fetch Order Details
        let order = state.orders.find(o => String(o.orderId||o.id||o.cartCode||o.code||'') === String(id));
        try {
            if(api.cart && api.cart.get) {
                const fetched = await api.cart.get(id);
                // Handle array response (take first element)
                const data = Array.isArray(fetched) ? fetched[0] : fetched;
                if(data) order = {...(order||{}), ...data};
            }
        } catch(e) { console.warn('Fetch order failed', e); }

        // Fetch Items (if not in order or to be sure)
        let items = [];
        try {
            if(api.cart && api.cart.getItems) {
                 const res = await api.cart.getItems(id);
                 // Check if response is array of orders (and take first item's items) or just items
                 if(Array.isArray(res) && res.length > 0 && res[0].items && Array.isArray(res[0].items)) {
                     items = res[0].items;
                 } else {
                     items = listFrom(res);
                 }
            }
        } catch(e) { console.warn('Fetch items failed', e); }
        
        // Merge items if found in order and not fetched
        if(items.length === 0 && order && order.items) {
            items = listFrom(order.items);
        }

        // Fetch User Details if missing (Critical for Vendor View where customer info might be hidden in order object)
        const uid = order.userId || (typeof order.user === 'object' ? order.user.id : order.user) || (typeof order.customer === 'object' ? order.customer.id : order.customer);
        if(uid && (!order.phone || !order.lat)) {
            try {
                let u = state.customers.find(x => String(x.id) === String(uid));
                if(!u && api.users && api.users.get) {
                    u = await api.users.get(uid, { suppressError: true });
                }
                if(u) {
                    // Enrich order object with user details for display
                    if(!order.phone) order.phone = u.phone || u.phoneNumber || u.mobile;
                    if(!order.city) order.city = u.city || (u.address && u.address.city);
                    if(!order.area) order.area = u.area || (u.address && u.address.area);
                    
                    // Location enrichment
                    if(!order.lat && !order.latitude && !order.gps) {
                        const uAddr = u.location || u.address || {};
                        const uLat = u.lat || u.latitude || uAddr.lat || uAddr.latitude || (u.gps && u.gps.lat);
                        const uLng = u.lng || u.longitude || uAddr.lng || uAddr.longitude || (u.gps && u.gps.lng);
                        if(uLat && uLng) {
                            order.lat = uLat;
                            order.lng = uLng;
                        } else if(typeof uAddr === 'string' && !order.address && !order.shippingAddress) {
                            order.address = uAddr;
                        }
                    }
                }
            } catch(e) { console.warn('Fetch user for enrichment failed', e); }
        }
        
        // Render
        content.innerHTML = '';
        
        // Print Button
        const btnDiv = document.createElement('div');
        btnDiv.style.display = 'flex';
        btnDiv.style.justifyContent = 'flex-end';
        btnDiv.style.marginBottom = '10px';
        const printBtn = document.createElement('button');
        printBtn.className = 'btn btn-outline';
        printBtn.style.display = 'flex';
        printBtn.style.alignItems = 'center';
        printBtn.style.gap = '8px';
        printBtn.innerHTML = '<span>Print PDF</span>';
        // Add icon if possible, or just text
        const icon = document.createElement('span');
        icon.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M4 0a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2H4zm0 1h8a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1z"/></svg>';
        printBtn.prepend(icon);
        
        printBtn.onclick = () => {
            if(window.ExportUtils && window.ExportUtils.exportOrderDetails){
                const enrichedItems = items.map(item => {
                    let imgUrl = item.productImage || item.image || (item.product && item.product.image);
                    if(imgUrl && typeof imgUrl === 'string'){
                        imgUrl = imgUrl.replace(/[`'"]/g, '').trim();
                        imgUrl = getProductImageUrl({ imageUrl: imgUrl });
                    } else {
                        imgUrl = getProductImageUrl(item);
                    }
                    return { ...item, _resolvedImageUrl: resolveDisplayUrl(imgUrl), _fallbackImageUrl: absoluteUploadsUrl(imgUrl) };
                });
                window.ExportUtils.exportOrderDetails(order, enrichedItems);
            } else {
                alert('Export function not available');
            }
        };
        btnDiv.appendChild(printBtn);
        content.appendChild(btnDiv);
        
        // --- 2. Order Info Section ---
        const infoDiv = document.createElement('div');
        infoDiv.style.display = 'grid';
        infoDiv.style.gridTemplateColumns = '1fr 1fr';
        infoDiv.style.gap = '1rem';
        infoDiv.style.marginBottom = '1rem';
        infoDiv.style.marginTop = '1rem';
        infoDiv.style.padding = '1rem';
        infoDiv.style.background = '#f9fafb';
        infoDiv.style.borderRadius = '8px';
        infoDiv.style.clear = 'both';
        
        if(order) {
            // Helper to render field
            const field = (label, val) => `<div><strong>${label}:</strong> ${val||'-'}</div>`;
            
            // Basic Info
            let basicHtml = '<div><h4 style="margin-top:0;">Order Info</h4>';
            
            // Explicitly show Cart Code and other details requested
            basicHtml += field('ID', order.orderId||order.id||id);
            if(order.cartCode || order.code) basicHtml += field('Cart Code', order.cartCode || order.code);
            
            basicHtml += field('Status', order.status||order.orderStatus||order.state);
            if(order.vendorStatus) basicHtml += field('Vendor Status', order.vendorStatus);
            
            const totalVal = order.totalPrice!=null ? order.totalPrice : (order.total!=null ? order.total : order.amount);
            basicHtml += field('Total', 'JOD ' + (totalVal!=null ? Number(totalVal).toFixed(2) : '0.00'));
            
            if(order.totalAfterDiscount != null) basicHtml += field('Total After Discount', 'JOD ' + Number(order.totalAfterDiscount).toFixed(2));
            basicHtml += field('Discounted', order.discounted ? 'true' : 'false');
            basicHtml += field('Date', formatDate(order.createdAt||order.date||order.orderDate||order.createdOn));

            if(order.paymentMethod || order.paymentType) basicHtml += field('Payment', order.paymentMethod || order.paymentType);
            if(order.note || order.notes) basicHtml += field('Notes', order.note || order.notes);
            if(order.coupon || order.couponCode) basicHtml += field('Coupon', order.coupon || order.couponCode);

            // Add other primitive fields to match "View" details
            const handled = new Set(['orderId','id','cartCode','code','status','orderStatus','state','vendorStatus','totalPrice','total','amount','totalAfterDiscount','discounted','createdAt','createdOn','orderDate','date','paymentMethod','paymentType','note','notes','coupon','couponCode','items','user','customer','userId','customerId','address','shippingAddress','location','gps','lat','lng','latitude','longitude','phone','number','city','area','longattitude']);
            
            Object.entries(order).forEach(([k, v]) => {
                if(handled.has(k)) return;
                if(typeof v === 'object' && v !== null) return; 
                if(k.toLowerCase().includes('image')) return;
                basicHtml += field(k.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()), v);
            });
            
            basicHtml += '</div>';
            
            // Customer / Location Info
            let locHtml = '<div><h4 style="margin-top:0;">Customer & Location</h4>';
            const user = order.user || order.customer || {};
            ;
            locHtml += field('Phone', order.phone||order.number||user.phone||user.phoneNumber);
            locHtml += field('City', order.city);
            locHtml += field('Area', order.area);
            
            // Location detection
            const addr = order.shippingAddress || order.address || order.location || {};
            const lat = order.lat || order.latitude || addr.lat || addr.latitude || (order.gps && order.gps.lat);
            const lng = order.lng || order.long || order.longitude || order.longattitude || addr.lng || addr.long || addr.longitude || (order.gps && order.gps.lng);
            
            if(lat || lng) {
                
                // Map link
                if(lat && lng) {
                    locHtml += `<div style="margin-top:5px;"><a href="https://www.google.com/maps?q=${lat},${lng}" target="_blank" style="color:#2563eb;text-decoration:underline;">View on Map</a></div>`;
                }
            } else {
                 // Try to dump address fields
                 const addrStr = typeof addr === 'string' ? addr : Object.values(addr).filter(x=>typeof x==='string' || typeof x==='number').join(', ');
                 if(addrStr) locHtml += field('Address', addrStr);
            }
            locHtml += '</div>';
            
            infoDiv.innerHTML = basicHtml + locHtml;
            content.appendChild(infoDiv);
        }

        // --- 3. Items Table ---
        const h3 = document.createElement('h3');
        h3.textContent = 'Items';
        content.appendChild(h3);

        if(items.length === 0) {
            const p = document.createElement('p');
            p.textContent = 'No items found.';
            content.appendChild(p);
        } else {
            const table = document.createElement('table');
            table.style.width = '100%';
            table.style.borderCollapse = 'collapse';
            table.innerHTML = `
              <thead style="background:#f3f4f6;">
                <tr>
                    <th style="padding:8px;text-align:left;">Image</th>
                    <th style="padding:8px;text-align:left;">Product</th>
                    <th style="padding:8px;text-align:left;">Qty</th>
                    <th style="padding:8px;text-align:left;">Price</th>
                    <th style="padding:8px;text-align:left;">Total</th>
                </tr>
              </thead>
              <tbody>
                ${items.map(item => {
                    // Aggressive Name Resolution
                    let name = item.productNameEN || item.productName || item.name || item.title;
                    if(item.productName && item.productNameEN && item.productName !== item.productNameEN) {
                         name = item.productName + ' - ' + item.productNameEN;
                    }
                    
                    if(!name && item.product) name = item.product.name || item.product.productName || item.product.title;
                    if(!name && item.cartItem) name = item.cartItem.productName || item.cartItem.name;
                    if(!name) {
                        // fallback
                        const vals = Object.values(item);
                        const possible = vals.find(v => typeof v === 'string' && v.length > 2 && v.length < 100 && !v.includes('http') && !v.match(/^\d+$/));
                        if(possible) name = possible + ' (?)';
                        else name = 'Unknown Product';
                    }
                    
                    const qty = item.quantity || item.qty || item.count || (item.product && item.product.quantity) || 0;
                    const price = item.price || item.unitPrice || (item.product && item.product.price) || 0;
                    const total = item.totalPrice || item.total || (qty * price) || 0;
                    
                    // Image cleaning
                    let imgUrl = item.productImage || item.image || (item.product && item.product.image);
                    if(imgUrl && typeof imgUrl === 'string') {
                         imgUrl = imgUrl.replace(/[`'"]/g, '').trim(); // Remove backticks/quotes
                         imgUrl = getProductImageUrl({ imageUrl: imgUrl }); // Normalize
                    } else {
                         imgUrl = getProductImageUrl(item);
                    }
                    const displayImg = resolveDisplayUrl(imgUrl);
                    const fallbackImg = absoluteUploadsUrl(imgUrl);
                    const placeholder = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI1MCIgaGVpZ2h0PSI1MCIgdmlld0JveD0iMCAwIDUwIDUwIj48cmVjdCB3aWR0aD0iNTAiIGhlaWdodD0iNTAiIGZpbGw9IiNmM2Y0ZjYiLz48dGV4dCB4PSI1MCUiIHk9IjUwJSIgZG9taW5hbnQtYmFzZWxpbmU9Im1pZGRsZSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZm9udC1mYW1pbHk9InNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMTAiIGZpbGw9IiM5OTkiPk5vIEltZzwvdGV4dD48L3N2Zz4=';
                    const onImgError = `this.onerror=null; if(this.dataset.fallback){ this.src=this.dataset.fallback; this.dataset.fallback=''; return; } this.src='${placeholder}';`;
                    
                    return `
                        <tr style="border-bottom:1px solid #eee;">
                            <td style="padding:8px;">
                                ${displayImg ? `<img class="image-thumb" src="${escapeAttr(displayImg)}" alt="${escapeAttr(name)}" onerror="${onImgError}" ${fallbackImg && fallbackImg !== displayImg ? `data-fallback="${escapeAttr(fallbackImg)}"` : ''}>` : '<div class="image-thumb placeholder"></div>'}
                            </td>
                            <td style="padding:8px;"><b>${name}</b><br><small style="color:#666;">${item.size || item.productSize || ''}</small></td>
                            <td style="padding:8px;">${qty}</td>
                            <td style="padding:8px;">JOD ${Number(price).toFixed(2)}</td>
                            <td style="padding:8px;">JOD ${Number(total).toFixed(2)}</td>
                        </tr>
                    `;
                }).join('')}
              </tbody>
            `;
            content.appendChild(table);
        }

      }catch(err){
        console.error(err);
        showNotification('error', 'Failed to load details');
      }
    })();
  }

  window.viewOrderDetails = function(id){
    (async ()=>{
      try{
        let order = state.orders.find(o => String(o.orderId||o.id||o.cartCode||o.code||'') === String(id));
        if(api.cart && api.cart.get){
          try{
            const full = await api.cart.get(id);
            if(full) order = full;
          }catch(e){}
        }
        if(!order){
          showNotification('error', 'Order not found');
          return;
        }
        window.openDataModal('Order Details', order);
      }catch(err){
        console.error(err);
        showNotification('error','Failed to load order details');
      }
    })();
  }

  window.editOrder = function(id){
    (async ()=>{
      try{
        console.log('Editing order:', id);
        let existing = state.orders.find(o => String(o.orderId||o.id||o.cartCode||o.code||'') === String(id)) || {};
        let fresh = null;
        
        if(api.cart && api.cart.get){
          try{
            fresh = await api.cart.get(id, { suppressError: true });
            console.log('Fetched fresh order data:', fresh);
          }catch(e){
            console.warn('Failed to fetch fresh order details:', e);
          }
        }
        
        let order = { ...existing, ...(fresh || {}) };
        
        if(!order.id && !existing.id){
          showNotification('error', 'Order not found');
          return;
        }

        document.getElementById('order-id').value = id;
        
        let cName = order.userName || order.customerName || order.customer || [order.fName, order.secName].filter(Boolean).join(' ');
        
        if(!cName && order.user && typeof order.user === 'object'){
            cName = order.user.name || order.user.userName || order.user.fullName || [order.user.fName, order.user.secName].filter(Boolean).join(' ');
        }
        
        const uid = order.userId || order.user;
        if(!cName && uid){
             let u = state.customers.find(x => String(x.id) === String(uid) || String(x.userId) === String(uid));
             
             if(!u && api.users && api.users.get){
                 try{
                    u = await api.users.get(uid, { suppressError: true });
                 }catch(e){}
             }
             
             if(u){
                 cName = u.name || u.userName || u.fullName || [u.fName, u.secName].filter(Boolean).join(' ');
             }
        }
        
        if(!cName && uid) {
             cName = 'User#' + uid;
        }
        document.getElementById('order-customer').value = cName || 'Guest';
        
        const amountRaw = order.totalPrice!=null ? order.totalPrice : (order.total!=null ? order.total : (order.amount!=null ? order.amount : 0));
        document.getElementById('order-amount').value = parseNumberLike(amountRaw);
        
        const st = order.status || order.orderStatus || order.state || 'pending';
        document.getElementById('order-status').value = st;
        // Also set a data attribute for robust selection if value doesn't match exactly
        document.getElementById('order-status').setAttribute('data-initial', st);
        
        const vSt = order.vendorStatus || '';
        const vSelect = document.getElementById('order-vendor-status');
        if(vSelect) vSelect.value = vSt;

        const dateRaw = order.createdAt || order.createdOn || order.orderDate || order.date || new Date();
        document.getElementById('order-date').value = new Date(dateRaw).toISOString().slice(0,10);
        
        document.getElementById('order-modal-title').textContent = 'Edit Order ' + id;
        
        // Vendor UI toggle
        const userType = localStorage.getItem('userType');
        const isVendor = String(userType).toLowerCase() === 'vendor';
        const statusSelect = document.getElementById('order-status');
        const statusGroup = statusSelect?.closest('.form-group');
        const vendorStatusGroup = document.getElementById('order-vendor-status')?.closest('.form-group');
        
        // Other fields to disable for vendor
        const otherFields = [
            'order-customer',
            'order-amount',
            'order-date'
        ];

        if (isVendor) {
            if(statusGroup) statusGroup.style.display = 'none';
            if(statusSelect) { statusSelect.removeAttribute('required'); statusSelect.disabled = true; }
            if(vendorStatusGroup) vendorStatusGroup.style.display = 'block';
            if(vSelect) { vSelect.removeAttribute('disabled'); vSelect.disabled = false; }

            otherFields.forEach(id => {
                const el = document.getElementById(id);
                if(el) el.disabled = true;
            });
        } else {
            if(statusGroup) statusGroup.style.display = 'block';
            if(statusSelect) { statusSelect.removeAttribute('required'); statusSelect.removeAttribute('disabled'); statusSelect.disabled = false; }
            if(vendorStatusGroup) vendorStatusGroup.style.display = 'block';
            if(vSelect) { vSelect.removeAttribute('disabled'); vSelect.disabled = false; }

            otherFields.forEach(id => {
                const el = document.getElementById(id);
                if(el) el.disabled = false;
            });
        }
        
        openModal('order-modal');
        
        setTimeout(()=>{
            const s = document.getElementById('order-status');
            if(s && s.value !== st){
                 for(let i=0; i<s.options.length; i++){
                     if(s.options[i].value.toLowerCase() === st.toLowerCase()){
                         s.selectedIndex = i;
                         break;
                     }
                 }
            }
        }, 50);

      }catch(err){
        console.error(err);
        showNotification('error', 'Failed to load order');
      }
    })();
  }

  function renderPagination(paginationId, totalItems, page, size, onPage){
    let container = document.getElementById(paginationId);
    if(!container){
      container = document.createElement('div');
      container.id = paginationId;
      container.className = 'pagination';
      const anchorId = paginationId.replace('-pagination','');
      const anchor = document.getElementById(anchorId);
      if(anchor){
        const wrapper = anchor.closest ? anchor.closest('.table-card, .table-wrapper') : null;
        if(wrapper) wrapper.appendChild(container);
        else anchor.parentNode.appendChild(container);
      } else {
        document.body.appendChild(container);
      }
    }
    const totalPages = Math.max(1, Math.ceil(totalItems / size));
    const onPageName =
      (typeof onPage === 'string' && onPage) ? onPage :
      (typeof onPage === 'function' && onPage.name && typeof window[onPage.name] === 'function') ? onPage.name :
      '';

    const prevPage = Math.max(1, page - 1);
    const nextPage = Math.min(totalPages, page + 1);

    container.innerHTML = `
      <div style="display:flex; align-items:center; gap:10px; justify-content:center;">
          <button class="btn btn-outline" ${page<=1? 'disabled':''} onclick="${onPageName ? `${onPageName}(${prevPage})` : ''}">Prev</button>
          <div style="display:flex; align-items:center; gap:5px;">
            <input type="number" min="1" max="${totalPages}" value="${page}" 
                   style="width:50px; text-align:center; padding:4px; border:1px solid #ddd; border-radius:4px;"
                   onchange="const val=parseInt(this.value); if(val>=1 && val<=${totalPages} && ${onPageName}) ${onPageName}(val)"
                   onkeydown="if(event.key==='Enter'){ const val=parseInt(this.value); if(val>=1 && val<=${totalPages} && ${onPageName}) ${onPageName}(val) }"
            >
            <span>/ ${totalPages}</span>
          </div>
          <button class="btn btn-outline" ${page>=totalPages? 'disabled':''} onclick="${onPageName ? `${onPageName}(${nextPage})` : ''}">Next</button>
      </div>
    `;
  }

  async function loadDashboardData(){
    try{
      const [stats, definitions] = await Promise.all([
        api.orderStatus.getOrdersCountByStatus(),
        api.orderStatus.getAll()
      ]);

      const sArr = Array.isArray(stats)? stats : [];
      const dArr = Array.isArray(definitions)? definitions : [];
      const defaultStatuses = new Set(
        dArr.filter(d => (d.type||'').toLowerCase() === 'default')
            .map(d => (d.status||'').toLowerCase())
      );

      const filteredStats = sArr.filter(s => defaultStatuses.has((s.status||'').toLowerCase()));

      const container = document.getElementById('dashboard-status-cards');
      if(container){
        if(!filteredStats.length){
          container.innerHTML = '<div class="stats-card"><div class="stats-info"><h3>No data</h3><div class="stats-value">0</div><div class="stats-meta"></div></div></div>';
        } else {
          const iconMap = {
            created: { icon: '📊', bg: '#DBEAFE', meta: 'Created orders' },
            pending: { icon: '📦', bg: '#FFF4E6', meta: 'Pending orders' },
            confirmed: { icon: '🚚', bg: '#E3F2FD', meta: 'Confirmed orders' },
            delivered: { icon: '✓', bg: '#E8F5E9', meta: 'Delivered orders' }
          };
          const cardsHtml = filteredStats.map(s => {
            const key = (s.status || '').toLowerCase();
            const cfg = iconMap[key] || { icon: '📊', bg: '#DBEAFE', meta: '' };
            const count = s.count != null ? Number(s.count) : 0;
            const meta = s.statusAr || cfg.meta || '';
            const title = s.status || '';
            return (
              '<div class="stats-card">' +
                '<div class="stats-icon" style="background: ' + cfg.bg + ';">' + cfg.icon + '</div>' +
                '<div class="stats-info">' +
                  '<h3>' + title + '</h3>' +
                  '<div class="stats-value">' + count + '</div>' +
                  '<div class="stats-meta">' + meta + '</div>' +
                '</div>' +
              '</div>'
            );
          }).join('');
          container.innerHTML = cardsHtml;
        }
      }
      
      let ordersList = [];
      if(!state.orders || !state.orders.length) {
         try {
           const fromInput = document.getElementById('orders-from-date');
           const toInput = document.getElementById('orders-to-date');
           const from = fromInput && fromInput.value ? fromInput.value : undefined;
           const to = toInput && toInput.value ? toInput.value : undefined;
           const all = await api.cart.getFiltered(from, to);
           state.orders = listFrom(all);
         } catch(e) {
           console.warn('Dashboard order fetch failed', e);
         }
      }
      
      ordersList = Array.isArray(state.orders) ? state.orders.slice() : [];
      ordersList.sort((a,b)=> getOrderDate(b) - getOrderDate(a));
      
      const dashFilter = document.getElementById('dashboard-status-filter');
      if(dashFilter && dashFilter.value){
          const sNorm = dashFilter.value.toLowerCase();
          ordersList = ordersList.filter(o => {
              const oStatus = (o.status || o.orderStatus || o.state || '').toLowerCase();
              return oStatus === sNorm;
          });
      }
      
      const top5 = ordersList.slice(0,5);
      renderOrders('dashboard-orders-tbody', top5);
    }catch(err){ console.warn('Dashboard load error', err); }
  }
  window.loadDashboardData = loadDashboardData;

  async function loadOrdersData(){
    const reqId = Date.now();
    loadOrdersData.lastReq = reqId;
    try{
      const fromInput = document.getElementById('orders-from-date');
      const toInput = document.getElementById('orders-to-date');
      const from = fromInput && fromInput.value ? fromInput.value : '';
      const to = toInput && toInput.value ? toInput.value : '';
      
      // We request a slightly wider range from the API to handle timezone shifts.
      // Client-side filtering in applyOrderFilters() will strictly enforce the user's selected range.
      let apiFrom = from || undefined;
      let apiTo = to || undefined;

      if(from) {
          try {
              const d = new Date(from);
              d.setDate(d.getDate() - 1);
              apiFrom = d.toISOString().split('T')[0];
          } catch(e) {}
      }

      if(to){
          try {
              const d = new Date(to);
              d.setDate(d.getDate() + 2);
              apiTo = d.toISOString().split('T')[0];
          } catch(e){ }
      } else if (from) {
          try {
              const d = new Date(from);
              d.setDate(d.getDate() + 2);
              apiTo = d.toISOString().split('T')[0];
          } catch(e) { }
      }

      const all = await api.cart.getFiltered(apiFrom, apiTo);
      
      if(loadOrdersData.lastReq !== reqId) return;

      state.orders = listFrom(all);
      state.ordersPage = 1; // Reset to first page on new data load
      
      if(window.applyOrderFilters) {
          window.applyOrderFilters(); 
      } else {
          state.filteredOrders = state.orders;
          renderOrders('orders-tbody', state.orders);
      }
      await loadStatuses();
    }catch(err){ 
        console.warn('Orders load', err); 
        if(loadOrdersData.lastReq === reqId){
          state.orders = [];
          state.filteredOrders = [];
          state.ordersPage = 1;
          renderOrders('orders-tbody', []);
        }
    }
  }

  window.applyOrderFilters = function(){
    const from = document.getElementById('orders-from-date').value;
    let to = document.getElementById('orders-to-date').value;

    if(from && !to) {
        to = from;
    }

    const status = document.getElementById('orders-status-filter').value;
    const search = (document.getElementById('orders-search').value || '').toLowerCase();
    
    let list = (state.orders || []).slice();
    
    // Strict client-side date filtering
    if(from || to) {
        list = list.filter(o => {
            const dateVal = o.createdAt || o.createdOn || o.orderDate || o.date;
            if(!dateVal) return false;
            const key = getLocalDateKey(dateVal);
            if(!key) return false;
            
            if(from && key < from) return false;
            if(to && key > to) return false;
            return true;
        });
    }

    if(status) {
      const sNorm = status.toLowerCase();
      list = list.filter(o => {
        const oStatus = (o.status || o.orderStatus || o.state || '').toLowerCase();
        return oStatus === sNorm;
      });
    }

    if(search) {
      list = list.filter(o => {
        const name = (o.userName || o.customerName || [o.fName, o.secName].filter(Boolean).join(' ') || '').toLowerCase();
        const idStr = ((o.orderId||o.id||o.cartCode||o.code||'')+'').toLowerCase();
        const phone = (o.phone || o.phoneNumber || '').toLowerCase();
        return name.includes(search) || idStr.includes(search) || phone.includes(search);
      });
    }

    state.filteredOrders = list;
    state.ordersPage = 1;
    renderOrders('orders-tbody', list);
  }

  async function loadCustomers(){
    try{
      const res = await api.users.getFiltered();
      state.customers = listFrom(res);
      renderCustomersTable(state.customers);
    }catch(err){ console.warn('Customers load', err); state.customers = []; renderCustomersTable([]); }
  }

  function customerIdOf(c){
    return c.id ?? c.userId ?? c.user_id ?? c.customerId ?? c.customer_id ?? c._id ?? '';
  }
  function customerNameOf(c){
    const n = c.name || c.userName || c.fullName || [c.fName, c.secName].filter(Boolean).join(' ');
    return n || '';
  }
  function customerEmailOf(c){
    return c.email || c.userEmail || c.emailAddress || '';
  }
  function customerPhoneOf(c){
    return c.phone || c.userPhone || c.phoneNumber || '';
  }
  function renderCustomersTable(list){
    const tbody = document.getElementById('customers-tbody');
    if(!tbody) return;
    if(!list || list.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:2rem;">No customers</td></tr>';
      return;
    }

    const orders = Array.isArray(state.orders) ? state.orders : [];
    const norm = (s)=> (s||'').toString().trim().toLowerCase();
    const statsByKey = {};
    orders.forEach(o=>{
      const email = norm(o.email || o.userEmail || (o.user && o.user.email) || '');
      const uid = o.userId ?? o.user_id ?? o.customerId ?? o.customer_id ?? o.user ?? '';
      const key = email || (uid!=null ? ('id:' + String(uid)) : '');
      if(!key) return;
      const total = parseNumberLike(o.totalPrice ?? o.total ?? o.amount ?? 0);
      const st = statsByKey[key] || { count: 0, total: 0 };
      st.count += 1;
      st.total += total;
      statsByKey[key] = st;
    });

    tbody.innerHTML = list.map((c)=>{
      const id = customerIdOf(c);
      const name = customerNameOf(c);
      const email = customerEmailOf(c);
      const phone = customerPhoneOf(c);
      const initials = (name||email||'').split(' ').filter(Boolean).map(s=> s[0]).slice(0,2).join('') || 'U';
      const key = norm(email) || (id!=='' ? ('id:' + String(id)) : '');
      const st = key ? statsByKey[key] : null;
      const ordersCount = st ? st.count : 0;
      const totalSpent = st ? st.total : 0;
      const joined = c.createdAt || c.joinDate || c.registeredAt || c.lastLoginTime || '';
      const idArg = typeof id === 'string' ? `'${String(id).replace(/'/g,"\\'")}'` : (id||'');
      return `<tr>
        <td><div class="user-cell"><div class="user-avatar">${initials}</div><div>${name || '—'}</div></div></td>
        <td>${email}</td>
        <td>${phone}</td>
        <td>${ordersCount}</td>
        <td>JOD ${Number(totalSpent||0).toFixed(2)}</td>
        <td>${formatDate(joined)}</td>
        <td style="white-space:nowrap">
          <button class="btn btn-outline btn-sm" onclick="viewCustomer(${idArg})">View</button>
          <button class="btn btn-outline btn-sm" onclick="editCustomer(${idArg})">Edit</button>
          <button class="btn btn-outline btn-sm" onclick="deleteCustomer(${idArg})" style="color:#EF4444">Delete</button>
        </td>
      </tr>`;
    }).join('');
  }

  window.applyCustomerFilters = function(){
    const from = document.getElementById('customers-from-date')?.value;
    const to = document.getElementById('customers-to-date')?.value;
    const search = (document.getElementById('customers-search')?.value || '').toLowerCase();
    let list = state.customers.slice();
    if(from) list = list.filter(c => {
      const d = c.createdAt || c.joinDate || c.registeredAt || c.lastLoginTime || null;
      if(!d) return false;
      return new Date(d) >= new Date(from);
    });
    if(to) list = list.filter(c => {
      const d = c.createdAt || c.joinDate || c.registeredAt || c.lastLoginTime || null;
      if(!d) return false;
      const toDate = new Date(to);
      toDate.setHours(23, 59, 59, 999);
      return new Date(d) <= toDate;
    });
    if(search) list = list.filter(c => {
      const hay = [customerIdOf(c), customerNameOf(c), customerEmailOf(c), customerPhoneOf(c)]
        .map(x=> (x||'').toString().toLowerCase()).join(' | ');
      return hay.includes(search);
    });
    state.filteredCustomers = list;
    renderCustomersTable(list);
  }

  function fillCustomerModal(c){
    document.getElementById('customer-id').value = customerIdOf(c) || '';
    document.getElementById('customer-name').value = customerNameOf(c) || '';
    document.getElementById('customer-email').value = customerEmailOf(c) || '';
    document.getElementById('customer-phone').value = customerPhoneOf(c) || '';
    const joined = c.createdAt || c.joinDate || c.registeredAt || '';
    document.getElementById('customer-joined').value = joined ? new Date(joined).toISOString().slice(0,10) : '';
    document.getElementById('customer-modal-title').textContent = (customerIdOf(c) ? 'Edit Customer' : 'New Customer');
  }

  window.viewCustomer = function(id){
    (async ()=>{
      try{
        if(api.users && api.users.get){
          try{
            const full = await api.users.get(id);
            window.openDataModal('Customer ' + id, full);
            return;
          }catch(e){}
        }
        const c = state.customers.find(x => String(customerIdOf(x)) === String(id));
        window.openDataModal('Customer ' + id, c || { id });
      }catch(err){
        showNotification('error','Failed to load customer');
      }
    })();
  }

  window.editCustomer = function(id){
    (async ()=>{
      try{
        let c = state.customers.find(x => String(customerIdOf(x)) === String(id)) || { id };
        if(api.users && api.users.get){
          try{
             const fresh = await api.users.get(id, { suppressError: true });
             if(fresh) c = { ...c, ...fresh };
          }catch(e){ console.warn('Failed to fetch fresh customer data:', e); }
        }
        fillCustomerModal(c);
        openModal('customer-modal');
      }catch(err){
        showNotification('error','Failed to load customer');
      }
    })();
  }

  window.deleteCustomer = function(id){
    if(!confirm('Delete customer ' + id + '?')) return;
    (async ()=>{
      try{
        if(api.users && api.users.delete){
          await api.users.delete(id);
          showNotification('success','Customer deleted');
          await loadCustomers();
        } else {
          showNotification('error','Delete endpoint not available');
        }
      }catch(err){
        showNotification('error', err?.message || 'Failed to delete customer');
      }
    })();
  }

  // Brands Logic
  async function loadBrands(){
    try{
        const res = await api.brands.list();
        state.brands = listFrom(res);
        renderBrandsTable(state.brands);
    }catch(err){
        console.warn('Brands load', err);
        state.brands = [];
        renderBrandsTable([]);
    }
  }

  window.searchBrand = async function(){
      const id = document.getElementById('brand-search-id').value;
      if(!id) {
          loadBrands();
          return;
      }
      try {
          const res = await api.brands.get(id);
          if(res){
             
              const list = Array.isArray(res) ? res : [res];
              renderBrandsTable(list);
          } else {
              renderBrandsTable([]);
          }
      } catch(err){
          console.warn('Brand search', err);
          showNotification('error', 'Brand not found');
          renderBrandsTable([]);
      }
  }

  function renderBrandsTable(list){
    console.log('Rendering brands:', list);
    const container = document.getElementById('brands-tbody');
    if(!container) return;
    if(!list || list.length===0){
        container.innerHTML = '<tr><td colspan="10" style="text-align:center;padding:2rem;">No brands found</td></tr>';
        return;
    }
    container.innerHTML = list.map(b => {
        const id = b.id || b.brandId || '';
        const name = b.name || b.brandName || '';
        const drugStore = b.drugStore || '';
        const country = b.country || b.brandCountryofOrigin || b.countryOfOrigin || '';
        const offerPct = b.offerPercentage != null ? b.offerPercentage + '%' : '';
        const offerAvail = b.offerAvailableTrueOrFalse ? 'Yes' : 'No';
        const avgPrice = b.averageProductPrice != null ? 'JOD ' + b.averageProductPrice : '';
        const totalProducts = b.totalProducts || 0;
        const yearEst = b.yearEstablished || '';
        const logo = b.drugStoreLogo || b.brandLogoImage || '';
        const logoHtml = logo ? `<img src="${logo}" style="width:40px;height:40px;object-fit:contain;border-radius:4px;margin-right:8px;vertical-align:middle;background:#fff;border:1px solid #eee;padding:2px;" onerror="this.style.display='none'">` : '';
        
        return `
        <tr>
            <td>${id}</td>
            <td><div style="display:flex;align-items:center;">${logoHtml}<span>${name}</span></div></td>
            <td>${drugStore}</td>
            <td>${country}</td>
            <td>${offerAvail}</td>
            <td>${offerPct}</td>
            <td>${avgPrice}</td>
            <td>${totalProducts}</td>
            <td>${yearEst}</td>
            <td>
                <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
                    <button class="btn btn-outline" onclick="viewBrand('${id}')">View</button>
                    <button class="btn btn-outline" onclick="editBrand('${id}')">Edit</button>
                    <button class="btn btn-outline" onclick="deleteBrand('${id}')">Delete</button>
                </div>
            </td>
        </tr>
        `;
    }).join('');
  }

  window.viewBrand = async function(id){
      try {
          // If we have full data in state, use it, else fetch
          let brand = state.brands.find(b => String(b.id || b.brandId) === String(id));
          if(!brand || !brand.countryOfOrigin){ // If missing details, fetch
             try {
                const fetched = await api.brands.get(id);
                if(fetched) brand = fetched;
             } catch(e) { console.warn('Fetch failed', e); }
          }
          if(!brand) return;

          // Helper to format values
          const fmt = (v) => {
              if(v === null || v === undefined) return '<span style="color:#999">null</span>';
              if(typeof v === 'boolean') return v ? 'True' : 'False';
              const s = String(v);
              if(s.match(/^https?:\/\/.*\.(png|jpg|jpeg|gif|svg|webp)$/i) || s.includes('/Uploads/')) {
                  return `<img src="${s}" style="max-width:100%; max-height:150px; object-fit:contain; border-radius:4px;" onerror="this.outerHTML='<a href=\\'${s}\\' target=\\'_blank\\'>${s}</a>'">`;
              }
              return s;
          };

          // Generate list of all fields
          const fields = Object.entries(brand)
            .filter(([key]) => key !== 'products' && key !== 'brandLogoImage' && key !== 'drugStoreLogo')
            .map(([key, value]) => `
            <div style="border-bottom: 1px solid #eee; padding: 8px 0;">
                <strong style="display:block; color:#666; font-size:0.85em; margin-bottom:2px;">${key}</strong>
                <div style="word-break: break-all;">${fmt(value)}</div>
            </div>
          `).join('');

          const logoUrl = brand.drugStoreLogo || brand.brandLogoImage;
          const coverUrl = brand.drugStoreCover;
          let logoHeader = '';
          if(logoUrl || coverUrl){
              logoHeader = `<div style="text-align:center;margin-bottom:1.5rem;padding:1rem;background:#f9fafb;border-radius:8px;display:flex;flex-direction:column;gap:1rem;align-items:center;">
                ${logoUrl ? `<div><small style="color:#666;display:block;margin-bottom:4px;">Logo</small><img src="${logoUrl}" style="max-height:100px;max-width:100%;object-fit:contain;" onerror="this.style.display='none'"></div>` : ''}
                ${coverUrl ? `<div><small style="color:#666;display:block;margin-bottom:4px;">Cover Image</small><img src="${coverUrl}" style="max-height:180px;max-width:100%;object-fit:contain;" onerror="this.style.display='none'"></div>` : ''}
              </div>`;
          }

          const content = `
            ${logoHeader}
            <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 1rem;">
                ${fields}
            </div>
          `;
          document.getElementById('brand-details-content').innerHTML = content;
          openModal('brand-details-modal');
      } catch(err){
          console.error(err);
          showNotification('error', 'Failed to load details');
      }
  }

  window.updateBrandImagePreview = function(url){
      const preview = document.getElementById('brand-image-preview');
      if(!preview) return;
      if(url){
          preview.src = url;
          preview.style.display = 'block';
      } else {
          preview.style.display = 'none';
      }
  }

  window.handleBrandImageUpload = async function(input){
      if(!input.files || !input.files[0]) return;
      const file = input.files[0];
      
      const formData = new FormData();
      formData.append('file', file);
      
      const btn = input.nextElementSibling;
      const originalText = btn ? btn.textContent : 'Upload Logo';
      if(btn){
          btn.textContent = 'Uploading...';
          btn.disabled = true;
      }
  
      try{
          // Use relative path to leverage proxy
          const uploadResponse = await fetch('/api/ImageUpload/upload', {
              method: 'POST',
              body: formData
          });
          
          if(!uploadResponse.ok) {
              const text = await uploadResponse.text();
              throw new Error(`Image upload failed: ${uploadResponse.status} ${text}`);
          }
          const data = await uploadResponse.json();
          
          let imageUrl = data.url || data.filePath || data.link || data.uri || data.path || data.fileName || (typeof data === 'string' ? data : '');
          
          if(imageUrl){
              document.getElementById('brand-logo').value = imageUrl;
              updateBrandImagePreview(imageUrl);
              showNotification('success', 'Image uploaded');
          } else {
              console.error('Upload response:', data);
              showNotification('error', 'Parse error: ' + JSON.stringify(data));
          }
      }catch(err){
          console.error(err);
          showNotification('error', err.message || 'Failed to upload image');
      }finally{
          if(btn){
              btn.textContent = originalText;
              btn.disabled = false;
          }
          input.value = '';
      }
  }

  window.updateBrandCoverImagePreview = function(url){
      const preview = document.getElementById('brand-cover-preview');
      if(!preview) return;
      if(url){
          preview.src = url;
          preview.style.display = 'block';
      } else {
          preview.style.display = 'none';
      }
  }

  window.handleBrandCoverImageUpload = async function(input){
      if(!input.files || !input.files[0]) return;
      const file = input.files[0];
      
      const formData = new FormData();
      formData.append('file', file);
      
      const btn = input.nextElementSibling;
      const originalText = btn ? btn.textContent : 'Upload Cover';
      if(btn){
          btn.textContent = 'Uploading...';
          btn.disabled = true;
      }
  
      try{
          const uploadResponse = await fetch('/api/ImageUpload/upload', {
              method: 'POST',
              body: formData
          });
          
          if(!uploadResponse.ok) {
              const text = await uploadResponse.text();
              throw new Error(`Image upload failed: ${uploadResponse.status} ${text}`);
          }
          const data = await uploadResponse.json();
          
          let imageUrl = data.url || data.filePath || data.link || data.uri || data.path || data.fileName || (typeof data === 'string' ? data : '');
          
          if(imageUrl){
              document.getElementById('brand-cover').value = imageUrl;
              updateBrandCoverImagePreview(imageUrl);
              showNotification('success', 'Cover image uploaded');
          } else {
              console.error('Upload response:', data);
              showNotification('error', 'Parse error: ' + JSON.stringify(data));
          }
      }catch(err){
          console.error(err);
          showNotification('error', err.message || 'Failed to upload cover image');
      }finally{
          if(btn){
              btn.textContent = originalText;
              btn.disabled = false;
          }
          input.value = '';
      }
  }

  window.addBrand = async function(){
      const form = document.getElementById('brand-form');
      if(form) form.reset();
      document.getElementById('brand-id').value = '';
      document.getElementById('brand-logo').value = '';
      document.getElementById('brand-cover').value = '';
      if(document.getElementById('brand-image-upload')) document.getElementById('brand-image-upload').value = '';
      if(document.getElementById('brand-cover-upload')) document.getElementById('brand-cover-upload').value = '';
      updateBrandImagePreview('');
      updateBrandCoverImagePreview('');
      
      await ensureDrugStoreOptions('brand-drugstore');
      window.currentBrandData = null;
      
      document.getElementById('brand-modal-title').textContent = 'New Brand';
      openModal('brand-modal');
  }

  window.editBrand = async function(id){
      let brand = state.brands.find(b => String(b.id || b.brandId) === String(id));
      if(!brand) {
          try { brand = await api.brands.get(id); } catch(e){}
      }
      if(!brand) return;

      await ensureDrugStoreOptions('brand-drugstore');

      document.getElementById('brand-id').value = brand.id || brand.brandId;
      document.getElementById('brand-name').value = brand.name || brand.brandName || '';
      document.getElementById('brand-country').value = brand.country || brand.countryOfOrigin || brand.brandCountryofOrigin || '';
      document.getElementById('brand-country-ar').value = brand.countryOfOriginAr || '';
      
      // Populate multi-select for drugStore
      const drugSelect = document.getElementById('brand-drugstore');
      if(drugSelect) {
          const dsValue = brand.drugStores || brand.drugStore || '';
          setMultiSelectValues(drugSelect, normalizeMultiValue(dsValue));
      }

      document.getElementById('brand-delivery-terms').value = brand.deliveryTerms || '';
      document.getElementById('brand-delivery-terms-ar').value = brand.deliveryTerms2 || '';
      document.getElementById('brand-ads').value = brand.ads || '';

      document.getElementById('brand-year').value = brand.yearEstablished || '';
      document.getElementById('brand-offer-pct').value = brand.offerPercentage || '';
      document.getElementById('brand-avg-price').value = brand.averageProductPrice || '';
      document.getElementById('brand-total-products').value = brand.totalProducts || '';
      document.getElementById('brand-website').value = brand.website || brand.brandWebsite || '';
      document.getElementById('brand-offer-avail').checked = !!brand.offerAvailableTrueOrFalse;
      const logo = brand.drugStoreLogo || brand.brandLogoImage || '';
      document.getElementById('brand-logo').value = logo;
      updateBrandImagePreview(logo);

      const cover = brand.drugStoreCover || '';
      document.getElementById('brand-cover').value = cover;
      updateBrandCoverImagePreview(cover);
      
      window.currentBrandData = brand;
      
      document.getElementById('brand-modal-title').textContent = 'Edit Brand';
      openModal('brand-modal');
  }

  window.deleteBrand = function(id){
    if(!confirm('Delete brand ' + id + '?')) return;
    (async ()=>{
        try{
            await api.brands.delete(id);
            showNotification('success', 'Brand deleted');
            loadBrands();
        }catch(err){
            showNotification('error', 'Failed to delete brand');
        }
    })();
  }

  window.loadBrands = loadBrands;

  // Debugging helper
  window.testProductCreate = async function(){
      const testData = {
          productNameEN: "Test Product " + Date.now(),
          productNameAR: "Test AR",
          description: "Test Desc",
          price: 10.5,
          stock: 10,
          outofstock: "false",
          categoryEN: "Hydrated Skin", // Ensure this exists
          linkOfPic: "",
          imageUrl: "",
          photos: "",
          barcode: Date.now().toString(),
          isOffer: false
      };
      console.log('Testing create with:', testData);
      try {
          const res = await api.products.create(testData);
          console.log('Test success:', res);
          alert('Test Product Created Successfully!');
      } catch(e) {
          console.error('Test failed:', e);
          alert('Test Failed: ' + e.message);
      }
  };

  async function loadProducts(){
    try{
      const [pRes, cRes, bRes] = await Promise.all([
          api.products.list(), 
          api.categories.list(),
          api.brands.list()
      ]);
      state.products = listFrom(pRes);
      state.categories = listFrom(cRes);
      state.brands = listFrom(bRes);

      const select = document.getElementById('products-category-filter');
      if(select){
        // Map categories to use name as ID for filter API
        const options = state.categories.map(c=> {
          // The API filter expects category NAME, so we use name as value
          const val = c.categoryEN || c.categoryAr || c.id || '';
          const label = getCategoryLabel(c);
          return `<option value="${val}">${label}</option>`;
        });
        
        // Add "All Categories" option
        select.innerHTML = '<option value="">All Categories</option>' + options.join('');
      }
      ensureProductCategoryOptions();
      ensureProductBrandOptions();
      renderProductsTable(state.products);
    }catch(err){ console.warn('Products load', err); state.products = []; renderProductsTable([]); }
  }

  async function loadProductTest(){
    try{
      const [pRes, cRes, bRes] = await Promise.all([
          api.productTest.list(), 
          api.categories.list(),
          api.brands.list()
      ]);
      state.productTestProducts = listFrom(pRes);
      state.categories = listFrom(cRes);
      state.brands = listFrom(bRes);

      const select = document.getElementById('product-test-category-filter');
      if(select){
        const options = state.categories.map(c=> {
          const val = c.categoryEN || c.categoryAr || c.id || '';
          const label = getCategoryLabel(c);
          return `<option value="${val}">${label}</option>`;
        });
        select.innerHTML = '<option value="">All Categories</option>' + options.join('');
      }
      ensureProductTestCategoryOptions();
      ensureProductTestBrandOptions();
      renderProductTestTable(state.productTestProducts);
    }catch(err){ console.warn('Product test load', err); state.productTestProducts = []; renderProductTestTable([]); }
  }

  function ensureProductBrandOptions(){
    const options = (state.brands || []).map(b => {
        const name = b.brandName || b.name || '';
        return { value: name, label: name };
    });
    setMultiSelectOptions('product-brand-name', options);
  }

  function ensureProductTestBrandOptions(){
    const options = (state.brands || []).map(b => {
        const name = b.brandName || b.name || '';
        return { value: name, label: name };
    });
    setMultiSelectOptions('product-test-brand-name', options);
  }

  function ensureProductCategoryOptions(){
    // Safety check for state.categories
    const list = Array.isArray(state.categories) ? state.categories : [];
    const options = list.map(c=> {
      const en = c.categoryEN || c.nameEN || c.en || c.name || getCategoryIdValue(c);
      const ar = c.categoryAr || c.nameAr || c.ar || '';
      const label = String(en) + (ar ? ` - ${ar}` : '');
      return { value: String(en), label: label };
    });
    setMultiSelectOptions('product-category', options);
  }

  function ensureProductTestCategoryOptions(){
    const list = Array.isArray(state.categories) ? state.categories : [];
    const options = list.map(c=> {
      const en = c.categoryEN || c.nameEN || c.en || c.name || getCategoryIdValue(c);
      const ar = c.categoryAr || c.nameAr || c.ar || '';
      const label = String(en) + (ar ? ` - ${ar}` : '');
      return { value: String(en), label: label };
    });
    setMultiSelectOptions('product-test-category', options);
  }

  function updateGenderArabic(){
    const select = document.getElementById('product-gender');
    const arInput = document.getElementById('product-gender-ar');
    if(!select || !arInput) return;
    const vals = getMultiSelectValues(select);
    const arVals = vals.map(v=>{
        if(v === 'Male') return 'ذكر';
        if(v === 'Female') return 'أنثى';
        return '';
    }).filter(Boolean);
    arInput.value = arVals.join(', ');
    if(vals.length === 0) arInput.value = '';
  }

  function ensureGenderOptions(){
    setMultiSelectOptions('product-gender', [
      { value: 'Female', label: 'Female' },
      { value: 'Male', label: 'Male' }
    ]);
    const container = document.querySelector('.multi-select[data-input="product-gender"]');
    if(container) bindMultiSelect('product-gender');
    updateGenderArabic();
  }

  function updateProductTestGenderArabic(){
    const select = document.getElementById('product-test-gender');
    const arInput = document.getElementById('product-test-gender-ar');
    if(!select || !arInput) return;
    const vals = getMultiSelectValues(select);
    const arVals = vals.map(v=>{
        if(v === 'Male') return 'ذكر';
        if(v === 'Female') return 'أنثى';
        return '';
    }).filter(Boolean);
    arInput.value = arVals.join(', ');
    if(vals.length === 0) arInput.value = '';
  }

  function ensureProductTestGenderOptions(){
    setMultiSelectOptions('product-test-gender', [
      { value: 'Female', label: 'Female' },
      { value: 'Male', label: 'Male' }
    ]);
    const container = document.querySelector('.multi-select[data-input="product-test-gender"]');
    if(container) bindMultiSelect('product-test-gender');
    updateProductTestGenderArabic();
  }

  function renderProductsTable(list){
    const container = document.getElementById('products-container');
    if(!container) return;
    if(!list || list.length===0){ container.innerHTML = '<div style="text-align:center;padding:2rem;color:var(--gray-500)">No products</div>'; return; }
    const page = state.productsPage || 1;
    const size = state.pageSize || 10;
    const total = list.length;
    const start = (page-1)*size;
    const pageItems = list.slice(start, start+size);
    const rows = pageItems.map(p=> {
      const pid = getProductId(p);
      const pname = getProductName(p);
      const pdesc = getProductDescription(p)||'';
      const img = getProductImageUrl(p);
      const displayImg = resolveDisplayUrl(img);
      const fallbackImg = absoluteUploadsUrl(img);
      const PLACEHOLDER_IMG = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI1MCIgaGVpZ2h0PSI1MCIgdmlld0JveD0iMCAwIDUwIDUwIj48cmVjdCB3aWR0aD0iNTAiIGhlaWdodD0iNTAiIGZpbGw9IiNmM2Y0ZjYiLz48dGV4dCB4PSI1MCUiIHk9IjUwJSIgZG9taW5hbnQtYmFzZWxpbmU9Im1pZGRsZSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZm9udC1mYW1pbHk9InNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMTAiIGZpbGw9IiM5OTkiPk5vIEltZzwvdGV4dD48L3N2Zz4=';
      const onImgError = `this.onerror=null; if(this.dataset.fallback){ this.src=this.dataset.fallback; this.dataset.fallback=''; return; } this.src='${PLACEHOLDER_IMG}';`;
      
      return `<tr>
        <td>${pid}</td>
        <td>
          <div style="display:flex;align-items:center;gap:10px">
            ${displayImg ? `<img class="image-thumb" src="${escapeAttr(displayImg)}" alt="${escapeAttr(pname)}" onerror="${onImgError}" ${fallbackImg && fallbackImg !== displayImg ? `data-fallback="${escapeAttr(fallbackImg)}"` : ''}>` : ''}
            <div>
              <div>${pname}</div>
              <div style="font-size:0.85em;color:var(--gray-500);max-width:420px" title="${pdesc}">${truncateText(pdesc, 100)}</div>
            </div>
          </div>
        </td>
        <td>${getCategoryName(p)}</td>
        <td>JOD ${getPrice(p)}</td>
        <td>${getStock(p)}</td>
        <td>
          <button class="btn btn-outline" onclick="viewProduct('${pid}')">View</button>
          <button class="btn btn-outline" onclick="editProduct('${pid}')">Edit</button>
          <button class="btn btn-outline" onclick="deleteProduct('${pid}')">Delete</button>
        </td>
      </tr>`;
    }).join('');
    container.innerHTML = `
      <div class="table-wrapper"><table><thead><tr><th>ID</th><th>NAME & IMAGE</th><th>CATEGORY</th><th>PRICE</th><th>STOCK</th><th>ACTION</th></tr></thead>
      <tbody id="products-tbody-inner">${rows}</tbody></table></div>`;
    renderPagination('products-container-pagination', total, page, size, 'setProductsPage');
  }

  window.setProductsPage = function(p){ state.productsPage = Math.max(1, p); renderProductsTable(state.filteredProducts || state.products); }

  function renderProductTestTable(list){
    const container = document.getElementById('product-test-container');
    if(!container) return;
    if(!list || list.length===0){ container.innerHTML = '<div style="text-align:center;padding:2rem;color:var(--gray-500)">No products</div>'; return; }
    const page = state.productTestPage || 1;
    const size = state.pageSize || 10;
    const total = list.length;
    const start = (page-1)*size;
    const pageItems = list.slice(start, start+size);
    const rows = pageItems.map(p=> {
      const pid = getProductId(p);
      const pname = getProductName(p);
      const pdesc = getProductDescription(p)||'';
      const img = getProductImageUrl(p);
      const displayImg = resolveDisplayUrl(img);
      const fallbackImg = absoluteUploadsUrl(img);
      const PLACEHOLDER_IMG = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI1MCIgaGVpZ2h0PSI1MCIgdmlld0JveD0iMCAwIDUwIDUwIj48cmVjdCB3aWR0aD0iNTAiIGhlaWdodD0iNTAiIGZpbGw9IiNmM2Y0ZjYiLz48dGV4dCB4PSI1MCUiIHk9IjUwJSIgZG9taW5hbnQtYmFzZWxpbmU9Im1pZGRsZSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZm9udC1mYW1pbHk9InNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMTAiIGZpbGw9IiM5OTkiPk5vIEltZzwvdGV4dD48L3N2Zz4=';
      const onImgError = `this.onerror=null; if(this.dataset.fallback){ this.src=this.dataset.fallback; this.dataset.fallback=''; return; } this.src='${PLACEHOLDER_IMG}';`;
      
      return `<tr>
        <td>${pid}</td>
        <td>
          <div style="display:flex;align-items:center;gap:10px">
            ${displayImg ? `<img class="image-thumb" src="${escapeAttr(displayImg)}" alt="${escapeAttr(pname)}" onerror="${onImgError}" ${fallbackImg && fallbackImg !== displayImg ? `data-fallback="${escapeAttr(fallbackImg)}"` : ''}>` : ''}
            <div>
              <div>${pname}</div>
              <div style="font-size:0.85em;color:var(--gray-500);max-width:420px" title="${pdesc}">${truncateText(pdesc, 100)}</div>
            </div>
          </div>
        </td>
        <td>${getCategoryName(p)}</td>
        <td>JOD ${getPrice(p)}</td>
        <td>${getStock(p)}</td>
        <td>
          <div class="pt-table-actions">
            <button class="pt-action-btn" onclick="editProductTest('${pid}')">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5" />
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
              Edit
            </button>
            <button class="btn btn-outline btn-sm" onclick="viewProductTest('${pid}')">View</button>
            <button class="btn btn-outline btn-sm" onclick="deleteProductTest('${pid}')">Delete</button>
          </div>
        </td>
      </tr>`;
    }).join('');
    container.innerHTML = `
      <div class="table-wrapper"><table><thead><tr><th>ID</th><th>NAME & IMAGE</th><th>CATEGORY</th><th>PRICE</th><th>STOCK</th><th>ACTION</th></tr></thead>
      <tbody id="product-test-tbody-inner">${rows}</tbody></table></div>`;
    renderPagination('product-test-container-pagination', total, page, size, 'setProductTestPage');
  }

  window.setProductTestPage = function(p){ state.productTestPage = Math.max(1, p); renderProductTestTable(state.productTestFilteredProducts || state.productTestProducts); }
 
  window.deleteOrder = function(id){
    if(confirm('Delete order ' + id + '?')){
      (async ()=>{
        try{
          if(api.cart && api.cart.delete){
            await api.cart.delete(id);
            showNotification('success','Order deleted');
            loadOrdersData();
          } else {
            showNotification('error','Delete endpoint not available');
          }
        }catch(err){ console.warn(err); showNotification('error','Failed to delete order'); }
      })();
    }
  }

  window.updateImagePreview = function(url){
    const preview = document.getElementById('product-image-preview');
    if(!preview) return;
    if(url){
        const displayUrl = resolveDisplayUrl(url);
        const fallbackUrl = absoluteUploadsUrl(url);
        preview.onerror = null;
        if(fallbackUrl && displayUrl && fallbackUrl !== displayUrl){
            preview.onerror = function(){
                this.onerror = null;
                this.src = fallbackUrl;
            };
        }
        preview.src = displayUrl;
        preview.style.display = 'block';
    } else {
        preview.style.display = 'none';
    }
  }

  window.handleProductImageUpload = async function(input){
    if(!input.files || !input.files[0]) return;
    const file = input.files[0];
    
    // Validation
    if(!file.type.startsWith('image/')){
        showNotification('error', 'Please upload an image file');
        input.value = '';
        return;
    }
    if(file.size > 5 * 1024 * 1024){ // 5MB limit
        showNotification('error', 'Image size exceeds 5MB limit');
        input.value = '';
        return;
    }

    const productId = document.getElementById('product-id')?.value;
    
    const formData = new FormData();
    formData.append('file', file);
    if(productId) {
        formData.append('id', productId);
    }
    
    const btn = input.nextElementSibling;
    const originalText = btn ? btn.textContent : 'Upload';
    if(btn){
        btn.textContent = 'Uploading...';
        btn.disabled = true;
    }

    try{
        // Use relative path to leverage proxy (avoids CORS/SSL issues)
        const uploadEndpoint = '/api/ImageUpload/upload';
        console.log('Uploading file to:', uploadEndpoint);

        const uploadResponse = await fetch(uploadEndpoint, {
            method: 'POST',
            body: formData 
        });
        
        if(!uploadResponse.ok) {
            const text = await uploadResponse.text();
            throw new Error(`File upload failed: ${uploadResponse.status} ${text}`);
        }

        const uploadData = await uploadResponse.json();
        const imageUrl = uploadData.path || uploadData.url || uploadData.link;

        if(!imageUrl) {
            throw new Error('Upload successful but no URL returned');
        } 

        // Fix encoding for spaces immediately after upload
        let normalizedImage = uploadsPathFromUrl(imageUrl) || imageUrl;
        normalizedImage = normalizedImage.replace(/ /g, '%20').replace(/\(/g, '%28').replace(/\)/g, '%29');

        const resolvedImage = rewriteUploadsHost(normalizedImage);
        console.log('File uploaded, URL:', resolvedImage);

        
        document.getElementById('product-image').value = resolvedImage;
        updateImagePreview(resolvedImage);

        
        if(productId){
            // Use relative path for update as well
            const updateUrl = '/api/Product/update-product-image';
            const token = localStorage.getItem('authToken');
            const headers = {
                'Content-Type': 'application/json'
            };
            if(token) headers['Authorization'] = 'Bearer ' + token;
            const updateBody = JSON.stringify({
                productId: parseInt(productId),
                photos: resolvedImage,
                imageUrl: resolvedImage,
                linkOfPic: ""
            });
            try{
                const updateResponse = await fetch(updateUrl, {
                    method: 'POST',
                    headers: headers,
                    body: updateBody
                });
                if(!updateResponse.ok) {
                    const text = await updateResponse.text();
                    throw new Error(text || 'Update failed');
                }
                showNotification('success', 'Product image updated successfully');
                // Refresh list to show new image
                loadProducts();
            }catch(err){
                console.error('Product update failed:', err);
                showNotification('warning', 'Image uploaded but auto-update failed. Please click Save.');
            }
        } else {
            showNotification('success', 'Image uploaded');
        }

    }catch(err){
        console.error(err);
        showNotification('error', err.message || 'Failed to upload image');
    }finally{
        if(btn){
            btn.textContent = originalText;
            btn.disabled = false;
        }
        input.value = '';
    }
  }

  window.updateProductTestImagePreview = function(url){
    const preview = document.getElementById('product-test-image-preview');
    const container = document.getElementById('product-test-image-preview-container');
    if(!preview) return;
    if(url){
        const displayUrl = resolveDisplayUrl(url);
        const fallbackUrl = absoluteUploadsUrl(url);
        preview.onerror = null;
        if(fallbackUrl && displayUrl && fallbackUrl !== displayUrl){
            preview.onerror = function(){
                this.onerror = null;
                this.src = fallbackUrl;
            };
        }
        preview.src = displayUrl;
        if(container) container.style.display = 'block';
        preview.style.display = 'block';
    } else {
        if(container) container.style.display = 'none';
        preview.style.display = 'none';
    }
  }

  window.handleProductTestImageUpload = async function(input){
    if(!input.files || !input.files[0]) return;
    const file = input.files[0];
    
    if(!file.type.startsWith('image/')){
        showNotification('error', 'Please upload an image file');
        input.value = '';
        return;
    }
    if(file.size > 5 * 1024 * 1024){
        showNotification('error', 'Image size exceeds 5MB limit');
        input.value = '';
        return;
    }

    const productId = document.getElementById('product-test-id')?.value;
    
    const formData = new FormData();
    formData.append('file', file);
    if(productId) {
        formData.append('id', productId);
    }
    
    const btn = input.nextElementSibling;
    const originalText = btn ? btn.textContent : 'Upload';
    if(btn){
        btn.textContent = 'Uploading...';
        btn.disabled = true;
    }

    try{
        const uploadEndpoint = '/api/ImageUpload/upload';
        console.log('Uploading file to:', uploadEndpoint);

        const uploadResponse = await fetch(uploadEndpoint, {
            method: 'POST',
            body: formData 
        });
        
        if(!uploadResponse.ok) {
            const text = await uploadResponse.text();
            throw new Error(`File upload failed: ${uploadResponse.status} ${text}`);
        }

        const uploadData = await uploadResponse.json();
        const imageUrl = uploadData.path || uploadData.url || uploadData.link;

        if(!imageUrl) {
            throw new Error('Upload successful but no URL returned');
        } 

        let normalizedImage = uploadsPathFromUrl(imageUrl) || imageUrl;
        normalizedImage = normalizedImage.replace(/ /g, '%20').replace(/\(/g, '%28').replace(/\)/g, '%29');

        const resolvedImage = rewriteUploadsHost(normalizedImage);
        console.log('File uploaded, URL:', resolvedImage);

        document.getElementById('product-test-image').value = resolvedImage;
        updateProductTestImagePreview(resolvedImage);

        if(productId){
            const updateUrl = '/api/Product/update-product-image';
            const token = localStorage.getItem('authToken');
            const headers = {
                'Content-Type': 'application/json'
            };
            if(token) headers['Authorization'] = 'Bearer ' + token;
            const updateBody = JSON.stringify({
                productId: parseInt(productId),
                photos: resolvedImage,
                imageUrl: resolvedImage,
                linkOfPic: ""
            });
            try{
                const updateResponse = await fetch(updateUrl, {
                    method: 'POST',
                    headers: headers,
                    body: updateBody
                });
                if(!updateResponse.ok) {
                    const text = await updateResponse.text();
                    throw new Error(text || 'Update failed');
                }
                showNotification('success', 'Product image updated successfully');
                loadProductTest();
            }catch(err){
                console.error('Product update failed:', err);
                showNotification('warning', 'Image uploaded but auto-update failed. Please click Save.');
            }
        } else {
            showNotification('success', 'Image uploaded');
        }

    }catch(err){
        console.error(err);
        showNotification('error', err.message || 'Failed to upload image');
    }finally{
        if(btn){
            btn.textContent = originalText;
            btn.disabled = false;
        }
        input.value = '';
    }
  }

  async function ensureSkinTypeOptions(){
    try{
        const res = await api.categories.getByType('skin type');
        state.skinTypes = listFrom(res); // Store for lookup
        const options = state.skinTypes.map(x => {
            const en = x.categoryEN || x.nameEN || x.name;
            const ar = x.categoryAr || x.nameAr || x.ar || '';
            const label = String(en) + (ar ? ` - ${ar}` : '');
            return { value: String(en), label: label };
        });
        setMultiSelectOptions('product-skin-type', options);
    }catch(e){ console.warn('Skin types load', e); }
  }

  async function ensureProductTestSkinTypeOptions(){
    try{
        const res = await api.categories.getByType('skin type');
        state.skinTypes = listFrom(res);
        const options = state.skinTypes.map(x => {
            const en = x.categoryEN || x.nameEN || x.name;
            const ar = x.categoryAr || x.nameAr || x.ar || '';
            const label = String(en) + (ar ? ` - ${ar}` : '');
            return { value: String(en), label: label };
        });
        setMultiSelectOptions('product-test-skin-type', options);
    }catch(e){ console.warn('Skin types load', e); }
  }

  async function ensureDrugStoreOptions(targetId = 'product-drugstore'){
    try{
        if(!state.drugStores || state.drugStores.length === 0){
            const token = localStorage.getItem('authToken');
            const headers = {};
            if(token) headers['Authorization'] = 'Bearer ' + token;
            headers['Accept'] = 'application/json';
            const endpoints = [
              '/api/Delivery/drug-stores'
            ];
            for(let i=0;i<endpoints.length;i++){
              try{
                const res = await fetch(endpoints[i], { headers, credentials: 'include' });
                if(res.ok){
                  const data = await res.json();
                  state.drugStores = listFrom(data);
                  if(state.drugStores && state.drugStores.length) break;
                }
              }catch(e){}
            }
            if(!state.drugStores || state.drugStores.length === 0){
              showNotification('error','Failed to load drug stores');
            }
        }
        const list = Array.isArray(state.drugStores) ? state.drugStores : [];
        const options = list.map(d=>{
            const name = d.name || d.drugStore || d.title || d.storeName || d.store || d;
            return { value: String(name), label: String(name) };
        });
        setMultiSelectOptions(targetId, options);
    }catch(e){ console.warn('Drug stores load', e); }
  }

  async function ensureProductTypeOptions(){
    const sel = document.getElementById('product-type');
    if(!sel) return;
    try{
        const res = await api.categories.getByType('product type');
        const list = listFrom(res);
        const options = list.map(x => {
            const en = x.categoryEN || x.nameEN || x.name || '';
            const ar = x.categoryAr || x.nameAr || x.ar || '';
            const label = ar ? `${en} - ${ar}` : en;
            return { value: en, label: label };
        });
        setMultiSelectOptions('product-type', options);
    }catch(e){ console.warn('Product types load', e); }
  }

  async function ensureProductTestTypeOptions(){
    const sel = document.getElementById('product-test-type');
    if(!sel) return;
    try{
        const res = await api.categories.getByType('product type');
        const list = listFrom(res);
        const options = list.map(x => {
            const en = x.categoryEN || x.nameEN || x.name || '';
            const ar = x.categoryAr || x.nameAr || x.ar || '';
            const label = ar ? `${en} - ${ar}` : en;
            return { value: en, label: label };
        });
        setMultiSelectOptions('product-test-type', options);
    }catch(e){ console.warn('Product types load', e); }
  }

  async function ensurePriceRangeOptions(){
    const sel = document.getElementById('product-price-range');
    if(!sel) return;
    
    // If already populated, maybe skip? But safer to ensure data.
    // We'll just check if we have fetched it before or just fetch always.
    try {
        const token = localStorage.getItem('authToken');
        const headers = {};
        if(token) headers['Authorization'] = 'Bearer ' + token;
        
        // Use relative path which should be proxied or handled if base url is set elsewhere
        const res = await fetch('/api/Product/distinct-price-ranges', { headers });
        if(res.ok){
            const ranges = await res.json();
            if(Array.isArray(ranges)){
                sel.innerHTML = '<option value="">Select Range</option>' + 
                    ranges.map(r => `<option value="${escapeAttr(r)}">${escapeAttr(r)}</option>`).join('');
            }
        }
    } catch(e) { console.warn('Price ranges load', e); }
  }

  async function ensureProductTestPriceRangeOptions(){
    const sel = document.getElementById('product-test-price-range');
    if(!sel) return;
    
    try {
        const token = localStorage.getItem('authToken');
        const headers = {};
        if(token) headers['Authorization'] = 'Bearer ' + token;
        
        const res = await fetch('/api/Product/distinct-price-ranges', { headers });
        if(res.ok){
            const ranges = await res.json();
            if(Array.isArray(ranges)){
                sel.innerHTML = '<option value="">Select Range</option>' + 
                    ranges.map(r => `<option value="${escapeAttr(r)}">${escapeAttr(r)}</option>`).join('');
            }
        }
    } catch(e) { console.warn('Price ranges load', e); }
  }

  function setupOfferToggle(){
     const chk = document.getElementById('product-is-offer');
     const cont = document.getElementById('offer-price-container');
     if(!chk || !cont) return;
     
     const toggle = () => {
         const isChecked = chk.checked;
         cont.style.display = isChecked ? 'block' : 'none';
         const input = document.getElementById('product-offer-price');
         const percInput = document.getElementById('product-percentage-before-offer');
         if(input){
             if(isChecked) input.setAttribute('required', 'required');
             else input.removeAttribute('required');
         }
         if(percInput){
             if(isChecked) percInput.setAttribute('required', 'required');
             else percInput.removeAttribute('required');
         }
     };
     chk.onchange = toggle;
     toggle(); // Run on init
  }

  function setupProductTestOfferToggle(){
     const chk = document.getElementById('product-test-is-offer');
     const cont = document.getElementById('product-test-offer-price-container');
     if(!chk || !cont) return;
     
     const toggle = () => {
         const isChecked = chk.checked;
         cont.style.display = isChecked ? 'block' : 'none';
         const input = document.getElementById('product-test-offer-price');
         const percInput = document.getElementById('product-test-percentage-before-offer');
         if(input){
             if(isChecked) input.setAttribute('required', 'required');
             else input.removeAttribute('required');
         }
         if(percInput){
             if(isChecked) percInput.setAttribute('required', 'required');
             else percInput.removeAttribute('required');
         }
     };
     chk.onchange = toggle;
     toggle();
  }

  window.handleExcelUpload = async function(event) {
    const file = event.target.files[0];
    if (!file) return;

    const fileName = file.name;
    const extension = fileName.split('.').pop().toLowerCase();
    if (extension !== 'xlsx' && extension !== 'xls') {
        showNotification('error', 'Please select a valid Excel file (.xlsx or .xls)');
        event.target.value = '';
        return;
    }

    showNotification('info', `Uploading ${fileName}...`);

    const formData = new FormData();
    formData.append('file', file);
    try {
        const token = window.api?.__internals?.getToken?.();
        const headers = {};
        if (token) headers['Authorization'] = 'Bearer ' + token;
        const response = await fetch('/api/products/upload-excel', { method: 'POST', body: formData, headers, credentials: 'include' });
        if (response.ok) showNotification('success', 'Products imported successfully');
        else throw new Error((await response.text()) || 'Upload failed');
    } catch (err) {
        showNotification('error', err.message || 'Excel upload failed');
    }

    event.target.value = '';
  };

  window.addProduct = async function(){
    const form = document.getElementById('product-form');
    if(form) form.reset();
    document.getElementById('product-id').value = '';
    document.getElementById('product-image').value = '';
    if(document.getElementById('product-image-upload')) document.getElementById('product-image-upload').value = '';
    updateImagePreview('');
    document.getElementById('product-modal-title').textContent = 'New Product';
    

    const fields = [
        'product-name-ar', 'product-name', 'product-barcode', 'product-brand-name',
        'product-brand-country',
        'product-gender-ar',
        'product-dosage', 'product-dosage-ar',
        'product-size', 
        'product-active-ingredient', 'product-active-ingredient-ar',
        'product-free-from', 'product-free-from-ar',
        'product-inci', 
        'product-how-to-use', 'product-how-to-use-ar',
        'product-description', 'product-description-ar',
        'product-type',
        'product-pregnancy-lactation'
    ];
    fields.forEach(id => {
        const el = document.getElementById(id);
        if(el) el.value = '';
    });
    const isOffer = document.getElementById('product-is-offer');
    if(isOffer) isOffer.checked = false;
    const stockSelect = document.getElementById('product-stock-status');
    if(stockSelect){
        stockSelect.value = 'true';
        stockSelect.dataset.stockValue = '10';
    }
    const categorySelect = document.getElementById('product-category');
    if(categorySelect) setMultiSelectValues(categorySelect, []);
    const genderSelect = document.getElementById('product-gender');
    if(genderSelect) setMultiSelectValues(genderSelect, []);
    updateGenderArabic();
    const skinSelect = document.getElementById('product-skin-type');
    if(skinSelect) setMultiSelectValues(skinSelect, []);
    const typeSelect = document.getElementById('product-type');
    if(typeSelect) setMultiSelectValues(typeSelect, []);
    const drugSelect = document.getElementById('product-drugstore');
    if(drugSelect) setMultiSelectValues(drugSelect, []);

    ensureProductCategoryOptions();
      ensureProductBrandOptions();
      ensureGenderOptions();
    await ensureSkinTypeOptions();
    await ensureProductTypeOptions();
    await ensurePriceRangeOptions();
    await ensureDrugStoreOptions();
    setupOfferToggle();
    openModal('product-modal');
  }

  window.addProductTest = async function(){
    const form = document.getElementById('product-test-form');
    if(form) form.reset();
    document.getElementById('product-test-id').value = '';
    document.getElementById('product-test-image').value = '';
    if(document.getElementById('product-test-image-upload')) document.getElementById('product-test-image-upload').value = '';
    updateProductTestImagePreview('');
    document.getElementById('product-test-modal-title').textContent = 'New Product';
    
    const fields = [
        'product-test-name-ar', 'product-test-name', 'product-test-barcode', 'product-test-brand-name',
        'product-test-brand-country',
        'product-test-gender-ar',
        'product-test-dosage', 'product-test-dosage-ar',
        'product-test-size', 
        'product-test-active-ingredient', 'product-test-active-ingredient-ar',
        'product-test-free-from', 'product-test-free-from-ar',
        'product-test-inci', 
        'product-test-how-to-use', 'product-test-how-to-use-ar',
        'product-test-description', 'product-test-description-ar',
        'product-test-type',
        'product-test-pregnancy-lactation'
    ];
    fields.forEach(id => {
        const el = document.getElementById(id);
        if(el) el.value = '';
    });
    const isOffer = document.getElementById('product-test-is-offer');
    if(isOffer) isOffer.checked = false;
    const stockSelect = document.getElementById('product-test-stock-status');
    if(stockSelect){
        stockSelect.value = 'true';
        stockSelect.dataset.stockValue = '10';
    }
    const categorySelect = document.getElementById('product-test-category');
    if(categorySelect) setMultiSelectValues(categorySelect, []);
    const genderSelect = document.getElementById('product-test-gender');
    if(genderSelect) setMultiSelectValues(genderSelect, []);
    updateProductTestGenderArabic();
    const skinSelect = document.getElementById('product-test-skin-type');
    if(skinSelect) setMultiSelectValues(skinSelect, []);
    const typeSelect = document.getElementById('product-test-type');
    if(typeSelect) setMultiSelectValues(typeSelect, []);
    const drugSelect = document.getElementById('product-test-drugstore');
    if(drugSelect) setMultiSelectValues(drugSelect, []);

    ensureProductTestCategoryOptions();
    ensureProductTestBrandOptions();
    ensureProductTestGenderOptions();
    await ensureProductTestSkinTypeOptions();
    await ensureProductTestTypeOptions();
    await ensureProductTestPriceRangeOptions();
    await ensureDrugStoreOptions('product-test-drugstore');
    setupProductTestOfferToggle();
    openModal('product-test-modal');
  }

  window.editProduct = function(id){
    (async ()=>{
      try{
        let p = state.products.find(x => String(getProductId(x)) === String(id)) || {};
        if(api.products && api.products.get){
          try{
            const full = await api.products.get(id, { suppressError: true });
            if(full) p = { ...p, ...full };
          }catch(e){}
        }
        if(!p || (!p.id && !p.productId && !Object.keys(p).length)){
          showNotification('error', 'Product not found');
          return;
        }
        ensureProductCategoryOptions();
        ensureProductBrandOptions();
        ensureGenderOptions();
        await ensureSkinTypeOptions();
        await ensureProductTypeOptions();
        await ensurePriceRangeOptions();
        await ensureDrugStoreOptions();
        setupOfferToggle();
        const pid = getProductId(p);
        document.getElementById('product-id').value = pid + '';
        document.getElementById('product-name').value = getProductName(p) || '';
        document.getElementById('product-name-ar').value = p.productNameAR || p.nameAr || '';
        document.getElementById('product-description').value = getProductDescription(p) || '';
        document.getElementById('product-price').value = parseNumberLike(p.price ?? p.unitPrice ?? p.sellingPrice ?? p.finalPrice ?? 0);
        
        const isOutOfStock = String(p.outofstock) === 'true';
        const stockSelect = document.getElementById('product-stock-status');
        if(stockSelect){
            const stockNum = parseInt(p.stock ?? 10) || 10;
            stockSelect.dataset.stockValue = String(stockNum);
            stockSelect.value = isOutOfStock ? 'false' : 'true';
        }
        
        const catSelect = document.getElementById('product-category');
        const catValues = normalizeMultiValue(p.categoryENs || p.categoryENS || p.categoryEN || p.category || p.categoryName || '');
        if(catSelect) setMultiSelectValues(catSelect, catValues);

        document.getElementById('product-image').value = getProductImageUrl(p) || (p.imageUrl || p.image || p.photo || '');
        if(document.getElementById('product-image-upload')) document.getElementById('product-image-upload').value = '';
        updateImagePreview(document.getElementById('product-image').value);

        // New fields
        document.getElementById('product-barcode').value = p.barcode || '';
        const brandSelect = document.getElementById('product-brand-name');
        if(brandSelect) setMultiSelectValues(brandSelect, p.brandName || '');
        document.getElementById('product-brand-country').value = p.brandCountryofOrigin || '';
        const genderSelect = document.getElementById('product-gender');
        if(genderSelect) setMultiSelectValues(genderSelect, normalizeMultiValue(p.genderSuitabilityEn || p.genderSuitabilityEN || p.genderSuitability || ''));
        document.getElementById('product-gender-ar').value = p.genderSuitabilityAr || '';
        updateGenderArabic();
        const skinSelect = document.getElementById('product-skin-type');
        if(skinSelect) setMultiSelectValues(skinSelect, normalizeMultiValue(p.skinTypeEN || p.skinTypeEn || p.skinType || ''));
        const drugSelect = document.getElementById('product-drugstore');
        if(drugSelect) setMultiSelectValues(drugSelect, normalizeMultiValue(p.drugStores || p.drugStore || p.drugStoreName || ''));
        
        const timeSelect = document.getElementById('product-time');
        if(timeSelect) setMultiSelectValues(timeSelect, normalizeMultiValue(p.time || p.Time || ''));

        const pregSelect = document.getElementById('product-pregnancy-lactation');
        if(pregSelect) {
            let val = p.pregnancyLactation || p.pregnancyLactationYN || p.pregnancy || '';
            if(val === 'Y') val = 'Yes';
            if(val === 'N') val = 'No';
            pregSelect.value = val;
        }
        
        // document.getElementById('product-category-ar').value = p.categoryAr || '';
        // document.getElementById('product-category-en').value = p.categoryEN || '';

        const typeSelect = document.getElementById('product-type');
        if(typeSelect) setMultiSelectValues(typeSelect, normalizeMultiValue(p.productType || ''));

        document.getElementById('product-dosage').value = p.dosageFormEN || '';
        document.getElementById('product-dosage-ar').value = p.dosageFormAR || '';
        document.getElementById('product-size').value = p.sizeEN || '';
        document.getElementById('product-active-ingredient').value = p.keyActiveIngredient || '';
        document.getElementById('product-active-ingredient-ar').value = p.keyActiveIngredientAR || '';
        document.getElementById('product-free-from').value = p.freeFromEN || '';
        document.getElementById('product-free-from-ar').value = p.freeFromAr || '';
        document.getElementById('product-inci').value = p.inci || '';
        document.getElementById('product-how-to-use').value = p.howToUseEN || '';
        document.getElementById('product-how-to-use-ar').value = p.howToUseAR || '';
        document.getElementById('product-description-ar').value = p.descriptionAR || '';
        
        const isOfferCheck = document.getElementById('product-is-offer');
        if(isOfferCheck) {
            isOfferCheck.checked = !!p.isOffer;
            // Update visibility of offer price field
            setupOfferToggle(); 
        }
        document.getElementById('product-offer-price').value = p.priceOffer ?? 0;
        document.getElementById('product-percentage-before-offer').value = p.percentageBeforeOffer ?? 0;
        document.getElementById('product-price-range').value = p.priceRange || '';

        document.getElementById('product-modal-title').textContent = 'Edit Product';
        openModal('product-modal');
      }catch(e){
        showNotification('error', 'Failed to load product');
      }
    })();
  }

  window.editProductTest = function(id){
    (async ()=>{
      try{
        let p = state.productTestProducts.find(x => String(getProductId(x)) === String(id)) || {};
        if(api.productTest && api.productTest.get){
          try{
            const full = await api.productTest.get(id, { suppressError: true });
            if(full) p = { ...p, ...full };
          }catch(e){}
        }
        if(!p || (!p.id && !p.productId && !Object.keys(p).length)){
          showNotification('error', 'Product not found');
          return;
        }
        ensureProductTestCategoryOptions();
        ensureProductTestBrandOptions();
        ensureProductTestGenderOptions();
        await ensureProductTestSkinTypeOptions();
        await ensureProductTestTypeOptions();
        await ensureProductTestPriceRangeOptions();
        await ensureDrugStoreOptions('product-test-drugstore');
        setupProductTestOfferToggle();
        const pid = getProductId(p);
        document.getElementById('product-test-id').value = pid + '';
        document.getElementById('product-test-name').value = getProductName(p) || '';
        document.getElementById('product-test-name-ar').value = p.productNameAR || p.nameAr || '';
        document.getElementById('product-test-description').value = getProductDescription(p) || '';
        document.getElementById('product-test-price').value = parseNumberLike(p.price ?? p.unitPrice ?? p.sellingPrice ?? p.finalPrice ?? 0);
        
        const isOutOfStock = String(p.outofstock) === 'true';
        const stockSelect = document.getElementById('product-test-stock-status');
        if(stockSelect){
            const stockNum = parseInt(p.stock ?? 10) || 10;
            stockSelect.dataset.stockValue = String(stockNum);
            stockSelect.value = isOutOfStock ? 'false' : 'true';
        }
        
        const catSelect = document.getElementById('product-test-category');
        const catValues = normalizeMultiValue(p.categoryENs || p.categoryENS || p.categoryEN || p.category || p.categoryName || '');
        if(catSelect) setMultiSelectValues(catSelect, catValues);

        document.getElementById('product-test-image').value = getProductImageUrl(p) || (p.imageUrl || p.image || p.photo || '');
        if(document.getElementById('product-test-image-upload')) document.getElementById('product-test-image-upload').value = '';
        updateProductTestImagePreview(document.getElementById('product-test-image').value);

        document.getElementById('product-test-barcode').value = p.barcode || '';
        const brandSelectTest = document.getElementById('product-test-brand-name');
        if(brandSelectTest) setMultiSelectValues(brandSelectTest, p.brandName || '');
        document.getElementById('product-test-brand-country').value = p.brandCountryofOrigin || '';
        const genderSelect = document.getElementById('product-test-gender');
        if(genderSelect) setMultiSelectValues(genderSelect, normalizeMultiValue(p.genderSuitabilityEn || p.genderSuitabilityEN || p.genderSuitability || ''));
        document.getElementById('product-test-gender-ar').value = p.genderSuitabilityAr || '';
        updateProductTestGenderArabic();
        const skinSelect = document.getElementById('product-test-skin-type');
        if(skinSelect) setMultiSelectValues(skinSelect, normalizeMultiValue(p.skinTypeEN || p.skinTypeEn || p.skinType || ''));
        const drugSelect = document.getElementById('product-test-drugstore');
        if(drugSelect) setMultiSelectValues(drugSelect, normalizeMultiValue(p.drugStores || p.drugStore || p.drugStoreName || ''));
        
        const timeSelect = document.getElementById('product-test-time');
        if(timeSelect) setMultiSelectValues(timeSelect, normalizeMultiValue(p.time || p.Time || ''));

        const pregSelect = document.getElementById('product-test-pregnancy-lactation');
        if(pregSelect) {
            let val = p.pregnancyLactation || p.pregnancyLactationYN || p.pregnancy || '';
            if(val === 'Y') val = 'Yes';
            if(val === 'N') val = 'No';
            pregSelect.value = val;
        }

        const typeTestSelect = document.getElementById('product-test-type');
        if(typeTestSelect) setMultiSelectValues(typeTestSelect, normalizeMultiValue(p.productType || ''));

        document.getElementById('product-test-dosage').value = p.dosageFormEN || '';
        document.getElementById('product-test-dosage-ar').value = p.dosageFormAR || '';
        document.getElementById('product-test-size').value = p.sizeEN || '';
        document.getElementById('product-test-active-ingredient').value = p.keyActiveIngredient || '';
        document.getElementById('product-test-active-ingredient-ar').value = p.keyActiveIngredientAR || '';
        document.getElementById('product-test-free-from').value = p.freeFromEN || '';
        document.getElementById('product-test-free-from-ar').value = p.freeFromAr || '';
        document.getElementById('product-test-inci').value = p.inci || '';
        document.getElementById('product-test-how-to-use').value = p.howToUseEN || '';
        document.getElementById('product-test-how-to-use-ar').value = p.howToUseAR || '';
        document.getElementById('product-test-description-ar').value = p.descriptionAR || '';
        
        const isOfferCheck = document.getElementById('product-test-is-offer');
        if(isOfferCheck) {
            isOfferCheck.checked = !!p.isOffer;
            setupProductTestOfferToggle(); 
        }
        document.getElementById('product-test-offer-price').value = p.priceOffer ?? 0;
        document.getElementById('product-test-percentage-before-offer').value = p.percentageBeforeOffer ?? 0;
        document.getElementById('product-test-price-range').value = p.priceRange || '';

        document.getElementById('product-test-modal-title').textContent = 'Edit Product';
        openModal('product-test-modal');
      }catch(e){
        showNotification('error', 'Failed to load product');
      }
    })();
  }

  window.updateImagePreviewGeneric = function(url, previewId){
    const preview = document.getElementById(previewId);
    if(!preview) return;
    if(url){
        const displayUrl = resolveDisplayUrl(url);
        preview.src = displayUrl;
        preview.style.display = 'block';
    } else {
        preview.style.display = 'none';
    }
  }

  window.handleGenericImageUpload = async function(input, targetInputId, previewId){
    if(!input.files || !input.files[0]) return;
    const file = input.files[0];
    
    // Validation
    if(!file.type.startsWith('image/')){
        showNotification('error', 'Please upload an image file');
        input.value = '';
        return;
    }
    if(file.size > 5 * 1024 * 1024){ // 5MB limit
        showNotification('error', 'Image size exceeds 5MB limit');
        input.value = '';
        return;
    }

    const btn = input.nextElementSibling;
    const originalText = btn ? btn.textContent : 'Upload';
    if(btn){
        btn.textContent = 'Uploading...';
        btn.disabled = true;
    }

    try{
        const formData = new FormData();
        formData.append('file', file);
        
        const uploadEndpoint = '/api/ImageUpload/upload';
        const uploadResponse = await fetch(uploadEndpoint, {
            method: 'POST',
            body: formData 
        });
        
        if(!uploadResponse.ok) {
            const text = await uploadResponse.text();
            throw new Error(`File upload failed: ${uploadResponse.status} ${text}`);
        }

        const uploadData = await uploadResponse.json();
        const imageUrl = uploadData.path || uploadData.url || uploadData.link;

        if(!imageUrl) throw new Error('Upload successful but no URL returned');

        let normalizedImage = uploadsPathFromUrl(imageUrl) || imageUrl;
        normalizedImage = normalizedImage.replace(/ /g, '%20').replace(/\(/g, '%28').replace(/\)/g, '%29');
        const resolvedImage = rewriteUploadsHost(normalizedImage);

        document.getElementById(targetInputId).value = resolvedImage;
        updateImagePreviewGeneric(resolvedImage, previewId);
        
        showNotification('success', 'Image uploaded');

    }catch(err){
        console.error(err);
        showNotification('error', err.message || 'Failed to upload image');
    }finally{
        if(btn){
            btn.textContent = originalText;
            btn.disabled = false;
        }
        input.value = '';
    }
  }

  window.addCategory = function(){
    const form = document.getElementById('category-form');
    if(form) form.reset();
    document.getElementById('category-id').value = '';
    document.getElementById('category-icon-photo').value = '';
    document.getElementById('category-cover-photo').value = '';
    updateImagePreviewGeneric('', 'category-icon-preview');
    updateImagePreviewGeneric('', 'category-cover-preview');
    
    // Reset check box
    const chk = document.getElementById('category-trading-now');
    if(chk) chk.checked = false;

    document.getElementById('category-modal-title').textContent = 'New Category';
    openModal('category-modal');
  }

  window.loadCategoriesPage = async function(){
    try {
        const res = await api.categories.list();
        state.categories = listFrom(res);
        renderCategoriesTable(state.categories);
    } catch(err) {
        console.warn('Categories load', err);
        state.categories = [];
        renderCategoriesTable([]);
    }
  }

  window.renderCategoriesTable = function(list){
    const container = document.getElementById('categories-container');
    if(!container) return;
    if(!list || list.length===0){ container.innerHTML = '<div style="text-align:center;padding:2rem;color:var(--gray-500)">No categories</div>'; return; }
    
    const page = state.categoriesPage || 1;
    const size = state.pageSize || 10;
    const total = list.length;
    const start = (page-1)*size;
    const pageItems = list.slice(start, start+size);

    const rows = pageItems.map(c => {
        const id = getCategoryIdValue(c);
        const nameEn = c.categoryEN || c.nameEN || c.en || c.name || '';
        const nameAr = c.categoryAr || c.nameAr || c.ar || '';
        const desc = c.description || '';
        const idArg = typeof id === 'string' ? `'${String(id).replace(/'/g,"\\'")}'` : (id||'');

        return `<tr>
            <td>${id}</td>
            <td>${nameEn}</td>
            <td>${nameAr}</td>
            <td>${truncateText(desc, 50)}</td>
            <td>
                <button class="btn btn-outline" onclick="viewCategory(${idArg})">View</button>
                <button class="btn btn-outline" onclick="editCategory(${idArg})">Edit</button>
                <button class="btn btn-outline" onclick="deleteCategory(${idArg})" style="color:#EF4444">Delete</button>
            </td>
        </tr>`;
    }).join('');

    container.innerHTML = `
      <div class="table-wrapper"><table><thead><tr><th>ID</th><th>NAME (EN)</th><th>NAME (AR)</th><th>DESCRIPTION</th><th>ACTION</th></tr></thead>
      <tbody id="categories-tbody-inner">${rows}</tbody></table></div>`;
    renderPagination('categories-container-pagination', total, page, size, 'setCategoriesPage');
  }

  window.setCategoriesPage = function(p){ state.categoriesPage = Math.max(1, p); renderCategoriesTable(state.filteredCategories || state.categories); }

  window.applyCategoryFilters = function(){
    const q = (document.getElementById('categories-search')?.value || '').toLowerCase();
    let list = state.categories.slice();
    
    if(q) {
        list = list.filter(c => {
            const nameEn = (c.categoryEN || c.nameEN || c.en || c.name || '').toLowerCase();
            const nameAr = (c.categoryAr || c.nameAr || c.ar || '').toLowerCase();
            return nameEn.includes(q) || nameAr.includes(q);
        });
    }
    
    state.filteredCategories = list;
    state.categoriesPage = 1;
    renderCategoriesTable(list);
  }

  window.deleteCategory = function(id){
    if(!confirm('Delete category ' + id + '?')) return;
    (async ()=>{
      try{
        if(api.categories && api.categories.delete){
          await api.categories.delete(id);
          showNotification('success','Category deleted');
          await loadCategoriesPage();
        } else showNotification('error','Delete endpoint not available');
      }catch(err){ console.warn(err); showNotification('error','Failed to delete category'); }
    })();
  }

  window.viewCategory = function(id){
    (async ()=>{
      try{
        let c = state.categories.find(x => String(getCategoryIdValue(x)) === String(id));
        if(!c && api.categories && api.categories.get){
             try{ c = await api.categories.get(id); }catch(e){}
        }
        if(!c){ showNotification('error', 'Category not found'); return; }
        
        // Ensure data format consistency for display
        const displayData = {
            "ID": getCategoryIdValue(c),
            "English Name": c.categoryEN || c.nameEN || c.en || c.name || '',
            "Arabic Name": c.categoryAr || c.nameAr || c.ar || '',
            "Description": c.description || '',
            "Filter Category (EN)": c.filterCategory || '',
            "Filter Category (AR)": c.filterCategoryAr || '',
            "Trading Now": c.tradingNow ? 'Yes' : 'No',
            "Total Products": c.totalProducts || '0',
            "Average Price": c.averagePrice || '0',
            "Icon Photo": c.iconPhoto ? `<img src="${resolveDisplayUrl(c.iconPhoto)}" style="max-height:50px;">` : 'No Icon',
            "Cover Photo": c.coverPhoto || c.image ? `<img src="${resolveDisplayUrl(c.coverPhoto || c.image)}" style="max-height:50px;">` : 'No Cover'
        };
        
        window.openDataModal('Category Details', displayData);
      }catch(err){ showNotification('error','Failed to load category details'); }
    })();
  }

  window.editCategory = function(id){
    (async ()=>{
      try{
        let c = state.categories.find(x => String(getCategoryIdValue(x)) === String(id));
        if(!c && api.categories && api.categories.get){
             try{ c = await api.categories.get(id, { suppressError: true }); }catch(e){}
        }
        if(!c){ showNotification('error', 'Category not found'); return; }

        document.getElementById('category-id').value = id;
        document.getElementById('category-name-en').value = c.categoryEN || c.nameEN || c.en || '';
        document.getElementById('category-name-ar').value = c.categoryAr || c.nameAr || c.ar || '';
        document.getElementById('category-description').value = c.description || '';
        
        document.getElementById('category-filter-en').value = c.filterCategory || '';
        document.getElementById('category-filter-ar').value = c.filterCategoryAr || '';
        
        const tradingCheck = document.getElementById('category-trading-now');
        if(tradingCheck) tradingCheck.checked = !!c.tradingNow;

        const iconUrl = c.iconPhoto || c.icons || '';
        document.getElementById('category-icon-photo').value = iconUrl;
        updateImagePreviewGeneric(iconUrl, 'category-icon-preview');

        const coverUrl = c.coverPhoto || c.image || '';
        document.getElementById('category-cover-photo').value = coverUrl;
        updateImagePreviewGeneric(coverUrl, 'category-cover-preview');

        document.getElementById('category-modal-title').textContent = 'Edit Category';
        
        openModal('category-modal');
      }catch(err){ showNotification('error','Failed to load category'); }
    })();
  }

  window.viewProduct = function(id){
    (async ()=>{
      try{
        const p = state.products.find(x => String(getProductId(x)) === String(id)) || null;
        if(api.products && api.products.get){
          try{
            const full = await api.products.get(id);
            window.openDataModal('Product ' + id, full);
            return;
          }catch(e){}
        }
        window.openDataModal('Product ' + id, p || { id });
      }catch(e){
        showNotification('error', 'Failed to load product');
      }
    })();
  }
  window.deleteProduct = function(id){ if(confirm('Delete product ' + id + '?')){
    (async ()=>{
      try{
        if(api.products && api.products.delete){
          await api.products.delete(id);
          showNotification('success','Product deleted');
          loadProducts();
        } else showNotification('error','Delete endpoint not available');
      }catch(err){ console.warn(err); showNotification('error','Failed to delete product'); }
    })();
  } }

  window.viewProductTest = function(id){
    (async ()=>{
      try{
        const p = state.productTestProducts.find(x => String(getProductId(x)) === String(id)) || null;
        if(api.productTest && api.productTest.get){
          try{
            const full = await api.productTest.get(id);
            window.openDataModal('Product ' + id, full);
            return;
          }catch(e){}
        }
        window.openDataModal('Product ' + id, p || { id });
      }catch(e){
        showNotification('error', 'Failed to load product');
      }
    })();
  }
  window.deleteProductTest = function(id){ if(confirm('Delete product ' + id + '?')){
    (async ()=>{
      try{
        if(api.productTest && api.productTest.delete){
          await api.productTest.delete(id);
          showNotification('success','Product deleted');
          loadProductTest();
        } else showNotification('error','Delete endpoint not available');
      }catch(err){ console.warn(err); showNotification('error','Failed to delete product'); }
    })();
  } }

  window.applyProductFilters = async function(){
    const cat = document.getElementById('products-category-filter').value;
    const q = document.getElementById('products-search').value.toLowerCase();
    
    // If category is selected, use API
    if(cat){
      try {
        const res = await api.products.filterByCategory(cat, { suppressError: true });
        // The API might return an object like { message: "No products found..." } or a 404
        if(res && res.message && res.message.includes('No products found')){
            state.filteredProducts = [];
            showNotification('info', 'No products found in this category');
        } else {
            state.filteredProducts = listFrom(res);
        }
      } catch(e) {
        console.warn('Filter failed', e);
        // 404 means no products found, which is a valid empty state
        if (e.status === 404 || (e.message && e.message.includes('No products found'))) {
            state.filteredProducts = [];
            showNotification('info', 'No products found in this category');
        } else {
            showNotification('error', 'Failed to filter products by category');
            state.filteredProducts = [];
        }
      }
    } else {
        // Reset to all products if no category
        state.filteredProducts = state.products.slice();
    }

    let list = state.filteredProducts;

    // Client-side search filter
    if(q) list = list.filter(p => {
      const name = (getProductName(p)||'').toLowerCase();
      const desc = (getProductDescription(p)||'').toLowerCase();
      const pid = (getProductId(p)||'').toString().toLowerCase();
      return name.includes(q) || desc.includes(q) || pid.includes(q);
    });
    
    state.productsPage = 1;
    renderProductsTable(list);
  }

  window.applyProductTestFilters = async function(){
    const cat = document.getElementById('product-test-category-filter').value;
    const q = document.getElementById('product-test-search').value.toLowerCase();
    
    if(cat){
      try {
        const res = await api.productTest.filterByCategory(cat, { suppressError: true });
        if(res && res.message && res.message.includes('No products found')){
            state.productTestFilteredProducts = [];
            showNotification('info', 'No products found in this category');
        } else {
            state.productTestFilteredProducts = listFrom(res);
        }
      } catch(e) {
        console.warn('Filter failed', e);
        if (e.status === 404 || (e.message && e.message.includes('No products found'))) {
            state.productTestFilteredProducts = [];
            showNotification('info', 'No products found in this category');
        } else {
            showNotification('error', 'Failed to filter products by category');
            state.productTestFilteredProducts = [];
        }
      }
    } else {
        state.productTestFilteredProducts = state.productTestProducts.slice();
    }

    let list = state.productTestFilteredProducts;

    if(q) list = list.filter(p => {
      const name = (getProductName(p)||'').toLowerCase();
      const desc = (getProductDescription(p)||'').toLowerCase();
      const pid = (getProductId(p)||'').toString().toLowerCase();
      return name.includes(q) || desc.includes(q) || pid.includes(q);
    });
    
    state.productTestPage = 1;
    renderProductTestTable(list);
  }

  async function loadDelivery(){
    const reqId = Date.now();
    loadDelivery.lastReq = reqId;
    try{
      const res = await api.delivery.list();
      if(loadDelivery.lastReq !== reqId) return;
      state.delivery = listFrom(res);
      if(window.applyDeliveryFilters){
          window.applyDeliveryFilters();
      } else {
          renderDeliveryTable(state.delivery);
      }
    }catch(err){
        console.warn('Delivery load', err);
        if(loadDelivery.lastReq === reqId){
          state.delivery = [];
          renderDeliveryTable([]);
        }
    }
  }

  function deliveryIdOf(d){
    return d.id ?? '';
  }

  function renderDeliveryTable(list){
    const tbody = document.getElementById('delivery-tbody');
    if(!tbody) return;
    if(!list || list.length === 0) {
      tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:2rem;">No deliveries found</td></tr>';
      return;
    }
    tbody.innerHTML = list.map((d)=>{
      const id = d.id || '';
      const drugStore = d.drugStore || '';
      const mainArea = d.mainArea || '';
      const minOrder = `${d.mainMinimumOrder || '—'} / ${d.otherAreasMinimumOrder || '—'}`;
      const fees = `${d.mainDeliveryFees || '—'} / ${d.otherAreasDeliveryFees || '—'}`;
      const mainOption = d.mainDeliveryOption || '';
      const notes = d.deliveryOptionNotes || '';
      const idArg = typeof id === 'string' ? `'${String(id).replace(/'/g,"\\'")}'` : (id||'');

      return `<tr>
        <td>${id}</td>
        <td>${drugStore}</td>
        <td>${mainArea}</td>
        <td>${minOrder}</td>
        <td>${fees}</td>
        <td title="${escapeAttr(mainOption)}" style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${mainOption}</td>
        <td title="${escapeAttr(notes)}" style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${notes}</td>
        <td style="white-space:nowrap">
          <button class="btn btn-outline btn-sm" onclick="viewDelivery(${idArg})">View</button>
          <button class="btn btn-outline btn-sm" onclick="editDelivery(${idArg})">Edit</button>
          <button class="btn btn-outline btn-sm" onclick="deleteDelivery(${idArg})" style="color:#EF4444">Delete</button>
        </td>
      </tr>`;
    }).join('');
  }

  window.viewDelivery = function(id){
    (async ()=>{
      try{
        let d = state.delivery.find(x => String(x.id) === String(id)) || null;
        if(!d){ try{ d = await api.delivery.get(id); }catch(e){} }
        if(!d){ showNotification('error', 'Delivery not found'); return; }
        window.openDataModal('Delivery Info', d);
      }catch(e){
        showNotification('error','Failed to load delivery details');
      }
    })();
  }

  window.editDelivery = function(id){
    (async ()=>{
      try{
        let d = state.delivery.find(x => String(deliveryIdOf(x)) === String(id));
        if(!d){ try{ d = await api.delivery.get(id); }catch(e){} }
        if(!d){ showNotification('error', 'Delivery not found'); return; }

        document.getElementById('delivery-id').value = d.id;
        document.getElementById('delivery-drugstore').value = d.drugStore || '';
        document.getElementById('delivery-main-area').value = d.mainArea || '';
        document.getElementById('delivery-main-min-order').value = d.mainMinimumOrder || '';
        document.getElementById('delivery-other-min-order').value = d.otherAreasMinimumOrder || '';
        document.getElementById('delivery-main-fees').value = d.mainDeliveryFees || '';
        document.getElementById('delivery-other-fees').value = d.otherAreasDeliveryFees || '';
        document.getElementById('delivery-main-option').value = d.mainDeliveryOption || '';
        document.getElementById('delivery-other-option').value = d.otherAreasDeliveryOption || '';
        document.getElementById('delivery-option-notes').value = d.deliveryOptionNotes || '';
        document.getElementById('delivery-tos').value = d.termsOfService || '';
        document.getElementById('delivery-tos-ar').value = d.termsOfServiceAr || '';
        document.getElementById('delivery-modal-title').textContent = 'Edit Delivery #' + id;

        openModal('delivery-modal');
      }catch(e){
        showNotification('error','Failed to load delivery');
      }
    })();
  }

  window.deleteDelivery = function(id){
    if(!confirm('Delete delivery ' + id + '?')) return;
    (async ()=>{
      try{
        await api.delivery.delete(id);
        showNotification('success','Delivery deleted');
        await loadDelivery();
      }catch(err){
        showNotification('error', err?.message || 'Failed to delete delivery');
      }
    })();
  }

  window.applyDeliveryFilters = function(){
    const search = (document.getElementById('delivery-search')?.value || '').toLowerCase();
    let list = state.delivery.slice();
    if(search) list = list.filter(d => {
      const hay = [
        d.id,
        d.drugStore,
        d.mainArea,
        d.mainMinimumOrder,
        d.otherAreasMinimumOrder,
        d.mainDeliveryFees,
        d.otherAreasDeliveryFees,
        d.mainDeliveryOption,
        d.otherAreasDeliveryOption,
        d.deliveryOptionNotes
      ].map(x => (x||'').toString().toLowerCase()).join(' | ');
      return hay.includes(search);
    });
    state.filteredDelivery = list;
    renderDeliveryTable(list);
  }

  async function handleDeliverySubmit(e){
    e.preventDefault();
    const deliveryId = document.getElementById('delivery-id')?.value || '';
    const drugStore = document.getElementById('delivery-drugstore')?.value || '';
    if(!drugStore){ showNotification('error','Drug Store is required'); return; }

    const payload = {
      drugStore,
      mainArea:                  document.getElementById('delivery-main-area')?.value || '',
      mainMinimumOrder:          document.getElementById('delivery-main-min-order')?.value || '',
      otherAreasMinimumOrder:    document.getElementById('delivery-other-min-order')?.value || '',
      mainDeliveryFees:          document.getElementById('delivery-main-fees')?.value || '',
      otherAreasDeliveryFees:    document.getElementById('delivery-other-fees')?.value || '',
      mainDeliveryOption:        document.getElementById('delivery-main-option')?.value || '',
      otherAreasDeliveryOption:  document.getElementById('delivery-other-option')?.value || '',
      deliveryOptionNotes:       document.getElementById('delivery-option-notes')?.value || '',
      termsOfService:            document.getElementById('delivery-tos')?.value || '',
      termsOfServiceAr:          document.getElementById('delivery-tos-ar')?.value || ''
    };

    try{
      if(deliveryId){
        await api.delivery.update(deliveryId, { id: Number(deliveryId), ...payload });
      } else {
        await api.delivery.create(payload);
      }
      showNotification('success', deliveryId ? 'Delivery updated' : 'Delivery created');
      closeModal('delivery-modal');
      document.getElementById('delivery-form')?.reset();
      document.getElementById('delivery-id').value = '';
      await loadDelivery();
    }catch(err){
      showNotification('error', err?.message || 'Failed to save delivery');
    }
  }

  async function loadDiscounts(){
    try{
      const res = await api.discount.list();
      const next = listFrom(res);
      state.discountCodes = next;
      renderDiscountTable(state.discountCodes);
    }catch(err){ console.warn('Discounts load', err); state.discountCodes = []; renderDiscountTable([]); }
  }

  function discountIdOf(d){
    return d.id ?? d.Id ?? d.discountId ?? d.code ?? '';
  }
  function discountExpiryOf(d){
    return d.expiryDate || d.ExpiryDate || d.expiry || d.endDate || '';
  }
  function renderDiscountTable(list){
    const tbody = document.getElementById('discount-tbody');
    if(!tbody) return;
    if(!list || !list.length){
      tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:2rem;">No discount codes</td></tr>';
      return;
    }
    
    tbody.innerHTML = list.map((d)=>{
      const id = discountIdOf(d);
      const idArg = typeof id === 'string' ? `'${String(id).replace(/'/g,"\\'")}'` : (id||'');
      const code = d.code || d.Code || d.discountCode || d.DiscountCode || '';
      const pct = d.discountPercentage ?? d.DiscountPercentage ?? d.percentage ?? d.discount ?? '';
      const expiry = discountExpiryOf(d);
      const timesUsed = d.timesUsed ?? d.TimesUsed ?? d.usageCount ?? d.UsageCount ?? d.used ?? '';
      const active = d.isActive ?? d.active ?? d.IsActive ?? null;
      const status = active === null ? '' : (active ? 'Active' : 'Inactive');
      
      return `<tr>
        <td>${code}</td>
        <td>${pct}</td>
        <td>${expiry ? formatDate(expiry) : '-'}</td>
        <td>${timesUsed === '' ? '-' : timesUsed}</td>
        <td>${status}</td>
        <td style="white-space:nowrap">
          <button class="btn btn-outline btn-sm" onclick="viewDiscount(${idArg})">View</button>
          <button class="btn btn-outline btn-sm" onclick="editDiscount(${idArg})">Edit</button>
          <button class="btn btn-outline btn-sm" onclick="deleteDiscount(${idArg})" style="color:#EF4444">Delete</button>
        </td>
      </tr>`;
    }).join('');
  }

  function applyDiscountFilters(){
    const q = (document.getElementById('discount-search')?.value || '').toLowerCase();
    if(!q){
      state.filteredDiscountCodes = null;
      renderDiscountTable(state.discountCodes);
      return;
    }
    const list = state.discountCodes.filter(d => {
      const hay = [discountIdOf(d), d.code, d.Code, d.discountCode, d.DiscountCode, d.discountPercentage, d.DiscountPercentage, discountExpiryOf(d), d.timesUsed, d.TimesUsed]
        .map(x=> (x||'').toString().toLowerCase()).join(' | ');
      return hay.includes(q);
    });
    state.filteredDiscountCodes = list;
    renderDiscountTable(list);
  }

  window.viewDiscount = function(id){
    (async ()=>{
      try{
        const d = state.discountCodes.find(x => String(discountIdOf(x)) === String(id)) || null;
        if(api.discount && api.discount.get){
          try{
            const full = await api.discount.get(id);
            window.openDataModal('Discount ' + id, full);
            return;
          }catch(e){}
        }
        window.openDataModal('Discount ' + id, d || { id });
      }catch(e){
        showNotification('error','Failed to load discount');
      }
    })();
  }
  window.editDiscount = function(id){
    (async ()=>{
      try{
        let d = state.discountCodes.find(x => String(discountIdOf(x)) === String(id)) || {};
        if(api.discount && api.discount.get){
             try{
                const fresh = await api.discount.get(id, { suppressError: true });
                if(fresh) d = { ...d, ...fresh };
             }catch(e){}
        }
        document.getElementById('discount-id').value = (discountIdOf(d) || id || '') + '';
        document.getElementById('discount-code').value = d.code || d.Code || d.discountCode || d.DiscountCode || '';
        document.getElementById('discount-percentage').value = d.discountPercentage ?? d.DiscountPercentage ?? d.percentage ?? d.discount ?? '';
        const expiry = d.expiryDate || d.ExpiryDate || d.expiry || d.endDate || '';
        const expiryEl = document.getElementById('discount-expiry');
        if(expiryEl){
          const today = new Date();
          const yyyy = today.getFullYear();
          const mm = String(today.getMonth()+1).padStart(2,'0');
          const dd = String(today.getDate()).padStart(2,'0');
          const min = `${yyyy}-${mm}-${dd}`;
          expiryEl.min = min;
          
          let current = '';
          if(expiry) {
            try {
              // Parse date correctly without timezone shift
              const dateObj = new Date(expiry);
              const year = dateObj.getFullYear();
              const month = String(dateObj.getMonth() + 1).padStart(2, '0');
              const day = String(dateObj.getDate()).padStart(2, '0');
              current = `${year}-${month}-${day}`;
            } catch(e) {
              current = expiry.toString().slice(0,10);
            }
          }
          expiryEl.value = (current && current < min) ? min : current;
        }
        const active = d.isActive ?? d.active ?? d.IsActive;
        const activeValue = active === undefined || active === null ? 'true' : (active ? 'true' : 'false');
        const activeInput = document.getElementById('discount-active');
        if(activeInput) activeInput.value = activeValue;
        document.getElementById('discount-modal-title').textContent = 'Edit Discount Code';
        openModal('discount-modal');
      }catch(e){ showNotification('error','Failed to load discount'); }
    })();
  }
  window.deleteDiscount = function(id){
    if(!confirm('Delete discount ' + id + '?')) return;
    (async ()=>{
      try{
        if(api.discount && api.discount.delete){
          await api.discount.delete(id);
          showNotification('success','Discount deleted');
          await loadDiscounts();
        } else showNotification('error','Delete endpoint not available');
      }catch(err){
        showNotification('error', err?.message || 'Failed to delete discount');
      }
    })();
  }

  async function loadAds(){
    try{
      if(!api.ads) { console.warn('api.ads not defined'); return; }
      const res = await api.ads.list();
      state.ads = listFrom(res);
      renderAdsTable(state.ads);
    }catch(err){ console.warn('Ads load', err); state.ads = []; renderAdsTable([]); }
  }

  function renderAdsTable(list){
    const tbody = document.getElementById('ads-tbody');
    if(!tbody) return;
    if(!list || !list.length){
      tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:2rem;">No ads found</td></tr>';
      return;
    }
    tbody.innerHTML = list.map(a => {
       const id = a.id || a._id || '';
       const title = a.title || a.name || a.route || a.Route || 'Untitled';
       const imgRaw = a.imageUrl || a.image || a.imgLink || a.img || a.photo || a.picture || a.banner || '';
       const img = imgRaw ? (imgRaw.startsWith('http') ? imgRaw : resolveDisplayUrl(rewriteUploadsHost(imgRaw))) : '';
       const status = a.isActive !== false ? 'Active' : 'Inactive';
       const idArg = typeof id === 'string' ? `'${String(id).replace(/'/g,"\\'")}'` : (id||'');
       
       return `<tr>
         <td>${id}</td>
         <td>${title}</td>
         <td>${img ? `<img src="${img}" style="height:40px; border-radius:4px;">` : ''}</td>
         <td><span class="status-badge ${status==='Active'?'status-delivered':'status-cancelled'}">${status}</span></td>
         <td>
           <button class="btn btn-outline btn-sm" onclick="viewAd(${idArg})">View</button>
           <button class="btn btn-outline btn-sm" onclick="editAd(${idArg})">Edit</button>
           <button class="btn btn-outline btn-sm" onclick="deleteAd(${idArg})" style="color:#EF4444">Delete</button>
         </td>
       </tr>`;
    }).join('');
  }

  window.viewAd = function(id){
    const a = state.ads.find(x => String(x.id||x._id) === String(id));
    openDataModal('Ad Details', a || {id});
  }

  window.editAd = function(id){
    (async ()=>{
      try{
        let a = state.ads.find(x => String(x.id||x._id) === String(id));
        if(api.ads && api.ads.get){
             try{ a = await api.ads.get(id, { suppressError: true }) || a; }catch(e){}
        }
        if(!a){ showNotification('error','Ad not found'); return; }
        
        document.getElementById('ads-id').value = id;
        document.getElementById('ads-title').value = a.title || a.name || a.route || '';
        document.getElementById('ads-description').value = a.description || a.desc || '';
        const img = a.imageUrl || a.image || a.imgLink || '';
        const imgInput = document.getElementById('ads-image');
        if(imgInput) imgInput.value = img;
        const prev = document.getElementById('ads-image-preview');
        if(prev){
          if(img){
            prev.src = img.startsWith('http') ? img : rewriteUploadsHost(img);
            prev.style.display = 'block';
          } else {
            prev.style.display = 'none';
          }
        }
        document.getElementById('ads-link').value = a.link || a.route || '';
        document.getElementById('ads-modal-title').textContent = 'Edit Ad';
        openModal('ads-modal');
      }catch(e){ showNotification('error','Failed to load ad'); }
    })();
  }

  window.deleteAd = async function(id){
    if(!confirm('Delete this ad?')) return;
    try{
       await api.ads.delete(id);
       showNotification('success', 'Ad deleted');
       loadAds();
    }catch(e){ showNotification('error', 'Failed to delete ad'); }
  }

  window.handleAdImageUpload = async function(input){
    if(!input.files || !input.files[0]) return;
    const file = input.files[0];
    const originalText = 'Upload Image';
    const btn = input.parentElement?.querySelector('button');
    if(btn){
      btn.disabled = true;
      btn.textContent = 'Uploading...';
    }
    try{
      const uploadUrl = '/api/ImageUpload/upload';
      const formData = new FormData();
      formData.append('file', file);
      const uploadResponse = await fetch(uploadUrl, { method: 'POST', body: formData });
      if(!uploadResponse.ok){
        const text = await uploadResponse.text();
        throw new Error(`Upload failed: ${uploadResponse.status} ${text}`);
      }
      const uploadData = await uploadResponse.json();
      let imageUrl = uploadData.url || uploadData.imageUrl || uploadData.image || uploadData.filePath || uploadData.link || uploadData.uri || uploadData.path || uploadData.fileName || (typeof uploadData === 'string' ? uploadData : '');
      if(!imageUrl) throw new Error('Could not retrieve image URL from upload response');
      const imgInput = document.getElementById('ads-image');
      if(imgInput) imgInput.value = imageUrl;
      const prev = document.getElementById('ads-image-preview');
      if(prev){
        prev.src = imageUrl.startsWith('http') ? imageUrl : rewriteUploadsHost(imageUrl);
        prev.style.display = 'block';
      }
      showNotification('success','Image uploaded');
    }catch(err){
      showNotification('error', err?.message || 'Failed to upload image');
    }finally{
      if(btn){
        btn.disabled = false;
        btn.textContent = originalText;
      }
      input.value = '';
    }
  }

  const adsForm = document.getElementById('ads-form');
  if(adsForm) adsForm.addEventListener('submit', async (e)=>{
      e.preventDefault();
      const rawId = document.getElementById('ads-id').value;
      const id = rawId ? Number(rawId) : 0;
      const imgLink = document.getElementById('ads-image').value;
      const route = document.getElementById('ads-link').value;
      
      const data = {
          id: id,
          imgLink: imgLink,
          route: route
      };

      try{
          if(id && id !== 0) {
              await api.ads.update(id, data);
          } else {
              await api.ads.create(data);
          }
          showNotification('success', id ? 'Ad updated' : 'Ad created');
          closeModal('ads-modal');
          adsForm.reset();
          document.getElementById('ads-id').value = '';
          const prev = document.getElementById('ads-image-preview');
          if(prev) prev.style.display = 'none';
          loadAds();
      }catch(err){ 
          console.error('Ad Save Error:', err);
          showNotification('error', err.message || 'Failed to save ad'); 
      }
  });

  // Support Service Logic
  window.loadSupportService = async function() {
            try {
                const res = await api.supportService.list();
                state.supportService = listFrom(res);
                renderSupportServiceTable(state.supportService);
            } catch (err) {
                console.warn('Support Service load', err);
                state.supportService = [];
                renderSupportServiceTable([]);
            }
          };

  function renderSupportServiceTable(list) {
    const tbody = document.getElementById('support-service-tbody');
    if (!tbody) return;
    if (!list || !list.length) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 2rem;">No support services found</td></tr>';
        return;
    }
    tbody.innerHTML = list.map(item => {
        const id = item.id || item._id || item.supportServiceId;
        const title = item.title || item.name || '';
        const description = item.description || item.desc || '';
        const idArg = typeof id === 'string' ? `'${String(id).replace(/'/g,"\\'")}'` : (id||'');
        return `
            <tr>
                <td>${id}</td>
                <td>${title}</td>
                <td>${description}</td>
                <td>
                    <button class="btn btn-outline btn-sm" onclick="editSupportService(${idArg})">Edit</button>
                    <button class="btn btn-outline btn-sm" onclick="deleteSupportService(${idArg})" style="color:#EF4444">Delete</button>
                </td>
            </tr>
        `;
    }).join('');
  }

  window.searchSupportService = async function() {
      const id = document.getElementById('support-search').value;
      if(!id) {
          loadSupportService();
          return;
      }
      try {
          const res = await api.supportService.get(id);
          if (!res) { renderSupportServiceTable([]); return; }
          state.supportService = Array.isArray(res) ? res : [res];
          renderSupportServiceTable(state.supportService);
      } catch(e) {
          const msg = e.message || 'Support Service not found';
          showNotification('error', msg);
          renderSupportServiceTable([]);
      }
  };

  window.handleSupportServiceSubmit = async function(e) {
      e.preventDefault();
      const id = document.getElementById('support-service-id').value;
      const data = {
          title: document.getElementById('support-service-title').value,
          description: document.getElementById('support-service-description').value
      };
      
      // If the API requires ID in the body for updates, include it
      if(id) data.id = id;

      try {
          if (id) await api.supportService.update(id, data);
          else await api.supportService.create(data);
          
          showNotification('success', id ? 'Support Service updated' : 'Support Service created');
          closeModal('support-service-modal');
          document.getElementById('support-service-form').reset();
          document.getElementById('support-service-id').value = '';
          loadSupportService();
      } catch (err) {
          showNotification('error', 'Failed to save support service');
      }
  };

  window.editSupportService = async function(id) {
      try {
          // Try to find in local state first, but fetching is better to get latest details if needed
          let item = state.supportService.find(x => String(x.id || x._id || x.supportServiceId) === String(id));
          if (!item) {
              item = await api.supportService.get(id);
          }
          
          document.getElementById('support-service-id').value = id;
          document.getElementById('support-service-title').value = item.title || item.name || '';
          document.getElementById('support-service-description').value = item.description || item.desc || '';
          document.getElementById('support-service-modal-title').textContent = 'Edit Support Service';
          openModal('support-service-modal');
      } catch (e) {
          showNotification('error', 'Failed to load support service details');
      }
  };

  window.deleteSupportService = async function(id) {
      if (!confirm('Are you sure you want to delete this support service?')) return;
      try {
          await api.supportService.delete(id);
          showNotification('success', 'Support Service deleted');
          loadSupportService();
      } catch (e) {
          showNotification('error', 'Failed to delete support service');
      }
  };

  async function loadClinic(){
    try{
      const res = await api.clinic.info();
      let list = listFrom(res);
      
      // Render immediately with basic info
      state.clinic = list;
      renderClinicTable(state.clinic);

      // Fetch full details for each clinic to get images
      if(list.length > 0 && api.clinic && api.clinic.get){
          const detailedList = await Promise.all(list.map(async (item) => {
              const id = clinicIdOf(item);
              if(!id) return item;
              try {
                  const full = await api.clinic.get(id);
                  // Unpack if wrapped in data or result
                  const realData = (full && typeof full === 'object' && full.data) ? full.data : full;
                  
                  // Defensive: ensure realData is an object
                  if(realData && typeof realData === 'object'){
                      // Log for debugging (will appear in browser console)
                      if(id == 42) console.log('Clinic 42 Details:', realData); 
                      return { ...item, ...realData };
                  }
                  return item;
              } catch(e) {
                  console.warn('Failed to fetch details for clinic', id, e);
                  return item;
              }
          }));
          state.clinic = detailedList;
          renderClinicTable(state.clinic);
      }
    }catch(err){ console.warn('Clinic load', err); state.clinic = []; renderClinicTable([]); }
  }

  function clinicIdOf(c){
    return c.id ?? c.clinicId ?? c._id ?? '';
  }
  function renderClinicTable(list){
    const tbody = document.getElementById('clincinfo-tbody');
    if(!tbody) return;
    if(!list || !list.length){
      tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:2rem;">No clinic info</td></tr>';
      return;
    }
    tbody.innerHTML = list.map((c)=>{
      const id = clinicIdOf(c);
      const idArg = typeof id === 'string' ? `'${String(id).replace(/'/g,"\\'")}'` : (id||'');
      const name = c.clinicName || c.clinicNameAr || c.name || c.serviceProviderName || '';
      const address = c.address || c.clinicAddress || c.specialty || '';
      const phone = c.phone || c.phoneNumber || '';
      const email = c.email || c.emailAddress || '';
      let imgUrl = c.profilePhoto || c.imageUrl || c.image || c.logo || c.photo || c.url || c.path || c.fileName || c.uri || '';
      
      // Deep check if merge failed
      if(!imgUrl && c.data && typeof c.data === 'object'){
           const d = c.data;
           imgUrl = d.profilePhoto || d.imageUrl || d.image || d.logo || d.photo || d.url || d.path || d.fileName || d.uri || '';
      }

      const imgTag = imgUrl ? `<img src="${rewriteUploadsHost(imgUrl)}" style="width:40px;height:40px;object-fit:cover;border-radius:4px;margin-right:12px;border:1px solid #eee;" onerror="this.style.display='none'">` : '<div style="width:40px;height:40px;background:#f3f4f6;border-radius:4px;margin-right:12px;display:flex;align-items:center;justify-content:center;color:#9ca3af;font-size:20px;">🏥</div>';
      return `<tr>
        <td>${id}</td>
        <td><div style="display:flex;align-items:center;">${imgTag}<div>${name}</div></div></td>
        <td>${address}</td>
        <td>${phone}</td>
        <td>${email}</td>
        <td style="white-space:nowrap">
          <button class="btn btn-outline btn-sm" onclick="viewClinic(${idArg})">View</button>
          <button class="btn btn-outline btn-sm" onclick="editClinic(${idArg})">Edit</button>
          <button class="btn btn-outline btn-sm" onclick="deleteClinic(${idArg})" style="color:#EF4444">Delete</button>
        </td>
      </tr>`;
    }).join('');
  }

  function applyClinicFilters(){
    const q = (document.getElementById('clincinfo-search')?.value || '').toLowerCase();
    if(!q){
      renderClinicTable(state.clinic);
      return;
    }
    const list = state.clinic.filter(c => {
      const hay = [clinicIdOf(c), c.clinicName, c.name, c.serviceProviderName, c.address, c.phone, c.email]
        .map(x=> (x||'').toString().toLowerCase()).join(' | ');
      return hay.includes(q);
    });
    state.filteredClinic = list;
    renderClinicTable(list);
  }

  window.exportClincinfo = function(){
    if(window.ExportUtils && typeof window.ExportUtils.exportClinicInfo === 'function'){
      window.ExportUtils.exportClinicInfo(state.clinic, 'pdf');
    } else {
      showNotification('error','Export not available');
    }
  }

  window.viewClinic = function(id){
    (async ()=>{
      try{
        const c = state.clinic.find(x => String(clinicIdOf(x)) === String(id)) || null;
        if(api.clinic && api.clinic.get){
          try{
            const full = await api.clinic.get(id);
            window.openDataModal('Clinic ' + id, full);
            return;
          }catch(e){}
        }
        window.openDataModal('Clinic ' + id, c || { id });
      }catch(e){
        showNotification('error','Failed to load clinic info');
      }
    })();
  }
  
  window.viewAllClinicInfo = async function(){
      try{
          const data = await api.clinic.info();
          window.openDataModal('All Clinic Info', data);
      }catch(e){
          showNotification('error', 'Failed to load all data');
      }
  };

  window.updateClinicImagePreview = function(url){
      const img = document.getElementById('clincinfo-image-preview');
      if(img){
          if(url){
              img.src = url.startsWith('http') ? url : rewriteUploadsHost(url);
              img.style.display = 'block';
          } else {
              img.style.display = 'none';
          }
      }
      const delBtn = document.getElementById('clincinfo-image-delete-btn');
      if(delBtn){
        delBtn.style.display = url ? 'inline-flex' : 'none';
      }
  };

  async function deleteClinicImageRequest(id){
    if(!id) throw new Error('Missing clinic id');
    if(api.clinic && api.clinic.deleteImage){
      return api.clinic.deleteImage(id);
    }
    throw new Error('Delete image endpoint not available');
  }

  window.deleteClinicImageFromEdit = async function(){
    const id = document.getElementById('clincinfo-id')?.value;
    const clinicId = String(id || '').trim();
    if(!clinicId){
      const imgInput = document.getElementById('clincinfo-image');
      if(imgInput) imgInput.value = '';
      updateClinicImagePreview('');
      return;
    }
    if(!confirm('Delete clinic image?')) return;
    try{
      await deleteClinicImageRequest(clinicId);
      const imgInput = document.getElementById('clincinfo-image');
      if(imgInput) imgInput.value = '';
      updateClinicImagePreview('');
      showNotification('success','Clinic image deleted');
      try{ await loadClinic(); }catch(e){}
    }catch(err){
      showNotification('error', err?.message || 'Failed to delete clinic image');
    }
  }

  window.handleClinicImageUpload = async function(input){
      if(!input.files || !input.files[0]) return;
      const file = input.files[0];
      const id = document.getElementById('clincinfo-id').value;
      
      const btn = input.nextElementSibling;
      const originalText = btn ? btn.textContent : 'Upload';
      if(btn){
          btn.textContent = 'Uploading...';
          btn.disabled = true;
      }

      try{
          // Step 1: Upload Image to generic upload endpoint
          const uploadUrl = '/api/ImageUpload/upload';
          console.log('Step 1: Uploading file to', uploadUrl);
          
          const formData = new FormData();
          formData.append('file', file);
          
          const uploadResponse = await fetch(uploadUrl, {
              method: 'POST',
              body: formData
          });

          if(!uploadResponse.ok) {
               const text = await uploadResponse.text();
               throw new Error(`File upload failed: ${uploadResponse.status} ${text}`);
          }

          const uploadData = await uploadResponse.json();
          console.log('Step 1 Response:', uploadData);
          
          let imageUrl = uploadData.url || uploadData.imageUrl || uploadData.image || uploadData.filePath || uploadData.link || uploadData.uri || uploadData.path || uploadData.fileName || (typeof uploadData === 'string' ? uploadData : '');

          if(!imageUrl){
              throw new Error('Could not retrieve image URL from upload response');
          }

          // Step 2: Update Clinic Info with the new Image URL
          if(id){
              const updateUrl = '/api/ClinicInfo/update-ClincInfo-image';
              console.log('Step 2: Linking image to clinic:', updateUrl, 'ID:', id);
              
              const updatePayload = {
                  id: id,
                  clinicId: id,
                  clincInfoId: id,
                  clincId: id,
                  clinic_id: id,
                  imageUrl: imageUrl,
                  image: imageUrl,
                  url: imageUrl,
                  profilePhoto: imageUrl
              };

              const updateResponse = await fetch(updateUrl, {
                  method: 'POST',
                  headers: {
                      'Content-Type': 'application/json'
                  },
                  body: JSON.stringify(updatePayload)
              });
              
              if(!updateResponse.ok) {
                   // If 415 happens here, it implies even JSON is not accepted, but 415 on JSON is rare unless endpoint wants XML etc.
                   // If 400, maybe validation error.
                   const text = await updateResponse.text();
                   throw new Error(`Update clinic image failed: ${updateResponse.status} ${text}`);
              }
              
              // Try to parse response, but don't fail if it's empty
              try {
                  const updateData = await updateResponse.json();
                  console.log('Step 2 Response:', updateData);
              } catch(e) { /* ignore json parse error for update step */ }
          }

          // Success
          document.getElementById('clincinfo-image').value = imageUrl;
          updateClinicImagePreview(imageUrl);
          showNotification('success', 'Image uploaded and updated');

      }catch(err){
          console.error(err);
          showNotification('error', 'Error: ' + err.message);
      }finally{
          if(btn){
              btn.textContent = originalText;
              btn.disabled = false;
          }
          input.value = '';
      }
  };

  window.editClinic = function(id){
    (async ()=>{
      try{
        let c = state.clinic.find(x => String(clinicIdOf(x)) === String(id)) || {};
        if(api.clinic && api.clinic.get){
             try{ c = await api.clinic.get(id) || c; }catch(e){}
        }
        document.getElementById('clincinfo-id').value = (clinicIdOf(c) || id || '') + '';
        
        document.getElementById('clincinfo-name').value = c.clinicName || c.name || c.serviceProviderName || '';
        document.getElementById('clincinfo-address').value = c.address || c.clinicAddress || '';
        document.getElementById('clincinfo-phone').value = c.phone || c.phoneNumber || '';
        document.getElementById('clincinfo-email').value = c.email || c.emailAddress || '';
        
        // New fields
        const descEl = document.getElementById('clincinfo-description');
        if(descEl) descEl.value = c.description || c.desc || '';
        
        const webEl = document.getElementById('clincinfo-website');
        if(webEl) webEl.value = c.website || c.site || c.url || '';
        
        // Image
        const imgUrl = c.profilePhoto || c.imageUrl || c.image || c.logo || c.photo || '';
        const imgInput = document.getElementById('clincinfo-image');
        if(imgInput) imgInput.value = imgUrl;
        updateClinicImagePreview(imgUrl);

        // Dynamic fields
        const dynamicContainer = document.getElementById('clincinfo-dynamic-fields');
        if(dynamicContainer){
            dynamicContainer.innerHTML = '';
            const standardKeys = ['id', 'clinicId', '_id', 'clinicName', 'name', 'serviceProviderName', 'address', 'clinicAddress', 'phone', 'phoneNumber', 'email', 'emailAddress', 'description', 'desc', 'website', 'site', 'url', 'imageUrl', 'image', 'logo', 'photo', 'profilePhoto'];
            
            Object.entries(c).forEach(([key, value]) => {
                if(standardKeys.includes(key)) return;
                if(typeof value === 'object' && value !== null) return;
                
                const div = document.createElement('div');
                div.className = 'form-group';
                div.innerHTML = `
                    <label class="form-label" style="text-transform: capitalize;">${key.replace(/([A-Z])/g, ' $1')}</label>
                    <input type="text" name="dynamic_${key}" class="form-input" value="${value || ''}">
                `;
                dynamicContainer.appendChild(div);
            });
        }

        document.getElementById('clincinfo-modal-title').textContent = 'Edit Clinic Info';
        openModal('clincinfo-modal');
      }catch(e){ showNotification('error','Failed to load clinic info'); }
    })();
  }
  window.deleteClinic = function(id){
    if(!confirm('Delete clinic info ' + id + '?')) return;
    (async ()=>{
      try{
        if(api.clinic && api.clinic.delete){
          await api.clinic.delete(id);
          showNotification('success','Clinic info deleted');
          await loadClinic();
        } else showNotification('error','Delete endpoint not available');
      }catch(err){
        showNotification('error', err?.message || 'Failed to delete clinic info');
      }
    })();
  }

  async function renderCharts(){
    try{
      const [general, monthly, weekly, status] = await Promise.all([
        api.analytics.getGeneralStats(),
        api.analytics.getMonthlySales(),
        api.analytics.getWeeklyRevenue(),
        api.analytics.getCartOrdersStatus ? api.analytics.getCartOrdersStatus() : (api.analytics.getOrdersCountByStatus ? api.analytics.getOrdersCountByStatus() : api.orderStatus.getOrdersCountByStatus())
      ]);
      const totalProfit = num(general?.totalProfit);
      const totalOrders = num(general?.totalOrders);
      const totalCustomers = num(general?.totalCustomers);
      const averageOrdersPerMonth = num(general?.averageOrdersPerMonth);
      const revenueEl = document.getElementById('analytics-revenue');
      const ordersEl = document.getElementById('analytics-orders');
      const customersEl = document.getElementById('analytics-customers');
      const avgEl = document.getElementById('analytics-avg');
      if(revenueEl) revenueEl.textContent = 'JOD ' + totalProfit.toFixed(2);
      if(ordersEl) ordersEl.textContent = String(totalOrders);
      if(customersEl) customersEl.textContent = String(totalCustomers);
      if(avgEl) avgEl.textContent = String(averageOrdersPerMonth);
      if(document.getElementById('sales-trend-chart')){
        const m = parseSeries(monthly, 'monthly', []);
        const mLabels = m.labels || [];
        const mValues = m.values || [];
        const ctx = document.getElementById('sales-trend-chart').getContext('2d');
        const existing0 = Chart.getChart(ctx); if (existing0) existing0.destroy();
        new Chart(ctx, { type: 'line', data: { labels: mLabels, datasets:[{ label:'Sales', data: mValues, backgroundColor:'rgba(59,130,246,0.2)', borderColor:'#3b82f6' }] } });
      }
      if(document.getElementById('weekly-revenue-chart')){
        const w = parseSeries(weekly, 'weekly', []);
        const wLabels = w.labels || [];
        const wValues = w.values || [];
        const ctx = document.getElementById('weekly-revenue-chart').getContext('2d');
        const existing1 = Chart.getChart(ctx); if (existing1) existing1.destroy();
        new Chart(ctx, { type: 'bar', data: { labels: wLabels, datasets:[{ label:'Revenue', data: wValues, backgroundColor:'#60a5fa' }] } });
      }
      if(document.getElementById('orders-status-chart')){
        let sArr = [];
        if(status && !Array.isArray(status) && status.statusCounts && typeof status.statusCounts === 'object'){
          const merged = {};
          Object.entries(status.statusCounts).forEach(([k,v])=>{
            const key = String(k||'').trim().toLowerCase();
            if(!key) return;
            merged[key] = (merged[key]||0) + num(v);
          });
          sArr = Object.keys(merged).sort().map(k=> ({ status: k, count: merged[k] }));
        } else {
          sArr = listFrom(status);
        }
        const labels = sArr.map(s=> `${s.status} (${num(s.count)})`);
        const values = sArr.map(s=> num(s.count));
        const ctx = document.getElementById('orders-status-chart').getContext('2d');
        const existing2 = Chart.getChart(ctx); if (existing2) existing2.destroy();
        new Chart(ctx, { type: 'doughnut', data: { labels, datasets:[{ data: values, backgroundColor:['#34d399','#f59e0b','#60a5fa','#a78bfa','#f472b6','#22d3ee'] }] } });
      }
    }catch(err){ console.warn('Charts render error', err); }
  }

  document.addEventListener('DOMContentLoaded', function(){
    try {
      const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true';
      const token = window.api?.__internals?.getToken?.();
      
      if(isAuthenticated || token) {
        const userType = localStorage.getItem('userType');
        const isVendor = String(userType).toLowerCase() === 'vendor';
        
        if (isVendor) {
            showView('orders');
            loadOrdersData();
            loadStatuses();
        } else {
            showView('dashboard');
            loadOrdersData();
            loadDashboardData();
            loadCustomers();
            loadProducts();
            loadDelivery();
            loadDiscounts();
            loadClinic();
            loadStatuses();
        }
      } else {
        showView('signin');
      }
    } catch(err) {
      console.warn('Initialization error:', err);
      showView('dashboard');
    }
    const dashFilter = document.getElementById('dashboard-status-filter');
    if(dashFilter) dashFilter.addEventListener('change', ()=>{
      const v = dashFilter.value;
      const filtered = v ? state.orders.filter(o => (o.status||'').toLowerCase()===v.toLowerCase()) : state.orders.slice(0,5);
      renderOrders('dashboard-orders-tbody', filtered.slice(0,5));
    });
    const ordersStatusSel = document.getElementById('orders-status-filter');
    const ordersFrom = document.getElementById('orders-from-date');
    const ordersTo = document.getElementById('orders-to-date');
    const ordersSearch = document.getElementById('orders-search');
    if(ordersStatusSel) ordersStatusSel.addEventListener('change', ()=> applyOrderFilters());
    if(ordersFrom) ordersFrom.addEventListener('change', ()=> loadOrdersData());
    if(ordersTo) ordersTo.addEventListener('change', ()=> loadOrdersData());
    if(ordersSearch) ordersSearch.addEventListener('input', ()=> applyOrderFilters());
    const prodCat = document.getElementById('products-category-filter');
    const prodSearch = document.getElementById('products-search');
    if(prodCat) prodCat.addEventListener('change', ()=> applyProductFilters());
    if(prodSearch) prodSearch.addEventListener('input', ()=> applyProductFilters());
    const prodTestCat = document.getElementById('product-test-category-filter');
    const prodTestSearch = document.getElementById('product-test-search');
    if(prodTestCat) prodTestCat.addEventListener('change', ()=> applyProductTestFilters());
    if(prodTestSearch) prodTestSearch.addEventListener('input', ()=> applyProductTestFilters());

    const customersFrom = document.getElementById('customers-from-date');
    const customersTo = document.getElementById('customers-to-date');
    const customersSearch = document.getElementById('customers-search');
    if(customersFrom) customersFrom.addEventListener('change', ()=> applyCustomerFilters());
    if(customersTo) customersTo.addEventListener('change', ()=> applyCustomerFilters());
    if(customersSearch) customersSearch.addEventListener('input', ()=> applyCustomerFilters());

    const delFrom = document.getElementById('delivery-from-date');
    const delTo = document.getElementById('delivery-to-date');
    const delStatus = document.getElementById('delivery-status-filter');
    const delSearch = document.getElementById('delivery-search');
    if(delFrom) delFrom.addEventListener('change', ()=> applyDeliveryFilters());
    if(delTo) delTo.addEventListener('change', ()=> applyDeliveryFilters());
    if(delStatus) delStatus.addEventListener('change', ()=> applyDeliveryFilters());
    if(delSearch) delSearch.addEventListener('input', ()=> applyDeliveryFilters());

    const discountSearch = document.getElementById('discount-search');
    if(discountSearch) discountSearch.addEventListener('input', ()=> applyDiscountFilters());

    const clinicSearch = document.getElementById('clincinfo-search');
    if(clinicSearch) clinicSearch.addEventListener('input', ()=> applyClinicFilters());

    const expiryEl = document.getElementById('discount-expiry');
    if(expiryEl){
      const today = new Date();
      const yyyy = today.getFullYear();
      const mm = String(today.getMonth()+1).padStart(2,'0');
      const dd = String(today.getDate()).padStart(2,'0');
      const min = `${yyyy}-${mm}-${dd}`;
      expiryEl.min = min;
    }

    loadSettingsFromStorage();
    const settingsForm = document.getElementById('settings-form');
    if(settingsForm){
      settingsForm.addEventListener('submit', (e)=>{
        e.preventDefault();
        saveSettingsToStorage();
        showNotification('success', 'Settings saved');
      });
    }
    const notifyEmail = document.getElementById('settings-notify-email');
    if(notifyEmail) notifyEmail.addEventListener('change', ()=> saveSettingsToStorage());
    const twoFa = document.getElementById('settings-2fa');
    if(twoFa) twoFa.addEventListener('change', ()=> saveSettingsToStorage());

    const orderForm = document.getElementById('order-form');
    if(orderForm) orderForm.addEventListener('submit', async (e)=>{
      e.preventDefault();
      const orderId = document.getElementById('order-id').value;
      // Fetch original order to get cartDto and other required fields
      const originalOrder = (state.orders||[]).find(o => String(o.id) === String(orderId)) || {};

      const orderData = {
        customerName: document.getElementById('order-customer').value,
        customer: document.getElementById('order-customer').value,
        amount: parseFloat(document.getElementById('order-amount').value),
        total: parseFloat(document.getElementById('order-amount').value),
        totalPrice: parseFloat(document.getElementById('order-amount').value),
        status: document.getElementById('order-status').value,
        orderStatus: document.getElementById('order-status').value,
        state: document.getElementById('order-status').value,
        date: document.getElementById('order-date').value,
        orderDate: document.getElementById('order-date').value,
        createdAt: document.getElementById('order-date').value
      };
      const vendorStatus = document.getElementById('order-vendor-status')?.value;
      const userType = localStorage.getItem('userType');
      const isVendor = String(userType).toLowerCase() === 'vendor';

      try{
        if(orderId) {
            const vendorStatus = document.getElementById('order-vendor-status').value;
            let currentStatus = document.getElementById('order-status').value;

            if(isVendor){
                 // Conditional Validation
                 if (!currentStatus && !vendorStatus) {
                     showNotification('error', 'Vendor Status is required');
                     return;
                 }

                 // Fallback to original status if empty
                 if (!currentStatus) {
                     currentStatus = originalOrder.status || originalOrder.orderStatus || 'pending';
                 }

                 const body = {
                     id: Number(orderId),
                     orderId: Number(orderId),
                     vendorStatus: vendorStatus,
                     userStatus: currentStatus,
                     cartDto: originalOrder.cartDto || originalOrder
                 };
                 await api.cart.updateStatus(body);
                 
                 // Send notification based on vendor status
                 await checkAndSendNotification(orderId, vendorStatus, originalOrder);
                 
            } else {
                 let status = document.getElementById('order-status').value;
                 
                 // Conditional Validation: Status is required unless Vendor Status is being updated
                 if (!status && !vendorStatus) {
                     showNotification('error', 'Status is required');
                     return;
                 }
                 
                 // If status is empty (bypassed), use original status
                 if (!status) {
                     status = originalOrder.status || originalOrder.orderStatus || 'pending';
                     orderData.status = status; // Update orderData for local state sync
                 }

                 const body = {
                     ...originalOrder,
                     ...orderData,
                     userStatus: status,
                     vendorStatus: vendorStatus || orderData.vendorStatus || status,
                     status: status,
                     cartDto: originalOrder.cartDto || originalOrder.cart || {}
                 };
                 // Ensure amount is number
                 if(body.amount) body.amount = Number(body.amount);
                 if(body.totalPrice) body.totalPrice = Number(body.totalPrice);
                 
                 await api.cart.update(orderId, body);
                 
                 // If vendor status was changed by admin, also update it
                 if(vendorStatus){
                     try{
                         await api.cart.updateStatus({
                             id: Number(orderId),
                             orderId: Number(orderId),
                             vendorStatus: vendorStatus,
                             userStatus: status,
                             cartDto: originalOrder.cartDto || originalOrder
                         });
                     } catch(ignore){}
                 }
                 
                 // Send notification based on status or vendor status
                 await checkAndSendNotification(orderId, vendorStatus || status, originalOrder);
            }
            
            // Manually update local state to ensure immediate UI feedback
            const localOrder = state.orders.find(o => String(o.orderId||o.id||o.cartCode||o.code||'') === String(orderId));
            if(localOrder){
                if(!isVendor) {
                    if(orderData.status) {
                        localOrder.status = orderData.status;
                        localOrder.orderStatus = orderData.status;
                        localOrder.state = orderData.status;
                    }
                    if(orderData.amount !== undefined && orderData.amount !== null && !isNaN(orderData.amount)) {
                        localOrder.totalPrice = orderData.amount;
                        localOrder.total = orderData.amount;
                        localOrder.amount = orderData.amount;
                    }
                }
                if(vendorStatus) localOrder.vendorStatus = vendorStatus;
                
                renderOrders('orders-tbody', state.orders);
            }
        }
        else await api.cart.create(orderData);
        
        showNotification('success', orderId ? 'Order updated' : 'Order created');
        closeModal('order-modal');
        orderForm.reset();
        document.getElementById('order-id').value = '';
        
        setTimeout(() => {
            loadOrdersData();
            loadDashboardData();
        }, 2000);
      }catch(err){
        showNotification('error', err?.message || 'Failed to save order');
      }
    });

    const customerForm = document.getElementById('customer-form');
    if(customerForm) customerForm.addEventListener('submit', async (e)=>{
      e.preventDefault();
      const customerId = document.getElementById('customer-id').value;
      const customerData = {
        name: document.getElementById('customer-name').value,
        userName: document.getElementById('customer-name').value,
        fullName: document.getElementById('customer-name').value,
        email: document.getElementById('customer-email').value,
        emailAddress: document.getElementById('customer-email').value,
        phone: document.getElementById('customer-phone').value,
        phoneNumber: document.getElementById('customer-phone').value,
        joined: document.getElementById('customer-joined').value,
        createdAt: document.getElementById('customer-joined').value,
        registeredAt: document.getElementById('customer-joined').value
      };
      try{
        if(customerId) {
            await api.users.update(customerId, customerData);
            
            const local = state.customers.find(c => String(c.id||c.userId||c.user_id||c._id) === String(customerId));
            if(local){
                Object.assign(local, customerData);
                renderCustomersTable(state.customers);
            }
        }
        else await api.users.create(customerData);
        
        showNotification('success', customerId ? 'Customer updated' : 'Customer created');
        closeModal('customer-modal');
        customerForm.reset();
        document.getElementById('customer-id').value = '';
        await loadCustomers();
      }catch(err){
        showNotification('error', err?.message || 'Failed to save customer');
      }
    });

    const productForm = document.getElementById('product-form');
    if(productForm) productForm.addEventListener('submit', async (e)=>{
      e.preventDefault();
      const productId = document.getElementById('product-id').value;
      const stockSelect = document.getElementById('product-stock-status');
      const stockStatus = stockSelect ? stockSelect.value : 'true';
      const stockBase = stockSelect ? parseInt(stockSelect.dataset.stockValue, 10) : NaN;
      const stockVal = stockStatus === 'false' ? 0 : (isNaN(stockBase) ? 10 : stockBase);
      const imageValue = document.getElementById('product-image').value;
      const imageNormalized = uploadsPathFromUrl(imageValue) || normalizeUrl(imageValue);
      // User specifically wants absolute URLs (including host) in the API payload
      const imageResolved = imageNormalized ? absoluteUploadsUrl(imageNormalized) : '';
      
      const catValues = getMultiSelectValues(document.getElementById('product-category'));
      if(catValues.length === 0){
        showNotification('error','Please select at least one category');
        return;
      }
      const catEnList = catValues.join(', ');
      const catMatches = catValues.map(val=> (state.categories||[]).find(c => (c.categoryEN||c.nameEN||c.en||c.name) == val)).filter(Boolean);
      const catArList = catMatches.map(catObj => (catObj.categoryAr||catObj.nameAr||catObj.ar||'')).filter(Boolean);
      const catArJoined = catArList.join(', ');
      const catEnPrimary = catValues[0] || '';
      const catArPrimary = catArList[0] || '';
      const catIdPrimary = catMatches[0] ? (catMatches[0].categoryId || catMatches[0].id || catMatches[0].catId || catMatches[0].code) : '';

      const skinValues = getMultiSelectValues(document.getElementById('product-skin-type'));
      const skinEnList = skinValues.join(', ');
      const skinArList = skinValues.map(val=>{
        const skinObj = (state.skinTypes||[]).find(s => (s.categoryEN||s.nameEN||s.en||s.name) == val);
        return skinObj ? (skinObj.categoryAr||skinObj.nameAr||skinObj.ar||'') : '';
      }).filter(Boolean);
      const skinArJoined = skinArList.join(', ');
      const skinEnPrimary = skinValues[0] || '';
      const skinArPrimary = skinArList[0] || '';
      
      const genderValues = getMultiSelectValues(document.getElementById('product-gender'));
      const genderEnList = genderValues.join(', ');
      const genderPrimary = genderValues[0] || '';
      
      const drugStoreValues = getMultiSelectValues(document.getElementById('product-drugstore'));
      const drugStoreEnList = drugStoreValues.join(', ');
      const drugStorePrimary = drugStoreValues[0] || '';

      const priceRaw = document.getElementById('product-price').value;
      const offerRaw = document.getElementById('product-offer-price').value;
      const barcodeValue = document.getElementById('product-barcode').value || Date.now().toString();
      const pregVal = document.getElementById('product-pregnancy-lactation').value || "";
      const pregApiVal = pregVal; // Send "Yes" or "No" directly as requested

      const productData = {
        productNameEN: document.getElementById('product-name').value,
        productNameAr: document.getElementById('product-name-ar').value,
        productNameAR: document.getElementById('product-name-ar').value,
        description: document.getElementById('product-description').value,
        descriptionAr: document.getElementById('product-description-ar').value,
        descriptionAR: document.getElementById('product-description-ar').value,
        price: (priceRaw || "0").toString(),
        stock: stockVal,
        outofstock: (stockVal <= 0) ? "true" : "false",
        
        categoryEN: catEnList, 
        categoryAr: catArJoined,
        categoryEn: catEnList,
        categoryENS: catEnList,
        
        linkOfPic: "",
        imageUrl: imageResolved || "",
        photos: imageResolved || "",
        barcode: barcodeValue,
        barCode: barcodeValue,
        Barcode: barcodeValue,
        barcodeAR: barcodeValue,
        productBarcode: barcodeValue,
        
        brandName: document.getElementById('product-brand-name').value || "",
        BrandName: document.getElementById('product-brand-name').value || "",
        brandNameAR: document.getElementById('product-brand-name').value || "",
        brandCountryofOrigin: document.getElementById('product-brand-country').value || "",
        BrandCountryofOrigin: document.getElementById('product-brand-country').value || "",
        brandCountryofOriginCopy: document.getElementById('product-brand-country').value || "",
        brandCountryofOriginAr: document.getElementById('product-brand-country').value || "",
        
        genderSuitabilityEn: genderEnList || "",
        genderSuitabilityEN: genderEnList || "",
        genderSuitabilityAr: document.getElementById('product-gender-ar').value || "",
        
        skinTypeEN: skinEnList,
        skinTypeEn: skinEnList,
        skinTypeENS: skinEnList,
        skinTypeAr: skinArJoined,
        
        productType: getMultiSelectValues(document.getElementById('product-type')).join(', ') || "",
        ProductType: getMultiSelectValues(document.getElementById('product-type')).join(', ') || "",
        drugStore: drugStoreEnList,
        drugStores: drugStoreEnList,
        
        pregnancyLactation: pregApiVal,
        pregnancyLactationYN: pregApiVal,
        pregnancyLactationEn: pregApiVal,
        time: getMultiSelectValues(document.getElementById('product-time-select')).join(', ') || "AM",
        Time: getMultiSelectValues(document.getElementById('product-time-select')).join(', ') || "AM",
        
        dosageFormEN: document.getElementById('product-dosage').value || "",
        dosageFormEn: document.getElementById('product-dosage').value || "",
        dosageFormAR: document.getElementById('product-dosage-ar').value || "",
        dosageFormAr: document.getElementById('product-dosage-ar').value || "",
        
        sizeEN: document.getElementById('product-size').value || "",
        SizeEN: document.getElementById('product-size').value || "",
        sizeEn: document.getElementById('product-size').value || "",
        sizemLmAR: document.getElementById('product-size').value || "",
        
        howToUseEN: document.getElementById('product-how-to-use').value || "",
        howToUseEn: document.getElementById('product-how-to-use').value || "",
        howToUseAR: document.getElementById('product-how-to-use-ar').value || "",
        howToUseAr: document.getElementById('product-how-to-use-ar').value || "",
        
        keyActiveIngredient: document.getElementById('product-active-ingredient').value || "",
        keyActiveIngredientAR: document.getElementById('product-active-ingredient-ar').value || "",
        keyActiveIngredientAr: document.getElementById('product-active-ingredient-ar').value || "",
        
        freeFromEN: document.getElementById('product-free-from').value || "",
        freeFromEn: document.getElementById('product-free-from').value || "",
        freeFromAr: document.getElementById('product-free-from-ar').value || "",
        
        inci: document.getElementById('product-inci').value || "",
        INCI: document.getElementById('product-inci').value || "",
        isOffer: document.getElementById('product-is-offer').checked,
        priceOffer: (offerRaw || "0").toString(),
        priceRange: document.getElementById('product-price-range').value || "",
        pregnancyLactationAr: pregApiVal,
        brandNameAR: document.getElementById('product-brand-name').value || "",
        brandCountryofOriginAr: document.getElementById('product-brand-country').value || "",
        totalAllergens: "",
        percentageBeforeOffer: document.getElementById('product-percentage-before-offer').value || "0"
      };
      const baseProductData = {
        ...productData,
        categoryId: catIdPrimary || 0
      };

      // Final cleanup to ensure no undefined values are sent
      Object.keys(baseProductData).forEach(key => {
        if (baseProductData[key] === undefined) {
          baseProductData[key] = null;
        }
      });

      console.log('Sending product data:', baseProductData);

      try{
        let result;
        if(productId) {
            await api.products.update(productId, baseProductData);
            result = { id: productId };

            const local = state.products.find(p => String(p.id||p.productId||p._id) === String(productId));
            if(local){
                Object.assign(local, baseProductData);
                renderProductsTable(state.products);
            }
        }
        else {
            try{
              // Send the full baseProductData instead of the minimal one
              result = await api.products.create(baseProductData);
            }catch(err){
              const payload = err?.payload;
              let msg = payload?.message || payload?.title || err?.message || 'Failed to create product';
              const errorsObj = payload?.errors || payload?.Errors;
              if(errorsObj){
                const details = Object.values(errorsObj).flat().filter(Boolean).join('\n');
                if(details) msg = details;
              }
              showNotification('error', msg);
              console.error('Product create failed', payload || err);
              throw err;
            }
        }

        // If creation/update successful and we have an image, try to ensure it's linked using the specific endpoint
        // This is especially important if the main create/update endpoint doesn't handle images well
        if(imageResolved && (result.id || result.productId || productId)){
             const targetId = result.id || result.productId || productId;
             const updateUrl = '/api/Product/update-product-image';
             const token = localStorage.getItem('authToken');
             const headers = { 'Content-Type': 'application/json' };
             if(token) headers['Authorization'] = 'Bearer ' + token;
             
             try {
                 await fetch(updateUrl, {
                    method: 'POST',
                    headers: headers,
                    body: JSON.stringify({
                        productId: parseInt(targetId),
                        photos: imageResolved,
                        imageUrl: imageResolved,
                        linkOfPic: ""
                    })
                 });
             } catch(imgErr){
                 console.warn('Image update failed', imgErr);
                 // Don't fail the whole operation if just image update fails, but warn user
             }
        }
        
        showNotification('success', productId ? 'Product updated' : 'Product created');
        closeModal('product-modal');
        productForm.reset();
        document.getElementById('product-id').value = '';
        await loadProducts();
      }catch(err){
        console.error('Product save error detail:', err);
        showNotification('error', err?.message || 'Failed to save product');
      }
    });

    const productTestForm = document.getElementById('product-test-form');
    if(productTestForm) productTestForm.addEventListener('submit', async (e)=>{
      e.preventDefault();
      const productId = document.getElementById('product-test-id').value;
      const stockSelect = document.getElementById('product-test-stock-status');
      const stockStatus = stockSelect ? stockSelect.value : 'true';
      const stockBase = stockSelect ? parseInt(stockSelect.dataset.stockValue, 10) : NaN;
      const stockVal = stockStatus === 'false' ? 0 : (isNaN(stockBase) ? 10 : stockBase);
      const imageValue = document.getElementById('product-test-image').value;
      const imageNormalized = uploadsPathFromUrl(imageValue) || normalizeUrl(imageValue);
      const imageResolved = imageNormalized ? absoluteUploadsUrl(imageNormalized) : '';
      
      const catValues = getMultiSelectValues(document.getElementById('product-test-category'));
      if(catValues.length === 0){
        showNotification('error','Please select at least one category');
        return;
      }
      const catEnList = catValues.join(', ');
      const catMatches = catValues.map(val=> (state.categories||[]).find(c => (c.categoryEN||c.nameEN||c.en||c.name) == val)).filter(Boolean);
      const catArList = catMatches.map(catObj => (catObj.categoryAr||catObj.nameAr||catObj.ar||'')).filter(Boolean);
      const catArJoined = catArList.join(', ');
      const catIdPrimary = catMatches[0] ? (catMatches[0].categoryId || catMatches[0].id || catMatches[0].catId || catMatches[0].code) : '';

      const skinValues = getMultiSelectValues(document.getElementById('product-test-skin-type'));
      const skinEnList = skinValues.join(', ');
      const skinArList = skinValues.map(val=>{
        const skinObj = (state.skinTypes||[]).find(s => (s.categoryEN||s.nameEN||s.en||s.name) == val);
        return skinObj ? (skinObj.categoryAr||skinObj.nameAr||skinObj.ar||'') : '';
      }).filter(Boolean);
      const skinArJoined = skinArList.join(', ');
      
      const genderValues = getMultiSelectValues(document.getElementById('product-test-gender'));
      const genderEnList = genderValues.join(', ');
      
      const drugStoreValues = getMultiSelectValues(document.getElementById('product-test-drugstore'));
      const drugStoreEnList = drugStoreValues.join(', ');

      const priceRaw = document.getElementById('product-test-price').value;
      const offerRaw = document.getElementById('product-test-offer-price').value;
      const barcodeValue = document.getElementById('product-test-barcode').value || Date.now().toString();
      const pregVal = document.getElementById('product-test-pregnancy-lactation').value || "";
      const pregApiVal = pregVal;

      const productData = {
        productNameEN: document.getElementById('product-test-name').value,
        productNameAr: document.getElementById('product-test-name-ar').value,
        productNameAR: document.getElementById('product-test-name-ar').value,
        description: document.getElementById('product-test-description').value,
        descriptionAr: document.getElementById('product-test-description-ar').value,
        descriptionAR: document.getElementById('product-test-description-ar').value,
        price: (priceRaw || "0").toString(),
        stock: stockVal,
        outofstock: (stockVal <= 0) ? "true" : "false",
        
        categoryEN: catEnList, 
        categoryAr: catArJoined,
        categoryEn: catEnList,
        categoryENS: catEnList,
        
        linkOfPic: "",
        imageUrl: imageResolved || "",
        photos: imageResolved || "",
        barcode: barcodeValue,
        barCode: barcodeValue,
        Barcode: barcodeValue,
        barcodeAR: barcodeValue,
        productBarcode: barcodeValue,
        
        brandName: document.getElementById('product-test-brand-name').value || "",
        BrandName: document.getElementById('product-test-brand-name').value || "",
        brandNameAR: document.getElementById('product-test-brand-name').value || "",
        brandCountryofOrigin: document.getElementById('product-test-brand-country').value || "",
        BrandCountryofOrigin: document.getElementById('product-test-brand-country').value || "",
        brandCountryofOriginCopy: document.getElementById('product-test-brand-country').value || "",
        brandCountryofOriginAr: document.getElementById('product-test-brand-country').value || "",
        
        genderSuitabilityEn: genderEnList || "",
        genderSuitabilityEN: genderEnList || "",
        genderSuitabilityAr: document.getElementById('product-test-gender-ar').value || "",
        
        skinTypeEN: skinEnList,
        skinTypeEn: skinEnList,
        skinTypeENS: skinEnList,
        skinTypeAr: skinArJoined,
        
        productType: getMultiSelectValues(document.getElementById('product-test-type')).join(', ') || "",
        ProductType: getMultiSelectValues(document.getElementById('product-test-type')).join(', ') || "",
        drugStore: drugStoreEnList,
        drugStores: drugStoreEnList,
        
        pregnancyLactation: pregApiVal,
        pregnancyLactationYN: pregApiVal,
        pregnancyLactationEn: pregApiVal,
        time: getMultiSelectValues(document.getElementById('product-test-time')).join(', ') || "AM",
        Time: getMultiSelectValues(document.getElementById('product-test-time')).join(', ') || "AM",
        
        dosageFormEN: document.getElementById('product-test-dosage').value || "",
        dosageFormEn: document.getElementById('product-test-dosage').value || "",
        dosageFormAR: document.getElementById('product-test-dosage-ar').value || "",
        dosageFormAr: document.getElementById('product-test-dosage-ar').value || "",
        
        sizeEN: document.getElementById('product-test-size').value || "",
        SizeEN: document.getElementById('product-test-size').value || "",
        sizeEn: document.getElementById('product-test-size').value || "",
        sizemLmAR: document.getElementById('product-test-size').value || "",
        
        howToUseEN: document.getElementById('product-test-how-to-use').value || "",
        howToUseEn: document.getElementById('product-test-how-to-use').value || "",
        howToUseAR: document.getElementById('product-test-how-to-use-ar').value || "",
        howToUseAr: document.getElementById('product-test-how-to-use-ar').value || "",
        
        keyActiveIngredient: document.getElementById('product-test-active-ingredient').value || "",
        keyActiveIngredientAR: document.getElementById('product-test-active-ingredient-ar').value || "",
        keyActiveIngredientAr: document.getElementById('product-test-active-ingredient-ar').value || "",
        
        freeFromEN: document.getElementById('product-test-free-from').value || "",
        freeFromEn: document.getElementById('product-test-free-from').value || "",
        freeFromAr: document.getElementById('product-test-free-from-ar').value || "",
        
        inci: document.getElementById('product-test-inci').value || "",
        INCI: document.getElementById('product-test-inci').value || "",
        isOffer: document.getElementById('product-test-is-offer').checked,
        priceOffer: (offerRaw || "0").toString(),
        priceRange: document.getElementById('product-test-price-range').value || "",
        pregnancyLactationAr: pregApiVal,
        brandNameAR: document.getElementById('product-test-brand-name').value || "",
        brandCountryofOriginAr: document.getElementById('product-test-brand-country').value || "",
        totalAllergens: "",
        percentageBeforeOffer: document.getElementById('product-test-percentage-before-offer').value || "0"
      };
      const baseProductData = {
        ...productData,
        categoryId: catIdPrimary || 0
      };

      Object.keys(baseProductData).forEach(key => {
        if (baseProductData[key] === undefined) {
          baseProductData[key] = null;
        }
      });

      console.log('Sending product test data:', baseProductData);

      try{
        let result;
        if(productId) {
            await api.productTest.update(productId, baseProductData);
            result = { id: productId };

            const local = state.productTestProducts.find(p => String(p.id||p.productId||p._id) === String(productId));
            if(local){
                Object.assign(local, baseProductData);
                renderProductTestTable(state.productTestProducts);
            }
        }
        else {
            try{
              result = await api.productTest.create(baseProductData);
            }catch(err){
              const payload = err?.payload;
              let msg = payload?.message || payload?.title || err?.message || 'Failed to create product';
              const errorsObj = payload?.errors || payload?.Errors;
              if(errorsObj){
                const details = Object.values(errorsObj).flat().filter(Boolean).join('\n');
                if(details) msg = details;
              }
              showNotification('error', msg);
              console.error('Product create failed', payload || err);
              throw err;
            }
        }

        if(imageResolved && (result.id || result.productId || productId)){
             const targetId = result.id || result.productId || productId;
             const updateUrl = '/api/Product/update-product-image';
             const token = localStorage.getItem('authToken');
             const headers = { 'Content-Type': 'application/json' };
             if(token) headers['Authorization'] = 'Bearer ' + token;
             
             try {
                 await fetch(updateUrl, {
                    method: 'POST',
                    headers: headers,
                    body: JSON.stringify({
                        productId: parseInt(targetId),
                        photos: imageResolved,
                        imageUrl: imageResolved,
                        linkOfPic: ""
                    })
                 });
             } catch(imgErr){
                 console.warn('Image update failed', imgErr);
             }
        }
        
        showNotification('success', productId ? 'Product updated' : 'Product created');
        closeModal('product-test-modal');
        productTestForm.reset();
        document.getElementById('product-test-id').value = '';
        await loadProductTest();
      }catch(err){
        console.error('Product save error detail:', err);
        showNotification('error', err?.message || 'Failed to save product');
      }
    });

    const categoryForm = document.getElementById('category-form');
    if(categoryForm) categoryForm.addEventListener('submit', async (e)=>{
      e.preventDefault();
      const categoryId = document.getElementById('category-id').value;
      const categoryData = {
        categoryEN: document.getElementById('category-name-en').value,
        categoryAr: document.getElementById('category-name-ar').value,
        description: document.getElementById('category-description').value,
        filterCategory: document.getElementById('category-filter-en').value,
        filterCategoryAr: document.getElementById('category-filter-ar').value,
        tradingNow: document.getElementById('category-trading-now').checked,
        
        // Handle images
        iconPhoto: document.getElementById('category-icon-photo').value || "",
        icons: document.getElementById('category-icon-photo').value || "",
        
        coverPhoto: document.getElementById('category-cover-photo').value || "",
        image: document.getElementById('category-cover-photo').value || ""
      };
      try{
        if(categoryId) {
            await api.categories.update(categoryId, categoryData);
            
            const local = state.categories.find(c => String(c.id||c.categoryId) === String(categoryId));
            if(local){
                Object.assign(local, categoryData);
                renderCategoriesTable(state.categories);
            }
        }
        else await api.categories.create(categoryData);
        
        showNotification('success', categoryId ? 'Category updated' : 'Category created');
        closeModal('category-modal');
        categoryForm.reset();
        document.getElementById('category-id').value = '';
        await loadProducts();
      }catch(err){
        showNotification('error', err?.message || 'Failed to save category');
      }
    });

    const brandForm = document.getElementById('brand-form');
    if(brandForm) brandForm.addEventListener('submit', async (e)=>{
        e.preventDefault();
        const brandId = document.getElementById('brand-id').value;
        const logoUrl = document.getElementById('brand-logo').value;
        const coverUrl = document.getElementById('brand-cover').value;
        
        const drugStoreSelect = document.getElementById('brand-drugstore');
        const selectedDrugStores = getMultiSelectValues(drugStoreSelect);
        const drugStoreStr = selectedDrugStores.join(', ');

        const isOfferChecked = document.getElementById('brand-offer-avail').checked;

        const yearEst = parseInt(document.getElementById('brand-year').value, 10) || 0;

        let brandData = {
            id: brandId ? parseInt(brandId, 10) : 0,
            brandName: document.getElementById('brand-name').value,
            drugStore: drugStoreStr, // Primary field
            drugStores: drugStoreStr, // Aliases
            drugStores2: drugStoreStr,
            drugStoreLogo: logoUrl,
            drugStoreCover: coverUrl,
            countryOfOrigin: document.getElementById('brand-country').value,
            countryOfOriginAr: document.getElementById('brand-country-ar').value,
            offerAvailable: isOfferChecked ? "Yes" : "No",
            offerAvailableTrueOrFalse: isOfferChecked,
            offerPercentage: parseFloat(document.getElementById('brand-offer-pct').value) || 0,
            yearEstablished: yearEst,
            averageProductPrice: parseFloat(document.getElementById('brand-avg-price').value) || 0,
            website: document.getElementById('brand-website').value,
            deliveryTerms: document.getElementById('brand-delivery-terms').value,
            deliveryTerms2: document.getElementById('brand-delivery-terms-ar').value,
            ads: document.getElementById('brand-ads').value,
            // Defaults for other fields
            products: "",
            totalProducts: parseInt(document.getElementById('brand-total-products').value, 10) || 0,
            establishedYearsAgo: yearEst
        };

        try{
            if(brandId) {
                // Merge with existing data to prevent data loss
                const original = window.currentBrandData || {};
                brandData = { ...original, ...brandData };
                
                await api.brands.update(brandId, brandData);
                showNotification('success', 'Brand updated');
            } else {
                await api.brands.create(brandData);
                showNotification('success', 'Brand created');
            }
            closeModal('brand-modal');
            brandForm.reset();
            document.getElementById('brand-id').value = '';
            window.currentBrandData = null;
            loadBrands();
        }catch(err){
            showNotification('error', err?.message || 'Failed to save brand');
        }
    });

    const discountForm = document.getElementById('discount-form');
    if(discountForm) discountForm.addEventListener('submit', async (e)=>{
      e.preventDefault();
      const id = document.getElementById('discount-id').value;
      const activeRaw = document.getElementById('discount-active')?.value;
      const isActive = activeRaw === '' ? undefined : activeRaw === 'true';
      const expiryDateRaw = document.getElementById('discount-expiry').value;
      if(expiryDateRaw){
        const min = (document.getElementById('discount-expiry')?.min || '').trim();
        if(min && expiryDateRaw < min){
          showNotification('error', `Expiry date must be ${min} or later`);
          return;
        }
      }
      const expiryDate = expiryDateRaw ? `${expiryDateRaw}T00:00:00` : null;
      const code = document.getElementById('discount-code').value;
      const idNum = id ? parseInt(id, 10) : 0;
      const data = {
        id: idNum,
        code: code,
        discountPercentage: parseInt(document.getElementById('discount-percentage').value, 10),
        isActive: isActive,
        expiryDate: expiryDateRaw, // YYYY-MM-DD
        ExpiryDate: expiryDateRaw,
        expiry: expiryDateRaw,
        endDate: expiryDateRaw,
        expirationDate: expiryDateRaw,
        expireAt: expiryDateRaw,
        expiry_date: expiryDateRaw,
        // Also send with time part just in case
        expiryDateTime: expiryDate,
        expiry_datetime: expiryDate,
        // PascalCase just in case
        Code: code,
        DiscountPercentage: parseInt(document.getElementById('discount-percentage').value, 10),
        IsActive: isActive
      };
      try{
        if(id) {
            await api.discount.update(id, data);
            const local = state.discountCodes.find(d => String(discountIdOf(d)) === String(id));
            if(local){
                 // Clean up old variations to avoid stale data taking precedence in discountExpiryOf
                 delete local.ExpiryDate;
                 delete local.expiry;
                 delete local.endDate;
                 Object.assign(local, data);
                 renderDiscountTable(state.filteredDiscountCodes || state.discountCodes);
            }
        }
        else await api.discount.create(data);
        
        showNotification('success', id ? 'Discount updated' : 'Discount created');
        closeModal('discount-modal');
        discountForm.reset();
        document.getElementById('discount-id').value = '';
        await loadDiscounts();
      }catch(err){
        showNotification('error', err?.message || 'Failed to save discount');
      }
    });

    const clinicForm = document.getElementById('clincinfo-form');
    if(clinicForm) clinicForm.addEventListener('submit', async (e)=>{
      e.preventDefault();
      const clinicId = document.getElementById('clincinfo-id').value;
      const clinicData = {
        name: document.getElementById('clincinfo-name').value,
        clinicName: document.getElementById('clincinfo-name').value,
        address: document.getElementById('clincinfo-address').value,
        clinicAddress: document.getElementById('clincinfo-address').value,
        phone: document.getElementById('clincinfo-phone').value,
        phoneNumber: document.getElementById('clincinfo-phone').value,
        email: document.getElementById('clincinfo-email').value,
        emailAddress: document.getElementById('clincinfo-email').value,
        description: document.getElementById('clincinfo-description').value,
        website: document.getElementById('clincinfo-website').value,
        imageUrl: document.getElementById('clincinfo-image').value,
        image: document.getElementById('clincinfo-image').value,
        profilePhoto: document.getElementById('clincinfo-image').value
      };
      
      if(clinicId){
          clinicData.id = clinicId;
          clinicData.clinicId = clinicId;
          clinicData.clincInfoId = clinicId;
          clinicData.clincId = clinicId;
          clinicData.clinic_id = clinicId;
      }
      
      const dynamicInputs = document.querySelectorAll('#clincinfo-dynamic-fields input');
      dynamicInputs.forEach(input => {
          const key = input.name.replace('dynamic_', '');
          clinicData[key] = input.value;
      });

      try{
        if(clinicId) {
            await api.clinic.update(clinicId, clinicData);
            const local = state.clinic.find(c => String(c.id||c.clinicId) === String(clinicId));
            if(local){
                 Object.assign(local, clinicData);
                 renderClinicTable(state.clinic);
            }
        }
        else await api.clinic.create(clinicData);
        
        showNotification('success', clinicId ? 'Clinic info updated' : 'Clinic info created');
        closeModal('clincinfo-modal');
        clinicForm.reset();
        document.getElementById('clincinfo-id').value = '';
        await loadClinic();
      }catch(err){
        showNotification('error', err?.message || 'Failed to save clinic info');
      }
    });

    const deliveryForm = document.getElementById('delivery-form');
    if(deliveryForm) deliveryForm.addEventListener('submit', handleDeliverySubmit);

    // Initialize multi-selects for all dropdowns
    const multiSelects = [
      'product-category', 'product-gender', 'product-skin-type', 'product-drugstore', 
      'brand-drugstore', 'product-time', 'product-type', 'product-brand-name', 
      'product-test-category', 'product-test-gender', 'product-test-skin-type', 
      'product-test-drugstore', 'product-test-time', 'product-test-type', 
      'product-test-brand-name'
    ];
    multiSelects.forEach(id => {
      bindMultiSelect(id);
      updateMultiSelectDisplay(id);
    });
  });

  window.state = state;
  window.loadOrdersData = loadOrdersData;
  window.loadCustomers = loadCustomers;
  window.loadProducts = loadProducts;
  window.loadProductTest = loadProductTest;
  window.loadDelivery = loadDelivery;
  window.loadClinic = loadClinic;
  window.loadDiscounts = loadDiscounts;

  // ── Apply Discount by Brand ──────────────────────────────────────────────
  async function populateBrandSelect(selectId) {
    const sel = document.getElementById(selectId);
    if (!sel) return;
    sel.innerHTML = '<option value="">Loading brands...</option>';
    try {
      // Always fetch fresh from the same API the brands page uses
      const res = await api.brands.list();
      const brands = listFrom(res);
      // Also update state so it's available for other uses
      if (brands.length) state.brands = brands;
      sel.innerHTML = '<option value="">Select a brand</option>' +
        brands.map(b => {
          const name = b.brandName || b.name || b.title || '';
          return `<option value="${name}">${name}</option>`;
        }).join('');
    } catch(err) {
      sel.innerHTML = '<option value="">Failed to load brands</option>';
      showNotification('error', 'Could not load brands');
    }
  }

  window.openApplyDiscountModal = async function(){
    openModal('apply-discount-modal');
    await populateBrandSelect('apply-discount-brand-name');
  };

  window.openClearDiscountModal = async function(){
    openModal('clear-discount-modal');
    await populateBrandSelect('clear-discount-brand-name');
  };

  // Form submit: Apply Discount
  const applyDiscountForm = document.getElementById('apply-discount-form');
  if(applyDiscountForm) applyDiscountForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const brandName = document.getElementById('apply-discount-brand-name').value;
    const percentage = parseFloat(document.getElementById('apply-discount-brand-percentage').value);
    if(!brandName){ showNotification('error', 'Please select a brand'); return; }
    if(isNaN(percentage) || percentage < 0 || percentage > 100){
      showNotification('error', 'Please enter a valid percentage (0–100)'); return;
    }
    try{
      await api.productDiscount.applyByBrand({ brandName, discountPercentage: percentage });
      showNotification('success', `Discount of ${percentage}% applied to brand "${brandName}"`);
      closeModal('apply-discount-modal');
      applyDiscountForm.reset();
    }catch(err){
      showNotification('error', err?.message || 'Failed to apply discount');
    }
  });

  // Form submit: Clear Discount
  const clearDiscountForm = document.getElementById('clear-discount-form');
  if(clearDiscountForm) clearDiscountForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const brandName = document.getElementById('clear-discount-brand-name').value;
    if(!brandName){ showNotification('error', 'Please select a brand'); return; }
    try{
      await api.productDiscount.clearByBrand({ brandName });
      showNotification('success', `Discount cleared for brand "${brandName}"`);
      closeModal('clear-discount-modal');
      clearDiscountForm.reset();
    }catch(err){
      showNotification('error', err?.message || 'Failed to clear discount');
    }
  });

  // ============================================================
  // Phase 5 admin dashboards — Security Audit + Performance
  // ============================================================

  function fmtTime(iso) {
    if (!iso) return '—';
    try { return new Date(iso).toISOString().replace('T', ' ').slice(0, 19); }
    catch { return String(iso); }
  }
  function esc(s) {
    if (s === undefined || s === null) return '';
    return String(s).replace(/[&<>"']/g, c => ({
      '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
    }[c]));
  }
  function setText(id, v) { const el = document.getElementById(id); if (el) el.textContent = v; }
  function clip(s, n) { s = String(s ?? ''); return s.length > n ? s.slice(0, n) + '…' : s; }

  async function loadSecurityAudit() {
    // Default placeholders
    setText('audit-stat-fails',   '…');
    setText('audit-stat-locks',   '…');
    setText('audit-stat-success', '…');
    setText('audit-stat-reuse',   '…');

    try {
      const [failedLogins, summary7d, adminActions] = await Promise.all([
        api.audit.failedLogins(1, 50).catch(e => { console.error('failedLogins', e); return []; }),
        api.audit.securityEventsSummary(7).catch(e => { console.error('summary', e); return { results: [] }; }),
        api.audit.adminActions({ page: 1, pageSize: 25 }).catch(e => { console.error('adminActions', e); return []; }),
      ]);

      // --- Stat cards ---
      // Failed logins last 24h — count rows we got (capped at limit=50)
      setText('audit-stat-fails', failedLogins.length);

      // Pull lockout / success / reuse counts out of the 7-day summary
      const rowsSum = (summary7d && summary7d.results) || [];
      const findCount = (type) => rowsSum
        .filter(r => r.eventType === type)
        .reduce((a, r) => a + (r.count || 0), 0);
      setText('audit-stat-locks',   findCount('login.locked'));
      setText('audit-stat-success', findCount('login.success'));
      setText('audit-stat-reuse',   findCount('refresh.reuse_detected'));

      // --- Failed-logins table ---
      const flBody = document.getElementById('audit-failed-logins-body');
      if (flBody) {
        if (!failedLogins.length) {
          flBody.innerHTML = '<tr><td colspan="5" style="color:var(--gray-500)">No failed logins in the last 24h.</td></tr>';
        } else {
          flBody.innerHTML = failedLogins.map(e => `
            <tr>
              <td>${esc(fmtTime(e.timestamp))}</td>
              <td>${e.userId == null ? '<em style="color:var(--gray-400)">none</em>' : esc(e.userId)}</td>
              <td>${esc(e.ipAddress || '')}</td>
              <td title="${esc(e.userAgent || '')}">${esc(clip(e.userAgent || '', 40))}</td>
              <td>${esc(e.detail || '')}</td>
            </tr>
          `).join('');
        }
      }

      // --- Summary table ---
      const sBody = document.getElementById('audit-summary-body');
      if (sBody) {
        if (!rowsSum.length) {
          sBody.innerHTML = '<tr><td colspan="3" style="color:var(--gray-500)">No security events in the last 7 days.</td></tr>';
        } else {
          sBody.innerHTML = rowsSum.map(r => `
            <tr>
              <td>${esc(r.eventType)}</td>
              <td>${esc(r.outcome)}</td>
              <td><strong>${esc(r.count)}</strong></td>
            </tr>
          `).join('');
        }
      }

      // --- Admin actions table ---
      const aaBody = document.getElementById('audit-admin-actions-body');
      if (aaBody) {
        if (!adminActions || !adminActions.length) {
          aaBody.innerHTML = '<tr><td colspan="6" style="color:var(--gray-500)">No admin actions captured yet. Make an admin write (create/update a brand, etc.) to see rows here.</td></tr>';
        } else {
          aaBody.innerHTML = adminActions.map(a => `
            <tr>
              <td>${esc(fmtTime(a.timestamp))}</td>
              <td>${esc(a.adminUserId)}</td>
              <td>${esc(a.action)}</td>
              <td>${esc(a.entityType)}</td>
              <td>${esc(a.entityId || '')}</td>
              <td>${esc(a.ipAddress || '')}</td>
            </tr>
          `).join('');
        }
      }

    } catch (err) {
      console.error('[SecurityAudit] load failed', err);
      showNotification && showNotification('error', 'Failed to load Security Audit: ' + (err.message || err));
    }
  }
  window.loadSecurityAudit = loadSecurityAudit;

  async function loadPerformance() {
    setText('hm-stat-requests', '…');
    setText('hm-stat-users',    '…');
    setText('hm-stat-avgms',    '…');
    setText('hm-stat-autherr',  '…');

    try {
      const [daily, topRoutes, slow, authErrors, active] = await Promise.all([
        api.heatmap.summaryDaily(7).catch(e => { console.error('daily', e); return { results: [] }; }),
        api.heatmap.topRoutes(7, 20).catch(e => { console.error('topRoutes', e); return { results: [] }; }),
        api.heatmap.slowestRoutes(7, 10, 20).catch(e => { console.error('slow', e); return { results: [] }; }),
        api.heatmap.authErrors(24).catch(e => { console.error('auth', e); return { results: [] }; }),
        api.heatmap.activeUsers(7, 50).catch(e => { console.error('active', e); return { results: [] }; }),
      ]);

      const dailyRows = (daily && daily.results) || [];
      // --- Stat cards ---
      const totalReq = dailyRows.reduce((a, r) => a + (r.requests || 0), 0);
      const totalUsers = dailyRows.reduce((a, r) => a + (r.unique || 0), 0);
      const avgMs = totalReq ? Math.round(
        dailyRows.reduce((a, r) => a + (r.avgMs || 0) * (r.requests || 0), 0) / totalReq
      ) : 0;
      setText('hm-stat-requests', totalReq.toLocaleString());
      setText('hm-stat-users',    totalUsers.toLocaleString());
      setText('hm-stat-avgms',    avgMs);

      const authErrRows = (authErrors && authErrors.results) || [];
      const totalAuthErr = authErrRows.reduce((a, r) => a + (r.count || 0), 0);
      setText('hm-stat-autherr', totalAuthErr.toLocaleString());

      // --- Daily table ---
      const dBody = document.getElementById('hm-daily-body');
      if (dBody) {
        if (!dailyRows.length) {
          dBody.innerHTML = '<tr><td colspan="4" style="color:var(--gray-500)">No traffic captured yet.</td></tr>';
        } else {
          dBody.innerHTML = dailyRows.map(r => `
            <tr>
              <td>${esc((r.day || '').slice(0, 10))}</td>
              <td>${(r.requests || 0).toLocaleString()}</td>
              <td>${(r.unique || 0).toLocaleString()}</td>
              <td>${Math.round(r.avgMs || 0)}</td>
            </tr>
          `).join('');
        }
      }

      // --- Top routes table ---
      const topRows = (topRoutes && topRoutes.results) || [];
      const tBody = document.getElementById('hm-top-body');
      if (tBody) {
        if (!topRows.length) {
          tBody.innerHTML = '<tr><td colspan="5" style="color:var(--gray-500)">No data.</td></tr>';
        } else {
          tBody.innerHTML = topRows.map(r => `
            <tr>
              <td>${esc(r.route)}</td>
              <td>${(r.hits || 0).toLocaleString()}</td>
              <td>${Math.round(r.avgMs || 0)}</td>
              <td>${r.maxMs || 0}</td>
              <td>${r.errors || 0}</td>
            </tr>
          `).join('');
        }
      }

      // --- Slowest routes table ---
      const slowRows = (slow && slow.results) || [];
      const sBody = document.getElementById('hm-slow-body');
      if (sBody) {
        if (!slowRows.length) {
          sBody.innerHTML = '<tr><td colspan="4" style="color:var(--gray-500)">No routes with ≥10 hits in the last 7 days.</td></tr>';
        } else {
          sBody.innerHTML = slowRows.map(r => `
            <tr>
              <td>${esc(r.route)}</td>
              <td>${(r.hits || 0).toLocaleString()}</td>
              <td><strong>${Math.round(r.avgMs || 0)}</strong></td>
              <td>${r.maxMs || 0}</td>
            </tr>
          `).join('');
        }
      }

      // --- Auth errors table ---
      const eBody = document.getElementById('hm-autherr-body');
      if (eBody) {
        if (!authErrRows.length) {
          eBody.innerHTML = '<tr><td colspan="4" style="color:var(--gray-500)">No 401s in the last 24h. ✓</td></tr>';
        } else {
          eBody.innerHTML = authErrRows.map(r => `
            <tr>
              <td>${esc(r.route)}</td>
              <td>${(r.count || 0).toLocaleString()}</td>
              <td>${r.uniqueIps || 0}</td>
              <td>${esc(fmtTime(r.latest))}</td>
            </tr>
          `).join('');
        }
      }

      // --- Active users table ---
      const activeRows = (active && active.results) || [];
      const aBody = document.getElementById('hm-active-body');
      if (aBody) {
        if (!activeRows.length) {
          aBody.innerHTML = '<tr><td colspan="4" style="color:var(--gray-500)">No authenticated traffic yet.</td></tr>';
        } else {
          aBody.innerHTML = activeRows.map(r => `
            <tr>
              <td>${esc(r.userId)}</td>
              <td>${(r.requests || 0).toLocaleString()}</td>
              <td>${esc(fmtTime(r.firstSeen))}</td>
              <td>${esc(fmtTime(r.lastSeen))}</td>
            </tr>
          `).join('');
        }
      }

    } catch (err) {
      console.error('[Performance] load failed', err);
      showNotification && showNotification('error', 'Failed to load Performance: ' + (err.message || err));
    }
  }
  window.loadPerformance = loadPerformance;

})();
