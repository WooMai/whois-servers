const list = require('../list.json');
const net = require('net');

const p = [];

for (const [tld, server] of Object.entries(list)) {
    if (server) {
        p.push(whoisLookup(server, `nic.${tld}`).then(() => {
            console.log(`${tld} is OK`)
        }).catch((err) => {
            console.log(`${tld} Error: ${err.message}`)
        }));
    }
}

function whoisLookup(server, query) {
    return new Promise((resolve, reject) => {
        const i = setTimeout(() => {
            reject(new Error('Timeout'));
        }, 15000);

        const client = net.createConnection(43, server, () => {
            client.write(`${query}\r\n`);
        });

        let response = '';

        client.on('data', (data) => {
            response += data.toString();
        });

        client.on('end', () => {
            if (response.trim()) {
                resolve(response);
                clearTimeout(i);
            } else {
                reject(new Error('Empty response'));
                clearTimeout(i);
            }
        });

        client.on('error', (err) => {
            reject(err);
            clearTimeout(i);
        });
    });
}