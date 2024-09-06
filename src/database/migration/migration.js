export default class Migration {
    constructor() {
    }

    runMigrateScript(db, data, parameters = {}) {
        return new Promise((resolve, reject) => {
            data = data.replace(/\?\w+/g, (m) => {
                let key = m.substring(1);
                return parameters.hasOwnProperty(key) ? parameters[key] : '';
            });

            db.exec(data, function(err) {
                if (err) {
                    return reject(err);
                }

                db.serialize(() => {
                    db.run('VACUUM', err => {
                        if (err) {
                            console.log('[database] vacuum error', err);
                        }
                        else {
                            console.log('[database] vacuum success');
                        }
                    });
                    db.run('PRAGMA wal_checkpoint(TRUNCATE)', err => {
                        if (err) {
                            console.log('[database] wal_checkpoint error', err);
                        }
                        else {
                            console.log('[database] wal_checkpoint success');
                        }
                    });
                    db.run('PRAGMA optimize', err => {
                        if (err) {
                            console.log('[database] optimize error', err);
                        }
                        else {
                            console.log('[database] optimize success');
                        }
                        resolve();
                    });
                });
            });
        });
    }
}
