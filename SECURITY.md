# Security Policy

## Supported Versions

| Version | Supported |
|---------|----------|
| Latest  | ✅        |

## Reporting a Vulnerability

If you discover a security vulnerability in this project, **please do NOT open a public issue.**

Instead, report it privately by emailing: **ecomverse25@gmail.com**

You can expect:
- Acknowledgment within **48 hours**
- A fix or mitigation plan within **7 days** for critical issues

## Security Practices

- All dependencies are monitored by **GitHub Dependabot**
- Security PRs are reviewed and merged promptly
- Admin credentials and API keys must **never** be hardcoded in source files
- Use environment variables (`.env`) for all secrets — ensure `.env` is listed in `.gitignore`

## Known Sensitive Files

- `license_server.php` — Requires the `ADMIN_PASSWORD` to be set as an environment variable on the server, not hardcoded in source code.
