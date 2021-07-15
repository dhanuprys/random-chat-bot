export function encrypt(text) {
    return Buffer.from(text).toString('hex');
}

export function decrypt(text) {
    return Buffer.from(text, 'hex').toString('ascii');
}
