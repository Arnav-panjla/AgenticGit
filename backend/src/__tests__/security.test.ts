/**
 * Security Scan Service Tests (v5)
 *
 * Unit tests for the regex-based security scanner.
 */

import { runSecurityScan, SecurityScanResult } from '../services/security';

describe('Security Scan Service', () => {
  describe('clean content', () => {
    it('should return clean status for safe content', () => {
      const result = runSecurityScan('function add(a: number, b: number) { return a + b; }');
      expect(result.status).toBe('clean');
      expect(result.findings).toHaveLength(0);
      expect(result.summary).toBe('No security issues found');
    });

    it('should return clean for markdown documentation', () => {
      const content = `# API Documentation
## Endpoints
- GET /api/users - List all users
- POST /api/users - Create user
## Authentication
Uses JWT tokens from environment variables.`;
      const result = runSecurityScan(content);
      expect(result.status).toBe('clean');
    });

    it('should return clean for code without secrets', () => {
      const content = `const config = {
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  apiKey: process.env.API_KEY,
};`;
      const result = runSecurityScan(content);
      expect(result.status).toBe('clean');
    });
  });

  describe('critical findings', () => {
    it('should detect hardcoded API keys', () => {
      const content = `const config = { api_key: "sk-proj-ABCDEFGHIJKLMNOP12345678" };`;
      const result = runSecurityScan(content);
      expect(result.status).toBe('critical');
      expect(result.findings.some(f => f.rule === 'hardcoded_api_key')).toBe(true);
    });

    it('should detect hardcoded secrets', () => {
      const content = `const client_secret = "abcdefghijklmnopqrstuvwx1234567890";`;
      const result = runSecurityScan(content);
      expect(result.status).toBe('critical');
      expect(result.findings.some(f => f.rule === 'hardcoded_secret')).toBe(true);
    });

    it('should detect private keys', () => {
      const content = `-----BEGIN RSA PRIVATE KEY-----
MIIBogIBAAJBALRiML...`;
      const result = runSecurityScan(content);
      expect(result.status).toBe('critical');
      expect(result.findings.some(f => f.rule === 'private_key')).toBe(true);
    });

    it('should detect AWS access keys', () => {
      const content = `aws_access_key = AKIAIOSFODNN7EXAMPLE`;
      const result = runSecurityScan(content);
      expect(result.status).toBe('critical');
      expect(result.findings.some(f => f.rule === 'aws_access_key')).toBe(true);
    });

    it('should detect JWT tokens', () => {
      const content = `const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U";`;
      const result = runSecurityScan(content);
      expect(result.status).toBe('critical');
      expect(result.findings.some(f => f.rule === 'jwt_token')).toBe(true);
    });

    it('should detect generic hardcoded tokens', () => {
      const content = `const TOKEN = "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0";`;
      const result = runSecurityScan(content);
      expect(result.status).toBe('critical');
      expect(result.findings.some(f => f.rule === 'generic_token')).toBe(true);
    });
  });

  describe('warning findings', () => {
    it('should detect hardcoded passwords', () => {
      const content = `const password = "mysecretpassword123";`;
      const result = runSecurityScan(content);
      expect(result.findings.some(f => f.rule === 'hardcoded_password')).toBe(true);
      expect(result.findings.find(f => f.rule === 'hardcoded_password')?.severity).toBe('warning');
    });

    it('should detect SQL injection patterns', () => {
      const content = `db.query(\`SELECT * FROM users WHERE id = \${userId}\`);`;
      const result = runSecurityScan(content);
      expect(result.findings.some(f => f.rule === 'sql_injection')).toBe(true);
    });

    it('should detect unsafe eval usage', () => {
      const content = `const result = eval("2 + 2");`;
      const result = runSecurityScan(content);
      expect(result.findings.some(f => f.rule === 'unsafe_eval')).toBe(true);
    });

    it('should detect unsafe exec/spawn usage', () => {
      const content = `const output = exec("ls -la");`;
      const result = runSecurityScan(content);
      expect(result.findings.some(f => f.rule === 'unsafe_exec')).toBe(true);
    });

    it('should detect disabled authentication', () => {
      const content = `const config = { authentication: false };`;
      const result = runSecurityScan(content);
      expect(result.findings.some(f => f.rule === 'disabled_auth')).toBe(true);
    });

    it('should detect logging of sensitive data', () => {
      const content = `console.log("User password:", password);`;
      const result = runSecurityScan(content);
      expect(result.findings.some(f => f.rule === 'console_log_sensitive')).toBe(true);
    });
  });

  describe('info findings', () => {
    it('should detect hardcoded IP addresses', () => {
      const content = `const server = "192.168.1.100:8080";`;
      const result = runSecurityScan(content);
      expect(result.findings.some(f => f.rule === 'hardcoded_ip')).toBe(true);
      expect(result.findings.find(f => f.rule === 'hardcoded_ip')?.severity).toBe('info');
    });

    it('should detect TODO/FIXME comments', () => {
      const content = `// TODO: fix this vulnerability before production`;
      const result = runSecurityScan(content);
      expect(result.findings.some(f => f.rule === 'todo_fixme')).toBe(true);
    });
  });

  describe('summary and line numbers', () => {
    it('should include line numbers in findings', () => {
      const content = `line 1
line 2
const password = "hunter2";
line 4`;
      const result = runSecurityScan(content);
      const passwordFinding = result.findings.find(f => f.rule === 'hardcoded_password');
      expect(passwordFinding?.line).toBe(3);
    });

    it('should generate correct summary for mixed findings', () => {
      const content = `const api_key = "ABCDEFGHIJKLMNOPQRSTUVWXYZ123456";
const password = "mypassword";
// TODO: clean up`;
      const result = runSecurityScan(content);
      expect(result.summary).toContain('critical');
      expect(result.summary).toContain('warning');
      expect(result.summary).toContain('info');
    });

    it('should truncate long matched text', () => {
      const content = `const api_key = "this-is-a-very-long-api-key-that-should-be-truncated-in-output";`;
      const result = runSecurityScan(content);
      const finding = result.findings.find(f => f.rule === 'hardcoded_api_key');
      if (finding?.match && finding.match.length > 30) {
        expect(finding.match).toContain('...');
      }
    });

    it('should detect multiple findings on different lines', () => {
      const content = `const password = "secret123";
const api_key = "ABCDEFGHIJKLMNOPQRSTUVWXYZ123456";
// TODO: remove hardcoded values`;
      const result = runSecurityScan(content);
      expect(result.findings.length).toBeGreaterThanOrEqual(3);
      // Verify different lines
      const lines = result.findings.map(f => f.line);
      expect(new Set(lines).size).toBeGreaterThan(1);
    });
  });

  describe('overall status determination', () => {
    it('should be critical when any critical finding exists', () => {
      const content = `const api_key = "ABCDEFGHIJKLMNOPQRSTUVWXYZ123456";`;
      const result = runSecurityScan(content);
      expect(result.status).toBe('critical');
    });

    it('should be warning when only warnings exist (no criticals)', () => {
      const content = `// FIXME: important security fix needed
const config = { auth: false };`;
      const result = runSecurityScan(content);
      // This has info (FIXME) and warning (disabled auth) but no critical
      expect(result.status).toBe('warning');
    });

    it('should be clean when only info findings exist', () => {
      const content = `// TODO: add better error handling`;
      const result = runSecurityScan(content);
      expect(result.status).toBe('clean');
    });
  });
});
