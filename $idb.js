/**Referring to the development of IDB-JS, some logic has been fixed, the process has been simplified, and the classification has been expanded**/

export default {
  // You can rely on environment variables (e.g. process.env), or write/change it yourself manually
  version: (typeof process !== 'undefined' && process.env) ? process.env.idbVersion : 1,
  // You can rely on environment variables (e.g. process.env), or write/change it yourself manually
  dbName: (typeof process !== 'undefined' && process.env) ? process.env.sysName : 'sys_db',
  indexedDB: window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB,
  IDBTransaction: window.IDBTransaction || window.webkitIDBTransaction || window.msIDBTransaction,
  IDBKeyRange: window.IDBKeyRange || window.webkitIDBKeyRange || window.msIDBKeyRange,
  /**change it yourself, alternatively, you can dynamically create**/
  tables: [
  {
    tableName: 'constantApp', /**ID is the timestamp, key is the name to be searched for, and data is the storage object**/
    option: { keyPath: 'id', autoIncrement: true },
    indexs: [{ key: 'route', option: { unique: true } }, { key: 'data' }],
  },
  {
    tableName: 'table', /**Default table for DIY version custom key-value storage**/
    option: { keyPath: 'id', autoIncrement: true },
    indexs: [{ key: 'route', option: { unique: true } }, { key: 'data' }],
  }],
  _status: null,
  tableName: '',
  TDB: {
    db: null,
    idb: null,
    _dep_: {
      deps: [],
      add(element) {
        this.deps.push(element);
      },
      notify() {
        for (let i = 0; i < this.deps.length; i++) {
          this.deps[i]();
        }
        this.deps.length = 0;
      },
    },
    open(parent, ops) {
      let success = () => {}, error = () => {};

      if (ops) {
        success = ops.success ? ops.success : success;
        error = ops.error ? ops.error : error;
      }

      /**Add a table before opening it**/
      if (parent.tables.length === 0 && !parent._status) {
        //alert("Must add a table using add_table before opening");
        console.log('System Error db');
        return;
      }

      if (typeof success !== 'function') {
        //alert("Success in open must be a function type");
        console.log('System Error db');
        return;
      }

      const request = parent.indexedDB.open(parent.dbName, parent.version);

      request.onerror = (e) => {
        error(e.currentTarget.error.message);
      };

      request.onsuccess = (e) => {
        this.db = e.target.result;
        success(this.db);
        this._dep_.notify();
      };

      request.onupgradeneeded = (e) => {
        this.idb = e.target.result;
        for (let i = 0; i < parent.tables.length; i++) {
          this.createTable(this.idb, parent.tables[i]);
        }
        this.createTable(this.idb, { tableName: parent.tableName });
      };
    },
    /**Create Table**/
    createTable(idb, { tableName, option, indexs = [] }) {
      if (!idb.objectStoreNames.contains(tableName)) {
        let store = idb.createObjectStore(tableName, option);
        for (let indexItem of indexs) {
          this.createIdx(store, indexItem);
        }
      }
    },
    /**Create Table Index**/
    createIdx(store, { key, option }) {
      store.createIndex(key, key, option);
    },
    /**Create an instance**/
    createTransaction(tableName, mode = 'readwrite') {
      if (!tableName || !mode) {
        //alert("in createTransaction,tableName and mode is required");
        console.log('System Error db');
      }
      if (!this.db.objectStoreNames.contains(tableName)) {
        return { ok: false, data: null }
      }
      const transaction = this.db.transaction(tableName, mode);
      return transaction.objectStore(tableName);
    },
    /**query**/
    query({ tableName, condition, success = () => {} }) {
      if (typeof success !== 'function') {
        //alert("Success in the query method must be of type Function");
        console.log('System Error db');
        return;
      }

      if (typeof condition !== 'function') {
        //alert("in query,condition is required,and type is function");
        console.log('System Error db');
        return;
      }
      const handler = () => {
        let res = [];
        let result = this.createTransaction(tableName, 'readwrite');
        if (result.ok === false && result.data === null) {
          this.createTable(this.idb, { tableName });
          return success && success(result);
        } else {
          result.openCursor().onsuccess = e =>
            this.cursorSuccess(e, {
              condition,
              handler: ({ currentValue }) => res.push(currentValue),
              over: () => success({ ok: true, data: res }),
            });
        }
      };

      this.handleAction(handler);
    },
    /**Insert Table Data**/
    insert({ tableName, data, success = () => {} }) {
      if (!(Array.isArray(data) || data instanceof Object)) {
        //alert("in insert，data type is Object or Array");
        console.log('System Error db');
        return;
      }

      if (typeof success !== 'function') {
        //alert("Success in the insert method must be of type Function");
        console.log('System Error db');
        return;
      }

      this.handleAction(() => {
        const store = this.createTransaction(tableName, 'readwrite');
        Array.isArray(data) ? data.forEach(v => store.put(v)) : store.put(data);
        success();
      });
    },
    /**update table date**/
    update({ tableName, condition, params, handle, success = () => {}, error = () => {} }) {
      //console.log(tableName, params)
      if (typeof handle !== 'function') {
        //alert("in update,handle must be of type Function");
        console.log('System Error db');
        return;
      }

      if (typeof success !== 'function') {
        //alert("in update,success must be of type Function");
        console.log('System Error db');
        return;
      }

      if (typeof condition !== 'function') {
        //alert("in update,condition is required, and type is function");
        console.log('System Error db');
        return;
      }

      const handler = () => {
        let res = [];
        this.createTransaction(tableName, 'readwrite').openCursor().onsuccess = (e) =>
          this.cursorSuccess(e, {
            condition,
            handler: ({ currentValue, cursor }) => {
              handle(currentValue);
              res.push(currentValue);
              cursor.update(currentValue);
            },
            over: () => {
              if (res.length === 0) {
                /**Update unsuccessful, directly insert data**/
                this.insert({
                  tableName,
                  data: [{
                    id: new Date().valueOf(),
                    route: params.route + '.' + params.key,
                    data: params.value,
                  }],
                  success: () => {
                    success(res);
                  },
                  error: msg => {
                    error(msg);
                  },
                });
                return;
              }
              success(res);
            },
          });
      };
      this.handleAction(handler);
    },
    /**delete records by condition**/
    delete({ tableName, condition, success = () => {}, error = () => {} }) {
      if (typeof condition !== 'function') {
        console.log('System Error db');
        return;
      }
      const handler = () => {
        let deletedCount = 0;
        this.createTransaction(tableName, 'readwrite').openCursor().onsuccess = (e) =>
          this.cursorSuccess(e, {
            condition,
            handler: ({ cursor }) => {
              cursor.delete();
              deletedCount++;
            },
            over: () => {
              success({ ok: true, deletedCount });
            },
          });
      };
      this.handleAction(handler);
    },
    /**delete a table by table Name**/
    delTable({ tableName, success = () => {} }) {
      this.handleAction(() => {
        this.createTransaction(tableName, 'readwrite').clear();
        success();
      });
    },
    /**Unified handling of events**/
    handleAction(handler) {
      const action = () => {
        handler();
      };
      // If DB does not exist, add a dependency
      if (!this.db) {
        this._dep_.add(action);
      } else {
        action();
      }
    },
    /**return result**/
    cursorSuccess(e, { condition, handler, over }) {
      const cursor = e.target.result;
      if (cursor) {
        const currentValue = cursor.value;
        if (condition(currentValue)) {
          handler({ cursor, currentValue });
        }
        cursor.continue();
      } else {
        over();
      }
    },
  },
  /**init**/
  init(app, tableName) {
    this.tableName = app;
    let _this = this;
    return new Promise((resolve, reject) => {
      _this.TDB.open(_this, {
        success: () => {
          //console.log(`db has been opened`);
          resolve(_this.TDB);
        },
        error: err => {
          reject(err);
          //_this.TDB.db.close();
        },
      });
    });
  },
};
