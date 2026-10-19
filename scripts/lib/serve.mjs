// A small static server for dist/: serves the build under a path prefix the
// way GitHub Pages serves a project site, and answers 404 outside it.
import {createReadStream, existsSync, statSync} from 'node:fs';
import {createServer} from 'node:http';
import {extname, join, normalize, resolve, sep} from 'node:path';

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.png': 'image/png', '.svg': 'image/svg+xml', '.md': 'text/markdown; charset=utf-8',
};

export function serve(rootDir, prefix = '/', port = 0) {
  const root = resolve(rootDir);
  const base = `/${prefix.replace(/^\/+|\/+$/gu, '')}/`.replace('//', '/');
  const server = createServer((request, response) => {
    let path = decodeURIComponent(new URL(request.url, 'http://x').pathname);
    if (!path.startsWith(base)) { response.writeHead(404); return response.end('outside the base path'); }
    path = path.slice(base.length);
    let file = resolve(root, normalize(path));
    if (file !== root && !file.startsWith(root + sep)) { response.writeHead(403); return response.end(); }
    if (existsSync(file) && statSync(file).isDirectory()) file = join(file, 'index.html');
    if (!existsSync(file)) { response.writeHead(404); return response.end('not found'); }
    response.writeHead(200, {'content-type': TYPES[extname(file)] ?? 'application/octet-stream', 'cache-control': 'no-store'});
    createReadStream(file).pipe(response);
  });
  return new Promise((done) => server.listen(port, '127.0.0.1', () => done({server, url: `http://127.0.0.1:${server.address().port}${base}`})));
}
