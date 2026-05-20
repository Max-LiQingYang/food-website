'use strict'

/**
 * models/index.js
 * 模型加载 + 关联注册
 *
 * fs.readdirSync(__dirname) 自动加载所有 .js 模型文件（排除 index.js 自身）
 * 调用每个模型的 associate(db) 注册关联
 * 导出 db = { sequelize, Sequelize, Favorite, Recipe, User }
 */

const fs = require('fs')
const path = require('path')
const sequelize = require('../config/database')

// 从 sequelize 实例获取 Sequelize 构造函数（含 DataTypes）
const Sequelize = sequelize.Sequelize || require('sequelize')

// 初始化 db 对象
const db = {
  sequelize,
  Sequelize
}

// 动态加载所有模型文件（排除 index.js）
const modelFiles = fs.readdirSync(__dirname).filter(
  (file) => file !== 'index.js' && file.endsWith('.js')
)

for (const file of modelFiles) {
  // eslint-disable-next-line import/no-dynamic-require
  const defineModel = require(path.join(__dirname, file))
  const model = defineModel(sequelize, Sequelize.DataTypes)
  const modelName = model.name // e.g. 'Favorite', 'Recipe', 'User'
  db[modelName] = model
}

// 注册所有关联
for (const modelName of Object.keys(db)) {
  if (modelName === 'sequelize' || modelName === 'Sequelize') continue
  const model = db[modelName]
  if (typeof model.associate === 'function') {
    model.associate(db)
  }
}

module.exports = db
