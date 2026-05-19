'use strict'

/**
 * config/database.js
 * Sequelize 实例配置
 * 支持 sqlite（开发）和 mysql/pg（生产），通过 process.env.DB_DIALECT 切换
 */

require('dotenv').config()

const { Sequelize } = require('sequelize')

const dialect = process.env.DB_DIALECT || 'sqlite'

const poolConfig = {
  max: parseInt(process.env.DB_POOL_MAX, 10) || 10,
  min: parseInt(process.env.DB_POOL_MIN, 10) || 2,
  acquire: parseInt(process.env.DB_POOL_ACQUIRE, 10) || 30000,
  idle: parseInt(process.env.DB_POOL_IDLE, 10) || 10000
}

const dbConfig = {
  logging: process.env.NODE_ENV === 'development' ? console.log : false,
  pool: poolConfig,
  dialect,
  define: {
    timestamps: false // 各模型自行控制 timestamps
  }
}


// ── SQLite（本地开发）───────────────────────────────────────
if (dialect === 'sqlite') {
  const path = require('path')
  const dbPath = process.env.DB_PATH || path.join(__dirname, '..', 'database.sqlite')
  // eslint-disable-next-line no-new
  new Sequelize({
    ...dbConfig,
    storage: dbPath,
    dialect: 'sqlite'
  })
}

// ── MySQL ────────────────────────────────────────────────────
if (dialect === 'mysql') {
  // eslint-disable-next-line no-new
  new Sequelize({
    ...dbConfig,
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT, 10) || 3306,
    database: process.env.DB_NAME || 'food_website',
    username: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
    dialect: 'mysql',
    dialectModule: require('mysql2')
  })
}

// ── PostgreSQL ───────────────────────────────────────────────
if (dialect === 'postgres' || dialect === 'postgresql') {
  // eslint-disable-next-line no-new
  new Sequelize({
    ...dbConfig,
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT, 10) || 5432,
    database: process.env.DB_NAME || 'food_website',
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASS || '',
    dialect: 'postgres',
    dialectModule: require('pg')
  })
}

// 创建单一 sequelize 实例（switch 后统一赋值）
let sequelize
switch (dialect) {
  case 'sqlite': {
    const path = require('path')
    const dbPath = process.env.DB_PATH || path.join(__dirname, '..', 'database.sqlite')
    sequelize = new Sequelize({ ...dbConfig, storage: dbPath, dialect: 'sqlite' })
    break
  }
  case 'mysql': {
    sequelize = new Sequelize({
      ...dbConfig,
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT, 10) || 3306,
      database: process.env.DB_NAME || 'food_website',
      username: process.env.DB_USER || 'root',
      password: process.env.DB_PASS || '',
      dialect: 'mysql',
      dialectModule: require('mysql2')
    })
    break
  }
  case 'postgres':
  case 'postgresql': {
    sequelize = new Sequelize({
      ...dbConfig,
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT, 10) || 5432,
      database: process.env.DB_NAME || 'food_website',
      username: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASS || '',
      dialect: 'postgres',
      dialectModule: require('pg')
    })
    break
  }
  default:
    throw new Error(`Unsupported DB_DIALECT: ${dialect}`)
}

module.exports = sequelize
