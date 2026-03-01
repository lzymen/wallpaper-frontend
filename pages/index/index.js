// pages/index/index.js
Page({
  data: {
    searchText: '',
    swiperList: [
      { id: 'op01', color: '#1a1a1a', text: '极简视觉' },
      { id: 'op02', color: '#333333', text: '4K专区' },
      { id: 'op03', color: '#666666', text: '今日推荐' }
    ],
    kingKongList: [
          { name: '每日推荐', icon: '/assets/icons/categories/每日推荐.png', type: 'navigate', path: '/pages/daily-recommendation/daily-recommendation' },
          { name: '主题合辑', icon: '/assets/icons/categories/主题合辑.png', type: 'navigate', path: '/pages/themes/themes' },
          { name: '手气不错', icon: '/assets/icons/categories/手气不错.png', type: 'lucky', path: '' },
          { name: '我的收藏', icon: '/assets/icons/categories/我的收藏.png', type: 'navigate', path: '/pages/collections/collections' }
        ],
    leftList: [],
    rightList: [],
    leftHeight: 0,
    rightHeight: 0,
    page: 1,
    isSearching: false,
    hasMoreData: true,
    showBackTop: false

    
  },

  _columnWidthPx: 0,
  _rpx2px: 0, 
  _isLoading: false,

  onLoad(options) {
    this.initWaterfall();
  },
  
  initWaterfall() {
    const info = wx.getWindowInfo();
    const screenWidth = info.screenWidth;
    this._rpx2px = screenWidth / 750;
    this._columnWidthPx = (750 / 2 - 8) * this._rpx2px; 
    this.getWallpapers(true);
  },



  // 监听页面滚动
  onPageScroll(e) {
    // 当页面向下滚动超过 800px 时，显示“回到顶部”按钮
    if (e.scrollTop > 800 && !this.data.showBackTop) {
      this.setData({ showBackTop: true });
    } else if (e.scrollTop <= 800 && this.data.showBackTop) {
      this.setData({ showBackTop: false });
    }
  },

  // 点击回到顶部
  onBackTop() {
    wx.pageScrollTo({
      scrollTop: 0,
      duration: 300 // 300ms 丝滑滚上去
    });
  },
  
  getWallpapers(isRefresh = false) {
    if (this._isLoading || (!isRefresh && !this.data.hasMoreData)) {
      return;
    }
    this._isLoading = true;
    wx.showLoading({ title: '探索壁纸中...' });

    let currentPage = isRefresh ? 1 : this.data.page + 1;
    
    const token = wx.getStorageSync('token');
    const headers = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    wx.request({
      // 【修改】换成你截图里成功请求的真实接口
      url: 'http://127.0.0.1:8000/api/v1/wallpapers/recommend', 
      header: headers, 
      data: {
        page: currentPage
      },
      success: (res) => {
        if (res.statusCode === 200 && res.data.code === 200) {
          const wallpapers = res.data.data;
          if (wallpapers && wallpapers.length > 0) {
            if (isRefresh) {
              this.setData({ leftList: [], rightList: [], leftHeight: 0, rightHeight: 0 });
            }
            this.processWaterfall(wallpapers);
            this.setData({ page: currentPage, hasMoreData: true });
          } else {
            this.setData({ hasMoreData: false });
          }
        } else { 
          wx.showToast({ title: '加载失败', icon: 'none' }); 
        }
      },
      fail: (err) => { wx.showToast({ title: '网络连接异常', icon: 'error' }); },
      complete: () => { 
        wx.hideLoading(); 
        this._isLoading = false;
      }
    });
  },

  processWaterfall(newWallpapers) {
    const left = this.data.leftList;
    const right = this.data.rightList;
    let leftH = this.data.leftHeight;
    let rightH = this.data.rightHeight;

    newWallpapers.forEach((wallpaper) => {
      // 【核心修复】完全匹配你后端的真实字段：width, height, thumb
      if (!wallpaper || !wallpaper.width || !wallpaper.height || !wallpaper.thumb) {
        return; 
      }
      
      const dimX = wallpaper.width;
      const dimY = wallpaper.height;

      if (!(this._columnWidthPx > 0 && dimX > 0 && dimY > 0)) { return; }
      
      let ratio = dimY / dimX;
      
      // 【视觉优化】稍微放宽极值，让长图更长，展现原汁原味的壁纸比例
      const maxRatio = 1.8; 
      const minRatio = 0.6; 
      if (ratio > maxRatio) ratio = maxRatio;
      if (ratio < minRatio) ratio = minRatio;
      
      const displayHeightPx = this._columnWidthPx * ratio;
      wallpaper.displayHeight = displayHeightPx / this._rpx2px;
      
      if (leftH <= rightH) {
        left.push(wallpaper);
        leftH += displayHeightPx;
      } else {
        right.push(wallpaper);
        rightH += displayHeightPx;
      }
    });

    this.setData({ leftList: left, rightList: right, leftHeight: leftH, rightHeight: rightH });
  },

  handleSearchInput(e) {
    this.setData({
      searchText: e.detail.value
    });
  },

  onTapSearch() {
    const query = this.data.searchText.trim();
    if (!query) {
      wx.showToast({ title: '请输入搜索内容', icon: 'none' });
      return;
    }
    wx.navigateTo({
      url: `/pages/search-results/search-results?query=${query}`
    });
  },
  
  onReachBottom() {
    this.getWallpapers(false);
  },
  
  onKingKongItemTap(e) {
    const { type, path } = e.currentTarget.dataset.item;
    if (type === 'navigate') {
      wx.navigateTo({
        url: path,
        fail: () => { 
          wx.showToast({ title: '功能开发中', icon: 'none' }); 
        }
      });
    } else if (type === 'lucky') {
      this.onTapLucky();
    }
  },

  onTapLucky() {
    wx.showToast({ title: '手气不错开发中', icon: 'none' });
  },

  // 点击图片：为了立刻能看到效果，我改成了直接全屏预览高清大图
  onWallpaperTap(e) {
    const fullUrl = e.currentTarget.dataset.full;
    if (fullUrl) {
      wx.previewImage({
        current: fullUrl,
        urls: [fullUrl]
      });
    }
  }
});