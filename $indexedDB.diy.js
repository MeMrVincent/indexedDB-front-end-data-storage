import $idb from './$idb';

const $indexedDB = {
  copy(obj) {
    if (obj === undefined || obj === null) return obj;
    try {
      if (typeof structuredClone === 'function') {
        return structuredClone(obj);
      }
      return JSON.parse(JSON.stringify(obj));
    } catch (e) {
      return obj;
    }
  },
  get(parent, key, fn) {
    let targetParent = parent;
    let targetKey = key;
    let targetFn = fn;

    // Handle overload: get(key, fn) or get(key)
    if (typeof targetKey === 'function') {
      targetFn = targetKey;
      targetKey = targetParent;
      targetParent = 'table';
    } else if (targetKey === undefined) {
      targetKey = targetParent;
      targetParent = 'table';
    }

    if (typeof targetFn !== 'function') {
      return new Promise((resolve, reject) => {
        $indexedDB.init('get', targetParent, targetKey, null, (res) => {
          if (res.ok) resolve(res.data);
          else reject(res);
        });
      });
    }
    $indexedDB.init('get', targetParent, targetKey, null, targetFn);
  },
  set(parent, key, value, fn) {
    let targetParent = parent;
    let targetKey = key;
    let targetValue = value;
    let targetFn = fn;

    // Handle overload: set(key, value, fn) or set(key, value)
    if (typeof targetValue === 'function') {
      targetFn = targetValue;
      targetValue = targetKey;
      targetKey = targetParent;
      targetParent = 'table';
    } else if (targetValue === undefined) {
      targetValue = targetKey;
      targetKey = targetParent;
      targetParent = 'table';
    }

    if (Array.isArray(targetValue)) {
      targetValue = [...targetValue];
    } else if (typeof targetValue === 'object' && targetValue !== null) {
      targetValue = $indexedDB.copy(targetValue);
    }

    if (typeof targetFn !== 'function') {
      return new Promise((resolve, reject) => {
        $indexedDB.init('update', targetParent, targetKey, targetValue, (res) => {
          if (res.ok) resolve(res);
          else reject(res);
        });
      });
    }
    $indexedDB.init('update', targetParent, targetKey, targetValue, targetFn);
  },
  /** parent: Required/Optional, delete target table; key: Optional, delete route key; fn: Optional **/
  delete(parent, key, fn) {
    let targetParent = parent;
    let targetKey = key;
    let targetFn = fn;

    // Handle overload: delete(fn)
    if (typeof targetParent === 'function') {
      targetFn = targetParent;
      targetParent = 'table';
      targetKey = null;
    }
    // Handle overload: delete(key, fn)
    else if (typeof targetKey === 'function') {
      targetFn = targetKey;
      targetKey = targetParent;
      targetParent = 'table';
    }
    // Handle overload: delete(key)
    else if (targetKey === undefined) {
      if (targetParent) {
        targetKey = targetParent;
        targetParent = 'table';
      } else {
        // delete() -> clear default table 'table'
        targetParent = 'table';
        targetKey = null;
      }
    }

    if (typeof targetFn !== 'function') {
      return new Promise((resolve, reject) => {
        $indexedDB.init('delete', targetParent, targetKey, null, (res) => {
          if (res.ok) resolve(res);
          else reject(res);
        });
      });
    }
    $indexedDB.init('delete', targetParent, targetKey, null, targetFn);
  },
  cb(type, res, fn) {
    if (type === 'get') {
      if (res.ok) {
        if (res.data && res.data.length === 0) {
          res = {
            ok: false,
            data: null,
          }
        } else if (res.data && res.data.length > 0) {
          res.data = res.data[0].data;
        }
      }
    }
    if (type === 'update') {
      if (Array.isArray(res)) {
        res = {
          ok: true,
          data: null,
        }
      }
    }
    return fn && fn(res);
  },
  init(type, parent, key, value, fn) {
    // In DIY version, key acts directly as the target index (no dot routing is prepended)
    let keyPath = key; 
    $idb.init(parent).then(x => {
      /**add table key**/
      if (type === 'set') {
        x.insert({
          tableName: parent,
          data: [{
            id: new Date().valueOf(),
            route: keyPath,
            data: value,
          }],
          success: () => {
            $indexedDB.cb(type, {
              ok: true,
              data: null,
            }, fn);
          },
          error: msg => {
            $indexedDB.cb(type, {
              ok: false,
              data: null,
              msg,
            }, fn);
          },
        });
      }
      /**get table key**/
      if (type === 'get') {
        x.query({
          tableName: parent,
          condition: item => item.route === keyPath,
          success: res => {
            if (res.ok === false && res.data === null) {
              $indexedDB.init('set', parent, key, {}, fn);
            }
            if (res.ok) {
              if (res.data.length > 0) {
                $indexedDB.cb(type, res, fn);
              } else {
                $indexedDB.init('set', parent, key, {}, fn);
              }
            }
          },
          error: msg => {
            $indexedDB.cb(type, {
              ok: false,
              data: null,
              msg,
            }, fn);
          },
        });
      }
      /**update table key**/
      if (type === 'update') {
        x.update({
          tableName: parent,
          condition: item => item.route === keyPath,
          params: { type, parent, key, value, fn },
          handle: r => {
            r.data = value;
          },
          success: res => {
            $indexedDB.cb(type, res, fn);
          },
          error: msg => {
            $indexedDB.init('set', parent, key, value, fn);
          },
        });
      }
      /**delete table key**/
      if (type === 'delete') {
        if (!parent) {
          return false;
        }
        if (!key) {
          x.delTable({
            tableName: parent,
            success: res => {
              if (fn) {
                $indexedDB.cb(type, res, fn);
              }
            },
            error: msg => {
              $indexedDB.cb(type, {
                ok: false,
                data: null,
                msg,
              }, fn);
            },
          });
        } else {
          x.delete({
            tableName: parent,
            condition: item => item.route === keyPath,
            success: res => {
              if (fn) {
                $indexedDB.cb(type, res, fn);
              }
            },
            error: msg => {
              $indexedDB.cb(type, {
                ok: false,
                data: null,
                msg,
              }, fn);
            },
          });
        }
      }
    },
    err => {
      $indexedDB.cb(type, {
        ok: false,
        data: null,
        err,
      }, fn);
    });
  },
};

export default $indexedDB;
