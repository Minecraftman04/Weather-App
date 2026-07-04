from pathlib import Path
p=Path('index.html')
s=p.read_text(encoding='utf-8')
a='      width: min(1420px, calc(100% - 28px));'
b='      width: min(1800px, calc(100% - 28px));'
assert s.count(a)==1
s=s.replace(a,b,1)
anchor='    @media (max-width: 1120px) {'
wide='''    @media (min-width: 1600px) {
      .wrap { width: min(2400px, calc(100% - clamp(48px, 4vw, 96px))); }
      .hero { grid-template-columns: minmax(430px, .78fr) minmax(820px, 1.62fr); gap: clamp(20px, 1.35vw, 32px); margin-bottom: clamp(20px, 1.35vw, 32px); }
      .heroCopy { padding: clamp(30px, 2.4vw, 48px); }
      h1 { font-size: clamp(4.6rem, 4.3vw, 6.8rem); max-width: 11ch; }
      .subtitle { font-size: 1.08rem; max-width: 78ch; }
      .searchPanel { padding: clamp(18px, 1.35vw, 28px); gap: 15px; }
      .controls { grid-template-columns: repeat(6, minmax(150px, 1fr)); }
      .dashboardGrid, .mainDataGrid { gap: clamp(20px, 1.35vw, 32px); }
      .overviewGrid { grid-template-columns: minmax(420px, .72fr) minmax(900px, 1.8fr); gap: clamp(20px, 1.35vw, 32px); }
      .card { padding: clamp(20px, 1.35vw, 30px); }
      .dailyGrid { grid-template-columns: repeat(auto-fit, minmax(175px, 1fr)); gap: 14px; }
      .dayCard { min-height: 142px; padding: 15px; }
      .hourlyTable { min-width: 100%; }
      .hourlyWeather { min-width: 220px; }
      .metricVisual { min-width: 130px; }
      .aloftSvg { min-height: 430px; }
      .launchMiniGrid { grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 14px; }
      .launchBest { grid-template-columns: minmax(0, 1fr) minmax(190px, 240px); }
    }
    @media (min-width: 2400px) {
      .wrap { width: min(3200px, calc(100% - 120px)); }
      .hero { grid-template-columns: minmax(520px, .7fr) minmax(1100px, 1.9fr); gap: 36px; margin-bottom: 36px; }
      .heroCopy { padding: 52px; }
      h1 { font-size: clamp(6rem, 3.8vw, 8rem); }
      .subtitle { font-size: 1.16rem; }
      .searchPanel, .card { padding: 32px; }
      .controls { grid-template-columns: repeat(6, minmax(185px, 1fr)); gap: 14px; }
      .dashboardGrid, .mainDataGrid { gap: 36px; }
      .overviewGrid { grid-template-columns: minmax(520px, .65fr) minmax(1300px, 1.95fr); gap: 36px; }
      .dailyGrid { grid-template-columns: repeat(auto-fit, minmax(195px, 1fr)); gap: 16px; }
      .tableWrap table { min-width: 100%; }
      .aloftSvg { min-height: 520px; }
      .launchMiniGrid { grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); }
      .launchBest { grid-template-columns: minmax(0, 1fr) 260px; }
    }

'''
assert s.count(anchor)==1
s=s.replace(anchor,wide+anchor,1)
s=s.replace('      .wrap { width: min(100% - 18px, 1420px); padding-top: 12px; }','      .wrap { width: calc(100% - 18px); padding-top: 12px; }',1)
p.write_text(s,encoding='utf-8')
