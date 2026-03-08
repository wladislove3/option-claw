Вот обновленный, максимально точный **architecture_plan.md**, переработанный под ваш новый стек: **Go (Golang)** для высокой производительности расчетов, **Next.js** для фронтенда и **D3.js** для низкоуровневой, полностью кастомной отрисовки тепловых карт.

Этот документ — прямой приказ для OpenClaw. Сохраните его в корне папки `~/option-pro`.

---

# architecture_plan.md: Профессиональный аналитический дашборд опционов ETH

## 1. Стек технологий

* **Backend:** Go (Golang) 1.22+. Использование `gonum/mat` для матричных вычислений.
* **Frontend:** Next.js 14+ (App Router), TypeScript, Tailwind CSS.
* **Visualization:** D3.js (Canvas-based rendering для тепловых карт 100x100+).
* **API:** REST (JSON) с поддержкой CORS.

## 2. Математическое ядро (Go Implementation)

Агент должен реализовать пакет `internal/math`, который вычисляет теоретическую стоимость и греки.

### 2.1. Формулы Блэка-Шоулза

**Параметры:** $S$ (цена), $K$ (страйк), $T$ (время в годах), $r$ (ставка), $\sigma$ (IV).

1. $d_1 = \frac{\ln(S/K) + (r + \sigma^2/2)T}{\sigma\sqrt{T}}$
2. $d_2 = d_1 - \sigma\sqrt{T}$
3. **Call Price:** $C = S \cdot \Phi(d_1) - K \cdot e^{-rT} \cdot \Phi(d_2)$
4. **Put Price:** $P = K \cdot e^{-rT} \cdot \Phi(-d_2) - S \cdot \Phi(-d_1)$
*Где $\Phi(x)$ — кумулятивная функция нормального распределения.*

### 2.2. Расчет P&L Матрицы

Бэкенд должен генерировать матрицу для Heatmap:

* **Ось X (Price):** Диапазон $[0.7 \cdot S_{current}, 1.3 \cdot S_{current}]$ (50-100 шагов).
* **Ось Y (Time):** Диапазон $[T, 0]$ (шаг в днях).
* **Z-Value:** Суммарный P&L всех "ног" стратегии (Long/Short Call/Put) в каждой точке.

## 3. Структура API (Endpoint: /api/calculate)

**POST Request Body:**

```json
{
  "underlying_price": 3500.50,
  "volatility": 0.65,
  "risk_free_rate": 0.05,
  "legs": [
    {"type": "CALL", "side": "SHORT", "strike": 3800, "premium": 150, "quantity": 1},
    {"type": "PUT", "side": "LONG", "strike": 3400, "premium": 120, "quantity": 1}
  ]
}

```

## 4. Фронтенд и Визуализация (D3.js)

### 4.1. Heatmap Component

1. **Rendering:** Использовать **HTML5 Canvas** через D3 для отрисовки ячеек (производительность выше, чем у SVG).
2. **Color Scale:**
* $P\&L < 0$: Градиент от насыщенно-красного до светло-красного.
* $P\&L = 0$: Черный или темно-серый.
* $P\&L > 0$: Градиент от светло-зеленого до ярко-зеленого.


3. **Interactivity:** При наведении (mouseover) отображать `Tooltip` с точными значениями: Цена ETH, Дней до экспирации, Прогноз прибыли/убытка.

## 5. Жесткие требования к Агенту (OpenClaw Constraints)

1. **Go Concurrency:** Для расчета тяжелых матриц использовать `goroutines` (параллельный расчет строк матрицы).
2. **D3 Responsiveness:** Тепловая карта должна масштабироваться под размер окна браузера.
3. **Error Handling:** Бэкенд должен возвращать `400 Bad Request` с описанием, если введенные данные (например, IV = 0) ведут к математической неопределенности.
4. **No Loops in D3 Data Prep:** Использовать эффективные методы D3 (например, `d3.scaleLinear` и `d3.interpolateRdYlGn`).

