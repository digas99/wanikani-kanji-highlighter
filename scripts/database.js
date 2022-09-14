(function () {
    const Database = function(name) {
        this.name = name;
        this.db = null;
    }

    Database.prototype = {
        create: function(table, key, indexes) {
            const request = indexedDB.open(this.name, 1);

            const that = this;
            return new Promise((resolve, reject) => {
                request.onerror = e => {
                    console.log("Problem opening DB", e.target.error);
                    resolve(false); 
                }

                request.onupgradeneeded = e => {
                    that.db = e.target.result;

                    let objectStore = that.db.createObjectStore(table, {keyPath: key});
                    if (indexes)
                        indexes.forEach(index => objectStore.createIndex(index, [index], {unique: false}));

                    objectStore.transaction.oncomplete = () => console.log("Table created", that.db);
                }

                request.onsuccess = e => {
                    that.db = e.target.result;
            
                    console.log("DB Opened", that.db);
            
                    that.db.onerror = e => {
                        console.log("Failed to open.", e.target.error);
                        resolve(false);
                    }
        
                    resolve(true);
                }
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
            const request = indexedDB.deleteDatabase(this.name);

            const that = this;
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
            });
        },
        insert: function(table, records) {
            if (this.db) {
                const transaction = this.db.transaction(table, "readwrite");
                const objectStore = transaction.objectStore(table);

                return new Promise((resolve, reject) => {
                    transaction.oncomplete = () => {
                        console.log("All transactions were complete.");
                        resolve(true);
                    }
            
                    transaction.onerror = e => {
                        console.log("Problem inserting records.", e.target.error);
                        resolve(false);
                    }
            
                    records.forEach(record => objectStore.put(record));
                });
            }
        },
        get: function(table, value) {
            if (this.db) {
                const transaction = this.db.transaction(table, "readonly");
                const objectStore = transaction.objectStore(table);
        
                return new Promise((resolve, reject) => {
                    transaction.oncomplete = () => console.log("All GET transactions were complete.");
            
                    transaction.onerror = () => {
                        console.log("Problem getting records.", e.target.error);
                        resolve(false);
                    }
            
                    let request = objectStore.get(value);
            
                    request.onsuccess = () => resolve(request.result);
                });
            }
        },
        getAll: function(table, index, value) {
            if (this.db) {
                const transaction = this.db.transaction(table, "readonly");
                const objectStore = transaction.objectStore(table);
        
                return new Promise((resolve, reject) => {
                    transaction.oncomplete = () => console.log("All GET transactions were complete.");
            
                    transaction.onerror = () => {
                        console.log("Problem getting records.", e.target.error);
                        resolve(false);
                    }
                    
                    let request;
                    if (!index)
                        request = objectStore.getAll();
                    else
                        request = objectStore.index(index).getAll([value]);

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
                        console.log("All PUT transactions were complete.");
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
                        console.log("All DELETE transactions were complete.");
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