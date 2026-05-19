<template>
  <div id="app">
    <router-view />
  </div>
</template>

<script setup>
// 根组件：仅承载 router-view，路由逻辑由 vue-router 管理
</script>

<style>
/* 全局基础样式 */
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  color: #1a1a1a;
  background: #fafafa;
}

#app {
  min-height: 100vh;
}
</style>
