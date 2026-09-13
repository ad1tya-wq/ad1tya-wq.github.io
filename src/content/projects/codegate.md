---
title: Codegate
summary: A certified gate that escalates AI-generated code to an LLM only when it cannot prove the code is safe.
stack: [Python, Conformal risk control, Static analysis]
repo: https://github.com/ad1tya-wq/codegate
url: https://github.com/ad1tya-wq/codegate-scanner
detail: "Static analysis runs first and gives every generated snippet a risk score. A Learn-Then-Test conformal risk-control step sets the escalation threshold from calibration data, so the share of unsafe code that passes the gate is bounded at a chosen level instead of tuned by hand; only the uncertain cases go on to an LLM reviewer. Two repositories: the gate and the scanner."
icon: shield-check
order: 1
---
