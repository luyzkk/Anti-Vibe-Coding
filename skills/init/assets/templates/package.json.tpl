{
  "name": "{{PROJECT_NAME}}",
  "version": "0.0.1",
  "type": "module",
  "scripts": {
    "harness:validate": "bun run scripts/harness-validate.ts",
    "compound:check": "bun run scripts/compound-check.ts",
    "harness:all": "bun run harness:validate && bun run compound:check",
    "test": "bun test",
    "lint": "echo 'No linter configured yet — Plano 02 adds eslint'"
  },
  "devDependencies": {
    "@types/node": "^22.0.0",
    "typescript": "^5.5.0"
  }
}
