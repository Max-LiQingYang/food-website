const { Model, DataTypes } = require('sequelize')

module.exports = (sequelize) => {
  class PantryItem extends Model {
    static associate(models) {
      PantryItem.belongsTo(models.User, {
        foreignKey: 'userId',
        targetKey: 'id',
        as: 'user',
      })
    }

    static AUTO_CATEGORIES = {
      '蔬菜': ['白菜', '青菜', '菠菜', '生菜', '西兰花', '花菜', '番茄', '黄瓜', '茄子', '青椒', '辣椒',
        '土豆', '红薯', '山药', '芋头', '萝卜', '胡萝卜', '豆芽', '蘑菇', '香菇', '木耳', '大蒜',
        '生姜', '葱', '洋葱', '芹菜', '韭菜', '豆角', '四季豆', '豌豆', '玉米', '南瓜', '冬瓜', '丝瓜',
        '苦瓜', '藕', '竹笋'],
      '水果': ['苹果', '香蕉', '橙子', '橘子', '柚', '柠檬', '葡萄', '草莓', '蓝莓', '猕猴桃',
        '芒果', '菠萝', '西瓜', '哈密瓜', '火龙果', '荔枝', '龙眼', '樱桃', '桃', '梨', '李子', '杏',
        '石榴', '百香果', '椰子'],
      '肉类': ['猪肉', '牛肉', '羊肉', '鸡肉', '鸭肉', '鹅肉', '排骨', '五花肉', '瘦肉', '里脊',
        '鸡胸', '鸡腿', '鸡翅', '牛肉糜', '肉馅', '腊肉', '火腿', '培根', '香肠', '午餐肉'],
      '海鲜': ['鱼', '虾', '蟹', '蛤蜊', '扇贝', '牡蛎', '鱿鱼', '章鱼', '三文鱼', '鳕鱼',
        '带鱼', '黄花鱼', '鲈鱼', '虾仁', '鱼丸', '蟹棒', '海带', '紫菜'],
      '蛋奶': ['鸡蛋', '鸭蛋', '皮蛋', '咸蛋', '牛奶', '酸奶', '奶酪', '黄油', '奶油',
        '炼乳', '芝士', '淡奶油'],
      '调味料': ['盐', '糖', '酱油', '老抽', '生抽', '醋', '料酒', '蚝油', '豆瓣酱', '辣椒酱',
        '番茄酱', '芝麻油', '橄榄油', '食用油', '花椒', '八角', '桂皮', '香叶', '孜然', '胡椒粉',
        '味精', '鸡精', '淀粉', '冰糖', '蜂蜜', '腐乳', '泡椒', '剁椒', '黄豆酱', '甜面酱'],
      '主食': ['大米', '小米', '糯米', '面粉', '面条', '挂面', '方便面', '米粉', '河粉',
        '意面', '面包', '馒头', '饺子皮', '馄饨皮', '燕麦', '麦片', '红豆', '绿豆', '黄豆',
        '花生', '芝麻', '核桃', '杏仁', '腰果', '松子'],
      '干货': ['木耳', '香菇', '红枣', '枸杞', '桂圆', '莲子', '百合', '银耳', '海带',
        '紫菜', '虾米', '干贝', '鱿鱼干', '腊肠', '腊肉'],
      '饮料': ['可乐', '雪碧', '果汁', '茶', '咖啡', '矿泉水', '汽水', '啤酒', '红酒',
        '白酒', '黄酒'],
    }

    /** 自动分类：根据食材名称匹配 */
    static autoCategorize(name) {
      if (!name) return '其他'
      const n = name.toLowerCase()
      for (const [cat, keywords] of Object.entries(PantryItem.AUTO_CATEGORIES)) {
        for (const kw of keywords) {
          if (n.includes(kw.toLowerCase())) return cat
        }
      }
      return '其他'
    }
  }

  PantryItem.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    quantity: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 1,
      allowNull: false,
    },
    unit: {
      type: DataTypes.STRING(20),
      defaultValue: '个',
      allowNull: false,
    },
    category: {
      type: DataTypes.STRING(30),
      defaultValue: '其他',
      allowNull: false,
    },
    expiryDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    notes: {
      type: DataTypes.STRING(200),
      allowNull: true,
    },
  }, {
    sequelize,
    modelName: 'PantryItem',
    tableName: 'pantry_items',
    timestamps: true,
    indexes: [
      { name: 'idx_pantry_user', fields: ['userId'] },
      { name: 'idx_pantry_category', fields: ['category'] },
      { name: 'idx_pantry_expiry', fields: ['expiryDate'] },
    ],
  })

  return PantryItem
}