<template>
  <div class="home-page">
    <h1>🍳 美食食谱首页</h1>
    <p>首页建设中，敬请期待~</p>
    <router-link to="/favorites" class="link">→ 我的收藏</router-link>
  </div>
</template>

<script setup>
// 首页占位组件
</script>

<style scoped>
.home-page {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 80vh;
  gap: 16px;
}

h1 {
  font-size: 28px;
  color: #1a1a1a;
}

p {
  color: #999;
  font-size: 16px;
}

.link {
  margin-top: 8px;
  color: #ff4d4f;
  font-size: 15px;
  text-decoration: none;
}

.link:hover {
  text-decoration: underline;
}
</style>
