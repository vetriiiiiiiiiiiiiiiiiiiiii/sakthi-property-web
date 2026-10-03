/**
 * Authentication API Service
 * Interacts with /api/auth endpoints on the Express backend.
 */

async function handleResponse(response) {
  let data;
  try {
    data = await response.json();
  } catch {
    data = {};
  }

  if (!response.ok) {
    const error = new Error(data.message || `Request failed with status ${response.status}`);
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

export async function fetchCurrentUser() {
  try {
    const response = await fetch('/api/auth/me', {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
      credentials: 'include',
    });

    if (response.status === 401) {
      return null;
    }

    const data = await handleResponse(response);
    return data.user || null;
  } catch (err) {
    // If backend is not running or network fails, return null
    return null;
  }
}

export async function login(username, password) {
  const response = await fetch('/api/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify({ username, password }),
  });

  const data = await handleResponse(response);
  return data.user;
}

export async function loginWithGoogle(credentialData) {
  const payload = typeof credentialData === 'string'
    ? { credential: credentialData }
    : credentialData;

  const response = await fetch('/api/auth/google', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(payload),
  });

  const data = await handleResponse(response);
  return data.user;
}

export async function logout() {
  try {
    const response = await fetch('/api/auth/logout', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
      },
      credentials: 'include',
    });
    await handleResponse(response);
  } catch {
    // Ignore logout error if session was already expired
  }
}

export async function requestResetOtp(identifier) {
  const response = await fetch('/api/auth/forgot/request-otp', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify({ identifier }),
  });

  return await handleResponse(response);
}

export async function verifyResetOtp(verificationToken, otp) {
  const response = await fetch('/api/auth/forgot/verify-otp', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify({ verificationToken, otp }),
  });

  return await handleResponse(response);
}

export async function resetPassword(resetToken, password) {
  const response = await fetch('/api/auth/forgot/reset-password', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify({ resetToken, password }),
  });

  return await handleResponse(response);
}