## 6. Пошаговый план разработки

1. **Phase 1:** Инициализация проекта. `go mod init`, `npx create-next-app`.
2. **Phase 2:** Реализация `math_engine.go` (Блэк-Шоулз) и тестов к нему.
3. **Phase 3:** Создание API эндпоинта в Go (использовать `chi` или `gin`).
4. **Phase 4:** Создание базового UI в Next.js (поля ввода для опционов).
5. **Phase 5:** Реализация Heatmap на D3.js.
6. **Phase 6:** Интеграция и финальные правки дизайна.

---

### Что делать сейчас:

 
> *"Действуй по плану `architecture_plan.md`. Стек: Go + Next.js + D3.js. Начинай с Phase 1. Создай лог прогресса в `progress_log.md`."*



 Это расширенный **architecture_plan.md**, превращенный в пошаговый алгоритм для автономного агента. Сохрани этот текст целиком в корень папки `option-pro`.

Агент должен следовать этому списку **неукоснительно**, помечая выполненные пункты в `progress_log.md`.

---

# architecture_plan.md: Профессиональный аналитический дашборд опционов ETH

## 1. Стек и Директивы

* **Backend:** Go 1.22+, пакет `gonum/mat` для матриц.
* **Frontend:** Next.js 14+ (TS), Tailwind, D3.js (Canvas).
* **Автономия:** Агент обязан сам исправлять ошибки компиляции и перезапускать серверы при падении.

---

## 2. Пошаговый план реализации (50 шагов)

### Фаза 1: Инициализация и Инфраструктура (Шаги 1-7)

1. **Init Repo:** Создать структуру папок: `backend/`, `frontend/`.
2. **Go Init:** В `backend/` выполнить `go mod init github.com/user/option-pro/backend`.
3. **Go Deps:** Установить зависимости: `go get github.com/go-chi/chi/v5`, `go get gonum.org/v1/gonum/mat`, `go get github.com/rs/cors`.
4. **Next Init:** В `frontend/` выполнить `npx create-next-app@latest . --ts --tailwind --eslint --app`.
5. **JS Deps:** Установить `d3` и `@types/d3`.
6. **Progress Log:** Создать `progress_log.md` и записать текущий статус.
7. **Check 1:** Запустить пустой Next.js и убедиться через `curl -I http://localhost:3000`, что сервер отдает 200.

### Фаза 2: Математическое ядро на Go (Шаги 8-15)

8. **Math Structs:** Создать `backend/internal/math/models.go` (структуры OptionLeg, MatrixRequest).
9. **Normal Dist:** Реализовать функцию кумулятивного нормального распределения (CDF) в `backend/internal/math/utils.go`.
10. **Black-Scholes Logic:** Реализовать расчет цены Call/Put в `backend/internal/math/black_scholes.go`.
11. **Greeks:** Добавить расчет Delta и Gamma (для будущих расширений).
12. **Matrix Engine:** Реализовать генерацию сетки P&L. **Важно:** использовать `sync.WaitGroup` для параллельного расчета строк.
13. **Unit Test 1:** Создать `black_scholes_test.go`. Проверить цену Call для ETH при $S=3500, K=3500, T=0.1, IV=0.5$.
14. **Unit Test 2:** Проверить, что P&L при $S=K$ и $T=0$ (экспирация) совпадает с теоретическим.
15. **Check 2:** Выполнить `go test ./...` и убедиться, что все тесты пройдены.

### Фаза 3: Разработка API на Go (Шаги 16-23)

