"""
Treat every upload as untrusted input.

- Never trust the client-supplied filename or Content-Type header alone.
- Validate extension AND sniff the first bytes for a matching file signature.
- Enforce a size cap by counting bytes as they stream in (never load unbounded
  content based on a client-reported Content-Length).
- Store under a randomized filename inside a fixed upload root -- the original
  name is kept only as metadata in the database, never as a path component.
"""
import os
import uuid
from dataclasses import dataclass

from fastapi import HTTPException, UploadFile

from app.core.config import settings

# Minimal magic-byte signatures so a renamed .exe can't pass as a .png/.edf.
_SIGNATURES = {
    ".png": [b"\x89PNG\r\n\x1a\n"],
    ".jpg": [b"\xff\xd8\xff"],
    ".jpeg": [b"\xff\xd8\xff"],
    ".webp": [b"RIFF"],  # followed by "WEBP" at offset 8, checked separately
    ".csv": None,   # text format, no reliable magic bytes
    ".edf": [b"0"],  # EDF files start with an 8-byte ASCII version field of "0"s
}


@dataclass
class SavedUpload:
    stored_path: str
    stored_filename: str
    original_filename: str
    size_bytes: int


def _validate_extension(filename: str, allowed: set) -> str:
    ext = os.path.splitext(filename or "")[1].lower()
    if ext not in allowed:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file extension '{ext or '(none)'}'. Allowed: {', '.join(sorted(allowed))}",
        )
    return ext


def _sniff_signature(head: bytes, ext: str) -> bool:
    sigs = _SIGNATURES.get(ext)
    if sigs is None:
        return True  # no reliable signature to check (e.g. CSV)
    if ext == ".webp":
        return head[:4] == b"RIFF" and head[8:12] == b"WEBP"
    return any(head.startswith(sig) for sig in sigs)


async def save_upload_securely(
    file: UploadFile,
    *,
    subdir: str,
    allowed_extensions: set,
    max_size_bytes: int,
) -> SavedUpload:
    ext = _validate_extension(file.filename, allowed_extensions)

    # Read in chunks, enforcing the size cap as we go (don't trust Content-Length).
    chunks = []
    total = 0
    chunk_size = 1024 * 1024
    first_chunk = True
    head = b""
    while True:
        chunk = await file.read(chunk_size)
        if not chunk:
            break
        total += len(chunk)
        if total > max_size_bytes:
            raise HTTPException(
                status_code=413,
                detail=f"File too large. Maximum allowed size is {max_size_bytes // (1024 * 1024)} MB.",
            )
        if first_chunk:
            head = chunk[:32]
            first_chunk = False
        chunks.append(chunk)
    await file.close()

    if total == 0:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    if not _sniff_signature(head, ext):
        raise HTTPException(
            status_code=400,
            detail="File content does not match its extension. The upload was rejected for safety.",
        )

    safe_name = f"{uuid.uuid4().hex}{ext}"
    dest_dir = os.path.join(settings.UPLOAD_DIR, subdir)
    os.makedirs(dest_dir, exist_ok=True)
    dest_path = os.path.join(dest_dir, safe_name)

    # Guard against path traversal even though safe_name is fully generated here.
    if not os.path.abspath(dest_path).startswith(os.path.abspath(dest_dir)):
        raise HTTPException(status_code=400, detail="Invalid upload destination.")

    with open(dest_path, "wb") as f:
        for chunk in chunks:
            f.write(chunk)

    return SavedUpload(
        stored_path=dest_path,
        stored_filename=safe_name,
        original_filename=os.path.basename(file.filename or "upload"),
        size_bytes=total,
    )


def delete_file_safely(path: str) -> None:
    try:
        if path and os.path.isfile(path) and os.path.abspath(path).startswith(os.path.abspath(settings.UPLOAD_DIR)):
            os.remove(path)
    except OSError:
        pass
