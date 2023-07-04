const fetch = require('make-fetch-happen');
const fs = require("fs");
const path = require("path");
const punycode = require('punycode/');

const notFoundTlds = fs.readFileSync(path.join(__dirname, '../notfound.txt'), 'utf8').split('\n').map(tld => tld.trim()).filter(tld => tld);

fetch('https://raw.githubusercontent.com/rfc1036/whois/next/tld_serv_list').then(r => r.text()).then(list => {
    // console.log(list);
    for (const tld of notFoundTlds) {
        if (tld) {
            const r = list.match(new RegExp(`^\\.${tld}\\t(.*)$`, 'im'));
            if (r) {
                const serv = r[1].split('#')[0].trim();
                if (!serv.startsWith('NONE') && !serv.startsWith('WEB')) {
                    if (punycode.toUnicode(tld) !== tld) {
                        console.log(tld, `\t\t${serv}\t# punycode ${punycode.toUnicode(tld)}`);
                    } else {
                        console.log(tld, `\t\t${serv}`);
                    }
                }
            }
        }
    }
})
