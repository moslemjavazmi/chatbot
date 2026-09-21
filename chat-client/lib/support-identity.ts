const GUEST_STORAGE_KEY =
  "support_guest_id";

function createGuestId(): string {
  return `guest-${crypto.randomUUID()}`;
}

export function getGuestId(): string {
  if (typeof window === "undefined") {
    throw new Error(
      "getGuestId must run in the browser"
    );
  }

  const existingId =
    localStorage.getItem(
      GUEST_STORAGE_KEY
    );

  if (existingId) {
    return existingId;
  }

  const guestId = createGuestId();

  localStorage.setItem(
    GUEST_STORAGE_KEY,
    guestId
  );

  return guestId;
}