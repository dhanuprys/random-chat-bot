import wa from '@open-wa/wa-automate'; 
import startApp from './app.js';

wa.create({
    restartOnCrash: true,
    skipUpdateCheck: true
}).then(startApp);