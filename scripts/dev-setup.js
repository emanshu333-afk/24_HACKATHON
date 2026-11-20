import { existsSync, mkdirSync, writeFileSync, readFileSync, chmodSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { randomBytes, generateKeyPairSync } from 'node:crypto';

if (process.env.NODE_ENV === 'production') throw new Error('Development bootstrap only');
const local = resolve('.local');
mkdirSync(join(local, 'keys'), { recursive: true, mode: 0o700 });
const bin = process.env.PG_BIN || 'C:/Program Files/PostgreSQL/18/bin';
function run(name, args, env = {}) {
  const r = spawnSync(join(bin, name + (process.platform === 'win32' ? '.exe' : '')), args, { encoding: 'utf8', stdio: name === 'pg_ctl' ? 'ignore' : 'pipe', env: { ...process.env, ...env } });
  if (r.error || r.status !== 0) throw new Error(`${name}: ${r.error?.message || r.stderr || r.stdout}`);
}
if (!existsSync('.env')) {
  const password = randomBytes(32).toString('hex');
  writeFileSync('.env', `DATABASE_URL=postgresql://verimark:${password}@127.0.0.1:55432/verimark?schema=public\nJWT_SECRET=${randomBytes(48).toString('hex')}\nKEY_DIRECTORY=.local/keys\nPUBLIC_BASE_URL=http://localhost:3000\nFRONTEND_ORIGIN=http://localhost:5173\nPORT=3000\nLOCAL_ATTACK_TESTS=1\n`, { mode: 0o600 });
}
const url = new URL(readFileSync('.env', 'utf8').match(/^DATABASE_URL=(.+)$/m)[1]);
if (url.hostname !== '127.0.0.1' || url.port !== '55432' || url.pathname !== '/verimark') throw new Error('Refusing bootstrap against non-isolated DB');
const data = join(local, 'pgdata');
if (!existsSync(join(data, 'PG_VERSION'))) {
  const pw = join(local, 'pg-password');
  writeFileSync(pw, decodeURIComponent(url.password), { mode: 0o600 });
  try { run('initdb', ['-D', data, '-U', 'verimark', '--auth=scram-sha-256', `--pwfile=${pw}`, '--encoding=UTF8', '--locale=C']); }
  finally { const { unlinkSync } = await import('node:fs'); unlinkSync(pw); }
}
const status = spawnSync(join(bin, process.platform === 'win32' ? 'pg_ctl.exe' : 'pg_ctl'), ['-D', data, 'status'], { encoding: 'utf8' });
if (status.status !== 0) run('pg_ctl', ['-D', data, '-l', join(local, 'postgres.log'), '-o', '-p 55432 -h 127.0.0.1', '-w', 'start']);
const connection = { PGPASSWORD: decodeURIComponent(url.password) };
const check = spawnSync(join(bin, process.platform === 'win32' ? 'psql.exe' : 'psql'), ['-h','127.0.0.1','-p','55432','-U','verimark','-d','postgres','-tAc', "SELECT 1 FROM pg_database WHERE datname='verimark'"], { encoding: 'utf8', env: { ...process.env, ...connection } });
if (check.status !== 0) throw new Error(check.stderr);
if (check.stdout.trim() !== '1') run('createdb', ['-h','127.0.0.1','-p','55432','-U','verimark','verimark'], connection);
for (const name of ['institution', 'approver-a', 'approver-b']) {
  const dest = join(local, 'keys', `${name}.private.pem`);
  if (!existsSync(dest)) {
    const { privateKey, publicKey } = generateKeyPairSync('ed25519');
    writeFileSync(dest, privateKey.export({ type: 'pkcs8', format: 'pem' }), { mode: 0o600 });
    writeFileSync(join(local, 'keys', `${name}.public.pem`), publicKey.export({ type: 'spki', format: 'pem' }));
    chmodSync(dest, 0o600);
  }
}
// Windows ignores POSIX modes: remove inherited access to local secrets, grant current user only.
if (process.platform === 'win32') {
  const who = spawnSync('whoami', [], { encoding: 'utf8' }).stdout.trim();
  for (const target of [local, resolve('.env')]) {
    const r = spawnSync('icacls', [target, '/inheritance:r', '/grant:r', `${who}:${target === local ? '(OI)(CI)F' : 'F'}`], { encoding: 'utf8' });
    if (r.status !== 0) throw new Error('Unable to restrict secret ACLs: ' + r.stderr);
  }
}
console.log('Isolated PostgreSQL ready on 127.0.0.1:55432. Development keys and .env generated locally; secrets not printed.');
