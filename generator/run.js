require('json5/lib/register')
const fetch = require('make-fetch-happen');
const net = require('net');
const dns = require('dns/promises');
const fs = require("fs");
const path = require("path");
const punycode = require('punycode/');
const extra = require('./extra.json5');
const overrides = require('./overrides.json5');
const dayjs = require('dayjs');
const prevList = require('../list.json');
const assert = require("assert");

async function main() {
    const TLDs = await getTLDs();
    console.log(TLDs.length, 'TLDs found in IANA')
    let list = {}
    const p = [];
    for (const [index, tld] of TLDs.entries()) {
        try {
            const delay = process.env.QUERY_DELAY ? parseInt(process.env.QUERY_DELAY) : 330;
            await sleep(delay);
            let i = 0;

            async function tryLookup() {
                // catch and retry getWhoisServerFromIANA until it succeeds
                try {
                    await getWhoisServerFromIANA(tld).then(ianaResult => {
                        let whoisServer = ianaResult;

                        // apply extras
                        if (!whoisServer) {
                            whoisServer = extra[tld] || null;
                        }

                        // apply previous list (prevents deleting)
                        if (!whoisServer) {
                            whoisServer = prevList[tld] || null;
                        }

                        // apply overrides
                        if (overrides[tld]) {
                            whoisServer = overrides[tld];
                        }

                        list[tld] = whoisServer;
                        list[punycode.toUnicode(tld)] = whoisServer;
                        console.log(`[${index + 1}/${TLDs.length}]`, tld, whoisServer);
                    })
                } catch (e) {
                    console.error(`[${index + 1}/${TLDs.length}]`, tld, 'error:', e.message, 'retrying...', ++i);
                    await sleep(500);
                    await tryLookup();
                }
            }

            p.push(tryLookup());
        } catch (e) {
            console.error(tld, e);
        }
    }

    await Promise.all(p);

    // sort list by key
    list = Object.fromEntries(Object.entries(list).sort((a, b) => a[0].localeCompare(b[0])));

    // write to files if changed

    try {
        assert.deepEqual(prevList, list)
        console.log('No changes detected, skipping write')
    } catch {
        console.log('Server list changed, writing files...')
        fs.writeFileSync(path.join(__dirname, '../last_updated'), new Date().toISOString());
        fs.writeFileSync(path.join(__dirname, '../list.json'), JSON.stringify(list, null, 4));
        const fd = fs.openSync(path.join(__dirname, '../list.txt'), 'w+');
        const fd_notfound = fs.openSync(path.join(__dirname, '../notfound.txt'), 'w+');
        for (const [tld, whoisServer] of Object.entries(list)) {
            if (whoisServer) {
                fs.writeSync(fd, `${tld} ${whoisServer}\n`);
            } else {
                fs.writeSync(fd_notfound, `${tld}\n`);
            }
        }

        // update version in package.json
        let packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, '../package.json')).toString());
        packageJson.version = dayjs().format('YYYY.MM.DD');
        fs.writeFileSync(path.join(__dirname, '../package.json'), JSON.stringify(packageJson, null, 4));

        // update README.md
        const date = dayjs().format('YYYY-MM-DD');
        const readme = fs.readFileSync(path.join(__dirname, '../README.md')).toString();

        /**
         * Update the README.md file with the latest date
         * Example:
         * <!-- UPDATE_DATE_START -->
         * Last updated: 2021-10-20
         * <!-- UPDATE_DATE_END -->
         */
        const newReadme = readme.replace(/<!-- UPDATE_DATE_START -->[\s\S]*<!-- UPDATE_DATE_END -->/g, `<!-- UPDATE_DATE_START -->\nLast updated: ${date}\n<!-- UPDATE_DATE_END -->`);
        fs.writeFileSync(path.join(__dirname, '../README.md'), newReadme);
    }
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function getTLDs() {
    const res = await fetch('https://data.iana.org/TLD/tlds-alpha-by-domain.txt');
    const list = await res.text();
    const lines = list.split('\n');
    const TLDs = [];
    for (const line of lines) {
        if (!line || line.startsWith('#')) {
            continue;
        }
        TLDs.push(line.trim().toLowerCase());
    }
    return TLDs;
}

/**
 * @param {string} tld
 * @returns {Promise<null|string>}
 */
async function getWhoisServerFromIANA(tld) {
    const whoisResult = await whoisLookup(tld, 'whois.iana.org');
    const r = whoisResult.match(/^whois:\s+(?!\S)(.*)$/im);
    if (r?.[1].trim()) {
        return r[1].trim();
    } else {
        return null;
    }
}

async function whoisLookup(query, server, port = 43) {
    // get ipv4 address of server
    const ip = (await dns.resolve4(server))[0];
    if (!ip) {
        throw new Error('Could not resolve ' + server);
    }

    return new Promise((resolve, reject) => {
        const client = net.createConnection(port, ip, () => {
            client.write(query + '\r\n');
        });
        let response = '';
        client.on('data', (data) => {
            response += data;
        });
        client.on('end', () => {
            resolve(response);
        });
        client.on('error', (err) => {
            reject(err);
        });
    });
}

main();
