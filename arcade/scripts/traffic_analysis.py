import csv
from pathlib import Path

# Paths
DATA_PATH = (
    Path(__file__).resolve().parents[1] / 'data' / 'traffic_oct_nov.csv'
)
REPORT_DIR = Path(__file__).resolve().parents[1] / 'reports'
REPORT_DIR.mkdir(exist_ok=True)
REPORT_PATH = REPORT_DIR / 'traffic.html'

# Simple aggregation
weekly = {}
with open(DATA_PATH, newline='') as csvfile:
    for row in csv.DictReader(csvfile):
        # Expect columns: Timestamp,Desktop,Mobile
        date = row['Timestamp'][:10]  # YYYY-MM-DD
        week = date[:7]  # YYYY-MM
        desktop = int(row.get('Desktop') or 0)
        mobile = int(row.get('Mobile') or 0)
        weekly.setdefault(week, {'desktop': 0, 'mobile': 0})
        weekly[week]['desktop'] += desktop
        weekly[week]['mobile'] += mobile

# Generate HTML report
html = [
    '<html>',
    '<head><title>Traffic Analysis</title></head>',
    '<body>',
    '<h1>Traffic Summary (Desktop vs Mobile)</h1>',
    '<table border="1" cellpadding="4" cellspacing="0">',
    '<tr><th>Month</th><th>Desktop Sessions</th><th>Mobile Sessions</th></tr>',
]
for month in sorted(weekly.keys()):
    d = weekly[month]['desktop']
    m = weekly[month]['mobile']
    html.append(f'<tr><td>{month}</td><td>{d}</td><td>{m}</td></tr>')
html.extend(['</table>', '</body>', '</html>'])

REPORT_PATH.write_text('\n'.join(html), encoding='utf-8')
print(f"Report generated at {REPORT_PATH}")
