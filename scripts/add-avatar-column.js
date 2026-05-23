const { Sequelize } = require('sequelize');
const seq = new Sequelize('food_website', 'root', process.env.DB_PASS || 'food', {
  host: process.env.DB_HOST || '172.17.0.1',
  dialect: 'mysql',
  logging: false
});
seq.query("ALTER TABLE users ADD COLUMN avatar VARCHAR(512) DEFAULT NULL COMMENT '头像URL'")
  .then(() => console.log('Column avatar added'))
  .catch(err => {
    if (err.message && err.message.includes('Duplicate column')) {
      console.log('Column avatar already exists');
    } else {
      console.error('Error:', err.message || err);
    }
  })
  .then(() => seq.close());