/**
 * 使用者操作指南 - Controller
 * V161 - Guide Module
 */

class GuideController {
  static async reload(containerId){
    if (!window.currentUser) throw new Error('尚未登入');
    if (!window.guideUI) throw new Error('Guide module not loaded');
    window.guideUI.render(containerId);
  }
}

window.GuideController = GuideController;
console.log('✅ GuideController loaded');
