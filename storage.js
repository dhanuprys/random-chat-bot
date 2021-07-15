import fs from 'fs';
import { Low } from 'lowdb';
import { encrypt, decrypt } from './enc.js';

class EncryptionAdapter {
    constructor(filename) {
        this._filename = filename;
    }

    read() {
        return new Promise((resolve, reject) => {
            fs.readFile(this._filename, (error, payload) => {
                payload = decrypt(payload.toString('ascii'));
                
                if (error) {
                    reject(error);
                }

                if (payload === '') {
                    resolve({});
                    return;
                }
                
                resolve(
                    JSON.parse(payload)
                );
            });
        });
    }

    write(payload) {
        return new Promise((resolve, reject) => {
            fs.writeFile(this._filename, encrypt(JSON.stringify(payload, null, 0)), () => {
                resolve(true);
            });
        });
    }
}

const adapter = new EncryptionAdapter('./db.enc');
const db = new Low(adapter);

async function connect() {
    await db.read();

    if (db.data === null || JSON.stringify(db.data) === '{}') {
        db.data = {
            users: [],
            active: [],
            couple: {},
            finding: []
        };

        await db.write();
    }

    return db;
}

export default connect;

