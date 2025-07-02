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
    const nickname = document.getElementById('register-nickname').value;
    const password = document.getElementById('register-password').value;
    const passwordConfirm = document.getElementById('register-password-confirm').value;

    // 사용자 이름 유효성 검사 (영어만)
    const usernameRegex = /^[a-zA-Z]+$/;
    if (!usernameRegex.test(username)) {
      alert('사용자 이름은 영어로만 작성해주세요.');
      return;
    }

    // 비밀번호 유효성 검사 (8자 이상, 영어, 숫자, 특수문자 포함)
    const passwordRegex = /^(?=.*[a-zA-Z])(?=.*[0-9])(?=.*[!@#$%^&*]).{8,}$/;
    if (!passwordRegex.test(password)) {
      alert('비밀번호는 8자 이상이며, 영어, 숫자, 특수문자를 모두 포함해야 합니다.');
      return;
    }

    if (password !== passwordConfirm) {
      alert('비밀번호가 일치하지 않습니다.');
      return;
    }

    try {
      const response = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, nickname, password }),
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