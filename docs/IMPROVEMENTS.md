# OptiTrade Frontend Improvement Plan

This document tracks everything we still want to polish. Items are grouped by urgency so we can plan sprints without losing the big picture.

## 🔴 Critical upgrades

1. **Routing**

   - ✅ (done) Adopt React Router instead of manual state-based navigation.
   - Follow-up: keep route definitions centralized in `App.tsx` and document new paths.

2. **Error handling**

   - Global error boundary (already shipped).
   - ✅ Added API-level error normalization via React Query + toast notifications (global query cache shows errors automatically).
   - Continue surfacing domain-specific issues (например Supabase auth) через единые хелперы вместо `console.error`.

3. **Data fetching & loading states**

   - ✅ Подключен `@tanstack/react-query` (глобальный QueryClient, кэш, retry, отключён refetch on focus).
   - ✅ Дашборд грузит `/bot/status` и `/trades` из FastAPI, отображая skeleton-ы и fallback, ошибки уходят в toast.
   - Следующий шаг — перенести остальные страницы (Portfolio, TradeHistory) на ту же схему и добавить retry CTA там, где нужно.

4. **Form validation**

   - ✅ Login форма переписана на `react-hook-form` + `zod`: единая схема, inline ошибки, disable на submit.
   - Следующий шаг — перенести остальные формы (например, Settings) на те же инструменты и добавить проверки сложности пароля.

5. **Type safety**
   - ✅ Supabase-типы (Portfolio, Trade, Alert, PriceCache) живут в `src/types`, `lib/supabase` их только ре-экспортирует — дублирования больше нет.
   - Следующий шаг — генерировать эти определения прямо из схемы Supabase, чтобы не поддерживать их руками.

## 🟡 Important upgrades

6. **State management**

   - ✅ Добавлен Zustand store (`src/state/dashboardStore.ts`) для bot status + trades; React Query синхронизирует данные в хранилище.
   - Следующий шаг — вынести в store остальные сущности (портфель, уведомления) и подумать об optimistic updates.

7. **Performance**

   - ✅ `StatCard` и `Sidebar` мемоизированы, все страницы грузятся через `React.lazy` + `Suspense`.
   - Дальше — динамический импорт тяжёлых виджетов (графики) и анализ таблиц Portfolio на повторные рендеры.

8. **Accessibility**

   - ✅ Sidebar получил `role="navigation"` + `aria-label`, иконки помечены `aria-hidden`, добавлен skip-link и видимые `focus-visible` индикаторы на ссылках/кнопках Login — клавиатурная навигация стала заметной.
   - Следующий шаг — пройтись по остальным формам (Settings и т.д.), добавить ARIA для таблиц и подсказки screen reader’ам на кнопках действий.

9. **Testing**

   - ✅ Настроен Vitest + Testing Library + JSDOM, добавлены примеры тестов (`StatCard`, `Login`).
   - Следующий шаг — покрыть ключевые флоу (Portfolio, ProtectedRoute) и подумать про Playwright для E2E.

10. **Code documentation**
    - Sprinkle JSDoc on shared helpers, keep README snippets aligned with actual commands, annotate tricky logic.

## 🟢 UX & UI polish

11. **Backend integration**

    - Replace hardcoded dashboard/portfolio stats with real data from the FastAPI backend (`/bot/status`, `/trades`, `/model/predict`).
    - Introduce data adapters in `src/lib` and leverage React Query for caching/retries.
    - Surface backend errors via toasts and ensure loading/empty states are designed.

12. **Charts**

    - Replace placeholders with Recharts (or Chart.js) for balance, P&L, and per-asset graphs, including tooltips and timeframe toggles.

13. **Animations**

    - Use Framer Motion for subtle page transitions, panel reveals, and animated skeletons.

14. **Theming**

    - Support light/dark mode with persisted preference and smooth transitions.

15. **Responsive design**

    - Audit the entire UI on tablets/phones, convert the sidebar into a drawer on small screens, and adapt tables for limited width.

16. **Notifications**
    - Add toast notifications (react-hot-toast) for success/error states.
    - Long term: Supabase Realtime-driven alert center.

## 🔵 Technical improvements

17. **Environment variables**

    - `.env.example` now exists. At runtime we warn when placeholders (`placeholder.supabase.co`) are still present—replace them before release. ✅ TODO: update `frontend/.env` with real Supabase credentials as soon as they are provisioned.

18. **Build optimization**

    - Add bundle analyzer, verify tree-shaking, and lazy-load heavy routes/assets.

19. **Linting & formatting**

    - ESLint + Prettier are configured; consider Husky pre-commit hooks and stricter shared configs.

20. **CI/CD**

    - GitHub Actions pipeline for lint + test + typecheck.
    - Automatic deploys to Vercel/Netlify with preview URLs per PR.

21. **Security**
    - `npm audit` gating, strong CSP, sanitize any user-generated content, and double-check Supabase RLS policies.

## Page-specific opportunities

- **Dashboard** – wire up real metrics, add timeframe filters, refresh data on an interval.
- **Portfolio** – fetch actual holdings, make the “Refresh” button perform a real refetch, show per-asset stats.
- **MarketAnalysis** – integrate market data provider, enable search/filter, show detailed breakout cards.
- **TradeHistory** – fetch paginated trades, add filters by date/type/symbol, allow CSV export.
- **Backtesting** – accept strategy parameters, run tests via backend/model API, visualize results.
- **Settings** – expose agent controls (risk, pairs, notifications), validate and persist via Supabase.

## Recommended libraries to add

```json
{
	"dependencies": {
		"@tanstack/react-query": "^5.x",
		"react-hook-form": "^7.x",
		"zod": "^3.x",
		"recharts": "^2.x",
		"framer-motion": "^10.x",
		"react-hot-toast": "^2.x",
		"zustand": "^4.x"
	},
	"devDependencies": {
		"prettier": "^3.x",
		"@types/node": "^20.x",
		"vitest": "^1.x",
		"@testing-library/react": "^14.x",
		"@testing-library/jest-dom": "^6.x"
	}
}
```

## Suggested priorities

1. **High** – React Query adoption, API error handling/toasts, advanced validation.
2. **Medium** – Charts, global state, automated testing, responsive audit.
3. **Lower** – Animations, theming, CI/CD automation, long-form documentation polish.
