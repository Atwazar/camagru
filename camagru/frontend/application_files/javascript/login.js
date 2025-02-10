export function setLoginView(container) {
  container.innerHTML = `
    <div class="login-container">
      <h2>Login</h2>
      <form id="login-form">
        <div>
          <label for="email-login">Email</label>
          <input type="email" id="email-login" name="email" required />
        </div>
        <div>
          <label for="password-login">Password</label>
          <input type="password" id="password-login" name="password" required />
        </div>
        <button type="submit">Login</button>
      </form>
      <div id="login-error" class="hidden"></div>
      <div>
        <p>Don't have an account? <a href="#register" id="go-to-register">Sign up</a></p>
      </div>
    </div>
  `;

  const form = document.getElementById('login-form');
  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    const email = document.getElementById('email-login').value;
    const password = document.getElementById('password-login').value;

    const data = {
      email: email,
      password: password,
    };

    try {
      const response = await fetch('/api/users/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (response.ok) {
        document.cookie = `accessToken=${result.accessToken}; path=/; secure; SameSite=Strict`;
        window.location.hash = "gallery";
      } else {
        document.getElementById('login-error').innerText = result.error || 'Login error.';
        document.getElementById('login-error').classList.remove('hidden');
      }
    } catch (error) {
      console.log('Login error:', error);
      document.getElementById('login-error').innerText = 'Server error. Please try again later.';
      document.getElementById('login-error').classList.remove('hidden');
    }
  });
}
