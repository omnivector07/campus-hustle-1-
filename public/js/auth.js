function clearFieldErrors(form) {
  form.querySelectorAll('.field').forEach((f) => {
    f.classList.remove('has-error');
    const err = f.querySelector('.field-error');
    if (err) err.textContent = '';
  });
}

function showFieldErrors(form, errors) {
  Object.entries(errors || {}).forEach(([field, message]) => {
    const wrap = form.querySelector(`#field-${field}`);
    if (wrap) {
      wrap.classList.add('has-error');
      const err = wrap.querySelector('.field-error');
      if (err) err.textContent = message;
    }
  });
}

function showFormAlert(message) {
  const alertEl = document.getElementById('form-alert');
  if (!alertEl) return;
  alertEl.textContent = message;
  alertEl.classList.add('show');
}

function hideFormAlert() {
  const alertEl = document.getElementById('form-alert');
  if (!alertEl) return;
  alertEl.classList.remove('show');
}

function setButtonLoading(btn, loading, loadingText, defaultText) {
  btn.disabled = loading;
  btn.textContent = loading ? loadingText : defaultText;
}

document.addEventListener('DOMContentLoaded', () => {
  Auth.redirectIfLoggedIn();

  // ---------------- Login ----------------
  const loginForm = document.getElementById('login-form');
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      hideFormAlert();
      clearFieldErrors(loginForm);

      const btn = document.getElementById('submit-btn');
      setButtonLoading(btn, true, 'Logging in…', 'Log in');

      try {
        const data = await Api.login({
          email: document.getElementById('email').value.trim(),
          password: document.getElementById('password').value,
        });
        Auth.setSession(data.token, data.user);
        window.location.href = redirectForRole(data.user.role);
      } catch (err) {
        if (err.errors) showFieldErrors(loginForm, err.errors);
        showFormAlert(err.message || 'Unable to log in. Please try again.');
      } finally {
        setButtonLoading(btn, false, 'Logging in…', 'Log in');
      }
    });
  }

  // ---------------- Signup ----------------
  const signupForm = document.getElementById('signup-form');
  if (signupForm) {
    // Role toggle
    const roleOptions = document.querySelectorAll('.role-option');
    const roleInput = document.getElementById('role');
    const params = new URLSearchParams(window.location.search);
    const initialRole = params.get('role') === 'worker' ? 'worker' : 'customer';
    roleInput.value = initialRole;

    function refreshRoleUI() {
      roleOptions.forEach((opt) => opt.classList.toggle('active', opt.dataset.role === roleInput.value));
    }
    refreshRoleUI();

    roleOptions.forEach((opt) => {
      opt.addEventListener('click', () => {
        roleInput.value = opt.dataset.role;
        refreshRoleUI();
      });
    });

    signupForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      hideFormAlert();
      clearFieldErrors(signupForm);

      const btn = document.getElementById('submit-btn');
      setButtonLoading(btn, true, 'Creating account…', 'Create account');

      try {
        const data = await Api.signup({
          full_name: document.getElementById('full_name').value.trim(),
          email: document.getElementById('email').value.trim(),
          phone: document.getElementById('phone').value.trim(),
          department: document.getElementById('department').value.trim(),
          password: document.getElementById('password').value,
          role: roleInput.value,
        });
        Auth.setSession(data.token, data.user);
        window.location.href = redirectForRole(data.user.role);
      } catch (err) {
        if (err.errors) showFieldErrors(signupForm, err.errors);
        showFormAlert(err.message || 'Unable to create your account. Please try again.');
      } finally {
        setButtonLoading(btn, false, 'Creating account…', 'Create account');
      }
    });
  }
});
