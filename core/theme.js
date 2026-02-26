/**
 * 主題/配色管理
 * - 目標：維持「企業系統風（淺色、低彩度）」並讓各模組具備辨識度。
 * - 做法：以 module accent（模組強調色）做區隔，不更動全域 primary。
 */

(function(){
  'use strict';

  const ROUTE_ACCENTS = {
    dashboard:   { accent: "#0f172a", ink: "#0f172a", soft: "rgba(15, 23, 42, 0.08)" },
    repairs:      { accent: '#2563eb', ink: '#1d4ed8', soft: 'rgba(37, 99, 235, 0.12)' },
    machines:     { accent: '#0f766e', ink: '#0f766e', soft: 'rgba(15, 118, 110, 0.12)' },
    customers:    { accent: '#7c3aed', ink: '#6d28d9', soft: 'rgba(124, 58, 237, 0.12)' },
    parts:        { accent: '#16a34a', ink: '#15803d', soft: 'rgba(22, 163, 74, 0.12)' },
    quotes:       { accent: '#4f46e5', ink: '#4338ca', soft: 'rgba(79, 70, 229, 0.12)' },
    orders:       { accent: '#d97706', ink: '#b45309', soft: 'rgba(217, 119, 6, 0.14)' },
    kb:           { accent: '#db2777', ink: '#9d174d', soft: 'rgba(219, 39, 119, 0.12)' },
    maintenance:  { accent: '#059669', ink: '#047857', soft: 'rgba(5, 150, 105, 0.12)' },
    weekly:       { accent: '#0ea5e9', ink: '#0284c7', soft: 'rgba(14, 165, 233, 0.12)' },
    guide:        { accent: '#0891b2', ink: '#0e7490', soft: 'rgba(8, 145, 178, 0.12)' },
    settings:     { accent: '#334155', ink: '#334155', soft: 'rgba(51, 65, 85, 0.10)' },
  };

  function apply(route){
    const key = (route || 'repairs').toString();
    const cfg = ROUTE_ACCENTS[key] || ROUTE_ACCENTS.repairs;
    const root = document.documentElement;

    try { document.body && document.body.setAttribute('data-route', key); } catch (_) {}

    root.style.setProperty('--module-accent', cfg.accent);
    root.style.setProperty('--module-accent-ink', cfg.ink);
    root.style.setProperty('--module-accent-soft', cfg.soft);

    // 焦點外框：使用模組色（可讀性更高）
    root.style.setProperty('--focus-ring', cfg.soft);
  }

  window.AppTheme = { apply, ROUTE_ACCENTS };
  try { console.log('✅ AppTheme loaded'); } catch (_) {}
})();
