# Руководство по observability-стеку kube-prometheus-stack + Loki/Promtail

## 1. Как пользоваться стеком шаг за шагом

### 1.1 Подготовка контекста kubectl
```bash
kubectl config current-context
kubectl get nodes
```
Убедитесь, что работает кластер `docker-desktop` и есть доступ к namespace `monitoring` и `logging`.

### 1.2 Где смотреть метрики (Prometheus)
1. Пробросьте порт Prometheus:
   ```bash
   kubectl -n monitoring port-forward svc/monitoring-kube-prometheus-prometheus 9090
   ```
2. Откройте http://localhost:9090 в браузере.
3. Проверьте раздел **Status → Targets**: цели `kubernetes-service-endpoints`, `serviceMonitor/monitoring/api` и `serviceMonitor/monitoring/worker` должны быть `UP`.
4. В разделе **Graph** выполните тестовый запрос `up{service="api"}` или `up{service="worker"}`. Появление значения `1` подтверждает сбор `/metrics`.

### 1.3 Где смотреть логи (Loki + Grafana)
1. Пробросьте порт Grafana:
   ```bash
   kubectl -n monitoring port-forward svc/monitoring-grafana 3000:80
   ```
2. Авторизуйтесь (по умолчанию `admin`/`prom-operator`, пароль можно посмотреть командой `kubectl get secret monitoring-grafana -n monitoring -o jsonpath='{.data.admin-password}' | base64 -d`).
3. В Grafana добавьте источник данных Loki (см. раздел 1.5). После этого переходите в **Explore**, выбирайте Loki в выпадающем списке и ищите логи через запросы `{
app="api"}` или `{
app="worker"}`.

### 1.4 Проверка алертов в Prometheus
1. В UI Prometheus откройте **Alerts**. Найдите правило `HighJobFailures`.
2. Нажмите на правило, чтобы увидеть выражение `increase(asynq_jobs_failed_total[5m]) > 5`.
3. Для теста можно временно понизить порог (`> 0`) или через консоль Prometheus выполнить `increase(asynq_jobs_failed_total[5m])` и убедиться, что значение превышает порог.
4. Проверьте раздел **Status → Rules**: правило должно быть загружено, `Last evaluation` должна обновляться.

### 1.5 Подключение источников данных в Grafana
1. Grafana → **Connections → Data Sources → Add data source**.
2. Выберите **Prometheus** и укажите URL `http://monitoring-kube-prometheus-prometheus.monitoring.svc:9090`.
3. Проверьте **Save & Test** – статус должен быть `Data source is working`.
4. Добавьте **Loki** с URL `http://loki.logging.svc:3100`. (Название сервиса уточните командой `kubectl get svc -n logging`).
5. Сохраните источник и убедитесь в успешном тесте соединения.

### 1.6 Проверка, что ServiceMonitor видит сервисы
```bash
kubectl get servicemonitors -n monitoring
kubectl describe servicemonitor api -n monitoring
kubectl get endpoints -n <namespace-сервисов> -l app=api
```
Цели должны появиться в списке Prometheus. Если `Endpoints` пустые, убедитесь, что в `Service` есть метка `app: api` и порт с именем `http`.

### 1.7 Проверка работы Alertmanager
1. Убедитесь, что под `monitoring-kube-prometheus-alertmanager-0` запущен:
   ```bash
   kubectl get pods -n monitoring -l app.kubernetes.io/name=alertmanager
   ```
2. Пробросьте порт, чтобы посмотреть UI Alertmanager:
   ```bash
   kubectl -n monitoring port-forward svc/monitoring-kube-prometheus-alertmanager 9093
   ```
3. В UI должны отображаться загруженные правила и активные оповещения.

## 2. Проверка и корректировка манифестов

### 2.1 PrometheusRule (HighJobFailures)
Файл [`rep2prompt-rules.yaml`](../rep2prompt-rules.yaml) / [`kube/monitoring/prometheusrules-rep2prompt.yaml`](../kube/monitoring/prometheusrules-rep2prompt.yaml) содержит корректный ресурс `PrometheusRule`. Важно:
* `metadata.namespace: monitoring` – правило устанавливается вместе с стеком.
* Метка `release: monitoring` совпадает с именем Helm-релиза kube-prometheus-stack.
* Выражение `increase(asynq_jobs_failed_total[5m]) > 5` корректно для счётчиков.

Для лучшей читаемости можно добавить аннотацию `summary` и явно указать команду применения:
```bash
kubectl apply -f kube/monitoring/prometheusrules-rep2prompt.yaml
```

### 2.2 ServiceMonitor
Файл [`service-monitors.yaml`](../service-monitors.yaml) создаёт два ServiceMonitor. Проверьте:
* В `Service` для API и worker должны быть метки `app: api` и `app: worker`.
* Порт в сервисе должен иметь имя `http`.
* Если сервисы находятся в конкретных неймспейсах, замените `any: true` на `matchNames: ["default"]` или нужные пространства для безопасности.
* Применение:
```bash
kubectl apply -f service-monitors.yaml
```

## 3. Готовые запросы и панели

### 3.1 PromQL-запросы
* **Упавшие задачи Asynq за 5 минут:**
  ```promql
  increase(asynq_jobs_failed_total[5m])
  ```
