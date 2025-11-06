// DOM이 로드되면 실행
document.addEventListener('DOMContentLoaded', () => {
    const header = document.getElementById('header');
    const navList = document.getElementById('nav-list');
    const mobileNavToggle = document.getElementById('mobile-nav-toggle');
    const darkModeToggle = document.getElementById('dark-mode-toggle');
    const notificationsBtn = document.getElementById('notifications-btn');
    const notificationDropdown = document.getElementById('notification-dropdown');
    const notificationList = document.getElementById('notification-list');
    const clearNotifications = document.getElementById('clear-notifications');
    const notificationBadge = document.getElementById('notification-badge');
    const authLinks = document.getElementById('auth-links');

    // Header scroll effect
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }
    });

    // Mobile navigation
    if (mobileNavToggle) {
        mobileNavToggle.addEventListener('click', () => {
            navList.classList.toggle('mobile-active');
            const icon = mobileNavToggle.querySelector('i');
            icon.classList.toggle('fa-bars');
            icon.classList.toggle('fa-times');
        });
    }

    // Dark mode
    if (darkModeToggle) {
        darkModeToggle.addEventListener('click', () => {
            document.body.classList.toggle('dark-mode');
            const icon = darkModeToggle.querySelector('i');
            icon.classList.toggle('fa-moon');
            icon.classList.toggle('fa-sun');
            // Save preference
            localStorage.setItem('darkMode', document.body.classList.contains('dark-mode'));
        });

        // Check for saved preference
        if (localStorage.getItem('darkMode') === 'true') {
            document.body.classList.add('dark-mode');
            const icon = darkModeToggle.querySelector('i');
            icon.classList.add('fa-sun');
            icon.classList.remove('fa-moon');
        }
    }

    // Notifications
    if (notificationsBtn) {
        notificationsBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            notificationDropdown.style.display = notificationDropdown.style.display === 'none' ? 'block' : 'none';
        });

        document.addEventListener('click', (e) => {
            if (!notificationDropdown.contains(e.target) && e.target !== notificationsBtn) {
                notificationDropdown.style.display = 'none';
            }
        });

        if (clearNotifications) {
            clearNotifications.addEventListener('click', () => {
                notificationList.innerHTML = '<p class="no-notifications">새로운 알림이 없습니다</p>';
                notificationBadge.style.display = 'none';
                notificationBadge.textContent = '0';
            });
        }
    }

    // Auth state management (placeholder)
    const isLoggedIn = () => {
        // 실제 애플리케이션에서는 토큰, 세션 등을 확인합니다.
        return localStorage.getItem('isLoggedIn') === 'true';
    };

    const updateAuthLinks = () => {
        if (!authLinks) return;

        if (isLoggedIn()) {
            const user = JSON.parse(localStorage.getItem('user'));
            authLinks.innerHTML = `
                <div class="profile-dropdown">
                    <button class="profile-btn">
                        <img src="${user.avatar || 'default-avatar.png'}" alt="${user.nickname}" class="avatar-sm">
                        <span>${user.nickname}</span>
                        <i class="fas fa-chevron-down"></i>
                    </button>
                    <div class="dropdown-content">
                        <a href="stats.html"><i class="fas fa-chart-bar"></i> 내 통계</a>
                        <a href="profile.html"><i class="fas fa-user-cog"></i> 프로필 수정</a>
                        <a href="#" id="logout-btn"><i class="fas fa-sign-out-alt"></i> 로그아웃</a>
                    </div>
                </div>
            `;

            document.getElementById('logout-btn').addEventListener('click', () => {
                localStorage.removeItem('isLoggedIn');
                localStorage.removeItem('user');
                window.location.href = 'login.html';
            });
        } else {
            authLinks.innerHTML = `
                <a href="login.html" class="btn btn-sm btn-outline">로그인</a>
                <a href="game.html" class="btn btn-sm btn-primary">게임 시작</a>
            `;
        }
    };

    updateAuthLinks();

    // Set current year in footer
    const currentYearSpan = document.getElementById('current-year');
    if (currentYearSpan) {
        currentYearSpan.textContent = new Date().getFullYear();
    }

    // Reveal on scroll
    const revealElements = document.querySelectorAll('.reveal');
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
            }
        });
    }, { threshold: 0.1 });

    revealElements.forEach(el => observer.observe(el));
});

// 페이지 로딩 애니메이션 (옵션)
window.addEventListener('load', function() {
  // 페이지 로더 제거 (있는 경우)
  const loader = document.querySelector('.page-loader');
  if (loader) {
    loader.style.opacity = '0';
    setTimeout(() => {
      loader.style.display = 'none';
    }, 500);
  }
  
  // 히어로 섹션 애니메이션
  const heroContent = document.querySelector('.hero-content');
  const heroImage = document.querySelector('.hero-image');
  
  if (heroContent) {
    heroContent.style.opacity = '0';
    heroContent.style.transform = 'translateY(50px)';
    
    setTimeout(() => {
      heroContent.style.transition = 'all 0.8s ease';
      heroContent.style.opacity = '1';
      heroContent.style.transform = 'translateY(0)';
    }, 200);
  }
  
  if (heroImage) {
    heroImage.style.opacity = '0';
    heroImage.style.transform = 'translateX(50px)';
    
    setTimeout(() => {
      heroImage.style.transition = 'all 0.8s ease';
      heroImage.style.opacity = '1';
      heroImage.style.transform = 'translateX(0)';
    }, 400);
  }
}); 