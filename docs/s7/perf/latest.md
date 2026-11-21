# Perf ride, 2026-11-21 16:36 UTC (baseline: main b5bd781 (before any S7 change), characters not drawn (memory))

- Machine: Linux x64 Intel(R) Xeon(R) Processor @ 2.10GHz x2; graphics: ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero) (0x0000C0DE)), SwiftShader driver) (software, no real GPU: frame times are NOT what a player sees)
- The 10 character models were NOT loaded (low-memory machine); their download is still counted, their drawing is not.
- Ride: 90 s at cycle speed through ?

## chromium, layout=old: load only (the page died after Play: page.evaluate: Target crashed )
- Play button ready: 7.1 s (budget 4 s)
- Downloaded before Play: 11.35 MB in 133 files (budget 8 MB)

## chromium, layout=new: load only (the page died after Play: page.evaluate: Target crashed )
- Play button ready: 7.2 s (budget 4 s)
- Downloaded before Play: 13.01 MB in 139 files (budget 8 MB)

