import { Low, JSONFile } from 'lowdb';

const adapter = new JSONFile('./db.json');
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