16. **API Handler:** Создать `backend/cmd/api/main.go` с использованием Chi Router.
17. **CORS Config:** Разрешить запросы с `localhost:3000`.
18. **Calculation Endpoint:** Реализовать `POST /api/calculate`.
19. **JSON Validation:** Добавить проверку входных данных (IV > 0, T > 0).
20. **Error Responses:** Реализовать возврат структурированных ошибок 400/500.
21. **Logging Middleware:** Добавить логирование запросов (URL, Method, Latency).
22. **Manual API Test:** Запустить бэкенд и через `curl` отправить тестовый JSON с одной "ногой" (Long Call).
23. **Check 3:** Убедиться, что API возвращает двумерный массив (матрицу) чисел.

### Фаза 4: Базовый UI Next.js (Шаги 24-30)

24. **Global Styles:** Очистить `globals.css`, оставить только Tailwind.
25. **Types:** Создать `frontend/types/options.ts`.
26. **State Manager:** В `page.tsx` создать состояние для списка "ног" стратегии.
27. **Leg Input Component:** Создать форму добавления ноги (Type, Strike, Side, Premium, Qty).
28. **Leg List UI:** Отображение списка добавленных позиций с возможностью удаления.
29. **Fetch Logic:** Реализовать функцию `calculateStrategy` для вызова Go API.
30. **Check 4:** Добавить ногу в UI, нажать "Calculate" и увидеть JSON-ответ в консоли браузера.

### Фаза 5: Визуализация D3.js Canvas (Шаги 31-40)

31. **Heatmap Component:** Создать `frontend/components/Heatmap.tsx`.
32. **Canvas Setup:** Инициализировать `useRef` для HTML5 Canvas.
33. **Scales Logic:** Создать `d3.scaleLinear` для осей X (Цена) и Y (Время).
34. **Color Interpolator:** Создать `d3.scaleSequential` с использованием `d3.interpolateRdYlGn`.
35. **Draw Function:** Реализовать цикл отрисовки `rect` в Canvas для каждой ячейки матрицы.
36. **Zero-Line:** Отрисовать жирную линию для текущей цены ETH (Spot).
37. **Tooltip Engine:** Создать скрытый `div`, который следует за мышкой над Canvas.
38. **Bilinear Search:** Реализовать поиск ближайшей ячейки к координатам мыши для Tooltip.
39. **Responsive Hook:** Добавить `window.addEventListener('resize')` для перерисовки карты.
40. **Check 5:** Загрузить тестовую матрицу и убедиться, что Canvas отрисовывает градиент без ошибок.

### Фаза 6: Интеграция и Тестирование (Шаги 41-45)

41. **Full Flow:** Связать ввод параметров ETH (Spot, IV) с запросом к API и отрисовкой Heatmap.
42. **Loading States:** Добавить Skeleton-превью или Spinner во время расчета матрицы.
43. **Error Boundary:** Добавить UI для отображения ошибок бэкенда (например, "Невалидный Strike").
44. **Performance Bench:** Проверить время расчета матрицы 100x100. Цель: < 100мс на бэкенде.
45. **Check 6:** Проверить стратегию "Iron Condor" (4 ноги) — Heatmap должен корректно показать зону прибыли.

### Фаза 7: Полировка и Браузерный запуск (Шаги 46-50)

46. **Dark Mode UI:** Привести всё к темной теме (Slate/Zinc).
47. **Legend:** Отрисовать цветовую шкалу P&L (от мин. убытка до макс. прибыли).
48. **Final Browser Check:** Агент должен запустить оба сервера, открыть эмулируемый браузер и проверить доступность `/`.
49. **Documentation:** Создать `README.md` с инструкцией по запуску `go run` и `npm dev`.
50. **Cleanup:** Удалить временные файлы и логи отладки.

---

## 3. Инструкция для Агента по проверке графики

При реализации D3.js Heatmap, если агент не может "видеть" экран, он должен:

* Генерировать `snapshot` данных Canvas в `console.log` (проверка первых 5 ячеек на правильный цвет HEX).
* Проверять наличие элементов `canvas` и `svg` в DOM через тесты Playwright/Cypress (если установлены).

---

**Агент, начинай работу! Первым делом создай `progress_log.md` и выполни Шаг 1-5.**