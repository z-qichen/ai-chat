import Database from 'better-sqlite3'

const db = new Database('./data/ai-chat.db')

console.log('=== users ===')
const users = db.prepare('SELECT id, username, created_at FROM users').all()
users.forEach((u: any) => console.log(JSON.stringify(u, null, 2)))

console.log('\n=== conversations ===')
const convs = db.prepare('SELECT * FROM conversations').all()
convs.forEach((c: any) => console.log(JSON.stringify(c, null, 2)))

console.log('\n=== messages ===')
const msgs = db.prepare('SELECT * FROM messages').all()
msgs.forEach((m: any) => console.log(JSON.stringify(m, null, 2)))

console.log('\n--- counts ---')
console.log(`users: ${(db.prepare('SELECT COUNT(*) as c FROM users').get() as any).c}`)
console.log(`conversations: ${(db.prepare('SELECT COUNT(*) as c FROM conversations').get() as any).c}`)
console.log(`messages: ${(db.prepare('SELECT COUNT(*) as c FROM messages').get() as any).c}`)

db.close()
