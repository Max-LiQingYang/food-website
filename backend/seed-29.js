/**
 * seed-29.js — 迭代#29 食谱数据增强
 * 补充 25 道新食谱 (55→80+)
 * 用法: docker exec -w /app -e NODE_PATH=/app/node_modules food-backend node backend/seed-29.js
 */
const { Sequelize } = require('sequelize');

const sq = new Sequelize('mysql://food_user:food_password@172.17.0.1:3306/food_website', {
  logging: false,
  define: { freezeTableName: true }
});

const Recipe = sq.define('Recipe', {
  id: { type: require('sequelize').DataTypes.UUID, defaultValue: require('sequelize').DataTypes.UUIDV4, primaryKey: true },
  title: require('sequelize').DataTypes.STRING,
  coverImage: require('sequelize').DataTypes.STRING,
  author: require('sequelize').DataTypes.STRING,
  cookTime: require('sequelize').DataTypes.INTEGER,
  description: require('sequelize').DataTypes.TEXT,
  category: require('sequelize').DataTypes.STRING,
  ingredients: require('sequelize').DataTypes.JSON,
  steps: require('sequelize').DataTypes.JSON,
  servings: require('sequelize').DataTypes.INTEGER,
  difficulty: require('sequelize').DataTypes.STRING,
  categoryTags: require('sequelize').DataTypes.JSON,
  nutrition: require('sequelize').DataTypes.JSON,
  tips: require('sequelize').DataTypes.TEXT,
  season: require('sequelize').DataTypes.STRING,
  isFeatured: require('sequelize').DataTypes.BOOLEAN,
  favoriteCount: require('sequelize').DataTypes.INTEGER,
  commentCount: require('sequelize').DataTypes.INTEGER,
  viewCount: require('sequelize').DataTypes.INTEGER,
}, { tableName: 'recipes', timestamps: true });

const recipes = require('./seed-29-data.json');

async function main() {
  await sq.authenticate();
  console.log('DB connected');
  
  const existing = await sq.query("SELECT COUNT(*) as cnt FROM recipes", { type: sq.QueryTypes.SELECT });
  console.log('Before - 总食谱:', existing[0].cnt);
  
  for (const r of recipes) {
    r.favoriteCount = Math.floor(Math.random() * 50);
    r.viewCount = Math.floor(Math.random() * 1000);
    r.commentCount = Math.floor(Math.random() * 20);
    if (!r.author) r.author = '美食编辑';
    if (!r.isFeatured) r.isFeatured = 0;
  }
  
  await Recipe.bulkCreate(recipes, { validate: false, ignoreDuplicates: false });
  
  const after = await sq.query("SELECT COUNT(*) as cnt FROM recipes", { type: sq.QueryTypes.SELECT });
  console.log('After - 总食谱:', after[0].cnt);
  
  await sq.close();
  console.log('Done!');
}

main().catch(e => { console.error(e); process.exit(1); });