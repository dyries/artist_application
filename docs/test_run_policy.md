# Test Run Policy

- `ARTIST_STUDIO_RUN_MODE=real` writes real application records and normal generated application folders.
- `ARTIST_STUDIO_RUN_MODE=test` writes to `generated/test-runs/` and marks manifests as test.
- `ARTIST_STUDIO_RUN_MODE=mock` writes to `generated/mock-runs/` and marks manifests as mock.
- Test/mock output must not create real application rows, move opportunities to real ready/submitted/waiting states, or write to `generated/final-submissions/`.
- Test/mock folder names, manifests, and reports must clearly show the run mode.
