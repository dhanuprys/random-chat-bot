import PQueue from 'p-queue';
import arrayShuffle from "array-shuffle";
import Filter from "./filter.js";
import commands from "./commands.js";
import messageList from "./message.js";
import lowdb from "./storage.js";

const queue = new PQueue({
    concurrency: 5,
    autoStart: false
});

function isAGroup(userNumber) {
    return /^[0-9]+\-[0-9]/.test(userNumber);
}

async function isActiveUser(sender) {
    const db = await lowdb();

    return db.data.active.indexOf(sender) !== -1 ? true : false;
}

async function isUserFinding(sender) {
    const db = await lowdb();

    return db.data.finding.indexOf(sender) !== -1 ? true : false;
}

async function addToActiveUser(sender) {
    const db = await lowdb();

    if (!(await isActiveUser(sender))) {
        db.data.active.push(sender);
        await db.write();
    }
}

async function removeFromActiveUser(sender) {
    const db = await lowdb();
    await db.read();

    db.data.active = db.data.active.filter((dt) => dt !== sender);
    await db.write();
}

async function addToFinding(sender) {
    const db = await lowdb();
    await db.read();

    if (db.data.finding.indexOf(sender) === -1) {
        db.data.finding.push(sender);
        await db.write();
    }
}

async function addToCoupleList(p1, p2) {
    const db = await lowdb();

    db.data.couple[p1] = p2;

    if (db.data.couple[p2] === undefined) {
        db.data.couple[p2] = p1;
    }

    await db.write();
}

async function getCouple(userId) {
    const db = await lowdb();

    return db.data.couple[userId] || null;
};

async function removeCouple(p1) {
    const db = await lowdb();

    if (db.data.couple[p1] !== undefined) {
        const me = p1;
        const p2 = db.data.couple[p1];

        delete db.data.couple[me];
        if (db.data.couple[p2] !== undefined) {
            delete db.data.couple[p2];
        }

        await db.write();
    }
}

async function removeFromFinding(sender) {
    const db = await lowdb();
    await db.read();

    db.data.finding = db.data.finding.filter((dt) => dt !== sender);
    await db.write();
}

async function checkUserAvaibility(sender) {
    const db = await lowdb();
    await db.read();

    if (db.data.users.indexOf(sender) === -1) {
        return false;
    }

    return true;
}

function sayHelloToNewGroup(client, notification) {
    setTimeout(() => {
        client.sendText(notification.id.remote, messageList.sayHelloInGroup);
    }, 3000);
}

async function switchCommand({ client, message }) {
    const command = Filter.parseCommand(message.body);
    const sender = message.from;
    const sendMessage = (...args) => queue.add(() => client.sendText(...args));

    switch (command) {
        case commands.HELP:
        case commands.START:
            sendMessage(sender, messageList.help);
            break;
        case commands.REGISTER:
            const db = await lowdb();
            await db.read();

            // Jika user belum terdaftar
            if (db.data.users.indexOf(sender) !== -1) {
                sendMessage(sender, messageList.userHasRegistered);
                break;
            }

            db.data.users.push(sender);
            await db.write();

            await sendMessage(sender, messageList.thanksForRegistering);

            break;
        default: {
            if (!(await checkUserAvaibility(sender))) {
                sendMessage(sender, messageList.notRegisteredYet);
                return;
            }

            const findFriend = async () => {
                if (await isActiveUser(sender)) {
                    sendMessage(sender, messageList.youreInAConversation);
                    return;
                }

                await sendMessage(sender, messageList.findingFriend);

                await addToFinding(sender);
                const db = await lowdb();
                let friendFounded = false;
                let friendNumber = null;

                for (const user of arrayShuffle(db.data.finding)) {
                    if (user === sender) {
                        continue;
                    }

                    friendFounded = true;
                    friendNumber = user;

                    break;
                }

                if (!friendFounded) {
                    sendMessage(sender, messageList.noUserActive);
                    return;
                }

                await removeFromFinding(sender);
                await removeFromFinding(friendNumber);

                await addToCoupleList(sender, friendNumber);
                await addToActiveUser(sender);
                await addToActiveUser(friendNumber);
                await db.write();

                sendMessage(sender, messageList.friendFounded);
                sendMessage(sender, messageList.sayHello);
                sendMessage(friendNumber, messageList.friendFounded);
                sendMessage(friendNumber, messageList.sayHello);
            };

            const stopChat = async () => {
                if (!(await isActiveUser(sender))) {
                    sendMessage(sender, messageList.youreNotInAConversation);
                    return;
                }

                const couple = await getCouple(sender);

                await sendMessage(sender, messageList.closingConversation);

                await removeCouple(sender);
                await removeFromActiveUser(sender);
                await removeFromActiveUser(couple);

                sendMessage(sender, messageList.conversationClosed);
                sendMessage(couple, messageList.friendLeft);
            };

            switch (command) {
                case commands.FIND:
                    await findFriend();

                    break;
                case commands.CANCEL_ACTION:
                    if (!(await isUserFinding(sender))) {
                        client.sendText(sender, messageList.youreNotInAnAction);
                        return;
                    }

                    await removeFromFinding(sender);
                    await removeFromActiveUser(sender);

                    client.sendText(sender, messageList.actionCancel);
                    break;
                case commands.SKIP:
                    if (!(await isActiveUser(sender))) {
                        client.sendText(sender, messageList.youreNotInAConversation);
                        return;
                    }

                    await stopChat();
                    await findFriend();

                    break;
                case commands.STOP:
                case commands.CLOSE:
                case commands.DISCONNECT:
                    await stopChat();

                    break;
                case commands.REPORT:
                    break;
            }
        }
    }
}

async function processMessage(client, message) {
    client.sendSeen(message.from);
    
    if (isAGroup(message.from)) {
        return null;
    }

    if (Filter.isCommand(message.body)) {
        switchCommand({ client, message });
        return null;
    }

    if (!(await isActiveUser(message.from))) {
        client.sendText(message.from, messageList.shortHelp);
        return null;
    }

    const couple = await getCouple(message.from);
    client.sendText(couple, message.body);
}

async function startApp(client) {
    // client.on('qr', qr => {
    //     qrcode.generate(qr, { small: true });
    // });

    // client.on("ready", () => {
    //     console.log("Client started");
    // });

    // client.on("group_join", (n) => sayHelloToNewGroup(client, n));
    // client.on("group_update", (n) => sayHelloToNewGroup(client, n));

    for (const message of (await client.getAllUnreadMessages())) {
        if (message.from === '6282145277488@c.us') {
            continue;
        }

        queue.add(() => processMessage(client, message));
    }

    client.onMessage(message => processMessage(client, message));
    queue.start();
}

export default startApp;
