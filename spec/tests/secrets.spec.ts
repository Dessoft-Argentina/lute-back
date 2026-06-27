import fs from 'fs';
import path from 'path';

describe('Secretos (S12 — corrige)', () => {
  const repoRoot = path.resolve(__dirname, '..', '..');
  const srcDir = path.join(repoRoot, 'src');

  it('should not contain hardcoded MP_ACCESS_TOKEN in src/', () => {
    const checkDir = (dir: string): string[] => {
      const issues: string[] = [];
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          issues.push(...checkDir(fullPath));
        } else if (
          entry.name.endsWith('.ts') &&
          !entry.name.endsWith('.spec.ts')
        ) {
          const content = fs.readFileSync(fullPath, 'utf-8');
          if (content.includes('APP_USR-')) {
            issues.push(fullPath);
          }
        }
      }
      return issues;
    };

    const issues = checkDir(srcDir);
    expect(issues).toEqual([]);
  });

  it('should not contain hardcoded "prusci" JWT secret in src/', () => {
    const checkDir = (dir: string): string[] => {
      const issues: string[] = [];
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          issues.push(...checkDir(fullPath));
        } else if (
          entry.name.endsWith('.ts') &&
          !entry.name.endsWith('.spec.ts')
        ) {
          const content = fs.readFileSync(fullPath, 'utf-8');
          if (content.includes('"prusci"') || content.includes("'prusci'")) {
            issues.push(fullPath);
          }
        }
      }
      return issues;
    };

    const issues = checkDir(srcDir);
    expect(issues).toEqual([]);
  });

  it('should have sequelize.sync restricted to test env (S6)', () => {
    const dbPath = path.join(srcDir, 'database.ts');
    const content = fs.readFileSync(dbPath, 'utf-8');
    expect(content).toContain("process.env.NODE_ENV === 'test'");
  });

  it('should have env/example.env with placeholder values', () => {
    const examplePath = path.join(repoRoot, 'env', 'example.env');
    const exists = fs.existsSync(examplePath);
    expect(exists).toBe(true);

    const content = fs.readFileSync(examplePath, 'utf-8');
    expect(content).toContain('JWT_SECRET=change-this');
  });

  it('should have .gitignore protecting env/*.env', () => {
    const gitignorePath = path.join(repoRoot, '.gitignore');
    const content = fs.readFileSync(gitignorePath, 'utf-8');
    expect(content).toContain('env/*.env');
  });
});
