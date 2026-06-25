# Bug Report — Admin Panel

> Audit date: 2026-06-20

---

## Bug 1 — `handleExcelUpload` is a non-functional stub
**File:** `js/app.js` · Line 3145  
**Severity:** High

The Excel upload handler is completely commented out. It shows a fake "success" notification after 1.5 seconds but never sends the file anywhere.

```js
// What it does now:
setTimeout(() => {
    showNotification('success', 'Excel file uploaded successfully (Placeholder)');
}, 1500);
```

**Fix:** Implement the actual API call to upload the Excel file.

---

## Bug 2 — Pagination breaks after filtering (Products)
**File:** `js/app.js` · Line 2628 and 2684  
**Severity:** High

`setProductsPage` always paginates from the full `state.products` list, ignoring `state.filteredProducts`. If a user filters by category then changes page, the filter is lost and the full list is shown.

```js
// Current (wrong):
window.setProductsPage = function(p){ state.productsPage = Math.max(1, p); renderProductsTable(state.products); }

// Fix:
window.setProductsPage = function(p){ state.productsPage = Math.max(1, p); renderProductsTable(state.filteredProducts || state.products); }
```

Same bug exists for Product Test at line 2684:

```js
// Current (wrong):
window.setProductTestPage = function(p){ state.productTestPage = Math.max(1, p); renderProductTestTable(state.productTestProducts); }

// Fix:
window.setProductTestPage = function(p){ state.productTestPage = Math.max(1, p); renderProductTestTable(state.productTestFilteredProducts || state.productTestProducts); }
```

---

## Bug 3 — Edit Product: Time field never populated
**File:** `js/app.js` · Line 3352  
**Severity:** Medium

`editProduct` looks for element `product-time-select` but the actual HTML element ID is `product-time` (confirmed by `APP_CONFIG.CHIP_VARIANTS` and the multiSelects init array at line 5833). `getElementById` returns `null`, so the Time value is never filled when editing a product.

```js
// Current (wrong):
const timeSelect = document.getElementById('product-time-select');

// Fix:
const timeSelect = document.getElementById('product-time');
```

Note: `editProductTest` at line 3457 correctly uses `product-test-time`.

---

## Bug 4 — Category save re-renders the wrong table
**File:** `js/app.js` · Line 5634  
**Severity:** Medium

After a category is updated in local state, the code re-renders the **products** table instead of the **categories** table.

```js
// Current (wrong):
renderProductsTable(state.products);

// Fix:
renderCategoriesTable(state.categories);
```

---

## Bug 5 — Analytics charts crash on second visit
**File:** `js/app.js` · Lines 4880–4888  
**Severity:** Medium

`renderCharts` calls `new Chart(ctx, ...)` on canvas elements without destroying the previous Chart.js instance first. Revisiting the Analytics tab throws:

```
Error: Canvas is already in use. Chart with ID "X" must be destroyed before the canvas
can be reused.
```

**Fix:** Destroy existing chart before creating a new one:

```js
// Before each: new Chart(ctx, { ... })
// Add:
const existing = Chart.getChart(ctx);
if (existing) existing.destroy();
```

---

## Bug 6 — Drug store options fallback bypasses proxy (CORS failure)
**File:** `js/app.js` · Line 2999  
**Severity:** Medium

`ensureDrugStoreOptions` tries two endpoints. The fallback is a direct IP/port URL that bypasses the proxy, causing the same class of CORS error that was fixed on the support page.

```js
// Current (wrong):
const endpoints = [
    '/api/Delivery/drug-stores',                             // correct
    'http://166.1.227.102:7010/api/Delivery/drug-stores'    // bypasses proxy — CORS error
];

// Fix: remove the fallback, or replace it with another valid proxy path.
const endpoints = [
    '/api/Delivery/drug-stores'
];
```

---

## Bug 7 — `viewDelivery` has an empty API fetch block
**File:** `js/app.js` · Lines 3953–3955  
**Severity:** Low–Medium

The block that was meant to fetch fresh delivery data from the server is empty. If the record is not in local `state.delivery`, the function shows "Delivery not found" even though it may exist on the server.

```js
// Current (empty — does nothing):
if(api.cart && api.cart.getForAdmin){
}

// Fix: either populate the block or remove it.
```

---

## Bug 8 — `searchSupportService` wraps response without null check
**File:** `js/app.js` · Line 4457  
**Severity:** Low–Medium

If the API returns `null` or an error-shaped object, it is blindly wrapped in an array and passed to `renderSupportServiceTable`, which then renders a broken row.

```js
// Current (unsafe):
const res = await api.supportService.get(id);
state.supportService = [res];

// Fix:
const res = await api.supportService.get(id);
if (!res) { renderSupportServiceTable([]); return; }
state.supportService = Array.isArray(res) ? res : [res];
```

---

## Bug 9 — Error toasts silently suppressed after 2 seconds of inactivity
**File:** `js/app.js` · Line 58  
**Severity:** Low (UX)

Any non-success notification triggered more than 2 seconds after the last user action is silently dropped. This means background or async API errors (e.g., a failed auto-refresh) produce no visible feedback at all.

```js
// Current:
if(type !== 'success' && sinceUserAction > 2000) return;
```

**Fix:** Either remove this guard entirely, or only apply it to `'info'` type messages, not `'error'` messages.

---

## Summary Table

| # | Description | File | Line | Severity |
|---|-------------|------|------|----------|
| 1 | Excel upload is a non-functional stub | app.js | 3145 | High |
| 2 | Pagination ignores filtered products | app.js | 2628, 2684 | High |
| 3 | Edit Product: Time field ID mismatch | app.js | 3352 | Medium |
| 4 | Category save re-renders wrong table | app.js | 5634 | Medium |
| 5 | Analytics charts crash on second visit | app.js | 4880–4888 | Medium |
| 6 | Drug store fallback URL bypasses proxy | app.js | 2999 | Medium |
| 7 | `viewDelivery` empty fetch block | app.js | 3953 | Low–Medium |
| 8 | `searchSupportService` unsafe null wrap | app.js | 4457 | Low–Medium |
| 9 | Error toasts suppressed after 2s idle | app.js | 58 | Low |