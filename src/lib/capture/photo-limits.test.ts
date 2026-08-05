import { describe, expect, it } from "vitest";
import {
  PHOTO_MAX_BYTES,
  buildPhotoObjectPath,
  checkPhotoFileMeta,
  isUserCapturePath,
  looksLikeCaptureObjectPath,
} from "./photo-limits";

describe("checkPhotoFileMeta", () => {
  it("accepts jpeg/png/webp within 5 MB", () => {
    expect(
      checkPhotoFileMeta({ mimeType: "image/jpeg", sizeBytes: 1000 }),
    ).toEqual({ ok: true, mime: "image/jpeg" });
    expect(
      checkPhotoFileMeta({ mimeType: "image/png", sizeBytes: PHOTO_MAX_BYTES }),
    ).toEqual({ ok: true, mime: "image/png" });
    expect(
      checkPhotoFileMeta({
        mimeType: "image/webp; charset=binary",
        sizeBytes: 1,
      }),
    ).toEqual({ ok: true, mime: "image/webp" });
  });

  it("rejects wrong type or oversize", () => {
    expect(
      checkPhotoFileMeta({ mimeType: "image/gif", sizeBytes: 100 }),
    ).toEqual({ ok: false, reason: "type" });
    expect(
      checkPhotoFileMeta({
        mimeType: "image/jpeg",
        sizeBytes: PHOTO_MAX_BYTES + 1,
      }),
    ).toEqual({ ok: false, reason: "size" });
    expect(
      checkPhotoFileMeta({ mimeType: "image/jpeg", sizeBytes: 0 }),
    ).toEqual({ ok: false, reason: "size" });
  });
});

describe("isUserCapturePath", () => {
  const user = "11111111-1111-1111-1111-111111111111";

  it("accepts own-prefix single-segment paths", () => {
    expect(isUserCapturePath(user, `${user}/abc.jpg`)).toBe(true);
    expect(isUserCapturePath(user, `${user}/uuid-here.webp`)).toBe(true);
  });

  it("rejects other users, traversal, nested folders", () => {
    expect(isUserCapturePath(user, `other/${user}.jpg`)).toBe(false);
    expect(isUserCapturePath(user, `${user}/../x.jpg`)).toBe(false);
    expect(isUserCapturePath(user, `${user}/a/b.jpg`)).toBe(false);
    expect(isUserCapturePath(user, `/${user}/a.jpg`)).toBe(false);
    expect(isUserCapturePath(user, "")).toBe(false);
  });
});

describe("looksLikeCaptureObjectPath", () => {
  it("accepts single-segment owner/name.ext shapes (photo and voice)", () => {
    expect(
      looksLikeCaptureObjectPath(
        "11111111-1111-1111-1111-111111111111/abc.jpg",
      ),
    ).toBe(true);
    expect(
      looksLikeCaptureObjectPath(
        "11111111-1111-1111-1111-111111111111/id.webm",
      ),
    ).toBe(true);
  });

  it("rejects empty, traversal, nested folders, and extensionless names", () => {
    expect(looksLikeCaptureObjectPath("")).toBe(false);
    expect(looksLikeCaptureObjectPath("only-name.jpg")).toBe(false);
    expect(looksLikeCaptureObjectPath("/user/a.jpg")).toBe(false);
    expect(looksLikeCaptureObjectPath("user/../x.jpg")).toBe(false);
    expect(looksLikeCaptureObjectPath("user/a/b.jpg")).toBe(false);
    expect(looksLikeCaptureObjectPath("user/noext")).toBe(false);
  });
});

describe("buildPhotoObjectPath", () => {
  it("uses user prefix and mime extension", () => {
    const user = "u1";
    expect(buildPhotoObjectPath(user, "image/jpeg", "id1")).toBe("u1/id1.jpg");
    expect(buildPhotoObjectPath(user, "image/png", "id2")).toBe("u1/id2.png");
    expect(buildPhotoObjectPath(user, "image/webp", "id3")).toBe("u1/id3.webp");
  });
});
