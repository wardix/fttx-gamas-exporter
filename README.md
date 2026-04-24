# fttx-gamas-exporter

Webservice kecil berbasis Hono untuk mendeteksi gangguan massal FTTX dari data Karma, lalu mengekspos hasilnya dalam format Prometheus metrics.

## Metric

Exporter ini saat ini mengeluarkan metric berikut:

```text
# HELP fttx_mass_outage_active Whether a mass outage is currently detected.
# TYPE fttx_mass_outage_active gauge
fttx_mass_outage_active{operator="Iforte",started_at="2026-04-23 18:27"} 1
```

Arti metric:
- `operator`: diambil dari `shared.labels.operator`
- `started_at`: waktu mulai group gangguan massal, format `YYYY-MM-DD HH:mm`
- value `1`: group gangguan massal aktif terdeteksi

Logika grouping:
- alert diurutkan berdasarkan `startsAt`
- alert masuk ke group yang sama jika selisih dengan alert sebelumnya `<= THRESHOLD_MINUTES`
- sebuah group dianggap gangguan massal jika jumlah anggotanya `> MIN_GROUP_SIZE`

## Konfigurasi

Salin `.env.example` menjadi `.env`, lalu sesuaikan jika perlu.

```env
PORT=3000
KARMA_URL=https://nmx.example.com/karma/alerts.json?q=alertname%3Dfttx%20subscriber%20offline
THRESHOLD_MINUTES=2
MIN_GROUP_SIZE=15
```

## Menjalankan

Install dependency:

```bash
bun install
```

Jalankan service:

```bash
bun run src/server.ts
```

Atau:

```bash
bun run start
```

Endpoint:
- `GET /`
- `GET /healthz`
- `GET /metrics`

Contoh cek metric:

```bash
curl http://127.0.0.1:3000/metrics
```

## Prometheus Scrape Config

Contoh konfigurasi scrape:

```yaml
scrape_configs:
  - job_name: fttx-gamas-exporter
    metrics_path: /metrics
    static_configs:
      - targets:
          - 127.0.0.1:3000
```