* **Нагрузка на worker (количество выполняемых задач):**
  ```promql
  rate(asynq_tasks_in_progress_total[5m])
  ```
  или если есть gauge `asynq_tasks_active`, используйте просто `asynq_tasks_active`.
* **Длина очереди:**
  ```promql
  asynq_queue_size
  ```
  (подставьте конкретное имя метки `queue`, например `asynq_queue_size{queue="critical"}`).
* **Ошибки в API (HTTP 5xx):**
  ```promql
  sum by (status) (rate(http_server_requests_seconds_count{status=~"5.."}[5m]))
  ```

### 3.2 Пример дашборда Grafana (через JSON)
```json
{
  "title": "Asynq & API Overview",
  "panels": [
    {
      "type": "stat",
      "title": "Failed jobs (5m)",
      "targets": [
        {"expr": "increase(asynq_jobs_failed_total[5m])"}
      ]
    },
    {
      "type": "graph",
      "title": "Worker load",
      "targets": [
        {"expr": "rate(asynq_tasks_in_progress_total[5m])"}
      ]
    },
    {
      "type": "stat",
      "title": "Queue length",
      "targets": [
        {"expr": "asynq_queue_size"}
      ]
    },
    {
      "type": "graph",
      "title": "API errors 5xx",
      "targets": [
        {"expr": "sum by (status) (rate(http_server_requests_seconds_count{status=~\"5..\"}[5m]))"}
      ]
    }
  ]
}
```
Импортируйте JSON через **Dashboards → Import → Upload JSON file**.

## 4. Настройка Alertmanager с Telegram/Email

### 4.1 Общие шаги
1. Создайте Secret с конфигурацией Alertmanager (файл можно положить, например, в `infra/observability/prometheus/alertmanager-config.yaml`):
   ```bash
   kubectl -n monitoring create secret generic alertmanager-config \
     --from-file=alertmanager.yaml=infra/observability/prometheus/alertmanager-config.yaml
   ```
2. Примените значения Helm, чтобы Alertmanager использовал Secret (пример в `values` для kube-prometheus-stack).
3. Перезапустите поды Alertmanager.

### 4.2 Пример конфигурации для Telegram
```yaml
route:
  receiver: telegram
receivers:
  - name: telegram
    telegram_configs:
      - api_url: https://api.telegram.org
        bot_token: "<BOT_TOKEN>"
        chat_id: "<CHAT_ID>"
```
Telegram-бот создаётся через `@BotFather`, `chat_id` можно получить через `@userinfobot`.

### 4.3 Пример конфигурации для Email (SMTP)
```yaml
route:
  receiver: email
receivers:
  - name: email
    email_configs:
      - to: you@example.com
        from: alerts@example.com
        smarthost: smtp.example.com:587
        auth_username: alerts@example.com
        auth_identity: alerts@example.com
        auth_password: "<SMTP_PASSWORD>"
```

После обновления конфигурации выполните:
```bash
kubectl -n monitoring delete pod -l app.kubernetes.io/name=alertmanager
```
Alertmanager поднимет новые поды с обновлённой конфигурацией.

## 5. Типичные ошибки и что проверить
1. **Метка `release` не совпадает** – Prometheus не заберёт правило/монитор. Убедитесь, что в ваших манифестах указано `release: monitoring`.
2. **Несоответствие имён портов** – ServiceMonitor ищет порт по имени, а не по номеру. Проверьте `kubectl get svc <service> -o yaml`.
3. **Нет `Endpoints` у сервиса** – Prometheus не увидит pod'ы. Проверьте `kubectl get endpoints`.
4. **Promtail не метчит логи** – проверьте `kubectl logs -n logging deployment/promtail` на ошибки и правильность `pipeline_stages`.
5. **Alertmanager без конфигурации** – проверьте `kubectl get secret -n monitoring -l app=alertmanager`.

## 6. Рекомендации по улучшению
* Ограничьте `namespaceSelector` в ServiceMonitor, чтобы Prometheus не сканировал все неймспейсы.
* Используйте отдельный файл `values-monitoring.yaml` для helm upgrade, где храните все overrides: пароли Grafana, конфиг Alertmanager, включение Loki data source.
* Создайте автоматизацию (например, через Argo CD/Flux) для применения манифестов, чтобы изменения были воспроизводимы.
* Настройте резервное копирование данных Prometheus и Grafana (PVC snapshots) на случай обновлений Docker Desktop.

## 7. Команды Helm и kubectl
* Установка/обновление стека мониторинга (значения можно вынести в собственный файл, например `infra/observability/prometheus/values.yaml`):
  ```bash
  helm upgrade --install monitoring prometheus-community/kube-prometheus-stack \
    --namespace monitoring --create-namespace \
    -f infra/observability/prometheus/values.yaml
  ```
* Установка Loki и Promtail (пример):
  ```bash
  helm upgrade --install loki grafana/loki-stack \
    --namespace logging --create-namespace \
    --set promtail.enabled=true
  ```
* Применение правил и сервис-мониторов:
  ```bash
  kubectl apply -f kube/monitoring/prometheusrules-rep2prompt.yaml
  kubectl apply -f service-monitors.yaml
  ```

Следуя этим шагам, вы сможете контролировать метрики, логи, оповещения и быстро диагностировать проблемы в своих сервисах.
