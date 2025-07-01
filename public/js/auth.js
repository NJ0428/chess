document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('loginForm');
  const registerForm = document.getElementById('registerForm');
  const showRegisterLink = document.getElementById('show-register');
  const showLoginLink = document.getElementById('show-login');
  const loginFormContainer = document.getElementById('login-form');
  const registerFormContainer = document.getElementById('register-form');

  // 회원가입 폼 보이기
  showRegisterLink.addEventListener('click', (e) => {
    e.preventDefault();
    loginFormContainer.style.display = 'none';
    registerFormContainer.style.display = 'block';
  });

  // 로그인 폼 보이기
  showLoginLink.addEventListener('click', (e) => {
    e.preventDefault();
    registerFormContainer.style.display = 'none';
    loginFormContainer.style.display = 'block';
  });

  // 로그인 처리
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('login-username').value;
    const password = document.getElementById('login-password').value;

    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const result = await response.json();
      if (response.ok) {
        alert(result.message);
        window.location.href = '/'; // 메인 페이지로 리디렉션
      } else {
        alert(`오류: ${result.message}`);
      }
    } catch (error) {
      alert('로그인 중 오류가 발생했습니다.');
    }
  });

  // 회원가입 처리
  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('register-username').value;
    const password = document.getElementById('register-password').value;

    try {
      const response = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const result = await response.json();
      if (response.ok) {
        alert(result.message);
        // 회원가입 성공 후 로그인 폼으로 전환
        registerFormContainer.style.display = 'none';
        loginFormContainer.style.display = 'block';
        document.getElementById('login-username').value = username;
        document.getElementById('login-password').focus();
      } else {
        alert(`오류: ${result.message}`);
      }
    } catch (error) {
      alert('회원가입 중 오류가 발생했습니다.');
    }
  });
}); 