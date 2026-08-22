import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Phase 8 Theme & Token Compliance Audit', () => {
  const rootDir = path.resolve(__dirname, '../../..');
  const appDir = path.join(rootDir, 'app');
  const srcDir = path.join(rootDir, 'src');

  function getAllFiles(dir: string, ext = '.tsx'): string[] {
    let results: string[] = [];
    if (!fs.existsSync(dir)) return results;
    const list = fs.readdirSync(dir);
    list.forEach((file) => {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      if (stat && stat.isDirectory()) {
        results = results.concat(getAllFiles(filePath, ext));
      } else if (filePath.endsWith(ext)) {
        results.push(filePath);
      }
    });
    return results;
  }

  it('should verify ZERO hardcoded hex colors in TSX component tree', () => {
    const tsxFiles = [...getAllFiles(appDir), ...getAllFiles(srcDir)];
    const hexPattern = /#[0-9a-fA-F]{3,8}(?![0-9a-fA-F])/g;

    const violations: { file: string; match: string }[] = [];

    tsxFiles.forEach((file) => {
      // Exclude test files if any have mock hexes
      if (file.endsWith('.test.tsx')) return;

      const content = fs.readFileSync(file, 'utf-8');
      const matches = content.match(hexPattern);
      if (matches) {
        matches.forEach((m) => {
          violations.push({ file: path.relative(rootDir, file), match: m });
        });
      }
    });

    expect(violations).toEqual([]);
  });

  it('should verify ZERO off-palette default Tailwind color classes', () => {
    const tsxFiles = [...getAllFiles(appDir), ...getAllFiles(srcDir)];
    const offPalettePattern = /\b(bg|text|border|ring|fill|stroke)-(red|green|blue|yellow|emerald|slate|zinc|gray|neutral|indigo|purple|pink|rose|amber|cyan|teal|orange|violet)-[0-9]{2,3}\b/g;

    const violations: { file: string; match: string }[] = [];

    tsxFiles.forEach((file) => {
      if (file.endsWith('.test.tsx')) return;

      const content = fs.readFileSync(file, 'utf-8');
      const matches = content.match(offPalettePattern);
      if (matches) {
        matches.forEach((m) => {
          violations.push({ file: path.relative(rootDir, file), match: m });
        });
      }
    });

    expect(violations).toEqual([]);
  });
});
