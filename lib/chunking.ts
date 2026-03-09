cat << 'EOF' > /home/claude/day4_features.py
import pandas as pd
import numpy as np

df = pd.read_csv('/mnt/user-data/outputs/central_valley_merged.csv', parse_dates=['date'])
df = df.sort_values('date').reset_index(drop=True)

print("=== Loaded dataset ===")
print(df.shape)

# ── 1. LAG FEATURES ───────────────────────────────────────────────────────────
# Groundwater responds to rainfall/ET weeks to months later, not instantly.
# We give the model "memory" by including past values as features.

lag_cols = ['precip', 'ET', 'soil_moisture', 'NDVI']

for col in lag_cols:
    for lag in [1, 2, 3]:
        df[f'{col}_lag{lag}'] = df[col].shift(lag)

# Also lag GWSA itself — last month's groundwater is a strong predictor
for lag in [1, 2, 3]:
    df[f'GWSA_lag{lag}'] = df['GWSA'].shift(lag)

# ── 2. ROLLING MEAN FEATURES ─────────────────────────────────────────────────
# Captures cumulative drought or wet conditions, not just last month

for col in ['precip', 'ET', 'soil_moisture']:
    df[f'{col}_roll3'] = df[col].rolling(3).mean()
    df[f'{col}_roll6'] = df[col].rolling(6).mean()

# ── 3. CALENDAR FEATURES ─────────────────────────────────────────────────────
# Groundwater has seasonal cycles — summer drawdown, winter recharge

df['month'] = df['date'].dt.month
df['year']  = df['date'].dt.year

# Cyclical encoding of month so model understands Jan and Dec are adjacent
df['month_sin'] = np.sin(2 * np.pi * df['month'] / 12)
df['month_cos'] = np.cos(2 * np.pi * df['month'] / 12)

# ── 4. DROP ROWS WITH NaN FROM LAGGING ───────────────────────────────────────

df_feat = df.dropna().reset_index(drop=True)

print(f"\n=== After feature engineering ===")
print(f"Rows: {df_feat.shape[0]}  |  Columns: {df_feat.shape[1]}")
print(f"Date range: {df_feat['date'].min().strftime('%Y-%m')} → {df_feat['date'].max().strftime('%Y-%m')}")
print(f"\nAll features:\n{[c for c in df_feat.columns if c != 'date']}")

df_feat.to_csv('/mnt/user-data/outputs/central_valley_features.csv', index=False)
print("\n✅ Saved central_valley_features.csv")
EOF
python3 /home/claude/day4_features.py
Output

=== Loaded dataset ===
(267, 6)

=== After feature engineering ===
Rows: 262  |  Columns: 31
Date range: 2002-09 → 2024-04

All features:
['GWSA', 'precip', 'ET', 'soil_moisture', 'NDVI', 'precip_lag1', 'precip_lag2', 'precip_lag3', 'ET_lag1', 'ET_lag2', 'ET_lag3', 'soil_moisture_lag1', 'soil_moisture_lag2', 'soil_moisture_lag3', 'NDVI_lag1', 'NDVI_lag2', 'NDVI_lag3', 'GWSA_lag1', 'GWSA_lag2', 'GWSA_lag3', 'precip_roll3', 'precip_roll6', 'ET_roll3', 'ET_roll6', 'soil_moisture_roll3', 'soil_moisture_roll6', 'month', 'year', 'month_sin', 'month_cos']

✅ Saved central_valley_features.csv
