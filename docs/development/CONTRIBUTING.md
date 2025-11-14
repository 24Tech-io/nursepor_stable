# Contributing to Nurse Pro Academy LMS Platform

Thank you for your interest in contributing! This document provides guidelines for contributing to the project.

## 🤝 Code of Conduct

- Be respectful and inclusive
- Welcome newcomers and help them learn
- Focus on constructive feedback
- No harassment or discrimination tolerated

## 🚀 Getting Started

### Prerequisites

- Node.js 22+
- npm 10+
- PostgreSQL or SQLite
- Git

### Setup Development Environment

1. Fork the repository
2. Clone your fork:
   ```bash
   git clone https://github.com/YOUR_USERNAME/lms-platform.git
   cd lms-platform
   ```

3. Install dependencies:
   ```bash
   npm install
   ```

4. Copy environment variables:
   ```bash
   cp .env.example .env.local
   ```

5. Configure your `.env.local` with required values

6. Run database migrations:
   ```bash
   npx drizzle-kit migrate
   ```

7. Start development server:
   ```bash
   npm run dev
   ```

## 📝 Development Workflow

### Branch Naming

- `feature/feature-name` - New features
- `fix/bug-name` - Bug fixes
- `docs/description` - Documentation updates
- `refactor/description` - Code refactoring
- `test/description` - Adding tests
- `security/description` - Security improvements

### Commit Messages

Follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks
- `security`: Security improvements

**Examples:**
```
feat(auth): add Face ID authentication
fix(api): resolve payment webhook validation
docs(readme): update installation instructions
security(middleware): add rate limiting
```

### Pull Request Process

1. Create a new branch from `main`
2. Make your changes
3. Write/update tests
4. Ensure all tests pass: `npm test`
5. Run linter: `npm run lint`
6. Run format check: `npm run format`
7. Update documentation if needed
8. Commit your changes with meaningful messages
9. Push to your fork
10. Create a Pull Request to `main`

### Pull Request Template

```markdown
## Description
[Brief description of changes]

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update
- [ ] Security improvement

## Testing
- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] Manual testing performed

## Checklist
- [ ] Code follows project style guidelines
- [ ] Self-reviewed my code
- [ ] Commented complex code
- [ ] Updated documentation
- [ ] No new warnings
- [ ] Added tests that prove fix/feature works
- [ ] New and existing tests pass locally

## Screenshots (if applicable)
[Add screenshots here]

## Related Issues
Fixes #[issue number]
```

## 🧪 Testing

### Writing Tests

- Write tests for new features
- Update tests for bug fixes
- Maintain test coverage above 80%
- Use meaningful test names
- Follow AAA pattern (Arrange, Act, Assert)

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

## 💻 Code Style

### TypeScript

- Use TypeScript for all new files
- Define proper types (avoid `any`)
- Use interfaces for object shapes
- Use type guards for type narrowing

### React Components

- Use functional components with hooks
- Keep components small and focused
- Use proper prop types
- Implement proper error boundaries

### Naming Conventions

- **Files**: `kebab-case` for files (`user-profile.tsx`)
- **Components**: `PascalCase` (`UserProfile.tsx`)
- **Functions**: `camelCase` (`getUserProfile`)
- **Constants**: `UPPER_SNAKE_CASE` (`MAX_FILE_SIZE`)
- **Types/Interfaces**: `PascalCase` (`UserProfile`)

### Code Organization

```
src/
├── app/              # Next.js pages and API routes
├── components/       # Reusable React components
│   ├── common/      # Shared components
│   ├── admin/       # Admin-specific components
│   └── student/     # Student-specific components
├── lib/             # Utility functions and configurations
│   ├── db/         # Database schema and connection
│   ├── auth.ts     # Authentication utilities
│   └── ...
└── types/           # TypeScript type definitions
```

## 🔒 Security

### Reporting Security Issues

**DO NOT** open a public issue for security vulnerabilities.

Instead, email: security@nurseproacademy.com

Include:
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

### Security Best Practices

- Never commit secrets or API keys
- Always validate user input
- Use parameterized queries
- Implement proper authentication/authorization
- Keep dependencies updated
- Follow OWASP security guidelines

## 📚 Documentation

### Code Comments

- Comment complex logic
- Explain "why" not "what"
- Use JSDoc for functions
- Keep comments up-to-date

### API Documentation

- Document all API endpoints
- Include request/response examples
- Specify authentication requirements
- List error codes and meanings

### README Updates

- Keep README.md current
- Update installation instructions
- Add new features to feature list
- Update screenshots if UI changes

## 🐛 Bug Reports

### Before Reporting

- Search existing issues
- Check if bug exists in latest version
- Try to reproduce consistently
- Gather relevant information

### Bug Report Template

```markdown
## Bug Description
[Clear, concise description]

## Steps to Reproduce
1. Step 1
2. Step 2
3. Step 3

## Expected Behavior
[What should happen]

## Actual Behavior
[What actually happens]

## Environment
- OS: [e.g., Windows 11]
- Node version: [e.g., 22.0.0]
- Browser: [e.g., Chrome 120]
- Version: [e.g., 1.0.0]

## Screenshots
[If applicable]

## Additional Context
[Any other relevant information]
```

## 💡 Feature Requests

### Before Requesting

- Search existing feature requests
- Consider if it fits project scope
- Think about implementation approach

### Feature Request Template

```markdown
## Feature Description
[Clear, concise description]

## Problem it Solves
[What problem does this address?]

## Proposed Solution
[How should it work?]

## Alternatives Considered
[Other approaches you've thought about]

## Additional Context
[Mockups, examples, etc.]
```

## 📊 Performance

### Performance Guidelines

- Optimize images and assets
- Minimize bundle size
- Use code splitting
- Implement caching strategies
- Avoid unnecessary re-renders
- Profile before optimizing

## ♿ Accessibility

### Accessibility Requirements

- WCAG 2.1 Level AA compliance
- Proper ARIA labels
- Keyboard navigation support
- Screen reader compatibility
- Sufficient color contrast
- Focus indicators

## 🌐 Internationalization

### i18n Guidelines

- Use i18n keys, not hardcoded text
- Support RTL languages
- Handle date/time formats
- Consider cultural differences
- Test with multiple languages

## 📦 Dependencies

### Adding Dependencies

- Justify new dependencies
- Check for security vulnerabilities
- Prefer well-maintained packages
- Consider bundle size impact
- Update package.json and package-lock.json

### Updating Dependencies

- Test thoroughly after updates
- Check for breaking changes
- Update related documentation
- Run full test suite

## 🎨 UI/UX

### Design Guidelines

- Follow existing design system
- Ensure responsive design
- Test on multiple devices
- Consider accessibility
- Maintain consistency
- Get feedback before implementing major changes

## 🏗️ Architecture Decisions

### Proposing Changes

- Document reasoning
- Consider impact on existing code
- Discuss with maintainers
- Create RFC (Request for Comments) if major change

## ❓ Questions?

- Check existing documentation
- Search issues and discussions
- Ask in project discussions
- Contact: dev@nurseproacademy.com

## 🎉 Recognition

Contributors will be:
- Listed in CONTRIBUTORS.md
- Mentioned in release notes
- Credited in documentation

Thank you for contributing to Nurse Pro Academy! 🙏

