(function () {
    const Database = function(name) {
        this.name = name;
        this.db = null;
    }

    Database.prototype = {
        open: function(table, key, indexes) {
            this.key = key;

            const version = 7;
            const request = indexedDB.open(this.name, version);

            const that = this;
            return new Promise((resolve, reject) => {
                request.onerror = e => {
                    console.log("Problem opening DB", e.target.error);
                    resolve(false); 
                }

                request.onupgradeneeded = e => {
                    that.db = e.target.result;

                    const transaction = e.target.transaction;
                    const deletionPromises = [];

                    // delete all temp tables
                    for (let name of Object.values(that.db.objectStoreNames)) {
                        console.log(name, name.includes("temp"));
                        if (name.includes("temp")) {
                            const deletionPromise = new Promise((resolve, reject) => {
                                const deletionRequest = that.db.deleteObjectStore(name);
                                deletionRequest.onsuccess = () => resolve();
                                deletionRequest.onerror = () => reject();
                            });
                            deletionPromises.push(deletionPromise);
                        }
                    }
                
                    Promise.all(deletionPromises)
                        .then(() => {
                            let objectStore;
                            if (that.db.objectStoreNames.contains(table)) {
                                objectStore = transaction.objectStore(table);
                                console.log(key);
                                const newObjectStore = that.db.createObjectStore(table + "_temp"+version, {keyPath: key});
        
                                objectStore.openCursor().onsuccess = e => {
                                    const cursor = e.target.result;
                                    if (cursor) {
                                        newObjectStore.add(cursor.value);
                                        cursor.continue();
                                    }
                                };
        
                                transaction.oncomplete = () => {
                                    try {
                                        that.db.deleteObjectStore(table);
                                        that.db.renameObjectStore(table + "_temp"+version, table);
                                        console.log("Table upgraded");
                                    }
                                    catch (e) {
                                        console.log("Problem upgrading table.", e);
                                    }
                                }
                            }
                            else {
                                if (typeof that.db.openObjectStore !== 'function')
                                    objectStore = that.db.createObjectStore(table, {keyPath: key});
                                else
                                    objectStore = that.db.openObjectStore(table, {keyPath: key});
                                
                                if (indexes)
                                    indexes.forEach(index => objectStore.createIndex(index, [index], {unique: false}));
            
                                transaction.oncomplete = () => console.log("Table created", that.db);
                            }
                        })
                        .catch(() => console.log("Problem deleting temp tables."));
                }

                request.onsuccess = e => {
                    that.db = e.target.result;
            
                    that.db.onerror = e => {
                        console.log("Failed to open.", e.target.error);
                        resolve(false);
                    }
        
                    resolve(true);
                }
            });
        },
        close: function() {
            return new Promise((resolve, reject) => {
                if (this.db) {
                    this.db.close();
                    resolve(true);
                }
                else
                    resolve(false);
            });
        },
        delete: function(table) {
            const request = indexedDB.open(this.name, 1);

            const that = this;
            return new Promise((resolve, reject) => {
                request.onerror = e => {
                    console.log("Problem opening DB", e.target.error);
                    resolve(false); 
                }

                request.onupgradeneeded = e => {
                    that.db = e.target.result;

                    const objectStore = that.db.deleteObjectStore(table);
            
                    objectStore.transaction.oncomplete = () => {
                        console.log(`Table ${table} deleted!`);
                        resolve(true);
                    }
                }
            });
        },
        deleteDB: function() {
            const that = this;

            const request = indexedDB.deleteDatabase(this.name);

            return new Promise((resolve, reject) => {
                request.onerror = e => {
                    console.log("Problem deleting DB.", e.target.error);
                    resolve(false);
                }
            
                request.onsuccess = e => {
                    console.log("DB Deleted");
            
                    that.db.onerror = () => {
                        console.log("Failed to delete.", e.target.error);
                        resolve(false);
                    }

                    resolve(true);
                }

                request.onblocked = () => {
                    // close all connections
                    if (that.db)
                        that.db.close();

                    resolve(true);
                }
            });
        },
        insert: function(table, records) {
            if (this.db) {
                const transaction = this.db.transaction(table, "readwrite");
                const objectStore = transaction.objectStore(table);

                return new Promise((resolve, reject) => {
                    transaction.oncomplete = () => {
                        console.log("All transactions were complete.");
                        chrome.runtime.sendMessage({db: {method: "insert", table: table, saved: records.length, total: records.length}});
                        resolve(true);
                    }
            
                    transaction.onerror = e => {
                        console.log("Problem inserting records.", e.target.error);
                        chrome.runtime.sendMessage({db: {method: "insert", table: table, saved: -1, total: records.length}});
                        resolve(false);
                    }
            
                    let progress = 0;
                    records.forEach(record => {
                        objectStore.put(record);
                        chrome.runtime.sendMessage({db: {method: "insert", table: table, saved: ++progress, total: records.length}});
                    });
                        
                });
            }
        },
        get: function(table, value) {
            if (this.db) {
                const transaction = this.db.transaction(table, "readonly");
                const objectStore = transaction.objectStore(table);
        
                return new Promise((resolve, reject) => {
                    //transaction.oncomplete = () => console.log("All GET transactions were complete.");
            
                    transaction.onerror = () => {
                        console.log("Problem getting records.", e.target.error);
                        resolve(false);
                    }
        
                    let request;
                    if (!Array.isArray(value))
                        request = objectStore.get(value);
                    else
                        request = objectStore.getAll([value]);
            
                    request.onsuccess = () => resolve(request.result);
                });
            }
        },
        getAll: function(table, index, values, flat) {
            if (this.db) {
                const transaction = this.db.transaction(table, "readonly");
                const objectStore = transaction.objectStore(table);
        
                return new Promise((resolve, reject) => {
                    //transaction.oncomplete = () => console.log("All GET transactions were complete.");
            
                    transaction.onerror = () => {
                        console.log("Problem getting records.", e.target.error);
                        resolve(false);
                    }
                    
                    let request;
                    if (!index)
                        request = objectStore.getAll();
                    else {
                        // if single value
                        if (!Array.isArray(values))
                            request = objectStore.index(index).getAll([values]);
                        else {
                            let queries = [];
                            // if primary key
                            if (index == "id")
                                queries = values.map(value => this.get(table, value));
                            else
                                queries = values.map(value => this.getAll(table, index, value));
                            
                            Promise.all(queries).then(result => {
                                let response;
                                if (flat)
                                    response = result.flat(1);
                                else
                                    response = result.reduce((acc, results, i) => ({...acc, [values[i]]: results}), {});
                                
                                resolve(response);
                            });
                        }
                    }

                    if (request)
                        request.onsuccess = () => resolve(request.result);
                });
            } 
        },
        update: function(table, record) {
            if (this.db) {
                const transaction = this.db.transaction(table, "readwrite");
                const objectStore = transaction.objectStore(table);
        
                return new Promise((resolve, reject) => {
                    transaction.oncomplete = () => {
                        resolve(true);
                    }
            
                    transaction.onerror = () => {
                        console.log("Problem updating records.", e.target.error);
                        resolve(false);
                    }
            
                    objectStore.put(record);
                });
            }
        },
        remove: function(table, email) {
            if (this.db) {
                const transaction = this.db.transaction(table, "readwrite");
                const objectStore = transaction.objectStore(table);
        
                return new Promise((resolve, reject) => {
                    transaction.oncomplete = () => {
                        resolve(true);
                    }
            
                    transaction.onerror = () => {
                        console.log("Problem deleting records.", e.target.error);
                        resolve(false);
                    }
            
                    objectStore.delete(email);
                });
            }
        },
        count: function(table) {
            if (this.db) {
                const transaction = this.db.transaction(table, "readonly");
                const objectStore = transaction.objectStore(table);

                return new Promise((resolve, reject) => {
                    transaction.oncomplete = () => console.log("All COUNT transactions were complete.");
            
                    transaction.onerror = () => {
                        console.log("Problem counting records.", e.target.error);
                        resolve(false);
                    }
            
                    let request = objectStore.count();
            
                    request.onsuccess = () => resolve(request.result);
                });
            }
        }
    }

    if (typeof window !== 'undefined')
        window.Database = Database;
    else
        self.Database = Database;
}());