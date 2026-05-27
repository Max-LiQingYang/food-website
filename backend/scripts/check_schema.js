const mysql = require("mysql2/promise");
async function main() {
  const conn = await mysql.createConnection({
    host: "172.17.0.1", user: "food_user", password: "food_password", database: "food_website"
  });
  const [rows] = await conn.query("DESCRIBE video_embeds");
  conn.end();
  rows.forEach(r => console.log(r.Field, "-", r.Type));
}
main().catch(e => console.error(e.message));