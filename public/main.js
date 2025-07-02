// DOM이 로드되면 실행
document.addEventListener('DOMContentLoaded', function() {
  
  // 네비게이션 요소들
  const header = document.getElementById('header');
  const navLinks = document.querySelectorAll('.nav-link');
  const mobileNavToggle = document.querySelector('.mobile-nav-toggle');
  const navList = document.querySelector('.nav-list');

  // 스크롤 이벤트 처리
  window.addEventListener('scroll', function() {
    // 헤더 스타일 변경
    if (window.scrollY > 100) {
      header.style.background = 'rgba(255, 255, 255, 0.95)';
      header.style.backdropFilter = 'blur(10px)';
    } else {
      header.style.background = 'var(--bg-white)';
      header.style.backdropFilter = 'none';
    }

    // 스크롤 애니메이션 처리
    handleScrollAnimations();
    
    // 활성 네비게이션 링크 업데이트
    updateActiveNavLink();
  });

  // 부드러운 스크롤 네비게이션
  navLinks.forEach(link => {
    link.addEventListener('click', function(e) {
      e.preventDefault();
      const targetId = this.getAttribute('href');
      const targetSection = document.querySelector(targetId);
      
      if (targetSection) {
        const headerHeight = header.offsetHeight;
        const targetPosition = targetSection.offsetTop - headerHeight;
        
        window.scrollTo({
          top: targetPosition,
          behavior: 'smooth'
        });
      }
      
      // 모바일에서 메뉴 닫기
      if (window.innerWidth <= 768) {
        navList.classList.remove('mobile-active');
      }
    });
  });

  // 모바일 네비게이션 토글
  mobileNavToggle.addEventListener('click', function() {
    navList.classList.toggle('mobile-active');
    
    // 햄버거 아이콘 변경
    const icon = this.querySelector('i');
    if (navList.classList.contains('mobile-active')) {
      icon.className = 'fas fa-times';
    } else {
      icon.className = 'fas fa-bars';
    }
  });

  // 스크롤 애니메이션 처리
  function handleScrollAnimations() {
    const elements = document.querySelectorAll('.animate-on-scroll');
    
    elements.forEach(element => {
      const elementTop = element.getBoundingClientRect().top;
      const elementVisible = 150;
      
      if (elementTop < window.innerHeight - elementVisible) {
        element.classList.add('animated');
      }
    });
  }

  // 활성 네비게이션 링크 업데이트
  function updateActiveNavLink() {
    const sections = document.querySelectorAll('section[id]');
    const scrollPos = window.scrollY + 200;
    
    sections.forEach(section => {
      const sectionTop = section.offsetTop;
      const sectionHeight = section.offsetHeight;
      const sectionId = section.getAttribute('id');
      
      if (scrollPos >= sectionTop && scrollPos < sectionTop + sectionHeight) {
        // 모든 네비게이션 링크에서 active 클래스 제거
        navLinks.forEach(link => link.classList.remove('active'));
        
        // 현재 섹션에 해당하는 링크에 active 클래스 추가
        const activeLink = document.querySelector(`a[href="#${sectionId}"]`);
        if (activeLink) {
          activeLink.classList.add('active');
        }
      }
    });
  }

  // 카운터 애니메이션
  function animateCounters() {
    const counters = document.querySelectorAll('.stat-number');
    
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const counter = entry.target;
          const target = counter.textContent;
          
          // 숫자인 경우에만 애니메이션
          if (!isNaN(target) && target !== '') {
            const increment = parseInt(target) / 50;
            let current = 0;
            
            const timer = setInterval(() => {
              current += increment;
              counter.textContent = Math.floor(current);
              
              if (current >= parseInt(target)) {
                counter.textContent = target;
                clearInterval(timer);
              }
            }, 30);
          }
        }
      });
    }, {
      threshold: 0.5
    });
    
    counters.forEach(counter => {
      observer.observe(counter);
    });
  }

  // 타이핑 효과
  function typeWriter(element, text, speed = 100) {
    let i = 0;
    element.textContent = '';
    
    function type() {
      if (i < text.length) {
        element.textContent += text.charAt(i);
        i++;
        setTimeout(type, speed);
      }
    }
    
    type();
  }

  // 페이지 로드 시 실행할 함수들
  function init() {
    // 애니메이션 클래스 추가
    const animatedElements = document.querySelectorAll('.feature-card, .step, .tech-item, .stat-item');
    animatedElements.forEach(el => {
      el.classList.add('animate-on-scroll');
    });
    
    // 초기 스크롤 애니메이션 확인
    handleScrollAnimations();
    
    // 카운터 애니메이션 초기화
    animateCounters();
    
    // 히어로 제목에 타이핑 효과 (옵션)
    const heroTitle = document.querySelector('.hero-title');
    if (heroTitle) {
      const originalText = heroTitle.textContent;
      // 주석 처리: 타이핑 효과를 원하지 않는 경우
      // typeWriter(heroTitle, originalText, 80);
    }

    // 로그인 상태 확인 및 UI 업데이트
    checkLoginStatus();
  }

  // 로그인 상태 확인 및 UI 업데이트 함수
  async function checkLoginStatus() {
    try {
      const response = await fetch('/api/auth/status');
      const data = await response.json();
      updateAuthUI(data);
    } catch (error) {
      console.error('로그인 상태 확인 오류:', error);
      updateAuthUI({ isLoggedIn: false });
    }
  }

  // 로그인 상태에 따라 UI 업데이트
  function updateAuthUI(authData) {
    const authLinksContainer = document.getElementById('auth-links');
    const heroButtonsContainer = document.querySelector('.hero-buttons');

    if (authData.isLoggedIn) {
      // 로그인 상태일 때
      authLinksContainer.innerHTML = `
        <span class="username-display">환영합니다, ${authData.user.nickname}님!</span>
        <a href="#" id="logout-btn" class="btn btn-outline">로그아웃</a>
      `;
      heroButtonsContainer.innerHTML = `
        <a href="game.html" class="btn btn-primary">
          <i class="fas fa-play"></i> 게임 시작
        </a>
        <a href="#about" class="btn btn-outline">
          <i class="fas fa-info-circle"></i> 더 알아보기
        </a>
      `;
      
      // 로그아웃 버튼 이벤트 리스너 추가
      document.getElementById('logout-btn').addEventListener('click', async (e) => {
        e.preventDefault();
        await fetch('/api/logout', { method: 'POST' });
        window.location.reload();
      });

    } else {
      // 로그아웃 상태일 때
      authLinksContainer.innerHTML = `
        <a href="login.html" class="btn btn-primary">로그인</a>
      `;
      heroButtonsContainer.innerHTML = `
        <a href="login.html" class="btn btn-primary">
          <i class="fas fa-sign-in-alt"></i> 로그인하여 게임 시작
        </a>
        <a href="#about" class="btn btn-outline">
          <i class="fas fa-info-circle"></i> 더 알아보기
        </a>
      `;
    }
  }

  // 초기화 실행
  init();

  // 윈도우 리사이즈 이벤트
  window.addEventListener('resize', function() {
    // 모바일 메뉴가 열려있을 때 창 크기가 변경되면 메뉴 닫기
    if (window.innerWidth > 768 && navList.classList.contains('mobile-active')) {
      navList.classList.remove('mobile-active');
      const icon = mobileNavToggle.querySelector('i');
      icon.className = 'fas fa-bars';
    }
  });

  // 키보드 네비게이션
  document.addEventListener('keydown', function(e) {
    // ESC 키로 모바일 메뉴 닫기
    if (e.key === 'Escape' && navList.classList.contains('mobile-active')) {
      navList.classList.remove('mobile-active');
      const icon = mobileNavToggle.querySelector('i');
      icon.className = 'fas fa-bars';
    }
  });
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