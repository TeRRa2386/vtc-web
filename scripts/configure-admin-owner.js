const fs = require("node:fs");
const { Client } = require("pg");

const email = process.argv[2];

if (!email) {
  console.error("Usage: node scripts/configure-admin-owner.js admin@example.com");
  process.exit(1);
}

function readEnv(filePath) {
  return Object.fromEntries(
    fs
      .readFileSync(filePath, "utf8")
      .split(/\r?\n/)
      .filter(Boolean)
      .map((line) => {
        const index = line.indexOf("=");
        return [line.slice(0, index), line.slice(index + 1)];
      })
  );
}

async function main() {
  const env = readEnv("D:/Projects/Vet Tech Tool/.env");
  const client = new Client({
    database: "postgres",
    host: "db.wkrclhsyypvixgunsgeg.supabase.co",
    password: env.SUPABASE_DB_URLS_PASSWORD,
    port: 5432,
    ssl: { rejectUnauthorized: false },
    user: "postgres"
  });

  await client.connect();

  const { rows } = await client.query(
    "select id, email from auth.users where lower(email) = lower($1::text) limit 1",
    [email]
  );

  if (!rows.length) {
    throw new Error(`No Supabase Auth user found for ${email}`);
  }

  const user = rows[0];

  await client.query(
    `insert into public.admin_users (user_id, email, role, is_active)
     values ($1, $2, 'owner', true)
     on conflict (user_id)
     do update set email = excluded.email, role = excluded.role, is_active = true, updated_at = now()`,
    [user.id, user.email]
  );

  console.log(`Admin owner configured: ${user.email} (${user.id})`);
  await client.end();
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
