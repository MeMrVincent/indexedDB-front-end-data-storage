# IndexedDB フロントエンドデータストレージ (日本語)

**著者**: Vincent  
**バージョン**: V3

🌍 [English](README.md) | [简体中文](README.ZH.md) | 日本語

本コンポーネントは、IndexedDB を使用した軽量なフロントエンドデータストレージおよび状態永続化モジュールです。Vue、React、Angular などの主要なフロントエンドフレームワークに対応しており、ルーターのライフサイクルと深度バインドできます。

---

### 📖 開発ストーリー

2020年当時、私はある企業でフロントエンドリーダーを務めていました。その時、PC側で複数の業務に対応する一連の管理サブシステムを運営していました。時間的な制約から、これらのサブシステムをすぐに統一された SaaS プラットフォームにマージすることができず、各システム间でのデータ交換は `localStorage` を介して一時的に解決するしかありませんでした。

表面上はこれでログイン問題は解決するように見えましたが、実際にはそうではありませんでした。`localStorage` はユーザーの Token 共有こそ解決できたものの、大量のユーザー業務情報の永続化ストレージとしては使えませんでした。ユーザーデータが増加すると、`localStorage` は 5MB の単一ドメインの容量制限によって古いデータを破棄し、直近のデータのみを保存してしまうためです。また、当時は Vue2 バージョンの Vuex でユーザー情報を保持していましたが、アプリケーションをリロードするとすべてのデータが再初期化されてしまい、本当の意味での永続化が実現できませんでした。

この問題を解決するため、私は IndexedDB を用いた解決策を思いつきました。その後、システムのアップグレードプロジェクトの実施に伴い、この IndexedDB ストレージのアイデアを無事に導入・実用化し、複数サブシステム間での高並列・大容量データキャッシュとリロードの課題を解決しました。その後、2022年に GameFi（チェーンゲーム）プロジェクトに携わるようになり、本コンポーネントをさらに再構築・アップグレードして、現在の強力な V3 バージョンへと進化させました。

---

## 🌟 主な機能 (V3 アップグレード)

1. **Promise & Callback 双方向モードのサポート**：モダンな ES6 非同期 `async/await` (Promise) 呼び出しと、従来の Node スタイルコールバック (Callback) の両方を完全にサポート。新規・既存のいずれのプロジェクトにもシームレスに組み込めます。
2. **構造化クローン (Structured Clone) のサポート**：デフォルトのコピーアルゴリズムとして `structuredClone` を採用。バイナリ大容量ファイル (`Blob`、`File`、`ArrayBuffer`)、日付オブジェクト (`Date`)、正規表現オブジェクト (`RegExp`) などを JSON シリアル化の制限なしで IndexedDB に直接保存できます。
3. **初期接続時の高並列依存キュー**：内部で `_dep_` コールバック依存通知プールを管理。データベース接続が完全に確立する前に発行されたすべての操作コマンドを自动的にキューにバッファリングし、接続後に順次実行することで、起動時の競合エラーを完全に防ぎます。
4. **高精度レコード＆プレフィックスルーター削除**：特定のルーターキーレコード (`route + '.' + key`) の削除、指定した親ルート下の全キーのプレフィックス削除、またはデータベース（テーブル）全体のクリアに対応。

---

## 📂 バージョンの選択 (2つのコントローラーファイルを提供)

本リポジトリは、同一の `$idb.js` コアエンジンを共有する2つの異なるビジネス用途向けのコントローラーを提供します：

### 1. ルーター版 (`$indexedDB.route.js`)
クライアントのルーターおよび名前空間と密接に連携します。`route + '.' + key` という複合キーを使用してデータを一意に管理します。
*   **最適な用途**：サブシステム間のデータの整合性調整、ルーターパスに対応した状態永続化、ページレベルのキャッシュ管理など。

### 2. DIY 版 (`$indexedDB.diy.js`)
高度に最適化された、設定不要のカスタム Key-Value 極速ストレージ版です。カスタムキーに直接データを読み書きできます。**`parent`（データテーブル名）を省略した場合、デフォルトで `'table'` テーブルに保存されます**。
*   **最適な用途**：グローバルトークンのキャッシュ、グローバル設定、Blob形式の画像バイナリデータの高速保存など。

---

## 💻 サンプルコードと API 規定

### 方案 A：DIY 版 (`$indexedDB.diy.js`)

#### インポート
```javascript
import $indexedDB from './$indexedDB.diy.js';
```

#### データの保存 / 更新 (テーブル名を省略 $\rightarrow$ デフォルトの `'table'` に保存)
```javascript
// Promise モード (テーブル名省略で即座に保存)
await $indexedDB.set('myCustomKey', {
  name: 'Vincent',
  createdAt: new Date(),
  blobImg: imgBlob // 構造化クローンにより、バイナリファイルも直接保存可能！
});

// Promise モード (データテーブル名を指定して保存)
await $indexedDB.set('customStoreTable', 'myCustomKey', valueData);

// Callback モード
$indexedDB.set('myCustomKey', valueData, (res) => { ... });
```

#### データの取得
```javascript
// Promise モード (デフォルトの 'table' から取得)
const user = await $indexedDB.get('myCustomKey');

// Promise モード (指定したテーブルから取得)
const config = await $indexedDB.get('customStoreTable', 'myCustomKey');
```

#### データの削除
```javascript
// デフォルトの 'table' から特定のキーのレコードを削除
await $indexedDB.delete('myCustomKey');

// 指定したテーブルから特定のキーのレコードを削除
await $indexedDB.delete('customStoreTable', 'myCustomKey');

// 指定したテーブル全体をクリア
await $indexedDB.delete('customStoreTable', null);

// デフォルトの 'table' テーブル全体をクリア
await $indexedDB.delete();
```

---

### 方案 B：ルーター版 (`$indexedDB.route.js`)

#### インポート
```javascript
import $indexedDB from './$indexedDB.route.js';
```

#### データの書き込み / 更新 (`set`)
```javascript
// Promise モード
await $indexedDB.set('constantApp', 'user.profile', 'info', { name: 'Vincent' });

// Callback モード
$indexedDB.set('constantApp', 'user.profile', 'info', { name: 'Vincent' }, (res) => { ... });
```

#### データの取得 (`get`)
```javascript
// Promise モード
const profile = await $indexedDB.get('constantApp', 'user.profile', 'info');

// Callback モード
$indexedDB.get('constantApp', 'user.profile', 'info', (res) => {
  console.log(res.data);
});
```

#### データの削除
```javascript
// 特定のキーのレコードを削除
await $indexedDB.delete('constantApp', 'user.profile', 'info');

// 親ルーターのプレフィックスに一致する全レコードを削除 (例：'user.profile' で始まる全キャッシュを削除)
await $indexedDB.delete('constantApp', 'user.profile');

// 数据テーブル全体をクリア
await $indexedDB.delete('constantApp');
```

---

## 📜 ライセンス
このプロジェクトは [MIT License](LICENSE) のライセンスの下で提供されています。
