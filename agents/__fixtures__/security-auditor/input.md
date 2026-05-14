# Input para security-auditor

Audite o seguinte snippet:

```typescript
// src/auth.ts
import crypto from 'crypto'

export function hashPassword(pw: string): string {
  return crypto.createHash('md5').update(pw).digest('hex')  // linha 5
}
```

```typescript
// src/api.ts
export async function getUser(id: string) {
  const sql = `SELECT * FROM users WHERE id = ${id}`  // linha 3
  return db.query(sql)
}
```
