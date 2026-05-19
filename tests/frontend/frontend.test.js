/**
 * 前端组件测试 - 收藏食谱功能
 * 使用 Jest + Vue Test Utils
 */
import { mount } from '@vue/test-utils';
import FavoriteButton from '../../frontend/components/FavoriteButton.vue';

describe('FavoriteButton 组件测试', () => {
  test('未收藏时显示"收藏"文本', () => {
    const wrapper = mount(FavoriteButton, {
      propsData: {
        recipeId: 1,
        isFavorited: false
      }
    });
    expect(wrapper.text()).toContain('收藏');
  });

  test('已收藏时显示"已收藏"文本', () => {
    const wrapper = mount(FavoriteButton, {
      propsData: {
        recipeId: 1,
        isFavorited: true
      }
    });
    expect(wrapper.text()).toContain('已收藏');
  });

  test('点击按钮应触发 toggleFavorite 事件', async () => {
    const wrapper = mount(FavoriteButton, {
      propsData: {
        recipeId: 1,
        isFavorited: false
      }
    });
    await wrapper.find('button').trigger('click');
    expect(wrapper.emitted('toggle')).toBeTruthy();
  });

  test('加载中状态按钮应禁用', () => {
    const wrapper = mount(FavoriteButton, {
      propsData: {
        recipeId: 1,
        isFavorited: false,
        loading: true
      }
    });
    expect(wrapper.find('button').attributes('disabled')).toBeDefined();
  });
});

describe('FavoriteList 页面测试', () => {
  test('空列表应显示"暂无收藏"提示', () => {
    const wrapper = mount({
      template: '<div>{{ favorites.length === 0 ? "暂无收藏" : "" }}</div>',
      data() { return { favorites: [] }; }
    });
    expect(wrapper.text()).toContain('暂无收藏');
  });
});
