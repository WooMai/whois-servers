# WHOIS Server List

<!-- UPDATE_DATE_START -->
Last updated: 2023-06-30
<!-- UPDATE_DATE_END -->

## Usage

### Use the list directly

[JSON](list.json) / [TXT](list.txt)

### JavaScript / TypeScript

Install the package with NPM or Yarn:

```sh
npm i whois-server-list
# or
yarn add whois-server-list
```

Then you can use the list like this:

```javascript
const servers = require('whois-server-list');

const server = servers['com'];  // whois.verisign-grs.com
```

or TypeScript:

```typescript
import servers from 'whois-server-list';

const server: string | null = servers['com'];  // whois.verisign-grs.com
```

### PHP

Add the package with Composer:

```sh
composer require woomai/whois-servers:dev-master
```

Then you can use the list like this:

```php
$servers = json_decode(file_get_contents('vendor/woomai/whois-servers/list.json'), true);
$server = $servers['com'];  // whois.verisign-grs.com
```

## Contributing

If this list is outdated or missing servers, please feel free to open an issue or create pull request!

## License

[The Unlicense](./LICENSE)
