---
applyTo: "**"
---

# Project Security Best Practices

## Snyk Security Scanning

- Always run **snyk_code_scan** tool for new first party code that is generated in a Snyk-supported language.
- If any security issues are found based on newly introduced or modified code or dependencies, attempt to fix the issues using the results context from **Snyk**.
- Rescan the code after fixing the issues to ensure that the issues were fixed and that there are no newly introduced issues.
- Repeat this process until no new issues are found.

## Security-First Development

- **Validate all inputs** - Never trust user input, always validate and sanitize
- **Use parameterized queries** - Prevent SQL injection attacks
- **Implement proper authentication** - Use secure token-based auth (JWT)
- **Encrypt sensitive data** - Use strong encryption for passwords and secrets
- **Keep dependencies updated** - Regularly update packages to patch vulnerabilities
- **Follow least privilege principle** - Grant minimum necessary permissions
- **Implement rate limiting** - Protect APIs from abuse
- **Use HTTPS everywhere** - Encrypt data in transit
- **Log security events** - Monitor for suspicious activity
- **Handle errors securely** - Don't expose sensitive information in error messages

## Code Review Checklist

Before committing code, ensure:
- [ ] No hardcoded credentials or API keys
- [ ] All user inputs are validated
- [ ] SQL queries use parameterized statements
- [ ] Authentication and authorization are properly implemented
- [ ] Sensitive data is encrypted
- [ ] Error messages don't leak sensitive information
- [ ] Dependencies are up to date and have no known vulnerabilities
- [ ] Security headers are properly configured
- [ ] CORS is properly configured
- [ ] Rate limiting is implemented for APIs

## Dependency Security

- Use `npm audit` or `snyk test` before adding new dependencies
- Review dependency licenses for compliance
- Avoid dependencies with known vulnerabilities
- Keep dependencies minimal - only add what's necessary
- Pin dependency versions in production
- Regularly update dependencies with security patches

## Secret Management

- **Never commit secrets** to version control
- Use environment variables for sensitive configuration
- Use `.env.example` files as templates (without actual secrets)
- Rotate secrets regularly
- Use secret management services (AWS Secrets Manager, HashiCorp Vault)
- Implement proper access controls for secrets

## API Security

- Implement authentication on all protected endpoints
- Use HTTPS/TLS for all API communications
- Implement rate limiting to prevent abuse
- Validate and sanitize all API inputs
- Use proper HTTP methods (GET, POST, PUT, DELETE)
- Implement CORS properly
- Use API versioning
- Log all API access for audit trails
- Implement request/response validation with schemas

## Database Security

- Use parameterized queries or ORMs to prevent SQL injection
- Implement proper access controls
- Encrypt sensitive data at rest
- Use connection pooling securely
- Implement database audit logging
- Regular backups with encryption
- Principle of least privilege for database users
- Keep database software updated

## Authentication & Authorization

- Use strong password hashing (bcrypt, Argon2)
- Implement multi-factor authentication (MFA)
- Use secure session management
- Implement proper token expiration
- Use refresh tokens for long-lived sessions
- Implement account lockout after failed attempts
- Use OAuth 2.0 for third-party authentication
- Implement proper role-based access control (RBAC)

## Monitoring & Incident Response

- Implement security event logging
- Monitor for suspicious activity
- Set up alerts for security events
- Have an incident response plan
- Regular security audits
- Penetration testing
- Vulnerability scanning
- Keep security documentation updated
