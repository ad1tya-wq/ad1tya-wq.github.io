---
title: Jenkins delivery pipeline
summary: "End-to-end CI/CD around a small Java app: Jenkins builds with Maven and JUnit, Ansible ships Docker images, Grafana watches it run."
stack: [Jenkins, Maven, JUnit, Ansible, Docker, Graphite, Grafana]
repo: https://github.com/ad1tya-wq/stocktracker
detail: "A small Java stock tracker is the payload for a complete delivery pipeline: Jenkins builds with Maven and runs the JUnit suite, Ansible ships the Docker image to the target host, and Graphite with Grafana watches it in production. The pipeline is the project; the app is the excuse."
icon: git-branch
year: "2025"
order: 7
---
