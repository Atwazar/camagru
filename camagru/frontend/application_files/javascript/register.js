export function setRegisterView(container) {
  container.innerHTML = `
    <div class="register-container">
      <h2>Create an Account</h2>
      <form id="register-form">
        <div>
          <label for="username">Username</label>
          <input type="text" id="username" name="username" required />
        </div>
        <div>
          <label for="email">Email</label>
          <input type="email" id="email" name="email" required />
        </div>
        <div>
          <label for="password">Password</label>
          <input type="password" id="password" name="password" required />
        </div>
        <button type="submit">Sign Up</button>
      </form>
      <div id="register-error" class="hidden"></div>
      <div id="register-success" class="hidden"></div>
      <div>
        <p>Already have an account? <a href="#login" id="go-to-login">Log in</a></p>
      </div>
    </div>
  `;

  const form = document.getElementById('register-form');
  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    const username = document.getElementById('username').value;
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    const data = {
      username: username,
      email: email,
      password: password,
    };

    try {
      const response = await fetch('/api/users/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (response.ok) {
        document.getElementById('register-success').innerText = 'Registration successful! You should have receive a mail to verify your Account.';
        document.getElementById('register-success').classList.remove('hidden');
        document.getElementById('register-error').classList.add('hidden');
      } else {
        document.getElementById('register-error').innerText = result.error || 'Registration error.';
        document.getElementById('register-error').classList.remove('hidden');
        document.getElementById('register-success').classList.add('hidden');
      }
    } catch (error) {
      console.log('Registration error:', error);
      document.getElementById('register-error').innerText = 'Server error. Please try again later.';
      document.getElementById('register-error').classList.remove('hidden');
      document.getElementById('register-success').classList.add('hidden');
    }
  });

}
