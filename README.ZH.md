# IndexedDB 前端数据存储组件 (简体中文)

**作者**: Vincent  
**版本**: V3

🌍 [English](README.md) | 简体中文

本组件是一个轻量级的前端 IndexedDB 数据存储与状态持久化模块。适用于目前所有主流的前端框架（Vue、React、Angular 等），并且能够与路由生命周期进行深度绑定。

---

### 📖 项目背景故事

在 2020 年，我当时在一家公司担任前端负责人。那时我们手头有多个管理系统，简单来说就是 PC 端有一系列对应不同业务的管理系统。因为时间紧迫，我既没有时间将这些系统进行统一重构，也没有时间把它们合并成一个庞大的统一 SaaS 系统（关于如何根据不同业务需求打包 SaaS 系统，我后续会继续放出代码，请保持关注，谢谢）。当时各个子系统之间的数据交换只能通过 `localStorage` 来临时解决。

在表面上这能解决登录问题，但在实际运行中并非如此。`localStorage` 只能解决用户的 Token 共享，而无法解决大量用户业务信息的持久化存储。一旦用户的数据存储量增加，`localStorage` 就会因为 5MB 的单域容量上限而直接丢弃早期的数据，只保留最近的数据。其次，当时基于 Vue2 版本的 Vuex 进行用户状态管理，一旦用户刷新浏览器应用，内存中的所有数据就会全部重新初始化，无法实现真正的持久化计算。

为了解决这个问题，我当时便想到了 IndexedDB，之后在实施项目升级时，成功将这个 IndexedDB 存储想法予以落地实现，解决了多系统间高并发大数据量本地缓存和刷新的难题。之后在 2022 年我开始涉足 GameFi 链游项目，并将此组件进一步重构升级，进而演化出了当前功能强大的 V3 版本。

---

## 🌟 核心特性 (V3 版本升级)

1. **Promise & Callback 双模式兼容**：全面支持现代 ES6 异步 `async/await`（Promise）调用流，同时完美向后兼容原先的 Node-style 回调函数（Callback）机制，新老项目皆可平滑集成。
2. **支持结构化克隆（Structured Clone）**：默认采用 `structuredClone` 算法进行深拷贝。支持将二进制大文件（`Blob`、`File`、`ArrayBuffer`）、日期对象（`Date`）以及正则表达式（`RegExp`）直接存入 IndexedDB，摆脱了 JSON 序列化的限制。
3. **高并发初次连接依赖通知池**：内部集成了 `_dep_` 调度缓存依赖池，在数据库尚未成功打开前，会自动拦截并挂起所有的业务指令，直到连接成功建立后再顺次执行，彻底规避了启动时的并发竞态错误。
4. **支持精准删除与路由前缀删除**：支持清理特定的单条路由键值记录（`route + '.' + key`）、清空特定的父路由前缀下的所有子条目，或者擦除整张数据表。

---

## 📂 版本选择 (提供两套分流控制器)

本仓库提供了两套控制器（它们共享相同的底层 `$idb.js` 驱动引擎）以满足不同的业务开发场景：

### 1. 路由版 (`$indexedDB.route.js`)
与客户端路由和命名空间深度绑定。它通过将路由与键名拼接成唯一索引键 `route + '.' + key` 来存取数据。
*   **适用场景**：多子系统共享对齐、状态数据直接映射到页面路由路径、页面级会话缓存等。

### 2. DIY 版 (`$indexedDB.diy.js`)
高度优化、开箱即用的自定义 Key-Value 极速存储版。它支持直接在自定义键（Key）下读取和写入数据。**若未传入 `parent`（数据表名）参数，内部会自动将其默认存入 `'table'` 表中**。
*   **适用场景**：全局 Token 缓存、全局用户偏好设置、Blob 图像二进制文件缓存等快速键值存取。

---

## 💻 使用示例与 API 规范

### 方案 A：DIY 版 (`$indexedDB.diy.js`)

#### 引入
```javascript
import $indexedDB from './$indexedDB.diy.js';
```

#### 写入 / 更新数据 (缺省表名 $\rightarrow$ 默认存入 `'table'` 表)
```javascript
// Promise 模式 (缺省表名极速写入)
await $indexedDB.set('myCustomKey', {
  name: 'Vincent',
  createdAt: new Date(),
  blobImg: imgBlob // 支持结构化克隆大文件！
});

// Promise 模式 (写入指定名称的数据表)
await $indexedDB.set('customStoreTable', 'myCustomKey', valueData);

// Callback 模式
$indexedDB.set('myCustomKey', valueData, (res) => { ... });
```

#### 读取数据
```javascript
// Promise 模式 (从默认 'table' 表中读取)
const user = await $indexedDB.get('myCustomKey');

// Promise 模式 (从指定的数据表中读取)
const config = await $indexedDB.get('customStoreTable', 'myCustomKey');
```

#### 删除数据 / 库表
```javascript
// 从默认 'table' 表中删除特定的自定义 key 记录
await $indexedDB.delete('myCustomKey');

// 从指定表中删除特定的自定义 key 记录
await $indexedDB.delete('customStoreTable', 'myCustomKey');

// 清空整个指定的表
await $indexedDB.delete('customStoreTable', null);

// 清空默认的整个 'table' 数据表
await $indexedDB.delete();
```

---

### 方案 B：路由版 (`$indexedDB.route.js`)

#### 引入
```javascript
import $indexedDB from './$indexedDB.route.js';
```

#### 写入 / 更新数据 (`set`)
```javascript
// Promise 模式
await $indexedDB.set('constantApp', 'user.profile', 'info', { name: 'Vincent' });

// Callback 模式
$indexedDB.set('constantApp', 'user.profile', 'info', { name: 'Vincent' }, (res) => { ... });
```

#### 读取数据 (`get`)
```javascript
// Promise 模式
const profile = await $indexedDB.get('constantApp', 'user.profile', 'info');

// Callback 模式
$indexedDB.get('constantApp', 'user.profile', 'info', (res) => {
  console.log(res.data);
});
```

#### 删除数据 / 库表
```javascript
// 删除特定 key 记录
await $indexedDB.delete('constantApp', 'user.profile', 'info');

// 删除父级路由前缀下的所有分支记录 (将删除所有以 'user.profile' 开头的缓存)
await $indexedDB.delete('constantApp', 'user.profile');

// 清空整张数据表
await $indexedDB.delete('constantApp');
```

---

## 📜 许可协议
本项目采用 [MIT License](LICENSE) 许可协议。
