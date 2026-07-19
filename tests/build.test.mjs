import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';


const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');


test('빌드는 정적 파일과 Advanced Mode Worker를 dist에 생성한다', () => {
  execFileSync(process.execPath, ['scripts/build.mjs'], {
    cwd: root,
    stdio: 'pipe',
  });

  for (const file of ['index.html', 'styles.css', 'script.js', 'team-seating.png', '_worker.js']) {
    assert.ok(existsSync(path.join(root, 'dist', file)), `${file}이 필요합니다`);
  }
  assert.equal(
    readFileSync(path.join(root, 'dist', '_worker.js'), 'utf8'),
    readFileSync(path.join(root, 'worker.mjs'), 'utf8')
  );
});
