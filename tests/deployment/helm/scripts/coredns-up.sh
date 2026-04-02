#!/usr/bin/env bash
set -euo pipefail
kubectl --context="kind-speckle-dui" --namespace="kube-system" rollout restart deployment/coredns
kubectl --context="kind-speckle-dui" --namespace="kube-system" rollout status deployment "coredns" --timeout=90s
