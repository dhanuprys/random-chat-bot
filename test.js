import wa from '@open-wa/wa-automate';

wa.create({ headless: false }).then(client => {
    setInterval(() => {
        client.sendText('6287776761549@c.us', 'haii');
    }, 5000);
});