<script setup></script>

<template>
  <router-view></router-view>
</template>

<style>
/* 全局覆盖 Element Plus 主题色为品牌蓝 #5B8DEF */
:root {
  --el-color-primary: #5b8def;
  --el-color-primary-light-1: color-mix(in srgb, #5b8def 90%, white);
  --el-color-primary-light-2: color-mix(in srgb, #5b8def 80%, white);
  --el-color-primary-light-3: color-mix(in srgb, #5b8def 70%, white);
  --el-color-primary-light-4: color-mix(in srgb, #5b8def 60%, white);
  --el-color-primary-light-5: color-mix(in srgb, #5b8def 50%, white);
  --el-color-primary-light-6: color-mix(in srgb, #5b8def 40%, white);
  --el-color-primary-light-7: color-mix(in srgb, #5b8def 30%, white);
  --el-color-primary-light-8: color-mix(in srgb, #5b8def 20%, white);
  --el-color-primary-light-9: color-mix(in srgb, #5b8def 10%, white);
  --el-color-primary-dark-2: color-mix(in srgb, #5b8def 80%, black);
}

html,
body,
#app {
  margin: 0;
  padding: 0;
  min-height: 100%;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC',
    'Hiragino Sans GB', 'Microsoft YaHei', sans-serif;
  background: #f4f5f7;
  color: #1f2329;
}

* {
  box-sizing: border-box;
}

a {
  text-decoration: none;
  color: inherit;
}

/* 滚动条美化 */
::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}
::-webkit-scrollbar-thumb {
  background: #c8c9cc;
  border-radius: 4px;
}
::-webkit-scrollbar-thumb:hover {
  background: #909399;
}
</style>
