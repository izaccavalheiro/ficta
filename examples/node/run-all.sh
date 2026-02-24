#!/usr/bin/env bash
# Run all Ficta Node.js examples sequentially.
# Exit code is the number of failed examples (0 = all passed).

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

GREEN='\033[0;32m'
RED='\033[0;31m'
CYAN='\033[0;36m'
BOLD='\033[1m'
RESET='\033[0m'

EXAMPLES=(
  basic-usage.js
  advanced-usage.js
  csv-usage.js
  stream-usage.js
  plugin-api.js
  schema-builder-usage.js
  schema-file-usage.js
  infer-usage.js
  openapi-usage.js
  graphql-usage.js
  ddl-usage.js
  sql-simple.js
  sql-schema-examples.js
  watch-usage.js
  quick-test.js
)

TOTAL=${#EXAMPLES[@]}
PASSED=0
FAILED=0
FAILED_LIST=()

echo ""
echo -e "${BOLD}Ficta — running all Node.js examples (${TOTAL} scripts)${RESET}"
echo "$(printf '─%.0s' {1..55})"

for script in "${EXAMPLES[@]}"; do
  echo ""
  echo -e "${CYAN}▶ ${BOLD}${script}${RESET}"
  echo "$(printf '─%.0s' {1..45})"

  if node "$script"; then
    echo -e "${GREEN}✔ ${script} passed${RESET}"
    PASSED=$((PASSED + 1))
  else
    echo -e "${RED}✘ ${script} failed (exit $?)${RESET}"
    FAILED=$((FAILED + 1))
    FAILED_LIST+=("$script")
  fi
done

echo ""
echo "$(printf '═%.0s' {1..55})"
echo -e "${BOLD}Results: ${GREEN}${PASSED} passed${RESET}${BOLD}, ${RED}${FAILED} failed${RESET}${BOLD} / ${TOTAL} total${RESET}"

if [[ ${#FAILED_LIST[@]} -gt 0 ]]; then
  echo ""
  echo -e "${RED}Failed scripts:${RESET}"
  for f in "${FAILED_LIST[@]}"; do
    echo -e "  ${RED}• ${f}${RESET}"
  done
fi

echo ""
exit "$FAILED"
