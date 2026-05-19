/**
 * 后端 API 测试 - 收藏食谱功能
 * 使用 Jest + Supertest
 */
const request = require('supertest');
const express = require('express');

// 模拟应用（实际使用时替换为真实 app）
const app = express();
app.use(express.json());

// 模拟路由（简化版本）
app.post('/api/favorites', (req, res) => {
  const { recipeId } = req.body;
  if (!recipeId) {
    return res.status(400).json({ code: 400, message: 'recipeId 不能为空' });
  }
  res.status(201).json({ code: 0, message: '收藏成功', data: { id: 'uuid-1' } });
});

app.delete('/api/favorites/:recipeId', (req, res) => {
  res.status(200).json({ code: 0, message: '取消收藏成功' });
});

app.get('/api/favorites', (req, res) => {
  res.status(200).json({
    code: 0,
    message: 'success',
    data: { total: 1, page: 1, pageSize: 10, list: [] }
  });
});

app.get('/api/favorites/status/:recipeId', (req, res) => {
  res.status(200).json({ code: 0, message: 'success', data: { isFavorited: false } });
});

describe('收藏食谱 API 测试', () => {
  describe('POST /api/favorites - 添加收藏', () => {
    test('正常添加收藏应返回 201', async () => {
      const res = await request(app)
        .post('/api/favorites')
        .send({ recipeId: 'recipe-123' });
      expect(res.status).toBe(201);
      expect(res.body.code).toBe(0);
      expect(res.body.data.id).toBeDefined();
    });

    test('缺少 recipeId 应返回 400', async () => {
      const res = await request(app)
        .post('/api/favorites')
        .send({});
      expect(res.status).toBe(400);
      expect(res.body.code).toBe(400);
    });
  });

  describe('DELETE /api/favorites/:recipeId - 取消收藏', () => {
    test('正常取消收藏应返回 200', async () => {
      const res = await request(app)
        .delete('/api/favorites/recipe-123');
      expect(res.status).toBe(200);
      expect(res.body.code).toBe(0);
    });
  });

  describe('GET /api/favorites - 获取收藏列表', () => {
    test('获取列表应返回分页数据', async () => {
      const res = await request(app)
        .get('/api/favorites?page=1&pageSize=10');
      expect(res.status).toBe(200);
      expect(res.body.data).toHaveProperty('total');
      expect(res.body.data).toHaveProperty('page');
      expect(res.body.data).toHaveProperty('list');
    });
  });

  describe('GET /api/favorites/status/:recipeId - 查询收藏状态', () => {
    test('查询状态应返回 isFavorited', async () => {
      const res = await request(app)
        .get('/api/favorites/status/recipe-123');
      expect(res.status).toBe(200);
      expect(res.body.data).toHaveProperty('isFavorited');
    });
  });
});
