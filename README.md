# MetaPhoto API Test Suite (Playwright)

Modern Playwright-based API test suite for evaluating candidate submissions for the MetaPhoto Software Developer Technical Test.

## Overview

This test suite validates Parts 1.1, 1.2, and 1.3 of the technical assessment using Playwright's powerful testing framework.

| Section | Points | Tests | What It Tests |
|---------|--------|-------|---------------|
| 1.1 — Data Enrichment | 20 | 11 | API design, data joining, nested response structure |
| 1.2 — Filtering | 35 | 18 | Query logic, contains/equals filtering, AND combination |
| 1.3 — Pagination | 10 | 17 | offset/limit implementation, defaults, edge cases |
| **Total** | **65** | **46** | |

## Installation

```bash
npm install
```

## Usage

### Basic Usage

```bash
# Test local server (default: http://localhost:3001)
npm run test:local

# Test any deployed endpoint
BASE_URL=https://candidate-api.example.com npm test

# Test any URL
BASE_URL=https://your-api.com npx playwright test
```

### Run Specific Sections

```bash
npm run test:section:1.1   # Data Enrichment tests
npm run test:section:1.2   # Filtering tests
npm run test:section:1.3   # Pagination tests
```

### Interactive Mode

```bash
# Open Playwright UI for interactive testing
npm run test:local:ui

# Debug mode (step through tests)
npm run test:debug
```

### View Reports

```bash
# Show HTML report after running tests
npm run test:report
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `BASE_URL` | `http://localhost:3001` | Target API base URL |

## API Path Detection

The test suite automatically detects the API endpoint path from these options:

1. `/v1/api/photos`
2. `/externalapi/photos`
3. `/api/photos`
4. `/photos`

## Test Files

```
tests/
├── fixtures.ts                    # Shared test fixtures and types
├── global-setup.ts                # API path detection
├── section-1.1-enrichment.spec.ts # Data enrichment tests
├── section-1.2-filtering.spec.ts  # Filtering tests
└── section-1.3-pagination.spec.ts # Pagination tests
```

## Test Cases

### Section 1.1 — Data Enrichment (11 tests)

- Photo base fields (id, title, url, thumbnailUrl)
- Nested album with correct id and title
- Nested user with complete data
- User address and company details
- Clean response (no albumId at root)
- Error handling (404, 400)

### Section 1.2 — Filtering (18 tests)

- Title filter (contains) - exact IDs: 13, 260, 318, 577
- Album title filter (contains) - 100 photos
- User email filter (equals) - 500 photos
- Case insensitivity
- Combined filters (AND logic)
- Edge cases (empty results, unknown params)

### Section 1.3 — Pagination (17 tests)

- Default limit=25, offset=0
- Custom limit values
- Offset functionality
- Pagination with filters
- Edge cases (beyond results, invalid values)

## Example Output

```
Running 46 tests using 1 worker

  Section 1.1: Data Enrichment API (20 points)
    GET /photos/:id - Photo Enrichment
      ✓ returns enriched photo with correct base fields
      ✓ includes nested album with correct id and title
      ✓ includes nested user under album with complete data
      ✓ includes user address details
      ✓ includes user company details
      ✓ removes albumId from root level (clean response)
      ...

  46 passed (12.5s)
```

## CI/CD Integration

### GitHub Actions

```yaml
- name: Run API Tests
  env:
    BASE_URL: ${{ secrets.API_URL }}
  run: npx playwright test
  
- name: Upload Test Report
  uses: actions/upload-artifact@v3
  if: always()
  with:
    name: playwright-report
    path: playwright-report/
```

## Reports

After running tests, reports are available in:

- `playwright-report/` - HTML report
- `test-results/results.json` - JSON results

## Features

- **Auto-detects API path** — works with different URL structures
- **46 comprehensive test cases** across all sections
- **TypeScript support** — full type safety
- **Interactive UI mode** — visual test debugging
- **HTML reports** — detailed test results
- **Parallel execution** — fast test runs
- **CI/CD ready** — GitHub Actions compatible

## License

ISC
