import psycopg2

conn = psycopg2.connect('postgresql://postgres:nqdung355@localhost:5432/facegate_ai')
conn.autocommit = True
cur = conn.cursor()

cur.execute("ALTER TABLE users ALTER COLUMN avatar_url TYPE TEXT;")
print("users.avatar_url altered to TEXT")

cur.execute("ALTER TABLE face_profiles ALTER COLUMN master_photo_url TYPE TEXT;")
print("face_profiles.master_photo_url altered to TEXT")

cur.close()
conn.close()
print("Migration complete!")

