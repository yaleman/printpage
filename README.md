# printpage

Small FastAPI app for generating label PDFs and sending them to a Brother label printer through CUPS.

It may have gotten a little out of hand.

## Requirements

- Linux
- CUPS running locally
- A configured printer queue
- Required CUPS commands available in `PATH` or at their system locations:
  - `lp`
  - `lpadmin`
  - `lpstat`
  - `lpoptions`

## Running On macOS

macOS is useful for local development, but the deployed target is still Linux.

Install the Homebrew system dependency first:

```sh
brew install pygobject3
```

Then install Python dependencies and start the app:

```sh
uv sync
uv run uvicorn printpage:app --host 0.0.0.0 --port 8000
```

## Running

Install dependencies with `uv`, then run the app with Uvicorn:

```sh
uv run uvicorn printpage:app --host 0.0.0.0 --port 8000
```

## Browser Tests

Install the browser once before running the Playwright regression:

```sh
pnpm exec playwright install chromium
```

Then run the browser test directly or through the normal check pipeline:

```sh
pnpm test:playwright
mise check
```

## Running With Docker

Build and run the local container with `mise`:

```sh
mise run run_container
```

Or run the equivalent Docker commands directly:

```sh
docker build -t printpage:local .
docker run --rm -it -p 8000:8000 printpage:local
```

This container is aimed at local app startup and PDF preview. Real printer administration still depends on CUPS access and `sudo /usr/sbin/lpadmin` in the runtime environment.

The Docker image now also starts a local CUPS daemon and seeds a file-backed fake `Brother_QL700` queue for integration testing. Print jobs written inside the container are sent to `/tmp/printpage-jobs/label-output.pdf` by default.

## Printer Administration

The app is designed to manage a local CUPS printer queue.

- Configuration reads use `lpstat` and `lpoptions`.
- Print submission uses `lp`.
- Configuration apply uses `sudo /usr/sbin/lpadmin`.
- The app assumes these commands can run non-interactively.

That means the deployed service user must have passwordless `sudo` for the required administrative command instead of prompting for a password at request time.

Example `lpadmin` command shape used for Brother label settings:

```sh
sudo lpadmin -p Brother_QL700 \
  -o PageSize=62x29 \
  -o media=62x29 \
  -o BrCutLabel=1 \
  -o BrCutAtEnd=ON
```

## Sudoers Setup

The intended setup is a narrowly scoped sudoers rule for `lpadmin`, not blanket sudo access.

Example:

```sudoers
printpage ALL=(root) NOPASSWD: /usr/sbin/lpadmin
```

Replace `printpage` with the actual service user account that runs the app.

Humans setting up the host need this because the web app queries printer state directly and applies printer defaults through CUPS from HTTP requests. Without passwordless `sudo`, config updates would block on an interactive password prompt and fail.
