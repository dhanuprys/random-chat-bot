class Filter {
    static isCommand(message) {
        return (/^\/[a-z]+/).test(message);
    }

    static parseCommand(message) {
        return message
            .replace(/^\//, '')
            .split(' ')[0] || '';
    }
}

export default Filter;