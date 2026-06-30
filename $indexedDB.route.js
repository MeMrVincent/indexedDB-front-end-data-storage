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
  get(parent, route, key, fn) {
    if (typeof fn !== 'function') {
      return new Promise((resolve, reject) => {
        $indexedDB.init('get', parent, route, key, null, (res) => {
          if (res.ok) resolve(res.data);
          else reject(res);
        });
      });
    }
    $indexedDB.init('get', parent, route, key, null, fn);
  },
  set(parent, route, key, value, fn) {
    if (Array.isArray(value)) {
      value = [...value];
    } else if (typeof value === 'object' && value !== null) {
      value = $indexedDB.copy(value);
    }
    if (typeof fn !== 'function') {
      return new Promise((resolve, reject) => {
        $indexedDB.init('update', parent, route, key, value, (res) => {
          if (res.ok) resolve(res);
          else reject(res);
        });
      });
    }
    $indexedDB.init('update', parent, route, key, value, fn);
  },
  /** parent: Required, delete the table; route: Optional, delete table route; key: Optional, delete table route key; fn: Optional, Some asynchronous dynamic methods that do not require callbacks **/
  delete(parent, route, key, fn) {
    if (!route) {
      key = null;
    }
    if (route) {
      if (typeof route === 'string') {
        if (!key) {
          key = null;
        }
        if (key && typeof key === 'function') {
          fn = key;
          key = null;
        }
      }
      if (typeof route === 'function') {
        fn = route;
        route = null;
        key = null;
      }
    }
    if (fn && typeof fn !== 'function') {
      fn = null;
    }

    if (typeof fn !== 'function') {
      return new Promise((resolve, reject) => {
        $indexedDB.init('delete', parent, route, key, null, (res) => {
          if (res.ok) resolve(res);
          else reject(res);
        });
      });
    }
    $indexedDB.init('delete', parent, route, key, null, fn);
  },
  cb(type, res, fn) {
    if (type === 'get') {
      if (res.ok === false && res.data === null) {
        //  $indexedDB.init('init', parent, route, key, {});
      }
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
  init(type, parent, route, key, value, fn) {
    // console.log(type, parent, route, key, value, fn)
    /**
     * Parent: The main application app, refer to $idb.js;
     * Route: The current route name;
     * Key: The class name of the persistent object;
     * Value: Rewrite key value**/
    let keyPath = route + '.' + key; // Routing+Key Definition KeyPath Uniqueness
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
            //console.log('indexDB ' + parent + ' - ' + route + ' - ' + key + ": add success!");
            $indexedDB.cb(type, {
              ok: true,
              data: null,
            }, fn);
          },
          error: msg => {
            //console.log('indexDB ' + parent + ' - ' + route + ' - ' + key + ": add failed! ");
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
            //console.log('indexDB ' + parent + ' - ' + route + ' - ' + key + ": query success !");
            if (res.ok === false && res.data === null) {
              $indexedDB.init('set', parent, route, key, {}, fn);
            }
            if (res.ok) {
              if (res.data.length > 0) {
                $indexedDB.cb(type, res, fn);
              } else {
                $indexedDB.init('set', parent, route, key, {}, fn);
              }
            }
          },
          error: msg => {
            //debugger
            //console.log('indexDB ' + parent + ' - ' + route + ' - ' + key + ": query failed !");
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
          params: { type, parent, route, key, value, fn },
          handle: r => {
            r.data = value;
          },
          success: res => {
            //console.log('indexDB ' + parent + ' - ' + route + ' - ' + key + ": update success !");
            $indexedDB.cb(type, res, fn);
          },
          error: msg => {
            /** If I update a data but fail, at this time, I change the "update" method to the "set" method, so WHY ?**/
            $indexedDB.init('set', parent, route, key, value, fn);
            return;
            /**
             console.log('indexDB '+parent + ' - ' + route + ' - ' + key + ": update failed !");
             $indexedDB.cb(type, {
                          ok: false,
                          data: null,
                          msg
             }, fn);**/
          },
        });
      }
      /**delete table key, {parent, route, key, value, fn}*/
      if (type === 'delete') {
        if (!parent) {
          //console.log('The deleted table name cannot be empty');
          return false;
        }
        if (!route) {
          x.delTable({
            tableName: parent,
            success: res => {
              //console.log('indexDB - Delete main table - ' + parent + ' - success');
              if (fn) {
                $indexedDB.cb(type, res, fn);
              }
            },
            error: msg => {
              //console.log('indexDB - Delete main table - ' + parent + ' - failed');
              $indexedDB.cb(type, {
                ok: false,
                data: null,
                msg,
              }, fn);
            },
          });
        } else {
          let matchCondition;
          if (key) {
            let targetKeyPath = route + '.' + key;
            matchCondition = item => item.route === targetKeyPath;
          } else {
            matchCondition = item => item.route === route || item.route.indexOf(route + '.') === 0;
          }
          x.delete({
            tableName: parent,
            condition: matchCondition,
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
      //console.log('indexedDB operation failed');
      $indexedDB.cb(type, {
        ok: false,
        data: null,
        err,
      }, fn);
    })
  },
};

export default $indexedDB
