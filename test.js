import lowdb from "./storage.js";

lowdb().then(async (db) => {
    await db.read();
    console.log(db.data);

    await db.write();
});
