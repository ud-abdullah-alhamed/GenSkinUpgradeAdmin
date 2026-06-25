const ExportUtils = (function(){
    let __productIndexPromise = null;
    let __productIndex = null;
    function normKey(v){ return (v==null?'':String(v)).trim().toLowerCase(); }
    function productIdOf(p){ return p?.productId ?? p?.ProductId ?? p?.id ?? p?.Id ?? p?.code ?? p?.Code ?? ''; }
    function productNameOf(p){ return p?.productNameEN ?? p?.productNameAR ?? p?.productName ?? p?.name ?? p?.title ?? ''; }
    function productBrandOf(p){
        let b = p?.brandName ?? p?.BrandName ?? p?.brand ?? p?.Brand ?? p?.productBrand ?? p?.ProductBrand ?? '';
        if(b && typeof b === 'object') b = b.name || b.title || '';
        b = String(b || '').trim();
        if(!b && p && p.brand && typeof p.brand === 'object') b = String(p.brand.name || p.brand.title || '').trim();
        return b;
    }
    function productImageOf(p){
        const raw = p?.picture ?? p?.Picture ?? p?.json ?? p?.linkOfPic ?? p?.LinkOfPic ?? p?.photos ?? p?.imageUrl ?? p?.image ?? p?.photo ?? '';
        if(typeof raw === 'string') return raw;
        if(Array.isArray(raw) && raw.length) return raw[0]?.url || raw[0]?.src || raw[0]?.path || raw[0] || '';
        if(raw && typeof raw === 'object') return raw.url || raw.src || raw.path || raw.picture || '';
        return '';
    }
    async function ensureProductIndex(){
        if(__productIndex) return __productIndex;
        if(__productIndexPromise) return __productIndexPromise;
        __productIndexPromise = (async ()=>{
            let list = [];
            const s = window.state && Array.isArray(window.state.products) ? window.state.products : null;
            if(s && s.length){
                list = s;
            } else if(window.api && window.api.products && typeof window.api.products.list === 'function'){
                try{
                    const res = await window.api.products.list({ suppressError: true });
                    list = Array.isArray(res) ? res : (res && Array.isArray(res.data) ? res.data : []);
                }catch(e){
                    list = [];
                }
            }
            const byId = new Map();
            const byName = new Map();
            list.forEach(p=>{
                const id = normKey(productIdOf(p));
                if(id) byId.set(id, p);
                const nm = normKey(productNameOf(p));
                if(nm && !byName.has(nm)) byName.set(nm, p);
            });
            __productIndex = { list, byId, byName };
            return __productIndex;
        })();
        return __productIndexPromise;
    }
    function normalizeCell(v, maxLen = 500){
        let out = '';
        try{
            if(v == null) out = '';
            else if(typeof v === 'string') out = v;
            else if(typeof v === 'number' || typeof v === 'boolean') out = String(v);
            else if(v instanceof Date) out = isNaN(v.getTime()) ? '' : v.toISOString();
            else if(Array.isArray(v)){
                out = v.map(x => {
                    if(x == null) return '';
                    if(typeof x === 'string') return x;
                    if(typeof x === 'number' || typeof x === 'boolean') return String(x);
                    try{ return JSON.stringify(x); }catch(e){ return String(x); }
                }).filter(Boolean).join(', ');
            } else {
                try{ out = JSON.stringify(v); }catch(e){ out = String(v); }
            }
        }catch(e){
            out = '';
        }
        out = out.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
        if(out.length > maxLen) out = out.slice(0, maxLen - 1) + '…';
        if(/^[=+\-@]/.test(out)) out = "'" + out;
        return out;
    }

    function truncateText(v, maxLen){
        const s = normalizeCell(v, maxLen + 10);
        if(s.length <= maxLen) return s;
        return s.slice(0, Math.max(0, maxLen - 1)) + '…';
    }

    function downloadBlob(blob, filename){
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 3000);
    }

    function printFallback(title, htmlContent, filename){
        const fullHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${title}</title>
<style>
  body{font-family:Arial,sans-serif;font-size:12px;margin:20px;color:#1e293b}
  h1{font-size:18px;margin-bottom:4px}p.gen{font-size:10px;color:#64748b;margin-bottom:16px}
  h2{font-size:14px;margin:16px 0 8px}
  table{border-collapse:collapse;width:100%;margin-bottom:16px}
  th{background:#2563eb;color:#fff;padding:7px 8px;text-align:left;font-size:11px}
  td{padding:6px 8px;border:1px solid #e2e8f0;font-size:11px;vertical-align:top;word-break:break-word}
  tr:nth-child(even) td{background:#f1f5f9}
  .kv td:first-child{font-weight:bold;width:180px;color:#334155}
  tr td img{display:block;margin:auto}
  @media print{body{margin:0}}
</style></head><body>
<h1>${title}</h1>
<p class="gen">Generated: ${new Date().toLocaleString()}</p>
${htmlContent}
</body></html>`;
        const blob = new Blob([fullHtml], { type: 'text/html;charset=utf-8' });
        downloadBlob(blob, (filename || title.replace(/[^a-z0-9]/gi,'_')) + '.html');
        if(window.showNotification) window.showNotification('info', 'Downloaded as HTML (PDF library unavailable)');
    }

    function toPDF({title='Report', headers=[], data=[], filename='export', orientation='portrait'}){
        try{
            const jsPDFCtor = (window.jspdf && window.jspdf.jsPDF) ? window.jspdf.jsPDF : window.jsPDF;
            if(!jsPDFCtor) throw new Error('jsPDF not loaded');
            const doc = new jsPDFCtor(orientation, 'mm', 'a4');
            if(typeof doc.autoTable !== 'function') throw new Error('jsPDF autoTable not loaded');
            doc.setFontSize(16);
            doc.text(title, 14, 20);
            doc.setFontSize(10);
            doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 28);
            const autoTableOpts = arguments[0] && arguments[0].autoTableOptions ? arguments[0].autoTableOptions : {};
            doc.autoTable(Object.assign({
                head: [headers],
                body: data,
                startY: 36,
                theme: 'striped',
                styles: { fontSize: 9, cellPadding: 2, overflow: 'linebreak' }
            }, autoTableOpts));
            downloadBlob(doc.output('blob'), `${filename}.pdf`);
            if(window.showNotification) window.showNotification('success','PDF downloaded');
        }catch(e){
            console.warn('jsPDF failed, falling back to browser print', e);
            const rows = (data||[]).map(r=>`<tr>${(r||[]).map(c=>`<td>${c==null?'':c}</td>`).join('')}</tr>`).join('');
            const html = `<table><thead><tr>${(headers||[]).map(h=>`<th>${h}</th>`).join('')}</tr></thead><tbody>${rows}</tbody></table>`;
            printFallback(title, html);
        }
    }

    async function toExcel({title='Data', headers=[], data=[], filename='export'}){
        try{
            if(!window.ExcelJS) throw new Error('ExcelJS not loaded');
            
            const workbook = new ExcelJS.Workbook();
            workbook.creator = 'GenSkin Admin';
            workbook.created = new Date();
            
            const sheet = workbook.addWorksheet(normalizeCell(title, 31) || 'Sheet1');
            
            // Define Columns
            sheet.columns = headers.map(h => ({
                header: h,
                key: h,
                width: 20 // Default width, will adjust later
            }));

            // Add Data
            // Normalize data to strings to avoid Excel formatting issues, or keep as numbers if valid
            const safeData = data.map(row => {
                 // row is array of values. We need to map to object if columns used keys, but addRows with array works too
                 return row.map(v => {
                     // If it looks like a pure number, keep it as number for calculations, unless it's a long ID/phone
                     if(typeof v === 'number') return v;
                     if(typeof v === 'string' && /^-?\d+(\.\d+)?$/.test(v) && v.length < 15 && !v.startsWith('0')) return Number(v);
                     return normalizeCell(v, 32000);
                 });
            });
            sheet.addRows(safeData);

            // Styling
            
            // 1. Header Styling
            const headerRow = sheet.getRow(1);
            headerRow.height = 30;
            headerRow.eachCell((cell) => {
                cell.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: 'FF2563EB' } // Blue #2563eb
                };
                cell.font = {
                    color: { argb: 'FFFFFFFF' }, // White
                    bold: true,
                    size: 12,
                    name: 'Segoe UI'
                };
                cell.alignment = { vertical: 'middle', horizontal: 'center' };
                cell.border = {
                    top: {style:'thin', color: {argb:'FFCBD5E1'}},
                    left: {style:'thin', color: {argb:'FFCBD5E1'}},
                    bottom: {style:'thin', color: {argb:'FFCBD5E1'}},
                    right: {style:'thin', color: {argb:'FFCBD5E1'}}
                };
            });

            // 2. Data Styling & Auto-width
            sheet.eachRow((row, rowNumber) => {
                if(rowNumber === 1) return; // Skip header

                // Alternating Row Colors
                if(rowNumber % 2 === 0) {
                    row.eachCell({ includeEmpty: true }, (cell) => {
                        cell.fill = {
                            type: 'pattern',
                            pattern: 'solid',
                            fgColor: { argb: 'FFF1F5F9' } // Light Gray/Blue #f1f5f9
                        };
                    });
                }
                
                // Borders & Font for all data cells
                row.eachCell({ includeEmpty: true }, (cell) => {
                    cell.border = {
                        top: {style:'thin', color: {argb:'FFE2E8F0'}},
                        left: {style:'thin', color: {argb:'FFE2E8F0'}},
                        bottom: {style:'thin', color: {argb:'FFE2E8F0'}},
                        right: {style:'thin', color: {argb:'FFE2E8F0'}}
                    };
                    cell.font = { name: 'Segoe UI', size: 11, color: { argb: 'FF1E293B' } };
                    cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
                });
            });

            // Auto-adjust column widths
            sheet.columns.forEach((column, i) => {
                let maxLength = 0;
                column.eachCell({ includeEmpty: true }, (cell) => {
                    const columnLength = cell.value ? cell.value.toString().length : 10;
                    if (columnLength > maxLength) {
                        maxLength = columnLength;
                    }
                });
                column.width = Math.min(80, Math.max(12, maxLength + 2));
            });

            // Write and Download
            const buffer = await workbook.xlsx.writeBuffer();
            const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${filename}.xlsx`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            if(window.showNotification) window.showNotification('success', 'Excel exported successfully');
        }catch(e){ 
            console.error('Excel export', e); 
            if(window.showNotification) window.showNotification('error', 'Excel export failed: ' + e.message);
            else alert('Excel export failed');
        }
    }

    function exportOrders(orders=[], format='pdf'){
        const headers = ['Order ID','Customer','Date','Status','Amount','Discounted','Area','City','Phone'];
        const data = (orders||[]).map(o=>[
            o.orderId || o.id || '',
            o.userName || o.customerName || o.customer || [o.fName, o.secName].filter(Boolean).join(' ') || (o.user && (o.user.name || o.user.userName || o.user.fullName || [o.user.fName, o.user.secName].filter(Boolean).join(' '))) || '',
            formatDate(o.createdAt),
            o.status || '',
            (o.totalAfterDiscount!=null)? Number(o.totalAfterDiscount).toFixed(2) : ((o.totalPrice!=null)? Number(o.totalPrice).toFixed(2):''),
            o.discounted ? 'true' : 'false',
            o.area||'',
            o.city||'',
            o.number || o.phone || o.phoneNumber || ''
        ]);
        const opts = { title:'Orders', headers, data, filename:`orders_${formatDateForFile(new Date())}`, orientation:'landscape' };
        if(format==='pdf') toPDF(opts); else toExcel(opts);
        if(window.showNotification) window.showNotification('success','Export started');
    }

    function exportCustomers(customers=[], format='pdf'){
        const headers = ['ID','Name','Email','Phone','Joined'];
        const data = (customers||[]).map(c=>[c.id||'', c.name||'', c.email||'', c.phone||'', formatDate(c.createdAt)]);
        const opts = { title:'Customers', headers, data, filename:`customers_${formatDateForFile(new Date())}` };
        if(format==='pdf') toPDF(opts); else toExcel(opts);
        if(window.showNotification) window.showNotification('success','Export started');
    }

    function exportProducts(products=[], format='pdf'){
        const headers = ['ID','Name','Description','Category','Price','Stock','Image'];
        function numLike(v){ if(v==null) return 0; if(typeof v==='number') return v; if(typeof v==='string'){ const m=v.match(/-?\d+(\.\d+)?/); return m? Number(m[0]):0; } return Number(v)||0; }
        function pid(p){ return p.productId ?? p.id ?? p.code ?? ''; }
        function pname(p){ return p.name ?? p.productName ?? p.title ?? p.enName ?? p.arName ?? p.productNameEN ?? p.productNameAR ?? ''; }
        function pdesc(p){ return p.description || p.desc || p.productDescription || p.descriptionEN || p.productDescEN || p.productDesc || p.descriptionAR || ''; }
        function pcateg(p){
            const n = p.categoryName || p.category || p.categoryEN || p.categoryENS || p.categoryAr || '';
            if(n) return n;
            const cid = p.categoryId || p.categoryID || p.catId || p.catID;
            if(cid!=null && Array.isArray(window.state?.categories)){
                const c = window.state.categories.find(x => (x.categoryId||x.id||x.catId) == cid);
                return c ? (c.name||c.categoryName||c.nameAr||cid) : cid;
            }
            return '';
        }
        function pstock(p){ return p.stock ?? p.quantity ?? p.quantityInStock ?? p.availableStock ?? ''; }
        function pprice(p){
            const raw = p.price ?? p.unitPrice ?? p.sellingPrice ?? p.finalPrice ?? p.cost ?? null;
            const v = numLike(raw);
            return v? v.toFixed(2) : '';
        }
        function pimg(p){
            const raw = p.imageUrl || p.image || p.photo || p.linkOfPic || p.photos || '';
            const s = normalizeCell(raw, 800);
            const m = s.match(/https?:\/\/[^/]+(\/uploads\/[^?#]+(\?[^#]*)?)/i);
            return m ? m[1] : s;
        }
        const rows = (products||[]).map(p=>[pid(p), pname(p), pdesc(p), pcateg(p), pprice(p), pstock(p), pimg(p)]);
        if(format === 'pdf'){
            const pdfData = rows.map(r=>[
                normalizeCell(r[0], 60),
                normalizeCell(r[1], 500),
                normalizeCell(r[2], 2000),
                normalizeCell(r[3], 300),
                normalizeCell(r[4], 20),
                normalizeCell(r[5], 20),
                normalizeCell(r[6], 500)
            ]);
            toPDF({
                title: 'Products',
                headers,
                data: pdfData,
                filename: `products_${formatDateForFile(new Date())}`,
                orientation: 'landscape',
                autoTableOptions: {
                    styles: { fontSize: 8, cellPadding: 2, overflow: 'linebreak' },
                    headStyles: { fillColor: [37, 99, 235] },
                    columnStyles: {
                        0: { cellWidth: 18 },
                        1: { cellWidth: 46 },
                        2: { cellWidth: 95 },
                        3: { cellWidth: 30 },
                        4: { cellWidth: 18, halign: 'right' },
                        5: { cellWidth: 16, halign: 'right' },
                        6: { cellWidth: 55 }
                    }
                }
            });
        } else {
            const opts = { title:'Products', headers, data: rows, filename:`products_${formatDateForFile(new Date())}` };
            toExcel(opts);
        }
    }

    function exportProductTest(products=[], format='pdf'){
        const headers = ['ID','Name','Description','Category','Price','Stock','Image'];
        function numLike(v){ if(v==null) return 0; if(typeof v==='number') return v; if(typeof v==='string'){ const m=v.match(/-?\d+(\.\d+)?/); return m? Number(m[0]):0; } return Number(v)||0; }
        function pid(p){ return p.productId ?? p.id ?? p.code ?? ''; }
        function pname(p){ return p.name ?? p.productName ?? p.title ?? p.enName ?? p.arName ?? p.productNameEN ?? p.productNameAR ?? ''; }
        function pdesc(p){ return p.description || p.desc || p.productDescription || p.descriptionEN || p.productDescEN || p.productDesc || p.descriptionAR || ''; }
        function pcateg(p){
            const n = p.categoryName || p.category || p.categoryEN || p.categoryENS || p.categoryAr || '';
            if(n) return n;
            const cid = p.categoryId || p.categoryID || p.catId || p.catID;
            if(cid!=null && Array.isArray(window.state?.categories)){
                const c = window.state.categories.find(x => (x.categoryId||x.id||x.catId) == cid);
                return c ? (c.name||c.categoryName||c.nameAr||cid) : cid;
            }
            return '';
        }
        function pstock(p){ return p.stock ?? p.quantity ?? p.quantityInStock ?? p.availableStock ?? ''; }
        function pprice(p){
            const raw = p.price ?? p.unitPrice ?? p.sellingPrice ?? p.finalPrice ?? p.cost ?? null;
            const v = numLike(raw);
            return v? v.toFixed(2) : '';
        }
        function pimg(p){
            const raw = p.imageUrl || p.image || p.photo || p.linkOfPic || p.photos || '';
            const s = normalizeCell(raw, 800);
            const m = s.match(/https?:\/\/[^/]+(\/uploads\/[^?#]+(\?[^#]*)?)/i);
            return m ? m[1] : s;
        }
        const rows = (products||[]).map(p=>[pid(p), pname(p), pdesc(p), pcateg(p), pprice(p), pstock(p), pimg(p)]);
        if(format === 'pdf'){
            const pdfData = rows.map(r=>[
                normalizeCell(r[0], 60),
                normalizeCell(r[1], 500),
                normalizeCell(r[2], 2000),
                normalizeCell(r[3], 300),
                normalizeCell(r[4], 20),
                normalizeCell(r[5], 20),
                normalizeCell(r[6], 500)
            ]);
            toPDF({
                title: 'Product Test',
                headers,
                data: pdfData,
                filename: `product_test_${formatDateForFile(new Date())}`,
                orientation: 'landscape',
                autoTableOptions: {
                    styles: { fontSize: 8, cellPadding: 2, overflow: 'linebreak' },
                    headStyles: { fillColor: [37, 99, 235] },
                    columnStyles: {
                        0: { cellWidth: 18 },
                        1: { cellWidth: 46 },
                        2: { cellWidth: 95 },
                        3: { cellWidth: 30 },
                        4: { cellWidth: 18, halign: 'right' },
                        5: { cellWidth: 16, halign: 'right' },
                        6: { cellWidth: 55 }
                    }
                }
            });
        } else {
            const opts = { title:'Product Test', headers, data: rows, filename:`product_test_${formatDateForFile(new Date())}` };
            toExcel(opts);
        }
    }

    function exportDeliveries(deliveries=[], format='pdf'){
        const headers = ['ID','Drug Store','Main Area','Main Min Order','Other Min Order','Main Fees','Other Fees','Main Option','Notes'];
        const data = (deliveries||[]).map(d=>[
            d.id || '',
            d.drugStore || '',
            d.mainArea || '',
            d.mainMinimumOrder || '',
            d.otherAreasMinimumOrder || '',
            d.mainDeliveryFees || '',
            d.otherAreasDeliveryFees || '',
            d.mainDeliveryOption || '',
            d.deliveryOptionNotes || ''
        ]);
        const opts = { title:'Delivery Vendors', headers, data, filename:`delivery_vendors_${formatDateForFile(new Date())}`, orientation:'landscape' };
        if(format==='pdf') toPDF(opts); else toExcel(opts);
        if(window.showNotification) window.showNotification('success','Export started');
    }

    function exportAds(ads=[], format='pdf'){
        const headers = ['ID','Title','Image','Status','Created At'];
        const data = (ads||[]).map(a=>[
            a.id||'',
            a.title||'',
            a.imageUrl||a.image||'',
            a.status||'',
            formatDate(a.createdAt||a.createdOn)
        ]);
        const opts = { title:'Ads', headers, data, filename:`ads_${formatDateForFile(new Date())}` };
        if(format==='pdf') toPDF(opts); else toExcel(opts);
        if(window.showNotification) window.showNotification('success','Export started');
    }

    function exportDiscountCodes(codes=[], format='pdf'){
        const headers = ['ID','Code','Type','Value','Min Spend','Max Usage','Usage Count','Start Date','End Date','Status'];
        const data = (codes||[]).map(c=>[
            c.id||'',
            c.code||'',
            c.type||'',
            c.value||'',
            c.minSpend||'',
            c.maxUsage||'',
            c.usageCount||'',
            formatDate(c.startDate),
            formatDate(c.endDate),
            c.isActive ? 'Active' : 'Inactive'
        ]);
        const opts = { title:'Discount Codes', headers, data, filename:`discounts_${formatDateForFile(new Date())}` };
        if(format==='pdf') toPDF(opts); else toExcel(opts);
        if(window.showNotification) window.showNotification('success','Export started');
    }

    function exportClinicInfo(info=[], format='pdf'){
        const headers = ['ID','Key','Value','Description','Updated At'];
        const data = (info||[]).map(i=>[
            i.id||'',
            i.key||'',
            normalizeCell(i.value, 100),
            normalizeCell(i.description, 100),
            formatDate(i.updatedAt||i.updatedOn)
        ]);
        const opts = { title:'Clinic Info', headers, data, filename:`clinic_info_${formatDateForFile(new Date())}` };
        if(format==='pdf') toPDF(opts); else toExcel(opts);
        if(window.showNotification) window.showNotification('success','Export started');
    }

    async function exportOrderDetails(order, items){
        const safeItems = Array.isArray(items) ? items : [];
        const o = order || {};
        const orderId = o.orderId || o.id || o.cartCode || o.code || '';

        // ── shared helpers ───────────────────────────────────────────────────────
        const blobToDataUrl = (blob) => new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload  = () => resolve(reader.result);
            reader.onerror = () => reject(reader.error || new Error('blob read failed'));
            reader.readAsDataURL(blob);
        });

        // Load image as data-URL. Prioritises the pre-resolved URL passed from app.js.
        async function loadImg(item){
            const candidates = [];
            const add = (u) => { if(u && typeof u === 'string' && u.trim() && !candidates.includes(u)) candidates.push(u.trim()); };
            add(item._resolvedImageUrl);
            add(item._fallbackImageUrl);
            // raw fallbacks
            const rawFields = [item.productImage, item.imageUrl, item.image, item.photo, item.linkOfPic, item.photos,
                               item.product && (item.product.imageUrl || item.product.image || item.product.photo || item.product.linkOfPic)];
            rawFields.forEach(r => { if(r && typeof r === 'string') add(r.replace(/[`'"]/g,'').trim()); });

            // fetch approach
            for(const url of candidates){
                try{
                    const resp = await fetch(url, { method:'GET', credentials:'include' });
                    if(!resp.ok) continue;
                    const blob = await resp.blob();
                    const dataUrl = await blobToDataUrl(blob);
                    return { dataUrl, format: /^data:image\/png/i.test(dataUrl) ? 'PNG' : 'JPEG' };
                }catch(e){}
            }
            // canvas approach (same-origin / CORS-open)
            for(const url of candidates){
                try{
                    const result = await new Promise(resolve => {
                        const img = new Image();
                        img.crossOrigin = 'anonymous';
                        const t = setTimeout(() => resolve(null), 5000);
                        img.onload = () => {
                            clearTimeout(t);
                            try{
                                const c = document.createElement('canvas');
                                c.width = img.naturalWidth || 100; c.height = img.naturalHeight || 100;
                                c.getContext('2d').drawImage(img, 0, 0);
                                resolve({ dataUrl: c.toDataURL('image/jpeg', 0.85), format: 'JPEG' });
                            }catch(e){ resolve(null); }
                        };
                        img.onerror = () => { clearTimeout(t); resolve(null); };
                        img.src = url;
                    });
                    if(result) return result;
                }catch(e){}
            }
            return null;
        }

        // Resolve item name the same way the modal does
        function itemName(item){
            let name = item.productNameEN || item.productName || item.name || item.title;
            if(item.productName && item.productNameEN && item.productName !== item.productNameEN)
                name = item.productName + ' - ' + item.productNameEN;
            if(!name && item.product) name = item.product.name || item.product.productName || item.product.title;
            if(!name && item.cartItem) name = item.cartItem.productName || item.cartItem.name;
            if(!name){
                const possible = Object.values(item).find(v => typeof v==='string' && v.length>2 && v.length<100 && !v.includes('http') && !/^\d+$/.test(v));
                name = possible ? possible + ' (?)' : 'Unknown Product';
            }
            return name;
        }

        try{
            const jsPDFCtor = (window.jspdf && window.jspdf.jsPDF) ? window.jspdf.jsPDF : window.jsPDF;
            if(!jsPDFCtor) throw new Error('jsPDF not loaded');

            if(window.showNotification) window.showNotification('info', 'Generating PDF…');

            const doc = new jsPDFCtor('landscape', 'mm', 'a4');
            const pageH = doc.internal.pageSize.getHeight();
            const pageW = doc.internal.pageSize.getWidth();
            const margin = 14;
            const valX = 72;
            let y = 20;

            const checkY = (needed = 8) => { if(y + needed > pageH - 10){ doc.addPage(); y = 20; } };
            const section = (title) => {
                checkY(12); y += 2;
                doc.setFontSize(12); doc.setFont(undefined,'bold');
                doc.setFillColor(37, 99, 235); doc.rect(margin, y - 5, pageW - margin*2, 8, 'F');
                doc.setTextColor(255,255,255); doc.text(title, margin + 2, y); doc.setTextColor(0,0,0);
                y += 6; doc.setFont(undefined,'normal'); doc.setFontSize(10);
            };

            // Detect Arabic / RTL characters
            const hasArabic = (s) => /[؀-ۿݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-﻿]/.test(s);

            // Render Arabic text to a canvas image at the correct PDF display size.
            // fontSize is in jsPDF points (same scale as doc.setFontSize).
            const renderTextImg = (text, fontSize) => {
                try {
                    const PX_PER_MM = 96 / 25.4;          // screen pixels per mm
                    // Target PDF height: cap-height of the chosen font size in mm
                    const pdfH  = fontSize * 0.42;         // ~4.2 mm for fontSize=10
                    // Render at 3× for sharpness
                    const renderH = Math.ceil(pdfH * PX_PER_MM * 3);
                    const fontPx  = Math.ceil(renderH * 0.78);

                    const cv  = document.createElement('canvas');
                    const ctx = cv.getContext('2d');
                    ctx.font = `${fontPx}px Arial, "Segoe UI", sans-serif`;
                    const tw = Math.ceil(ctx.measureText(text).width);

                    cv.width  = tw + 8;
                    cv.height = renderH;
                    ctx.fillStyle = '#ffffff';
                    ctx.fillRect(0, 0, cv.width, cv.height);
                    ctx.fillStyle = '#000000';
                    ctx.font = `${fontPx}px Arial, "Segoe UI", sans-serif`;
                    ctx.direction = 'rtl';
                    ctx.textAlign = 'right';
                    ctx.fillText(text, cv.width - 3, fontPx);

                    // Convert rendered pixels → PDF mm using the same 3× factor
                    const pdfW = (tw + 8) / (PX_PER_MM * 3);
                    return { dataUrl: cv.toDataURL('image/png'), w: pdfW, h: pdfH };
                } catch(e) { return null; }
            };

            // Place a value: canvas image if Arabic, plain text otherwise
            const placeVal = (strVal, x, maxW) => {
                if(hasArabic(strVal)){
                    const img = renderTextImg(strVal, 10);
                    if(img){
                        const drawW = Math.min(img.w, maxW);
                        const drawH = img.h * (drawW / img.w);
                        // Align image so its baseline matches doc.text() baseline:
                        // top of image = y - (cap-height) ≈ y - drawH * 0.78
                        const imgY = y - drawH * 0.85;
                        doc.addImage(img.dataUrl, 'PNG', x, imgY, drawW, drawH);
                        return 7; // same line advance as normal text
                    }
                }
                const lines = doc.splitTextToSize(strVal, maxW);
                doc.text(lines, x, y);
                return Math.max(7, lines.length * 6);
            };

            const addLine = (label, val) => {
                if(val == null || val === '' || val === '-') return;
                checkY(7);
                doc.setFont(undefined,'bold'); doc.text(String(label)+':', margin, y);
                doc.setFont(undefined,'normal');
                y += placeVal(String(val), valX, pageW - valX - margin);
            };
            const addWrap = (label, val) => {
                if(!val) return;
                checkY(7);
                doc.setFont(undefined,'bold'); doc.text(label+':', margin, y); doc.setFont(undefined,'normal');
                y += placeVal(String(val), valX, pageW - valX - margin) + 2;
            };

            // Title
            doc.setFontSize(18); doc.setFont(undefined,'bold');
            doc.text('Order Details', margin, y); y += 8;
            doc.setFontSize(9); doc.setFont(undefined,'normal');
            doc.text(`Generated: ${new Date().toLocaleString()}`, margin, y); y += 8;

            // ── Section 1: Order Info ──────────────────────────────────────────
            section('Order Info');
            addLine('Order ID', o.orderId || o.id || o.cartCode || o.code);
            if(o.cartCode || o.code) addLine('Cart Code', o.cartCode || o.code);
            addLine('Date', formatDate(o.createdAt || o.date || o.orderDate || o.createdOn));
            addLine('Status', o.status || o.orderStatus || o.state);
            if(o.vendorStatus) addLine('Vendor Status', o.vendorStatus);
            const totalVal = o.totalPrice != null ? o.totalPrice : (o.total != null ? o.total : o.amount);
            addLine('Total', 'JOD ' + (totalVal != null ? Number(totalVal).toFixed(2) : '0.00'));
            if(o.totalAfterDiscount != null) addLine('Total After Discount', 'JOD ' + Number(o.totalAfterDiscount).toFixed(2));
            addLine('Discounted', o.discounted ? 'Yes' : 'No');
            if(o.coupon || o.couponCode) addLine('Coupon', o.coupon || o.couponCode);
            if(o.paymentMethod || o.paymentType) addLine('Payment', o.paymentMethod || o.paymentType);
            if(o.note || o.notes) addWrap('Notes', o.note || o.notes);

            // Dynamic other fields (matches the modal's Object.entries loop)
            const handledKeys = new Set(['orderId','id','cartCode','code','status','orderStatus','state','vendorStatus','totalPrice','total','amount','totalAfterDiscount','discounted','createdAt','createdOn','orderDate','date','paymentMethod','paymentType','note','notes','coupon','couponCode','items','user','customer','userId','customerId','address','shippingAddress','location','gps','lat','lng','latitude','longitude','phone','number','city','area','longattitude','deliveryFees','deliveryFee','shippingFee','shippingCost','deliveryCost','deliveryOption','deliveryOptionNotes','shippingOption','deliveryType','deliveryDate','estimatedDelivery','dateOfArrival','arrivalDate','expectedDelivery','userName','customerName','fName','secName']);
            Object.entries(o).forEach(([k, v]) => {
                if(handledKeys.has(k)) return;
                if(typeof v === 'object' && v !== null) return;
                if(k.toLowerCase().includes('image')) return;
                addLine(k.replace(/([A-Z])/g,' $1').replace(/^./,s=>s.toUpperCase()), v);
            });

            // ── Section 2: Customer & Location ────────────────────────────────
            section('Customer & Location');
            const user = o.user || o.customer || {};
            const cName = o.userName || o.customerName || (typeof o.customer==='string'?o.customer:'') || user.name || user.userName || [o.fName,o.secName].filter(Boolean).join(' ') || '';
            addLine('Customer', cName);
            addLine('Phone', o.phone || o.number || user.phone || user.phoneNumber);
            addLine('City', o.city || (user.address && user.address.city));
            addLine('Area', o.area || (user.address && user.address.area));
            const addr = o.shippingAddress || o.address || o.location || user.address || {};
            const addrStr = typeof addr==='string' ? addr : Object.values(addr).filter(x=>typeof x==='string'||typeof x==='number').join(', ');
            if(addrStr) addWrap('Address', addrStr);
            const lat = o.lat || o.latitude || (o.gps && o.gps.lat);
            const lng = o.lng || o.long || o.longitude || o.longattitude || (o.gps && o.gps.lng);
            if(lat && lng) addLine('Map', `https://www.google.com/maps?q=${lat},${lng}`);

            // Delivery
            const deliveryFee = o.deliveryFees ?? o.deliveryFee ?? o.shippingFee ?? o.shippingCost ?? o.deliveryCost ?? null;
            addLine('Delivery Fee', deliveryFee == null || Number(deliveryFee) === 0 ? 'Free' : 'JOD ' + Number(deliveryFee).toFixed(2));
            const deliveryOption = o.deliveryOption || o.deliveryOptionNotes || o.shippingOption || o.deliveryType || null;
            if(deliveryOption) addWrap('Delivery Option', deliveryOption);
            const deliveryDate = o.deliveryDate || o.estimatedDelivery || o.dateOfArrival || o.arrivalDate || o.expectedDelivery || null;
            if(deliveryDate) addLine('Date of Arrival', formatDate(deliveryDate));

            // ── Section 3: Items Table ────────────────────────────────────────
            section('Items');

            // Load all images in parallel
            const rowsWithImages = await Promise.all(safeItems.map(async item => {
                const qty   = item.quantity || item.qty || item.count || (item.product && item.product.quantity) || 0;
                const price = item.price || item.unitPrice || (item.product && item.product.price) || 0;
                const total = item.totalPrice || item.total || (qty * price) || 0;

                // Discount calculation (same as before)
                let priceAfter = price, discount = 0;
                if(o.totalPrice != null && o.totalAfterDiscount != null && Number(o.totalPrice) > 0){
                    const rate = (Number(o.totalPrice) - Number(o.totalAfterDiscount)) / Number(o.totalPrice);
                    const itemDisc = qty * price * rate;
                    priceAfter = price - (qty > 0 ? itemDisc / qty : 0);
                    discount   = qty > 0 ? itemDisc / qty : 0;
                }

                const name = itemName(item);
                const size = item.size || item.productSize || '';
                const img  = await loadImg(item);

                return {
                    img,
                    data: [name, size, qty,
                           'JOD ' + Number(price).toFixed(2),
                           'JOD ' + Number(priceAfter).toFixed(2),
                           'JOD ' + Number(total).toFixed(2)]
                };
            }));

            if(rowsWithImages.length === 0){
                checkY(8); doc.setFontSize(10); doc.text('No items.', margin, y); y += 8;
            } else {
                doc.autoTable({
                    startY: y,
                    head: [['Product', 'Size', 'Qty', 'Unit Price', 'Price After Disc', 'Total']],
                    body: rowsWithImages.map(r => r.data),
                    theme: 'striped',
                    headStyles: { fillColor: [37,99,235], fontSize: 10, cellPadding: 4, halign:'center', valign:'middle' },
                    styles:     { fontSize: 10, cellPadding: 4, valign:'middle', overflow:'linebreak', minCellHeight: 24 },
                    columnStyles: {
                        0: { cellWidth: 90, minCellHeight: 24, cellPadding: { left: 28, top: 4, bottom: 4, right: 4 } },
                        1: { cellWidth: 22 },
                        2: { cellWidth: 16, halign:'right' },
                        3: { cellWidth: 36, halign:'right' },
                        4: { cellWidth: 36, halign:'right' },
                        5: { cellWidth: 36, halign:'right' }
                    },
                    didDrawCell: (data) => {
                        if(data.section === 'body' && data.column.index === 0){
                            const img = rowsWithImages[data.row.index].img;
                            if(img && img.dataUrl)
                                doc.addImage(img.dataUrl, img.format||'JPEG', data.cell.x+2, data.cell.y+2, 20, 20);
                        }
                    }
                });
            }

            downloadBlob(doc.output('blob'), `Order_${orderId}.pdf`);
            if(window.showNotification) window.showNotification('success', 'PDF downloaded');
        }catch(e){
            console.warn('exportOrderDetails failed, using download fallback', e);
            try{
                const o = order || {};
                const orderId = o.orderId || o.id || o.cartCode || o.code || '';
                const kvRows = [
                    ['Order ID', orderId],
                    ['Date', (o.createdAt||o.date||o.orderDate||o.createdOn) ? new Date(o.createdAt||o.date||o.orderDate||o.createdOn).toLocaleString() : ''],
                    ['Status', o.status || o.orderStatus || ''],
                    ['Customer', o.userName || o.customerName || o.customer || ''],
                    ['Phone', o.phone || o.number || ''],
                    ['City', o.city || ''],
                    ['Area', o.area || ''],
                    ['Total', o.totalAfterDiscount != null ? 'JOD ' + Number(o.totalAfterDiscount).toFixed(2) : (o.totalPrice != null ? 'JOD ' + Number(o.totalPrice).toFixed(2) : '')],
                    ['Discounted', o.discounted ? 'Yes' : 'No'],
                    ['Coupon', o.coupon || o.couponCode || ''],
                    ['Notes', o.note || o.notes || '']
                ].filter(r => r[1] != null && r[1] !== '');

                // Try simple jsPDF without autoTable (no images) for a real PDF download
                const jsPDFCtor2 = (window.jspdf && window.jspdf.jsPDF) ? window.jspdf.jsPDF : window.jsPDF;
                if(jsPDFCtor2){
                    try{
                        const d = new jsPDFCtor2('portrait', 'mm', 'a4');
                        const pH = d.internal.pageSize.getHeight();
                        let y = 20;
                        const nl = (needed = 7) => { if(y + needed > pH - 10){ d.addPage(); y = 20; } };
                        d.setFontSize(18); d.setFont(undefined,'bold');
                        d.text(`Order #${orderId}`, 14, y); y += 9;
                        d.setFontSize(9); d.setFont(undefined,'normal');
                        d.text(`Generated: ${new Date().toLocaleString()}`, 14, y); y += 10;
                        d.setFontSize(11); d.setFont(undefined,'bold');
                        d.text('Order Info', 14, y); y += 7;
                        d.setFont(undefined,'normal'); d.setFontSize(10);
                        kvRows.forEach(([k,v]) => { nl(); d.setFont(undefined,'bold'); d.text(k+':', 14, y); d.setFont(undefined,'normal'); d.text(String(v||''), 65, y); y += 7; });
                        if(safeItems.length){
                            y += 5; nl(10);
                            d.setFontSize(11); d.setFont(undefined,'bold'); d.text('Items', 14, y); y += 7;
                            d.setFontSize(9); d.setFont(undefined,'normal');
                            safeItems.forEach(item => {
                                const name = item.productNameEN || item.productNameAR || item.productName || item.name || 'Unknown';
                                const brand = item.brandName || item.brand || (item.product && (item.product.brandName || item.product.brand)) || '';
                                const qty = item.quantity || item.qty || 0;
                                const price = item.price || item.unitPrice || 0;
                                const size = item.size || item.productSize || '';
                                nl();
                                const label = `${brand ? brand+' — ' : ''}${name}${size ? ' ('+size+')' : ''}  x${qty}  JOD ${Number(price).toFixed(2)}`;
                                const lines = d.splitTextToSize('• ' + label, 180);
                                lines.forEach(ln => { nl(); d.text(ln, 14, y); y += 6; });
                            });
                        }
                        downloadBlob(d.output('blob'), `Order_${orderId}.pdf`);
                        if(window.showNotification) window.showNotification('success', 'PDF downloaded');
                        return;
                    }catch(pdfErr){ console.warn('Simple PDF fallback also failed', pdfErr); }
                }

                // Last resort: HTML blob download with images
                const infoTable = `<table class="kv"><tbody>${kvRows.map(r=>`<tr><td>${r[0]}</td><td>${r[1]}</td></tr>`).join('')}</tbody></table>`;
                const itemRows = safeItems.map(item => {
                    const name  = itemName(item);
                    const brand = item.brandName || item.brand || (item.product && (item.product.brandName || item.product.brand)) || '';
                    const qty   = item.quantity || item.qty || 0;
                    const price = item.price || item.unitPrice || 0;
                    const imgSrc = item._resolvedImageUrl || item._fallbackImageUrl || (() => {
                        let r = item.productImage || item.imageUrl || item.image || item.photo || item.linkOfPic || item.photos || '';
                        if(!r && item.product) r = item.product.imageUrl || item.product.image || '';
                        const m = r ? String(r).match(/(\/uploads\/[^?#\s]+)/i) : null;
                        return m ? m[1] : r;
                    })();
                    const imgTag = imgSrc ? `<img src="${imgSrc}" style="width:52px;height:52px;object-fit:contain;border-radius:4px;border:1px solid #e2e8f0" onerror="this.style.display='none'">` : '';
                    return `<tr><td style="width:64px;text-align:center">${imgTag}</td><td>${brand ? `<b>${brand}</b> — ` : ''}${name}</td><td>${item.size||item.productSize||''}</td><td style="text-align:right">${qty}</td><td style="text-align:right">JOD ${Number(price).toFixed(2)}</td><td style="text-align:right">JOD ${Number(qty*price).toFixed(2)}</td></tr>`;
                }).join('');
                const itemsTable = safeItems.length ? `<h2>Items</h2><table><thead><tr><th>Image</th><th>Product</th><th>Size</th><th>Qty</th><th>Unit Price</th><th>Total</th></tr></thead><tbody>${itemRows}</tbody></table>` : '';
                printFallback(`Order #${orderId}`, infoTable + itemsTable, `Order_${orderId}`);
            }catch(fe){
                console.error('All download fallbacks failed', fe);
                if(window.showNotification) window.showNotification('error', 'Failed to export PDF');
            }
        }
    }

    function formatDate(v){ if(!v) return ''; try{ const d=new Date(v); return isNaN(d.getTime())? '' : d.toLocaleString(); }catch(e){ return String(v); } }
    function formatDateForFile(d){ return d.toISOString().split('T')[0].replace(/-/g,''); }

    return { toPDF, toExcel, exportOrders, exportCustomers, exportProducts, exportProductTest, exportDeliveries, exportDiscountCodes, exportClinicInfo, exportAds, exportOrderDetails };
})();

window.ExportUtils = ExportUtils;
    /**
     * Export data to PDF format
     * @param {Object} options - Export configuration
     * @param {string} options.title - Document title
     * @param {Array} options.headers - Column headers
     * @param {Array} options.data - Row data (array of arrays)
     * @param {string} options.filename - Output filename (without extension)
     * @param {string} options.orientation - 'portrait' or 'landscape'

     */
