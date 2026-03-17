// File ini adalah saklar untuk Mock User.
// Jika ENABLE_MOCK = true, aplikasi akan menggunakan identitas bayangan.
// Jika ENABLE_MOCK = false, aplikasi akan mewajibkan Google Login.

export const ENABLE_MOCK = true;

export const MOCK_USER = {
  id: "user_mock_999",
  email: "mock@infinitephysics.com",
  displayName: "Mock Researcher",
  photoURL: "https://picsum.photos/seed/physics/200",
  tokens: 100
};
