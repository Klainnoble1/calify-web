export async function requestPremiumTestAccess() {
  try {
    const response = await fetch('/api/dev/grant-premium', { method: 'POST' });
    if (!response.ok) return false;

    const data = await response.json();
    return data?.subscription_tier === 'premium';
  } catch {
    return false;
  }
}
