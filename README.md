# IndexedDB Front-End Data Storage

**Author**: Vincent  
**Version**: V3

🌍 English | [简体中文](README.ZH.md) | [日本語](README.JA.md)

A lightweight web component for data storage and state persistence using IndexedDB. Applicable to all modern front-end frameworks (Vue, React, Angular, etc.) and deeply integrable with router lifecycles.

---

### About this Component
In 2020, I was working as a front-end lead. We managed a series of PC-based subsystems corresponding to different business areas. We could only exchange data between these systems via `localStorage`.

However, as business data grew, the limitations of `localStorage` became apparent: it only has a 5MB storage limit, discarding older data when capacity is reached. Furthermore, state management engines like Vuex (Vue 2) reinitialized data upon page refreshes, preventing true computation persistence. 

To resolve this, I came up with the idea of using IndexedDB. Later, during a system upgrade project, I successfully implemented and deployed this IndexedDB storage architecture, resolving high-concurrency and large-scale data caching bottlenecks across multiple subsystems. In 2022, I entered the GameFi space and further refactored and upgraded this component, which eventually evolved into this powerful V3 version.

---

## 🌟 Key Features (V3 Upgrades)

1. **Promise & Callback Dual Mode**: Supports both standard Node-style callbacks and native Promise-based `async/await` syntax.
2. **Structured Clone Support**: Uses `structuredClone` as the default copying algorithm. You can now store binary objects (`Blob`, `File`, `ArrayBuffer`), `Date` objects, and regular expressions (`RegExp`) directly without serialization limits.
3. **Advanced Isolated Transaction Queue**: Employs an internal dependency pool (`_dep_`) that buffers queries and execution steps before database connections are fully opened, preventing concurrency race conditions during initial loads.
4. **Precise Record & Prefix Route Deletes**: Supports deleting specific table routes (`route + '.' + key`), clearing specific parent routes (`route` and its child structures), or wiping out an entire store database.

---

## 📂 Version Selection (2 Sub-Versions Available)

This repository provides two controllers sharing the same `$idb.js` core engine to support different business paradigms:

### 1. Route Version (`$indexedDB.route.js`)
Integrates deeply with client routing and namespaces. It stores data using a unique key composed of `route + '.' + key`.
*   **Best Used For**: Subsystems alignment, state preservation mapped directly to router paths, page-to-page state caches.

### 2. DIY Version (`$indexedDB.diy.js`)
A highly optimized, zero-friction custom Key-Value store. It supports saving values under custom keys directly. If table name (`parent`) is omitted, it defaults to the table `'table'`.
*   **Best Used For**: Storing global tokens, custom local settings, binary profiles, and quick Key-Value persists.

---

## 💻 Example & API Usage

### Version A: DIY Version (`$indexedDB.diy.js`)

#### Import
```javascript
import $indexedDB from './$indexedDB.diy.js';
```

#### Set Data (Omitted Table Name $\rightarrow$ Defaults to `'table'`)
```javascript
// Promise Mode (One-click default table)
await $indexedDB.set('myCustomKey', {
  name: 'Vincent',
  createdAt: new Date(),
  blobImg: imgBlob // Structured clone binary supported!
});

// Promise Mode (Custom table name)
await $indexedDB.set('customStoreTable', 'myCustomKey', valueData);

// Callback Mode
$indexedDB.set('myCustomKey', valueData, (res) => { ... });
```

#### Get Data
```javascript
// Promise Mode (One-click default table)
const user = await $indexedDB.get('myCustomKey');

// Promise Mode (Custom table name)
const config = await $indexedDB.get('customStoreTable', 'myCustomKey');
```

#### Delete Data
```javascript
// Delete a specific key in default table 'table'
await $indexedDB.delete('myCustomKey');

// Delete a specific key in custom table
await $indexedDB.delete('customStoreTable', 'myCustomKey');

// Clear the entire custom table
await $indexedDB.delete('customStoreTable', null);

// Clear the entire default 'table' store
await $indexedDB.delete();
```

---

### Version B: Route Version (`$indexedDB.route.js`)

#### Import
```javascript
import $indexedDB from './$indexedDB.route.js';
```

#### Write / Update Data (`set`)
```javascript
// Promise Mode
await $indexedDB.set('constantApp', 'user.profile', 'info', { name: 'Vincent' });

// Callback Mode
$indexedDB.set('constantApp', 'user.profile', 'info', { name: 'Vincent' }, (res) => { ... });
```

#### Retrieve Data (`get`)
```javascript
// Promise Mode
const profile = await $indexedDB.get('constantApp', 'user.profile', 'info');

// Callback Mode
$indexedDB.get('constantApp', 'user.profile', 'info', (res) => {
  console.log(res.data);
});
```

#### Delete Data
```javascript
// Delete a specific key
await $indexedDB.delete('constantApp', 'user.profile', 'info');

// Delete a parent route namespace (clears all starting with 'user.profile')
await $indexedDB.delete('constantApp', 'user.profile');

// Clear the entire table
await $indexedDB.delete('constantApp');
```

---

## 📜 License
This project is licensed under the [MIT License](LICENSE).
